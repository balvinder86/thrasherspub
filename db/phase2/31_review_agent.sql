-- ============================================================
-- Real Google review-reply agent (replaces the 100% fake
-- Reviews page). Ported from a proven standalone Playwright-based
-- agent (~/dev/restaurant-review-agent) that has already posted a
-- real reply to a real Google review for Thrasher's — this schema
-- makes that same real behavior multi-tenant instead of hardcoded
-- to one restaurant's .env file.
--
-- No official Google Business Profile API is used — there is no
-- stable review ID, hence the best-effort dedup approach on
-- `reviews` below. Every reply requires an explicit human
-- "Approve & post" click; there is no auto-post mode in v1.
-- ============================================================

-- ------------------------------------------------------------
-- One row per (restaurant_id, provider). The Google session is a
-- raw browser cookie jar (no official OAuth API for this), captured
-- once via a local, human-in-the-loop script and stored in Vault —
-- same manual-provisioning convention as email_ingestion_credentials.
-- business_profile_id is TEXT, not bigint: Thrasher's real value
-- (13806459355847850714) exceeds Postgres bigint's max
-- (9223372036854775807).
-- ------------------------------------------------------------
create table if not exists review_agent_credentials (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references restaurants(id) on delete cascade,
  provider              text not null check (provider in ('google')),
  business_profile_id   text not null,
  search_query          text not null,          -- what's searched on google.com to surface the panel
  vault_secret_name     text not null,           -- Vault secret holding {"cookies": [...]}
  cookies_captured_at   timestamptz,
  cookies_valid_at      timestamptz,             -- last time a scan successfully used these cookies
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index if not exists review_agent_credentials_restaurant_idx
  on review_agent_credentials(restaurant_id);

-- ------------------------------------------------------------
-- Brand-voice/reply-content settings — deliberately separate from
-- credentials, since these aren't provider-specific. No
-- auto_post_enabled column: v1 has no code path that posts without a
-- human click, so a toggle here would just be another fake switch.
-- ------------------------------------------------------------
create table if not exists review_agent_settings (
  restaurant_id         uuid primary key references restaurants(id) on delete cascade,
  business_name         text not null,
  business_description  text,                    -- free-text tone context for the reply prompt
  reply_contact_email   text not null,
  max_replies_per_run   integer not null default 5,
  updated_at            timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Real reviews found by the agent. review_found_at is when OUR scan
-- first saw it, not Google's real post time — the DOM extraction
-- doesn't currently capture that. Dedup is best-effort: this
-- DOM-scrape approach has no stable review ID from Google, so two
-- identical star-only reviews from same-named reviewers could
-- theoretically collide — an accepted limitation, not a bug to chase.
-- ------------------------------------------------------------
create table if not exists reviews (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  provider           text not null check (provider in ('google')),
  reviewer_name      text not null,
  star_rating        integer not null check (star_rating between 1 and 5),
  review_text        text,
  review_found_at    timestamptz not null default now(),
  ai_draft_reply     text,
  edited_reply       text,             -- posted text = coalesce(edited_reply, ai_draft_reply)
  status             text not null default 'drafted'
                       check (status in ('drafted','approved_pending_post','posted','post_failed','dismissed')),
  posted_at          timestamptz,
  post_error         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists reviews_restaurant_idx on reviews(restaurant_id);

-- Belt-and-suspenders safety net, not the primary dedup mechanism —
-- the write path does an explicit SELECT on the natural key before
-- INSERT (PostgREST upsert can't target an expression index like
-- this one).
create unique index if not exists reviews_dedup_idx
  on reviews (restaurant_id, reviewer_name, star_rating, coalesce(review_text, ''));

do $$
declare t text;
begin
  foreach t in array array['review_agent_credentials','review_agent_settings','reviews']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

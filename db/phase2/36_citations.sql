-- ============================================================
-- Real, zero-automation citation consistency checklist. No free API
-- checks name/address/phone consistency across directories (that's
-- a paid Moz Local / Yext feature) — so this is an explicit
-- self-check tool: the owner opens each directory's real search
-- themselves and records what they found, using the canonical NAP
-- (name/address/phone/website) stored here as the source of truth
-- to compare against. Nothing here is scraped or estimated.
-- ============================================================

-- review_agent_settings already holds business_name — extending it
-- with the rest of the canonical NAP rather than a new table, since
-- it's the same "real business info, not provider-specific" data the
-- review-reply prompt already draws from. Nullable: not every tenant
-- will have filled these in yet, and the seo-ai-suggestions/
-- content-brief prompts already handle "(unknown)" gracefully.
alter table review_agent_settings
  add column if not exists address text,
  add column if not exists phone   text,
  add column if not exists website text;

create table if not exists citation_checks (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  directory     text not null
                  check (directory in ('google','yelp','apple_maps','bing','tripadvisor','facebook')),
  status        text not null default 'not_checked'
                  check (status in ('not_checked','matches','needs_fixing')),
  note          text,
  checked_at    timestamptz,
  updated_at    timestamptz not null default now(),
  unique (restaurant_id, directory)
);

create index if not exists citation_checks_restaurant_idx
  on citation_checks(restaurant_id);

do $$
declare t text;
begin
  foreach t in array array['citation_checks']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

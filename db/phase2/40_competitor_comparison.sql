-- ============================================================
-- Real competitor comparison, beyond local-pack ranking:
--
-- 1. Organic search ranking — extends competitor_scans with the real
--    organic (non-local-pack) Google result list for the same tracked
--    query, so a tenant can see who ranks above/below them for a real
--    search, not just who's in the map pack. Confirmed real and
--    reliably extractable via direct exploration: Google's organic
--    result titles/links are consistently `a h3` elements in order.
--
-- 2. Real competitor review-sentiment comparison — a specific named
--    competitor's real public Google reviews (no owner login needed,
--    reviews are publicly visible to any visitor) are scraped, then
--    compared against the tenant's own real review text (already in
--    `reviews`) via Claude to surface real, text-grounded differences
--    — never a fabricated "you're better at X" without it actually
--    being in the review text. One row per (restaurant_id,
--    competitor_name), overwritten on re-compare rather than a full
--    history like competitor_scans, since a stale comparison isn't
--    useful once outdated.
-- ============================================================

alter table competitor_scans
  add column if not exists organic_results jsonb;

create table if not exists competitor_review_comparisons (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid not null references restaurants(id) on delete cascade,
  competitor_name       text not null,
  competitor_rating     numeric,
  competitor_review_count integer,
  our_strengths         jsonb not null default '[]',
  competitor_strengths  jsonb not null default '[]',
  opportunities         jsonb not null default '[]',
  sample_size           jsonb not null default '{}',
  scanned_at            timestamptz not null default now(),
  unique (restaurant_id, competitor_name)
);

create index if not exists competitor_review_comparisons_restaurant_idx
  on competitor_review_comparisons(restaurant_id);

do $$
declare t text;
begin
  foreach t in array array['competitor_review_comparisons']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

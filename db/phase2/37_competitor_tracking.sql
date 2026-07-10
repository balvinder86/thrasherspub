-- ============================================================
-- Real local-pack competitor tracking. True keyword-overlap/backlink
-- competitor comparison still needs a paid tool (Ahrefs/Semrush/Moz)
-- — Search Console only reports the tenant's own site's data — but
-- Google's real local 3-pack for a chosen search query is genuinely
-- scrapable with the same session cookies already connected for the
-- review-reply agent and GBP Insights (business.google.com / a plain
-- google.com/search, no new credential flow). Confirmed by direct
-- exploration against a real query ("sports bar bothell wa"): Google
-- returns 3 real competitors with real name/rating/review
-- count/category/address, and reliably marks the tenant's own
-- listing with the literal text "You manage this Business Profile"
-- when logged in as the owner.
-- ============================================================

-- Queries the tenant wants tracked over time — plain config, no
-- Google automation involved in managing this list itself.
create table if not exists competitor_tracked_queries (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  query         text not null,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, query)
);

create index if not exists competitor_tracked_queries_restaurant_idx
  on competitor_tracked_queries(restaurant_id);

-- One row per real scan (append-only, like `reviews`) so a trend
-- over repeated scans is possible later — this app builds its own
-- time series by scanning on demand, since Google doesn't expose
-- local-pack history the way Search Console exposes analytics
-- history. query is denormalized (not just the FK) so a scan's
-- record is meaningful even if the tracked query is later edited or
-- deleted. local_pack is the real, as-scraped ranked list — never
-- fabricated or backfilled if Google returns fewer than 3 results.
create table if not exists competitor_scans (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  tracked_query_id uuid references competitor_tracked_queries(id) on delete set null,
  query            text not null,
  scanned_at       timestamptz not null default now(),
  local_pack       jsonb not null,
  own_in_pack      boolean not null,
  own_position     integer
);

create index if not exists competitor_scans_restaurant_idx
  on competitor_scans(restaurant_id);
create index if not exists competitor_scans_tracked_query_idx
  on competitor_scans(tracked_query_id);

do $$
declare t text;
begin
  foreach t in array array['competitor_tracked_queries','competitor_scans']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

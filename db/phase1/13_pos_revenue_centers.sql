-- ============================================================
-- Phase 1 — real Toast revenue-center names (for Channel Mix)
-- ------------------------------------------------------------
-- pos_raw_events already stores every real order's raw payload,
-- including a `revenueCenter.guid` reference — but that's an opaque
-- ID, not a human-readable name like "Bar" or "Dining Room". This
-- table is a small config lookup, synced from Toast's own
-- /config/v2/revenueCenters endpoint, so Channel Mix can show real
-- names instead of raw GUIDs.
-- ============================================================
create table if not exists pos_revenue_centers (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  provider       text not null,
  pos_guid       text not null,
  name           text not null,
  updated_at     timestamptz not null default now(),
  unique (location_id, provider, pos_guid)
);

create index if not exists pos_revenue_centers_lookup_idx
  on pos_revenue_centers(restaurant_id);

alter table pos_revenue_centers enable row level security;

drop policy if exists tenant_isolation on pos_revenue_centers;
create policy tenant_isolation on pos_revenue_centers
  using      (restaurant_id in (select my_restaurants()))
  with check (restaurant_id in (select my_restaurants()));

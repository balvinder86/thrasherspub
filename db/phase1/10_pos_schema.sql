-- ============================================================
-- Phase 1 — POS data schema
-- Run AFTER Phase 0's 01_schema.sql. Adds:
--   - pos_credentials  (reference to Vault-stored keys)
--   - pos_raw_events   (untouched vendor payloads, for reprocessing)
--   - pmix_sales       (normalized product mix / sales)
--   - menu_items       (normalized menu)
-- Every table carries restaurant_id and gets the same RLS policy,
-- so the Phase 0 isolation guarantees extend to POS data.
-- ============================================================

-- ------------------------------------------------------------
-- POS credentials
-- We DO NOT store the raw client secret here. Store it in Supabase
-- Vault and keep only the Vault secret reference + non-secret config.
-- ------------------------------------------------------------
create table if not exists pos_credentials (
  id                     uuid primary key default gen_random_uuid(),
  restaurant_id          uuid not null references restaurants(id) on delete cascade,
  location_id            uuid not null references locations(id) on delete cascade,
  provider               text not null check (provider in ('toast','skytab','square')),
  pos_location_ref       text not null,          -- vendor's restaurant/location id (e.g. Toast GUID)
  vault_secret_name      text not null,          -- name of the Vault secret holding clientId/clientSecret
  api_hostname           text,                   -- e.g. https://ws-api.toasttab.com
  last_synced_at         timestamptz,            -- watermark for incremental sync
  created_at             timestamptz not null default now(),
  unique (location_id, provider)
);

create index if not exists pos_credentials_restaurant_idx
  on pos_credentials(restaurant_id);

-- ------------------------------------------------------------
-- Raw vendor events (audit + reprocessing safety net)
-- Store the untouched JSON so a future adapter fix can re-derive
-- normalized rows without re-pulling from the vendor.
-- ------------------------------------------------------------
create table if not exists pos_raw_events (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  provider       text not null,
  event_type     text not null,          -- 'order' | 'menu'
  pos_ref        text not null,          -- vendor order id / menu id
  business_date  date,
  payload        jsonb not null,
  fetched_at     timestamptz not null default now(),
  -- idempotency: one raw row per (location, provider, type, vendor ref)
  unique (location_id, provider, event_type, pos_ref)
);

create index if not exists pos_raw_events_lookup_idx
  on pos_raw_events(restaurant_id, business_date);

-- ------------------------------------------------------------
-- Normalized product mix / sales
-- One row per (location, business_date, menu item). Upsert target.
-- ------------------------------------------------------------
create table if not exists pmix_sales (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  location_id       uuid not null references locations(id) on delete cascade,
  business_date     date not null,
  menu_item_pos_id  text not null,
  name              text not null,
  quantity_sold     numeric not null default 0,
  net_sales_cents   bigint not null default 0,
  updated_at        timestamptz not null default now(),
  -- idempotency key: re-running a sync updates in place, never doubles
  unique (location_id, business_date, menu_item_pos_id)
);

create index if not exists pmix_sales_lookup_idx
  on pmix_sales(restaurant_id, business_date);

-- ------------------------------------------------------------
-- Normalized menu items
-- ------------------------------------------------------------
create table if not exists menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  location_id    uuid not null references locations(id) on delete cascade,
  pos_id         text not null,
  name           text not null,
  category       text,
  price_cents    bigint,
  active         boolean not null default true,
  updated_at     timestamptz not null default now(),
  unique (location_id, pos_id)
);

create index if not exists menu_items_lookup_idx
  on menu_items(restaurant_id);

-- ------------------------------------------------------------
-- RLS: same tenant_isolation pattern as Phase 0, on every table.
-- The CI guard already enforces that these have RLS enabled.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pos_credentials','pos_raw_events','pmix_sales','menu_items']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

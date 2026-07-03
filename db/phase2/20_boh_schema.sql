-- ============================================================
-- Phase 2 — Back-of-house cost control schema
-- Run AFTER Phase 1's 10_pos_schema.sql. Adds:
--   - vendors          (suppliers)
--   - ingredients       (canonical list of things you buy)
--   - recipe_lines      (menu item -> ingredients bridge)
--   - invoices          (vendor invoice header)
--   - invoice_lines     (OCR-extracted line items, human-reviewed)
--   - par_levels        (reorder thresholds per ingredient/location)
--   - ingredient_cost_history (unit cost over time, for trend/variance)
-- Every table carries restaurant_id and gets the same RLS policy
-- as every prior phase.
-- ============================================================

-- ------------------------------------------------------------
-- Vendors (suppliers)
-- ------------------------------------------------------------
create table if not exists vendors (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  name           text not null,
  contact_email  text,
  phone          text,
  created_at     timestamptz not null default now()
);

create index if not exists vendors_restaurant_idx
  on vendors(restaurant_id);

-- ------------------------------------------------------------
-- Ingredients — canonical list of things you buy.
-- unit_cost_cents is the latest known cost; approving an invoice
-- line updates it.
-- ------------------------------------------------------------
create table if not exists ingredients (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  name              text not null,
  unit              text not null,          -- e.g. 'lb', 'case', 'each'
  unit_cost_cents   bigint,                  -- nullable until first invoice sets it
  created_at        timestamptz not null default now(),
  unique (restaurant_id, name)
);

create index if not exists ingredients_restaurant_idx
  on ingredients(restaurant_id);

-- ------------------------------------------------------------
-- Recipe lines — the recipe bridge. Maps a sold menu item to the
-- ingredients it consumes. location_id is included (unlike the plan
-- doc's literal spec) because menu_items is keyed on
-- (location_id, pos_id), not pos_id alone — a bare menu_item_pos_id
-- isn't unique across a multi-location restaurant.
-- ------------------------------------------------------------
create table if not exists recipe_lines (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  location_id        uuid not null references locations(id) on delete cascade,
  menu_item_pos_id   text not null,
  ingredient_id      uuid not null references ingredients(id) on delete cascade,
  quantity           numeric not null,
  unit               text not null,
  unique (location_id, menu_item_pos_id, ingredient_id)
);

create index if not exists recipe_lines_lookup_idx
  on recipe_lines(restaurant_id, location_id, menu_item_pos_id);

-- ------------------------------------------------------------
-- Invoices — vendor invoice header. OCR-extracted, human-reviewed
-- before it counts toward cost numbers (see invoice_lines).
-- ------------------------------------------------------------
create table if not exists invoices (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  location_id      uuid not null references locations(id) on delete cascade,
  vendor_id        uuid not null references vendors(id),
  invoice_number   text,
  invoice_date     date,
  total_cents      bigint,
  status           text not null default 'pending_review' check (status in ('pending_review', 'approved')),
  source_file_url  text,
  created_at       timestamptz not null default now()
);

create index if not exists invoices_lookup_idx
  on invoices(restaurant_id, location_id, status);

-- ------------------------------------------------------------
-- Invoice lines — OCR-extracted line items. ingredient_id stays
-- NULL until auto-matched (high confidence) or a human confirms it
-- during review.
-- ------------------------------------------------------------
create table if not exists invoice_lines (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  invoice_id        uuid not null references invoices(id) on delete cascade,
  ingredient_id     uuid references ingredients(id) on delete set null,
  raw_description   text not null,
  quantity          numeric,
  unit              text,
  unit_cost_cents   bigint,
  line_total_cents  bigint
);

create index if not exists invoice_lines_invoice_idx
  on invoice_lines(invoice_id);
create index if not exists invoice_lines_ingredient_idx
  on invoice_lines(ingredient_id);

-- ------------------------------------------------------------
-- Par levels — reorder thresholds per ingredient per location.
-- par_quantity = (average_daily_usage * days_to_delivery) + safety_stock,
-- recomputed on a schedule from recipe_lines x pmix_sales.
-- ------------------------------------------------------------
create table if not exists par_levels (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  location_id        uuid not null references locations(id) on delete cascade,
  ingredient_id      uuid not null references ingredients(id) on delete cascade,
  par_quantity       numeric,
  safety_stock       numeric not null default 0,
  days_to_delivery   numeric not null default 1,
  updated_at         timestamptz not null default now(),
  unique (location_id, ingredient_id)
);

create index if not exists par_levels_lookup_idx
  on par_levels(restaurant_id, location_id);

-- ------------------------------------------------------------
-- Ingredient cost history — one row per approved invoice line,
-- for cost-trend charts and theoretical-vs-actual variance.
-- ------------------------------------------------------------
create table if not exists ingredient_cost_history (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  ingredient_id      uuid not null references ingredients(id) on delete cascade,
  invoice_line_id    uuid references invoice_lines(id) on delete set null,
  unit_cost_cents    bigint not null,
  effective_date     date not null,
  created_at         timestamptz not null default now()
);

create index if not exists ingredient_cost_history_lookup_idx
  on ingredient_cost_history(restaurant_id, ingredient_id, effective_date);

-- ------------------------------------------------------------
-- RLS: same tenant_isolation pattern as every prior phase.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'vendors', 'ingredients', 'recipe_lines', 'invoices',
    'invoice_lines', 'par_levels', 'ingredient_cost_history'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

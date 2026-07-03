-- ============================================================
-- Phase 2 — Ingredient stock (on-hand tracking) + preferred vendor
-- ------------------------------------------------------------
-- Separate from par_levels (target/threshold config, changes rarely)
-- since on-hand quantity changes with every count/delivery. Powers
-- the existing cart/ordering/PO-dispatch UI in inventory.tsx, which
-- needs current stock (not just a par target) to know what's below
-- par and needs reordering.
-- ============================================================
alter table ingredients add column if not exists vendor_id uuid references vendors(id) on delete set null;

create table if not exists ingredient_stock (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  location_id        uuid not null references locations(id) on delete cascade,
  ingredient_id      uuid not null references ingredients(id) on delete cascade,
  on_hand_quantity   numeric not null default 0,
  last_ordered_at    timestamptz,
  updated_at         timestamptz not null default now(),
  unique (location_id, ingredient_id)
);

create index if not exists ingredient_stock_lookup_idx
  on ingredient_stock(restaurant_id, location_id);

alter table ingredient_stock enable row level security;
drop policy if exists tenant_isolation on ingredient_stock;
create policy tenant_isolation on ingredient_stock
  using      (restaurant_id in (select my_restaurants()))
  with check (restaurant_id in (select my_restaurants()));

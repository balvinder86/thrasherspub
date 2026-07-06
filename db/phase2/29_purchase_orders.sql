-- ============================================================
-- Phase 2 — Real purchase orders
-- ------------------------------------------------------------
-- Replaces the fictional "AI agent dispatched N purchase orders to
-- vendors" toast (which only ever bumped ingredient_stock.last_ordered_at,
-- no actual PO record) with real, queryable history: one purchase_orders
-- row per vendor per cart dispatch, with real line items snapshotting
-- quantity/unit/cost at order time. Still no outbound email to the
-- vendor — this is internal record-keeping only, not vendor
-- communication, matching the scope the user chose.
-- ============================================================

create table if not exists purchase_orders (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants(id) on delete cascade,
  location_id     uuid not null references locations(id) on delete cascade,
  vendor_id       uuid not null references vendors(id),
  status          text not null default 'sent' check (status in ('sent', 'confirmed', 'received', 'cancelled')),
  total_cents     bigint,
  created_at      timestamptz not null default now()
);

create index if not exists purchase_orders_lookup_idx
  on purchase_orders(restaurant_id, location_id, vendor_id);

create table if not exists purchase_order_lines (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  purchase_order_id  uuid not null references purchase_orders(id) on delete cascade,
  ingredient_id      uuid not null references ingredients(id),
  quantity           numeric not null,
  unit               text not null,
  unit_cost_cents    bigint
);

create index if not exists purchase_order_lines_po_idx
  on purchase_order_lines(purchase_order_id);

-- ------------------------------------------------------------
-- RLS: same tenant_isolation pattern as every prior phase.
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['purchase_orders', 'purchase_order_lines']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

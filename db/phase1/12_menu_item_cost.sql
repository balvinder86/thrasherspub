-- ============================================================
-- Phase 1 — Menu item cost override
-- ------------------------------------------------------------
-- Toast's Orders/Menus APIs don't expose item cost, so margin
-- (price - cost) can't be computed from synced data alone. This
-- adds a nullable, dashboard-editable field the Toast sync job
-- never writes to (it's not in the sync job's upsert payload),
-- so manual entries persist across syncs.
-- ============================================================
alter table menu_items add column if not exists cost_cents bigint;

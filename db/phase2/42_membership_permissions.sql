-- ============================================================
-- Phase 2 — per-feature access on top of role
-- ------------------------------------------------------------
-- Role (owner/manager/staff) alone was too coarse for real teams —
-- an owner needs to grant one person Inventory access without also
-- giving them Invoices or Marketing. permissions is a map of
-- {featureKey: boolean}; owners always have full access regardless
-- of what's stored here (enforced client-side and doesn't need a
-- row), and an empty/missing key for a manager or staff member means
-- no access to that feature, not "inherit a default" — every real
-- grant is explicit, set by an owner via the Admin tab.
-- ============================================================
alter table memberships
  add column if not exists permissions jsonb not null default '{}';

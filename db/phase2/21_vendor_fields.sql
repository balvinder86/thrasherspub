-- ============================================================
-- Phase 2 — Extra vendor fields
-- The Lovable-generated vendors UI (inventory.tsx) already expects
-- these fields; adding them rather than stripping the UI down.
-- ============================================================
alter table vendors add column if not exists contact_name text;
alter table vendors add column if not exists account_no text;
alter table vendors add column if not exists delivery_days text;   -- e.g. "Mon, Thu"
alter table vendors add column if not exists payment_terms text;   -- e.g. "Net 30"
alter table vendors add column if not exists notes text;

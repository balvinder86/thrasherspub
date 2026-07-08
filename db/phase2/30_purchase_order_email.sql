-- ============================================================
-- Phase 2 — Real vendor email for purchase orders
-- ------------------------------------------------------------
-- Purchase orders were previously internal-only record-keeping —
-- every PO got status='sent' at creation even though nothing was
-- ever actually communicated to the vendor. This adds real email
-- delivery tracking so "sent" reflects a real outbound email
-- (or an honest failure reason) instead of being a fixed label.
--
-- New rows default to 'draft' until an email actually goes out
-- (see the send-purchase-order-email Edge Function). Existing rows
-- keep their 'sent' status as historical record, but their new
-- emailed_at stays null — accurate, since no email feature existed
-- when they were created.
-- ============================================================

alter table purchase_orders
  add column if not exists emailed_at timestamptz,
  add column if not exists email_error text;

alter table purchase_orders drop constraint if exists purchase_orders_status_check;
alter table purchase_orders add constraint purchase_orders_status_check
  check (status in ('draft', 'sent', 'confirmed', 'received', 'cancelled'));

alter table purchase_orders alter column status set default 'draft';

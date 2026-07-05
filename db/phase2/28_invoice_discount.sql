-- Real per-invoice discount tracking, entered by the reviewer at approve
-- time (e.g. "TOTAL DISCOUNTS"/"Discount$" footer figures vendors print
-- on the invoice) rather than OCR-extracted, since the custom Mindee
-- model wasn't trained on this field.
alter table invoices
  add column if not exists discount_cents bigint;

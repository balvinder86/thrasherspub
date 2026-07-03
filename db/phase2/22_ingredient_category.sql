-- ============================================================
-- Phase 2 — Ingredient category
-- The Lovable-generated inventory.tsx UI filters/groups items by
-- category (Beverages, Alcohol, Food, Dry Goods, Miscellaneous) —
-- not in the original plan doc's ingredients spec, but a genuinely
-- useful real field, so adding it rather than dropping the UI's
-- category filtering.
-- ============================================================
alter table ingredients add column if not exists category text;

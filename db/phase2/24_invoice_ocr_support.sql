-- ============================================================
-- Phase 2 — Invoice OCR support
-- ------------------------------------------------------------
-- - pg_trgm: fuzzy string matching for auto-matching OCR line item
--   descriptions against existing ingredient names.
-- - match_ingredient(): given a restaurant + a raw description from
--   an invoice line, returns the best-matching ingredient id if
--   similarity clears a confidence threshold, else null (leaves it
--   for human review — never auto-matches on a weak guess).
-- - invoice-uploads storage bucket: private, path-scoped by
--   restaurant_id (RLS on storage.objects mirrors the tenant_isolation
--   pattern used on every table).
-- ============================================================
create extension if not exists pg_trgm;

create or replace function match_ingredient(p_restaurant_id uuid, p_description text)
returns uuid
language sql
stable
as $$
  select id
  from ingredients
  where restaurant_id = p_restaurant_id
    and similarity(name, p_description) > 0.4
  order by similarity(name, p_description) desc
  limit 1;
$$;

insert into storage.buckets (id, name, public)
values ('invoice-uploads', 'invoice-uploads', false)
on conflict (id) do nothing;

-- storage.objects is a Supabase-managed table with RLS already enabled
-- by default — we don't have (and don't need) owner privileges to
-- alter that, only to add a policy.
drop policy if exists tenant_isolation on storage.objects;
create policy tenant_isolation on storage.objects
  for all
  using (
    bucket_id = 'invoice-uploads'
    and (storage.foldername(name))[1]::uuid in (select my_restaurants())
  )
  with check (
    bucket_id = 'invoice-uploads'
    and (storage.foldername(name))[1]::uuid in (select my_restaurants())
  );

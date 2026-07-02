-- ============================================================
-- Phase 0 — CI guard: every public table must have RLS enabled
-- Run this in CI on every deploy. It raises an exception (non-zero
-- exit when run via psql -v ON_ERROR_STOP=1) if any table in the
-- public schema has row-level security disabled.
--
-- This catches the #1 long-term failure mode: someone adds a new
-- business table months from now and forgets the RLS line, silently
-- exposing every tenant's data.
-- ============================================================

do $$
declare
  unguarded text;
begin
  select string_agg(c.relname, ', ')
  into unguarded
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'            -- ordinary tables only
    and c.relrowsecurity = false;  -- RLS not enabled

  if unguarded is not null then
    raise exception 'RLS GUARD FAILED — these public tables have RLS disabled: %', unguarded;
  end if;

  raise notice 'RLS GUARD PASSED — all public tables have RLS enabled';
end $$;

-- Optional stricter check: RLS enabled but NO policy = deny-all,
-- which is safe but usually a mistake. Uncomment to flag those too.
--
-- do $$
-- declare
--   policyless text;
-- begin
--   select string_agg(c.relname, ', ')
--   into policyless
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public'
--     and c.relkind = 'r'
--     and c.relrowsecurity = true
--     and not exists (
--       select 1 from pg_policy p where p.polrelid = c.oid
--     );
--   if policyless is not null then
--     raise warning 'Tables with RLS on but no policy (deny-all): %', policyless;
--   end if;
-- end $$;

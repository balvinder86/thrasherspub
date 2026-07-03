-- ============================================================
-- Phase 1 — Vault secret reader (service-role only)
-- ------------------------------------------------------------
-- Edge functions run with the service role key. This wraps
-- vault.decrypted_secrets so server-side code can look up a
-- secret by name without exposing vault internals to anon or
-- authenticated roles over PostgREST.
-- ============================================================
create or replace function get_pos_secret(secret_name text)
returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;
$$;

revoke all on function get_pos_secret(text) from public;
revoke all on function get_pos_secret(text) from anon;
revoke all on function get_pos_secret(text) from authenticated;
grant execute on function get_pos_secret(text) to service_role;

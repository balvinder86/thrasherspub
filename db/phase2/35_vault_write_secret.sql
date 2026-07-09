-- ============================================================
-- Vault secret writer (service-role only) — the write-side twin of
-- get_pos_secret (db/phase1/11_vault_read_secret.sql). Every
-- credential so far (Toast, Gmail, Google Business Profile) was
-- provisioned by manually running SQL against the DB — fine for a
-- single pilot tenant, not something that scales to self-serve
-- multi-tenant onboarding. This lets an Edge Function create/update a
-- named Vault secret programmatically, e.g. from an OAuth callback
-- that just received a real tenant's token with no developer involved.
-- Upserts by name: reconnecting (a token refresh, a re-auth) updates
-- the existing secret rather than creating a duplicate.
-- ============================================================
create or replace function set_pos_secret(secret_name text, secret_value text)
returns void
language plpgsql
security definer
set search_path = vault, public
as $$
declare existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = secret_name;
  if existing_id is not null then
    perform vault.update_secret(existing_id, secret_value);
  else
    perform vault.create_secret(secret_value, secret_name);
  end if;
end;
$$;

revoke all on function set_pos_secret(text, text) from public;
revoke all on function set_pos_secret(text, text) from anon;
revoke all on function set_pos_secret(text, text) from authenticated;
grant execute on function set_pos_secret(text, text) to service_role;

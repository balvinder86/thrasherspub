-- ============================================================
-- Phase 0 — CI shim: Supabase auth stubs for vanilla Postgres
-- Runs FIRST in CI only. Supabase provides auth.users, auth.uid(),
-- and the "authenticated" role in production; a plain Postgres
-- container does not. This recreates just enough of them so the
-- same schema + tests run identically in CI and on Supabase.
--
-- DO NOT run this against a real Supabase project — it already
-- has these. This file is for the CI Postgres container only.
-- ============================================================

create extension if not exists pgcrypto;

-- Minimal auth schema + users table (subset of Supabase's shape)
create schema if not exists auth;

create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  aud                text,
  role               text
);

-- auth.uid() in Supabase reads the JWT "sub" claim from the
-- request GUCs. We replicate that: read request.jwt.claim.sub.
create or replace function auth.uid()
  returns uuid
  language sql
  stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- The role Supabase runs authenticated requests as.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end $$;

-- Let the authenticated role use the schemas/tables (RLS still
-- filters rows; this is just object-level access).
grant usage on schema public to authenticated;
grant usage on schema auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ============================================================
-- Phase 0 — Foundations: tenancy tables + RLS
-- Run in Supabase SQL editor (or as a migration).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tenancy tables
-- ------------------------------------------------------------

-- The tenant root. One row per client business.
-- Maps 1:1 to a Stripe Customer later (stripe_customer_id).
create table if not exists restaurants (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

-- A restaurant has many locations. The billable unit.
create table if not exists locations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  timezone      text not null default 'America/Chicago',
  created_at    timestamptz not null default now()
);

create index if not exists locations_restaurant_id_idx
  on locations(restaurant_id);

-- Maps a user to a restaurant with a role. Root of all isolation.
create table if not exists memberships (
  user_id       uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  role          text not null check (role in ('owner','manager','staff')),
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index if not exists memberships_restaurant_id_idx
  on memberships(restaurant_id);

-- ------------------------------------------------------------
-- 2. The identity helper
-- Returns the set of restaurant IDs the caller belongs to.
-- SECURITY DEFINER so it can read memberships regardless of RLS,
-- but it only ever returns rows for auth.uid() — the current user.
-- ------------------------------------------------------------

create or replace function my_restaurants()
  returns setof uuid
  language sql
  stable
  security definer
  set search_path = public
as $$
  select restaurant_id
  from memberships
  where user_id = auth.uid()
$$;

-- ------------------------------------------------------------
-- 3. Enable RLS + policies
-- ------------------------------------------------------------

-- restaurants: a user sees a restaurant only if they're a member.
alter table restaurants enable row level security;

drop policy if exists tenant_read on restaurants;
create policy tenant_read on restaurants
  for select
  using (id in (select my_restaurants()));

-- No insert/update/delete policy on restaurants for normal users.
-- Restaurants are created by the service role during onboarding.

-- locations: scoped by restaurant_id, both read and write.
alter table locations enable row level security;

drop policy if exists tenant_isolation on locations;
create policy tenant_isolation on locations
  using      (restaurant_id in (select my_restaurants()))
  with check (restaurant_id in (select my_restaurants()));

-- memberships: a user can read membership rows for restaurants
-- they belong to (so an owner can see their team). Writes are
-- service-role only (inviting members happens server-side).
alter table memberships enable row level security;

drop policy if exists tenant_read on memberships;
create policy tenant_read on memberships
  for select
  using (restaurant_id in (select my_restaurants()));

-- ============================================================
-- Reusable macro for future business tables
-- ============================================================
-- For every new table that carries restaurant_id, run:
--
--   alter table <table> enable row level security;
--   create policy tenant_isolation on <table>
--     using      (restaurant_id in (select my_restaurants()))
--     with check (restaurant_id in (select my_restaurants()));
--
-- The CI guard in ci_rls_guard.sql will fail the build if you
-- forget the "enable row level security" line.

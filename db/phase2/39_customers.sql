-- ============================================================
-- Real customer/guest database — the foundation the Marketing page's
-- Email/SMS/Loyalty/Audience tabs all need but none of them had: a
-- real list of names/emails/phones to actually send anything to.
-- Nothing here existed before (confirmed: no guest/customer table
-- anywhere, and the Toast sync only pulls order/sales data, never
-- guest contact info).
--
-- Seeded with a handful of clearly-fake sample rows (source='sample',
-- @example.com emails) at the owner's explicit request, so the new
-- Audience UI has something to show before a real list exists —
-- replace/delete these once the real list is bulk-imported.
-- ============================================================

create table if not exists customers (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  name              text not null,
  email             text,
  phone             text,
  tags              text[] not null default '{}',
  total_spend_cents bigint,
  visit_count       integer,
  last_visit_date   date,
  email_opt_in      boolean not null default true,
  sms_opt_in        boolean not null default true,
  source            text not null default 'manual'
                      check (source in ('manual', 'bulk_import', 'sample')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists customers_restaurant_idx on customers(restaurant_id);

-- Prevents an obvious duplicate re-import of the same person by
-- email; phone-only or email-less rows aren't constrained (a real
-- bulk import may have rows missing one or the other).
create unique index if not exists customers_restaurant_email_idx
  on customers(restaurant_id, email) where email is not null;

do $$
declare t text;
begin
  foreach t in array array['customers']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

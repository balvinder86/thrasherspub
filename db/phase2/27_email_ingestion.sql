-- ============================================================
-- Email-based invoice ingestion (Gmail).
-- A Railway cron job polls a connected Gmail inbox (scoped to a
-- label the user sets up themselves, e.g. "Invoices"), pulls PDF
-- attachments from new matching messages, and creates invoices the
-- same way manual upload does — status='pending_review', OCR
-- enqueued, human confirms everything (vendor, ingredient matches,
-- approval). Nothing here auto-trusts the sender.
-- ============================================================

-- invoices.vendor_id was NOT NULL, which assumed a human always
-- picks the vendor at upload time. Email-ingested invoices arrive
-- with no vendor known yet — the reviewer picks it during review,
-- same "AI drafts, human confirms" pattern as everything else here.
alter table invoices alter column vendor_id drop not null;

-- With no vendor picked yet, the reviewer needs *something* to go on
-- when choosing one — who the email was from and what it said.
alter table invoices add column if not exists source_email_from text;
alter table invoices add column if not exists source_email_subject text;

-- ------------------------------------------------------------
-- Gmail OAuth credentials per restaurant. The OAuth app's own
-- client_id/client_secret are a platform-wide Railway env var (not
-- tenant-specific, same treatment as MINDEE_API_KEY) — only the
-- per-account refresh token is tenant-specific, and it lives in
-- Vault, not this table. connected_email/label_filter are just
-- informational + query scoping, never secret.
-- ------------------------------------------------------------
create table if not exists email_ingestion_credentials (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  provider           text not null check (provider in ('gmail')),
  connected_email    text not null,
  vault_secret_name  text not null,          -- Vault secret holding {refreshToken}
  label_filter       text,                   -- e.g. "Invoices" — scopes the Gmail query
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create index if not exists email_ingestion_credentials_restaurant_idx
  on email_ingestion_credentials(restaurant_id);

-- ------------------------------------------------------------
-- Idempotency: one row per Gmail message ID ever processed, so a
-- cron run that overlaps the previous one (or a retry) never
-- creates a duplicate invoice from the same email.
-- ------------------------------------------------------------
create table if not exists processed_email_messages (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  provider       text not null,
  message_id     text not null,
  invoice_id     uuid references invoices(id) on delete set null,
  processed_at   timestamptz not null default now(),
  unique (restaurant_id, provider, message_id)
);

create index if not exists processed_email_messages_restaurant_idx
  on processed_email_messages(restaurant_id);

do $$
declare t text;
begin
  foreach t in array array['email_ingestion_credentials','processed_email_messages']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

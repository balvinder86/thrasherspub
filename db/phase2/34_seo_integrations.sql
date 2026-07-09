-- ============================================================
-- Real SEO data sources — Google Search Console (keyword rankings,
-- clicks, page performance, all queried live from Google's own
-- historical data, nothing snapshotted here) and PageSpeed Insights
-- (per-page technical scores, no auth needed beyond an API key so no
-- credentials table for it). Both replace the seo.tsx page's fully
-- mock keywords/pages/visibility sections.
-- ============================================================

create table if not exists search_console_credentials (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  site_url          text not null,       -- exact Search Console property identifier, e.g. "sc-domain:thrasherspubbothell.com"
  vault_secret_name text not null,       -- Vault secret holding {"refreshToken": "..."}
  connected_email   text not null,       -- which Google account authorized this, for display
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz,
  unique (restaurant_id)
);

create index if not exists search_console_credentials_restaurant_idx
  on search_console_credentials(restaurant_id);

do $$
declare t text;
begin
  foreach t in array array['search_console_credentials']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists tenant_isolation on %I;', t);
    execute format(
      'create policy tenant_isolation on %I
         using      (restaurant_id in (select my_restaurants()))
         with check (restaurant_id in (select my_restaurants()));', t);
  end loop;
end $$;

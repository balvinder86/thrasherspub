# PROJECT_CONTEXT — Restaurant Ops SaaS (thrasherspub)

> This document orients an AI coding assistant to the project. Read it fully before making changes. It describes the architecture, the decisions already made, what's built, and what's next.

## What this is

A multi-tenant restaurant operations dashboard, sold as SaaS to restaurants. Started as a single-restaurant prototype (Thrasher's Pub) built in Lovable; being converted into a real multi-tenant product that onboards paying clients across different POS systems. The first live tenant is Thrasher's Pub, running Toast POS (production).

The business wedge: back-of-house cost control (invoices, inventory, food cost %) — the area the main competitor (Owner.com) does not cover.

## Stack

- **Frontend:** Lovable (TanStack Start + React 19 + Vite + Tailwind + shadcn/ui). Repo: `thrasherspub`, synced to both Lovable and GitHub (`balvinder86/thrasherspub`). Package manager is `bun`, not npm.
- **Data tier:** Supabase (project ref `dgyfcosmgbbtcwrqnevg`) — Postgres, Auth, Vault (secrets), storage.
- **Service tier:** Railway — background cron jobs, webhook receivers, long-running work the frontend can't do. First service: `thrasherspub-toast-sync` (own Railway project).
- **Billing:** Stripe — per-location subscriptions (Phase 3, not yet built).
- **CI:** GitHub Actions (`.github/workflows/db-isolation.yml`) — runs the tenant-isolation test suite on every push/PR.
- **Email:** Resend SMTP (Supabase's built-in mailer is rate-limited to 2/hour — replaced for auth emails).

## Core architectural decisions (do not silently change these)

1. **Shared-database multi-tenancy with Row-Level Security**, NOT database-per-tenant. Every business table carries a `restaurant_id`. RLS policies filter every query by the tenant the caller belongs to. This is the load-bearing security model.

2. **Tenant identity chain:** `auth.users` (Supabase Auth) → `memberships` (maps user → restaurant + role) → `my_restaurants()` helper function → RLS policies reference `my_restaurants()`. Every business table's policy is:
   ```sql
   using      (restaurant_id in (select my_restaurants()))
   with check (restaurant_id in (select my_restaurants()))
   ```
   Both `using` (reads) AND `with check` (writes) must be set. Omitting `with check` is a security hole.

3. **POS integration uses an adapter pattern.** A vendor-neutral client interface + normalized field mapping. Each POS (Toast, SkyTab, Square) is one module implementing the same shape. The dashboard and business logic only ever see normalized types and never know which POS a restaurant runs. Adding a POS = one new adapter file, no downstream changes.

4. **Raw + normalized storage.** Store the untouched vendor payload (`pos_raw_events`) AND the normalized rows. Lets us reprocess history if an adapter mapping is fixed, without re-pulling from the vendor. Also the audit trail for "these numbers look wrong."

5. **Idempotent syncs.** Every normalized table has a natural key (e.g. `pmix_sales` unique on `location_id, business_date, menu_item_pos_id`). Re-running a sync upserts in place and never double-counts.

6. **Secrets live in Supabase Vault, never in code, env files in git, or plain DB columns.** POS credentials are stored as a JSON blob in Vault (`{"clientId":"...","clientSecret":"..."}`), referenced everywhere else only by the Vault secret name. The `pos_credentials` table stores the secret *name*, not the secret. Reading a Vault secret from application code goes through a service-role-only Postgres function (`get_pos_secret`) — never exposed to `anon`/`authenticated` roles.

7. **Frontend auth is real Supabase Auth (email+password), not mocked.** Login gates the whole app at `__root.tsx`. Once signed in, RLS automatically scopes every client-side query to the user's own restaurant(s) via `memberships` — no manual `restaurant_id` filtering needed in queries.

## CRITICAL: the service-role write path

The Railway sync job connects with the Supabase **service role**, which **bypasses RLS by design** (it must write across all tenants). This means:

- The database will NOT catch a bug that writes the wrong `restaurant_id`.
- Tenant isolation on the write path is enforced by CODE, not Postgres.
- **Every service-role write MUST explicitly set the correct `restaurant_id`/`location_id`** — always sourced from the credential row being processed, never from the vendor API payload.
- `sync/src/db.ts`'s upsert helpers all take the credential row and derive tenant IDs from it, not from caller-supplied data — this is the enforcement point.

## Lovable caution

Lovable's Supabase integration generates UI and can generate tables from prompts, but does NOT reliably set up correct multi-tenant RLS (it tends to omit `with check` or skip RLS entirely). **The SQL files in this repo are the source of truth for anything tenant-scoped.** Let Lovable build UI against existing tables; own the schema and RLS layer manually via the SQL files. When schema changes, edit the SQL file in the repo AND apply to Supabase in lockstep via `supabase db query --linked -f <file>` — never let Lovable improvise the security model.

## Data model

Tenancy core (Phase 0):
- `restaurants` — tenant root. 1:1 with a Stripe Customer (later).
- `locations` — a restaurant has many; the billable unit.
- `memberships` — user → restaurant + role (owner/manager/staff). Root of isolation.

POS data (Phase 1):
- `pos_credentials` — provider, vendor location ref (Toast GUID), Vault secret name, api_hostname, `last_synced_at` watermark. NO secret stored here.
- `pos_raw_events` — untouched vendor JSON, unique on `(location_id, provider, event_type, pos_ref)`.
- `pmix_sales` — normalized product mix/sales, unique on `(location_id, business_date, menu_item_pos_id)`.
- `menu_items` — normalized menu, unique on `(location_id, pos_id)`. Has a dashboard-editable `cost_cents` (nullable — Toast doesn't expose item cost; the sync job never writes this column, so manual entries persist across syncs).

Later phases add: `vendors`, `ingredients`, `recipe_lines`, `invoices`, `invoice_lines`, `par_levels` (Phase 2); `subscriptions` (Phase 3).

## Phase roadmap

- **Phase 0 — Foundations. ✅ COMPLETE.** Tenancy tables, RLS, `my_restaurants()`, isolation test suite, CI guard. All green in GitHub Actions.
- **Phase 1 — One live POS (Toast) + real auth. ✅ COMPLETE (2026-07-03).** Thrasher's Pub is a real tenant; Toast sync running on Railway every 10 min (30-day backfill: 4356 orders, 3096 pmix rows, 329 menu items synced); real Supabase Auth login gating the app; Sales/Product Mix dashboard reads real data (confirmed in a real browser test). Powers **Sales** and **Product Mix** modules.
- **Phase 2 — Back-of-house wedge. 🔨 NEXT.** Invoice OCR → line items, inventory/par levels, food cost %. The differentiator. Powers **Invoices**, **Inventory/Par**, **Food Cost %** modules. See `BUILD_PLAN_PHASES_2-4.md`.
- **Phase 3 — Billing & onboarding.** Stripe per-location subscriptions, webhook receiver, tier-gating, self-serve onboarding. Powers **Admin**, **Settings/Billing**.
- **Phase 4 — Upsell tiers.** Connect data for **Reviews**, **Marketing/SEO**, **Loyalty**, **Scheduling** modules.

## Module → phase mapping

| Module | Phase | Data source |
|--------|-------|-------------|
| Sales | 1 ✅ | `pmix_sales` (Toast) |
| Product Mix | 1 ✅ | `pmix_sales` / `menu_items` (Toast) |
| Invoices | 2 | OCR pipeline → `invoices`/`invoice_lines` |
| Inventory / Par Levels | 2 | `par_levels`, ingredient usage |
| Food Cost % | 2 | PMIX × recipe cost bridge |
| Reviews | 4 | external review APIs |
| Marketing / SEO | 4 | campaign data |
| Loyalty | 4 | membership/points data |
| Scheduling | 4 | labor data |
| Admin | 3 | memberships, onboarding, billing |
| Settings | 3 | POS connection, tier management |

## Toast API specifics (Phase 1)

- Auth: `POST {api_hostname}/authentication/v1/authentication/login` with `{clientId, clientSecret, userAccessType:"TOAST_MACHINE_CLIENT"}` → bearer token nested under `token.accessToken`.
- Orders: `GET {api_hostname}/orders/v2/ordersBulk?businessDate=YYYYMMDD&page=N&pageSize=100`. Paginated.
- Menus: `GET {api_hostname}/menus/v2/menus`. Items can appear on multiple menus — dedupe by item GUID before upserting.
- Every request needs header `Toast-Restaurant-External-ID: <restaurant GUID>`.
- Production hostname in use: `https://ws-api.toasttab.com`.
- Access path: standard API access via Toast RMS subscription (self-serve, read scopes) — sufficient for Phase 1. Full partner program only needed for restaurants the operator doesn't own.
- Money comes as decimal dollars; store integer cents. Business dates come as YYYYMMDD ints; normalize to YYYY-MM-DD.

## Repo layout (relevant parts)

```
db/phase0/          # tenancy schema, seed, isolation tests, CI shim + guard
db/phase1/          # POS schema, vault-read RPC, menu item cost column
.github/workflows/  # db-isolation.yml (CI: runs isolation suite)
sync/                # Railway cron job: Toast client (src/toast.ts), Supabase writer (src/db.ts), entrypoint (src/index.ts)
supabase/            # CLI-linked config (config.toml), custom auth email templates
src/lib/pos/         # queries.ts — react-query hooks reading real POS data (pmix_sales/menu_items)
src/lib/supabase/    # client.ts (browser client, anon key), auth-context.tsx (AuthProvider/useAuth)
src/routes/          # Lovable/TanStack Start frontend — login.tsx, set-password.tsx, __root.tsx (auth gate), product-mix.tsx, index.tsx
```

See `BUILD_PLAN_PHASES_2-4.md` for the detailed Phase 2-4 plan.

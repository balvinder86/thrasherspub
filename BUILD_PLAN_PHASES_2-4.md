# BUILD PLAN — Phases 2–4 (thrasherspub Restaurant Ops SaaS)

> Continues from PROJECT_CONTEXT.md. Phases 0 and 1 are complete: tenant isolation (RLS) is live, and Toast sales data flows into `pmix_sales` / `menu_items` for Thrasher's Pub. This document covers the remaining three phases and the 9 modules they light up.
>
> **Read PROJECT_CONTEXT.md first.** Every guardrail there still applies: shared-DB multi-tenancy with RLS on every table (both `using` and `with check`), secrets only in Vault, service-role writes must set tenant IDs explicitly, SQL files are the schema source of truth (not Lovable-generated), and the CI isolation guard must stay green.

---

## Non-negotiables for every new table in these phases

Any business table added below MUST carry `restaurant_id` and get the standard policy. Apply this immediately after each `create table`:

```sql
alter table <table> enable row level security;
drop policy if exists tenant_isolation on <table>;
create policy tenant_isolation on <table>
  using      (restaurant_id in (select my_restaurants()))
  with check (restaurant_id in (select my_restaurants()));
```

Add each new schema file to `db/phase2/`, `db/phase3/`, `db/phase4/` in the repo, and add an `Apply` step to `.github/workflows/db-isolation.yml` so the CI guard verifies RLS on the new tables (same pattern used for `db/phase1/10_pos_schema.sql`).

---

# PHASE 2 — Back-of-house cost control (the wedge)

**Why this phase matters most:** this is the differentiator Owner.com doesn't cover, and the reason an operator pays and keeps paying. It turns raw sales (Phase 1) into actionable cost intelligence: what you bought, what you used, what it cost, and where you're bleeding margin.

**Modules lit up:** Invoices, Inventory / Par Levels, Food Cost %.

**Depends on:** live `pmix_sales` from Phase 1 (needed for usage and food cost math).

## 2.1 Data model

Add these tables (file: `db/phase2/20_boh_schema.sql`). All carry `restaurant_id` + the tenant policy.

- **`vendors`** — suppliers. `id, restaurant_id, name, contact_email, phone, created_at`.
- **`ingredients`** — raw goods purchased. `id, restaurant_id, name, unit (e.g. 'lb','case','each'), unit_cost_cents (latest known), created_at`. This is the canonical list of things you buy.
- **`recipe_lines`** — the RECIPE BRIDGE. Maps a sold menu item to the ingredients it consumes. `id, restaurant_id, menu_item_pos_id, ingredient_id, quantity, unit`. One menu item has many recipe lines. This is what connects "sold 40 burgers" to "used 40 patties, 40 buns, 5 lb lettuce."
- **`invoices`** — vendor invoice header. `id, restaurant_id, location_id, vendor_id, invoice_number, invoice_date, total_cents, status ('pending_review','approved'), source_file_url, created_at`.
- **`invoice_lines`** — line items on an invoice. `id, restaurant_id, invoice_id, ingredient_id (nullable until matched), raw_description, quantity, unit, unit_cost_cents, line_total_cents`.
- **`par_levels`** — reorder thresholds per ingredient per location. `id, restaurant_id, location_id, ingredient_id, par_quantity, safety_stock, days_to_delivery, updated_at`.

## 2.2 Invoice OCR — RECOMMENDED APPROACH

**Recommendation: use a hosted document-AI OCR API, not a self-hosted OCR engine, and gate every extraction behind a human-review step.**

Reasoning: vendor invoices are wildly inconsistent (every distributor has a different layout), so raw OCR (e.g. Tesseract) produces messy text you'd have to parse with brittle rules. A hosted document-AI service returns structured line items (description, qty, unit price, total) far more reliably. The cost per invoice is trivial relative to the labor it saves. Options in this category include cloud document-AI services from major providers and invoice-specialized APIs — pick one with a "line item extraction" or "invoice parsing" feature. Do NOT build your own OCR model; it's not the wedge and not worth the time.

**Critical design rule: OCR output is a DRAFT, never trusted directly.** Every parsed invoice lands in `status='pending_review'` and a human confirms/corrects the line items and their ingredient matches before it counts toward food cost. This protects data quality (bad cost data poisons every downstream number) and is also your ingredient-matching training loop.

### Invoice pipeline (step by step)

1. **Upload.** User uploads an invoice photo/PDF in the Invoices module. Store the file in Supabase storage; record `source_file_url` on a new `invoices` row with `status='pending_review'`.
2. **Extract.** A Railway endpoint (or Supabase Edge Function) sends the file to the OCR API, gets back structured line items.
3. **Persist draft.** Write `invoice_lines` with `raw_description`, quantity, unit, costs. Leave `ingredient_id` NULL.
4. **Auto-match ingredients.** For each line, fuzzy-match `raw_description` against existing `ingredients` names. High-confidence matches pre-fill `ingredient_id`; low-confidence stay NULL for the human.
5. **Human review.** UI shows extracted lines side by side with the source image. User corrects quantities/costs, confirms or sets the ingredient match (creating a new ingredient if needed), then approves. On approve: set `invoices.status='approved'`, and update each matched `ingredients.unit_cost_cents` to the newest cost.
6. **Cost history (optional but recommended).** Keep an `ingredient_cost_history` row per approved invoice line so you can chart cost trends and compute variance.

## 2.3 Inventory / Par Levels

Par level = how much to keep on hand so you don't run out before the next delivery.

**Formula:** `par_quantity = (average_daily_usage × days_to_delivery) + safety_stock`.

- **`average_daily_usage`** is derived: for each ingredient, sum `recipe_lines.quantity × pmix_sales.quantity_sold` across a trailing window (e.g. 28 days), divided by days. This is where Phase 1's sales data becomes inventory intelligence — you infer usage from what sold, not from manual counts.
- Store computed par levels in `par_levels`; recompute on a schedule (Railway cron) or on demand.
- The module shows: current par, computed suggested par, and flags ingredients below reorder point.

## 2.4 Food Cost %

The headline back-of-house metric. `food_cost_% = (cost of ingredients used) / (net sales) × 100`.

- **Ingredients used cost** = for each sold menu item, sum `recipe_lines.quantity × ingredient.unit_cost_cents`, across the period. (This is "theoretical" food cost — what it *should* have cost based on recipes.)
- **Net sales** = sum `pmix_sales.net_sales_cents` for the period.
- **Variance** = theoretical food cost vs actual spend (from approved invoices). A gap means waste, theft, over-portioning, or price creep — the insight operators pay for.
- Compute per location, per period. Show trend over time and per-menu-item cost contribution.

## 2.5 Phase 2 build order

1. Schema (`db/phase2/20_boh_schema.sql`) + RLS + CI step.
2. Vendors + ingredients CRUD (simple UI, needed before invoices are useful).
3. Recipe bridge UI: map each menu item (from `menu_items`) to its ingredients. Tedious but foundational — food cost is impossible without it.
4. Invoice upload + OCR extract + review/approve flow.
5. Par level computation (cron) + Inventory module UI.
6. Food cost % + variance calculations + module UI.

**Gate:** Phase 2 is done when an approved invoice updates ingredient costs, par levels compute from real sales, and food cost % shows a real number with variance against actual spend.

---

# PHASE 3 — Billing & onboarding (turns it into a business)

**Why:** this is the line between a demo and a company. When it's done you can charge money and bring on a client without hand-holding.

**Modules lit up:** Admin, Settings/Billing.

## 3.1 Stripe account setup (you don't have one yet)

1. Create a Stripe account at stripe.com. Complete business verification (bank details, tax info) — required before you can accept live payments, but you can build entirely in **test mode** first.
2. Get your API keys (test mode): publishable key + secret key. **The secret key goes in Vault**, never in code or the repo.
3. Define your products/prices in the Stripe dashboard:
   - A **per-location** recurring price (e.g. monthly). This is the billable unit — a restaurant with 3 locations = quantity 3.
   - Set up two **tiers** via `lookup_key` on prices: `boh` (back-of-house only) and `full` (adds Phase 4 modules). Tiers are how you package.
4. Set up a **webhook endpoint** (points at your Railway receiver, below) and get the **webhook signing secret** → also into Vault.

## 3.2 Data model

Add `db/phase3/30_billing_schema.sql`:

- **`subscriptions`** — mirror of Stripe state, keyed by `restaurant_id`. `id, restaurant_id, stripe_subscription_id, status ('active','past_due','canceled', etc.), plan_tier ('boh'|'full'), quantity (locations), current_period_end, updated_at`. RLS as usual.
- Add `stripe_customer_id` to `restaurants` (one Stripe Customer per restaurant) if not already present.

**Rule: Stripe is the source of truth; the DB mirrors it.** Never decide "is this active" by calling Stripe on page load. Read `subscriptions.status` from the mirror, which is updated only by webhooks.

## 3.3 Stripe webhook receiver (Railway)

An endpoint on Railway that:
1. **Verifies the webhook signature** using the signing secret from Vault. This is the one security-critical line — without it, anyone can forge a "subscription active" event. Reject unsigned/invalid.
2. Handles `customer.subscription.created/updated/deleted` and `invoice.payment_failed`: upsert the `subscriptions` row (keyed by `restaurant_id` from the subscription metadata — set this metadata when creating the subscription) with new status/tier/quantity/period end.

## 3.4 Tier gating (one place)

A single authorization check — "does this restaurant's subscription allow this module?" — reading from `subscriptions`. Put it in one middleware/helper used everywhere, not scattered per module. Mapping:

- `boh` tier → Sales, Product Mix, Invoices, Inventory/Par, Food Cost %.
- `full` tier → all of the above + Reviews, Marketing/SEO, Loyalty, Scheduling.
- `past_due`/`canceled` → read-only or locked, per your policy.

## 3.5 Self-serve onboarding flow

The thing that lets client #4 come live without you. A guided, resumable flow with a completion state per step:

1. Create restaurant + first location (service-role, since `restaurants` has no user INSERT policy).
2. Invite owner (create `memberships` row; send invite via Supabase Auth).
3. Connect POS via OAuth (store creds in Vault, insert `pos_credentials` — reuses Phase 1 plumbing).
4. Import menu (triggers a menu sync).
5. Map recipes (the recipe bridge — can be deferred but prompt for it).
6. Set par levels.
7. Connect Stripe (create Customer + subscription with `restaurant_id` in metadata, quantity = # locations).

Each step writes progress so the user can resume. This flow IS the Admin module's core.

## 3.6 Phase 3 build order

1. Stripe account + test-mode products/prices/webhook.
2. Schema (`30_billing_schema.sql`) + RLS + CI step.
3. Webhook receiver on Railway (with signature verification).
4. Subscription creation flow (Customer + subscription + metadata).
5. Tier-gating helper wired into the app's auth layer.
6. Onboarding wizard UI (Admin module).

**Gate:** Phase 3 is done when you can onboard a fresh restaurant end to end — including Stripe subscription in test mode — without manual DB edits, and module access correctly reflects the tier.

---

# PHASE 4 — Upsell tier modules

**Why last:** these raise the price rather than justify the first dollar. They're already built as UI; they become real as you connect data sources. Each is independent, so build in whatever order maps to customer demand.

**Modules lit up:** Reviews, Marketing / SEO, Loyalty, Scheduling.

## 4.1 Reviews

- Pull reviews from external platforms (Google Business Profile, Yelp, etc. — each has its own API and access approval; start those applications early, like Toast).
- Data model: `reviews` (`id, restaurant_id, location_id, platform, author, rating, text, posted_at, responded boolean`).
- Features: aggregate rating trend, unresponded-review queue, optional AI-drafted responses (can reuse an LLM call).

## 4.2 Marketing / SEO

- Campaign tracking + the AEO/GEO angle (answer-engine/generative-engine optimization) you researched earlier.
- Data model: `campaigns` (`id, restaurant_id, channel, name, spend_cents, starts_at, ends_at, metrics jsonb`).
- Features: campaign ROI (tie spend to sales lift from `pmix_sales`), local SEO/AEO checklist and monitoring.

## 4.3 Loyalty

- Points/repeat-visit program. Note: this connects to the Giorgio's-style customer app concept (SkyTab/Shift4 order linkage) if you go that route.
- Data model: `loyalty_members` (`id, restaurant_id, customer_ref, points_balance, joined_at`), `loyalty_ledger` (`id, restaurant_id, member_id, delta, reason, created_at`) — ledger pattern for auditable point history.
- Features: enrollment, points accrual on orders, redemption.

## 4.4 Scheduling

- Labor scheduling + labor cost %.
- Data model: `shifts` (`id, restaurant_id, location_id, employee_ref, role, starts_at, ends_at, hourly_cents`).
- Features: schedule builder, labor cost as % of sales (bridge to `pmix_sales`), overtime flags.

## 4.5 Phase 4 build order

Per module, independently: schema + RLS + CI step → data source connection → UI wiring → tier-gate behind `full`. Prioritize by what your paying customers ask for first.

**Gate:** each module is done when it shows real data (not mocks) and is correctly gated to the `full` tier.

---

## Cross-phase reminders

- Every new table: `restaurant_id` + tenant policy + CI-guarded. No exceptions.
- Every external API (OCR, Stripe, review platforms): key in Vault, referenced by name.
- Every service-role writer (OCR pipeline, webhook receiver, cron jobs): set tenant IDs explicitly in code; add a unit test asserting rows carry the right `restaurant_id`.
- Keep SQL files in the repo as source of truth; apply to Supabase in lockstep; don't let Lovable regenerate tenant-scoped tables.
- Update PROJECT_CONTEXT.md's status section as each phase completes so Cursor's context stays accurate.

## Suggested overall sequence

Phase 2 fully (it's the wedge) → Phase 3 fully (so you can charge) → Phase 4 by customer demand. Within Phase 2, the recipe bridge is the unglamorous keystone — food cost and par levels are both impossible without it, so don't skip ahead to the dashboards before the mapping exists.

/**
 * Delete a posted reply by reviewer name — the safety net for the
 * live-post verification step. Ported from
 * ~/dev/restaurant-review-agent/delete-reply.js; the delete flow itself
 * (Replied tab, find the review card, open the reply's own menu, click
 * Delete, confirm) is unchanged. The only real change is where cookies
 * and business info come from: the source script read a local
 * cookies.json + .env, but this project stores that per-restaurant in
 * Supabase (Vault + review_agent_credentials) now, not local files —
 * so this pulls the same data the deployed service uses, straight from
 * Supabase, rather than expecting a redundant local copy to exist.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/delete-test-reply.mjs <restaurant_id> "Reviewer Name"
 */

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

const restaurantId = process.argv[2];
const targetReviewer = process.argv[3];
if (!restaurantId || !targetReviewer) {
  console.error('Usage: node scripts/delete-test-reply.mjs <restaurant_id> "Reviewer Name"');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: cred, error: credErr } = await supabase
    .from("review_agent_credentials")
    .select("business_profile_id, search_query, vault_secret_name")
    .eq("restaurant_id", restaurantId)
    .eq("provider", "google")
    .single();
  if (credErr || !cred) throw new Error(`no review agent credentials for restaurant ${restaurantId}: ${credErr?.message ?? ""}`);

  const { data: secretRaw, error: secretErr } = await supabase.rpc("get_pos_secret", {
    secret_name: cred.vault_secret_name,
  });
  if (secretErr || !secretRaw) throw new Error(`vault secret not found: ${secretErr?.message ?? ""}`);
  const { cookies } = JSON.parse(secretRaw);

  const businessId = cred.business_profile_id;
  const searchQuery = cred.search_query;

  const browser = await chromium.launch({ headless: false, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies(cookies);
  const page = await context.newPage();

  try {
    console.log(`Looking up "${targetReviewer}" reply...`);
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en`, {
      waitUntil: "domcontentloaded",
    });
    await SLEEP(3000);

    await page.locator("text=Read reviews").first().click();
    await page.waitForSelector(`iframe[src*="${businessId}"]`, { timeout: 15000 });
    await SLEEP(2000);

    const frame = () => page.frameLocator(`iframe[src*="${businessId}"]`).first();

    await frame().getByText("Replied", { exact: true }).first().click();
    await SLEEP(3000);

    const f = page.frames().find((fr) => fr.url().includes(businessId));
    const found = await f.evaluate((name) => {
      const reviewerEl = Array.from(document.querySelectorAll("a, span, div")).find(
        (el) => el.textContent?.trim() === name,
      );
      if (!reviewerEl) return { ok: false, reason: "reviewer not found" };

      let card = reviewerEl;
      for (let i = 0; i < 15 && card; i++) {
        if (card.querySelector('[aria-label*="star" i]')) break;
        card = card.parentElement;
      }
      if (!card) return { ok: false, reason: "review card not found" };

      const menuButtons = Array.from(card.querySelectorAll("button")).filter((b) => {
        const aria = b.getAttribute("aria-label") || "";
        return /more|menu|options/i.test(aria);
      });
      if (menuButtons.length === 0) return { ok: false, reason: "no menu buttons found" };

      // Click the LAST one (the reply's own menu, not the review's).
      menuButtons[menuButtons.length - 1].click();
      return { ok: true, menuCount: menuButtons.length };
    }, targetReviewer);

    console.log("Menu open result:", found);
    if (!found.ok) throw new Error(found.reason);

    await SLEEP(1500);

    await frame().getByText("Delete", { exact: true }).first().click();
    await SLEEP(1500);
    await frame().getByText("Delete", { exact: true }).last().click();
    await SLEEP(2000);

    console.log(`✅ Deleted reply for "${targetReviewer}"`);
    console.log("Remember to also reset the matching reviews row's status/posted_at in the DB.");
  } finally {
    await SLEEP(2000);
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});

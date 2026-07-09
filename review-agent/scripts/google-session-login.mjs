/**
 * One-time login script — extracts your existing Chrome session so the
 * review agent can reuse it without ever needing to sign in again.
 *
 * Ported from ~/dev/restaurant-review-agent/login.js. The capture flow
 * itself is unchanged; only the output changed — instead of writing a
 * local cookies.json / printing a Railway env blob, it prints a
 * ready-to-paste Supabase SQL snippet, matching this project's existing
 * manual-Vault-provisioning convention (same shape as
 * email-ingest/get-refresh-token.mjs's hand-pasted output).
 *
 * Usage:
 *   1. Quit Chrome completely (right-click Dock icon → Quit)
 *   2. node scripts/google-session-login.mjs
 *   3. Confirm the business reviews panel is visible, then press ENTER
 *   4. Answer the restaurant/business prompts
 *   5. Paste the printed SQL into the Supabase SQL editor
 */

import { chromium } from "playwright";
import os from "os";
import readline from "readline";

const CHROME_PROFILE = `${os.homedir()}/Library/Application Support/Google/Chrome/Default`;

function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (ans) => { rl.close(); resolve(ans); }));
}

async function login() {
  console.log("\n=== Google Review Agent — Session Login ===\n");
  console.log("STEP 1: Quit Chrome completely before continuing.");
  console.log("        Right-click the Chrome icon in your Dock → Quit\n");

  await prompt("Press ENTER once Chrome is fully closed...");

  console.log("\nOpening your existing Chrome session...\n");

  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel: "chrome",
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = await context.newPage();

  await page.goto("https://accounts.google.com");
  await page.waitForTimeout(1500);
  await page.goto("https://www.google.com");
  await page.waitForTimeout(1500);

  console.log("Chrome is open with your existing login.");
  console.log("\nSTEP 2: Search for the restaurant and confirm the Business Panel");
  console.log("        and reviews are visible.\n");

  await prompt("Press ENTER to save the session...");

  const cookies = await context.cookies([
    "https://www.google.com",
    "https://accounts.google.com",
    "https://myaccount.google.com",
    "https://business.google.com",
  ]);

  await context.close();

  console.log("\n✅ Session captured.\n");

  const restaurantId = await prompt("Restaurant ID (from thrasherspub's restaurants table): ");
  const businessProfileId = await prompt("Business Profile ID (numeric, e.g. 13806459355847850714): ");
  const searchQuery = await prompt("Search query (what you typed into Google to find the reviews panel): ");
  const vaultSecretName = await prompt(
    "Vault secret name to use (e.g. google_reviews_thrashers): ",
  );

  const cookiesJson = JSON.stringify({ cookies });

  console.log("\n=== Paste this into the Supabase SQL editor ===\n");
  console.log(`select vault.create_secret(\n  '${cookiesJson.replace(/'/g, "''")}',\n  '${vaultSecretName}'\n);\n`);
  console.log(
    `insert into review_agent_credentials (restaurant_id, provider, business_profile_id, search_query, vault_secret_name, cookies_captured_at)\nvalues ('${restaurantId}', 'google', '${businessProfileId}', '${searchQuery.replace(/'/g, "''")}', '${vaultSecretName}', now());\n`,
  );
  console.log("=================================================\n");

  process.exit(0);
}

login().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});

// Where Google redirects back to after a real tenant approves Search
// Console access (see search-console-oauth-start for how this flow
// begins). Public GET endpoint — no Authorization header exists at
// this point, since the browser fully navigated away and back. The
// signed `state` param (see ../_shared/oauth-state.ts) is what proves
// which restaurant this belongs to and that it's a real continuation
// of a real member-initiated flow, not a forged request.
//
// Uses GOOGLE_WEB_CLIENT_ID/SECRET (a "Web application" type OAuth
// client), not GMAIL_CLIENT_ID/SECRET — that one is a "Desktop" type
// client used for the local invoice-ingestion setup script, and
// Desktop clients can't be configured with a custom HTTPS redirect
// URI at all, only localhost loopback.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyState } from "../_shared/oauth-state.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GOOGLE_WEB_CLIENT_ID = Deno.env.get("GOOGLE_WEB_CLIENT_ID")!;
const GOOGLE_WEB_CLIENT_SECRET = Deno.env.get("GOOGLE_WEB_CLIENT_SECRET")!;
const OAUTH_STATE_SECRET = Deno.env.get("OAUTH_STATE_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

function redirectToApp(status: "connected" | "error", message?: string): Response {
  const url = new URL(`${APP_BASE_URL}/seo`);
  url.searchParams.set("searchConsole", status);
  if (message) url.searchParams.set("message", message);
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const googleError = url.searchParams.get("error");

    if (googleError) {
      return redirectToApp("error", `Google denied access: ${googleError}`);
    }
    if (!code || !state) {
      return redirectToApp("error", "Missing code or state from Google's redirect.");
    }

    const { restaurantId } = await verifyState(OAUTH_STATE_SECRET, state);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_WEB_CLIENT_ID,
        client_secret: GOOGLE_WEB_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${SUPABASE_URL}/functions/v1/search-console-oauth-callback`,
      }),
    });
    const tokenBody = await tokenRes.json();
    if (!tokenRes.ok || !tokenBody.refresh_token) {
      return redirectToApp("error", "Token exchange with Google failed.");
    }

    const [userInfoRes, sitesRes] = await Promise.all([
      fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      }),
      fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      }),
    ]);
    const userInfo = await userInfoRes.json().catch(() => ({}));
    const sitesBody = await sitesRes.json().catch(() => ({}));
    const siteEntries: { siteUrl: string }[] = sitesBody.siteEntry ?? [];

    if (siteEntries.length === 0) {
      return redirectToApp(
        "error",
        "That Google account has no verified Search Console properties. Verify your domain in Search Console first, then try connecting again.",
      );
    }

    // No per-tenant "pick a property" UI yet — reasonable for the
    // common single-site case. Prefer a domain-level property
    // (sc-domain:...) since that's what Search Console recommends
    // today; otherwise take whatever's first.
    const chosen = siteEntries.find((s) => s.siteUrl.startsWith("sc-domain:")) ?? siteEntries[0];

    const vaultSecretName = `search_console_${restaurantId}`;
    const { error: vaultErr } = await supabase.rpc("set_pos_secret", {
      secret_name: vaultSecretName,
      secret_value: JSON.stringify({ refreshToken: tokenBody.refresh_token }),
    });
    if (vaultErr) {
      return redirectToApp("error", `Could not store credentials: ${vaultErr.message}`);
    }

    const { error: upsertErr } = await supabase.from("search_console_credentials").upsert(
      {
        restaurant_id: restaurantId,
        site_url: chosen.siteUrl,
        vault_secret_name: vaultSecretName,
        connected_email: userInfo.email ?? "unknown",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id" },
    );
    if (upsertErr) {
      return redirectToApp("error", `Could not save connection: ${upsertErr.message}`);
    }

    return redirectToApp("connected");
  } catch (e) {
    return redirectToApp("error", String(e));
  }
});

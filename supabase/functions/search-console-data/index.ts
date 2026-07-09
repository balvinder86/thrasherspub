// Real Google Search Console data — actual keyword rankings, clicks,
// impressions, and page performance for the restaurant's real site.
// Replaces seo.tsx's fully-mock visibilitySeries/keywords/pages
// sections. No persistence: Search Console's own API already serves
// historical date-range queries, so there's nothing to snapshot here.
//
//   { restaurant_id, view: "overview" | "keywords" | "pages" }
//
// Verifies the caller's session JWT, then verifies restaurant
// membership before touching anything (the service-role client below
// bypasses RLS).

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// GOOGLE_WEB_CLIENT_ID/SECRET, not GMAIL_CLIENT_ID/SECRET — the
// refresh token stored for this tenant was issued by the "Web
// application" type OAuth client (search-console-oauth-start/
// callback), and a refresh token only works with the exact client
// that issued it. Using the wrong client here fails with
// "unauthorized_client", not a helpful error.
const GOOGLE_WEB_CLIENT_ID = Deno.env.get("GOOGLE_WEB_CLIENT_ID")!;
const GOOGLE_WEB_CLIENT_SECRET = Deno.env.get("GOOGLE_WEB_CLIENT_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_WEB_CLIENT_ID,
      client_secret: GOOGLE_WEB_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`refresh access token failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function queryOneDimension(
  accessToken: string,
  siteUrl: string,
  dimension: "date" | "query" | "page",
  startDate: string,
  endDate: string,
  rowLimit: number,
): Promise<SearchAnalyticsRow[]> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ startDate, endDate, dimensions: [dimension], rowLimit }),
    },
  );
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Search Console API error (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.rows ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return json({ ok: false, error: "missing Authorization header" }, 401);
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return json({ ok: false, error: "invalid session" }, 401);
    }

    const { restaurant_id, view } = await req.json();
    if (!restaurant_id) {
      return json({ ok: false, error: "restaurant_id is required" }, 400);
    }
    if (!["overview", "keywords", "pages"].includes(view)) {
      return json({ ok: false, error: "view must be 'overview', 'keywords', or 'pages'" }, 400);
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();
    if (!membership) {
      return json({ ok: false, error: "not a member of this restaurant" }, 403);
    }

    const { data: cred, error: credErr } = await supabase
      .from("search_console_credentials")
      .select("id, site_url, vault_secret_name")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();
    if (credErr) {
      return json({ ok: false, error: credErr.message }, 500);
    }
    if (!cred) {
      return json({ ok: true, connected: false }, 200);
    }

    const { data: secretRaw, error: secretErr } = await supabase.rpc("get_pos_secret", {
      secret_name: cred.vault_secret_name,
    });
    if (secretErr || !secretRaw) {
      return json({ ok: false, error: `vault secret not found: ${secretErr?.message ?? ""}` }, 500);
    }
    const { refreshToken } = JSON.parse(secretRaw);
    const googleAccessToken = await refreshAccessToken(refreshToken);

    // Search Console's own data typically lags 2-3 days behind real
    // time, so "today" isn't a useful endDate — back off 3 days.
    const end = new Date();
    end.setDate(end.getDate() - 3);

    if (view === "overview") {
      const start = new Date(end);
      start.setDate(start.getDate() - 56); // 8 weeks
      const rows = await queryOneDimension(
        googleAccessToken,
        cred.site_url,
        "date",
        isoDate(start),
        isoDate(end),
        56,
      );
      await supabase
        .from("search_console_credentials")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", cred.id);
      return json(
        {
          ok: true,
          connected: true,
          rows: rows.map((r) => ({
            date: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
          })),
        },
        200,
      );
    }

    if (view === "keywords") {
      const start = new Date(end);
      start.setDate(start.getDate() - 28);
      const rows = await queryOneDimension(
        googleAccessToken,
        cred.site_url,
        "query",
        isoDate(start),
        isoDate(end),
        25,
      );
      return json(
        {
          ok: true,
          connected: true,
          rows: rows
            .sort((a, b) => b.clicks - a.clicks)
            .map((r) => ({
              query: r.keys[0],
              clicks: r.clicks,
              impressions: r.impressions,
              ctr: r.ctr,
              position: r.position,
            })),
        },
        200,
      );
    }

    // view === "pages"
    const start = new Date(end);
    start.setDate(start.getDate() - 28);
    const rows = await queryOneDimension(
      googleAccessToken,
      cred.site_url,
      "page",
      isoDate(start),
      isoDate(end),
      25,
    );
    return json(
      {
        ok: true,
        connected: true,
        rows: rows
          .sort((a, b) => b.clicks - a.clicks)
          .map((r) => ({
            page: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
          })),
      },
      200,
    );
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

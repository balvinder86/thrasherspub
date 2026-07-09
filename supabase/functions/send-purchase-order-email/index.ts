// Sends a real email to a vendor for a purchase order, via the Gmail
// API — using the same connected Gmail account (pubthrashers@gmail.com)
// the invoice-ingestion pipeline already reads from (see
// email-ingest/src/gmail.ts for the read-side twin of this OAuth flow).
//
// Resend was the original plan (see git history), but Resend's domain
// verification requires a custom-Return-Path MX record on a subdomain,
// which Wix's DNS UI cannot add for a domain registered with Wix (their
// MX editor only supports one root-domain email connection, confirmed
// via Wix support). Rather than transfer the domain away from Wix just
// for this, purchase-order emails now go out through the Gmail account
// that's already fully working for reading vendor invoices — same
// Vault-stored refresh token (`gmail_refresh_thrashers`), now with an
// added `gmail.send` scope.
//
//   { purchase_order_id }
//
// Verifies the caller's session JWT, then verifies restaurant
// membership before touching anything (the service-role client below
// bypasses RLS).

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function money(cents: number | null) {
  return cents != null ? `$${(cents / 100).toFixed(2)}` : "—";
}

async function refreshGmailAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`refresh Gmail access token failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendGmailMessage(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<string> {
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64UrlEncode(mime) }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMessage = (body as { error?: { message?: string } } | null)?.error?.message
      ?? `Gmail API error ${res.status}`;
    throw new Error(errorMessage);
  }
  return (body as { id?: string } | null)?.id ?? "";
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

    const { purchase_order_id } = await req.json();
    if (!purchase_order_id) {
      return json({ ok: false, error: "purchase_order_id is required" }, 400);
    }

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .select(
        "id, restaurant_id, total_cents, created_at, vendor_id, vendors(name, contact_email), restaurants(name)",
      )
      .eq("id", purchase_order_id)
      .single();
    if (poErr || !po) {
      return json({ ok: false, error: poErr?.message ?? "purchase order not found" }, 404);
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .eq("restaurant_id", po.restaurant_id)
      .maybeSingle();
    if (!membership) {
      return json({ ok: false, error: "not a member of this restaurant" }, 403);
    }

    const vendor = po.vendors as unknown as { name: string; contact_email: string | null } | null;
    const restaurant = po.restaurants as unknown as { name: string } | null;
    if (!vendor?.contact_email) {
      return json({ ok: false, error: "vendor has no email on file" }, 400);
    }

    const { data: lines, error: linesErr } = await supabase
      .from("purchase_order_lines")
      .select("quantity, unit, unit_cost_cents, ingredients(name)")
      .eq("purchase_order_id", purchase_order_id);
    if (linesErr) {
      return json({ ok: false, error: linesErr.message }, 500);
    }

    type LineRow = {
      quantity: number;
      unit: string;
      unit_cost_cents: number | null;
      ingredients: { name: string } | null;
    };
    const lineRows = (lines ?? []) as unknown as LineRow[];

    const rowsHtml = lineRows
      .map(
        (l) =>
          `<tr><td style="padding:4px 12px 4px 0">${l.ingredients?.name ?? "Item"}</td><td style="padding:4px 12px;text-align:right">${l.quantity} ${l.unit}</td><td style="padding:4px 0;text-align:right">${money(l.unit_cost_cents)}</td></tr>`,
      )
      .join("");

    const restaurantName = restaurant?.name ?? "Thrasher's Pub";
    const html = `
      <p>Hi ${vendor.name},</p>
      <p>${restaurantName} would like to place the following order:</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px">
        <thead>
          <tr style="text-align:left;border-bottom:1px solid #ddd">
            <th style="padding:4px 12px 4px 0">Item</th>
            <th style="padding:4px 12px;text-align:right">Qty</th>
            <th style="padding:4px 0;text-align:right">Unit cost</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p><strong>Total: ${money(po.total_cents)}</strong></p>
      <p>Please confirm receipt of this order at your convenience.</p>
      <p>Thanks,<br/>${restaurantName}</p>
    `;

    const { data: emailCred, error: emailCredErr } = await supabase
      .from("email_ingestion_credentials")
      .select("connected_email, vault_secret_name")
      .eq("restaurant_id", po.restaurant_id)
      .eq("provider", "gmail")
      .maybeSingle();
    if (emailCredErr || !emailCred) {
      const errorMessage = "no connected Gmail account for this restaurant to send from";
      await supabase.from("purchase_orders").update({ email_error: errorMessage }).eq("id", purchase_order_id);
      return json({ ok: false, error: errorMessage }, 400);
    }

    try {
      const { data: secretRaw, error: secretErr } = await supabase.rpc("get_pos_secret", {
        secret_name: emailCred.vault_secret_name,
      });
      if (secretErr || !secretRaw) throw new Error(`vault secret not found: ${secretErr?.message ?? ""}`);
      const { refreshToken } = JSON.parse(secretRaw);
      if (!refreshToken) throw new Error("vault secret missing refreshToken");

      const accessToken = await refreshGmailAccessToken(refreshToken);
      const emailId = await sendGmailMessage(
        accessToken,
        `${restaurantName} <${emailCred.connected_email}>`,
        vendor.contact_email,
        `Purchase order from ${restaurantName}`,
        html,
      );

      await supabase
        .from("purchase_orders")
        .update({ status: "sent", emailed_at: new Date().toISOString(), email_error: null })
        .eq("id", purchase_order_id);

      return json({ ok: true, emailId }, 200);
    } catch (sendErr) {
      const errorMessage = sendErr instanceof Error ? sendErr.message : String(sendErr);
      await supabase.from("purchase_orders").update({ email_error: errorMessage }).eq("id", purchase_order_id);
      return json({ ok: false, error: errorMessage }, 502);
    }
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

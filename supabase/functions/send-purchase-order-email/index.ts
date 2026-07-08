// Sends a real email to a vendor for a purchase order, via Resend.
//
// Until a verified sending domain exists in Resend, the "from" address
// stays on the sandbox domain (onboarding@resend.dev), which Resend
// only actually delivers to the account owner's own email — sending to
// a real vendor address will get a real rejection from Resend's API,
// not a silent no-op. That failure is recorded honestly on the PO
// (email_error) rather than swallowed, so the UI can say what happened.
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

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS = "Thrasher's Pub <onboarding@resend.dev>";

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

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: vendor.contact_email,
        subject: `Purchase order from ${restaurantName}`,
        html,
      }),
    });
    const resendBody = await resendRes.json().catch(() => null);

    if (!resendRes.ok) {
      const errorMessage =
        (resendBody as { message?: string } | null)?.message ?? `Resend error ${resendRes.status}`;
      await supabase
        .from("purchase_orders")
        .update({ email_error: errorMessage })
        .eq("id", purchase_order_id);
      return json({ ok: false, error: errorMessage }, 502);
    }

    await supabase
      .from("purchase_orders")
      .update({ status: "sent", emailed_at: new Date().toISOString(), email_error: null })
      .eq("id", purchase_order_id);

    return json({ ok: true, emailId: (resendBody as { id?: string } | null)?.id ?? null }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

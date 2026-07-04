// Invoice OCR proxy — this function no longer talks to Mindee itself.
// That logic (and its Deno-specific debugging headaches) now lives in
// a plain Node service on Railway (~/dev/thrasherspub/ocr/), which is
// easier to iterate on and matches how the Toast sync job is deployed.
//
// This function's job is just: verify the caller's session JWT (done
// automatically by the platform gateway before this code even runs),
// verify the caller is actually a member of the invoice's restaurant
// (NOT automatic — the service-role client below bypasses RLS, so an
// authenticated user guessing another tenant's invoice_id must be
// blocked explicitly here), then forward to Railway with a shared
// secret the browser never sees.
//
//   { invoice_id, action: "enqueue" | "check" }

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const OCR_SERVICE_URL = Deno.env.get("OCR_SERVICE_URL")!;
const OCR_SERVICE_TOKEN = Deno.env.get("OCR_SERVICE_TOKEN")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return Response.json({ ok: false, step: "auth", error: "missing Authorization header" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return Response.json({ ok: false, step: "auth", error: "invalid session" }, { status: 401 });
    }

    const { invoice_id, action } = await req.json();
    if (!invoice_id || !action || (action !== "enqueue" && action !== "check")) {
      return Response.json({ ok: false, step: "input", error: "invoice_id and a valid action are required" }, { status: 400 });
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select("id, restaurant_id")
      .eq("id", invoice_id)
      .single();
    if (invoiceErr || !invoice) {
      return Response.json({ ok: false, step: "load_invoice", error: invoiceErr?.message ?? "not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .eq("restaurant_id", invoice.restaurant_id)
      .maybeSingle();
    if (!membership) {
      return Response.json({ ok: false, step: "auth", error: "not a member of this restaurant" }, { status: 403 });
    }

    const railwayRes = await fetch(`${OCR_SERVICE_URL}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OCR_SERVICE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoice_id }),
    });
    const railwayBody = await railwayRes.json().catch(() => null);
    return Response.json(railwayBody ?? { ok: false, error: "empty response from OCR service" }, { status: railwayRes.status });
  } catch (e) {
    return Response.json({ ok: false, step: "unexpected", error: String(e) }, { status: 500 });
  }
});

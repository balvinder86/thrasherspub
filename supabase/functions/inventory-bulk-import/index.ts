// Real bulk inventory extraction from an uploaded photo or document
// (e.g. a supplier price list, a handwritten stock count sheet, an
// order guide) — Claude reads the image/PDF directly (native vision
// and document support, no separate OCR step) and returns a
// structured list of real items it can actually see. Extraction
// only: nothing is written to the database here. The frontend shows
// every parsed item for review/editing before the owner explicitly
// commits them via the same create-item path the manual "Add item"
// dialog already uses — no auto-import, ever.
//
//   { restaurant_id, file_base64, media_type, vendor_names? }

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

const CATEGORIES = ["Beverages", "Alcohol", "Food", "Dry Goods", "Miscellaneous"];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // base64-decoded size, matches Claude's own per-file limit

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

    const { restaurant_id, file_base64, media_type, vendor_names } = await req.json();
    if (!restaurant_id || !file_base64 || !media_type) {
      return json(
        { ok: false, error: "restaurant_id, file_base64, and media_type are required" },
        400,
      );
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

    const approxBytes = Math.floor((file_base64.length * 3) / 4);
    if (approxBytes > MAX_FILE_BYTES) {
      return json({ ok: false, error: "file is too large (max 15MB)" }, 400);
    }

    const isPdf = media_type === "application/pdf";
    if (!isPdf && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(media_type)) {
      return json({ ok: false, error: `unsupported file type: ${media_type}` }, 400);
    }

    const fileBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type, data: file_base64 } }
      : { type: "image", source: { type: "base64", media_type, data: file_base64 } };

    const vendorContext =
      Array.isArray(vendor_names) && vendor_names.length > 0
        ? `Existing vendors on file: ${vendor_names.join(", ")}. If this document is clearly from one of these vendors, use that exact name for vendorGuess; otherwise use whatever supplier name is printed on the document, or null if none is visible.`
        : "No existing vendors on file yet — use whatever supplier name is printed on the document, or null if none is visible.";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: `You are extracting a real inventory item list from a photo or document for a restaurant (a supplier price list, order guide, invoice, or handwritten stock count). Respond with ONLY valid JSON, no markdown, no commentary, matching exactly this shape: {"items":[{"name":string,"category":string|null,"unit":string|null,"quantity":number|null,"unitCost":number|null,"vendorGuess":string|null}]}. Rules: extract every distinct line item you can actually see — never invent items that aren't in the image/document. category must be exactly one of ${JSON.stringify(CATEGORIES)} if you can reasonably classify it, else null — never invent a category name outside this list. unit is the real unit as printed (e.g. "case", "lb", "btl", "6/1gal") or null if not shown. quantity is the on-hand/ordered count if shown, else null. unitCost is a plain number in dollars (e.g. 12.5, not "$12.50") if a price is visible, else null — never guess a price. ${vendorContext} If the image is unreadable or contains no inventory-like list, return {"items":[]}.`,
        messages: [
          {
            role: "user",
            content: [
              fileBlock,
              {
                type: "text",
                text: "Extract every real inventory item from this document as JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => "");
      return json({ ok: false, error: `Claude API error ${anthropicRes.status}: ${errBody}` }, 502);
    }

    const anthropicBody = await anthropicRes.json();
    const rawText: string = (anthropicBody.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    let parsed;
    try {
      parsed = JSON.parse(stripJsonFences(rawText));
    } catch {
      return json(
        { ok: false, error: `Could not parse Claude's response as JSON: ${rawText}` },
        502,
      );
    }

    return json({ ok: true, items: parsed.items ?? [] }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

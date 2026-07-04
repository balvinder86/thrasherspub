// Invoice OCR extraction — split into two actions, called separately
// by the frontend rather than one long poll-in-a-loop request:
//
//   { invoice_id, action: "enqueue" } — sends the file to Mindee's V2
//     Extraction API, stores the job id on the invoice, returns fast.
//   { invoice_id, action: "check" }   — does ONE fresh poll of that
//     job. If done, parses + persists invoice_lines as a DRAFT
//     (invoices.status stays 'pending_review' — nothing here is
//     auto-approved, see PROJECT_CONTEXT.md "CRITICAL: the
//     service-role write path"). The frontend calls this every few
//     seconds until ocr_status is 'ready' or 'failed'.
//
// Split this way (rather than enqueue-then-poll-in-a-loop inside one
// invocation) after finding that repeated polls within a single
// invocation kept 404ing on a job a fresh call resolved immediately —
// looked like backend connection/session pinning to a stale replica.
// Separate invocations sidestep it and match how async OCR pipelines
// are normally built anyway.
//
// Field shapes confirmed against a real extraction (not guessed):
// document-level fields are { value, confidence }; line_items is
// { items: [ { fields: { description, quantity, unit_price,
// total_price, unit_measure, product_code } } ] } — note total_price,
// not total_amount, at the line-item level.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const MINDEE_API_KEY = Deno.env.get("MINDEE_API_KEY")!;
const MINDEE_MODEL_ID = Deno.env.get("MINDEE_MODEL_ID")!;

function fieldValue(field: any): any {
  return field?.value ?? null;
}

async function enqueue(invoice: { id: string; source_file_url: string }) {
  const { data: fileBlob, error: downloadErr } = await supabase.storage
    .from("invoice-uploads")
    .download(invoice.source_file_url);
  if (downloadErr || !fileBlob) {
    throw new Error(`download failed: ${downloadErr?.message ?? "no file"}`);
  }
  if (fileBlob.size === 0) {
    throw new Error("downloaded file is empty (0 bytes)");
  }

  const form = new FormData();
  form.set("model_id", MINDEE_MODEL_ID);
  form.set("file", fileBlob, invoice.source_file_url.split("/").pop() ?? "invoice");

  const enqueueRes = await fetch("https://api-v2.mindee.net/v2/products/extraction/enqueue", {
    method: "POST",
    headers: { Authorization: MINDEE_API_KEY },
    body: form,
    cache: "no-store",
  });
  const enqueueBody = await enqueueRes.json().catch(() => null);
  if (!enqueueRes.ok || !enqueueBody?.job?.id) {
    throw new Error(`Mindee enqueue failed (${enqueueRes.status}): ${JSON.stringify(enqueueBody)}`);
  }

  await supabase
    .from("invoices")
    .update({ mindee_job_id: enqueueBody.job.id, ocr_status: "processing" })
    .eq("id", invoice.id);

  return { jobId: enqueueBody.job.id };
}

async function check(invoice: { id: string; restaurant_id: string; mindee_job_id: string | null }) {
  if (!invoice.mindee_job_id) {
    throw new Error("no OCR job has been enqueued for this invoice yet");
  }

  const jobRes = await fetch(`https://api-v2.mindee.net/v2/jobs/${invoice.mindee_job_id}`, {
    headers: { Authorization: MINDEE_API_KEY },
    cache: "no-store",
  });
  const jobBody = await jobRes.json().catch(() => null);
  if (!jobRes.ok) {
    // A 404 shortly after enqueue is a known transient state — report
    // "still processing" rather than failing, so the frontend just
    // checks again on its next poll.
    if (jobRes.status === 404) {
      return { status: "processing" };
    }
    throw new Error(`job check failed (${jobRes.status}): ${JSON.stringify(jobBody)}`);
  }

  const status = jobBody?.job?.status;
  if (status === "Failed") {
    await supabase.from("invoices").update({ ocr_status: "failed" }).eq("id", invoice.id);
    return { status: "failed", error: jobBody?.job?.error };
  }
  if (status !== "Processed") {
    return { status: "processing" };
  }

  const resultUrl = jobBody?.job?.result_url;
  if (!resultUrl) throw new Error("job Processed but no result_url");
  const resultRes = await fetch(resultUrl, { headers: { Authorization: MINDEE_API_KEY }, cache: "no-store" });
  const resultBody = await resultRes.json();
  if (!resultRes.ok) throw new Error(`result fetch failed (${resultRes.status}): ${JSON.stringify(resultBody)}`);

  const fields = resultBody?.inference?.result?.fields;
  if (!fields) throw new Error(`unexpected result shape: ${JSON.stringify(resultBody)}`);

  const supplierName = fieldValue(fields.supplier_name);
  const invoiceNumber = fieldValue(fields.invoice_number);
  const date = fieldValue(fields.date);
  const totalAmount = fieldValue(fields.total_amount);
  const lineItemObjects: any[] = fields.line_items?.items ?? [];

  await supabase
    .from("invoices")
    .update({
      invoice_number: invoiceNumber,
      invoice_date: date,
      total_cents: totalAmount != null ? Math.round(totalAmount * 100) : null,
      ocr_status: "ready",
    })
    .eq("id", invoice.id);

  const insertedLines = [];
  for (const itemObj of lineItemObjects) {
    const itemFields = itemObj?.fields ?? {};
    const description = fieldValue(itemFields.description) ?? "";
    const quantity = fieldValue(itemFields.quantity);
    const unitMeasure = fieldValue(itemFields.unit_measure);
    const unitPrice = fieldValue(itemFields.unit_price);
    const totalPrice = fieldValue(itemFields.total_price);

    const { data: matchedIngredientId } = await supabase.rpc("match_ingredient", {
      p_restaurant_id: invoice.restaurant_id,
      p_description: description,
    });

    const { data: line, error: lineErr } = await supabase
      .from("invoice_lines")
      .insert({
        restaurant_id: invoice.restaurant_id,
        invoice_id: invoice.id,
        ingredient_id: matchedIngredientId ?? null,
        raw_description: description,
        quantity,
        unit: unitMeasure,
        unit_cost_cents: unitPrice != null ? Math.round(unitPrice * 100) : null,
        line_total_cents: totalPrice != null ? Math.round(totalPrice * 100) : null,
      })
      .select("id")
      .single();
    if (lineErr) throw new Error(`insert invoice_line failed: ${lineErr.message}`);
    insertedLines.push({ id: line.id, description, matched: matchedIngredientId != null });
  }

  return {
    status: "ready",
    supplierName,
    invoiceNumber,
    date,
    totalAmount,
    lineItemsExtracted: insertedLines.length,
    lineItemsAutoMatched: insertedLines.filter((l) => l.matched).length,
    lines: insertedLines,
  };
}

Deno.serve(async (req) => {
  try {
    const { invoice_id, action } = await req.json();
    if (!invoice_id || !action) {
      return Response.json({ ok: false, step: "input", error: "invoice_id and action are required" }, { status: 400 });
    }

    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select("id, restaurant_id, location_id, source_file_url, status, mindee_job_id")
      .eq("id", invoice_id)
      .single();
    if (invoiceErr || !invoice) {
      return Response.json({ ok: false, step: "load_invoice", error: invoiceErr?.message ?? "not found" }, { status: 404 });
    }

    if (action === "enqueue") {
      if (!invoice.source_file_url) {
        return Response.json({ ok: false, step: "load_invoice", error: "invoice has no source_file_url" }, { status: 400 });
      }
      const result = await enqueue(invoice as any);
      return Response.json({ ok: true, ...result });
    }

    if (action === "check") {
      const result = await check(invoice as any);
      return Response.json({ ok: true, ...result });
    }

    return Response.json({ ok: false, step: "input", error: `unknown action '${action}'` }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, step: "unexpected", error: String(e) }, { status: 500 });
  }
});

// Diagnostic only — confirms Toast credentials + connectivity work.
// Reads pos_credentials + the Vault-stored secret, authenticates to
// Toast, pulls one business day of orders, and reports a summary.
// Writes nothing to the database.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function todayBusinessDate(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "toast";
  const businessDate = url.searchParams.get("businessDate") ?? todayBusinessDate();

  try {
    // 1. Load the credential row (non-secret config only).
    const { data: cred, error: credErr } = await supabase
      .from("pos_credentials")
      .select("restaurant_id, location_id, pos_location_ref, vault_secret_name, api_hostname")
      .eq("provider", provider)
      .limit(1)
      .single();

    if (credErr || !cred) {
      return Response.json(
        { ok: false, step: "load_credential", error: credErr?.message ?? "no pos_credentials row found" },
        { status: 400 },
      );
    }

    if (!cred.api_hostname) {
      return Response.json(
        { ok: false, step: "load_credential", error: "pos_credentials.api_hostname is not set" },
        { status: 400 },
      );
    }

    // 2. Read the secret out of Vault via the service-role-only RPC.
    const { data: secretJson, error: vaultErr } = await supabase.rpc("get_pos_secret", {
      secret_name: cred.vault_secret_name,
    });

    if (vaultErr || !secretJson) {
      return Response.json(
        { ok: false, step: "read_vault", error: vaultErr?.message ?? `vault secret '${cred.vault_secret_name}' not found` },
        { status: 400 },
      );
    }

    let clientId: string, clientSecret: string;
    try {
      ({ clientId, clientSecret } = JSON.parse(secretJson));
      if (!clientId || !clientSecret) throw new Error("missing clientId/clientSecret in vault JSON");
    } catch (e) {
      return Response.json(
        { ok: false, step: "read_vault", error: `vault secret is not valid {clientId, clientSecret} JSON: ${e.message}` },
        { status: 400 },
      );
    }

    // 3. Authenticate to Toast.
    const authRes = await fetch(`${cred.api_hostname}/authentication/v1/authentication/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
    });

    const authBody = await authRes.json().catch(() => null);
    if (!authRes.ok || !authBody?.token?.accessToken) {
      return Response.json(
        { ok: false, step: "toast_auth", error: `Toast auth failed (${authRes.status}): ${JSON.stringify(authBody)}` },
        { status: 400 },
      );
    }

    const accessToken = authBody.token.accessToken;

    // 4. Pull one page of one business day of orders.
    const ordersUrl = `${cred.api_hostname}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100&page=1`;
    const ordersRes = await fetch(ordersUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Toast-Restaurant-External-ID": cred.pos_location_ref,
      },
    });

    const orders = await ordersRes.json().catch(() => null);
    if (!ordersRes.ok || !Array.isArray(orders)) {
      return Response.json(
        { ok: false, step: "toast_orders", error: `Toast orders call failed (${ordersRes.status}): ${JSON.stringify(orders)}` },
        { status: 400 },
      );
    }

    const firstOrder = orders[0];
    const firstCheck = firstOrder?.checks?.[0];
    const firstSelection = firstCheck?.selections?.[0];

    return Response.json({
      ok: true,
      businessDate,
      ordersOnPage1: orders.length,
      sample: firstOrder
        ? {
            firstOrderGuid: firstOrder.guid,
            checks: firstOrder.checks?.length ?? 0,
            firstItem: firstSelection?.displayName ?? null,
          }
        : null,
      message:
        orders.length > 0
          ? "Connection works and real orders came back."
          : "Connection works, but zero orders for this business date — try a busier day via ?businessDate=YYYYMMDD.",
    });
  } catch (e) {
    return Response.json({ ok: false, step: "unexpected", error: String(e) }, { status: 500 });
  }
});

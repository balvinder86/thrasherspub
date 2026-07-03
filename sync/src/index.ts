import { authenticate, fetchOrdersForDate, fetchMenus, type ToastOrder } from "./toast.js";
import {
  getToastCredentials,
  getSecret,
  upsertRawEvents,
  replacePmixForDate,
  upsertMenuItems,
  updateLastSyncedAt,
  type PosCredential,
} from "./db.js";

const BACKFILL_DAYS = 30;

function toBusinessDateString(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function businessDatesBetween(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    dates.push(toBusinessDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function aggregatePmix(orders: ToastOrder[]) {
  const map = new Map<string, { name: string; qty: number; netCents: number }>();
  for (const order of orders) {
    if (order.deleted || order.voided) continue;
    for (const check of order.checks ?? []) {
      if (check.deleted || check.voided) continue;
      for (const sel of check.selections ?? []) {
        if (sel.voided || sel.deleted) continue;
        const posId = sel.item?.guid ?? sel.guid;
        const cur = map.get(posId) ?? { name: sel.displayName ?? "Unknown Item", qty: 0, netCents: 0 };
        cur.qty += sel.quantity ?? 1;
        cur.netCents += Math.round((sel.price ?? 0) * 100);
        map.set(posId, cur);
      }
    }
  }
  return Array.from(map.entries()).map(([menuItemPosId, v]) => ({
    menuItemPosId,
    name: v.name,
    quantitySold: v.qty,
    netSalesCents: v.netCents,
  }));
}

async function syncCredential(cred: PosCredential) {
  console.log(`[toast-sync] ${cred.location_id}: starting`);
  const { clientId, clientSecret } = await getSecret(cred.vault_secret_name);
  const token = await authenticate(cred.api_hostname, clientId, clientSecret);

  const now = new Date();
  const start = cred.last_synced_at
    ? new Date(new Date(cred.last_synced_at).getTime() - 24 * 60 * 60 * 1000) // 1-day overlap buffer
    : new Date(now.getTime() - (BACKFILL_DAYS - 1) * 24 * 60 * 60 * 1000);

  const dates = businessDatesBetween(start, now);
  console.log(`[toast-sync] ${cred.location_id}: syncing ${dates.length} business date(s) from ${dates[0]} to ${dates[dates.length - 1]}`);

  let totalOrders = 0;
  for (const businessDate of dates) {
    const orders = await fetchOrdersForDate(cred.api_hostname, token, cred.pos_location_ref, businessDate);
    totalOrders += orders.length;

    await upsertRawEvents(
      cred,
      "order",
      orders.map((o) => ({ posRef: o.guid, businessDate: `${businessDate.slice(0, 4)}-${businessDate.slice(4, 6)}-${businessDate.slice(6, 8)}`, payload: o })),
    );

    const pmixRows = aggregatePmix(orders);
    await replacePmixForDate(cred, businessDate, pmixRows);

    console.log(`[toast-sync] ${cred.location_id}: ${businessDate} — ${orders.length} orders, ${pmixRows.length} pmix rows`);
    await new Promise((r) => setTimeout(r, 150));
  }

  try {
    const rawMenuItems = await fetchMenus(cred.api_hostname, token, cred.pos_location_ref);
    // Same item can appear on multiple menus (e.g. lunch + dinner) — dedupe
    // by posId so a single upsert never targets the same row twice.
    const menuItems = Array.from(new Map(rawMenuItems.map((i) => [i.posId, i])).values());
    await upsertMenuItems(cred, menuItems);
    await upsertRawEvents(cred, "menu", [{ posRef: "current", businessDate: null, payload: menuItems }]);
    console.log(`[toast-sync] ${cred.location_id}: ${menuItems.length} menu items synced`);
  } catch (e) {
    console.error(`[toast-sync] ${cred.location_id}: menu sync failed (non-fatal): ${e}`);
  }

  await updateLastSyncedAt(cred, now);
  console.log(`[toast-sync] ${cred.location_id}: done — ${totalOrders} orders total`);
}

async function main() {
  const credentials = await getToastCredentials();
  if (credentials.length === 0) {
    console.log("[toast-sync] no toast pos_credentials rows found — nothing to do");
    return;
  }
  for (const cred of credentials) {
    try {
      await syncCredential(cred);
    } catch (e) {
      // One location's failure shouldn't block the others.
      console.error(`[toast-sync] ${cred.location_id}: FAILED — ${e}`);
    }
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("[toast-sync] fatal:", e);
    process.exit(1);
  },
);

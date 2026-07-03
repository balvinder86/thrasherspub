// Toast POS client — pure reader. Auth + orders + menus against the
// real Toast API shape (confirmed against doc.toasttab.com, not guessed).

export type ToastOrder = {
  guid: string;
  businessDate: number; // yyyymmdd
  deleted?: boolean;
  voided?: boolean;
  checks?: ToastCheck[];
};

export type ToastCheck = {
  guid: string;
  deleted?: boolean;
  voided?: boolean;
  selections?: ToastSelection[];
};

export type ToastSelection = {
  guid: string;
  displayName?: string;
  quantity?: number;
  price?: number;
  voided?: boolean;
  deleted?: boolean;
  item?: { guid: string };
};

export type ToastMenuItemFlat = {
  posId: string;
  name: string;
  category: string;
  priceCents: number | null;
};

async function toastFetch(hostname: string, path: string, token: string, restaurantExternalId: string) {
  const res = await fetch(`${hostname}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": restaurantExternalId,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Toast GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function authenticate(hostname: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${hostname}/authentication/v1/authentication/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token?.accessToken) {
    throw new Error(`Toast auth failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.token.accessToken as string;
}

// Pages through ordersBulk for a single business date until exhausted.
export async function fetchOrdersForDate(
  hostname: string,
  token: string,
  restaurantExternalId: string,
  businessDate: string, // yyyymmdd
): Promise<ToastOrder[]> {
  const pageSize = 100;
  const all: ToastOrder[] = [];
  for (let page = 1; ; page++) {
    const orders: ToastOrder[] = await toastFetch(
      hostname,
      `/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${pageSize}&page=${page}`,
      token,
      restaurantExternalId,
    );
    all.push(...orders);
    if (orders.length < pageSize) break;
    await new Promise((r) => setTimeout(r, 150)); // be gentle on Toast's rate limits
  }
  return all;
}

function flattenMenuGroup(group: any, category: string, out: ToastMenuItemFlat[]) {
  for (const item of group.menuItems ?? []) {
    out.push({
      posId: item.guid,
      name: item.name,
      category,
      priceCents: typeof item.price === "number" ? Math.round(item.price * 100) : null,
    });
  }
  for (const sub of group.menuGroups ?? []) {
    flattenMenuGroup(sub, sub.name ?? category, out);
  }
}

export async function fetchMenus(hostname: string, token: string, restaurantExternalId: string): Promise<ToastMenuItemFlat[]> {
  const menus = await toastFetch(hostname, `/menus/v2/menus`, token, restaurantExternalId);
  const out: ToastMenuItemFlat[] = [];
  for (const menu of Array.isArray(menus) ? menus : menus.menus ?? []) {
    for (const group of menu.menuGroups ?? []) {
      flattenMenuGroup(group, group.name ?? "Uncategorized", out);
    }
  }
  return out;
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useLocationIds } from "@/lib/supabase/scope";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// The Toast sync job pulls fresh orders every ~10 minutes, but without
// an explicit refetchInterval, React Query only refetches on mount or
// window refocus — a dashboard left open just sits frozen even as new
// sales land server-side. 60s keeps Product Mix genuinely live without
// hammering the DB.
const LIVE_REFETCH_INTERVAL_MS = 60_000;

// Real "last sync" signal for the PosSyncStrip — the Railway toast-sync
// cron job runs every 10 minutes and touches pmix_sales on every run
// (even a 0-order run still upserts menu_items/updates rows), so its
// most recent updated_at is an honest proxy for "when did the last
// sync actually happen" without needing a dedicated sync-log table.
export function useLastSyncTime() {
  const { data: locationIds } = useLocationIds();
  return useQuery({
    queryKey: ["last-sync-time", locationIds],
    enabled: !!locationIds && locationIds.length > 0,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("pmix_sales")
        .select("updated_at")
        .in("location_id", locationIds!)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.updated_at ?? null;
    },
  });
}

export type RealMenuItem = {
  id: string;
  locationId: string;
  name: string;
  category: string;
  price: number;
  cost?: number;
  soldWk: number;
  soldPrevWk: number;
  // Real dollars Toast recorded for this item's sales (pmix_sales.net_sales_cents),
  // not price x quantity — diverges from that whenever price changed, or a sale
  // had a discount/comp/modifier surcharge. Use this for revenue, never price*qty.
  revenueWk: number;
  revenuePrevWk: number;
};

// Popularity for `days` (default a week) vs. the prior equal-length period,
// joined against the current menu + cost. Cost prefers the real recipe
// bridge (sum of recipe_lines quantity x ingredient cost) when an item
// has one, falling back to the manual per-item override, then undefined
// ("Unpriced") if neither exists yet.
export function useProductMix(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["product-mix", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    queryFn: async (): Promise<RealMenuItem[]> => {
      const today = new Date();
      const periodStart = addDays(today, -days);
      const prevStart = addDays(today, -days * 2);

      const [menuItemsRes, currentRes, prevRes, recipeRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("pos_id, location_id, name, category, price_cents, cost_cents")
          .in("location_id", locationIds!)
          .eq("active", true),
        supabase
          .from("pmix_sales")
          .select("menu_item_pos_id, quantity_sold, net_sales_cents")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(periodStart))
          .lte("business_date", isoDate(today)),
        supabase
          .from("pmix_sales")
          .select("menu_item_pos_id, quantity_sold, net_sales_cents")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(prevStart))
          .lt("business_date", isoDate(periodStart)),
        supabase
          .from("recipe_lines")
          .select("menu_item_pos_id, quantity, ingredients (unit_cost_cents)")
          .in("location_id", locationIds!),
      ]);
      if (menuItemsRes.error) throw menuItemsRes.error;
      if (currentRes.error) throw currentRes.error;
      if (prevRes.error) throw prevRes.error;
      if (recipeRes.error) throw recipeRes.error;

      const sumQtyBy = (rows: { menu_item_pos_id: string; quantity_sold: number }[]) => {
        const map = new Map<string, number>();
        for (const r of rows)
          map.set(r.menu_item_pos_id, (map.get(r.menu_item_pos_id) ?? 0) + Number(r.quantity_sold));
        return map;
      };
      const sumRevenueBy = (rows: { menu_item_pos_id: string; net_sales_cents: number }[]) => {
        const map = new Map<string, number>();
        for (const r of rows)
          map.set(
            r.menu_item_pos_id,
            (map.get(r.menu_item_pos_id) ?? 0) + Number(r.net_sales_cents),
          );
        return map;
      };
      const current = sumQtyBy(currentRes.data ?? []);
      const prev = sumQtyBy(prevRes.data ?? []);
      const currentRevenueCents = sumRevenueBy(currentRes.data ?? []);
      const prevRevenueCents = sumRevenueBy(prevRes.data ?? []);

      const recipeCostCents = new Map<string, number>();
      for (const row of (recipeRes.data ?? []) as any[]) {
        const unitCost = row.ingredients?.unit_cost_cents;
        if (unitCost == null) continue; // an ingredient with no cost yet can't total this item
        const cur = recipeCostCents.get(row.menu_item_pos_id) ?? 0;
        recipeCostCents.set(row.menu_item_pos_id, cur + Number(row.quantity) * unitCost);
      }

      return (menuItemsRes.data ?? []).map((m) => {
        const recipeCents = recipeCostCents.get(m.pos_id);
        const costCents = recipeCents ?? m.cost_cents ?? undefined;
        return {
          id: m.pos_id,
          locationId: m.location_id,
          name: m.name,
          category: m.category ?? "Uncategorized",
          price: (m.price_cents ?? 0) / 100,
          cost: costCents != null ? costCents / 100 : undefined,
          soldWk: current.get(m.pos_id) ?? 0,
          soldPrevWk: prev.get(m.pos_id) ?? 0,
          revenueWk: (currentRevenueCents.get(m.pos_id) ?? 0) / 100,
          revenuePrevWk: (prevRevenueCents.get(m.pos_id) ?? 0) / 100,
        };
      });
    },
  });
}

export function useUpdateItemCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      posId,
      costCents,
    }: {
      locationId: string;
      posId: string;
      costCents: number | null;
    }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ cost_cents: costCents })
        .eq("location_id", locationId)
        .eq("pos_id", posId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product-mix"] }),
  });
}

// Theoretical food cost (what the recipe says it should have cost)
// vs actual spend (from approved invoices) for the period — the
// headline back-of-house metric. Theoretical understates reality
// while recipe_lines are incomplete for the menu, which is why
// hasRecipeData/itemsMissingRecipeCount are surfaced separately
// rather than silently showing a too-good-to-be-true percentage.
export type FoodCostSummary = {
  periodDays: number;
  theoreticalCostCents: number;
  netSalesCents: number;
  theoreticalPct: number | null;
  actualSpendCents: number;
  actualPct: number | null;
  variancePct: number | null;
  varianceCents: number;
  hasRecipeData: boolean;
  itemsMissingRecipeCount: number;
};

export function useFoodCostSummary(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["food-cost-summary", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    queryFn: async (): Promise<FoodCostSummary> => {
      const today = new Date();
      const periodStart = addDays(today, -days);

      const [salesRes, recipeRes, invoicesRes] = await Promise.all([
        supabase
          .from("pmix_sales")
          .select("menu_item_pos_id, quantity_sold, net_sales_cents")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(periodStart))
          .lt("business_date", isoDate(today)),
        supabase
          .from("recipe_lines")
          .select("menu_item_pos_id, quantity, ingredients (unit_cost_cents)")
          .in("location_id", locationIds!),
        supabase
          .from("invoices")
          .select("total_cents")
          .in("location_id", locationIds!)
          .eq("status", "approved")
          .gte("invoice_date", isoDate(periodStart))
          .lt("invoice_date", isoDate(today)),
      ]);
      if (salesRes.error) throw salesRes.error;
      if (recipeRes.error) throw recipeRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      type RecipeRow = {
        menu_item_pos_id: string;
        quantity: number;
        ingredients: { unit_cost_cents: number | null } | null;
      };
      const recipeCostPerUnit = new Map<string, number>();
      for (const row of (recipeRes.data ?? []) as unknown as RecipeRow[]) {
        const unitCost = row.ingredients?.unit_cost_cents;
        if (unitCost == null) continue;
        const cur = recipeCostPerUnit.get(row.menu_item_pos_id) ?? 0;
        recipeCostPerUnit.set(row.menu_item_pos_id, cur + Number(row.quantity) * unitCost);
      }

      let theoreticalCostCents = 0;
      let netSalesCents = 0;
      const itemsMissing = new Set<string>();
      for (const row of salesRes.data ?? []) {
        netSalesCents += Number(row.net_sales_cents);
        const perUnit = recipeCostPerUnit.get(row.menu_item_pos_id);
        if (perUnit == null) {
          itemsMissing.add(row.menu_item_pos_id);
          continue;
        }
        theoreticalCostCents += perUnit * Number(row.quantity_sold);
      }

      const approvedInvoices = invoicesRes.data ?? [];
      const actualSpendCents = approvedInvoices.reduce(
        (sum, inv) => sum + (inv.total_cents ?? 0),
        0,
      );
      // Zero approved invoices this period means "we don't know actual
      // spend," not "actual spend is $0" — treating it as a real 0
      // would make every un-invoiced period look like a favorable
      // variance instead of no-data.
      const hasInvoiceData = approvedInvoices.length > 0;

      const hasRecipeData = recipeCostPerUnit.size > 0;
      const theoreticalPct =
        hasRecipeData && netSalesCents > 0 ? (theoreticalCostCents / netSalesCents) * 100 : null;
      const actualPct =
        hasInvoiceData && netSalesCents > 0 ? (actualSpendCents / netSalesCents) * 100 : null;
      const variancePct =
        theoreticalPct != null && actualPct != null ? actualPct - theoreticalPct : null;

      return {
        periodDays: days,
        theoreticalCostCents,
        netSalesCents,
        theoreticalPct,
        actualSpendCents,
        actualPct,
        variancePct,
        varianceCents: actualSpendCents - theoreticalCostCents,
        hasRecipeData,
        itemsMissingRecipeCount: itemsMissing.size,
      };
    },
  });
}

export type DailyRevenue = { day: string; revenue: number; lastWeek: number };

// Last `days` days of net sales, each paired with the same weekday one
// week earlier for a like-for-like comparison line.
export function useSalesTrend(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["sales-trend", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    queryFn: async (): Promise<DailyRevenue[]> => {
      const today = new Date();
      const rangeStart = addDays(today, -days * 2);
      const { data, error } = await supabase
        .from("pmix_sales")
        .select("business_date, net_sales_cents")
        .in("location_id", locationIds!)
        .gte("business_date", isoDate(rangeStart));
      if (error) throw error;

      const byDate = new Map<string, number>();
      for (const r of data ?? [])
        byDate.set(r.business_date, (byDate.get(r.business_date) ?? 0) + Number(r.net_sales_cents));

      const out: DailyRevenue[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = addDays(today, -i);
        const key = isoDate(d);
        const lastWeekKey = isoDate(addDays(d, -7));
        out.push({
          day: d.toLocaleDateString("en-US", { weekday: "short" }),
          revenue: (byDate.get(key) ?? 0) / 100,
          lastWeek: (byDate.get(lastWeekKey) ?? 0) / 100,
        });
      }
      return out;
    },
  });
}

// Approximates check count via raw order events (one row per Toast
// order) — not a precise "check" count (an order can have >1 check),
// but far more honest than a guessed items-per-check ratio.
export function useOrderCount(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["order-count", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    refetchInterval: LIVE_REFETCH_INTERVAL_MS,
    queryFn: async (): Promise<number> => {
      const start = addDays(new Date(), -days);
      const { count, error } = await supabase
        .from("pos_raw_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "order")
        .in("location_id", locationIds!)
        .gte("business_date", isoDate(start));
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export type ChannelMixSlice = { name: string; value: number; amountCents: number };

// Real revenue by Toast revenue center (Bar/Dining Room/Patio/Online
// Ordering, etc.) — sums each real order's check total(s) from the
// raw payload sync already stores, grouped by revenueCenter.guid and
// labeled via pos_revenue_centers (synced from Toast's own config
// API — see sync/src/toast.ts's fetchRevenueCenters). Deliberately
// NOT diningOption (Dine In/Takeout/Delivery) — real data showed that
// field populated on well under 5% of this restaurant's real orders,
// too sparse to be a meaningful breakdown.
export function useChannelMix(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["channel-mix", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    queryFn: async (): Promise<ChannelMixSlice[]> => {
      const start = addDays(new Date(), -days);
      const [ordersRes, centersRes] = await Promise.all([
        supabase
          .from("pos_raw_events")
          .select("payload")
          .eq("event_type", "order")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(start)),
        supabase
          .from("pos_revenue_centers")
          .select("pos_guid, name")
          .in("location_id", locationIds!),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (centersRes.error) throw centersRes.error;

      const nameByGuid = new Map(
        (centersRes.data ?? []).map((c) => [c.pos_guid, c.name as string]),
      );

      type RawOrder = {
        deleted?: boolean;
        voided?: boolean;
        revenueCenter?: { guid: string } | null;
        checks?: { deleted?: boolean; voided?: boolean; totalAmount?: number }[];
      };

      const centsByGuid = new Map<string, number>();
      for (const row of ordersRes.data ?? []) {
        const order = row.payload as RawOrder;
        if (order.deleted || order.voided) continue;
        const guid = order.revenueCenter?.guid ?? "unknown";
        let orderCents = 0;
        for (const check of order.checks ?? []) {
          if (check.deleted || check.voided) continue;
          orderCents += Math.round((check.totalAmount ?? 0) * 100);
        }
        centsByGuid.set(guid, (centsByGuid.get(guid) ?? 0) + orderCents);
      }

      const totalCents = Array.from(centsByGuid.values()).reduce((s, c) => s + c, 0);
      if (totalCents === 0) return [];

      return Array.from(centsByGuid.entries())
        .map(([guid, amountCents]) => ({
          name: nameByGuid.get(guid) ?? "Other",
          amountCents,
          value: (amountCents / totalCents) * 100,
        }))
        .sort((a, b) => b.amountCents - a.amountCents);
    },
  });
}

export type TopItem = { name: string; sold: number; revenue: number };

export function useTopItems(days = 7, limit = 5) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["top-items", locationIds, days, limit],
    enabled: !!locationIds && locationIds.length > 0,
    queryFn: async (): Promise<TopItem[]> => {
      const start = addDays(new Date(), -days);
      const { data, error } = await supabase
        .from("pmix_sales")
        .select("name, quantity_sold, net_sales_cents")
        .in("location_id", locationIds!)
        .gte("business_date", isoDate(start));
      if (error) throw error;

      const map = new Map<string, TopItem>();
      for (const r of data ?? []) {
        const cur = map.get(r.name) ?? { name: r.name, sold: 0, revenue: 0 };
        cur.sold += Number(r.quantity_sold);
        cur.revenue += Number(r.net_sales_cents) / 100;
        map.set(r.name, cur);
      }
      return Array.from(map.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    },
  });
}

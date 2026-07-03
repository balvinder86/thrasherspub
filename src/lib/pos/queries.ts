import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-context";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// RLS already scopes every query below to the signed-in user's own
// restaurants — this just resolves which location_id(s) to filter on
// (a restaurant can have more than one location).
function useLocationIds() {
  const { memberships } = useAuth();
  const restaurantIds = memberships.map((m) => m.restaurant_id);
  return useQuery({
    queryKey: ["locations", restaurantIds],
    enabled: restaurantIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id").in("restaurant_id", restaurantIds);
      if (error) throw error;
      return (data ?? []).map((l) => l.id as string);
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
};

// Popularity for `days` (default a week) vs. the prior equal-length period,
// joined against the current menu + any manually-entered cost.
export function useProductMix(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["product-mix", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
    queryFn: async (): Promise<RealMenuItem[]> => {
      const today = new Date();
      const periodStart = addDays(today, -days);
      const prevStart = addDays(today, -days * 2);

      const [menuItemsRes, currentRes, prevRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("pos_id, location_id, name, category, price_cents, cost_cents")
          .in("location_id", locationIds!)
          .eq("active", true),
        supabase
          .from("pmix_sales")
          .select("menu_item_pos_id, quantity_sold")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(periodStart))
          .lt("business_date", isoDate(today)),
        supabase
          .from("pmix_sales")
          .select("menu_item_pos_id, quantity_sold")
          .in("location_id", locationIds!)
          .gte("business_date", isoDate(prevStart))
          .lt("business_date", isoDate(periodStart)),
      ]);
      if (menuItemsRes.error) throw menuItemsRes.error;
      if (currentRes.error) throw currentRes.error;
      if (prevRes.error) throw prevRes.error;

      const sumBy = (rows: { menu_item_pos_id: string; quantity_sold: number }[]) => {
        const map = new Map<string, number>();
        for (const r of rows) map.set(r.menu_item_pos_id, (map.get(r.menu_item_pos_id) ?? 0) + Number(r.quantity_sold));
        return map;
      };
      const current = sumBy(currentRes.data ?? []);
      const prev = sumBy(prevRes.data ?? []);

      return (menuItemsRes.data ?? []).map((m) => ({
        id: m.pos_id,
        locationId: m.location_id,
        name: m.name,
        category: m.category ?? "Uncategorized",
        price: (m.price_cents ?? 0) / 100,
        cost: m.cost_cents != null ? m.cost_cents / 100 : undefined,
        soldWk: current.get(m.pos_id) ?? 0,
        soldPrevWk: prev.get(m.pos_id) ?? 0,
      }));
    },
  });
}

export function useUpdateItemCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, posId, costCents }: { locationId: string; posId: string; costCents: number | null }) => {
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

export type DailyRevenue = { day: string; revenue: number; lastWeek: number };

// Last `days` days of net sales, each paired with the same weekday one
// week earlier for a like-for-like comparison line.
export function useSalesTrend(days = 7) {
  const { data: locationIds } = useLocationIds();

  return useQuery({
    queryKey: ["sales-trend", locationIds, days],
    enabled: !!locationIds && locationIds.length > 0,
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
      for (const r of data ?? []) byDate.set(r.business_date, (byDate.get(r.business_date) ?? 0) + Number(r.net_sales_cents));

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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useLocationIds, useRestaurantIds } from "@/lib/supabase/scope";

// A user's dashboard today only ever shows one location — same
// simplification as useCurrentRestaurantId, revisit when multi-location
// restaurants are onboarded.
function useCurrentLocationId(): string | undefined {
  return useLocationIds().data?.[0];
}

// A user can belong to more than one restaurant, but the dashboard
// today only ever shows one at a time — this picks the first as the
// "current" restaurant for writes. Revisit when a restaurant switcher
// exists (Phase 3 multi-tenant onboarding).
function useCurrentRestaurantId(): string | undefined {
  return useRestaurantIds()[0];
}

// Field names (email/terms, not contactEmail/paymentTerms) match what
// the existing Lovable-generated inventory.tsx/invoices.tsx UI already
// uses, to keep the diff on those large files minimal.
export type Vendor = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  accountNo: string;
  deliveryDays: string;
  terms: string;
  notes?: string;
};

function fromRow(row: any): Vendor {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? "",
    email: row.contact_email ?? "",
    phone: row.phone ?? "",
    accountNo: row.account_no ?? "",
    deliveryDays: row.delivery_days ?? "",
    terms: row.payment_terms ?? "",
    notes: row.notes ?? undefined,
  };
}

export function useVendors() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["vendors", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase.from("vendors").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map(fromRow);
    },
  });
}

export type VendorInput = Omit<Vendor, "id">;

function toRow(input: VendorInput) {
  return {
    name: input.name,
    contact_name: input.contactName || null,
    contact_email: input.email || null,
    phone: input.phone || null,
    account_no: input.accountNo || null,
    delivery_days: input.deliveryDays || null,
    payment_terms: input.terms || null,
    notes: input.notes || null,
  };
}

export function useCreateVendor() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VendorInput) => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { error } = await supabase.from("vendors").insert({ restaurant_id: restaurantId, ...toRow(input) });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: VendorInput & { id: string }) => {
      const { error } = await supabase.from("vendors").update(toRow(input)).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  unitCostCents: number | null;
};

export function useIngredients() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["ingredients", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<Ingredient[]> => {
      const { data, error } = await supabase.from("ingredients").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        unit: row.unit,
        unitCostCents: row.unit_cost_cents,
      }));
    },
  });
}

export type IngredientInput = { name: string; unit: string; unitCostCents?: number | null };

export function useCreateIngredient() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: IngredientInput) => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { error } = await supabase.from("ingredients").insert({
        restaurant_id: restaurantId,
        name: input.name,
        unit: input.unit,
        unit_cost_cents: input.unitCostCents ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: IngredientInput & { id: string }) => {
      const { error } = await supabase
        .from("ingredients")
        .update({ name: input.name, unit: input.unit, unit_cost_cents: input.unitCostCents ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });
}

// ------------------------------------------------------------
// Inventory items — the shape inventory.tsx's UI expects: an
// ingredient joined with its current on-hand quantity (ingredient_stock),
// its par target (par_levels), and its preferred vendor's name.
// weeklyUsage is always 0 for now — real usage needs recipe_lines
// (menu item -> ingredients) joined against pmix_sales, which doesn't
// exist until the recipe bridge is built (the next Phase 2 step).
// ------------------------------------------------------------
export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  par: number;
  vendor: string;
  vendorId: string | null;
  cost: number;
  weeklyUsage: number;
  lastOrdered: string;
};

function formatLastOrdered(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function useInventoryItems() {
  const restaurantId = useCurrentRestaurantId();
  const locationId = useCurrentLocationId();
  return useQuery({
    queryKey: ["inventory-items", restaurantId, locationId],
    enabled: !!restaurantId && !!locationId,
    queryFn: async (): Promise<InventoryItem[]> => {
      const [ingredientsRes, stockRes, parRes, vendorsRes] = await Promise.all([
        supabase.from("ingredients").select("*").order("name"),
        supabase.from("ingredient_stock").select("*").eq("location_id", locationId!),
        supabase.from("par_levels").select("*").eq("location_id", locationId!),
        supabase.from("vendors").select("id, name"),
      ]);
      if (ingredientsRes.error) throw ingredientsRes.error;
      if (stockRes.error) throw stockRes.error;
      if (parRes.error) throw parRes.error;
      if (vendorsRes.error) throw vendorsRes.error;

      const stockByIngredient = new Map((stockRes.data ?? []).map((r) => [r.ingredient_id, r]));
      const parByIngredient = new Map((parRes.data ?? []).map((r) => [r.ingredient_id, r]));
      const vendorNameById = new Map((vendorsRes.data ?? []).map((v) => [v.id, v.name as string]));

      return (ingredientsRes.data ?? []).map((ing) => {
        const stock = stockByIngredient.get(ing.id);
        const par = parByIngredient.get(ing.id);
        return {
          id: ing.id,
          name: ing.name,
          category: ing.category ?? "Miscellaneous",
          unit: ing.unit,
          onHand: stock?.on_hand_quantity != null ? Number(stock.on_hand_quantity) : 0,
          par: par?.par_quantity != null ? Number(par.par_quantity) : 1,
          vendor: ing.vendor_id ? (vendorNameById.get(ing.vendor_id) ?? "") : "",
          vendorId: ing.vendor_id,
          cost: (ing.unit_cost_cents ?? 0) / 100,
          weeklyUsage: 0,
          lastOrdered: formatLastOrdered(stock?.last_ordered_at ?? null),
        };
      });
    },
  });
}

export type InventoryItemInput = {
  name: string;
  category: string;
  unit: string;
  onHand: number;
  par: number;
  vendorId: string | null;
  costCents: number | null;
};

export function useCreateInventoryItem() {
  const restaurantId = useCurrentRestaurantId();
  const locationId = useCurrentLocationId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InventoryItemInput) => {
      if (!restaurantId || !locationId) throw new Error("no current restaurant/location");
      const { data: ingredient, error: ingErr } = await supabase
        .from("ingredients")
        .insert({
          restaurant_id: restaurantId,
          name: input.name,
          category: input.category,
          unit: input.unit,
          unit_cost_cents: input.costCents,
          vendor_id: input.vendorId,
        })
        .select("id")
        .single();
      if (ingErr) throw ingErr;

      const [stockRes, parRes] = await Promise.all([
        supabase.from("ingredient_stock").insert({
          restaurant_id: restaurantId,
          location_id: locationId,
          ingredient_id: ingredient.id,
          on_hand_quantity: input.onHand,
        }),
        supabase.from("par_levels").insert({
          restaurant_id: restaurantId,
          location_id: locationId,
          ingredient_id: ingredient.id,
          par_quantity: input.par,
        }),
      ]);
      if (stockRes.error) throw stockRes.error;
      if (parRes.error) throw parRes.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Cascades to ingredient_stock/par_levels/recipe_lines via FK.
      const { error } = await supabase.from("ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useUpdateOnHand() {
  const restaurantId = useCurrentRestaurantId();
  const locationId = useCurrentLocationId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ingredientId, onHand }: { ingredientId: string; onHand: number }) => {
      if (!restaurantId || !locationId) throw new Error("no current restaurant/location");
      const { error } = await supabase.from("ingredient_stock").upsert(
        {
          restaurant_id: restaurantId,
          location_id: locationId,
          ingredient_id: ingredientId,
          on_hand_quantity: onHand,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "location_id,ingredient_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

// Marks ingredients as just-ordered (PO dispatched) — separate from
// on-hand count, which only changes when stock is actually counted or
// a delivery is received.
export function useMarkOrdered() {
  const restaurantId = useCurrentRestaurantId();
  const locationId = useCurrentLocationId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ingredientIds: string[]) => {
      if (!restaurantId || !locationId) throw new Error("no current restaurant/location");
      const now = new Date().toISOString();
      const { error } = await supabase.from("ingredient_stock").upsert(
        ingredientIds.map((ingredientId) => ({
          restaurant_id: restaurantId,
          location_id: locationId,
          ingredient_id: ingredientId,
          last_ordered_at: now,
          updated_at: now,
        })),
        { onConflict: "location_id,ingredient_id", ignoreDuplicates: false },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

export function useUpdatePar() {
  const restaurantId = useCurrentRestaurantId();
  const locationId = useCurrentLocationId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ingredientId, par }: { ingredientId: string; par: number }) => {
      if (!restaurantId || !locationId) throw new Error("no current restaurant/location");
      const { error } = await supabase.from("par_levels").upsert(
        {
          restaurant_id: restaurantId,
          location_id: locationId,
          ingredient_id: ingredientId,
          par_quantity: par,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "location_id,ingredient_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
  });
}

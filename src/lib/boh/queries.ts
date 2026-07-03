import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useRestaurantIds } from "@/lib/supabase/scope";

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

import { useQuery } from "@tanstack/react-query";

import { supabase } from "./client";
import { useAuth } from "./auth-context";

// RLS already scopes every query to the signed-in user's own
// restaurants — this just resolves which location_id(s) to filter on
// (a restaurant can have more than one location).
export function useLocationIds() {
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

export function useRestaurantIds(): string[] {
  const { memberships } = useAuth();
  return memberships.map((m) => m.restaurant_id);
}

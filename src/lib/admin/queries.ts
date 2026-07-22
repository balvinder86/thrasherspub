import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useRestaurantIds } from "@/lib/supabase/scope";

function useCurrentRestaurantId(): string | undefined {
  return useRestaurantIds()[0];
}

export type Role = "owner" | "manager" | "staff";

export type TeamMember = {
  userId: string;
  email: string;
  role: Role;
  joinedAt: string;
  isSelf: boolean;
};

async function callManageTeam<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-team", { body });
  if (error || !(data as { ok?: boolean } | null)?.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ?? error?.message ?? "request failed",
    );
  }
  return data as T;
}

export function useTeamMembers() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["team-members", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<TeamMember[]> => {
      const { members } = await callManageTeam<{ members: TeamMember[] }>({
        action: "list",
        restaurant_id: restaurantId,
      });
      return members;
    },
  });
}

export type InviteResult = {
  emailSent: boolean;
  emailError?: string;
  inviteLink?: string;
};

export function useInviteMember() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: Role }): Promise<InviteResult> => {
      if (!restaurantId) throw new Error("no current restaurant");
      return callManageTeam<InviteResult>({
        action: "invite",
        restaurant_id: restaurantId,
        email,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", restaurantId] });
    },
  });
}

export function useUpdateMemberRole() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      if (!restaurantId) throw new Error("no current restaurant");
      await callManageTeam({
        action: "update_role",
        restaurant_id: restaurantId,
        user_id: userId,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", restaurantId] });
    },
  });
}

export function useRemoveMember() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!restaurantId) throw new Error("no current restaurant");
      await callManageTeam({ action: "remove", restaurant_id: restaurantId, user_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", restaurantId] });
    },
  });
}

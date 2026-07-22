// Team management for the Admin tab — invite/list/change-role/remove
// members of a restaurant. Every write action requires the caller to
// be an 'owner' of the target restaurant, checked explicitly here:
// the service-role client below bypasses RLS, so nothing stops an
// authenticated staff member from calling this function directly with
// someone else's restaurant_id unless we check membership + role
// ourselves.
//
//   { action: "list", restaurant_id }
//   { action: "invite", restaurant_id, email, role }
//   { action: "update_role", restaurant_id, user_id, role }
//   { action: "remove", restaurant_id, user_id }

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

const ROLES = ["owner", "manager", "staff"] as const;
type Role = (typeof ROLES)[number];
function isRole(v: unknown): v is Role {
  return typeof v === "string" && (ROLES as readonly string[]).includes(v);
}

async function assertOwner(userId: string, restaurantId: string) {
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (data?.role !== "owner") throw new Error("only an owner can manage the team");
}

async function ownerCount(restaurantId: string): Promise<number> {
  const { count } = await supabase
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner");
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return json({ ok: false, step: "auth", error: "missing Authorization header" }, 401);
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return json({ ok: false, step: "auth", error: "invalid session" }, 401);
    }
    const callerId = userData.user.id;

    const body = await req.json();
    const { action, restaurant_id: restaurantId } = body;
    if (!restaurantId) {
      return json({ ok: false, step: "input", error: "restaurant_id is required" }, 400);
    }

    if (action === "list") {
      const { data: memberships, error } = await supabase
        .from("memberships")
        .select("user_id, role, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });
      if (error) return json({ ok: false, error: error.message }, 500);

      const members = await Promise.all(
        (memberships ?? []).map(async (m) => {
          const { data: u } = await supabase.auth.admin.getUserById(m.user_id);
          return {
            userId: m.user_id,
            email: u.user?.email ?? "unknown",
            role: m.role,
            joinedAt: m.created_at,
            isSelf: m.user_id === callerId,
          };
        }),
      );
      return json({ ok: true, members }, 200);
    }

    if (action === "invite") {
      const { email, role } = body;
      if (typeof email !== "string" || !email.includes("@")) {
        return json({ ok: false, step: "input", error: "a valid email is required" }, 400);
      }
      if (!isRole(role)) {
        return json({ ok: false, step: "input", error: "role must be owner, manager, or staff" }, 400);
      }
      try {
        await assertOwner(callerId, restaurantId);
      } catch (e) {
        return json({ ok: false, step: "auth", error: (e as Error).message }, 403);
      }

      let userId: string;
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        email,
        { redirectTo: `${APP_BASE_URL}/set-password` },
      );
      if (inviteErr) {
        // Already-registered is the one expected/recoverable error —
        // that person already has a real account (maybe on another
        // restaurant, or invited before), so just add them directly
        // instead of trying to re-send an invite Supabase won't send.
        if (!/already.*registered|already.*exists/i.test(inviteErr.message)) {
          return json({ ok: false, step: "invite", error: inviteErr.message }, 500);
        }
        const { data: existingId, error: lookupErr } = await supabase.rpc(
          "get_user_id_by_email",
          { lookup_email: email },
        );
        if (lookupErr || !existingId) {
          return json(
            { ok: false, step: "invite", error: lookupErr?.message ?? "could not find that user" },
            500,
          );
        }
        userId = existingId;
      } else {
        userId = invited.user.id;
      }

      const { error: upsertErr } = await supabase
        .from("memberships")
        .upsert({ user_id: userId, restaurant_id: restaurantId, role }, { onConflict: "user_id,restaurant_id" });
      if (upsertErr) return json({ ok: false, step: "membership", error: upsertErr.message }, 500);

      return json({ ok: true }, 200);
    }

    if (action === "update_role") {
      const { user_id: targetUserId, role } = body;
      if (typeof targetUserId !== "string") {
        return json({ ok: false, step: "input", error: "user_id is required" }, 400);
      }
      if (!isRole(role)) {
        return json({ ok: false, step: "input", error: "role must be owner, manager, or staff" }, 400);
      }
      try {
        await assertOwner(callerId, restaurantId);
      } catch (e) {
        return json({ ok: false, step: "auth", error: (e as Error).message }, 403);
      }

      const { data: target } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!target) return json({ ok: false, step: "input", error: "not a member" }, 404);

      if (target.role === "owner" && role !== "owner" && (await ownerCount(restaurantId)) <= 1) {
        return json(
          { ok: false, step: "guard", error: "a restaurant must keep at least one owner" },
          400,
        );
      }

      const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("user_id", targetUserId)
        .eq("restaurant_id", restaurantId);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true }, 200);
    }

    if (action === "remove") {
      const { user_id: targetUserId } = body;
      if (typeof targetUserId !== "string") {
        return json({ ok: false, step: "input", error: "user_id is required" }, 400);
      }
      try {
        await assertOwner(callerId, restaurantId);
      } catch (e) {
        return json({ ok: false, step: "auth", error: (e as Error).message }, 403);
      }

      const { data: target } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!target) return json({ ok: false, step: "input", error: "not a member" }, 404);

      if (target.role === "owner" && (await ownerCount(restaurantId)) <= 1) {
        return json(
          { ok: false, step: "guard", error: "a restaurant must keep at least one owner" },
          400,
        );
      }

      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("user_id", targetUserId)
        .eq("restaurant_id", restaurantId);
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true }, 200);
    }

    return json(
      { ok: false, step: "input", error: "action must be 'list', 'invite', 'update_role', or 'remove'" },
      400,
    );
  } catch (e) {
    return json({ ok: false, step: "unexpected", error: String(e) }, 500);
  }
});

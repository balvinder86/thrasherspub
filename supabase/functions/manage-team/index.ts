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
//
// Invite emails do NOT go through supabase.auth.admin.inviteUserByEmail
// (which sends via Supabase Auth's configured SMTP) — that SMTP is
// Resend on a sandbox sender, and thrasherspubbothell.com's DNS is
// hosted on Wix, which cannot add the MX record Resend requires to
// verify a sending domain (confirmed with Wix support; a Cloudflare
// DNS migration was also attempted and blocked by a deeper Wix
// registrar policy — see send-purchase-order-email/index.ts for the
// full history of the same dead end). Same fix reused here: generate
// the invite link with admin.generateLink (creates the user, never
// sends anything) and deliver it ourselves via the Gmail API, using
// the same connected Gmail account purchase-order emails already send
// from.

import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID")!;
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

async function refreshGmailAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`refresh Gmail access token failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendGmailMessage(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<string> {
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64UrlEncode(mime) }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMessage =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      `Gmail API error ${res.status}`;
    throw new Error(errorMessage);
  }
  return (body as { id?: string } | null)?.id ?? "";
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
        return json(
          { ok: false, step: "input", error: "role must be owner, manager, or staff" },
          400,
        );
      }
      try {
        await assertOwner(callerId, restaurantId);
      } catch (e) {
        return json({ ok: false, step: "auth", error: (e as Error).message }, 403);
      }

      // generateLink creates the user (or reuses them if they already
      // have an account) and hands back a real invite link — it never
      // sends anything itself, unlike inviteUserByEmail.
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: `${APP_BASE_URL}/set-password` },
      });
      if (linkErr || !linkData?.user) {
        return json(
          { ok: false, step: "invite", error: linkErr?.message ?? "could not create invite" },
          500,
        );
      }
      const userId = linkData.user.id;

      const { error: upsertErr } = await supabase
        .from("memberships")
        .upsert(
          { user_id: userId, restaurant_id: restaurantId, role },
          { onConflict: "user_id,restaurant_id" },
        );
      if (upsertErr) return json({ ok: false, step: "membership", error: upsertErr.message }, 500);

      // Membership access is granted at this point regardless of what
      // happens below — a Gmail hiccup shouldn't undo a real,
      // successful invite grant, so failures here are reported
      // alongside ok:true rather than as a hard error.
      try {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", restaurantId)
          .single();
        const restaurantName = restaurant?.name ?? "the team";

        const { data: emailCred, error: emailCredErr } = await supabase
          .from("email_ingestion_credentials")
          .select("connected_email, vault_secret_name")
          .eq("restaurant_id", restaurantId)
          .eq("provider", "gmail")
          .maybeSingle();
        if (emailCredErr || !emailCred) {
          throw new Error("no connected Gmail account to send the invite from");
        }

        const { data: secretRaw, error: secretErr } = await supabase.rpc("get_pos_secret", {
          secret_name: emailCred.vault_secret_name,
        });
        if (secretErr || !secretRaw) {
          throw new Error(`vault secret not found: ${secretErr?.message ?? ""}`);
        }
        const { refreshToken } = JSON.parse(secretRaw);
        if (!refreshToken) throw new Error("vault secret missing refreshToken");

        const gmailAccessToken = await refreshGmailAccessToken(refreshToken);
        const html = `
          <p>You've been invited to join <strong>${restaurantName}</strong> on the owner dashboard, as ${role}.</p>
          <p><a href="${linkData.properties.action_link}">Accept the invite and set a password</a></p>
          <p>If you weren't expecting this, you can ignore this email.</p>
        `;
        await sendGmailMessage(
          gmailAccessToken,
          `${restaurantName} <${emailCred.connected_email}>`,
          email,
          `You've been invited to ${restaurantName}`,
          html,
        );
      } catch (sendErr) {
        return json(
          {
            ok: true,
            emailSent: false,
            emailError: sendErr instanceof Error ? sendErr.message : String(sendErr),
            inviteLink: linkData.properties.action_link,
          },
          200,
        );
      }

      return json({ ok: true, emailSent: true }, 200);
    }

    if (action === "update_role") {
      const { user_id: targetUserId, role } = body;
      if (typeof targetUserId !== "string") {
        return json({ ok: false, step: "input", error: "user_id is required" }, 400);
      }
      if (!isRole(role)) {
        return json(
          { ok: false, step: "input", error: "role must be owner, manager, or staff" },
          400,
        );
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
      {
        ok: false,
        step: "input",
        error: "action must be 'list', 'invite', 'update_role', or 'remove'",
      },
      400,
    );
  } catch (e) {
    return json({ ok: false, step: "unexpected", error: String(e) }, 500);
  }
});

import { createClient } from "@supabase/supabase-js";
import type { GoogleCookie } from "./browser.js";
import type { ReviewAgentSettings } from "./claude.js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient(url, serviceRoleKey);

export type RestaurantReviewConfig = {
  credentialId: string;
  restaurantId: string;
  businessProfileId: string;
  searchQuery: string;
  vaultSecretName: string;
  settings: ReviewAgentSettings;
  maxRepliesPerRun: number;
  autoSend5Star: boolean;
};

// Loads every restaurant with a connected Google review agent (used by
// the background sweep), or one specific restaurant (used by the
// on-demand /scan trigger). Two separate queries, not a PostgREST
// embed — review_agent_credentials and review_agent_settings both
// reference restaurants(id) independently, with no FK between the two
// tables themselves, so there's no relationship for PostgREST to
// auto-detect and join on.
export async function getReviewAgentConfigs(
  restaurantId?: string,
): Promise<RestaurantReviewConfig[]> {
  let credQuery = supabase
    .from("review_agent_credentials")
    .select("id, restaurant_id, business_profile_id, search_query, vault_secret_name")
    .eq("provider", "google");
  if (restaurantId) credQuery = credQuery.eq("restaurant_id", restaurantId);

  const { data: creds, error: credErr } = await credQuery;
  if (credErr) throw new Error(`load review_agent_credentials failed: ${credErr.message}`);
  if (!creds || creds.length === 0) return [];

  const { data: settingsRows, error: settingsErr } = await supabase
    .from("review_agent_settings")
    .select(
      "restaurant_id, business_name, business_description, reply_contact_email, max_replies_per_run, auto_send_5_star",
    )
    .in(
      "restaurant_id",
      creds.map((c) => c.restaurant_id),
    );
  if (settingsErr) throw new Error(`load review_agent_settings failed: ${settingsErr.message}`);

  const settingsByRestaurant = new Map((settingsRows ?? []).map((s) => [s.restaurant_id, s]));

  return creds
    .filter((c) => settingsByRestaurant.has(c.restaurant_id))
    .map((c) => {
      const settings = settingsByRestaurant.get(c.restaurant_id)!;
      return {
        credentialId: c.id,
        restaurantId: c.restaurant_id,
        businessProfileId: c.business_profile_id,
        searchQuery: c.search_query,
        vaultSecretName: c.vault_secret_name,
        settings: {
          businessName: settings.business_name,
          businessDescription: settings.business_description,
          replyContactEmail: settings.reply_contact_email,
        },
        maxRepliesPerRun: settings.max_replies_per_run,
        autoSend5Star: settings.auto_send_5_star,
      };
    });
}

// Reuses the same Vault-secret-reader RPC Toast/Gmail credentials use —
// it's generic (looks up any named secret), not provider-specific.
export async function getGoogleCookies(vaultSecretName: string): Promise<GoogleCookie[]> {
  const { data, error } = await supabase.rpc("get_pos_secret", { secret_name: vaultSecretName });
  if (error || !data)
    throw new Error(`vault secret '${vaultSecretName}' not found: ${error?.message ?? ""}`);
  const parsed = JSON.parse(data);
  if (!Array.isArray(parsed.cookies))
    throw new Error(`vault secret '${vaultSecretName}' missing cookies array`);
  return parsed.cookies;
}

export async function markCookiesValid(credentialId: string, at: Date) {
  const { error } = await supabase
    .from("review_agent_credentials")
    .update({ cookies_valid_at: at.toISOString(), last_synced_at: at.toISOString() })
    .eq("id", credentialId);
  if (error) throw new Error(`update cookies_valid_at failed: ${error.message}`);
}

// Records what the most recent scan actually saw in Google's reviews
// panel — lets the Reviews page show an honest banner when Google's
// own UI is contradicting itself (real nonzero review count, but the
// panel renders no reviews at all) instead of silently drafting
// nothing and leaving the owner to wonder why.
export async function recordPanelHealth(
  credentialId: string,
  googleReviewCount: number | null,
  panelHealthy: boolean,
) {
  const { error } = await supabase
    .from("review_agent_credentials")
    .update({
      last_scan_google_review_count: googleReviewCount,
      last_scan_panel_healthy: panelHealthy,
    })
    .eq("id", credentialId);
  if (error) throw new Error(`update panel health failed: ${error.message}`);
}

export async function findExistingReview(
  restaurantId: string,
  reviewerName: string,
  starRating: number,
  reviewText: string,
): Promise<string | null> {
  // insertDraftReview stores an empty comment as NULL, not "" — and in
  // SQL, `review_text = ''` never matches `review_text IS NULL`. Without
  // this, a star-only review (no comment) is never found as already
  // existing, so every re-scan tries to insert it again and collides
  // with reviews_dedup_idx instead of being skipped.
  const query = supabase
    .from("reviews")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("reviewer_name", reviewerName)
    .eq("star_rating", starRating);
  const { data, error } = await (
    reviewText ? query.eq("review_text", reviewText) : query.is("review_text", null)
  ).maybeSingle();
  if (error) throw new Error(`check reviews failed: ${error.message}`);
  return data?.id ?? null;
}

export async function insertDraftReview(input: {
  restaurantId: string;
  reviewerName: string;
  starRating: number;
  reviewText: string;
  aiDraftReply: string;
  reviewWrittenAt: string | null;
  // Set when auto-send already attempted this review during the same
  // scan (5-star only, opt-in) — inserted directly as posted/failed
  // instead of the normal drafted-then-human-approves flow.
  autoPosted?: boolean;
  autoPostError?: string;
}): Promise<string> {
  const status = input.autoPosted ? "posted" : input.autoPostError ? "post_failed" : "drafted";
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      restaurant_id: input.restaurantId,
      provider: "google",
      reviewer_name: input.reviewerName,
      star_rating: input.starRating,
      review_text: input.reviewText || null,
      ai_draft_reply: input.aiDraftReply,
      review_written_at: input.reviewWrittenAt,
      status,
      posted_at: input.autoPosted ? new Date().toISOString() : null,
      post_error: input.autoPostError ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insert review failed: ${error?.message ?? ""}`);
  return data.id;
}

export type ReviewForPosting = {
  id: string;
  restaurantId: string;
  reviewerName: string;
  reviewText: string;
  replyText: string;
  status: string;
};

export async function getReviewForPosting(reviewId: string): Promise<ReviewForPosting> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, restaurant_id, reviewer_name, review_text, ai_draft_reply, edited_reply, status")
    .eq("id", reviewId)
    .single();
  if (error || !data) throw new Error(`review not found: ${error?.message ?? reviewId}`);
  const replyText = data.edited_reply ?? data.ai_draft_reply;
  if (!replyText) throw new Error(`review ${reviewId} has no reply text to post`);
  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    reviewerName: data.reviewer_name,
    reviewText: data.review_text ?? "",
    replyText,
    status: data.status,
  };
}

export async function markReviewPosted(reviewId: string, at: Date) {
  const { error } = await supabase
    .from("reviews")
    .update({ status: "posted", posted_at: at.toISOString(), post_error: null })
    .eq("id", reviewId);
  if (error) throw new Error(`update review status failed: ${error.message}`);
}

export async function markReviewPostFailed(reviewId: string, errorMessage: string) {
  await supabase
    .from("reviews")
    .update({ status: "post_failed", post_error: errorMessage })
    .eq("id", reviewId);
}

export async function getCredentialsForRestaurant(
  restaurantId: string,
): Promise<RestaurantReviewConfig> {
  const configs = await getReviewAgentConfigs(restaurantId);
  if (configs.length === 0)
    throw new Error(`no review agent connected for restaurant ${restaurantId}`);
  return configs[0];
}

export type ReviewForRegenerate = {
  id: string;
  restaurantId: string;
  reviewerName: string;
  starRating: number;
  reviewText: string;
};

export async function getReviewForRegenerate(reviewId: string): Promise<ReviewForRegenerate> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, restaurant_id, reviewer_name, star_rating, review_text")
    .eq("id", reviewId)
    .single();
  if (error || !data) throw new Error(`review not found: ${error?.message ?? reviewId}`);
  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    reviewerName: data.reviewer_name,
    starRating: data.star_rating,
    reviewText: data.review_text ?? "",
  };
}

export async function updateDraftReply(reviewId: string, draftReply: string) {
  const { error } = await supabase
    .from("reviews")
    .update({ ai_draft_reply: draftReply })
    .eq("id", reviewId);
  if (error) throw new Error(`update ai_draft_reply failed: ${error.message}`);
}

export async function getSearchConsoleSiteUrl(restaurantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("search_console_credentials")
    .select("site_url")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw new Error(`load search_console_credentials failed: ${error.message}`);
  return data?.site_url ?? null;
}

export async function getTrackedQuery(
  restaurantId: string,
  trackedQueryId: string,
): Promise<{ id: string; query: string }> {
  const { data, error } = await supabase
    .from("competitor_tracked_queries")
    .select("id, query")
    .eq("id", trackedQueryId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error || !data)
    throw new Error(`tracked query not found: ${error?.message ?? trackedQueryId}`);
  return data;
}

export async function insertCompetitorScan(input: {
  restaurantId: string;
  trackedQueryId: string;
  query: string;
  localPack: unknown;
  ownInPack: boolean;
  ownPosition: number | null;
  organicResults: unknown;
}) {
  const { error } = await supabase.from("competitor_scans").insert({
    restaurant_id: input.restaurantId,
    tracked_query_id: input.trackedQueryId,
    query: input.query,
    local_pack: input.localPack,
    own_in_pack: input.ownInPack,
    own_position: input.ownPosition,
    organic_results: input.organicResults,
  });
  if (error) throw new Error(`insert competitor_scans failed: ${error.message}`);
}

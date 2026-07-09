// Real Google review-reply agent — multi-tenant port of
// ~/dev/restaurant-review-agent (single-tenant, already posted a real
// reply for Thrasher's). Runs as a persistent HTTP server, same shape
// as ocr/server.ts: token-authenticated on-demand endpoints plus a
// background sweep in the same process, since Playwright/Google
// review scraping needs both an on-demand "Check now" trigger and
// periodic freshness without anyone having the page open.
//
// Not a public-facing service: the frontend calls Supabase's
// review-agent Edge Function, which verifies the caller's session JWT
// and restaurant membership, then proxies here with a shared secret.

import { createServer } from "node:http";
import {
  getReviewAgentConfigs,
  getCredentialsForRestaurant,
  getGoogleCookies,
  markCookiesValid,
  findExistingReview,
  insertDraftReview,
  getReviewForPosting,
  markReviewPosted,
  markReviewPostFailed,
  getReviewForRegenerate,
  updateDraftReply,
  type RestaurantReviewConfig,
} from "./db.js";
import { scanUnrepliedReviews, postReplyToReview } from "./browser.js";
import { generateReply } from "./claude.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const SERVICE_TOKEN = process.env.REVIEW_AGENT_SERVICE_TOKEN;
if (!SERVICE_TOKEN) throw new Error("REVIEW_AGENT_SERVICE_TOKEN must be set");

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

async function scanConfig(config: RestaurantReviewConfig) {
  const cookies = await getGoogleCookies(config.vaultSecretName);

  const { found, extracted } = await scanUnrepliedReviews(
    cookies,
    config.businessProfileId,
    config.searchQuery,
    (reviewerName, starRating, comment) => generateReply(reviewerName, starRating, comment, config.settings),
    config.maxRepliesPerRun,
    config.autoSend5Star,
  );

  await markCookiesValid(config.credentialId, new Date());

  let drafted = 0;
  let autoPosted = 0;
  for (const review of extracted) {
    const existingId = await findExistingReview(
      config.restaurantId,
      review.reviewerName,
      review.starRating,
      review.comment,
    );
    if (existingId) continue;
    await insertDraftReview({
      restaurantId: config.restaurantId,
      reviewerName: review.reviewerName,
      starRating: review.starRating,
      reviewText: review.comment,
      aiDraftReply: review.replyText,
      reviewWrittenAt: review.writtenAt,
      autoPosted: review.autoPosted,
      autoPostError: review.autoPostError,
    });
    drafted++;
    if (review.autoPosted) autoPosted++;
  }

  return { found, drafted, autoPosted };
}

async function handleScan(restaurantId: string) {
  const config = await getCredentialsForRestaurant(restaurantId);
  const { found, drafted, autoPosted } = await scanConfig(config);
  return { found, drafted, autoPosted };
}

async function handlePost(reviewId: string) {
  const review = await getReviewForPosting(reviewId);

  // A review already marked posted means an earlier call already did
  // the real work — whatever triggered this call again (a client
  // retry, a double-submitted request), re-running Playwright against
  // Google would either fail safely (the review's no longer
  // "Unreplied") or, worse, risk acting on the wrong row if timing
  // shifted the list. Short-circuit before touching Google at all.
  if (review.status === "posted") {
    return { posted: true, alreadyPosted: true };
  }

  const config = await getCredentialsForRestaurant(review.restaurantId);
  const cookies = await getGoogleCookies(config.vaultSecretName);

  try {
    await postReplyToReview(
      cookies,
      config.businessProfileId,
      config.searchQuery,
      review.reviewerName,
      review.reviewText,
      review.replyText,
    );
    await markReviewPosted(reviewId, new Date());
    return { posted: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Re-check status before recording failure — if a concurrent call
    // already posted this review successfully while this one was
    // in-flight, don't clobber that real success with a misleading
    // "failed" state.
    const current = await getReviewForPosting(reviewId);
    if (current.status !== "posted") {
      await markReviewPostFailed(reviewId, message);
    }
    throw new Error(message);
  }
}

async function handleRegenerate(reviewId: string) {
  const review = await getReviewForRegenerate(reviewId);
  const config = await getCredentialsForRestaurant(review.restaurantId);
  const draftReply = await generateReply(
    review.reviewerName,
    review.starRating,
    review.reviewText,
    config.settings,
  );
  await updateDraftReply(reviewId, draftReply);
  return { draftReply };
}

const server = createServer(async (req, res) => {
  const respond = (status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.headers.authorization !== `Bearer ${SERVICE_TOKEN}`) {
    respond(401, { ok: false, error: "unauthorized" });
    return;
  }

  try {
    const body = await readJsonBody(req);

    if (req.url === "/scan" && req.method === "POST") {
      const restaurantId = body.restaurant_id;
      if (typeof restaurantId !== "string") {
        respond(400, { ok: false, error: "restaurant_id is required" });
        return;
      }
      respond(200, { ok: true, ...(await handleScan(restaurantId)) });
      return;
    }

    if (req.url === "/post" && req.method === "POST") {
      const reviewId = body.review_id;
      if (typeof reviewId !== "string") {
        respond(400, { ok: false, error: "review_id is required" });
        return;
      }
      respond(200, { ok: true, ...(await handlePost(reviewId)) });
      return;
    }

    if (req.url === "/regenerate" && req.method === "POST") {
      const reviewId = body.review_id;
      if (typeof reviewId !== "string") {
        respond(400, { ok: false, error: "review_id is required" });
        return;
      }
      respond(200, { ok: true, ...(await handleRegenerate(reviewId)) });
      return;
    }

    respond(404, { ok: false, error: "not found" });
  } catch (e) {
    console.error(`[${req.method} ${req.url}] failed:`, e);
    respond(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, () => console.log(`review-agent service listening on :${PORT}`));

// Background sweep — keeps the Reviews page populated even if nobody
// opens it, replacing the old hourly Railway-cron trigger the source
// repo used. Playwright browser launches are heavy, so this stays at
// the same ~10-15 min cadence as the other Railway services in this
// project rather than polling tighter.
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;

async function sweepAllRestaurants() {
  let configs: RestaurantReviewConfig[];
  try {
    configs = await getReviewAgentConfigs();
  } catch (e) {
    console.error("[background-sweep] failed to list review agent configs:", e);
    return;
  }
  for (const config of configs) {
    try {
      const { found, drafted, autoPosted } = await scanConfig(config);
      console.log(
        `[background-sweep] restaurant ${config.restaurantId}: found ${found}, drafted ${drafted}, autoPosted ${autoPosted}`,
      );
    } catch (e) {
      console.error(`[background-sweep] restaurant ${config.restaurantId} failed:`, e);
    }
  }
}

setInterval(sweepAllRestaurants, SWEEP_INTERVAL_MS);
sweepAllRestaurants();

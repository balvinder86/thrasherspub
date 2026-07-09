// Ported from ~/dev/restaurant-review-agent/src/browser.js — that
// version has already posted a real reply to a real Google review for
// Thrasher's. The DOM-scrape/reply logic below (extractReviewAt,
// submitReply) is kept as close to verbatim as the JS->TS port allows;
// only the surrounding structure changed: cookies/businessId/searchQuery
// now arrive as parameters instead of process.env/cookies.json, and the
// old single run(generateReply) that branched dry-run-draft-all vs.
// live-post-first-N-in-a-loop is split into two functions because v1
// has no automatic live-posting loop — every post is one human-approved
// review at a time, arriving well after the scan that found it.

import { chromium, type Page, type FrameLocator, type Cookie } from "playwright";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type GoogleCookie = Cookie;

export type ExtractedReview = {
  reviewerName: string;
  starRating: number;
  comment: string;
  writtenAt: string | null;
};

export type GenerateReplyFn = (
  reviewerName: string,
  starRating: number,
  comment: string,
) => Promise<string>;

async function withGoogleReviewsPanel<T>(
  cookies: GoogleCookie[],
  businessProfileId: string,
  searchQuery: string,
  fn: (page: Page, frame: () => FrameLocator) => Promise<T>,
): Promise<T> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
  });

  await context.addCookies(cookies);
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await SLEEP(3000);

    await page.locator('a:has-text("Read reviews"), button:has-text("Read reviews")').first().click();
    await page.waitForSelector(`iframe[src*="${businessProfileId}"]`, { timeout: 15000 });
    await SLEEP(2000);

    // Re-resolve the frame each time it's used — the iframe URL changes
    // on tab clicks.
    const frame = () => page.frameLocator(`iframe[src*="${businessProfileId}"]`).first();

    await frame().getByText("Unreplied", { exact: true }).first().click();
    await SLEEP(3000);

    return await fn(page, frame);
  } finally {
    await browser.close();
  }
}

// Google's review panel lazy-loads more reviews as you scroll — a
// plain .count() right after opening the Unreplied tab only sees the
// first rendered batch. Repeatedly scrolls the last known review into
// view (the standard way to trigger more loading in this kind of
// infinite-scroll list) until the count stops growing across two
// consecutive checks, so a full backlog import doesn't silently
// under-count past the first screenful.
async function loadAllUnrepliedReviews(frame: () => FrameLocator): Promise<number> {
  const MAX_ROUNDS = 25;
  let currentCount = await frame().getByText("Reply", { exact: true }).count();
  let stableRounds = 0;

  for (let round = 0; round < MAX_ROUNDS && stableRounds < 2; round++) {
    if (currentCount > 0) {
      await frame()
        .getByText("Reply", { exact: true })
        .last()
        .scrollIntoViewIfNeeded()
        .catch(() => {});
    }
    await SLEEP(1200);
    const previousCount = currentCount;
    currentCount = await frame().getByText("Reply", { exact: true }).count();
    stableRounds = currentCount === previousCount ? stableRounds + 1 : 0;
  }

  return currentCount;
}

// Reads the currently-unreplied reviews, up to `cap`, and generates a
// Claude draft for each. Always read-only — never fills or submits
// anything, so this is safe to call as often as needed (the on-demand
// "Check now" button and the periodic background sweep both use this).
export async function scanUnrepliedReviews(
  cookies: GoogleCookie[],
  businessProfileId: string,
  searchQuery: string,
  generateReply: GenerateReplyFn,
  cap: number,
): Promise<{ found: number; extracted: (ExtractedReview & { replyText: string })[] }> {
  return withGoogleReviewsPanel(cookies, businessProfileId, searchQuery, async (_page, frame) => {
    const found = await loadAllUnrepliedReviews(frame);
    const total = Math.min(found, cap);

    const extracted: (ExtractedReview & { replyText: string })[] = [];
    for (let i = 0; i < total; i++) {
      const review = await extractReviewAt(frame(), i);
      const replyText = await generateReply(review.reviewerName, review.starRating, review.comment);
      extracted.push({ ...review, replyText });
    }

    return { found, extracted };
  });
}

// Re-locates a specific review among the currently-unreplied list by
// reviewer name + comment text, then posts the given reply to it.
// Deliberately NOT "click the first Reply button" — that assumption
// only held in the source repo because extraction and posting happened
// in the same pass. Here a human approval step sits in between, during
// which new reviews may have appeared ahead of the one being posted to,
// or the target review may have already been answered via Google's own
// UI. Throws a descriptive error in either case rather than posting to
// the wrong review or silently no-op'ing.
export async function postReplyToReview(
  cookies: GoogleCookie[],
  businessProfileId: string,
  searchQuery: string,
  targetReviewerName: string,
  targetComment: string,
  replyText: string,
): Promise<void> {
  await withGoogleReviewsPanel(cookies, businessProfileId, searchQuery, async (_page, frame) => {
    const found = await frame().getByText("Reply", { exact: true }).count();

    let matchedIndex = -1;
    for (let i = 0; i < found; i++) {
      const review = await extractReviewAt(frame(), i);
      if (review.reviewerName === targetReviewerName && review.comment === targetComment) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new Error(
        `Review by "${targetReviewerName}" is no longer in the Unreplied list — it may already have a reply, or the review may be gone.`,
      );
    }

    await submitReplyAt(frame(), matchedIndex, replyText);
  });
}

// ─── Extraction ────────────────────────────────────────────────────────

async function extractReviewAt(frame: FrameLocator, index: number): Promise<ExtractedReview> {
  const replyBtn = frame.getByText("Reply", { exact: true }).nth(index);
  await replyBtn.waitFor({ state: "visible", timeout: 8000 });

  // Run the DOM walk in the page context with the Reply button as input.
  return replyBtn.evaluate((replyEl) => {
    let container = replyEl.parentElement;
    for (let depth = 0; depth < 25; depth++) {
      if (!container) break;

      const starEl =
        container.querySelector('[aria-label*="star" i]') ||
        container.querySelector('[aria-label*="out of 5"]');

      if (starEl) {
        const ariaLabel = starEl.getAttribute("aria-label") || "";
        const starMatch = ariaLabel.match(/(\d)/);
        const starRating = starMatch ? parseInt(starMatch[1], 10) : 3;

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        const texts: string[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const t = (node.textContent ?? "").trim();
          if (t.length > 1) texts.push(t);
        }

        const IGNORE =
          /^(star|Star|review|photo|ago|week|month|year|Local Guide|Translate|Reply|More|Like|Share|View full review|Posted|Edited|NEW)$|^\d/i;
        // Google renders the review's age as its own short text node near
        // the reviewer name, e.g. "2 weeks ago", "a month ago", "3 days
        // ago". Captured separately from reviewerName/comment since it
        // matches IGNORE (previously just discarded) and needs parsing,
        // not display, once found.
        const DATE_RELATIVE = /^(a|an|\d+)\s+(day|week|month|year|hour|minute)s?\s+ago$/i;
        let reviewerName = "Anonymous";
        let comment = "";
        let writtenRelative: string | null = null;

        for (const t of texts) {
          if (writtenRelative === null && DATE_RELATIVE.test(t)) {
            writtenRelative = t;
          }
          if (
            reviewerName === "Anonymous" &&
            t.length >= 2 &&
            t.length <= 60 &&
            !IGNORE.test(t) &&
            !/star|review|ago|Local Guide/i.test(t)
          ) {
            reviewerName = t;
          } else if (comment === "" && t.length > 20 && t !== reviewerName && !IGNORE.test(t)) {
            comment = t;
          }
          if (reviewerName !== "Anonymous" && comment !== "" && writtenRelative !== null) break;
        }

        let writtenAt: string | null = null;
        if (writtenRelative) {
          const m = writtenRelative.match(DATE_RELATIVE);
          if (m) {
            const amount = /^(a|an)$/i.test(m[1]) ? 1 : parseInt(m[1], 10);
            const unit = m[2].toLowerCase();
            const msPerUnit: Record<string, number> = {
              minute: 60_000,
              hour: 3_600_000,
              day: 86_400_000,
              week: 7 * 86_400_000,
              month: 30 * 86_400_000, // approximate — Google doesn't give exact dates
              year: 365 * 86_400_000,
            };
            writtenAt = new Date(Date.now() - amount * msPerUnit[unit]).toISOString();
          }
        }

        return { reviewerName, starRating, comment, writtenAt };
      }

      container = container.parentElement;
    }

    throw new Error("Could not find review container with star rating");
  });
}

// ─── Reply posting ─────────────────────────────────────────────────────

async function submitReplyAt(frame: FrameLocator, index: number, replyText: string): Promise<void> {
  const replyLink = frame.getByText("Reply", { exact: true }).nth(index);
  await replyLink.waitFor({ state: "visible", timeout: 8000 });
  await replyLink.click();
  await SLEEP(2000);

  const textarea = frame.locator("textarea").last();
  await textarea.waitFor({ state: "visible", timeout: 8000 });
  await textarea.fill(replyText);
  await SLEEP(800);

  // The submit button is also labeled "Reply" — find it via the Cancel
  // button's shared container, then click the sibling Reply button.
  const cancelBtn = frame.getByText("Cancel", { exact: true }).first();
  await cancelBtn.waitFor({ state: "visible", timeout: 5000 });

  await cancelBtn.evaluate((cancelEl) => {
    let container = cancelEl.parentElement;
    for (let i = 0; i < 8 && container; i++) {
      const submitReply = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Reply" && b !== cancelEl,
      );
      if (submitReply) {
        (submitReply as HTMLButtonElement).click();
        return;
      }
      container = container.parentElement;
    }
    throw new Error("Could not find submit Reply button next to Cancel");
  });
  await SLEEP(3000);
}

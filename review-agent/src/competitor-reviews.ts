// Real competitor review scrape — a competitor's Google reviews are
// publicly visible to any visitor, no owner login required. Uses the
// tenant's own stored cookies purely to avoid the "unusual traffic"
// CAPTCHA a logged-out datacenter IP gets (same reasoning as the
// local-pack and organic scanners), not because access requires it.
//
// Confirmed by direct exploration against a real competitor: the
// rating-histogram summary (always exactly 5 bars, one per star
// value) shares the same `[aria-label*="stars"]` marker as individual
// review cards and renders Google's stock "Reviews are automatically
// processed..." disclaimer text nearby — filtered out explicitly
// below rather than relied on position, since the exact bar count
// isn't guaranteed stable.

import { chromium, type Cookie } from "playwright";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ScrapedReview = {
  stars: number;
  text: string;
};

export type CompetitorReviewScan = {
  rating: number | null;
  reviewCount: number | null;
  reviews: ScrapedReview[];
};

// Google's rating-histogram disclaimer text is split across several
// separate DOM text nodes ("Reviews are automatically processed to
// detect inappropriate content like fake reviews and spam. We may
// take down reviews that are flagged in order to comply with ...or
// legal obligations.") — checking only the first fragment let a later
// fragment ("...or legal obligations.") slip through as if it were
// real review text (confirmed by direct testing). Every known
// fragment is listed so the whole container is skipped if any of them
// appears anywhere in it, not just the first.
const DISCLAIMER_MARKERS = [
  "Reviews are automatically processed",
  "inappropriate content",
  "fake reviews and spam",
  "legal obligations",
];
const MAX_REVIEWS = 25;

function parseRatingSummary(text: string): { rating: number | null; reviewCount: number | null } {
  // Real text shape confirmed by exploration: "4.5\n389 reviews" (or
  // "(389)") somewhere near the top of the business panel/page.
  const m = text.match(/(\d\.\d)\D{0,20}?([\d,]+)\s*reviews?/i);
  if (!m) return { rating: null, reviewCount: null };
  return { rating: parseFloat(m[1]), reviewCount: parseInt(m[2].replace(/,/g, ""), 10) };
}

export async function scanCompetitorReviews(
  cookies: Cookie[],
  competitorName: string,
): Promise<CompetitorReviewScan> {
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
  page.setDefaultTimeout(20000);

  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(competitorName)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await SLEEP(4000);

    const firstResult = page.locator('a[href*="/maps/place/"]').first();
    if ((await firstResult.count()) > 0) {
      await firstResult.click();
      await SLEEP(3000);
    }

    const overviewText = await page.locator("body").innerText({ timeout: 10000 });
    const { rating, reviewCount } = parseRatingSummary(overviewText);

    const reviewsTab = page.getByRole("tab", { name: /Reviews/i }).first();
    if ((await reviewsTab.count()) > 0) {
      await reviewsTab.click().catch(() => {});
    } else {
      await page
        .getByText("Reviews", { exact: true })
        .first()
        .click()
        .catch(() => {});
    }
    await SLEEP(3000);

    // Scroll the reviews panel to load more, same stability-check
    // pattern as loadAllUnrepliedReviews in browser.ts.
    let stableRounds = 0;
    let lastCount = 0;
    for (let round = 0; round < 12 && stableRounds < 2; round++) {
      await page.mouse.wheel(0, 2000);
      await SLEEP(1000);
      const count = await page.locator('[aria-label*="stars"]').count();
      stableRounds = count === lastCount ? stableRounds + 1 : 0;
      lastCount = count;
    }

    const reviews = await page.evaluate((disclaimerMarkers: string[]) => {
      const out: { stars: number; text: string }[] = [];
      const starEls = document.querySelectorAll('[aria-label*="stars"]');
      starEls.forEach((starEl) => {
        const label = starEl.getAttribute("aria-label") || "";
        const m = label.match(/(\d)\s*stars?/i);
        if (!m) return;

        let container: HTMLElement | null = starEl.parentElement;
        for (let depth = 0; depth < 10 && container; depth++) {
          const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          const texts: string[] = [];
          while ((node = walker.nextNode())) {
            const t = (node.textContent || "").trim();
            if (t.length > 20) texts.push(t);
          }
          const isDisclaimerContainer = texts.some((t) =>
            disclaimerMarkers.some((marker) => t.includes(marker)),
          );
          if (isDisclaimerContainer) {
            container = container.parentElement;
            continue;
          }
          if (texts.length > 0) {
            out.push({ stars: parseInt(m[1], 10), text: texts[0].slice(0, 600) });
            break;
          }
          container = container.parentElement;
        }
      });
      return out;
    }, DISCLAIMER_MARKERS);

    // Dedupe (the scroll-to-load loop can re-capture the same review
    // card across rounds) and cap the sample.
    const seen = new Set<string>();
    const deduped: ScrapedReview[] = [];
    for (const r of reviews) {
      const key = `${r.stars}:${r.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
      if (deduped.length >= MAX_REVIEWS) break;
    }

    return { rating, reviewCount, reviews: deduped };
  } finally {
    await browser.close();
  }
}

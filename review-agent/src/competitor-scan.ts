// Real local-search competitor scan via Google Maps — reuses the
// same stored Google session cookies as the review-reply agent and
// GBP Insights. Two other approaches were tried and real-world
// tested against Thrasher's before landing here:
//  1. Logged-in google.com/search: for a query closely matching the
//     owner's own business, Google sometimes serves the personalized
//     "manage your business" panel instead of a neutral results page
//     — confirmed non-deterministic, the exact same query rendered
//     differently across two consecutive runs.
//  2. Logged-out (no cookies) google.com/search: immediately blocked
//     with Google's "unusual traffic" CAPTCHA page — a datacenter IP
//     with no session history gets none of the trust an aged, real
//     cookie jar provides.
// google.com/maps/search/<query> with the owner's cookies avoided
// both problems in testing and returns a longer, richer real ranked
// list (8 real competitors observed for one query, not just 3), each
// with real name/rating/review count/category/address.

import { chromium, type Cookie } from "playwright";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type LocalPackEntry = {
  position: number;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  address: string | null;
  isOwn: boolean;
};

const RATING_LINE_RE = /^(\d\.\d)\(([\d,]+)\)/;
const MAX_ENTRIES = 10;

function normalizeName(name: string): string {
  return name
    .replace(/\s*·\s*Visited link\s*$/i, "")
    .trim()
    .toLowerCase();
}

function parseMapsResults(text: string, ownBusinessName: string | null): LocalPackEntry[] {
  // No reliable start anchor — a literal "Results" header line isn't
  // always rendered (confirmed: the exact same query sometimes goes
  // straight into the list with no header at all), so this scans the
  // whole text and relies on the rating-line pattern itself, which is
  // specific enough not to false-positive elsewhere on the page.
  let end = text.indexOf("Update results when map moves");
  if (end === -1) end = text.indexOf("Collapse side panel");
  if (end === -1) end = text.length;

  const lines = text
    .slice(0, end)
    .split("\n")
    .map((l) => l.trim());

  const entries: LocalPackEntry[] = [];
  const ownNormalized = ownBusinessName ? normalizeName(ownBusinessName) : null;

  for (let i = 0; i < lines.length && entries.length < MAX_ENTRIES; i++) {
    const ratingMatch = lines[i].match(RATING_LINE_RE);
    if (!ratingMatch) continue;

    let nameIdx = i - 1;
    while (nameIdx >= 0 && !lines[nameIdx]) nameIdx--;
    const name = nameIdx >= 0 ? lines[nameIdx].replace(/\s*·\s*Visited link\s*$/i, "") : "Unknown";

    let metaIdx = i + 1;
    while (metaIdx < lines.length && !lines[metaIdx]) metaIdx++;
    const metaParts = (lines[metaIdx] ?? "")
      .split("·")
      .map((p) => p.trim())
      .filter(Boolean);
    const category = metaParts[0] ?? null;
    const address = metaParts.length > 1 ? metaParts[metaParts.length - 1] : null;

    entries.push({
      position: entries.length + 1,
      name,
      rating: parseFloat(ratingMatch[1]),
      reviewCount: parseInt(ratingMatch[2].replace(/,/g, ""), 10),
      category,
      address,
      isOwn: !!ownNormalized && normalizeName(name) === ownNormalized,
    });
  }

  return entries;
}

export async function scanLocalPack(
  cookies: Cookie[],
  query: string,
  ownBusinessName: string | null,
): Promise<LocalPackEntry[]> {
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
  page.setDefaultTimeout(15000);

  try {
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await SLEEP(4000);
    const text = await page.locator("body").innerText({ timeout: 10000 });
    return parseMapsResults(text, ownBusinessName);
  } finally {
    await browser.close();
  }
}

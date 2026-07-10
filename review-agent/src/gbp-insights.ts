// Real Google Business Profile Insights scrape — reuses the exact
// same stored Google session cookies as the review-reply agent
// (browser.ts), since business.google.com redirects into the same
// iframe[src*=businessProfileId] panel used for reviews, just a
// different in-panel tab ("Performance" instead of "Read reviews").
// Confirmed by direct exploration against Thrasher's real profile:
// every metric tab renders the same fixed tab strip followed by a
// total, a label, and a tab-delimited "Month\tInteractions" table —
// reliable enough to parse with anchored regex. Any section that
// doesn't match the expected shape (Google changed something) comes
// back null rather than a fabricated/zeroed value.

import { chromium, type FrameLocator } from "playwright";
import type { GoogleCookie } from "./browser.js";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type MonthlyPoint = { month: string; value: number };
export type MetricSeries = { total: number; label: string; series: MonthlyPoint[] };
export type PlatformBreakdownItem = { label: string; count: number; pct: number };
export type SearchTermItem = { term: string; count: number };

export type GbpInsightsResult = {
  timePeriod: string | null;
  interactions: MetricSeries | null;
  profileViews: { total: number; byPlatform: PlatformBreakdownItem[] } | null;
  searchImpressions: { total: number; topSearchTerms: SearchTermItem[] } | null;
  calls: MetricSeries | null;
  bookings: MetricSeries | null;
  directions: MetricSeries | null;
  websiteClicks: MetricSeries | null;
};

function parseNumber(raw: string): number {
  return parseInt(raw.replace(/,/g, ""), 10);
}

function extractTimePeriod(text: string): string | null {
  const m = text.match(/Time period\n([^\n]+)\n/);
  return m ? m[1].trim() : null;
}

// Every tab renders the same fixed strip ending in "Website clicks"
// right before that tab's own total + label — a reliable anchor
// regardless of which tab is actually active.
function parseMetricSeries(text: string): MetricSeries | null {
  const headerMatch = text.match(/Website clicks\n([\d,]+)\n([^\n]+)\n/);
  if (!headerMatch) return null;
  const total = parseNumber(headerMatch[1]);
  const label = headerMatch[2].trim();

  const rowsMatch = text.match(/Month\tInteractions\n((?:[A-Za-z]+ \d{4}\t\d+\n?)+)/);
  const series: MonthlyPoint[] = [];
  if (rowsMatch) {
    for (const line of rowsMatch[1].trim().split("\n")) {
      const [month, value] = line.split("\t");
      if (month && value) series.push({ month: month.trim(), value: parseNumber(value) });
    }
  }

  return { total, label, series };
}

// Scans a bounded slice of the page for repeating items rather than
// requiring exact line adjacency after the section header — Google
// inserts a variable number of blank/description lines (promotional
// content, wrapped descriptions) between a section's heading and its
// actual data rows, so an adjacency-anchored regex is fragile.
function sliceSection(text: string, startMarker: string, endMarker?: string): string | null {
  const start = text.indexOf(startMarker);
  if (start === -1) return null;
  const end = endMarker ? text.indexOf(endMarker, start) : -1;
  return text.slice(start, end === -1 ? start + 3000 : end);
}

function parseProfileViews(text: string): { total: number; byPlatform: PlatformBreakdownItem[] } | null {
  const totalMatch = text.match(
    /How people discovered you\n([\d,]+)\nPeople viewed your Business Profile/,
  );
  if (!totalMatch) return null;

  const section = sliceSection(
    text,
    "Platform and device breakdown",
    "Searches showed your Business Profile",
  );
  const byPlatform: PlatformBreakdownItem[] = [];
  if (section) {
    const itemRe = /([\d,]+)·(\d+)%\n([^\n]+)/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRe.exec(section)) !== null) {
      byPlatform.push({
        count: parseNumber(itemMatch[1]),
        pct: parseInt(itemMatch[2], 10),
        label: itemMatch[3].trim(),
      });
    }
  }
  return { total: parseNumber(totalMatch[1]), byPlatform };
}

function parseSearchImpressions(
  text: string,
): { total: number; topSearchTerms: SearchTermItem[] } | null {
  const totalMatch = text.match(
    /([\d,]+)\nSearches showed your Business Profile in the search results/,
  );
  if (!totalMatch) return null;

  const section = sliceSection(text, "Searches breakdown");
  const topSearchTerms: SearchTermItem[] = [];
  if (section) {
    const itemRe = /\d+\.\n([^\n]+)\n([\d,]+)/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRe.exec(section)) !== null) {
      topSearchTerms.push({ term: itemMatch[1].trim(), count: parseNumber(itemMatch[2]) });
    }
  }
  return { total: parseNumber(totalMatch[1]), topSearchTerms };
}

const ACTION_TABS = [
  ["Calls", "calls"],
  ["Bookings", "bookings"],
  ["Directions", "directions"],
  ["Website clicks", "websiteClicks"],
] as const;

export async function scanGbpInsights(
  cookies: GoogleCookie[],
  businessProfileId: string,
): Promise<GbpInsightsResult> {
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
    await page.goto("https://business.google.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await SLEEP(3000);
    await page.getByText("Performance", { exact: true }).first().click();
    await SLEEP(4000);

    const frame = () => page.frameLocator(`iframe[src*="${businessProfileId}"]`).first() as FrameLocator;

    const overviewText = await frame().locator("body").innerText({ timeout: 10000 });

    const result: GbpInsightsResult = {
      timePeriod: extractTimePeriod(overviewText),
      interactions: parseMetricSeries(overviewText),
      profileViews: parseProfileViews(overviewText),
      searchImpressions: parseSearchImpressions(overviewText),
      calls: null,
      bookings: null,
      directions: null,
      websiteClicks: null,
    };

    for (const [tabLabel, key] of ACTION_TABS) {
      try {
        await frame().getByText(tabLabel, { exact: true }).first().click({ timeout: 8000 });
        await SLEEP(2500);
        const text = await frame().locator("body").innerText({ timeout: 8000 });
        result[key] = parseMetricSeries(text);
      } catch {
        // Leave this metric null — one tab's click/parse failing
        // shouldn't discard the metrics already gathered.
        result[key] = null;
      }
    }

    return result;
  } finally {
    await browser.close();
  }
}

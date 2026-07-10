// Real backlink snapshot via Google Search Console's own "Links"
// report — not exposed by the official Search Console API (the
// classic webmasters v3 API covers search analytics only), but
// reachable as a real page in the Search Console web UI, scraped
// with the same stored Google session cookies as the review-reply
// agent, GBP Insights, and competitor tracking. Confirmed by direct
// exploration against Thrasher's real property: 72 real external
// links, real top linking domains (reddit.com, sirved.com, ...), real
// top linked pages and anchor text, plus an internal-links breakdown.
// No domain authority or spam score here — that genuinely needs a
// paid tool (Ahrefs/Semrush/Moz) with its own crawl index; this is
// only what Google's own index reports about the tenant's real site.

import { chromium, type Cookie } from "playwright";

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type LinkCountItem = { label: string; count: number };

export type BacklinksReport = {
  externalLinksTotal: number | null;
  topLinkedPages: LinkCountItem[];
  topLinkingSites: LinkCountItem[];
  topLinkingText: string[];
  internalLinksTotal: number | null;
  topInternalLinkedPages: LinkCountItem[];
};

function extractTotal(section: string, label: string): number | null {
  const m = section.match(new RegExp(`${label}\\nTotal ([\\d,]+)`));
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

// Google's icon font (Material Symbols) renders each icon as a
// single ligature character in the Unicode Private Use Area
// (U+E000–U+F8FF) — confirmed by direct byte-level inspection: a lone
// PUA character appears as its own line right after each section
// header (an expand/collapse icon), which broke a naive "stop at the
// first non-matching line" parse since it isn't blank but also isn't
// real data. Skip these rather than treating them as list content or
// a list boundary.
const PUA_START = 0xe000;
const PUA_END = 0xf8ff;

function isIconGlyphLine(s: string): boolean {
  if (s.length === 0) return false;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < PUA_START || code > PUA_END) return false;
  }
  return true;
}

function extractCountedList(section: string, sectionHeader: string): LinkCountItem[] {
  const start = section.indexOf(sectionHeader);
  if (start === -1) return [];
  const afterHeader = section.slice(start + sectionHeader.length);
  const items: LinkCountItem[] = [];
  for (const line of afterHeader.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || isIconGlyphLine(trimmed)) continue;
    if (trimmed === "MORE") break;
    const m = trimmed.match(/^(.*)\t(\d[\d,]*)$/);
    if (!m) break;
    items.push({ label: m[1].trim(), count: parseInt(m[2].replace(/,/g, ""), 10) });
  }
  return items;
}

function extractTextList(section: string, sectionHeader: string): string[] {
  const start = section.indexOf(sectionHeader);
  if (start === -1) return [];
  const afterHeader = section.slice(start + sectionHeader.length);
  const items: string[] = [];
  for (const line of afterHeader.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || isIconGlyphLine(trimmed)) continue;
    if (trimmed === "MORE" || trimmed === "Internal links" || trimmed === "External links") break;
    items.push(trimmed);
  }
  return items;
}

function parseBacklinksReport(text: string): BacklinksReport {
  const internalIdx = text.indexOf("Internal links");
  const externalSection = internalIdx === -1 ? text : text.slice(0, internalIdx);
  const internalSection = internalIdx === -1 ? "" : text.slice(internalIdx);

  return {
    externalLinksTotal: extractTotal(externalSection, "External links"),
    topLinkedPages: extractCountedList(externalSection, "Top linked pages"),
    topLinkingSites: extractCountedList(externalSection, "Top linking sites"),
    topLinkingText: extractTextList(externalSection, "Top linking text"),
    internalLinksTotal: extractTotal(internalSection, "Internal links"),
    topInternalLinkedPages: extractCountedList(internalSection, "Top linked pages"),
  };
}

export async function scanBacklinks(cookies: Cookie[], siteUrl: string): Promise<BacklinksReport> {
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
    const resourceId = encodeURIComponent(siteUrl);
    await page.goto(`https://search.google.com/search-console/links?resource_id=${resourceId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // The counted lists (top linking sites/pages) render asynchronously
    // a moment after the section headers do — confirmed by real
    // testing: the exact same fixed 4s wait sometimes captured full
    // tab-separated counts and sometimes just the bare labels. Poll
    // for a real count row (a tab character is the reliable signal
    // this data has actually loaded) instead of guessing a duration.
    let text = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      await SLEEP(1000);
      text = await page.locator("body").innerText({ timeout: 10000 });
      if (/\t\d/.test(text)) break;
    }

    return parseBacklinksReport(text);
  } finally {
    await browser.close();
  }
}

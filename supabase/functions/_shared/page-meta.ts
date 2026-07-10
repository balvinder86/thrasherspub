// Shared real-page HTML parsing — used by seo-ai-suggestions (drafting)
// and schema-check (coverage auditing). Both need the same real
// title/description/JSON-LD extraction from a tenant's live page.

export type PageMeta = {
  title: string | null;
  description: string | null;
  schemaTypes: string[];
  bodyTextSample: string;
};

export function extractPageMeta(html: string): PageMeta {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);

  const schemaTypes: string[] = [];
  for (const m of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const t = item?.["@type"];
        if (t) schemaTypes.push(Array.isArray(t) ? t.join(",") : String(t));
      }
    } catch {
      // Invalid/unparseable JSON-LD on the page — not our concern here,
      // just doesn't count as a detected schema type.
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;
  const bodyText = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: titleMatch?.[1]?.trim() ?? null,
    description: descMatch?.[1]?.trim() ?? null,
    schemaTypes: [...new Set(schemaTypes)],
    bodyTextSample: bodyText.slice(0, 2500),
  };
}

export async function fetchPageMeta(url: string): Promise<PageMeta> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ThrashersPubSEOBot/1.0)" },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch the page (HTTP ${res.status})`);
  }
  return extractPageMeta(await res.text());
}

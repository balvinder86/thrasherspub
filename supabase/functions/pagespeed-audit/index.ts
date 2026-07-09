// Real technical SEO audit for one page, via Google's free PageSpeed
// Insights API — actual Lighthouse scores (performance, SEO,
// accessibility, best practices) and Core Web Vitals for a real URL.
// No OAuth: PageSpeed Insights just needs an API key. On-demand only
// (one URL per click) since each real audit takes 30-60+ seconds —
// not something to run automatically across every page.
//
//   { url }
//
// Only requires a valid session (not restaurant-scoped — a URL isn't
// tenant data), just enough to stop this being an open proxy against
// the API key's quota.

const PAGESPEED_API_KEY = Deno.env.get("PAGESPEED_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ ok: false, error: "missing Authorization header" }, 401);
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ ok: false, error: "url is required" }, 400);
    }

    const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    psiUrl.searchParams.set("url", url);
    psiUrl.searchParams.set("key", PAGESPEED_API_KEY);
    psiUrl.searchParams.set("strategy", "mobile");
    for (const category of ["performance", "seo", "accessibility", "best-practices"]) {
      psiUrl.searchParams.append("category", category);
    }

    const res = await fetch(psiUrl.toString());
    const body = await res.json();
    if (!res.ok) {
      const message = body?.error?.message ?? `PageSpeed API error ${res.status}`;
      return json({ ok: false, error: message }, 502);
    }

    const categories = body.lighthouseResult?.categories ?? {};
    const audits = body.lighthouseResult?.audits ?? {};

    return json(
      {
        ok: true,
        url: body.lighthouseResult?.finalUrl ?? url,
        scores: {
          performance:
            categories.performance?.score != null
              ? Math.round(categories.performance.score * 100)
              : null,
          seo: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
          accessibility:
            categories.accessibility?.score != null
              ? Math.round(categories.accessibility.score * 100)
              : null,
          bestPractices:
            categories["best-practices"]?.score != null
              ? Math.round(categories["best-practices"].score * 100)
              : null,
        },
        coreWebVitals: {
          lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
          cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
          inp: audits["interaction-to-next-paint"]?.displayValue ?? null,
        },
      },
      200,
    );
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

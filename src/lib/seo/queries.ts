import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";
import { useRestaurantIds } from "@/lib/supabase/scope";

function useCurrentRestaurantId(): string | undefined {
  return useRestaurantIds()[0];
}

export type SearchConsoleConnection = {
  siteUrl: string;
  connectedEmail: string;
  connectedAt: string;
  lastSyncedAt: string | null;
};

// null means "not connected yet" — same pattern as
// useReviewAgentConnection in src/lib/reviews/queries.ts.
export function useSearchConsoleConnection() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["search-console-connection", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<SearchConsoleConnection | null> => {
      const { data, error } = await supabase
        .from("search_console_credentials")
        .select("site_url, connected_email, connected_at, last_synced_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        siteUrl: data.site_url,
        connectedEmail: data.connected_email,
        connectedAt: data.connected_at,
        lastSyncedAt: data.last_synced_at,
      };
    },
  });
}

// Calls search-console-oauth-start to get a real Google consent URL,
// then does a full browser redirect — this leaves the app entirely
// (same as any real "Connect with Google" button), so there's nothing
// to return on success; the callback Edge Function handles the rest
// and redirects back to /seo once done.
export function useConnectSearchConsole() {
  const restaurantId = useCurrentRestaurantId();
  return useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { data, error } = await supabase.functions.invoke("search-console-oauth-start", {
        body: { restaurant_id: restaurantId },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ??
            error?.message ??
            "could not start connection",
        );
      }
      const { authUrl } = data as { authUrl: string };
      window.location.href = authUrl;
    },
  });
}

export type OverviewRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type KeywordRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type PageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function callSearchConsoleData<T>(
  restaurantId: string,
  view: "overview" | "keywords" | "pages" | "content-gaps",
): Promise<{ connected: boolean; rows: T[] }> {
  const { data, error } = await supabase.functions.invoke("search-console-data", {
    body: { restaurant_id: restaurantId, view },
  });
  if (error || !(data as { ok?: boolean } | null)?.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        error?.message ??
        "could not load Search Console data",
    );
  }
  const body = data as { connected: boolean; rows?: T[] };
  return { connected: body.connected, rows: body.rows ?? [] };
}

export function useSearchConsoleOverview(enabled: boolean) {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["search-console-overview", restaurantId],
    enabled: enabled && !!restaurantId,
    queryFn: () => callSearchConsoleData<OverviewRow>(restaurantId!, "overview"),
  });
}

export function useSearchConsoleKeywords(enabled: boolean) {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["search-console-keywords", restaurantId],
    enabled: enabled && !!restaurantId,
    queryFn: () => callSearchConsoleData<KeywordRow>(restaurantId!, "keywords"),
  });
}

export function useSearchConsolePages(enabled: boolean) {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["search-console-pages", restaurantId],
    enabled: enabled && !!restaurantId,
    queryFn: () => callSearchConsoleData<PageRow>(restaurantId!, "pages"),
  });
}

export type ContentGapRow = {
  query: string;
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  currentBestPage: string;
};

// Real queries with genuine impressions but a poor average position
// (past page 1) and no dedicated page — computed server-side purely
// from real Search Console numbers (query+page dimensions), no AI
// judgment involved in *finding* the gap, only in drafting a fix.
export function useSearchConsoleContentGaps(enabled: boolean) {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["search-console-content-gaps", restaurantId],
    enabled: enabled && !!restaurantId,
    queryFn: () => callSearchConsoleData<ContentGapRow>(restaurantId!, "content-gaps"),
  });
}

export type PageSpeedResult = {
  url: string;
  scores: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  };
  coreWebVitals: {
    lcp: string | null;
    cls: string | null;
    inp: string | null;
  };
};

// On-demand only — a real audit takes 30-60+ seconds per URL, not
// something to run automatically across every page in the list.
export function usePageSpeedAudit() {
  return useMutation({
    mutationFn: async (url: string): Promise<PageSpeedResult> => {
      const { data, error } = await supabase.functions.invoke("pagespeed-audit", {
        body: { url },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? error?.message ?? "audit failed",
        );
      }
      return data as PageSpeedResult;
    },
  });
}

// After a real OAuth redirect back from /search-console-oauth-callback
// (?searchConsole=connected|error), refetch the connection status once
// so the UI reflects it without a manual page reload.
export function useRefetchSearchConsoleConnection() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["search-console-connection", restaurantId] });
  };
}

export type SeoSuggestions = {
  current: { title: string | null; description: string | null; schemaTypes: string[] };
  suggestions: {
    suggestedTitle: string;
    suggestedDescription: string;
    titleReasoning: string;
    descriptionReasoning: string;
    missingSchemaTypes: string[];
    suggestedSchemaJsonLd: string | null;
  };
};

// Real Claude-drafted title/description/schema suggestions for one
// real page — fetches the page's actual live HTML server-side, so
// this genuinely reflects what's really on the site right now. On
// demand only (~15s per call, real API cost), never automatic.
export function useGenerateSeoSuggestions() {
  const restaurantId = useCurrentRestaurantId();
  return useMutation({
    mutationFn: async (input: {
      url: string;
      clicks?: number;
      impressions?: number;
      position?: number;
    }): Promise<SeoSuggestions> => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { data, error } = await supabase.functions.invoke("seo-ai-suggestions", {
        body: { restaurant_id: restaurantId, ...input },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ??
            error?.message ??
            "could not generate suggestions",
        );
      }
      return data as SeoSuggestions;
    },
  });
}

export type SchemaCheckPage = {
  url: string;
  schemaTypes: string[];
  error: string | null;
};

export type SchemaCheckResult = {
  pages: SchemaCheckPage[];
  summary: {
    typesFoundSitewide: string[];
    recommendedTypesMissingSitewide: string[];
    pagesScanned: number;
    pagesWithNoSchema: number;
  };
};

// Real, non-AI structured-data coverage scan — fetches each real
// page's actual live HTML and reports the JSON-LD @type values
// genuinely found. Fast/free, so it can cover several pages per call;
// drafting a fix for a gap is the AI Agent tab's job, not this one's.
export function useSchemaCheck() {
  const restaurantId = useCurrentRestaurantId();
  return useMutation({
    mutationFn: async (urls: string[]): Promise<SchemaCheckResult> => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { data, error } = await supabase.functions.invoke("schema-check", {
        body: { restaurant_id: restaurantId, urls },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ?? error?.message ?? "scan failed",
        );
      }
      return data as SchemaCheckResult;
    },
  });
}

export type ContentBrief = {
  suggestedUrlSlug: string;
  suggestedTitle: string;
  suggestedH1: string;
  outline: string[];
  reasoning: string;
};

// Real Claude-drafted content brief for one real keyword gap —
// grounded in the actual HTML of whichever real page currently ranks
// best for that query, so it doesn't suggest duplicating it. On
// demand only (~15s per call, real API cost), never automatic.
export function useGenerateContentBrief() {
  const restaurantId = useCurrentRestaurantId();
  return useMutation({
    mutationFn: async (input: {
      keyword: string;
      clicks?: number;
      impressions?: number;
      position?: number;
      currentBestPage?: string;
    }): Promise<ContentBrief> => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { data, error } = await supabase.functions.invoke("content-brief", {
        body: { restaurant_id: restaurantId, ...input },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ??
            error?.message ??
            "could not generate content brief",
        );
      }
      return (data as { brief: ContentBrief }).brief;
    },
  });
}

export type MonthlyPoint = { month: string; value: number };
export type MetricSeries = { total: number; label: string; series: MonthlyPoint[] };
export type PlatformBreakdownItem = { label: string; count: number; pct: number };
export type SearchTermItem = { term: string; count: number };

export type GbpInsights = {
  timePeriod: string | null;
  interactions: MetricSeries | null;
  profileViews: { total: number; byPlatform: PlatformBreakdownItem[] } | null;
  searchImpressions: { total: number; topSearchTerms: SearchTermItem[] } | null;
  calls: MetricSeries | null;
  bookings: MetricSeries | null;
  directions: MetricSeries | null;
  websiteClicks: MetricSeries | null;
};

// Real Google Business Profile Insights — reuses the same review-agent
// Google session cookies already connected on the Reviews page (no
// separate connect flow). A real Playwright scrape of Google's own
// Performance panel (~15-25s), so this is on-demand only via the
// existing review-agent Edge Function/Railway service, same shared
// infra as the review-reply agent.
export function useGenerateGbpInsights() {
  const restaurantId = useCurrentRestaurantId();
  return useMutation({
    mutationFn: async (): Promise<GbpInsights> => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { data, error } = await supabase.functions.invoke("review-agent", {
        body: { action: "gbp_insights", restaurant_id: restaurantId },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error ??
            error?.message ??
            "could not load Business Profile insights",
        );
      }
      return data as GbpInsights;
    },
  });
}

export type CitationProfile = {
  businessName: string;
  address: string | null;
  phone: string | null;
  website: string | null;
};

// The canonical NAP (name/address/phone) tenants compare each real
// directory listing against. Reuses review_agent_settings — same
// "real business info, not provider-specific" data the review-reply
// prompt already draws from. Null means no row yet (review agent
// never set up for this restaurant), not "fields are empty."
export function useCitationProfile() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["citation-profile", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<CitationProfile | null> => {
      const { data, error } = await supabase
        .from("review_agent_settings")
        .select("business_name, address, phone, website")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        businessName: data.business_name,
        address: data.address,
        phone: data.phone,
        website: data.website,
      };
    },
  });
}

export function useUpdateCitationProfile() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { address: string; phone: string; website: string }) => {
      const { error } = await supabase
        .from("review_agent_settings")
        .update({ address: input.address, phone: input.phone, website: input.website });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citation-profile", restaurantId] });
    },
  });
}

export type CitationDirectory =
  | "google"
  | "yelp"
  | "apple_maps"
  | "bing"
  | "tripadvisor"
  | "facebook";

export type CitationCheckStatus = "not_checked" | "matches" | "needs_fixing";

export type CitationCheck = {
  directory: CitationDirectory;
  status: CitationCheckStatus;
  note: string | null;
  checkedAt: string | null;
};

// Real, zero-automation citation checklist — no free API checks
// name/address/phone consistency across directories, so this just
// persists what the owner found after manually opening each real
// directory search themselves (see the "Search on X" links in the
// Citations tab).
export function useCitationChecks() {
  const restaurantId = useCurrentRestaurantId();
  return useQuery({
    queryKey: ["citation-checks", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<CitationCheck[]> => {
      const { data, error } = await supabase
        .from("citation_checks")
        .select("directory, status, note, checked_at");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        directory: r.directory as CitationDirectory,
        status: r.status as CitationCheckStatus,
        note: r.note,
        checkedAt: r.checked_at,
      }));
    },
  });
}

export function useSetCitationCheck() {
  const restaurantId = useCurrentRestaurantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      directory: CitationDirectory;
      status: CitationCheckStatus;
      note: string | null;
    }) => {
      if (!restaurantId) throw new Error("no current restaurant");
      const { error } = await supabase.from("citation_checks").upsert(
        {
          restaurant_id: restaurantId,
          directory: input.directory,
          status: input.status,
          note: input.note,
          checked_at: input.status === "not_checked" ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,directory" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citation-checks", restaurantId] });
    },
  });
}

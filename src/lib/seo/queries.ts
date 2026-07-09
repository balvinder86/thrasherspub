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
  view: "overview" | "keywords" | "pages",
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

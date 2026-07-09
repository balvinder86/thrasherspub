import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useReviews,
  useReviewAgentConnection,
  usePreviewReviews,
  useApproveAndPost,
  useDismissReview,
  type Review,
  type ReviewStatus,
} from "@/lib/reviews/queries";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Inbox,
  Link2,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Wand2,
  XCircle,
} from "lucide-react";

import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Real Google reviews with an AI reply agent — every reply is human-approved before it posts.",
      },
    ],
  }),
  component: ReviewsPage,
});

const MIN_SAMPLE_FOR_RATING = 5;
const MIN_SAMPLE_FOR_RESPONSE_TIME = 3;

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

function StatusChip({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; cls: string }> = {
    drafted: { label: "Needs reply", cls: "bg-primary/10 text-primary border-primary/20" },
    approved_pending_post: {
      label: "Posting…",
      cls: "bg-accent text-accent-foreground border-border",
    },
    posted: { label: "Posted", cls: "bg-success/10 text-success border-success/20" },
    post_failed: {
      label: "Failed to post",
      cls: "bg-destructive/10 text-destructive border-destructive/20",
    },
    dismissed: { label: "Dismissed", cls: "bg-muted text-muted-foreground border-border" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-soft">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// A guardrail row that isn't wired to anything real yet — kept visible
// (per the original design) so the roadmap stays obvious, but shown
// firmly off/disabled rather than pretending it does something.
function PlannedToggleRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-background/60 p-3">
      <Switch checked={false} disabled />
      <div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground/80">{description}</div>
      </div>
    </div>
  );
}

function EmptyInsightCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-2xl border-dashed border-border bg-card/50 p-6">
      <h3 className="font-display text-lg text-muted-foreground">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground/80">{description}</p>
    </Card>
  );
}

function ReviewsPage() {
  const { data: reviews = [], isLoading, error } = useReviews();
  const { data: connection } = useReviewAgentConnection();
  const preview = usePreviewReviews();
  const approveAndPost = useApproveAndPost();
  const dismiss = useDismissReview();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<"all" | "low" | "mid" | "high">("all");
  const [search, setSearch] = useState("");
  const [replyDraft, setReplyDraft] = useState("");

  const active = reviews.find((r) => r.id === activeId) ?? null;

  const openReview = (r: Review) => {
    setActiveId(r.id);
    setReplyDraft(r.editedReply ?? r.aiDraftReply ?? "");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (r.status === "dismissed") return false;
      if (ratingFilter === "low" && r.starRating > 2) return false;
      if (ratingFilter === "mid" && r.starRating !== 3) return false;
      if (ratingFilter === "high" && r.starRating < 4) return false;
      if (q) {
        const haystack = `${r.reviewerName} ${r.reviewText ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reviews, ratingFilter, search]);

  const kpis = useMemo(() => {
    const needsReply = reviews.filter(
      (r) => r.status === "drafted" || r.status === "approved_pending_post",
    ).length;
    const posted = reviews.filter((r) => r.status === "posted");

    const avgRating =
      reviews.length >= MIN_SAMPLE_FOR_RATING
        ? reviews.reduce((s, r) => s + r.starRating, 0) / reviews.length
        : null;

    const responseTimes = posted
      .filter((r) => r.postedAt)
      .map((r) => new Date(r.postedAt!).getTime() - new Date(r.reviewFoundAt).getTime());
    const avgResponseMs =
      responseTimes.length >= MIN_SAMPLE_FOR_RESPONSE_TIME
        ? responseTimes.reduce((s, ms) => s + ms, 0) / responseTimes.length
        : null;

    return { needsReply, postedCount: posted.length, avgRating, avgResponseMs };
  }, [reviews]);

  const formatResponseTime = (ms: number) => {
    const hours = ms / 3_600_000;
    if (hours < 1) return `${Math.round(ms / 60_000)} min`;
    if (hours < 48) return `${hours.toFixed(1)} hr`;
    return `${Math.round(hours / 24)} days`;
  };

  const handleApproveAndPost = () => {
    if (!active) return;
    approveAndPost.mutate(
      { reviewId: active.id, replyText: replyDraft },
      { onSuccess: () => setActiveId(null) },
    );
  };

  return (
    <>
      <Topbar eyebrow="Guest sentiment" title="Reviews" />
      <main className="space-y-8 px-6 py-8">
        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Needs reply"
            value={String(kpis.needsReply)}
            hint="AI has a draft ready for each"
          />
          <KpiCard
            label="AI replies posted"
            value={String(kpis.postedCount)}
            hint="All-time, this agent"
          />
          <KpiCard
            label="Avg rating (tracked)"
            value={kpis.avgRating != null ? kpis.avgRating.toFixed(1) : "—"}
            hint={
              kpis.avgRating != null
                ? "Across reviews this agent has seen — not Google's public rating"
                : "Not enough data yet"
            }
          />
          <KpiCard
            label="Avg response time"
            value={kpis.avgResponseMs != null ? formatResponseTime(kpis.avgResponseMs) : "—"}
            hint={
              kpis.avgResponseMs != null
                ? "From when the agent found it to when it posted"
                : "Not enough data yet"
            }
          />
        </section>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="bg-card">
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-3.5 w-3.5" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="h-3.5 w-3.5" /> AI Agent
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Insights
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <QrCode className="h-3.5 w-3.5" /> Get reviews
            </TabsTrigger>
            <TabsTrigger value="platforms" className="gap-2">
              <Link2 className="h-3.5 w-3.5" /> Platforms
            </TabsTrigger>
          </TabsList>

          {/* INBOX */}
          <TabsContent value="inbox" className="mt-6 space-y-4">
            <Card className="flex flex-wrap items-center gap-2 rounded-2xl border-border/70 bg-card p-3 shadow-soft">
              <span className="px-2 text-xs text-muted-foreground">Filter</span>
              {(
                [
                  ["all", "All reviews"],
                  ["low", "1–2 ★"],
                  ["mid", "3 ★"],
                  ["high", "4–5 ★"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={ratingFilter === key ? "default" : "ghost"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => setRatingFilter(key)}
                >
                  {label}
                </Button>
              ))}
              <Badge
                variant="secondary"
                className="rounded-full text-[10px] uppercase tracking-wider"
              >
                Source: Google
              </Badge>
              <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search guest or review text…"
                  className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-56"
                />
              </div>
            </Card>

            {isLoading && <p className="text-sm text-muted-foreground">Loading reviews…</p>}
            {error && (
              <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                Couldn't load reviews: {(error as Error).message}
              </Card>
            )}

            <div className="space-y-3">
              {filtered.map((r) => (
                <Card
                  key={r.id}
                  className="group cursor-pointer rounded-2xl border-border/70 bg-card p-5 shadow-soft transition hover:shadow-card"
                  onClick={() => openReview(r)}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-secondary text-xs font-medium">
                        {r.reviewerName
                          .split(" ")
                          .map((s) => s[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.reviewerName}</span>
                        <span className="text-xs text-muted-foreground">Google</span>
                        <Stars value={r.starRating} />
                        <span className="text-xs text-muted-foreground">
                          · {timeAgo(r.reviewFoundAt)}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <StatusChip status={r.status} />
                        </div>
                      </div>
                      {r.reviewText && (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                          {r.reviewText}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {r.aiDraftReply && r.status === "drafted" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-1 text-xs text-accent-foreground">
                            <Wand2 className="h-3 w-3" /> AI draft ready
                          </span>
                        )}
                        {r.status === "post_failed" && r.postError && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive"
                            title={r.postError}
                          >
                            <AlertTriangle className="h-3 w-3" /> {r.postError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {!isLoading && filtered.length === 0 && (
                <Card className="rounded-2xl border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
                  {reviews.length === 0
                    ? 'No reviews yet — click "Check now" on the AI Agent tab to look for real Google reviews.'
                    : "No reviews match this filter."}
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI AGENT */}
          <TabsContent value="ai" className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg">Reply agent</h3>
                  <p className="text-xs text-muted-foreground">
                    Every reply is drafted by AI and held for your approval — nothing posts to
                    Google automatically.
                  </p>
                </div>
              </div>

              <Separator className="my-5" />

              {connection ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Connected business
                      </div>
                      <div className="mt-1 text-sm">{connection.businessName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        Profile ID {connection.businessProfileId}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Session
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm">
                        {connection.cookiesValidAt ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Working
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> Not checked
                            yet
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {connection.lastSyncedAt
                          ? `Last checked ${timeAgo(connection.lastSyncedAt)}`
                          : "Never checked"}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-5" />

                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Brand voice
                    </div>
                    <p className="mt-2 text-sm text-foreground/90">
                      {connection.businessDescription ||
                        "No business description set — replies fall back to a generic tone."}
                    </p>
                    <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                      Reply contact: {connection.replyContactEmail || "—"}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tone is chosen automatically from the star rating (warm for 5★, empathetic for
                      1–2★). A manual tone override isn't built yet.
                    </p>
                  </div>

                  <Button
                    className="mt-5 gap-2"
                    onClick={() => preview.mutate()}
                    disabled={preview.isPending}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${preview.isPending ? "animate-spin" : ""}`}
                    />
                    {preview.isPending ? "Checking…" : "Check now"}
                  </Button>
                  {preview.isSuccess && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Found {preview.data.found} unreplied review
                      {preview.data.found === 1 ? "" : "s"} on Google, drafted{" "}
                      {preview.data.drafted} new one{preview.data.drafted === 1 ? "" : "s"}.
                    </p>
                  )}
                  {preview.isError && (
                    <p className="mt-2 text-xs text-destructive">
                      {(preview.error as Error).message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Google review agent connected for this restaurant yet. Connecting one requires
                  a one-time local setup step — ask your developer to run the session login script.
                </p>
              )}

              <Separator className="my-5" />

              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Guardrails
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                  <Switch checked disabled />
                  <div>
                    <div className="text-sm font-medium">Every reply requires your approval</div>
                    <div className="text-xs text-muted-foreground">
                      There is no auto-send mode. Every AI draft is held here until you approve it.
                    </div>
                  </div>
                </div>
                <PlannedToggleRow
                  label="Auto-send 5★ replies"
                  description="Not built yet — would let top-rated reviews post without a manual approval click."
                />
                <PlannedToggleRow
                  label="Offer recovery on negative reviews"
                  description="Not built yet — would suggest a comp or invite-back when a review reads negative."
                />
                <PlannedToggleRow
                  label="Never promise refunds"
                  description="Not built yet — would flag refund language and route it to a manager instead of posting."
                />
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Training</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This agent doesn't learn from your edits yet. Every reply is generated fresh from
                the brand voice settings above, not from a memory of past replies. An
                indexing/training pipeline isn't built.
              </p>
            </Card>
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-6 grid gap-4 lg:grid-cols-3">
            <EmptyInsightCard
              title="Trending praise"
              description="Would surface the dishes, staff, and details guests mention most in positive reviews. Needs text analysis across your reviews — not built yet."
            />
            <EmptyInsightCard
              title="Trending complaints"
              description="Would surface recurring themes in critical reviews — wait times, temperature, billing, etc. Needs text analysis — not built yet."
            />
            <EmptyInsightCard
              title="Staff leaderboard"
              description="Would rank staff by how often they're named in positive reviews. Needs name detection across review text — not built yet."
            />
          </TabsContent>

          {/* GENERATE */}
          <TabsContent value="generate" className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Ask happy guests for reviews</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Automatic after-visit asks, routed to Google based on guest history. None of this is
                built yet — no messaging pipeline exists.
              </p>
              <div className="mt-5 space-y-3">
                <PlannedToggleRow
                  label="SMS after dinner (4h delay)"
                  description="Not built yet — no SMS provider is connected."
                />
                <PlannedToggleRow
                  label="Email next morning"
                  description="Not built yet — would reuse the email pipeline already used for vendor invoices."
                />
                <PlannedToggleRow
                  label="QR card on check folio"
                  description="Not built yet — would print a QR code guests can scan at the table."
                />
              </div>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Last 30 days</h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl text-muted-foreground">—</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Asks sent
                  </div>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl text-muted-foreground">—</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    New reviews
                  </div>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl text-muted-foreground">—</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Avg rating
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No review-request campaigns have run yet — this card will fill in once that's built.
              </p>
            </Card>
          </TabsContent>

          {/* PLATFORMS */}
          <TabsContent value="platforms" className="mt-6">
            <Card className="rounded-2xl border-border/70 bg-card p-2 shadow-soft">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Platform</div>
                <div className="col-span-2">Rating</div>
                <div className="col-span-2">Reviews</div>
                <div className="col-span-3 text-right">Status</div>
              </div>

              <div className="grid grid-cols-12 items-center gap-4 border-t border-border/60 px-4 py-4">
                <div className="col-span-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                    <span className="inline-block h-2 w-2 rounded-full bg-[oklch(0.7_0.15_85)]" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">Google</div>
                    <div className="text-[11px] text-muted-foreground">
                      Native reply agent · two-way replies
                    </div>
                  </div>
                </div>
                <div className="col-span-2 inline-flex items-center gap-1 text-sm">
                  {kpis.avgRating != null ? (
                    <>
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />{" "}
                      {kpis.avgRating.toFixed(1)}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="col-span-2 text-sm">{reviews.length || "—"}</div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  {connection ? (
                    <Badge variant="secondary" className="rounded-full text-success">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not connected</span>
                  )}
                </div>
              </div>

              {(["Yelp", "Tripadvisor", "OpenTable", "DoorDash"] as const).map((p) => (
                <div
                  key={p}
                  className="grid grid-cols-12 items-center gap-4 border-t border-border/60 px-4 py-4 opacity-60"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                    </span>
                    <div>
                      <div className="text-sm font-medium">{p}</div>
                      <div className="text-[11px] text-muted-foreground">
                        No integration built yet
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground">—</div>
                  <div className="col-span-2 text-sm text-muted-foreground">—</div>
                  <div className="col-span-3 flex items-center justify-end">
                    <span className="text-xs text-muted-foreground">Not available</span>
                  </div>
                </div>
              ))}
            </Card>
            <p className="mt-3 px-1 text-xs text-muted-foreground">
              Only Google has a working reply agent today. Yelp, Tripadvisor, OpenTable and DoorDash
              would each need their own integration built before they could appear here for real.
            </p>
          </TabsContent>
        </Tabs>
      </main>

      {/* Reply drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background p-0 sm:max-w-xl">
          {active && (
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b border-border/70 p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Stars value={active.starRating} />
                  <span>·</span>
                  <span>{timeAgo(active.reviewFoundAt)}</span>
                  <StatusChip status={active.status} />
                </div>
                <SheetTitle className="font-display text-2xl">{active.reviewerName}</SheetTitle>
                {active.status === "posted" && active.postedAt && (
                  <SheetDescription className="text-xs">
                    Posted {timeAgo(active.postedAt)}
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="space-y-6 overflow-y-auto p-6">
                {active.reviewText && (
                  <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm leading-relaxed">
                    {active.reviewText}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> Reply
                  </div>
                  <Textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    disabled={active.status === "posted"}
                    className="mt-2 min-h-[160px] resize-none bg-card text-sm leading-relaxed"
                  />
                </div>

                {active.status === "post_failed" && active.postError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    Last attempt failed: {active.postError}
                  </div>
                )}
              </div>

              {active.status !== "posted" && (
                <div className="mt-auto flex items-center gap-2 border-t border-border/70 bg-card p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      dismiss.mutate(active.id, { onSuccess: () => setActiveId(null) })
                    }
                    disabled={dismiss.isPending}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    className="ml-auto gap-2"
                    onClick={handleApproveAndPost}
                    disabled={approveAndPost.isPending || !replyDraft.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {approveAndPost.isPending ? "Posting…" : "Approve & post to Google"}
                  </Button>
                </div>
              )}
              {approveAndPost.isError && (
                <p className="border-t border-border/70 bg-card p-4 pt-0 text-xs text-destructive">
                  {(approveAndPost.error as Error).message}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Filter,
  Flag,
  Inbox,
  Link2,
  MessageSquare,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Wand2,
} from "lucide-react";

import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Unified guest reviews from Google, Yelp, Tripadvisor and delivery apps with an AI reply agent.",
      },
    ],
  }),
  component: ReviewsPage,
});

type Platform = "Google" | "Yelp" | "Tripadvisor" | "OpenTable" | "Resy" | "DoorDash" | "UberEats";
type Sentiment = "positive" | "neutral" | "negative";
type Status = "new" | "drafted" | "replied" | "escalated";

type Review = {
  id: string;
  platform: Platform;
  author: string;
  rating: number;
  date: string;
  text: string;
  sentiment: Sentiment;
  status: Status;
  tags: string[];
  visit?: string;
  aiDraft?: string;
};

const REVIEWS: Review[] = [
  {
    id: "r1",
    platform: "Google",
    author: "Amelia R.",
    rating: 5,
    date: "2h ago",
    text:
      "Absolutely magical evening. The tagliatelle al ragù was the best I've had outside Bologna, and Marco made us feel like family. The negroni sbagliato is a must.",
    sentiment: "positive",
    status: "new",
    tags: ["service", "pasta", "cocktails"],
    visit: "Fri dinner · party of 4",
    aiDraft:
      "Amelia, thank you for such a kind note — we'll pass your words on to Marco and the kitchen. The ragù simmers eight hours, so we're thrilled it landed. Save us a seat next time; the autumn menu drops in two weeks. — Chef Bali",
  },
  {
    id: "r2",
    platform: "Yelp",
    author: "Daniel K.",
    rating: 2,
    date: "5h ago",
    text:
      "Wait was 40 minutes past our reservation and the branzino arrived cold. Server was apologetic and comped dessert, but the night felt rushed after that.",
    sentiment: "negative",
    status: "new",
    tags: ["wait time", "temperature", "branzino"],
    visit: "Thu dinner · party of 2",
    aiDraft:
      "Daniel, I'm sorry your Thursday didn't reflect the standard we hold ourselves to — a 40 minute wait and a cold main are not acceptable. I'd like to invite you back as our guests for a tasting with the chef. Please email me directly at lia@maisonolive.com. — Bali Singh, Owner",
  },
  {
    id: "r3",
    platform: "Tripadvisor",
    author: "Sophie M.",
    rating: 4,
    date: "1d ago",
    text:
      "Beautiful room and lovely burrata. Knocked one star because the room got very loud by 8pm and we struggled to hear each other.",
    sentiment: "neutral",
    status: "drafted",
    tags: ["ambience", "noise"],
    visit: "Sat dinner · party of 2",
    aiDraft:
      "Sophie, thank you for the thoughtful review. The 8pm energy is part of the room's character, but we hear you — for quieter evenings, ask for table 6 or 11 along the banquette. We'd love to host you again. — Thrasher's Pub",
  },
  {
    id: "r4",
    platform: "Google",
    author: "Priya N.",
    rating: 5,
    date: "1d ago",
    text:
      "Tiramisù is divine. Bar team knows their stuff. Will be back for the pasta night.",
    sentiment: "positive",
    status: "replied",
    tags: ["dessert", "bar"],
    visit: "Wed bar · party of 2",
  },
  {
    id: "r5",
    platform: "DoorDash",
    author: "M. Chen",
    rating: 1,
    date: "2d ago",
    text:
      "Order arrived 25 minutes late and pasta was overcooked in transit. Disappointing for a $90 order.",
    sentiment: "negative",
    status: "escalated",
    tags: ["delivery", "pasta", "temperature"],
    aiDraft:
      "Thank you for flagging this — pasta doesn't travel well past 15 minutes, and we should have caught that. I've issued a full refund and added store credit. We're testing a new container for pasta delivery this month. — Thrasher's Pub",
  },
  {
    id: "r6",
    platform: "OpenTable",
    author: "Jules T.",
    rating: 5,
    date: "3d ago",
    text:
      "Anniversary dinner — they remembered us from last year and surprised us with a candle in the tiramisù. Made my wife cry (good tears).",
    sentiment: "positive",
    status: "replied",
    tags: ["anniversary", "service"],
    visit: "Sat dinner · party of 2",
  },
  {
    id: "r7",
    platform: "Yelp",
    author: "Hannah L.",
    rating: 3,
    date: "4d ago",
    text:
      "Food was very good but the bill had a $14 item we didn't order. Got fixed but it took a while.",
    sentiment: "neutral",
    status: "new",
    tags: ["billing", "service"],
    visit: "Tue dinner · party of 3",
    aiDraft:
      "Hannah, apologies for the billing slip — we've retrained the floor team on the new POS this week. Please come back and let us comp a round of negronis. — Thrasher's Pub",
  },
];

const PLATFORM_STATS: { platform: Platform; rating: number; count: number; delta: number; connected: boolean }[] = [
  { platform: "Google", rating: 4.7, count: 1284, delta: 0.1, connected: true },
  { platform: "Yelp", rating: 4.2, count: 612, delta: -0.1, connected: true },
  { platform: "Tripadvisor", rating: 4.5, count: 318, delta: 0.0, connected: true },
  { platform: "OpenTable", rating: 4.8, count: 902, delta: 0.2, connected: true },
  { platform: "Resy", rating: 4.6, count: 410, delta: 0.0, connected: false },
  { platform: "DoorDash", rating: 4.1, count: 256, delta: -0.2, connected: true },
];

const TONES = ["Warm host", "Professional", "Chef's voice", "Concise"] as const;

function PlatformDot({ platform }: { platform: Platform }) {
  const map: Record<Platform, string> = {
    Google: "bg-[oklch(0.7_0.15_85)]",
    Yelp: "bg-[oklch(0.6_0.2_25)]",
    Tripadvisor: "bg-[oklch(0.65_0.13_155)]",
    OpenTable: "bg-[oklch(0.55_0.15_25)]",
    Resy: "bg-ink",
    DoorDash: "bg-[oklch(0.65_0.18_25)]",
    UberEats: "bg-[oklch(0.65_0.18_155)]",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[platform]}`} />;
}

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

function SentimentChip({ sentiment }: { sentiment: Sentiment }) {
  const map = {
    positive: { label: "Positive", cls: "bg-success/15 text-success border-success/20", Icon: ThumbsUp },
    neutral: { label: "Neutral", cls: "bg-muted text-muted-foreground border-border", Icon: MessageSquare },
    negative: { label: "Negative", cls: "bg-destructive/10 text-destructive border-destructive/20", Icon: ThumbsDown },
  } as const;
  const { label, cls, Icon } = map[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    new: { label: "Needs reply", cls: "bg-primary/10 text-primary border-primary/20" },
    drafted: { label: "AI drafted", cls: "bg-accent text-accent-foreground border-border" },
    replied: { label: "Replied", cls: "bg-success/10 text-success border-success/20" },
    escalated: { label: "Escalated", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  trend = "up",
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  trend?: "up" | "down";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <Card className="rounded-2xl border-border/70 bg-card p-5 shadow-soft">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="font-display text-3xl">{value}</div>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-xs ${trend === "up" ? "text-success" : "text-destructive"}`}>
            <TrendIcon className="h-3 w-3" />
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function ReviewsPage() {
  const [active, setActive] = useState<Review | null>(null);
  const [filter, setFilter] = useState<"all" | Sentiment | "new">("all");
  const [platform, setPlatform] = useState<"all" | Platform>("all");

  const filtered = useMemo(() => {
    return REVIEWS.filter((r) => {
      if (filter === "new" && r.status !== "new") return false;
      if (filter !== "all" && filter !== "new" && r.sentiment !== filter) return false;
      if (platform !== "all" && r.platform !== platform) return false;
      return true;
    });
  }, [filter, platform]);

  return (
    <>
      <Topbar eyebrow="Guest sentiment" title="Reviews" />
      <main className="space-y-8 px-6 py-8">
        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Rolling rating" value="4.6" delta="+0.1" hint="Across 6 platforms · last 30 days" />
          <KpiCard label="Needs reply" value="12" delta="-3" hint="SLA: reply within 24h" trend="down" />
          <KpiCard label="AI replies sent" value="47" delta="+18" hint="92% approval rate this week" />
          <KpiCard label="Avg response time" value="3h 12m" delta="-46m" hint="Target ≤ 4h" trend="down" />
        </section>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="bg-card">
            <TabsTrigger value="inbox" className="gap-2"><Inbox className="h-3.5 w-3.5" /> Inbox</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Bot className="h-3.5 w-3.5" /> AI Agent</TabsTrigger>
            <TabsTrigger value="insights" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Insights</TabsTrigger>
            <TabsTrigger value="generate" className="gap-2"><QrCode className="h-3.5 w-3.5" /> Get reviews</TabsTrigger>
            <TabsTrigger value="platforms" className="gap-2"><Link2 className="h-3.5 w-3.5" /> Platforms</TabsTrigger>
          </TabsList>

          {/* INBOX */}
          <TabsContent value="inbox" className="mt-6 space-y-4">
            {/* Filter bar */}
            <Card className="flex flex-wrap items-center gap-2 rounded-2xl border-border/70 bg-card p-3 shadow-soft">
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Filter
              </div>
              {(["all", "new", "negative", "neutral", "positive"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  className="h-8 rounded-full text-xs capitalize"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All reviews" : f === "new" ? "Needs reply" : f}
                </Button>
              ))}
              <Separator orientation="vertical" className="mx-2 h-6" />
              {(["all", "Google", "Yelp", "Tripadvisor", "OpenTable", "DoorDash"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={platform === p ? "secondary" : "ghost"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => setPlatform(p)}
                >
                  {p !== "all" && <PlatformDot platform={p as Platform} />}
                  <span className="ml-1.5">{p === "all" ? "All platforms" : p}</span>
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
                <span>Search guest, dish, keyword…</span>
              </div>
            </Card>

            {/* Review list */}
            <div className="space-y-3">
              {filtered.map((r) => (
                <Card
                  key={r.id}
                  className="group cursor-pointer rounded-2xl border-border/70 bg-card p-5 shadow-soft transition hover:shadow-card"
                  onClick={() => setActive(r)}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-secondary text-xs font-medium">
                        {r.author.split(" ").map((s) => s[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.author}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <PlatformDot platform={r.platform} /> {r.platform}
                        </span>
                        <Stars value={r.rating} />
                        <span className="text-xs text-muted-foreground">· {r.date}</span>
                        {r.visit && <span className="text-xs text-muted-foreground">· {r.visit}</span>}
                        <div className="ml-auto flex items-center gap-2">
                          <SentimentChip sentiment={r.sentiment} />
                          <StatusChip status={r.status} />
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.text}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {r.tags.map((t) => (
                          <Badge key={t} variant="secondary" className="rounded-full text-[10px] font-medium uppercase tracking-wider">
                            {t}
                          </Badge>
                        ))}
                        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          {r.aiDraft && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-1 text-accent-foreground">
                              <Wand2 className="h-3 w-3" /> AI draft ready
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {filtered.length === 0 && (
                <Card className="rounded-2xl border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
                  No reviews match these filters.
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
                  <h3 className="font-display text-lg">Reply Agent</h3>
                  <p className="text-xs text-muted-foreground">Drafts on-brand replies and learns from your edits.</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Label htmlFor="agent" className="text-xs text-muted-foreground">Active</Label>
                  <Switch id="agent" defaultChecked />
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Default tone</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TONES.map((t, i) => (
                      <Button key={t} size="sm" variant={i === 0 ? "default" : "outline"} className="rounded-full text-xs">
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Signature</div>
                  <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    — Bali Singh, Owner · Thrasher's Pub
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guardrails</div>
                {[
                  { label: "Auto-send 5★ replies", desc: "Replies to positive Google & OpenTable reviews without approval.", on: true },
                  { label: "Hold ≤ 2★ for human review", desc: "Negative reviews are drafted but never auto-sent.", on: true },
                  { label: "Offer recovery on negative", desc: "Suggest a comp or invitation back when sentiment is negative.", on: true },
                  { label: "Never promise refunds", desc: "Drafts will route to a manager if a refund is requested.", on: false },
                ].map((g) => (
                  <div key={g.label} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                    <Switch defaultChecked={g.on} />
                    <div>
                      <div className="text-sm font-medium">{g.label}</div>
                      <div className="text-xs text-muted-foreground">{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Training</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                The agent learns from your last 90 days of replies and your brand voice notes.
              </p>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <div className="flex justify-between"><span>Past replies indexed</span><span className="font-medium">312</span></div>
                  <Progress value={82} className="mt-2 h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between"><span>Brand voice strength</span><span className="font-medium">High</span></div>
                  <Progress value={88} className="mt-2 h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between"><span>Approval rate (7d)</span><span className="font-medium">92%</span></div>
                  <Progress value={92} className="mt-2 h-1.5" />
                </div>
              </div>
              <Button variant="outline" className="mt-6 w-full gap-2">
                <RefreshCw className="h-3.5 w-3.5" /> Retrain on latest 30 replies
              </Button>
            </Card>
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Trending praise</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  { t: "Tagliatelle al ragù", c: 38 },
                  { t: "Marco (server)", c: 24 },
                  { t: "Negroni sbagliato", c: 19 },
                  { t: "Anniversary touches", c: 11 },
                ].map((x) => (
                  <li key={x.t} className="flex items-center gap-3">
                    <span className="flex-1">{x.t}</span>
                    <Badge variant="secondary" className="rounded-full">+{x.c}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Trending complaints</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  { t: "Wait time on Fri/Sat", c: 14 },
                  { t: "Room noise after 8pm", c: 9 },
                  { t: "Pasta delivery temperature", c: 7 },
                  { t: "Billing accuracy", c: 4 },
                ].map((x) => (
                  <li key={x.t} className="flex items-center gap-3">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="flex-1">{x.t}</span>
                    <Badge variant="outline" className="rounded-full text-destructive">+{x.c}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Staff leaderboard</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  { name: "Marco D.", role: "Server", score: 4.9, n: 41 },
                  { name: "Lia K.", role: "Chef", score: 4.9, n: 33 },
                  { name: "Jules P.", role: "Server", score: 4.7, n: 28 },
                  { name: "Sofia R.", role: "Bar", score: 4.6, n: 22 },
                ].map((s) => (
                  <li key={s.name} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarFallback className="bg-secondary text-[10px]">
                        {s.name.split(" ").map((p) => p[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.role} · {s.n} mentions</div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {s.score}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          {/* GENERATE */}
          <TabsContent value="generate" className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Ask happy guests for reviews</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                After-visit SMS and email asks, automatically routed to Google or Yelp based on the guest's history.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { label: "SMS after dinner (4h delay)", on: true },
                  { label: "Email next morning", on: true },
                  { label: "QR card on check folio", on: true },
                ].map((c) => (
                  <div key={c.label} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                    <span className="text-sm">{c.label}</span>
                    <Switch defaultChecked={c.on} />
                  </div>
                ))}
              </div>
              <Button className="mt-5 gap-2"><QrCode className="h-3.5 w-3.5" /> Generate QR pack</Button>
            </Card>
            <Card className="rounded-2xl border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg">Last 30 days</h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl">412</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Asks sent</div>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl">147</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">New reviews</div>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <div className="font-display text-2xl">4.7</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg rating</div>
                </div>
              </div>
              <Separator className="my-5" />
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Routing rules</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> First-time guests → Google</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Repeat guests → OpenTable</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Delivery guests → DoorDash</li>
              </ul>
            </Card>
          </TabsContent>

          {/* PLATFORMS */}
          <TabsContent value="platforms" className="mt-6">
            <Card className="rounded-2xl border-border/70 bg-card p-2 shadow-soft">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4">Platform</div>
                <div className="col-span-2">Rating</div>
                <div className="col-span-2">Reviews</div>
                <div className="col-span-2">30d trend</div>
                <div className="col-span-2 text-right">Status</div>
              </div>
              {PLATFORM_STATS.map((p) => (
                <div key={p.platform} className="grid grid-cols-12 items-center gap-4 border-t border-border/60 px-4 py-4">
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
                      <PlatformDot platform={p.platform} />
                    </span>
                    <div>
                      <div className="text-sm font-medium">{p.platform}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.platform === "Yelp" ? "Reply via aggregator (no native API)" : "Native API · two-way replies"}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 inline-flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {p.rating.toFixed(1)}
                  </div>
                  <div className="col-span-2 text-sm">{p.count.toLocaleString()}</div>
                  <div className="col-span-2 text-sm">
                    {p.delta === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : p.delta > 0 ? (
                      <span className="inline-flex items-center gap-1 text-success"><TrendingUp className="h-3.5 w-3.5" />+{p.delta.toFixed(1)}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive"><TrendingDown className="h-3.5 w-3.5" />{p.delta.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {p.connected ? (
                      <Badge variant="secondary" className="rounded-full text-success"><CheckCircle2 className="mr-1 h-3 w-3" /> Connected</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full">Connect</Button>
                    )}
                  </div>
                </div>
              ))}
            </Card>
            <p className="mt-3 px-1 text-xs text-muted-foreground">
              Yelp doesn't expose a public reply API — replies are sent via an aggregator (Yext or Chatmeter) and synced back into this inbox.
            </p>
          </TabsContent>
        </Tabs>
      </main>

      {/* Reply drawer */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background p-0 sm:max-w-xl">
          {active && (
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b border-border/70 p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PlatformDot platform={active.platform} /> {active.platform}
                  <span>·</span>
                  <Stars value={active.rating} />
                  <span>·</span>
                  <span>{active.date}</span>
                  <SentimentChip sentiment={active.sentiment} />
                </div>
                <SheetTitle className="font-display text-2xl">{active.author}</SheetTitle>
                {active.visit && (
                  <SheetDescription className="text-xs">{active.visit}</SheetDescription>
                )}
              </SheetHeader>

              <div className="space-y-6 overflow-y-auto p-6">
                <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm leading-relaxed">
                  {active.text}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> AI drafted reply
                  </div>
                  <Textarea
                    defaultValue={active.aiDraft ?? "Drafting…"}
                    className="mt-2 min-h-[160px] resize-none bg-card text-sm leading-relaxed"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tone</span>
                    {TONES.map((t, i) => (
                      <Button key={t} size="sm" variant={i === 0 ? "default" : "outline"} className="rounded-full text-xs">
                        {t}
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" className="ml-auto gap-2 text-xs">
                      <RefreshCw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recovery actions</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      "Comp dessert next visit",
                      "Send $25 gift card",
                      "Invite chef's tasting",
                      "Assign to GM",
                    ].map((a) => (
                      <Button key={a} variant="outline" size="sm" className="justify-start rounded-xl text-xs">
                        <ArrowUpRight className="mr-2 h-3 w-3" /> {a}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Internal note</div>
                  <Textarea
                    placeholder="Add a note for the team (not visible to guest)…"
                    className="mt-2 min-h-[72px] resize-none bg-card text-sm"
                  />
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-border/70 bg-card p-4">
                <Button variant="outline" size="sm" className="gap-2">
                  <Flag className="h-3.5 w-3.5" /> Escalate
                </Button>
                <Button variant="ghost" size="sm">Save draft</Button>
                <Button size="sm" className="ml-auto gap-2">
                  <Send className="h-3.5 w-3.5" /> Send reply
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

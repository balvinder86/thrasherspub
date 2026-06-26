import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Gauge,
  Globe,
  Hammer,
  Image as ImageIcon,
  Layers,
  Link2,
  MapPin,
  Megaphone,
  MousePointerClick,
  PenSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Utensils,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/seo")({
  head: () => ({
    meta: [
      { title: "SEO · Maison Olive" },
      {
        name: "description",
        content:
          "Local search rankings, Google Business health, keyword visibility and an AI SEO agent for restaurants.",
      },
    ],
  }),
  component: SeoPage,
});

// ---------- mock data ----------

const visibilitySeries = [
  { d: "Wk 1", visibility: 38, clicks: 410 },
  { d: "Wk 2", visibility: 42, clicks: 462 },
  { d: "Wk 3", visibility: 47, clicks: 540 },
  { d: "Wk 4", visibility: 51, clicks: 612 },
  { d: "Wk 5", visibility: 55, clicks: 668 },
  { d: "Wk 6", visibility: 58, clicks: 712 },
  { d: "Wk 7", visibility: 61, clicks: 790 },
  { d: "Wk 8", visibility: 64, clicks: 845 },
];

type Keyword = {
  id: string;
  term: string;
  intent: "Local" | "Brand" | "Dish" | "Event";
  rank: number;
  prev: number;
  volume: number;
  difficulty: number;
  url: string;
  opportunity: "Quick win" | "Watch" | "Stretch";
};

const keywords: Keyword[] = [
  { id: "k1", term: "italian restaurant near me", intent: "Local", rank: 4, prev: 7, volume: 4400, difficulty: 58, url: "/", opportunity: "Quick win" },
  { id: "k2", term: "best pasta hayes valley", intent: "Local", rank: 2, prev: 3, volume: 880, difficulty: 32, url: "/menu", opportunity: "Watch" },
  { id: "k3", term: "maison olive", intent: "Brand", rank: 1, prev: 1, volume: 1300, difficulty: 8, url: "/", opportunity: "Watch" },
  { id: "k4", term: "truffle tagliatelle sf", intent: "Dish", rank: 6, prev: 11, volume: 320, difficulty: 24, url: "/menu/tagliatelle", opportunity: "Quick win" },
  { id: "k5", term: "private dining san francisco", intent: "Event", rank: 14, prev: 18, volume: 2100, difficulty: 64, url: "/events", opportunity: "Stretch" },
  { id: "k6", term: "wine bar near opera house", intent: "Local", rank: 9, prev: 13, volume: 590, difficulty: 38, url: "/wine", opportunity: "Quick win" },
  { id: "k7", term: "sunday brunch hayes valley", intent: "Event", rank: 5, prev: 8, volume: 720, difficulty: 41, url: "/brunch", opportunity: "Quick win" },
];

type Page = {
  id: string;
  path: string;
  title: string;
  score: number;
  issues: string[];
  status: "Healthy" | "Needs work" | "Critical";
};

const pages: Page[] = [
  { id: "p1", path: "/", title: "Maison Olive — Modern Italian in Hayes Valley", score: 86, issues: ["Add FAQ schema"], status: "Healthy" },
  { id: "p2", path: "/menu", title: "Seasonal Tasting Menu | Maison Olive", score: 72, issues: ["Meta description >160ch", "2 images missing alt"], status: "Needs work" },
  { id: "p3", path: "/menu/tagliatelle", title: "Truffle Tagliatelle", score: 64, issues: ["No H1", "Thin content (180 words)", "Missing Product schema"], status: "Needs work" },
  { id: "p4", path: "/events", title: "Private Events & Buyouts", score: 41, issues: ["Page slow (LCP 4.8s)", "Duplicate title", "No internal links in"], status: "Critical" },
  { id: "p5", path: "/reservations", title: "Reservations", score: 91, issues: [], status: "Healthy" },
];

const competitors = [
  { name: "Trattoria Bianca", visibility: 71, delta: -2, share: 18 },
  { name: "Maison Olive", visibility: 64, delta: 6, share: 16, you: true },
  { name: "Osteria Nord", visibility: 58, delta: 1, share: 14 },
  { name: "Vino & Sale", visibility: 49, delta: -4, share: 11 },
  { name: "Café Marais", visibility: 42, delta: 3, share: 9 },
];

const citations = [
  { name: "Google Business Profile", status: "Verified", napMatch: true, lastSync: "2h ago" },
  { name: "Yelp", status: "Verified", napMatch: true, lastSync: "1d ago" },
  { name: "Apple Maps", status: "Verified", napMatch: false, lastSync: "3d ago" },
  { name: "Tripadvisor", status: "Claimed", napMatch: true, lastSync: "1d ago" },
  { name: "OpenTable", status: "Synced", napMatch: true, lastSync: "12h ago" },
  { name: "Bing Places", status: "Unclaimed", napMatch: false, lastSync: "—" },
  { name: "Facebook Page", status: "Verified", napMatch: true, lastSync: "4h ago" },
  { name: "Foursquare", status: "Claimed", napMatch: false, lastSync: "6d ago" },
];

const agentQueue = [
  {
    id: "a1",
    kind: "Meta rewrite",
    target: "/menu",
    summary: "Tighten title to 58ch and add seasonal hook for fall menu.",
    confidence: 92,
  },
  {
    id: "a2",
    kind: "GBP post",
    target: "Google Business Profile",
    summary: "Weekly update: white truffle week, Oct 14–20, with reservation CTA.",
    confidence: 88,
  },
  {
    id: "a3",
    kind: "Schema markup",
    target: "/menu/tagliatelle",
    summary: "Add Product + Offer schema with price, allergens and image.",
    confidence: 95,
  },
  {
    id: "a4",
    kind: "Blog draft",
    target: "/journal/truffle-season",
    summary: "900-word editorial targeting 'truffle tagliatelle sf' (+ 6 related terms).",
    confidence: 81,
  },
  {
    id: "a5",
    kind: "Alt text",
    target: "/menu (2 images)",
    summary: "Generate descriptive alt for hero and pasta course photography.",
    confidence: 97,
  },
];

// ---------- helpers ----------

function Kpi({
  label,
  value,
  delta,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: { value: string; up: boolean };
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/40">
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            delta.up
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {delta.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta.value}
        </span>
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}

function rankDelta(rank: number, prev: number) {
  const diff = prev - rank; // positive = improved
  if (diff === 0)
    return <span className="text-xs text-muted-foreground">—</span>;
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(diff)}
    </span>
  );
}

// ---------- page ----------

function SeoPage() {
  const [selected, setSelected] = useState<Keyword | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<(typeof agentQueue)[number] | null>(null);

  const quickWins = useMemo(
    () => keywords.filter((k) => k.opportunity === "Quick win").length,
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar eyebrow="Discovery" title="SEO & local search" />

      <div className="space-y-6 px-6 py-6">
        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Local pack rank"
            value="#3"
            delta={{ value: "+2 spots", up: true }}
            hint="Avg across 12 tracked terms in 5km"
            icon={MapPin}
          />
          <Kpi
            label="Search visibility"
            value="64%"
            delta={{ value: "+6 pts", up: true }}
            hint="Share of voice vs 8 competitors"
            icon={Eye}
          />
          <Kpi
            label="GBP actions"
            value="2,148"
            delta={{ value: "+18%", up: true }}
            hint="Calls, directions, website · 28d"
            icon={MousePointerClick}
          />
          <Kpi
            label="AI tasks shipped"
            value="37"
            delta={{ value: "12 pending", up: true }}
            hint="Auto-applied or queued for review"
            icon={Sparkles}
          />
        </div>

        {/* Hero chart + agent strip */}
        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Card className="p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Visibility & clicks
                </div>
                <h2 className="mt-1 font-display text-2xl">Trending up · 8 weeks</h2>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="rounded-full">
                  Visibility
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  Organic clicks
                </Badge>
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visibilitySeries}>
                  <defs>
                    <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visibility"
                    stroke="hsl(var(--primary))"
                    fill="url(#vis)"
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="hsl(var(--foreground))" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="flex flex-col gap-4 bg-gradient-to-br from-accent/40 via-card to-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Bot className="h-3.5 w-3.5" />
                  AI SEO agent
                </div>
                <h2 className="mt-1 font-display text-2xl">12 tasks ready</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quickWins} quick-win keywords, 3 meta rewrites and 1 schema fix.
                </p>
              </div>
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Live
              </Badge>
            </div>
            <div className="space-y-2">
              {agentQueue.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTask(t);
                    setAgentOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 p-3 text-left transition hover:border-primary/40 hover:bg-background"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Wand2 className="h-3 w-3" />
                      {t.kind}
                    </div>
                    <div className="truncate text-sm font-medium">{t.summary}</div>
                  </div>
                  <span className="ml-3 text-xs text-muted-foreground">{t.confidence}%</span>
                </button>
              ))}
            </div>
            <Button
              className="mt-auto w-full gap-2"
              onClick={() => {
                setActiveTask(agentQueue[0]);
                setAgentOpen(true);
              }}
            >
              <Sparkles className="h-4 w-4" />
              Review agent queue
            </Button>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="keywords">
          <TabsList className="bg-card">
            <TabsTrigger value="keywords" className="gap-2">
              <Target className="h-4 w-4" /> Keywords
            </TabsTrigger>
            <TabsTrigger value="pages" className="gap-2">
              <FileText className="h-4 w-4" /> Pages
            </TabsTrigger>
            <TabsTrigger value="gbp" className="gap-2">
              <Building2 className="h-4 w-4" /> Google Business
            </TabsTrigger>
            <TabsTrigger value="citations" className="gap-2">
              <Link2 className="h-4 w-4" /> Citations
            </TabsTrigger>
            <TabsTrigger value="competitors" className="gap-2">
              <Globe className="h-4 w-4" /> Competitors
            </TabsTrigger>
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="h-4 w-4" /> AI agent
            </TabsTrigger>
          </TabsList>

          {/* KEYWORDS */}
          <TabsContent value="keywords" className="mt-4">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search keywords…" className="h-9 w-64 pl-9" />
                  </div>
                  <Badge variant="outline" className="rounded-full">All intents</Badge>
                  <Badge variant="outline" className="rounded-full">Top 20</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Recheck ranks
                  </Button>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Track keyword
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-[1.6fr_0.7fr_0.5fr_0.5fr_0.7fr_0.9fr_0.7fr] gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>Keyword</div>
                <div>Intent</div>
                <div>Rank</div>
                <div>Δ</div>
                <div>Volume</div>
                <div>Difficulty</div>
                <div>Opportunity</div>
              </div>
              <div>
                {keywords.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setSelected(k)}
                    className="grid w-full grid-cols-[1.6fr_0.7fr_0.5fr_0.5fr_0.7fr_0.9fr_0.7fr] items-center gap-3 border-b border-border/50 px-4 py-3 text-left text-sm transition hover:bg-accent/30 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{k.term}</div>
                      <div className="truncate text-xs text-muted-foreground">{k.url}</div>
                    </div>
                    <div>
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        {k.intent}
                      </Badge>
                    </div>
                    <div className="font-display text-lg">#{k.rank}</div>
                    <div>{rankDelta(k.rank, k.prev)}</div>
                    <div className="tabular-nums">{k.volume.toLocaleString()}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={k.difficulty} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground">{k.difficulty}</span>
                    </div>
                    <div>
                      <Badge
                        className={`rounded-full ${
                          k.opportunity === "Quick win"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : k.opportunity === "Watch"
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              : "bg-muted text-foreground/70 hover:bg-muted"
                        }`}
                      >
                        {k.opportunity}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* PAGES */}
          <TabsContent value="pages" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {pages.map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" /> {p.path}
                      </div>
                      <h3 className="mt-1 truncate font-display text-lg">{p.title}</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-3xl">{p.score}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Score
                      </div>
                    </div>
                  </div>
                  <Progress value={p.score} className="mt-3 h-1.5" />
                  <div className="mt-4 space-y-2">
                    {p.issues.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> No outstanding issues
                      </div>
                    ) : (
                      p.issues.map((issue) => (
                        <div
                          key={issue}
                          className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                        >
                          <span>{issue}</span>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            <Wand2 className="h-3 w-3" /> Fix with AI
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`rounded-full ${
                        p.status === "Healthy"
                          ? "border-emerald-200 text-emerald-700"
                          : p.status === "Needs work"
                            ? "border-amber-200 text-amber-700"
                            : "border-rose-200 text-rose-700"
                      }`}
                    >
                      {p.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Open page <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* GBP */}
          <TabsContent value="gbp" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Google Business Profile
                    </div>
                    <h3 className="mt-1 font-display text-2xl">Maison Olive · Hayes Valley</h3>
                    <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 4.7 · 832
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> (415) 555-0148
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> 421 Hayes St
                      </span>
                    </div>
                  </div>
                  <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    Verified
                  </Badge>
                </div>

                <Separator className="my-5" />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Profile views", value: "12.4k", trend: "+9%" },
                    { label: "Search impressions", value: "48.1k", trend: "+14%" },
                    { label: "Direction taps", value: "1,082", trend: "+22%" },
                    { label: "Calls", value: "318", trend: "+6%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-border/70 bg-card p-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {s.label}
                      </div>
                      <div className="mt-1 font-display text-xl">{s.value}</div>
                      <div className="text-xs text-emerald-700">{s.trend}</div>
                    </div>
                  ))}
                </div>

                <Separator className="my-5" />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">Profile completeness</h4>
                    <span className="text-xs text-muted-foreground">82%</span>
                  </div>
                  <Progress value={82} className="h-1.5" />
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Hours, menu link, attributes set</li>
                    <li className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-amber-600" /> Add 4 more interior photos this month</li>
                    <li className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-amber-600" /> No GBP post in last 9 days</li>
                  </ul>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl">Scheduled posts</h3>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> New post
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { when: "Tomorrow · 9:00", title: "White truffle week", kind: "Offer" },
                    { when: "Fri · 18:00", title: "Live jazz Saturday", kind: "Event" },
                    { when: "Next Mon · 10:00", title: "New fall lunch menu", kind: "Update" },
                  ].map((p) => (
                    <div
                      key={p.title}
                      className="flex items-center justify-between rounded-xl border border-border/70 p-3"
                    >
                      <div>
                        <div className="text-xs text-muted-foreground">{p.when}</div>
                        <div className="text-sm font-medium">{p.title}</div>
                      </div>
                      <Badge variant="secondary" className="rounded-full text-[11px]">
                        {p.kind}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button className="mt-5 w-full gap-2" variant="secondary">
                  <Wand2 className="h-4 w-4" /> Draft this week's posts with AI
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* CITATIONS */}
          <TabsContent value="citations" className="mt-4">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/70 p-4">
                <div>
                  <h3 className="font-display text-lg">Local citations & directories</h3>
                  <p className="text-sm text-muted-foreground">
                    Name, address and phone consistency across the web.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Re-scan
                </Button>
              </div>
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <div>Directory</div>
                <div>Status</div>
                <div>NAP match</div>
                <div>Last sync</div>
                <div></div>
              </div>
              {citations.map((c) => (
                <div
                  key={c.name}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto] items-center gap-3 border-b border-border/50 px-4 py-3 text-sm last:border-0"
                >
                  <div className="font-medium">{c.name}</div>
                  <div>
                    <Badge
                      variant="outline"
                      className={`rounded-full ${
                        c.status === "Unclaimed"
                          ? "border-rose-200 text-rose-700"
                          : "border-emerald-200 text-emerald-700"
                      }`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div>
                    {c.napMatch ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Match
                      </span>
                    ) : (
                      <span className="text-rose-700">Mismatch</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">{c.lastSync}</div>
                  <div className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Manage <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          {/* COMPETITORS */}
          <TabsContent value="competitors" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <Card className="p-6">
                <h3 className="font-display text-xl">Share of local voice</h3>
                <p className="text-sm text-muted-foreground">
                  Visibility across 12 tracked terms in a 5km radius.
                </p>
                <div className="mt-4 space-y-3">
                  {competitors.map((c) => (
                    <div key={c.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className={c.you ? "font-semibold" : ""}>
                          {c.name} {c.you && <Badge className="ml-1 rounded-full">You</Badge>}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{c.visibility}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={c.visibility}
                          className={`h-2 flex-1 ${c.you ? "" : "opacity-70"}`}
                        />
                        <span
                          className={`w-10 text-right text-xs ${
                            c.delta >= 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {c.delta >= 0 ? "+" : ""}
                          {c.delta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-display text-xl">Where rivals beat you</h3>
                <p className="text-sm text-muted-foreground">
                  Keywords where a competitor ranks higher.
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { term: "private dining san francisco", winner: "Trattoria Bianca", gap: 10 },
                    { term: "italian wine list sf", winner: "Vino & Sale", gap: 6 },
                    { term: "chef tasting menu hayes", winner: "Osteria Nord", gap: 3 },
                    { term: "anniversary dinner sf", winner: "Trattoria Bianca", gap: 8 },
                  ].map((g) => (
                    <div
                      key={g.term}
                      className="flex items-center justify-between rounded-xl border border-border/70 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{g.term}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.winner} leads by {g.gap} positions
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <Wand2 className="h-3 w-3" /> Plan content
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* AGENT */}
          <TabsContent value="agent" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-border/70 p-4">
                  <div>
                    <h3 className="font-display text-lg">Agent queue</h3>
                    <p className="text-sm text-muted-foreground">
                      Drafts and fixes waiting for review.
                    </p>
                  </div>
                  <Button size="sm" className="gap-2">
                    <Send className="h-4 w-4" /> Approve all safe
                  </Button>
                </div>
                {agentQueue.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTask(t);
                      setAgentOpen(true);
                    }}
                    className="flex w-full items-start justify-between gap-3 border-b border-border/50 p-4 text-left transition hover:bg-accent/30 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Wand2 className="h-3.5 w-3.5" />
                        {t.kind} · {t.target}
                      </div>
                      <div className="mt-1 text-sm font-medium">{t.summary}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg">{t.confidence}%</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Confidence
                      </div>
                    </div>
                  </button>
                ))}
              </Card>

              <Card className="p-6">
                <h3 className="font-display text-xl">Agent settings</h3>
                <p className="text-sm text-muted-foreground">
                  Decide what the agent ships automatically.
                </p>
                <div className="mt-5 space-y-4">
                  {[
                    { id: "meta", label: "Auto-apply meta titles & descriptions", desc: "Within brand voice, max 60/160 chars.", on: true },
                    { id: "schema", label: "Auto-add structured data", desc: "Restaurant, Menu, Product, FAQ, Event.", on: true },
                    { id: "alt", label: "Generate image alt text", desc: "Skips photos already with alt.", on: true },
                    { id: "blog", label: "Publish blog drafts", desc: "Always require human review.", on: false },
                    { id: "gbp", label: "Publish GBP posts", desc: "Auto-publish weekly update on Mondays.", on: false },
                  ].map((s) => (
                    <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/70 p-3">
                      <div>
                        <Label className="text-sm font-medium">{s.label}</Label>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                      <Switch defaultChecked={s.on} />
                    </div>
                  ))}
                </div>

                <Separator className="my-5" />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-medium">Brand voice training</h4>
                    <span className="text-xs text-muted-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-1.5" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Trained on 24 pages, 142 reviews and your editorial guidelines.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Keyword drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{selected.intent}</Badge>
                  {rankDelta(selected.rank, selected.prev)}
                </div>
                <SheetTitle className="font-display text-2xl">{selected.term}</SheetTitle>
                <SheetDescription>
                  Ranking #{selected.rank} for{" "}
                  <span className="font-medium text-foreground">{selected.url}</span> ·{" "}
                  {selected.volume.toLocaleString()} searches/mo · difficulty {selected.difficulty}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visibilitySeries}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} reversed domain={[1, 20]} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="visibility" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" /> AI recommendation
                  </div>
                  <p className="mt-1 text-sm">
                    Add an H2 covering "{selected.term}" with a 60-word intro and three internal
                    links to dish pages. Expected lift: 2–4 positions in 3 weeks.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="gap-2"><Wand2 className="h-4 w-4" /> Draft on-page fix</Button>
                  <Button variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Edit landing page</Button>
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Related terms
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["best italian sf", "pasta hayes valley", "truffle dinner sf", "date night restaurant sf"].map((r) => (
                      <Badge key={r} variant="outline" className="rounded-full">{r}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Agent task drawer */}
      <Sheet open={agentOpen} onOpenChange={setAgentOpen}>
        <SheetContent className="w-full sm:max-w-xl">
          {activeTask && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full gap-1">
                    <Bot className="h-3 w-3" /> {activeTask.kind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activeTask.target}</span>
                </div>
                <SheetTitle className="font-display text-2xl">{activeTask.summary}</SheetTitle>
                <SheetDescription>
                  Confidence {activeTask.confidence}% · trained on your brand voice and last 90
                  days of performance.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-3">
                <div>
                  <Label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Draft
                  </Label>
                  <Textarea
                    className="mt-2 min-h-[180px]"
                    defaultValue={`Maison Olive · Modern Italian in Hayes Valley\n\nSeasonal tasting menu featuring white truffle, hand-cut tagliatelle, and a 200-bottle Italian wine list. Reserve a table tonight.`}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Warmer", "Shorter", "More local", "Add CTA"].map((t) => (
                    <Badge key={t} variant="outline" className="cursor-pointer rounded-full">
                      <Wand2 className="mr-1 h-3 w-3" /> {t}
                    </Badge>
                  ))}
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2"><Send className="h-4 w-4" /> Approve & apply</Button>
                  <Button variant="outline" className="flex-1">Send back</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

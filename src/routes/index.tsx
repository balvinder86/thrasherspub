import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Flame,
  Gift,
  Megaphone,
  Package,
  PieChart as PieIcon,
  Receipt,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFoodCostSummary, useSalesTrend, useTopItems } from "@/lib/pos/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Thrasher's Pub" },
      {
        name: "description",
        content:
          "A single command center for Thrasher's Pub — sales, menu mix, inventory, invoices, reviews, marketing, loyalty, scheduling and SEO.",
      },
    ],
  }),
  component: Overview,
});

/* ---------- mock data, mirrors the other tabs ---------- */

const channelMix = [
  { name: "Dine-in", value: 58, color: "var(--color-primary)" },
  { name: "Bar", value: 22, color: "oklch(0.72 0.13 55)" },
  { name: "Patio", value: 12, color: "oklch(0.82 0.09 80)" },
  { name: "Takeout", value: 8, color: "oklch(0.78 0.04 70)" },
];

const aiSignals = [
  {
    tag: "Inventory",
    tone: "primary",
    title: "12 items below par for tomorrow",
    body: "Tito's, Sysco produce, and Columbia seafood orders ready to send.",
    cta: "Review cart",
    to: "/inventory",
    icon: Package,
  },
  {
    tag: "Reviews",
    tone: "amber",
    title: "3 critical reviews awaiting reply",
    body: "Agent drafted responses in your editorial tone — 1-tap approve.",
    cta: "Open inbox",
    to: "/reviews",
    icon: Star,
  },
  {
    tag: "Marketing",
    tone: "ink",
    title: "Sunday brunch campaign primed",
    body: "Email + SMS to 2,184 lapsed regulars · projected +$3.1k revenue.",
    cta: "Launch",
    to: "/marketing",
    icon: Megaphone,
  },
];

const moduleTiles = [
  {
    to: "/product-mix",
    icon: PieIcon,
    label: "Product Mix",
    metric: "$48.3k",
    sub: "this week · 312 items sold",
    delta: "+8.1%",
    deltaPositive: true,
  },
  {
    to: "/inventory",
    icon: Package,
    label: "Inventory",
    metric: "12 below par",
    sub: "$1,840 smart cart pending",
    delta: "auto-send 6a",
    deltaPositive: true,
  },
  {
    to: "/invoices",
    icon: Receipt,
    label: "Invoices",
    metric: "$18,420",
    sub: "MTD spend · $1,210 saved",
    delta: "4 to review",
    deltaPositive: false,
  },
  {
    to: "/reviews",
    icon: Star,
    label: "Reviews",
    metric: "4.7 ★",
    sub: "184 reviews · 3 need reply",
    delta: "+0.2",
    deltaPositive: true,
  },
  {
    to: "/seo",
    icon: Search,
    label: "SEO",
    metric: "Visibility 72",
    sub: "Maps rank #3 · 9 keywords up",
    delta: "+6",
    deltaPositive: true,
  },
  {
    to: "/marketing",
    icon: Megaphone,
    label: "Marketing",
    metric: "3 live",
    sub: "Email 38% open · SMS 22% CTR",
    delta: "+$3.1k proj",
    deltaPositive: true,
  },
  {
    to: "/loyalty",
    icon: Gift,
    label: "Loyalty",
    metric: "1,284 members",
    sub: "Tap Club · 62% repeat rate",
    delta: "+48 this wk",
    deltaPositive: true,
  },
  {
    to: "/scheduling",
    icon: CalendarClock,
    label: "Scheduling",
    metric: "28% labor",
    sub: "Goal 26% · 2 shifts open",
    delta: "−1.4%",
    deltaPositive: true,
  },
];

const todaysAgenda = [
  { time: "9:00a", text: "Approve Sysco & Columbia POs", module: "Inventory", to: "/inventory" },
  { time: "11:30a", text: "Reply to 3 flagged reviews", module: "Reviews", to: "/reviews" },
  { time: "2:00p", text: "Confirm Sunday brunch campaign", module: "Marketing", to: "/marketing" },
  { time: "4:00p", text: "Publish next week's schedule", module: "Scheduling", to: "/scheduling" },
  { time: "5:30p", text: "Pre-shift: 220 covers forecast", module: "Sales", to: "/" },
];

const toneTile: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-[oklch(0.92_0.08_85)] text-[oklch(0.4_0.1_60)] border-[oklch(0.85_0.08_75)]",
  ink: "bg-[oklch(0.22_0.012_60)] text-[oklch(0.97_0.012_85)] border-[oklch(0.22_0.012_60)]",
};

// Theoretical food cost % is the KPI value; the delta line shows
// variance against actual approved-invoice spend for the same period
// (negative variance = spent less than the recipe math predicted, a
// good sign, hence framed as "positive"). No recipe_lines mapped yet
// means the theoretical number would be a misleading 0% rather than
// "we don't know" — surfaced honestly instead of a fake-looking stat.
function foodCostKpi(foodCost: ReturnType<typeof useFoodCostSummary>["data"]) {
  if (!foodCost || !foodCost.hasRecipeData || foodCost.theoreticalPct == null) {
    return { value: "—", delta: "no recipe data yet", positive: undefined };
  }
  const value = `${foodCost.theoreticalPct.toFixed(1)}%`;
  if (foodCost.variancePct == null) {
    return { value, delta: "no invoices this period", positive: undefined };
  }
  const sign = foodCost.variancePct >= 0 ? "+" : "";
  return {
    value,
    delta: `${sign}${foodCost.variancePct.toFixed(1)}%`,
    positive: foodCost.variancePct <= 0,
  };
}

function Overview() {
  const { data: revenueData = [] } = useSalesTrend(7);
  const { data: topItems = [] } = useTopItems(7, 4);
  const { data: foodCost } = useFoodCostSummary(7);
  const foodCostDisplay = foodCostKpi(foodCost);

  return (
    <>
      <Topbar eyebrow="Thursday · June 25 · West Village" title="Good evening, Bali" />
      <main className="space-y-8 px-6 py-8">
        {/* Hero band: tonight + AI signals */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
          <Card className="relative overflow-hidden border-0 bg-[oklch(0.22_0.012_60)] p-8 text-[oklch(0.97_0.012_85)] shadow-card">
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute -bottom-24 right-24 h-60 w-60 rounded-full bg-[oklch(0.7_0.15_70)]/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[oklch(0.97_0.012_85)]/60">
                <Flame className="h-3.5 w-3.5 text-primary" /> Service in progress
              </div>
              <div className="mt-5 flex items-end gap-3">
                <div className="font-display text-[64px] leading-none">$8,420</div>
                <Badge className="mb-2 border-0 bg-primary/20 text-primary hover:bg-primary/20">
                  <ArrowUpRight className="mr-1 h-3 w-3" /> +12.4% vs last Fri
                </Badge>
              </div>
              <div className="mt-2 text-sm text-[oklch(0.97_0.012_85)]/70">
                Pacing $940 ahead of last Friday · 184 of 220 covers in the door
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
                <HeroStat label="Covers" value="184" hint="of 220 forecast" pct={84} />
                <HeroStat label="Avg ticket" value="$46" hint="+ $3 vs avg" pct={62} />
                <HeroStat label="Labor" value="27%" hint="goal 26%" pct={73} />
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/product-mix">View product mix <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full border-white/20 bg-white/5 text-[oklch(0.97_0.012_85)] hover:bg-white/10">
                  <Link to="/scheduling">Tonight's floor</Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* AI signal stack */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Agents working for you
                </div>
                <h2 className="mt-1 font-display text-xl">What needs you today</h2>
              </div>
              <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/10 text-primary">
                <Brain className="mr-1 h-3 w-3" /> 7 actions
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {aiSignals.map((s) => (
                <Link
                  key={s.title}
                  to={s.to}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${toneTile[s.tone]}`}>
                    <s.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {s.tag}
                    </div>
                    <div className="mt-0.5 truncate font-medium">{s.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.body}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 gap-1 rounded-full text-primary hover:bg-primary/10 hover:text-primary">
                    {s.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              ))}
            </div>
          </Card>
        </section>

        {/* Module strip — every tab represented */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                The whole house
              </div>
              <h2 className="mt-1 font-display text-2xl">Across every module</h2>
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">Click any tile to dive in</div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {moduleTiles.map((t) => (
              <ModuleTile key={t.to} {...t} />
            ))}
          </div>
        </section>

        {/* Revenue + Channel mix */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Card className="p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Revenue</div>
                <h2 className="mt-1 font-display text-2xl">This week vs last</h2>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <LegendDot color="var(--color-primary)" label="This week" />
                <LegendDot color="oklch(0.78 0.04 70)" label="Last week" />
              </div>
            </div>
            <div className="mt-6 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Area type="monotone" dataKey="lastWeek" stroke="oklch(0.78 0.04 70)" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Where sales come from</div>
            <h2 className="mt-1 font-display text-2xl">Channel mix</h2>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channelMix} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                      {channelMix.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {channelMix.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="ml-2 font-display text-sm">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi icon={DollarSign} label="Net sales (7d)" value="$48,360" delta="+8.1%" positive />
          <Kpi icon={Users} label="New guests" value="46" delta="-3" />
          <Kpi
            icon={Receipt}
            label="Food cost"
            value={foodCostDisplay.value}
            delta={foodCostDisplay.delta}
            positive={foodCostDisplay.positive}
            deltaSuffix="vs actual spend"
          />
          <Kpi icon={CheckCircle2} label="On-time POs" value="96%" delta="+2%" positive />
        </section>

        {/* Top items + Agenda + Operational pulse */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Product mix</div>
                <h2 className="mt-1 font-display text-xl">Top sellers tonight</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/product-mix">Open</Link>
              </Button>
            </div>
            <div className="h-[260px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={11} width={130} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Today</div>
                <h2 className="mt-1 font-display text-xl">Your agenda</h2>
              </div>
              <Badge variant="outline" className="rounded-full">{todaysAgenda.length}</Badge>
            </div>
            <div className="divide-y divide-border">
              {todaysAgenda.map((a) => (
                <Link
                  key={a.text}
                  to={a.to}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="w-12 font-display text-sm text-muted-foreground">{a.time}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.text}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{a.module}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Operational pulse</div>
                <h2 className="mt-1 font-display text-xl">House health</h2>
              </div>
              <Badge variant="outline" className="gap-1.5 rounded-full border-primary/30 bg-primary/10 text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
              </Badge>
            </div>
            <div className="space-y-5 p-6">
              <PulseRow label="Kitchen ticket time" value="11m 20s" pct={78} hint="goal < 12m" tone="ok" />
              <PulseRow label="Bar wait" value="6m" pct={62} hint="trending up" tone="ok" />
              <PulseRow label="Table turn" value="68m" pct={92} hint="goal 65m" tone="warn" />
              <PulseRow label="Open tabs" value="9 · $1,842" pct={45} hint="oldest 38m" tone="ok" />
              <div className="flex items-center gap-2 rounded-lg border border-[oklch(0.85_0.08_75)] bg-[oklch(0.96_0.04_85)] p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-[oklch(0.55_0.15_50)]" />
                <span className="text-[oklch(0.35_0.08_50)]">Patio 7 has been on first course 22 min — check in.</span>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}

/* ---------- small components ---------- */

function ModuleTile({
  to,
  icon: Icon,
  label,
  metric,
  sub,
  delta,
  deltaPositive,
}: {
  to: string;
  icon: typeof Package;
  label: string;
  metric: string;
  sub: string;
  delta: string;
  deltaPositive?: boolean;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
        <div className="flex items-start justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl leading-tight">{metric}</div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
        <div className="mt-3">
          <span
            className={
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] " +
              (deltaPositive
                ? "bg-[var(--color-success)]/12 text-[var(--color-success)]"
                : "bg-muted text-muted-foreground")
            }
          >
            {delta}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function HeroStat({ label, value, hint, pct }: { label: string; value: string; hint: string; pct: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[oklch(0.97_0.012_85)]/55">{label}</div>
      <div className="mt-1.5 font-display text-2xl">{value}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 text-[11px] text-[oklch(0.97_0.012_85)]/55">{hint}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  positive,
  deltaSuffix = "vs prior period",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
  deltaSuffix?: string;
}) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-xl">{value}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        <span className={positive ? "text-[var(--color-success)]" : "text-muted-foreground"}>{delta}</span>
        <span className="text-muted-foreground">{deltaSuffix}</span>
      </div>
    </Card>
  );
}

function PulseRow({
  label,
  value,
  pct,
  hint,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  hint: string;
  tone: "ok" | "warn";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-display">{value}</span>
      </div>
      <Progress
        value={pct}
        className={"mt-2 h-1.5 " + (tone === "warn" ? "[&>div]:bg-[oklch(0.7_0.15_55)]" : "")}
      />
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}

import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  DollarSign,
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
import {
  useChannelMix,
  useFoodCostSummary,
  useProductMix,
  useSalesTrend,
  useTopItems,
} from "@/lib/pos/queries";
import { useInventoryItems, useRealInvoices } from "@/lib/boh/queries";
import { useReviews } from "@/lib/reviews/queries";
import { useSearchConsoleConnection, useSearchConsoleOverview } from "@/lib/seo/queries";

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
  // A real zero-count backlog item (e.g. no reviews awaiting reply
  // right now) still shows in the list — this keeps it visually calm
  // instead of implying urgency that isn't real.
  muted: "bg-muted text-muted-foreground border-border",
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

// Cycled across however many real revenue centers this restaurant
// actually has configured in Toast — not a fixed 4-category palette,
// since that count varies per tenant.
const CHANNEL_MIX_COLORS = [
  "var(--color-primary)",
  "oklch(0.72 0.13 55)",
  "oklch(0.82 0.09 80)",
  "oklch(0.78 0.04 70)",
  "oklch(0.6 0.1 280)",
];

// Same par - on-hand + 15% weekly-usage safety-stock math inventory.tsx's
// "Auto-fill cart"/hero reorder summary already uses — replicated here
// (not imported) to match this file's existing per-file-duplication
// convention for small local helpers.
function suggestedQty(item: { par: number; onHand: number; weeklyUsage: number }) {
  const base = Math.max(0, item.par - item.onHand);
  const safety = Math.ceil(item.weeklyUsage * 0.15);
  return base > 0 ? base + safety : 0;
}

function Overview() {
  const { data: revenueData = [] } = useSalesTrend(7);
  const { data: topItems = [] } = useTopItems(7, 4);
  const { data: foodCost } = useFoodCostSummary(7);
  const foodCostDisplay = foodCostKpi(foodCost);

  const { data: productMixItems = [] } = useProductMix(7);
  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: realInvoices = [] } = useRealInvoices();
  const { data: reviews = [] } = useReviews();
  const { data: scConnection } = useSearchConsoleConnection();
  const isSeoConnected = !!scConnection;
  const { data: scOverview } = useSearchConsoleOverview(isSeoConnected);
  const { data: channelMix = [] } = useChannelMix(7);

  const netSales = useMemo(() => {
    const current = revenueData.reduce((s, d) => s + d.revenue, 0);
    const prior = revenueData.reduce((s, d) => s + d.lastWeek, 0);
    return {
      value: current,
      delta: prior > 0 ? ((current - prior) / prior) * 100 : null,
    };
  }, [revenueData]);

  const moduleTiles = useMemo(() => {
    // Product Mix — same revenueWk/soldWk aggregation product-mix.tsx's
    // own totals memo uses.
    const pmRevenue = productMixItems.reduce((s, i) => s + i.revenueWk, 0);
    const pmPrevRevenue = productMixItems.reduce((s, i) => s + i.revenuePrevWk, 0);
    const pmUnits = productMixItems.reduce((s, i) => s + i.soldWk, 0);
    const pmDelta = pmPrevRevenue > 0 ? ((pmRevenue - pmPrevRevenue) / pmPrevRevenue) * 100 : null;

    // Inventory — same par-level reorder math as the Inventory page's
    // own hero strip.
    const needsReorder = inventoryItems.filter((i) => suggestedQty(i) > 0);
    const reorderTotal = needsReorder.reduce((s, i) => s + suggestedQty(i) * i.cost, 0);
    const reorderVendors = new Set(
      needsReorder.map((i) => i.vendorId).filter((id): id is string => !!id),
    ).size;

    // Invoices — MTD approved spend/savings + real pending-review backlog.
    const now = new Date();
    const approvedThisMonth = realInvoices.filter((i) => {
      if (i.status !== "approved") return false;
      const d = new Date(i.invoiceDate ?? i.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const mtdSpendCents = approvedThisMonth.reduce((s, i) => s + (i.totalCents ?? 0), 0);
    const mtdSavedCents = approvedThisMonth.reduce((s, i) => s + (i.discountCents ?? 0), 0);
    const pendingReview = realInvoices.filter((i) => i.status === "pending_review").length;

    // Reviews — same avg-rating sample-size gate as the Reviews page.
    const needsReply = reviews.filter(
      (r) => r.status === "drafted" || r.status === "approved_pending_post",
    ).length;
    const avgRating =
      reviews.length >= 5 ? reviews.reduce((s, r) => s + r.starRating, 0) / reviews.length : null;

    // SEO — real avg position + clicks over whatever window
    // useSearchConsoleOverview returns (8 weeks, same as the SEO page).
    const scRows = scOverview?.rows ?? [];
    const totalClicks = scRows.reduce((s, r) => s + r.clicks, 0);
    const avgPosition =
      scRows.length > 0 ? scRows.reduce((s, r) => s + r.position, 0) / scRows.length : null;

    return [
      {
        to: "/product-mix",
        icon: PieIcon,
        label: "Product Mix",
        metric: `$${(pmRevenue / 1000).toFixed(1)}k`,
        sub: `this week · ${pmUnits.toLocaleString()} items sold`,
        delta: pmDelta != null ? `${pmDelta >= 0 ? "+" : ""}${pmDelta.toFixed(1)}%` : "—",
        deltaPositive: pmDelta != null ? pmDelta >= 0 : undefined,
      },
      {
        to: "/inventory",
        icon: Package,
        label: "Inventory",
        metric: `${needsReorder.length} below par`,
        sub: `$${reorderTotal.toFixed(0)} smart cart pending`,
        delta: `${reorderVendors} vendor${reorderVendors === 1 ? "" : "s"}`,
        deltaPositive: undefined,
      },
      {
        to: "/invoices",
        icon: Receipt,
        label: "Invoices",
        metric: `$${(mtdSpendCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        sub: `MTD spend · $${(mtdSavedCents / 100).toFixed(0)} saved`,
        delta: `${pendingReview} to review`,
        deltaPositive: pendingReview === 0,
      },
      {
        to: "/reviews",
        icon: Star,
        label: "Reviews",
        metric: avgRating != null ? `${avgRating.toFixed(1)} ★` : "—",
        sub: `${reviews.length.toLocaleString()} reviews · ${needsReply} need reply`,
        delta: needsReply === 0 ? "all caught up" : `${needsReply} pending`,
        deltaPositive: needsReply === 0,
      },
      {
        to: "/seo",
        icon: Search,
        label: "SEO",
        metric: !isSeoConnected
          ? "Not connected"
          : avgPosition != null
            ? `Avg #${avgPosition.toFixed(1)}`
            : "—",
        sub: !isSeoConnected
          ? "Connect Search Console"
          : `${totalClicks.toLocaleString()} clicks, last 8 wks`,
        delta: isSeoConnected ? "Search Console" : "—",
        deltaPositive: undefined,
      },
    ];
  }, [productMixItems, inventoryItems, realInvoices, reviews, scOverview, isSeoConnected]);

  const notBuiltTiles = [
    { to: "/marketing", icon: Megaphone, label: "Marketing" },
    { to: "/loyalty", icon: Gift, label: "Loyalty" },
    { to: "/scheduling", icon: CalendarClock, label: "Scheduling" },
  ];

  // Real, actionable backlog counts — same source data/math as the
  // module tiles above, just reframed as "what needs a human today"
  // instead of a per-module snapshot.
  const agentSignals = useMemo(() => {
    const needsReorder = inventoryItems.filter((i) => suggestedQty(i) > 0);
    const needsReply = reviews.filter(
      (r) => r.status === "drafted" || r.status === "approved_pending_post",
    ).length;
    const pendingReview = realInvoices.filter((i) => i.status === "pending_review").length;

    return [
      {
        tag: "Inventory",
        tone: "primary",
        count: needsReorder.length,
        title:
          needsReorder.length > 0
            ? `${needsReorder.length} item${needsReorder.length === 1 ? "" : "s"} below par`
            : "Nothing below par right now",
        body:
          needsReorder.length > 0
            ? "Real par-level math from on-hand counts and weekly usage."
            : "All tracked ingredients are at or above par.",
        cta: "Review cart",
        to: "/inventory",
        icon: Package,
      },
      {
        tag: "Reviews",
        tone: "amber",
        count: needsReply,
        title:
          needsReply > 0 ? `${needsReply} reviews awaiting reply` : "No reviews awaiting reply",
        body:
          needsReply > 0
            ? "Real Google reviews with an AI-drafted reply ready to approve."
            : "You're caught up on real Google reviews.",
        cta: "Open inbox",
        to: "/reviews",
        icon: Star,
      },
      {
        tag: "Invoices",
        tone: "ink",
        count: pendingReview,
        title:
          pendingReview > 0
            ? `${pendingReview} invoice${pendingReview === 1 ? "" : "s"} pending review`
            : "No invoices pending review",
        body:
          pendingReview > 0
            ? "Real invoices waiting on a vendor match or approval."
            : "Every real invoice has been reviewed.",
        cta: "Review invoices",
        to: "/invoices",
        icon: Receipt,
      },
    ];
  }, [inventoryItems, reviews, realInvoices]);

  return (
    <>
      <Topbar eyebrow="Thursday · June 25 · West Village" title="Good evening, Bali" />
      <main className="space-y-8 px-6 py-8">
        {/* Agents working for you — real, actionable backlog counts,
            reusing the exact same hooks/data as the module tiles below. */}
        <section>
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Real backlog
                </div>
                <h2 className="mt-1 font-display text-xl">What needs you today</h2>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-primary/30 bg-primary/10 text-primary"
              >
                <Brain className="mr-1 h-3 w-3" /> {agentSignals.filter((s) => s.count > 0).length}{" "}
                {agentSignals.filter((s) => s.count > 0).length === 1 ? "action" : "actions"}
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {agentSignals.map((s) => (
                <Link
                  key={s.tag}
                  to={s.to}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                      s.count > 0 ? toneTile[s.tone] : toneTile.muted
                    }`}
                  >
                    <s.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {s.tag}
                    </div>
                    <div className="mt-0.5 truncate font-medium">{s.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.body}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
                  >
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
            <div className="hidden text-xs text-muted-foreground sm:block">
              Click any tile to dive in
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {moduleTiles.map((t) => (
              <ModuleTile key={t.to} {...t} />
            ))}
            {notBuiltTiles.map((t) => (
              <ModuleTile
                key={t.to}
                to={t.to}
                icon={t.icon}
                label={t.label}
                metric="Not built yet"
                sub="No real data behind this page yet"
                delta="—"
                notBuilt
              />
            ))}
          </div>
        </section>

        {/* Revenue + Channel mix */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Card className="p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Revenue
                </div>
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="lastWeek"
                    stroke="oklch(0.78 0.04 70)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Where sales come from
            </div>
            <h2 className="mt-1 font-display text-2xl">Channel mix</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Real revenue by Toast revenue center, last 7 days
            </p>
            {channelMix.length === 0 ? (
              <div className="mt-6 flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No real order data for this period yet.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelMix}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {channelMix.map((c, i) => (
                          <Cell
                            key={c.name}
                            fill={CHANNEL_MIX_COLORS[i % CHANNEL_MIX_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {channelMix.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: CHANNEL_MIX_COLORS[i % CHANNEL_MIX_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="ml-2 font-display text-sm">{c.value.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* KPI row */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi
            icon={DollarSign}
            label="Net sales (7d)"
            value={`$${netSales.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            delta={
              netSales.delta != null
                ? `${netSales.delta >= 0 ? "+" : ""}${netSales.delta.toFixed(1)}%`
                : "—"
            }
            positive={netSales.delta != null ? netSales.delta >= 0 : undefined}
          />
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
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Product mix
                </div>
                <h2 className="mt-1 font-display text-xl">Top sellers tonight</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/product-mix">Open</Link>
              </Button>
            </div>
            <div className="h-[260px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topItems}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
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
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Today
                </div>
                <h2 className="mt-1 font-display text-xl">Your agenda</h2>
              </div>
              <Badge variant="outline" className="rounded-full">
                {todaysAgenda.length}
              </Badge>
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
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {a.module}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Operational pulse
                </div>
                <h2 className="mt-1 font-display text-xl">House health</h2>
              </div>
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-primary/30 bg-primary/10 text-primary"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Live
              </Badge>
            </div>
            <div className="space-y-5 p-6">
              <PulseRow
                label="Kitchen ticket time"
                value="11m 20s"
                pct={78}
                hint="goal < 12m"
                tone="ok"
              />
              <PulseRow label="Bar wait" value="6m" pct={62} hint="trending up" tone="ok" />
              <PulseRow label="Table turn" value="68m" pct={92} hint="goal 65m" tone="warn" />
              <PulseRow label="Open tabs" value="9 · $1,842" pct={45} hint="oldest 38m" tone="ok" />
              <div className="flex items-center gap-2 rounded-lg border border-[oklch(0.85_0.08_75)] bg-[oklch(0.96_0.04_85)] p-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-[oklch(0.55_0.15_50)]" />
                <span className="text-[oklch(0.35_0.08_50)]">
                  Patio 7 has been on first course 22 min — check in.
                </span>
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
  notBuilt,
}: {
  to: string;
  icon: typeof Package;
  label: string;
  metric: string;
  sub: string;
  delta: string;
  deltaPositive?: boolean;
  notBuilt?: boolean;
}) {
  return (
    <Link to={to} className="group block">
      <Card
        className={
          "h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-card" +
          (notBuilt ? " border-dashed opacity-70" : "")
        }
      >
        <div className="flex items-start justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div
          className={
            "mt-1 font-display text-2xl leading-tight" + (notBuilt ? " text-muted-foreground" : "")
          }
        >
          {metric}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
        {!notBuilt && (
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
        )}
      </Card>
    </Link>
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
          <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 font-display text-xl">{value}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        <span className={positive ? "text-[var(--color-success)]" : "text-muted-foreground"}>
          {delta}
        </span>
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

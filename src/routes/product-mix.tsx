import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProductMix, useUpdateItemCost, useSalesTrend, useOrderCount, type RealMenuItem } from "@/lib/pos/queries";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  Filter,
  GitCompare,
  Link2,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  Utensils,
  DollarSign,
  Pencil,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/product-mix")({
  head: () => ({
    meta: [
      { title: "Product Mix · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Menu engineering for Thrasher's Pub — stars, plowhorses, puzzles & dogs by category and daypart.",
      },
    ],
  }),
  component: ProductMixPage,
});

// ---------- Types ----------
// "Unpriced" covers items with no cost_cents entered yet — quadrant
// classification needs both popularity and margin, so an item with
// unknown cost can't be placed until someone fills in a cost.
type Quadrant = "Star" | "Plowhorse" | "Puzzle" | "Dog" | "Unpriced";
type Category = string;

type MenuItem = RealMenuItem;

function rangeToDays(range: string): number {
  switch (range) {
    case "Today":
      return 1;
    case "Last 28 days":
      return 28;
    case "Quarter":
      return 90;
    default:
      return 7;
  }
}

const PALETTE = {
  ink: "hsl(var(--foreground))",
  terracotta: "#c4654a",
  olive: "#87a878",
  amber: "#d4a574",
  rose: "#c17c74",
  muted: "hsl(var(--muted-foreground))",
};

const QUAD_COLOR: Record<Quadrant, string> = {
  Star: "#87a878",
  Plowhorse: "#d4a574",
  Puzzle: "#7da3c2",
  Dog: "#c17c74",
  Unpriced: "#9c9890",
};

function quadrant(item: MenuItem, popMedian: number, marginMedian: number): Quadrant {
  if (item.cost == null) return "Unpriced";
  const margin = item.price - item.cost;
  const pop = item.soldWk;
  if (pop >= popMedian && margin >= marginMedian) return "Star";
  if (pop >= popMedian && margin < marginMedian) return "Plowhorse";
  if (pop < popMedian && margin >= marginMedian) return "Puzzle";
  return "Dog";
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function usd(n: number) {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ---------- Page ----------
function ProductMixPage() {
  const [range, setRange] = useState("Last 7 days");
  const [cat, setCat] = useState<Category | "All">("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const days = rangeToDays(range);
  const { data: items = [], isLoading, error } = useProductMix(days);
  const { data: dailyRevenue = [] } = useSalesTrend(days);
  const { data: orderCount = 0 } = useOrderCount(days);
  const updateCost = useUpdateItemCost();

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);

  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (q === "" || i.name.toLowerCase().includes(q.toLowerCase())),
    );
  }, [items, cat, q]);

  const popMedian = useMemo(() => {
    if (items.length === 0) return 0;
    const arr = [...items].sort((a, b) => a.soldWk - b.soldWk);
    return arr[Math.floor(arr.length / 2)].soldWk;
  }, [items]);
  const marginMedian = useMemo(() => {
    const priced = items.filter((i) => i.cost != null);
    if (priced.length === 0) return 0;
    const arr = [...priced].sort((a, b) => a.price - a.cost! - (b.price - b.cost!));
    const mid = arr[Math.floor(arr.length / 2)];
    return mid.price - mid.cost!;
  }, [items]);

  const totals = useMemo(() => {
    const revenue = items.reduce((s, i) => s + i.price * i.soldWk, 0);
    const prevRevenue = items.reduce((s, i) => s + i.price * i.soldPrevWk, 0);
    const cogs = items.reduce((s, i) => s + (i.cost ?? 0) * i.soldWk, 0);
    const units = items.reduce((s, i) => s + i.soldWk, 0);
    const prevUnits = items.reduce((s, i) => s + i.soldPrevWk, 0);
    const stars = items.filter((i) => quadrant(i, popMedian, marginMedian) === "Star").length;
    return {
      revenue,
      revenueDelta: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null,
      cogs,
      grossMargin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
      units,
      unitsDelta: prevUnits > 0 ? units - prevUnits : null,
      avgCheck: orderCount > 0 ? revenue / orderCount : 0,
      stars,
    };
  }, [items, popMedian, marginMedian, orderCount]);

  const topMovers = useMemo(() => {
    return [...items]
      .map((i) => ({
        ...i,
        delta: i.soldPrevWk > 0 ? ((i.soldWk - i.soldPrevWk) / i.soldPrevWk) * 100 : i.soldWk > 0 ? 100 : 0,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Topbar eyebrow="Menu performance" title="Product Mix" />
      <main className="px-8 py-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Menu performance
            </p>
            <h1 className="font-serif text-4xl text-foreground">Product Mix</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              See which dishes carry the room, which ones drain it, and where the menu wants a
              nudge. Tracked against the prior period's sales.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-44 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="Last 7 days">Last 7 days</SelectItem>
                <SelectItem value="Last 28 days">Last 28 days</SelectItem>
                <SelectItem value="Quarter">This quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <GitCompare className="h-4 w-4" /> Compare
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </header>

        {/* POS sync strip */}
        <PosSyncStrip />

        {isLoading && (
          <div className="text-sm text-muted-foreground">Loading sales data…</div>
        )}
        {error && (
          <div className="text-sm text-[#a8453a]">Couldn't load sales data: {(error as Error).message}</div>
        )}

        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Kpi
            label="Net revenue"
            value={usd(totals.revenue)}
            delta={totals.revenueDelta != null ? `${totals.revenueDelta >= 0 ? "+" : ""}${totals.revenueDelta.toFixed(1)}%` : undefined}
            up={totals.revenueDelta != null ? totals.revenueDelta >= 0 : undefined}
            icon={DollarSign}
          />
          <Kpi label="Gross margin" value={`${totals.grossMargin.toFixed(1)}%`} icon={TrendingUp} />
          <Kpi
            label="Items sold"
            value={fmt(totals.units)}
            delta={totals.unitsDelta != null ? `${totals.unitsDelta >= 0 ? "+" : ""}${fmt(totals.unitsDelta)}` : undefined}
            up={totals.unitsDelta != null ? totals.unitsDelta >= 0 : undefined}
            icon={Utensils}
          />
          <Kpi label="Avg check" value={`$${totals.avgCheck.toFixed(2)}`} icon={Tag} />
          <Kpi label="Star items" value={`${totals.stars}`} icon={Award} />
        </section>


        {/* Daily revenue */}
        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Daily revenue
            </p>
            <h3 className="font-serif text-2xl mb-4">Net sales by day</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="revenue" name="This period" fill={PALETTE.terracotta} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lastWeek" name="Same day, prior week" fill={PALETTE.amber} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Top movers */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                Week-over-week
              </p>
              <h3 className="font-serif text-2xl">Top movers</h3>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topMovers.map((m) => {
              const up = m.delta >= 0;
              return (
                <Card
                  key={m.id}
                  className="p-4 cursor-pointer hover:border-[#c4654a]/40 transition"
                  onClick={() => setSelected(m)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.category} · {m.soldWk} sold
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`gap-1 ${up ? "border-[#87a878]/40 text-[#5a7d4a] bg-[#87a878]/10" : "border-[#c17c74]/40 text-[#a8453a] bg-[#c17c74]/10"}`}
                    >
                      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {up ? "+" : ""}
                      {m.delta.toFixed(1)}%
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Tabs: detailed views */}
        <Tabs defaultValue="items" className="space-y-4">
          <TabsList className="bg-card border">
            <TabsTrigger value="items">All items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="dayparts">Dayparts</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers & attach</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* ITEMS */}
          <TabsContent value="items">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search menu items…"
                    className="pl-9 bg-background"
                  />
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  {(["All", ...categories] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCat(c as Category | "All")}
                      className={`px-3 py-1.5 rounded-full border transition ${
                        cat === c
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card border-border hover:border-foreground/30"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-3.5 w-3.5" /> More filters
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
                      <th className="text-left py-2 px-3 font-medium">Item</th>
                      <th className="text-left py-2 px-3 font-medium">Category</th>
                      <th className="text-right py-2 px-3 font-medium">Price</th>
                      <th className="text-right py-2 px-3 font-medium">Cost</th>
                      <th className="text-right py-2 px-3 font-medium">Margin</th>
                      <th className="text-right py-2 px-3 font-medium">Sold</th>
                      <th className="text-right py-2 px-3 font-medium">WoW</th>
                      <th className="text-right py-2 px-3 font-medium">Revenue</th>
                      <th className="text-left py-2 px-3 font-medium">Quadrant</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => {
                      const margin = i.cost != null ? i.price - i.cost : null;
                      const marginPct = margin != null ? (margin / i.price) * 100 : null;
                      const wow = i.soldPrevWk > 0 ? ((i.soldWk - i.soldPrevWk) / i.soldPrevWk) * 100 : i.soldWk > 0 ? 100 : 0;
                      const q = quadrant(i, popMedian, marginMedian);
                      return (
                        <tr
                          key={i.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelected(i)}
                        >
                          <td className="py-3 px-3">
                            <div className="font-medium">{i.name}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="font-normal">
                              {i.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">${i.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                            {i.cost != null ? `$${i.cost.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {margin != null ? (
                              <>
                                <div className="font-mono">${margin.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {marginPct!.toFixed(0)}%
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Add cost</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{i.soldWk}</td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`text-xs font-medium ${wow >= 0 ? "text-[#5a7d4a]" : "text-[#a8453a]"}`}
                            >
                              {wow >= 0 ? "+" : ""}
                              {wow.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">
                            ${(i.soldWk * i.price).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              className="font-normal text-xs"
                              style={{
                                background: `${QUAD_COLOR[q]}22`,
                                color: QUAD_COLOR[q],
                                border: `1px solid ${QUAD_COLOR[q]}55`,
                              }}
                            >
                              {q}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* CATEGORIES */}
          <TabsContent value="categories">
            <div className="grid md:grid-cols-2 gap-4">
              {categories.map((c) => {
                const list = items.filter((i) => i.category === c);
                const rev = list.reduce((s, i) => s + i.price * i.soldWk, 0);
                const cogs = list.reduce((s, i) => s + (i.cost ?? 0) * i.soldWk, 0);
                const units = list.reduce((s, i) => s + i.soldWk, 0);
                const share = totals.revenue > 0 ? (rev / totals.revenue) * 100 : 0;
                const priced = list.filter((i) => i.cost != null).length;
                const top = [...list].sort((a, b) => b.soldWk * b.price - a.soldWk * a.price).slice(0, 3);
                return (
                  <Card key={c} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center">
                          <Utensils className="h-5 w-5 text-[#c4654a]" />
                        </div>
                        <div>
                          <div className="font-serif text-lg">{c}</div>
                          <div className="text-xs text-muted-foreground">
                            {list.length} items · {fmt(units)} sold
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg">{usd(rev)}</div>
                        <div className="text-xs text-muted-foreground">{share.toFixed(1)}% of rev</div>
                      </div>
                    </div>
                    <Progress value={share} className="h-1.5 mb-4" />
                    <div className="text-xs text-muted-foreground mb-2">Top sellers</div>
                    <div className="space-y-1.5">
                      {top.map((t) => (
                        <div key={t.id} className="flex justify-between text-sm">
                          <span>{t.name}</span>
                          <span className="font-mono text-muted-foreground">{t.soldWk}</span>
                        </div>
                      ))}
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Margin</div>
                        <div className="font-mono text-sm">
                          {rev > 0 ? `${(((rev - cogs) / rev) * 100).toFixed(0)}%` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Avg price</div>
                        <div className="font-mono text-sm">
                          ${(list.reduce((s, i) => s + i.price, 0) / list.length).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Priced</div>
                        <div className="font-mono text-sm">
                          {priced}/{list.length}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* DAYPARTS */}
          <TabsContent value="dayparts">
            <Card className="p-6">
              <div className="grid lg:grid-cols-4 gap-4 mb-6">
                {[
                  { name: "Lunch", hours: "11a–3p", rev: "$8,420", top: "Pub Burger", share: 22 },
                  { name: "Happy Hour", hours: "3p–6p", rev: "$4,180", top: "Stella Pint", share: 11 },
                  { name: "Dinner", hours: "6p–10p", rev: "$18,940", top: "Fish & Chips", share: 49 },
                  { name: "Late night", hours: "10p–close", rev: "$6,860", top: "Wings (10pc)", share: 18 },
                ].map((d) => (
                  <div key={d.name} className="p-4 rounded-lg border bg-muted/20">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {d.hours}
                    </div>
                    <div className="font-serif text-xl mt-1">{d.name}</div>
                    <div className="font-mono text-2xl mt-2">{d.rev}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.share}% of week</div>
                    <Separator className="my-3" />
                    <div className="text-xs text-muted-foreground">Best seller</div>
                    <div className="text-sm font-medium">{d.top}</div>
                  </div>
                ))}
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      { hr: "11a", food: 60, drinks: 30 },
                      { hr: "12p", food: 140, drinks: 60 },
                      { hr: "1p", food: 180, drinks: 80 },
                      { hr: "2p", food: 90, drinks: 50 },
                      { hr: "3p", food: 40, drinks: 70 },
                      { hr: "4p", food: 50, drinks: 120 },
                      { hr: "5p", food: 80, drinks: 180 },
                      { hr: "6p", food: 220, drinks: 220 },
                      { hr: "7p", food: 320, drinks: 280 },
                      { hr: "8p", food: 340, drinks: 320 },
                      { hr: "9p", food: 240, drinks: 280 },
                      { hr: "10p", food: 140, drinks: 240 },
                      { hr: "11p", food: 80, drinks: 180 },
                    ]}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                    <XAxis dataKey="hr" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="food"
                      stroke={PALETTE.terracotta}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="drinks"
                      stroke={PALETTE.olive}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* MODIFIERS */}
          <TabsContent value="modifiers">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Attach rate leaders
                </p>
                <h3 className="font-serif text-xl mb-4">What rides along</h3>
                <div className="space-y-3">
                  {[
                    { pair: "Pub Burger + Hand-cut Fries", rate: 72, lift: "+$4.10" },
                    { pair: "Wings + Guinness Pint", rate: 54, lift: "+$9.00" },
                    { pair: "Fish & Chips + Stella Pint", rate: 41, lift: "+$8.00" },
                    { pair: "Caesar Salad + Iced Tea", rate: 28, lift: "+$4.00" },
                    { pair: "Sticky Toffee + Espresso Martini", rate: 19, lift: "+$15.00" },
                  ].map((p) => (
                    <div key={p.pair}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{p.pair}</span>
                        <span className="font-mono text-muted-foreground">
                          {p.rate}% · {p.lift}
                        </span>
                      </div>
                      <Progress value={p.rate} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Modifier hits
                </p>
                <h3 className="font-serif text-xl mb-4">Most-used modifiers</h3>
                <div className="space-y-2.5">
                  {[
                    { name: "Add bacon", count: 142, rev: "+$284" },
                    { name: "Sub gluten-free bun", count: 88, rev: "+$176" },
                    { name: "Extra cheese", count: 74, rev: "+$111" },
                    { name: "Spicy buffalo (wings)", count: 218, rev: "$0" },
                    { name: "Make it a double", count: 64, rev: "+$320" },
                    { name: "Sub side salad", count: 41, rev: "+$82" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-sm">
                      <div>
                        <div>{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.count} uses / wk</div>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {m.rev}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          </TabsContent>

          {/* TRENDS */}
          <TabsContent value="trends">
            <Card className="p-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    12-week trend
                  </p>
                  <h3 className="font-serif text-2xl">Top 5 items velocity</h3>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={Array.from({ length: 12 }).map((_, w) => ({
                      week: `W${14 + w}`,
                      "Pub Burger": 320 + Math.round(Math.sin(w / 2) * 30 + w * 7),
                      "Guinness Pint": 500 + Math.round(Math.cos(w / 3) * 40 + w * 9),
                      "Wings (10pc)": 240 + Math.round(Math.sin(w / 1.5) * 25 + w * 10),
                      "Fish & Chips": 150 + Math.round(Math.cos(w / 2) * 15 + w * 2),
                      "Espresso Martini": 80 + Math.round(w * 6 + Math.sin(w) * 8),
                    }))}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {[
                      ["Pub Burger", PALETTE.terracotta],
                      ["Guinness Pint", "#3a2418"],
                      ["Wings (10pc)", PALETTE.amber],
                      ["Fish & Chips", PALETTE.olive],
                      ["Espresso Martini", PALETTE.rose],
                    ].map(([name, color]) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>

          {/* AI ENGINEER */}
        </Tabs>
      </main>

      {/* Item drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{selected.category}</Badge>
                </div>
                <SheetTitle className="font-serif text-2xl">{selected.name}</SheetTitle>
                <SheetDescription>
                  ${selected.price.toFixed(2)} · {selected.soldWk} sold / wk
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    Cost per unit
                  </div>
                  <CostEditor
                    key={selected.id}
                    item={selected}
                    saving={updateCost.isPending}
                    onSave={(cents) =>
                      updateCost.mutate({ locationId: selected.locationId, posId: selected.id, costCents: cents })
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat
                    label="Margin"
                    value={selected.cost != null ? `$${(selected.price - selected.cost).toFixed(2)}` : "—"}
                  />
                  <Stat
                    label="Margin %"
                    value={
                      selected.cost != null
                        ? `${(((selected.price - selected.cost) / selected.price) * 100).toFixed(0)}%`
                        : "—"
                    }
                  />
                  <Stat label="Revenue / wk" value={usd(selected.soldWk * selected.price)} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    Quadrant
                  </div>
                  <div
                    className="p-3 rounded-md border text-sm"
                    style={{
                      background: `${QUAD_COLOR[quadrant(selected, popMedian, marginMedian)]}11`,
                      borderColor: `${QUAD_COLOR[quadrant(selected, popMedian, marginMedian)]}55`,
                    }}
                  >
                    {selected.cost != null ? (
                      <>
                        <strong>{quadrant(selected, popMedian, marginMedian)}</strong> — popularity{" "}
                        {selected.soldWk >= popMedian ? "above" : "below"} median, margin{" "}
                        {selected.price - selected.cost >= marginMedian ? "above" : "below"} median.
                      </>
                    ) : (
                      <>Add a cost above to classify this item.</>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    AI suggestion
                  </div>
                  <div className="p-3 rounded-md bg-[#fbf5ee] border border-[#e8d5b9] text-sm">
                    {selected.soldPrevWk === 0
                      ? "No prior-period sales to compare yet."
                      : selected.soldWk > selected.soldPrevWk
                        ? `Demand growing ${(((selected.soldWk - selected.soldPrevWk) / selected.soldPrevWk) * 100).toFixed(0)}%. Consider +$1 price test or feature on QR menu.`
                        : `Slipping ${(((selected.soldPrevWk - selected.soldWk) / selected.soldPrevWk) * 100).toFixed(0)}%. Try repositioning on menu or pairing with a fast attach item.`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-[#c4654a] hover:bg-[#a8553e] text-white">
                    Edit on menu
                  </Button>
                  <Button variant="outline" className="flex-1">
                    View on POS
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="font-serif text-2xl mt-1">{value}</div>
        </div>
        <div className="h-8 w-8 rounded-md bg-muted grid place-items-center text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs ${up ? "text-[#5a7d4a]" : "text-[#a8453a]"}`}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md border bg-muted/20">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-mono text-base mt-0.5">{value}</div>
    </div>
  );
}

// Toast doesn't expose item cost via the Orders/Menus API, so margin
// needs a manually-entered cost per item — this writes it straight to
// menu_items.cost_cents (RLS-scoped to the signed-in user's restaurant).
function CostEditor({
  item,
  onSave,
  saving,
}: {
  item: MenuItem;
  onSave: (cents: number | null) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(item.cost != null ? item.cost.toFixed(2) : "");
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">$</span>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-24"
        placeholder="0.00"
      />
      <Button
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() => {
          const num = parseFloat(value);
          onSave(Number.isFinite(num) && num >= 0 ? Math.round(num * 100) : null);
        }}
      >
        {saving ? "Saving…" : "Save cost"}
      </Button>
    </div>
  );
}

// ---------- POS sync strip ----------
function PosSyncStrip() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("3 min ago");
  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync("just now");
    }, 1200);
  };
  return (
    <Card className="p-4 border-[#e6dfd2] bg-[#fbf7f0]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-[#ff4f00]/10 text-[#ff4f00] grid place-items-center">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Toast POS</span>
              <Badge
                variant="outline"
                className="gap-1 border-[#87a878]/40 text-[#5a7d4a] bg-[#87a878]/10"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#5a7d4a]" /> Connected
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last sync {lastSync}
              </span>
              <span>· Refreshing every 5 min</span>
              <span>· Thrasher's Pub — Main</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Link2 className="h-3.5 w-3.5" /> Map menu items
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="h-3.5 w-3.5" /> Integration settings
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Customize panel ----------
type Alias = { id: string; name: string; merges: string[]; category: string };
type RecipeOv = { id: string; name: string; posCost: number; recipeCost: number };
type Hidden = { id: string; name: string; reason: string };
type Daypart = { id: string; name: string; days: string; window: string };

function CustomizePanel() {
  const [recipes, setRecipes] = useState<RecipeOv[]>([
    { id: "m1", name: "Pub Burger", posCost: 5.2, recipeCost: 4.8 },
    { id: "m2", name: "Wings (10pc)", posCost: 4.1, recipeCost: 3.65 },
    { id: "m6", name: "Fish & Chips", posCost: 6.8, recipeCost: 6.2 },
  ]);
  const [aliases, setAliases] = useState<Alias[]>([
    {
      id: "a1",
      name: "Pub Burger",
      category: "Sandwiches",
      merges: ["PubBurger (tst_001)", "Pub Burger (tst_002)", "HH Burger (tst_004)"],
    },
    {
      id: "a2",
      name: "Wings (10pc)",
      category: "Apps",
      merges: ["Wings 10pc (tst_010)", "Wings 10 (tst_011)"],
    },
  ]);
  const [hidden, setHidden] = useState<Hidden[]>([
    { id: "h1", name: "Employee Meal", reason: "Employee meal" },
    { id: "h2", name: "TEST item — do not order", reason: "Test item" },
    { id: "h3", name: "Manager Comp", reason: "Comp" },
  ]);
  const [dayparts, setDayparts] = useState<Daypart[]>([
    { id: "dp1", name: "Brunch", days: "Sat–Sun", window: "10:00a – 2:00p" },
    { id: "dp2", name: "Happy Hour", days: "Mon–Fri", window: "3:00p – 6:00p" },
    { id: "dp3", name: "Late Night", days: "Thu–Sat", window: "10:00p – close" },
    { id: "dp4", name: "Game Day", days: "Sun", window: "12:00p – 11:00p" },
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e6dfd2] bg-[#fbf7f0] p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-[#c4654a] mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Layered on top of Toast</div>
          <p className="text-muted-foreground">
            Toast is the source of truth for sales. Anything you set here is applied at read-time —
            recipe costs override the POS cost for margin math, aliases collapse duplicate SKUs,
            hidden items disappear from mix charts, and custom dayparts replace the default
            lunch/dinner buckets.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recipe cost overrides */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Margin math
              </p>
              <h3 className="font-serif text-xl">Recipe cost overrides</h3>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Item</th>
                <th className="text-right py-2 font-medium">POS cost</th>
                <th className="text-right py-2 font-medium">Your recipe</th>
                <th className="text-right py-2 font-medium">Δ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => {
                const d = r.recipeCost - r.posCost;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      ${r.posCost.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <Input
                        type="number"
                        step="0.05"
                        value={r.recipeCost}
                        onChange={(e) =>
                          setRecipes((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, recipeCost: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className="h-8 w-24 text-right font-mono ml-auto"
                      />
                    </td>
                    <td
                      className={`py-2 text-right text-xs font-mono ${d < 0 ? "text-[#5a7d4a]" : "text-[#a8453a]"}`}
                    >
                      {d >= 0 ? "+" : ""}
                      {d.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setRecipes((rs) => rs.filter((x) => x.id !== r.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Item aliases / grouping */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Grouping</p>
              <h3 className="font-serif text-xl">Item aliases</h3>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> New alias
            </Button>
          </div>
          <div className="space-y-3">
            {aliases.map((a) => (
              <div key={a.id} className="p-3 rounded-md border bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <Badge variant="outline" className="mt-1 text-xs font-normal">
                      {a.category}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setAliases((xs) => xs.filter((x) => x.id !== a.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.merges.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] font-normal">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hidden items */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Cleanup
              </p>
              <h3 className="font-serif text-xl">Hidden from mix</h3>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <EyeOff className="h-3.5 w-3.5" /> Hide item
            </Button>
          </div>
          <div className="space-y-2">
            {hidden.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between p-2.5 rounded-md border bg-muted/20"
              >
                <div>
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.reason}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHidden((xs) => xs.filter((x) => x.id !== h.id))}
                >
                  Unhide
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">
              Hidden items still post to revenue in Sales — they just don't pollute the menu
              engineering quadrant.
            </p>
          </div>
        </Card>

        {/* Custom dayparts */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Time buckets
              </p>
              <h3 className="font-serif text-xl">Custom dayparts</h3>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> New daypart
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
                <th className="text-left py-2 font-medium">Name</th>
                <th className="text-left py-2 font-medium">Days</th>
                <th className="text-left py-2 font-medium">Window</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dayparts.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td className="py-2 text-muted-foreground">{d.days}</td>
                  <td className="py-2 text-muted-foreground font-mono text-xs">{d.window}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDayparts((xs) => xs.filter((x) => x.id !== d.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="p-5 bg-gradient-to-br from-[#fbf5ee] to-[#f1e3d3] border-[#e8d5b9]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#5a7d4a]" />
            <div>
              <div className="font-medium">Changes apply on the next sync</div>
              <div className="text-xs text-muted-foreground">
                Next Toast pull in ~2 min · or hit "Sync now" above
              </div>
            </div>
          </div>
          <Button className="bg-[#c4654a] hover:bg-[#a8553e] text-white">Save all</Button>
        </div>
      </Card>
    </div>
  );
}

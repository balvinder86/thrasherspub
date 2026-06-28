import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Brain,
  CheckCircle2,
  ChefHat,
  Clock,
  Download,
  EyeOff,
  Filter,
  Flame,
  GitCompare,
  Layers,
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
  TrendingDown,
  TrendingUp,
  Utensils,
  Wine,
  Wand2,
  AlertTriangle,
  DollarSign,
  Eye,
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
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
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

// ---------- Types & mock data ----------
type Quadrant = "Star" | "Plowhorse" | "Puzzle" | "Dog";
type Category = "Food" | "Beverages" | "Alcohol" | "Desserts";

type MenuItem = {
  id: string;
  name: string;
  category: Category;
  station: string;
  price: number;
  cost: number;
  soldWk: number;
  soldPrevWk: number;
  attachRate?: number; // % of checks
  rating?: number; // 1-5
  voids?: number;
  prepMin: number;
  modifiers?: string[];
};

const ITEMS: MenuItem[] = [
  { id: "m1", name: "Pub Burger", category: "Food", station: "Grill", price: 18, cost: 5.2, soldWk: 412, soldPrevWk: 388, attachRate: 38, rating: 4.7, voids: 2, prepMin: 9, modifiers: ["Add bacon", "Sub gf bun", "Cheddar"] },
  { id: "m2", name: "Wings (10pc)", category: "Food", station: "Fryer", price: 16, cost: 4.1, soldWk: 360, soldPrevWk: 305, attachRate: 31, rating: 4.6, voids: 1, prepMin: 11, modifiers: ["Buffalo", "BBQ", "Dry rub"] },
  { id: "m3", name: "Hand-cut Fries", category: "Food", station: "Fryer", price: 7, cost: 1.1, soldWk: 540, soldPrevWk: 510, attachRate: 56, rating: 4.5, voids: 0, prepMin: 6 },
  { id: "m4", name: "Beef Chili", category: "Food", station: "Sauté", price: 12, cost: 3.4, soldWk: 88, soldPrevWk: 102, attachRate: 6, rating: 4.2, voids: 4, prepMin: 7 },
  { id: "m5", name: "Caesar Salad", category: "Food", station: "Cold", price: 13, cost: 2.6, soldWk: 142, soldPrevWk: 138, attachRate: 11, rating: 4.4, voids: 1, prepMin: 5 },
  { id: "m6", name: "Fish & Chips", category: "Food", station: "Fryer", price: 22, cost: 6.8, soldWk: 168, soldPrevWk: 175, attachRate: 12, rating: 4.6, voids: 2, prepMin: 12 },
  { id: "m7", name: "Loaded Fries", category: "Food", station: "Fryer", price: 11, cost: 2.4, soldWk: 220, soldPrevWk: 198, attachRate: 18, rating: 4.5, voids: 1, prepMin: 7 },
  { id: "m8", name: "Grilled Cheese", category: "Food", station: "Grill", price: 10, cost: 2.0, soldWk: 64, soldPrevWk: 71, attachRate: 4, rating: 4.0, voids: 0, prepMin: 6 },
  { id: "m9", name: "Chicken Sandwich", category: "Food", station: "Grill", price: 16, cost: 4.4, soldWk: 198, soldPrevWk: 182, attachRate: 14, rating: 4.5, voids: 1, prepMin: 9 },
  { id: "m10", name: "BLT Wrap", category: "Food", station: "Cold", price: 12, cost: 3.0, soldWk: 76, soldPrevWk: 84, attachRate: 5, rating: 4.1, voids: 0, prepMin: 5 },

  { id: "d1", name: "Guinness Pint", category: "Alcohol", station: "Bar", price: 9, cost: 1.8, soldWk: 612, soldPrevWk: 588, attachRate: 48, rating: 4.8, voids: 0, prepMin: 2 },
  { id: "d2", name: "Stella Pint", category: "Alcohol", station: "Bar", price: 8, cost: 1.6, soldWk: 421, soldPrevWk: 410, attachRate: 32, rating: 4.6, voids: 0, prepMin: 1 },
  { id: "d3", name: "Old Fashioned", category: "Alcohol", station: "Bar", price: 14, cost: 2.1, soldWk: 188, soldPrevWk: 162, attachRate: 14, rating: 4.7, voids: 1, prepMin: 4 },
  { id: "d4", name: "Moscow Mule", category: "Alcohol", station: "Bar", price: 13, cost: 2.0, soldWk: 244, soldPrevWk: 220, attachRate: 19, rating: 4.6, voids: 0, prepMin: 3 },
  { id: "d5", name: "Espresso Martini", category: "Alcohol", station: "Bar", price: 15, cost: 2.6, soldWk: 156, soldPrevWk: 122, attachRate: 11, rating: 4.8, voids: 0, prepMin: 4 },
  { id: "d6", name: "Don Julio Margarita", category: "Alcohol", station: "Bar", price: 16, cost: 3.1, soldWk: 132, soldPrevWk: 142, attachRate: 9, rating: 4.5, voids: 1, prepMin: 4 },
  { id: "d7", name: "Whiskey Sour", category: "Alcohol", station: "Bar", price: 12, cost: 1.9, soldWk: 84, soldPrevWk: 96, attachRate: 6, rating: 4.3, voids: 0, prepMin: 3 },

  { id: "n1", name: "Fountain Coke", category: "Beverages", station: "Bar", price: 4, cost: 0.4, soldWk: 480, soldPrevWk: 472, attachRate: 38, rating: 4.5, voids: 0, prepMin: 1 },
  { id: "n2", name: "Iced Tea", category: "Beverages", station: "Bar", price: 4, cost: 0.3, soldWk: 188, soldPrevWk: 192, attachRate: 14, rating: 4.4, voids: 0, prepMin: 1 },

  { id: "x1", name: "Sticky Toffee Pudding", category: "Desserts", station: "Pastry", price: 9, cost: 2.1, soldWk: 92, soldPrevWk: 78, attachRate: 7, rating: 4.9, voids: 0, prepMin: 4 },
  { id: "x2", name: "Brownie Sundae", category: "Desserts", station: "Pastry", price: 10, cost: 2.4, soldWk: 58, soldPrevWk: 64, attachRate: 4, rating: 4.6, voids: 1, prepMin: 5 },
];

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
};

function quadrant(item: MenuItem, popMedian: number, marginMedian: number): Quadrant {
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

  const filtered = useMemo(() => {
    return ITEMS.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (q === "" || i.name.toLowerCase().includes(q.toLowerCase())),
    );
  }, [cat, q]);

  const popMedian = useMemo(() => {
    const arr = [...ITEMS].sort((a, b) => a.soldWk - b.soldWk);
    return arr[Math.floor(arr.length / 2)].soldWk;
  }, []);
  const marginMedian = useMemo(() => {
    const arr = [...ITEMS].sort((a, b) => a.price - a.cost - (b.price - b.cost));
    const mid = arr[Math.floor(arr.length / 2)];
    return mid.price - mid.cost;
  }, []);

  const totals = useMemo(() => {
    const revenue = ITEMS.reduce((s, i) => s + i.price * i.soldWk, 0);
    const cogs = ITEMS.reduce((s, i) => s + i.cost * i.soldWk, 0);
    const units = ITEMS.reduce((s, i) => s + i.soldWk, 0);
    const stars = ITEMS.filter((i) => quadrant(i, popMedian, marginMedian) === "Star").length;
    return {
      revenue,
      cogs,
      grossMargin: ((revenue - cogs) / revenue) * 100,
      units,
      avgCheck: revenue / (units / 3.4), // ~3.4 items per check guesstimate
      stars,
    };
  }, [popMedian, marginMedian]);

  const topMovers = useMemo(() => {
    return [...ITEMS]
      .map((i) => ({
        ...i,
        delta: ((i.soldWk - i.soldPrevWk) / i.soldPrevWk) * 100,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, []);

  const dailyMix = [
    { day: "Mon", food: 1620, drinks: 1180, dessert: 220 },
    { day: "Tue", food: 1480, drinks: 1080, dessert: 180 },
    { day: "Wed", food: 1820, drinks: 1380, dessert: 240 },
    { day: "Thu", food: 2010, drinks: 1640, dessert: 280 },
    { day: "Fri", food: 2880, drinks: 2840, dessert: 360 },
    { day: "Sat", food: 3120, drinks: 3160, dessert: 410 },
    { day: "Sun", food: 2240, drinks: 1880, dessert: 320 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Topbar eyebrow="Menu performance" title="Product Mix" />
      <main className="px-8 py-8 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Menu engineering
            </p>
            <h1 className="font-serif text-4xl text-foreground">Product Mix</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              See which dishes carry the room, which ones drain it, and where the menu wants a
              nudge. Engineered against last week's checks, voids, and ratings.
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

        {/* KPI row */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Kpi label="Net revenue" value={usd(totals.revenue)} delta="+8.4%" up icon={DollarSign} />
          <Kpi
            label="Gross margin"
            value={`${totals.grossMargin.toFixed(1)}%`}
            delta="+1.2 pts"
            up
            icon={TrendingUp}
          />
          <Kpi label="Items sold" value={fmt(totals.units)} delta="+312" up icon={Utensils} />
          <Kpi label="Avg check" value={`$${(totals.revenue / 1180).toFixed(2)}`} delta="+$1.40" up icon={Tag} />
          <Kpi label="Star items" value={`${totals.stars}`} delta="2 new" up icon={Award} />
        </section>

        {/* AI strip */}
        <Card className="p-6 bg-gradient-to-br from-[#fbf5ee] to-[#f1e3d3] border-[#e8d5b9]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex gap-4 items-start max-w-2xl">
              <div className="h-11 w-11 rounded-full bg-[#c4654a] text-white grid place-items-center shrink-0">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8b6f5e] mb-1">
                  Menu engineer · live
                </p>
                <h3 className="font-serif text-xl text-foreground mb-1">
                  3 menu moves could lift weekly margin by ~$1,840
                </h3>
                <p className="text-sm text-muted-foreground">
                  Re-price <strong>Espresso Martini</strong> +$1 (demand inelastic, 4.8★), retire{" "}
                  <strong>BLT Wrap</strong> (low attach, 4.1★), and promote{" "}
                  <strong>Sticky Toffee Pudding</strong> as a dessert upsell (4.9★, growing 18%).
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-background gap-2">
                <Eye className="h-4 w-4" /> See all 9 ideas
              </Button>
              <Button className="bg-[#c4654a] hover:bg-[#a8553e] text-white gap-2">
                <Wand2 className="h-4 w-4" /> Apply top 3
              </Button>
            </div>
          </div>
        </Card>

        {/* Two-column: Quadrant + Daily mix */}
        <section className="grid lg:grid-cols-3 gap-6">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Menu engineering matrix
                </p>
                <h3 className="font-serif text-2xl">Popularity × Margin</h3>
              </div>
              <div className="flex gap-3 text-xs">
                {(["Star", "Plowhorse", "Puzzle", "Dog"] as Quadrant[]).map((q) => (
                  <div key={q} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: QUAD_COLOR[q] }}
                    />
                    {q}
                  </div>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" />
                  <XAxis
                    type="number"
                    dataKey="margin"
                    name="Margin"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Contribution margin per unit ($)",
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 11,
                      fill: PALETTE.muted,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="soldWk"
                    name="Units"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Units / wk",
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 11,
                      fill: PALETTE.muted,
                    }}
                  />
                  <ZAxis type="number" dataKey="revenue" range={[60, 360]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as MenuItem & {
                        margin: number;
                        quad: Quadrant;
                      };
                      return (
                        <div className="rounded-md border bg-background p-3 text-xs shadow-md">
                          <div className="font-semibold mb-1">{p.name}</div>
                          <div className="text-muted-foreground">
                            {p.category} · {p.station}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>Sold</span>
                            <span className="text-right font-mono">{p.soldWk}/wk</span>
                            <span>Margin</span>
                            <span className="text-right font-mono">${p.margin.toFixed(2)}</span>
                            <span>Quadrant</span>
                            <span
                              className="text-right font-medium"
                              style={{ color: QUAD_COLOR[p.quad] }}
                            >
                              {p.quad}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={ITEMS.map((i) => ({
                      ...i,
                      margin: i.price - i.cost,
                      revenue: i.soldWk * i.price,
                      quad: quadrant(i, popMedian, marginMedian),
                    }))}
                  >
                    {ITEMS.map((i) => (
                      <Cell
                        key={i.id}
                        fill={QUAD_COLOR[quadrant(i, popMedian, marginMedian)]}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Bubble size = weekly revenue. Median lines split the four quadrants — protect Stars,
              fix Plowhorses, reposition Puzzles, retire Dogs.
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Daily mix
            </p>
            <h3 className="font-serif text-2xl mb-4">Revenue by service</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyMix}>
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
                  <Bar dataKey="food" stackId="a" fill={PALETTE.terracotta} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="drinks" stackId="a" fill={PALETTE.olive} />
                  <Bar dataKey="dessert" stackId="a" fill={PALETTE.amber} radius={[4, 4, 0, 0]} />
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
            <TabsTrigger value="engineer">AI engineer</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
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
                <div className="flex gap-1 text-xs">
                  {(["All", "Food", "Beverages", "Alcohol", "Desserts"] as const).map((c) => (
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
                      <th className="text-right py-2 px-3 font-medium">Rating</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((i) => {
                      const margin = i.price - i.cost;
                      const marginPct = (margin / i.price) * 100;
                      const wow = ((i.soldWk - i.soldPrevWk) / i.soldPrevWk) * 100;
                      const q = quadrant(i, popMedian, marginMedian);
                      return (
                        <tr
                          key={i.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => setSelected(i)}
                        >
                          <td className="py-3 px-3">
                            <div className="font-medium">{i.name}</div>
                            <div className="text-xs text-muted-foreground">{i.station}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="font-normal">
                              {i.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">${i.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                            ${i.cost.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-mono">${margin.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">
                              {marginPct.toFixed(0)}%
                            </div>
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
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 fill-[#d4a574] text-[#d4a574]" />
                              {i.rating?.toFixed(1)}
                            </span>
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
              {(["Food", "Alcohol", "Beverages", "Desserts"] as Category[]).map((c) => {
                const list = ITEMS.filter((i) => i.category === c);
                const rev = list.reduce((s, i) => s + i.price * i.soldWk, 0);
                const cogs = list.reduce((s, i) => s + i.cost * i.soldWk, 0);
                const units = list.reduce((s, i) => s + i.soldWk, 0);
                const share = (rev / totals.revenue) * 100;
                const top = [...list].sort((a, b) => b.soldWk * b.price - a.soldWk * a.price).slice(0, 3);
                return (
                  <Card key={c} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center">
                          {c === "Food" ? (
                            <ChefHat className="h-5 w-5 text-[#c4654a]" />
                          ) : c === "Alcohol" ? (
                            <Wine className="h-5 w-5 text-[#c4654a]" />
                          ) : c === "Beverages" ? (
                            <Layers className="h-5 w-5 text-[#c4654a]" />
                          ) : (
                            <Flame className="h-5 w-5 text-[#c4654a]" />
                          )}
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
                          {(((rev - cogs) / rev) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Avg price</div>
                        <div className="font-mono text-sm">
                          ${(list.reduce((s, i) => s + i.price, 0) / list.length).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Stations</div>
                        <div className="font-mono text-sm">
                          {new Set(list.map((i) => i.station)).size}
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

              <Card className="p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  Voids & 86'd
                </p>
                <h3 className="font-serif text-xl mb-3">Friction signals</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
                        <th className="text-left py-2 px-3 font-medium">Item</th>
                        <th className="text-right py-2 px-3 font-medium">Voids / wk</th>
                        <th className="text-right py-2 px-3 font-medium">Void rate</th>
                        <th className="text-right py-2 px-3 font-medium">Avg prep</th>
                        <th className="text-left py-2 px-3 font-medium">Likely cause</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ITEMS.filter((i) => (i.voids || 0) > 0)
                        .sort((a, b) => (b.voids || 0) - (a.voids || 0))
                        .map((i) => (
                          <tr key={i.id} className="border-b last:border-0">
                            <td className="py-2 px-3">{i.name}</td>
                            <td className="py-2 px-3 text-right font-mono">{i.voids}</td>
                            <td className="py-2 px-3 text-right font-mono">
                              {(((i.voids || 0) / i.soldWk) * 100).toFixed(1)}%
                            </td>
                            <td className="py-2 px-3 text-right font-mono">{i.prepMin}m</td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {i.prepMin >= 10
                                ? "Ticket time — kitchen bottleneck"
                                : "Modifier confusion / wrong build"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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
          <TabsContent value="engineer">
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-[#c4654a] text-white grid place-items-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl">Recommendations</h3>
                    <p className="text-xs text-muted-foreground">
                      Ranked by projected margin lift, low risk first
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: TrendingUp,
                      tone: "lift",
                      title: "Raise Espresso Martini to $16",
                      detail:
                        "4.8★, demand up 28% over 4 weeks, no price-sensitive cohort. Projected +$640/wk.",
                      tags: ["Price", "Low risk"],
                    },
                    {
                      icon: Award,
                      tone: "promote",
                      title: "Feature Sticky Toffee Pudding as dessert upsell",
                      detail:
                        "4.9★ and growing 18% WoW. Suggest as digital handheld card after entrée fire. +$420/wk.",
                      tags: ["Upsell", "POS prompt"],
                    },
                    {
                      icon: AlertTriangle,
                      tone: "retire",
                      title: "Retire BLT Wrap",
                      detail:
                        "Lowest attach (5%), -10% WoW, 4.1★. Frees cold station SKU. Reuse bacon for burger mod.",
                      tags: ["Retire", "Dog"],
                    },
                    {
                      icon: GitCompare,
                      tone: "swap",
                      title: "Re-engineer Beef Chili",
                      detail:
                        "Sold 88/wk but 4 voids — long ticket time. Add 'add to fries' modifier vs. standalone bowl.",
                      tags: ["Recipe", "Plowhorse"],
                    },
                    {
                      icon: Tag,
                      tone: "test",
                      title: "A/B price Loaded Fries $11 → $12",
                      detail:
                        "Elasticity model predicts ≤4% volume drop, +6% margin. Test Tues–Thu dinner.",
                      tags: ["Pricing test"],
                    },
                  ].map((r, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-8 w-8 rounded-md grid place-items-center shrink-0"
                          style={{
                            background:
                              r.tone === "retire"
                                ? "#c17c7422"
                                : r.tone === "lift"
                                  ? "#87a87822"
                                  : "#d4a57433",
                            color:
                              r.tone === "retire"
                                ? "#a8453a"
                                : r.tone === "lift"
                                  ? "#5a7d4a"
                                  : "#8b6f5e",
                          }}
                        >
                          <r.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-medium">{r.title}</div>
                            <div className="flex gap-1">
                              {r.tags.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{r.detail}</p>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" className="bg-[#c4654a] hover:bg-[#a8553e] text-white">
                              Apply
                            </Button>
                            <Button size="sm" variant="ghost">
                              Snooze
                            </Button>
                            <Button size="sm" variant="ghost">
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-serif text-xl mb-1">Engineer settings</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Tune how aggressive the AI gets with menu moves.
                </p>
                <div className="space-y-4 text-sm">
                  <Row label="Min sample size" value="≥ 60 units / wk" />
                  <Row label="Confidence threshold" value="85%" />
                  <Row label="Price elasticity model" value="Beta · log-log" />
                  <Row label="Auto-apply pricing" value="Off (review queue)" />
                  <Row label="Retire candidates need" value="2 weeks dog + < 4.3★" />
                  <Row label="Channels" value="POS, Online, QR menu" />
                </div>
                <Separator className="my-4" />
                <Button variant="outline" className="w-full gap-2">
                  <Brain className="h-4 w-4" /> Open agent rules
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* CUSTOMIZE */}
          <TabsContent value="customize">
            <CustomizePanel />
          </TabsContent>
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
                  <Badge variant="outline">{selected.station}</Badge>
                </div>
                <SheetTitle className="font-serif text-2xl">{selected.name}</SheetTitle>
                <SheetDescription>
                  ${selected.price.toFixed(2)} · {selected.soldWk} sold / wk · {selected.rating}★
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Margin" value={`$${(selected.price - selected.cost).toFixed(2)}`} />
                  <Stat
                    label="Margin %"
                    value={`${(((selected.price - selected.cost) / selected.price) * 100).toFixed(0)}%`}
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
                    <strong>{quadrant(selected, popMedian, marginMedian)}</strong> — popularity{" "}
                    {selected.soldWk >= popMedian ? "above" : "below"} median, margin{" "}
                    {selected.price - selected.cost >= marginMedian ? "above" : "below"} median.
                  </div>
                </div>
                {selected.modifiers && selected.modifiers.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      Top modifiers
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selected.modifiers.map((m) => (
                        <Badge key={m} variant="outline" className="font-normal">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                    AI suggestion
                  </div>
                  <div className="p-3 rounded-md bg-[#fbf5ee] border border-[#e8d5b9] text-sm">
                    {selected.soldWk > selected.soldPrevWk
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
  delta: string;
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
      <div
        className={`mt-2 inline-flex items-center gap-1 text-xs ${up ? "text-[#5a7d4a]" : "text-[#a8453a]"}`}
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta}
      </div>
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

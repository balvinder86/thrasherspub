import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  DollarSign,
  Flame,
  ReceiptText,
  ShoppingBag,
  Users,
  Utensils,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales Overview · Thrasher's Pub" },
      {
        name: "description",
        content: "Daily sales, covers, top items, and service health for restaurant owners.",
      },
    ],
  }),
  component: SalesOverview,
});

const revenueData = [
  { day: "Mon", revenue: 4120, lastWeek: 3850 },
  { day: "Tue", revenue: 4680, lastWeek: 4210 },
  { day: "Wed", revenue: 5210, lastWeek: 4980 },
  { day: "Thu", revenue: 6180, lastWeek: 5640 },
  { day: "Fri", revenue: 8420, lastWeek: 7820 },
  { day: "Sat", revenue: 9510, lastWeek: 8930 },
  { day: "Sun", revenue: 7240, lastWeek: 6840 },
];

const hourly = [
  { h: "11a", covers: 6 },
  { h: "12p", covers: 22 },
  { h: "1p", covers: 38 },
  { h: "2p", covers: 24 },
  { h: "3p", covers: 9 },
  { h: "4p", covers: 7 },
  { h: "5p", covers: 14 },
  { h: "6p", covers: 41 },
  { h: "7p", covers: 58 },
  { h: "8p", covers: 52 },
  { h: "9p", covers: 31 },
  { h: "10p", covers: 12 },
];

const topItems = [
  { name: "Tagliatelle al Ragù", category: "Pasta", sold: 84, revenue: 2016, margin: 72 },
  { name: "Branzino al Forno", category: "Mains", sold: 41, revenue: 1845, margin: 64 },
  { name: "Burrata & Stone Fruit", category: "Antipasti", sold: 67, revenue: 1206, margin: 78 },
  { name: "Negroni Sbagliato", category: "Bar", sold: 92, revenue: 1196, margin: 81 },
  { name: "Tiramisù della Casa", category: "Dolci", sold: 53, revenue: 689, margin: 74 },
];

const liveOrders = [
  { table: "T-12", server: "Marco", items: 6, total: 184, status: "Firing", min: 4 },
  { table: "Bar 03", server: "Lia", items: 3, total: 62, status: "Plating", min: 9 },
  { table: "T-04", server: "Jules", items: 8, total: 246, status: "Open tab", min: 22 },
  { table: "Patio 7", server: "Sana", items: 5, total: 138, status: "Firing", min: 2 },
];

const statusTone: Record<string, string> = {
  Firing: "bg-primary/12 text-primary border-primary/20",
  Plating: "bg-[oklch(0.92_0.08_85)] text-[oklch(0.4_0.1_60)] border-[oklch(0.85_0.08_75)]",
  "Open tab": "bg-muted text-muted-foreground border-border",
};

function SalesOverview() {
  return (
    <>
      <Topbar eyebrow="Thursday · June 25" title="Good evening, Elena" />
      <main className="space-y-8 px-6 py-8">
        {/* Hero band */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
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
                Tracking to beat last Friday by <span className="font-medium text-[oklch(0.97_0.012_85)]">$940</span> at this pace
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
                <HeroStat label="Covers" value="184" hint="of 220 forecast" pct={84} />
                <HeroStat label="Avg ticket" value="$46" hint="+ $3 vs avg" pct={62} />
                <HeroStat label="Turn time" value="68m" hint="goal 65m" pct={92} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Kpi
              icon={DollarSign}
              label="Net sales (7d)"
              value="$48,360"
              delta="+8.1%"
              positive
            />
            <Kpi
              icon={ShoppingBag}
              label="Orders today"
              value="312"
              delta="+24"
              positive
            />
            <Kpi
              icon={Users}
              label="New guests"
              value="46"
              delta="-3"
              positive={false}
            />
            <Kpi
              icon={ReceiptText}
              label="Outstanding tabs"
              value="$1,842"
              delta="9 open"
            />
          </div>
        </section>

        {/* Charts */}
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
            <div className="mt-6 h-[280px]">
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
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Covers by hour
            </div>
            <h2 className="mt-1 font-display text-2xl">Tonight's rhythm</h2>
            <div className="mt-6 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 10, right: 0, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="h" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="covers" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Top items + live orders */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Product mix
                </div>
                <h2 className="mt-1 font-display text-xl">Top sellers tonight</h2>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 rounded-full">
                View report
              </Button>
            </div>
            <div className="divide-y divide-border">
              {topItems.map((item, i) => (
                <div
                  key={item.name}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm text-accent-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Utensils className="h-3 w-3" /> {item.category}
                      <span>·</span>
                      <span>{item.sold} sold</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base">${item.revenue.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">{item.margin}% margin</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Floor
                </div>
                <h2 className="mt-1 font-display text-xl">Live tickets</h2>
              </div>
              <Badge variant="outline" className="shrink-0 gap-1.5 rounded-full border-primary/30 bg-primary/10 text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {liveOrders.length} active
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {liveOrders.map((o) => (
                <div key={o.table} className="px-6 py-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base">{o.table}</span>
                        <span className="text-xs text-muted-foreground">· {o.server}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {o.items} items · ${o.total}
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 rounded-full border ${statusTone[o.status]}`}>
                      {o.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{o.min} min in service</span>
                    <Progress value={Math.min(o.min * 4, 100)} className="ml-2 h-1 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}

function HeroStat({ label, value, hint, pct }: { label: string; value: string; hint: string; pct: number }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[oklch(0.97_0.012_85)]/55">
        {label}
      </div>
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
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
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
        {positive === true && <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-success)]" />}
        {positive === false && <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />}
        <span
          className={
            positive === true
              ? "text-[var(--color-success)]"
              : positive === false
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {delta}
        </span>
        <span className="text-muted-foreground">vs prior period</span>
      </div>
    </Card>
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

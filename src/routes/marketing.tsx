import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BadgePercent,
  Bot,
  CalendarDays,
  CheckCircle2,
  Coins,
  Gift,
  Globe,
  Heart,
  Image as ImageIcon,
  Instagram,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Megaphone,
  Pause,
  PenSquare,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from "lucide-react";

import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Email, SMS, social, loyalty, ads and AI-driven campaigns to grow Thrasher's Pub.",
      },
    ],
  }),
  component: MarketingPage,
});

// ---------- Mock data ----------

const KPIS = [
  { label: "Marketing revenue", value: "$48,210", delta: "+18.4%", trend: "up", hint: "vs. last 30 days" },
  { label: "Active subscribers", value: "12,842", delta: "+612", trend: "up", hint: "Email + SMS opted-in" },
  { label: "Avg. open rate", value: "42.6%", delta: "+3.1pt", trend: "up", hint: "Industry avg 28%" },
  { label: "Return on ad spend", value: "5.8x", delta: "+0.9x", trend: "up", hint: "Meta + Google blended" },
];

const REVENUE_SERIES = [
  { d: "Wk 1", email: 4200, sms: 1800, social: 2100, ads: 3100 },
  { d: "Wk 2", email: 5100, sms: 2400, social: 2600, ads: 3600 },
  { d: "Wk 3", email: 4800, sms: 2200, social: 3100, ads: 4200 },
  { d: "Wk 4", email: 6200, sms: 3100, social: 3800, ads: 4800 },
  { d: "Wk 5", email: 7100, sms: 3600, social: 4200, ads: 5300 },
  { d: "Wk 6", email: 6800, sms: 3900, social: 4800, ads: 5900 },
];

const CHANNEL_MIX = [
  { name: "Email", value: 38, color: "var(--color-terracotta)" },
  { name: "SMS", value: 22, color: "var(--color-sage)" },
  { name: "Social", value: 24, color: "var(--color-ochre)" },
  { name: "Ads", value: 16, color: "var(--color-ink)" },
];

type Campaign = {
  id: string;
  name: string;
  channel: "Email" | "SMS" | "Push" | "Social" | "Ads";
  status: "Live" | "Scheduled" | "Draft" | "Paused" | "Completed";
  audience: string;
  sent: number;
  open?: number;
  click?: number;
  revenue: number;
  sendAt: string;
};

const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Autumn truffle menu launch", channel: "Email", status: "Live", audience: "All subscribers · 12.8k", sent: 12800, open: 46, click: 11, revenue: 8420, sendAt: "Sent Tue 10:00am" },
  { id: "c2", name: "Friday last-minute tables", channel: "SMS", status: "Scheduled", audience: "Local 5mi · 3.2k", sent: 0, revenue: 0, sendAt: "Fri 3:30pm" },
  { id: "c3", name: "Win-back: 90 days dormant", channel: "Email", status: "Live", audience: "Dormant guests · 1,840", sent: 1840, open: 38, click: 7, revenue: 2110, sendAt: "Drip · day 1 of 3" },
  { id: "c4", name: "Birthday club $25 dessert", channel: "SMS", status: "Live", audience: "Birthday this month · 412", sent: 412, click: 31, revenue: 3680, sendAt: "Auto · monthly" },
  { id: "c5", name: "Reels: pasta-making behind the scenes", channel: "Social", status: "Scheduled", audience: "Instagram + TikTok", sent: 0, revenue: 0, sendAt: "Sat 11:00am" },
  { id: "c6", name: "Google Performance Max · brunch", channel: "Ads", status: "Live", audience: "5mi radius · brunch intent", sent: 0, revenue: 6240, sendAt: "$45/day · ongoing" },
  { id: "c7", name: "Valentine's prix fixe teaser", channel: "Email", status: "Draft", audience: "Couples segment · 2,140", sent: 0, revenue: 0, sendAt: "—" },
];

const AUTOMATIONS = [
  { name: "Welcome series", trigger: "New subscriber", steps: 3, status: "on", sent: 412, conv: "18%" },
  { name: "Post-visit thank you", trigger: "POS check-closed", steps: 2, status: "on", sent: 1840, conv: "9%" },
  { name: "Birthday club", trigger: "Birthday -7 days", steps: 1, status: "on", sent: 96, conv: "34%" },
  { name: "Win-back 30/60/90", trigger: "No visit 30 days", steps: 3, status: "on", sent: 612, conv: "12%" },
  { name: "Reservation reminder", trigger: "Booking -24h", steps: 1, status: "on", sent: 980, conv: "92% show" },
  { name: "Review request", trigger: "Visit +1 day", steps: 1, status: "off", sent: 0, conv: "—" },
];

const SEGMENTS = [
  { name: "VIPs · 6+ visits / 90d", size: 184, color: "ochre" },
  { name: "Regulars · 3-5 visits / 90d", size: 612, color: "sage" },
  { name: "New guests · first visit", size: 421, color: "terracotta" },
  { name: "Dormant · no visit 90d+", size: 1840, color: "ink" },
  { name: "High spenders · $150+ avg", size: 218, color: "ochre" },
  { name: "Brunch lovers", size: 540, color: "sage" },
  { name: "Birthday this month", size: 412, color: "terracotta" },
];

const SOCIAL_POSTS = [
  { id: "s1", platform: "Instagram", text: "Truffle season starts Saturday. Tables go fast — link in bio.", when: "Tomorrow 11:00am", status: "Scheduled", reach: "—" },
  { id: "s2", platform: "TikTok", text: "Chef Bali plates the new burrata. 15s reel.", when: "Sat 6:00pm", status: "Scheduled", reach: "—" },
  { id: "s3", platform: "Facebook", text: "Live music every Thursday — Aperitivo & vinyl 6-8pm.", when: "Posted Mon", status: "Live", reach: "4.2k" },
  { id: "s4", platform: "Instagram", text: "Behind the pass: 8-hour ragù.", when: "Posted Sun", status: "Live", reach: "11.8k" },
];

const LOYALTY_TIERS = [
  { name: "Friend", req: "Sign up", perks: ["Welcome cocktail", "Birthday dessert"], members: 8420 },
  { name: "Regular", req: "5 visits", perks: ["Priority bookings", "10% off bottles"], members: 1840 },
  { name: "Insider", req: "12 visits", perks: ["Chef's table invites", "Menu previews", "20% off bottles"], members: 312 },
];

const REFERRALS = [
  { name: "Amelia R.", invites: 6, conv: 4, reward: "$80 credit" },
  { name: "Marcus T.", invites: 4, conv: 3, reward: "$60 credit" },
  { name: "Priya N.", invites: 8, conv: 3, reward: "$60 credit" },
  { name: "Daniel K.", invites: 3, conv: 2, reward: "$40 credit" },
];

const AD_CAMPAIGNS = [
  { platform: "Google Search", name: "Italian restaurant near me", spend: 820, roas: 6.4, ctr: 8.2, status: "Live" },
  { platform: "Google PMax", name: "Brunch · weekends", spend: 540, roas: 4.8, ctr: 5.1, status: "Live" },
  { platform: "Meta Ads", name: "Truffle menu · 5mi radius", spend: 920, roas: 5.2, ctr: 3.6, status: "Live" },
  { platform: "TikTok Ads", name: "Pasta reel boost", spend: 280, roas: 3.1, ctr: 6.8, status: "Testing" },
  { platform: "Yelp Ads", name: "Category sponsorship", spend: 360, roas: 2.4, ctr: 2.1, status: "Paused" },
];

const PARTNERSHIPS = [
  { name: "Local Eats Magazine", type: "Press feature", status: "Pitched", value: "$3.2k earned media" },
  { name: "@cityfoodie (84k)", type: "Influencer dinner", status: "Confirmed Sat", value: "Est. 22k reach" },
  { name: "Riverwalk Hotel concierge", type: "Referral partner", status: "Active", value: "$4.1k / mo" },
  { name: "Vine & Vault wines", type: "Wine pairing night", status: "Planning Oct 18", value: "Co-marketing" },
];

const AI_IDEAS = [
  { title: "Truffle menu launch · 3-email drip", channel: "Email", impact: "Est. $6-9k", reason: "Open rate spikes 41% on seasonal launches; you have 12.8k subs warmed up." },
  { title: "Friday 6pm SMS · 12 open tables", channel: "SMS", impact: "Est. 18-26 covers", reason: "You have 22 unbooked seats and 3.2k local opt-ins; last similar blast filled 24 seats." },
  { title: "Reactivate 1,840 dormant guests", channel: "Email", impact: "Est. $2.1k", reason: "1,840 guests haven't visited in 90+ days. A $20 credit drives 12% return on this segment." },
  { title: "TikTok: 15s pasta reel", channel: "Social", impact: "Est. 40-80k reach", reason: "Behind-the-pass reels outperform plated shots 4x on your account." },
  { title: "Google PMax · brunch radius +2mi", channel: "Ads", impact: "+22% impressions", reason: "Brunch ROAS is 4.8x; expanding radius adds 18k qualified households." },
];

// ---------- Page ----------

function MarketingPage() {
  const [tab, setTab] = useState("overview");
  const [composer, setComposer] = useState<"email" | "sms" | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar eyebrow="Growth" title="Marketing" />
      <main className="flex-1 space-y-6 px-6 py-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Growth</div>
            <h1 className="font-serif text-4xl text-foreground lg:text-5xl">Marketing</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Run email, SMS, social, ads and loyalty from one calendar. The AI marketer drafts campaigns, picks segments
              and reports what actually drove covers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Calendar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setComposer("sms")}>
              <MessageCircle className="h-4 w-4" /> New SMS
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setComposer("email")}>
              <Plus className="h-4 w-4" /> New campaign
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((k) => (
            <Card key={k.label} className="p-5">
              <div className="flex items-start justify-between">
                <div className="text-sm text-muted-foreground">{k.label}</div>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <TrendingUp className="h-3 w-3" /> {k.delta}
                </Badge>
              </div>
              <div className="mt-2 font-serif text-3xl text-foreground">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{k.hint}</div>
            </Card>
          ))}
        </div>

        {/* Hero: revenue + AI marketer */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last 6 weeks</div>
                <div className="font-serif text-xl text-foreground">Revenue by channel</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <LegendDot color="var(--color-terracotta)" label="Email" />
                <LegendDot color="var(--color-sage)" label="SMS" />
                <LegendDot color="var(--color-ochre)" label="Social" />
                <LegendDot color="var(--color-ink)" label="Ads" />
              </div>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <AreaChart data={REVENUE_SERIES}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-terracotta)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-terracotta)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-sage)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-sage)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="email" stackId="1" stroke="var(--color-terracotta)" fill="url(#g1)" />
                  <Area type="monotone" dataKey="sms" stackId="1" stroke="var(--color-sage)" fill="url(#g2)" />
                  <Area type="monotone" dataKey="social" stackId="1" stroke="var(--color-ochre)" fill="var(--color-ochre)" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="ads" stackId="1" stroke="var(--color-ink)" fill="var(--color-ink)" fillOpacity={0.08} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="relative overflow-hidden p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-ochre)]/15 via-transparent to-[var(--color-terracotta)]/10" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-foreground/90 p-1.5 text-background">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">AI Marketer</div>
              </div>
              <div className="font-serif text-xl text-foreground">5 ideas ready to run this week</div>
              <p className="text-sm text-muted-foreground">
                Drafted from your POS, calendar, weather and last 90 days of campaigns.
              </p>
              <div className="space-y-2">
                {AI_IDEAS.slice(0, 3).map((idea) => (
                  <div key={idea.title} className="rounded-lg border border-border/60 bg-card/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{idea.title}</div>
                      <Badge variant="outline" className="text-[10px]">{idea.channel}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{idea.impact}</div>
                  </div>
                ))}
              </div>
              <Button size="sm" className="w-full gap-2">
                <Wand2 className="h-4 w-4" /> Review all ideas
              </Button>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Overview</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Campaigns</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> SMS & Push</TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5"><Instagram className="h-3.5 w-3.5" /> Social</TabsTrigger>
            <TabsTrigger value="ads" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Paid ads</TabsTrigger>
            <TabsTrigger value="loyalty" className="gap-1.5"><Gift className="h-3.5 w-3.5" /> Loyalty</TabsTrigger>
            <TabsTrigger value="local" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Local & partners</TabsTrigger>
            <TabsTrigger value="audience" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Audience</TabsTrigger>
            <TabsTrigger value="automations" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Automations</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> AI Agent</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="This week at a glance" sub="What's live, what's scheduled, what needs you" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniStat icon={Send} label="Sends scheduled" value="14" hint="6 email · 5 SMS · 3 social" />
                  <MiniStat icon={Coins} label="Ad spend pacing" value="$2,140" hint="of $2,500 budget" />
                  <MiniStat icon={Users} label="Net new subscribers" value="+612" hint="QR + checkout opt-ins" />
                  <MiniStat icon={Heart} label="Loyalty visits" value="184" hint="32% of all covers" />
                </div>
                <Separator className="my-5" />
                <SectionHeader title="Channel mix · revenue contribution" />
                <div className="mt-4 h-44">
                  <ResponsiveContainer>
                    <BarChart data={CHANNEL_MIX} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={12} width={70} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="var(--color-terracotta)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Calendar · next 7 days" />
                <div className="mt-4 space-y-3">
                  {[
                    { day: "Wed", item: "Email · Truffle menu launch", time: "10:00am", channel: "Email" },
                    { day: "Thu", item: "Reel · Behind the pass", time: "6:00pm", channel: "Social" },
                    { day: "Fri", item: "SMS · Last-minute tables", time: "3:30pm", channel: "SMS" },
                    { day: "Sat", item: "Influencer dinner @cityfoodie", time: "7:00pm", channel: "Partner" },
                    { day: "Sun", item: "Brunch ad boost", time: "All day", channel: "Ads" },
                  ].map((e) => (
                    <div key={e.item} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-muted/60 font-serif text-sm">
                        {e.day}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{e.item}</div>
                        <div className="text-xs text-muted-foreground">{e.time}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{e.channel}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* CAMPAIGNS */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionHeader title="All campaigns" sub="Across every channel" />
                <div className="flex items-center gap-2">
                  <Input placeholder="Search campaigns…" className="h-9 w-56" />
                  <Button variant="outline" size="sm" className="gap-1"><RefreshCw className="h-3.5 w-3.5" /> Sync</Button>
                  <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New</Button>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Campaign</th>
                      <th className="px-4 py-2 text-left">Channel</th>
                      <th className="px-4 py-2 text-left">Audience</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Sent</th>
                      <th className="px-4 py-2 text-right">Open</th>
                      <th className="px-4 py-2 text-right">Click</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAMPAIGNS.map((c) => (
                      <tr key={c.id} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{c.channel}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground">{c.audience}</td>
                        <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.sent ? c.sent.toLocaleString() : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.open ? `${c.open}%` : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{c.click ? `${c.click}%` : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">
                          {c.revenue ? `$${c.revenue.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{c.sendAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* EMAIL */}
          <TabsContent value="email" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="Email composer" sub="AI-drafted from your brand voice and last 90 days of winners" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Subject"><Input defaultValue="Truffle season at Thrasher's — opens Saturday" /></Field>
                  <Field label="Preheader"><Input defaultValue="A 6-course menu, only 28 seats a night." /></Field>
                  <Field label="From"><Input defaultValue="Bali Singh <hello@thrasherspub.com>" /></Field>
                  <Field label="Send to">
                    <select className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                      <option>All subscribers · 12,842</option>
                      <option>VIPs · 184</option>
                      <option>Dormant 90d · 1,840</option>
                      <option>Brunch lovers · 540</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Body</Label>
                  <Textarea
                    rows={8}
                    className="mt-1"
                    defaultValue={`Friends,\n\nWe just pulled the first white truffles of the season. Starting Saturday, our 6-course tasting menu features them across three dishes — including a 36-month parmesan tortelloni I've been working on all summer.\n\nOnly 28 seats per night. VIPs get first dibs Friday at 9am.\n\nSee you soon,\nBali`}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Rewrite (warmer)</Button>
                    <Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Shorter</Button>
                    <Button variant="outline" size="sm" className="gap-1"><ImageIcon className="h-3.5 w-3.5" /> Generate hero image</Button>
                    <Button variant="outline" size="sm" className="gap-1"><Wand2 className="h-3.5 w-3.5" /> Subject A/B variants</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">Save draft</Button>
                    <Button variant="outline" size="sm">Schedule</Button>
                    <Button size="sm" className="gap-1"><Send className="h-3.5 w-3.5" /> Send test</Button>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Predicted performance" />
                <div className="mt-4 space-y-4">
                  <Pred label="Open rate" value={46} hint="Top 8% in fine dining" />
                  <Pred label="Click rate" value={11} hint="Above your 90d avg" />
                  <Pred label="Unsubscribe risk" value={4} hint="Low — well within healthy" tone="muted" />
                  <Pred label="Expected revenue" value={72} hint="~$6,400 - $9,100" />
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Deliverability" />
                <div className="mt-3 space-y-2 text-sm">
                  <CheckRow ok label="SPF, DKIM, DMARC verified" />
                  <CheckRow ok label="Sender reputation 98/100" />
                  <CheckRow ok label="Image to text ratio good" />
                  <CheckRow warn label="Subject contains 'opens' — mild spam trigger" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* SMS & PUSH */}
          <TabsContent value="sms" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="SMS composer" sub="Best for last-minute tables and time-sensitive offers" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Send to">
                    <select className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                      <option>Local 5mi opt-ins · 3,210</option>
                      <option>VIPs · 184</option>
                      <option>Birthday this month · 412</option>
                    </select>
                  </Field>
                  <Field label="Send window">
                    <select className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm">
                      <option>Now</option>
                      <option>Friday 3:30pm</option>
                      <option>Saturday 11:00am</option>
                    </select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Message · 142/160</Label>
                  <Textarea
                    rows={4}
                    className="mt-1 font-mono text-sm"
                    defaultValue={`Thrasher's: We just opened 12 tables tonight 6-8pm. Reply YES to book for 2, or tap thrasherspub.com/tonight. Reply STOP to opt out.`}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Shorten</Button>
                    <Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Add emoji</Button>
                    <Button variant="outline" size="sm" className="gap-1">Add short link</Button>
                  </div>
                  <Button size="sm" className="gap-1"><Send className="h-3.5 w-3.5" /> Schedule</Button>
                </div>
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  TCPA / 10DLC compliant: STOP and HELP keywords auto-handled. Quiet hours 9pm-9am enforced.
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Push & WhatsApp" />
                <div className="mt-4 space-y-3 text-sm">
                  <ChannelRow icon={MessageCircle} name="WhatsApp Business" status="Connected" sub="3,840 subscribers" />
                  <ChannelRow icon={Send} name="iOS / Android push" status="Connected" sub="1,120 app installs" />
                  <ChannelRow icon={Mail} name="Apple Wallet pass" status="Connected" sub="640 wallet adds" />
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Recent SMS performance" />
                <div className="mt-3 space-y-2 text-sm">
                  <PerfRow name="Friday last-minute" sent="2,840" ctr="14%" rev="$2,140" />
                  <PerfRow name="Birthday dessert" sent="412" ctr="31%" rev="$3,680" />
                  <PerfRow name="Mother's Day brunch" sent="3,100" ctr="22%" rev="$8,940" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* SOCIAL */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <SectionHeader title="Social calendar" sub="Instagram · TikTok · Facebook · Threads · Pinterest" />
                  <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New post</Button>
                </div>
                <div className="mt-4 space-y-3">
                  {SOCIAL_POSTS.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-md bg-muted/60">
                        {p.platform === "Instagram" || p.platform === "TikTok" ? (
                          <Instagram className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>
                          <span className="text-xs text-muted-foreground">{p.when}</span>
                          <Badge variant={p.status === "Live" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                        </div>
                        <div className="mt-1 text-sm text-foreground">{p.text}</div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>Reach</div>
                        <div className="text-sm text-foreground">{p.reach}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="AI content studio" />
                <div className="mt-4 space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2"><Wand2 className="h-4 w-4" /> Generate week of posts</Button>
                  <Button variant="outline" className="w-full justify-start gap-2"><ImageIcon className="h-4 w-4" /> Turn dish photo → 5 reels</Button>
                  <Button variant="outline" className="w-full justify-start gap-2"><PenSquare className="h-4 w-4" /> Caption + hashtag pack</Button>
                  <Button variant="outline" className="w-full justify-start gap-2"><Sparkles className="h-4 w-4" /> Trend match (TikTok)</Button>
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Followers · 30d" />
                <div className="mt-3 space-y-3 text-sm">
                  <FollowRow name="Instagram" handle="@thrasherspub" count="48.2k" delta="+1,240" />
                  <FollowRow name="TikTok" handle="@thrasherspub" count="22.6k" delta="+3,180" />
                  <FollowRow name="Facebook" handle="Thrasher's Pub" count="14.1k" delta="+86" />
                  <FollowRow name="Threads" handle="@thrasherspub" count="6.4k" delta="+412" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ADS */}
          <TabsContent value="ads" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-5"><MiniStat icon={Coins} label="Spend MTD" value="$3,820" hint="of $4,500" /></Card>
              <Card className="p-5"><MiniStat icon={TrendingUp} label="Blended ROAS" value="5.8x" hint="+0.9x vs. last mo" /></Card>
              <Card className="p-5"><MiniStat icon={Users} label="Reach" value="184k" hint="5mi radius" /></Card>
              <Card className="p-5"><MiniStat icon={Target} label="Cost / cover" value="$4.12" hint="Goal $6.00" /></Card>
            </div>
            <Card className="p-5">
              <SectionHeader title="Live ad campaigns" sub="Google, Meta, TikTok, Yelp managed in one place" />
              <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Platform</th>
                      <th className="px-4 py-2 text-left">Campaign</th>
                      <th className="px-4 py-2 text-right">Spend</th>
                      <th className="px-4 py-2 text-right">ROAS</th>
                      <th className="px-4 py-2 text-right">CTR</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {AD_CAMPAIGNS.map((a) => (
                      <tr key={a.name} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground">{a.platform}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">${a.spend}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-foreground">{a.roas}x</td>
                        <td className="px-4 py-3 text-right tabular-nums">{a.ctr}%</td>
                        <td className="px-4 py-3"><StatusPill status={a.status as Campaign["status"]} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="gap-1">
                            {a.status === "Paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <span>AI bid optimizer is on — reallocating budget every 24h toward the best ROAS.</span>
                <Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-3.5 w-3.5" /> Suggest budget shift</Button>
              </div>
            </Card>
          </TabsContent>

          {/* LOYALTY */}
          <TabsContent value="loyalty" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="Loyalty program" sub="Punch card replaced with smart tiers tied to POS" />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {LOYALTY_TIERS.map((t) => (
                    <div key={t.name} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-serif text-lg text-foreground">{t.name}</div>
                        <Badge variant="outline" className="text-[10px]">{t.members.toLocaleString()}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Unlock: {t.req}</div>
                      <ul className="mt-3 space-y-1 text-sm">
                        {t.perks.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-foreground/80">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-[var(--color-sage)]" /> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <Separator className="my-5" />
                <SectionHeader title="Referrals · top advocates" />
                <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Guest</th>
                        <th className="px-4 py-2 text-right">Invites</th>
                        <th className="px-4 py-2 text-right">Converted</th>
                        <th className="px-4 py-2 text-right">Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REFERRALS.map((r) => (
                        <tr key={r.name} className="border-t border-border/60">
                          <td className="px-4 py-3 text-foreground">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{r.name.split(" ").map((s) => s[0]).join("")}</AvatarFallback></Avatar>
                              {r.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{r.invites}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{r.conv}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{r.reward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Gift cards & promos" />
                <div className="mt-4 space-y-3">
                  <Promo title="$25 off · Dormant 90d" code="MISSYOU25" used={184} target={400} />
                  <Promo title="$50 gift card · holiday" code="HOLIDAY50" used={612} target={1000} />
                  <Promo title="BOGO brunch · Sundays" code="SUNDAYBOGO" used={84} target={200} />
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Sign-up surfaces" />
                <div className="mt-3 space-y-2 text-sm">
                  <ChannelRow icon={QrCode} name="Table QR" status="Active" sub="184 sign-ups / mo" />
                  <ChannelRow icon={Mail} name="Checkout receipt opt-in" status="Active" sub="612 / mo" />
                  <ChannelRow icon={BadgePercent} name="Wi-Fi captive portal" status="Active" sub="218 / mo" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* LOCAL & PARTNERS */}
          <TabsContent value="local" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="Partnerships & PR" sub="Influencers, press, hotels, neighborhood co-ops" />
                <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Partner</th>
                        <th className="px-4 py-2 text-left">Type</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-right">Est. value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PARTNERSHIPS.map((p) => (
                        <tr key={p.name} className="border-t border-border/60">
                          <td className="px-4 py-3 text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.type}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{p.status}</Badge></td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Pitch new partner</Button>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Events & seasonal" />
                <div className="mt-4 space-y-3 text-sm">
                  <EventRow date="Oct 18" name="Wine pairing night · Vine & Vault" status="Tickets · 24/40" />
                  <EventRow date="Oct 31" name="Halloween prix fixe" status="Marketing live" />
                  <EventRow date="Nov 14" name="Truffle dinner series" status="Planning" />
                  <EventRow date="Dec 31" name="NYE 6-course" status="Waitlist open" />
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Community" />
                <div className="mt-3 space-y-2 text-sm">
                  <ChannelRow icon={Heart} name="Neighborhood school fundraiser" status="$1,200 raised" sub="Co-marketed Sept" />
                  <ChannelRow icon={MapPin} name="Riverwalk farmers market" status="Booth Sat" sub="Est. 8k foot traffic" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* AUDIENCE */}
          <TabsContent value="audience" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="Smart segments" sub="Auto-built from POS, reservations, opt-ins and email behavior" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SEGMENTS.map((s) => (
                    <div key={s.name} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.size.toLocaleString()} guests</div>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="gap-1">
                        <Link to="/segments">Use <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link to="/segments"><Layers className="h-3.5 w-3.5" /> Build custom segment</Link>
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="List growth · 30d" />
                <div className="mt-4 space-y-3">
                  <GrowRow label="Email subscribers" value="+612" total="12,842" />
                  <GrowRow label="SMS opt-ins" value="+184" total="3,210" />
                  <GrowRow label="Loyalty members" value="+218" total="10,572" />
                  <GrowRow label="WhatsApp subs" value="+96" total="3,840" />
                </div>
                <Separator className="my-4" />
                <SectionHeader title="Unsubscribes" />
                <div className="mt-3 space-y-2 text-sm">
                  <PerfRow name="Email" sent="—" ctr="0.18%" rev="Healthy" />
                  <PerfRow name="SMS" sent="—" ctr="0.42%" rev="Healthy" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* AUTOMATIONS */}
          <TabsContent value="automations" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <SectionHeader title="Always-on automations" sub="Lifecycle flows that run without you touching them" />
                <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New automation</Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {AUTOMATIONS.map((a) => (
                  <div key={a.name} className="rounded-lg border border-border/60 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground">{a.name}</div>
                        <div className="text-xs text-muted-foreground">Trigger: {a.trigger}</div>
                      </div>
                      <Switch defaultChecked={a.status === "on"} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{a.steps} step{a.steps > 1 ? "s" : ""}</span>
                      <span>{a.sent.toLocaleString()} sent · {a.conv}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* AI AGENT */}
          <TabsContent value="ai" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <SectionHeader title="AI marketer · weekly queue" sub="Ideas drafted from POS, weather, reservations and last 90d performance" />
                <div className="mt-4 space-y-3">
                  {AI_IDEAS.map((i) => (
                    <div key={i.title} className="rounded-lg border border-border/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-foreground">{i.title}</div>
                            <Badge variant="outline" className="text-[10px]">{i.channel}</Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{i.reason}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Impact</div>
                          <div className="text-sm font-medium text-foreground">{i.impact}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button size="sm" className="gap-1"><Wand2 className="h-3.5 w-3.5" /> Draft</Button>
                        <Button variant="outline" size="sm">Skip</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <SectionHeader title="Brand voice & guardrails" />
                <div className="mt-4 space-y-4 text-sm">
                  <Field label="Voice"><Input defaultValue="Warm, confident, a little playful. Italian heritage." /></Field>
                  <Field label="Never say"><Input defaultValue="cheap, deal, 'amazing', exclamation marks in headlines" /></Field>
                  <Field label="Always sign as"><Input defaultValue="Bali Singh, Owner" /></Field>
                  <div className="space-y-3 rounded-lg border border-border/60 p-3">
                    <GuardRow label="Auto-send low-risk SMS (last-minute tables)" />
                    <GuardRow label="Auto-publish social reels" defaultChecked={false} />
                    <GuardRow label="Auto-reallocate ad budget (within 15%)" />
                    <GuardRow label="Require approval for emails > 5k recipients" />
                  </div>
                  <Button size="sm" className="w-full gap-1"><Sparkles className="h-3.5 w-3.5" /> Retrain on last 90d wins</Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---------- Small components ----------

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="font-serif text-lg text-foreground">{title}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-serif text-xl text-foreground">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Campaign["status"] }) {
  const map: Record<string, string> = {
    Live: "bg-[var(--color-sage)]/20 text-[var(--color-sage)] border-[var(--color-sage)]/30",
    Scheduled: "bg-[var(--color-ochre)]/20 text-foreground border-[var(--color-ochre)]/30",
    Draft: "bg-muted text-muted-foreground border-border",
    Paused: "bg-muted text-muted-foreground border-border",
    Completed: "bg-muted text-muted-foreground border-border",
    Testing: "bg-[var(--color-ochre)]/20 text-foreground border-[var(--color-ochre)]/30",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${map[status] ?? ""}`}>{status}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Pred({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: "muted" }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/80">{label}</span>
        <span className={tone === "muted" ? "text-muted-foreground" : "font-medium text-foreground"}>
          {value}%
        </span>
      </div>
      <Progress value={value} className="mt-1.5 h-1.5" />
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function CheckRow({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-[var(--color-sage)]" : warn ? "bg-[var(--color-ochre)]" : "bg-muted"}`}
      />
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}

function ChannelRow({ icon: Icon, name, status, sub }: { icon: any; name: string; status: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm text-foreground">{name}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
      <Badge variant="secondary" className="text-[10px]">{status}</Badge>
    </div>
  );
}

function PerfRow({ name, sent, ctr, rev }: { name: string; sent: string; ctr: string; rev: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
      <div className="text-foreground/80">{name}</div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Sent {sent}</span>
        <span>CTR {ctr}</span>
        <span className="text-foreground">{rev}</span>
      </div>
    </div>
  );
}

function FollowRow({ name, handle, count, delta }: { name: string; handle: string; count: string; delta: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{handle}</div>
      </div>
      <div className="text-right">
        <div className="font-serif text-base text-foreground">{count}</div>
        <div className="text-xs text-[var(--color-sage)]">{delta}</div>
      </div>
    </div>
  );
}

function Promo({ title, code, used, target }: { title: string; code: string; used: number; target: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-foreground">{title}</div>
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">{code}</code>
      </div>
      <Progress value={(used / target) * 100} className="mt-2 h-1.5" />
      <div className="mt-1 text-xs text-muted-foreground">{used} / {target} redeemed</div>
    </div>
  );
}

function EventRow({ date, name, status }: { date: string; name: string; status: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <div className="grid h-10 w-12 place-items-center rounded-md bg-muted/60 font-serif text-xs">{date}</div>
      <div className="flex-1">
        <div className="text-sm text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{status}</div>
      </div>
    </div>
  );
}

function GrowRow({ label, value, total }: { label: string; value: string; total: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">Total {total}</div>
      </div>
      <Badge variant="secondary" className="gap-1 text-xs"><TrendingUp className="h-3 w-3" /> {value}</Badge>
    </div>
  );
}

function GuardRow({ label, defaultChecked = true }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground/80">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

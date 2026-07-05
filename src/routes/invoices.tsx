import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSearch,
  FileText,
  Filter,
  Globe,
  Inbox,
  Loader2,
  Mail,
  PiggyBank,
  Plug,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  Wallet,
  Wand2,
  XCircle,
  Zap,
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useApproveInvoice,
  useCheckOcr,
  useEnqueueOcr,
  useIngredients,
  useRealInvoiceLines,
  useRealInvoices,
  useSetInvoiceVendor,
  useUpdateInvoiceLineIngredient,
  useUploadInvoice,
  useVendors as useRealVendors,
} from "@/lib/boh/queries";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Consolidated vendor invoices, line-item spend, savings captured, and payment status across all suppliers.",
      },
    ],
  }),
  component: InvoicesPage,
});

type Status = "paid" | "approved" | "pending" | "disputed" | "overdue";
type Category =
  | "Produce"
  | "Meat & Seafood"
  | "Dairy"
  | "Dry Goods"
  | "Beverage"
  | "Beer & Wine"
  | "Paper & Chem"
  | "Smallwares";

type Vendor = {
  id: string;
  name: string;
  category: string;
  terms: string;
  rep: string;
  ytdSpend: number;
  mtdSpend: number;
  savings: number;
  invoices: number;
  onTime: number;
  priceAccuracy: number;
};

type InvoiceLine = {
  item: string;
  qty: string;
  unitPrice: number;
  total: number;
  category: Category;
  savings?: number;
  flag?: "price-up" | "short" | "credit";
};

type Invoice = {
  id: string;
  vendor: string;
  date: string;
  due: string;
  total: number;
  savings: number;
  status: Status;
  category: Category;
  po?: string;
  lines: InvoiceLine[];
};

const VENDORS: Vendor[] = [
  {
    id: "v1",
    name: "Southern Glazer's",
    category: "Beer, Wine & Spirits",
    terms: "Net 15",
    rep: "Maria Lopez · (415) 555-0142",
    ytdSpend: 184230,
    mtdSpend: 18420,
    savings: 6240,
    invoices: 142,
    onTime: 96,
    priceAccuracy: 98,
  },
  {
    id: "v2",
    name: "Columbia Distributing",
    category: "Beer & N/A Beverage",
    terms: "Net 21",
    rep: "Devon Pratt · (503) 555-0188",
    ytdSpend: 96420,
    mtdSpend: 11240,
    savings: 3120,
    invoices: 88,
    onTime: 92,
    priceAccuracy: 95,
  },
  {
    id: "v3",
    name: "Restaurant Depot",
    category: "Dry Goods & Smallwares",
    terms: "On delivery",
    rep: "Walk-in account · #44218",
    ytdSpend: 72880,
    mtdSpend: 8640,
    savings: 4180,
    invoices: 64,
    onTime: 100,
    priceAccuracy: 91,
  },
  {
    id: "v4",
    name: "Sysco Foods",
    category: "Broadliner · Produce, Dairy, Dry",
    terms: "Net 30",
    rep: "Jordan Whitfield · (650) 555-0173",
    ytdSpend: 142680,
    mtdSpend: 14860,
    savings: 5280,
    invoices: 118,
    onTime: 94,
    priceAccuracy: 93,
  },
  {
    id: "v5",
    name: "Pacific Seafood",
    category: "Fish & Shellfish",
    terms: "Net 14",
    rep: "Hana Yamada · (206) 555-0119",
    ytdSpend: 58420,
    mtdSpend: 6240,
    savings: 1840,
    invoices: 92,
    onTime: 89,
    priceAccuracy: 88,
  },
  {
    id: "v6",
    name: "Niman Ranch",
    category: "Meat",
    terms: "Net 21",
    rep: "Cole Bennett · (510) 555-0166",
    ytdSpend: 64280,
    mtdSpend: 5840,
    savings: 2120,
    invoices: 56,
    onTime: 98,
    priceAccuracy: 97,
  },
  {
    id: "v7",
    name: "Acme Bread",
    category: "Bakery",
    terms: "Net 7",
    rep: "Sam Reilly · (415) 555-0102",
    ytdSpend: 18420,
    mtdSpend: 1920,
    savings: 320,
    invoices: 156,
    onTime: 100,
    priceAccuracy: 99,
  },
  {
    id: "v8",
    name: "Veritable Vegetable",
    category: "Organic Produce",
    terms: "Net 14",
    rep: "Priya Nair · (415) 555-0144",
    ytdSpend: 42180,
    mtdSpend: 4380,
    savings: 1620,
    invoices: 102,
    onTime: 97,
    priceAccuracy: 96,
  },
];

const INVOICES: Invoice[] = [
  {
    id: "INV-2841",
    vendor: "Southern Glazer's",
    date: "Jun 24",
    due: "Jul 9",
    total: 4280.55,
    savings: 312.4,
    status: "pending",
    category: "Beer & Wine",
    po: "PO-1184",
    lines: [
      { item: "Hendrick's Gin 750ml", qty: "12 btl", unitPrice: 28.4, total: 340.8, category: "Beer & Wine", savings: 24 },
      { item: "Aperol 1L", qty: "6 btl", unitPrice: 22.1, total: 132.6, category: "Beer & Wine" },
      { item: "Lambrusco · case", qty: "8 cs", unitPrice: 96.0, total: 768.0, category: "Beer & Wine", savings: 96, flag: "credit" },
      { item: "Negroni pre-mix · keg", qty: "2 kg", unitPrice: 142.0, total: 284.0, category: "Beer & Wine" },
    ],
  },
  {
    id: "INV-2840",
    vendor: "Restaurant Depot",
    date: "Jun 24",
    due: "Paid",
    total: 1842.18,
    savings: 184.2,
    status: "paid",
    category: "Dry Goods",
    lines: [
      { item: "Olive oil · 3L tin", qty: "8 tin", unitPrice: 38.2, total: 305.6, category: "Dry Goods", savings: 32 },
      { item: "Semolina flour 50lb", qty: "4 bag", unitPrice: 42.5, total: 170.0, category: "Dry Goods" },
      { item: "Nitrile gloves L · 1000ct", qty: "3 cs", unitPrice: 56.0, total: 168.0, category: "Paper & Chem" },
      { item: "To-go containers 16oz", qty: "10 cs", unitPrice: 38.4, total: 384.0, category: "Paper & Chem", savings: 48 },
    ],
  },
  {
    id: "INV-2839",
    vendor: "Sysco Foods",
    date: "Jun 23",
    due: "Jul 23",
    total: 3284.6,
    savings: 218.0,
    status: "approved",
    category: "Produce",
    po: "PO-1182",
    lines: [
      { item: "Heirloom tomatoes · 20lb", qty: "6 cs", unitPrice: 64.0, total: 384.0, category: "Produce", flag: "price-up" },
      { item: "Burrata 8oz", qty: "24 ea", unitPrice: 6.8, total: 163.2, category: "Dairy" },
      { item: "EVOO 5L · house", qty: "4 jug", unitPrice: 72.0, total: 288.0, category: "Dry Goods", savings: 36 },
      { item: "Parmigiano 24mo · wheel", qty: "1 ea", unitPrice: 482.0, total: 482.0, category: "Dairy", savings: 48 },
    ],
  },
  {
    id: "INV-2838",
    vendor: "Pacific Seafood",
    date: "Jun 22",
    due: "Jul 6",
    total: 1284.4,
    savings: 64.0,
    status: "disputed",
    category: "Meat & Seafood",
    lines: [
      { item: "Branzino whole · 1lb", qty: "18 ea", unitPrice: 14.2, total: 255.6, category: "Meat & Seafood", flag: "short" },
      { item: "Diver scallops U10", qty: "8 lb", unitPrice: 38.0, total: 304.0, category: "Meat & Seafood" },
      { item: "Live mussels · 5lb", qty: "6 bag", unitPrice: 18.0, total: 108.0, category: "Meat & Seafood" },
    ],
  },
  {
    id: "INV-2837",
    vendor: "Columbia Distributing",
    date: "Jun 21",
    due: "Jul 12",
    total: 2184.9,
    savings: 142.0,
    status: "approved",
    category: "Beverage",
    po: "PO-1180",
    lines: [
      { item: "Anchor Steam · 1/2 bbl", qty: "2 kg", unitPrice: 184.0, total: 368.0, category: "Beverage" },
      { item: "Topo Chico · 24pk", qty: "10 cs", unitPrice: 32.4, total: 324.0, category: "Beverage", savings: 36 },
      { item: "Fever-Tree tonic", qty: "6 cs", unitPrice: 48.0, total: 288.0, category: "Beverage" },
    ],
  },
  {
    id: "INV-2836",
    vendor: "Niman Ranch",
    date: "Jun 20",
    due: "Jul 11",
    total: 1842.0,
    savings: 96.0,
    status: "approved",
    category: "Meat & Seafood",
    lines: [
      { item: "Pork shoulder · whole", qty: "32 lb", unitPrice: 7.8, total: 249.6, category: "Meat & Seafood" },
      { item: "Bavette steak", qty: "24 lb", unitPrice: 18.4, total: 441.6, category: "Meat & Seafood", savings: 24 },
      { item: "Sweet Italian sausage", qty: "20 lb", unitPrice: 9.2, total: 184.0, category: "Meat & Seafood" },
    ],
  },
  {
    id: "INV-2835",
    vendor: "Veritable Vegetable",
    date: "Jun 19",
    due: "Jul 3",
    total: 982.4,
    savings: 86.0,
    status: "paid",
    category: "Produce",
    lines: [
      { item: "Little gem lettuce", qty: "12 cs", unitPrice: 28.0, total: 336.0, category: "Produce", savings: 24 },
      { item: "Stone fruit medley", qty: "8 flt", unitPrice: 36.0, total: 288.0, category: "Produce" },
    ],
  },
  {
    id: "INV-2834",
    vendor: "Acme Bread",
    date: "Jun 18",
    due: "Overdue 2d",
    total: 482.4,
    savings: 0,
    status: "overdue",
    category: "Dry Goods",
    lines: [
      { item: "Pugliese loaf", qty: "60 ea", unitPrice: 4.2, total: 252.0, category: "Dry Goods" },
      { item: "Focaccia sheet", qty: "20 ea", unitPrice: 11.5, total: 230.0, category: "Dry Goods" },
    ],
  },
];

const SPEND_TREND = [
  { week: "W19", spend: 21400, savings: 1240 },
  { week: "W20", spend: 24820, savings: 1820 },
  { week: "W21", spend: 22640, savings: 1640 },
  { week: "W22", spend: 26180, savings: 2240 },
  { week: "W23", spend: 24960, savings: 2080 },
  { week: "W24", spend: 28420, savings: 2640 },
  { week: "W25", spend: 25840, savings: 2480 },
  { week: "W26", spend: 27680, savings: 2920 },
];

const CATEGORY_MIX = [
  { name: "Beer & Wine", value: 28, color: "hsl(var(--primary))" },
  { name: "Meat & Seafood", value: 22, color: "hsl(15 65% 52%)" },
  { name: "Produce", value: 16, color: "hsl(120 25% 45%)" },
  { name: "Dairy", value: 12, color: "hsl(38 60% 55%)" },
  { name: "Dry Goods", value: 14, color: "hsl(25 40% 40%)" },
  { name: "Paper & Chem", value: 8, color: "hsl(220 15% 55%)" },
];

const TOP_ITEMS = [
  { name: "Olive oil · 3L tin", vendor: "Restaurant Depot", spend: 4820, savings: 380, change: -4 },
  { name: "Branzino whole · 1lb", vendor: "Pacific Seafood", spend: 4280, savings: 0, change: 8 },
  { name: "Parmigiano 24mo · wheel", vendor: "Sysco", spend: 3960, savings: 320, change: -2 },
  { name: "Bavette steak", vendor: "Niman Ranch", spend: 3640, savings: 240, change: 3 },
  { name: "Heirloom tomatoes", vendor: "Sysco / Veritable", spend: 3120, savings: 180, change: 12 },
  { name: "Hendrick's Gin 750ml", vendor: "Southern Glazer's", spend: 2840, savings: 220, change: -6 },
  { name: "Burrata 8oz", vendor: "Sysco", spend: 2680, savings: 160, change: 0 },
  { name: "To-go containers 16oz", vendor: "Restaurant Depot", spend: 2120, savings: 280, change: -8 },
];

const SAVINGS_SOURCES = [
  { label: "Negotiated contract pricing", amount: 8420, share: 38 },
  { label: "Promo & rebate captures", amount: 5240, share: 24 },
  { label: "Vendor swap (cheaper SKU)", amount: 3840, share: 17 },
  { label: "Credit memos & returns", amount: 2680, share: 12 },
  { label: "Volume / case break", amount: 1980, share: 9 },
];

const AI_FLAGS = [
  {
    icon: AlertTriangle,
    tone: "warning" as const,
    title: "Heirloom tomato price up 18% w/w on Sysco",
    detail:
      "Veritable Vegetable is $0.42/lb cheaper this week. Switching saves an estimated $186 over the next 14 days.",
    action: "Draft PO swap",
  },
  {
    icon: Receipt,
    tone: "danger" as const,
    title: "Pacific Seafood INV-2838 short 4 branzino",
    detail:
      "Delivery sheet shows 18 received vs 22 billed. Auto-drafted credit memo request ready for your approval.",
    action: "Send credit request",
  },
  {
    icon: PiggyBank,
    tone: "success" as const,
    title: "Southern Glazer's Aperol promo ends Friday",
    detail:
      "Buy 6 cases, get 1 free. At current pour rate you'll use it in 5 weeks — projected savings $312.",
    action: "Add to next order",
  },
  {
    icon: Clock,
    tone: "warning" as const,
    title: "Acme Bread invoice INV-2834 is 2 days overdue",
    detail: "Net 7 terms. Pay today to avoid 1.5% late fee and keep priority delivery slot.",
    action: "Pay now",
  },
];

const totals = INVOICES.reduce(
  (acc, inv) => {
    acc.spend += inv.total;
    acc.savings += inv.savings;
    if (inv.status === "pending" || inv.status === "approved") acc.outstanding += inv.total;
    if (inv.status === "overdue") acc.overdue += inv.total;
    return acc;
  },
  { spend: 0, savings: 0, outstanding: 0, overdue: 0 },
);

const ytdSpend = VENDORS.reduce((a, v) => a + v.ytdSpend, 0);
const ytdSavings = VENDORS.reduce((a, v) => a + v.savings, 0);
const savingsRate = (ytdSavings / ytdSpend) * 100;

function formatMoney(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function statusStyles(s: Status) {
  switch (s) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "approved":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "disputed":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "overdue":
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function KPI({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  icon: typeof Wallet;
  tone?: "default" | "success" | "warning";
}) {
  const toneCls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-primary/10 text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneCls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              delta.positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {delta.positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta.value}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  );
}

function InvoicesPage() {
  const [open, setOpen] = useState<Invoice | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [ocrSheetInvoiceId, setOcrSheetInvoiceId] = useState<string | null | undefined>(undefined);

  const filtered = useMemo(() => {
    return INVOICES.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (vendorFilter !== "all" && inv.vendor !== vendorFilter) return false;
      if (query && !`${inv.id} ${inv.vendor}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [query, statusFilter, vendorFilter]);

  return (
    <>
      <Topbar eyebrow="Accounts payable" title="Invoices" />
      <main className="space-y-6 px-6 py-6">
        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="YTD spend · all vendors"
            value={formatMoney(ytdSpend, { compact: true })}
            delta={{ value: "6.4% vs LY", positive: false }}
            hint="across 8 vendors"
            icon={Wallet}
          />
          <KPI
            label="YTD savings captured"
            value={formatMoney(ytdSavings, { compact: true })}
            delta={{ value: `${savingsRate.toFixed(1)}% of spend`, positive: true }}
            hint="contracts, rebates, credits"
            icon={PiggyBank}
            tone="success"
          />
          <KPI
            label="Outstanding payables"
            value={formatMoney(totals.outstanding)}
            hint={`${INVOICES.filter((i) => i.status === "pending" || i.status === "approved").length} invoices`}
            icon={FileText}
          />
          <KPI
            label="Overdue / disputed"
            value={formatMoney(totals.overdue + INVOICES.filter((i) => i.status === "disputed").reduce((a, b) => a + b.total, 0))}
            hint="needs attention this week"
            icon={AlertTriangle}
            tone="warning"
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Weekly trend
                </div>
                <h3 className="mt-1 font-display text-xl">Spend & savings · last 8 weeks</h3>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Spend
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Savings
                </span>
              </div>
            </div>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SPEND_TREND}>
                  <defs>
                    <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v)}
                    contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                  />
                  <Area type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="url(#sp)" strokeWidth={2} />
                  <Area type="monotone" dataKey="savings" stroke="#10b981" fill="url(#sv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Category mix
            </div>
            <h3 className="mt-1 font-display text-xl">Where your dollars go</h3>
            <div className="mt-2 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_MIX}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {CATEGORY_MIX.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {CATEGORY_MIX.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="font-medium text-foreground">{c.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* AI flags */}
        <Card className="border-primary/30 bg-primary/[0.04] p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
                AP Co-pilot
              </div>
              <div className="font-display text-lg">4 things worth your attention this week</div>
            </div>
            <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Run weekly audit
            </Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {AI_FLAGS.map((f) => {
              const toneCls =
                f.tone === "danger"
                  ? "border-rose-200 bg-rose-50/40"
                  : f.tone === "success"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-amber-200 bg-amber-50/40";
              const iconCls =
                f.tone === "danger"
                  ? "bg-rose-100 text-rose-700"
                  : f.tone === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700";
              return (
                <div key={f.title} className={`rounded-xl border p-4 ${toneCls}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconCls}`}>
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{f.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{f.detail}</div>
                      <Button size="sm" variant="ghost" className="mt-2 h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10">
                        {f.action} <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-card">
              <TabsTrigger value="invoices" className="gap-1.5">
                <Inbox className="h-3.5 w-3.5" /> All invoices
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-1.5">
                <Truck className="h-3.5 w-3.5" /> Vendors
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Line items
              </TabsTrigger>
              <TabsTrigger value="savings" className="gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" /> Savings
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-1.5">
                <Bot className="h-3.5 w-3.5" /> Automation
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setOcrSheetInvoiceId(null)}
              >
                <Upload className="h-3.5 w-3.5" /> Upload invoice
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button size="sm" className="h-9 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New PO
              </Button>
            </div>
          </div>

          {/* Invoices tab */}
          <TabsContent value="invoices" className="space-y-4">
            <RealInvoiceUploadsCard onOpenInvoice={(id) => setOcrSheetInvoiceId(id)} />

            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice # or vendor"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 pl-9"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(["all", "pending", "approved", "paid", "disputed", "overdue"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={statusFilter === s ? "default" : "ghost"}
                      onClick={() => setStatusFilter(s)}
                      className="h-8 px-3 text-xs capitalize"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All vendors</option>
                  {VENDORS.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> More
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => setOpen(inv)}
                    >
                      <TableCell className="font-medium">{inv.id}</TableCell>
                      <TableCell>
                        <div>{inv.vendor}</div>
                        <div className="text-xs text-muted-foreground">{inv.category}{inv.po ? ` · ${inv.po}` : ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{inv.date}</TableCell>
                      <TableCell className="text-sm">{inv.due}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(inv.total)}</TableCell>
                      <TableCell className="text-right text-emerald-700">
                        {inv.savings > 0 ? formatMoney(inv.savings) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusStyles(inv.status)}`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-8">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{filtered.length} invoices</span>
                <div className="flex items-center gap-6">
                  <span>
                    Total spend:{" "}
                    <span className="font-medium text-foreground">
                      {formatMoney(filtered.reduce((a, b) => a + b.total, 0))}
                    </span>
                  </span>
                  <span>
                    Savings:{" "}
                    <span className="font-medium text-emerald-700">
                      {formatMoney(filtered.reduce((a, b) => a + b.savings, 0))}
                    </span>
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Vendors tab */}
          <TabsContent value="vendors" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {VENDORS.map((v) => {
                const savingRate = (v.savings / v.ytdSpend) * 100;
                return (
                  <Card key={v.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display text-lg">{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v.category}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {v.terms}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD spend</div>
                        <div className="font-display text-lg">{formatMoney(v.ytdSpend, { compact: true })}</div>
                        <div className="text-xs text-muted-foreground">MTD {formatMoney(v.mtdSpend, { compact: true })}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Savings</div>
                        <div className="font-display text-lg text-emerald-700">{formatMoney(v.savings, { compact: true })}</div>
                        <div className="text-xs text-muted-foreground">{savingRate.toFixed(1)}% of spend</div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">On-time delivery</span>
                        <span className="font-medium">{v.onTime}%</span>
                      </div>
                      <Progress value={v.onTime} className="h-1.5" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-muted-foreground">Price accuracy</span>
                        <span className="font-medium">{v.priceAccuracy}%</span>
                      </div>
                      <Progress value={v.priceAccuracy} className="h-1.5" />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{v.invoices} invoices · YTD</span>
                      <span>{v.rep}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Line items tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Top line items
                    </div>
                    <h3 className="mt-1 font-display text-xl">Where you're spending the most</h3>
                  </div>
                  <Button variant="outline" size="sm" className="h-8">Last 30 days</Button>
                </div>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Savings</TableHead>
                      <TableHead className="text-right">Δ price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TOP_ITEMS.map((i) => (
                      <TableRow key={i.name}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{i.vendor}</TableCell>
                        <TableCell className="text-right">{formatMoney(i.spend)}</TableCell>
                        <TableCell className="text-right text-emerald-700">
                          {i.savings ? formatMoney(i.savings) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              i.change > 0 ? "text-rose-600" : i.change < 0 ? "text-emerald-600" : "text-muted-foreground"
                            }`}
                          >
                            {i.change > 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : i.change < 0 ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : null}
                            {i.change === 0 ? "—" : `${Math.abs(i.change)}%`}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              <Card className="p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Category spend · MTD
                </div>
                <h3 className="mt-1 font-display text-xl">By category</h3>
                <div className="mt-3 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={CATEGORY_MIX.map((c) => ({ name: c.name, value: c.value * 480 }))}
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        width={100}
                      />
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Savings tab */}
          <TabsContent value="savings" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Savings by source
                </div>
                <h3 className="mt-1 font-display text-xl">How you saved {formatMoney(ytdSavings, { compact: true })} YTD</h3>
                <div className="mt-5 space-y-4">
                  {SAVINGS_SOURCES.map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{s.label}</span>
                        <span className="font-medium">{formatMoney(s.amount)} <span className="text-muted-foreground">· {s.share}%</span></span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${s.share * 2.5}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Top savings — vendors
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[...VENDORS]
                    .sort((a, b) => b.savings - a.savings)
                    .slice(0, 5)
                    .map((v) => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {((v.savings / v.ytdSpend) * 100).toFixed(1)}% of spend
                          </div>
                        </div>
                        <div className="font-display text-emerald-700">
                          {formatMoney(v.savings, { compact: true })}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    AI opportunities
                  </div>
                  <h3 className="mt-1 font-display text-xl">Projected savings · next 30 days</h3>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  +{formatMoney(4280, { compact: true })} opportunity
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { title: "Switch tomatoes to Veritable", value: 186, why: "$0.42/lb cheaper this week" },
                  { title: "Bundle Aperol promo", value: 312, why: "Buy 6 cs get 1 free · ends Fri" },
                  { title: "Negotiate paper contract", value: 640, why: "RD pricing up 8% over 90 days" },
                  { title: "Move dairy to weekly drop", value: 280, why: "Cuts spoilage 4% based on POS waste" },
                  { title: "Claim Pacific credit memo", value: 64, why: "Branzino short on INV-2838" },
                  { title: "Wine list re-bid Q3", value: 2800, why: "3 distributors actively pitching" },
                ].map((o) => (
                  <div key={o.title} className="rounded-xl border bg-card p-4">
                    <div className="text-sm font-medium">{o.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{o.why}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-display text-emerald-700">+{formatMoney(o.value)}</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        Action <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Automation tab */}
          <TabsContent value="automation" className="space-y-4">
            <AutomationTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Invoice drawer */}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`capitalize ${statusStyles(open.status)}`}>
                    {open.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{open.id}{open.po ? ` · ${open.po}` : ""}</span>
                </div>
                <SheetTitle className="font-display text-2xl">{open.vendor}</SheetTitle>
                <SheetDescription>
                  Delivered {open.date} · Due {open.due} · {open.category}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                  <div className="font-display text-xl">{formatMoney(open.total)}</div>
                </div>
                <div className="rounded-xl border bg-emerald-50/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Saved</div>
                  <div className="font-display text-xl text-emerald-700">{formatMoney(open.savings)}</div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Items</div>
                  <div className="font-display text-xl">{open.lines.length}</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Line items
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {open.lines.map((l) => (
                      <TableRow key={l.item}>
                        <TableCell>
                          <div className="font-medium">{l.item}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{l.category}</span>
                            {l.flag === "price-up" && (
                              <Badge variant="outline" className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] text-rose-700">
                                price ↑
                              </Badge>
                            )}
                            {l.flag === "short" && (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">
                                short
                              </Badge>
                            )}
                            {l.flag === "credit" && (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700">
                                credit
                              </Badge>
                            )}
                            {l.savings ? (
                              <span className="text-emerald-700">· saved {formatMoney(l.savings)}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{l.qty}</TableCell>
                        <TableCell className="text-right text-sm">${l.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(l.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator className="my-5" />

              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </Button>
                <div className="flex items-center gap-2">
                  {open.status === "disputed" && (
                    <Button variant="outline" size="sm">Send credit request</Button>
                  )}
                  {open.status !== "paid" && (
                    <Button size="sm" className="gap-1.5">
                      <Wallet className="h-3.5 w-3.5" /> Pay {formatMoney(open.total)}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <InvoiceOcrSheet
        invoiceId={ocrSheetInvoiceId}
        onClose={() => setOcrSheetInvoiceId(undefined)}
      />
    </>
  );
}

// =====================================================
// Real invoice OCR — upload + review, wired to the actual
// vendors/invoices/invoice_lines tables and the invoice-ocr
// Edge Function → Railway service. Everything else on this page
// (KPIs, the "All invoices" list below, vendor cards, savings,
// automation feed) is still Lovable-generated placeholder data —
// this section is the one real, working slice.
// =====================================================

function ocrStatusBadge(ocrStatus: string | null, status: "pending_review" | "approved") {
  if (status === "approved")
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Approved
      </Badge>
    );
  if (ocrStatus === "ready")
    return (
      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
        Ready for review
      </Badge>
    );
  if (ocrStatus === "failed")
    return (
      <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
        Extraction failed
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing
    </Badge>
  );
}

function RealInvoiceUploadsCard({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { data: invoices = [], isLoading } = useRealInvoices();

  if (!isLoading && invoices.length === 0) return null;

  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="flex items-center gap-2 border-b bg-primary/[0.04] px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <FileSearch className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">OCR uploads</div>
          <div className="text-sm font-medium">Invoices uploaded and extracted for review</div>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Vendor</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} className="cursor-pointer" onClick={() => onOpenInvoice(inv.id)}>
              <TableCell className="font-medium">
                {inv.vendorName ?? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                    Needs vendor
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{inv.invoiceNumber ?? "—"}</TableCell>
              <TableCell className="text-sm">{inv.invoiceDate ?? "—"}</TableCell>
              <TableCell className="text-right font-medium">
                {inv.totalCents != null ? formatMoney(inv.totalCents / 100) : "—"}
              </TableCell>
              <TableCell>{ocrStatusBadge(inv.ocrStatus, inv.status)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" className="h-8">
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// `invoiceId === undefined` → sheet closed. `null` → upload a new
// invoice. A real id → review that invoice's extraction.
function InvoiceOcrSheet({
  invoiceId,
  onClose,
}: {
  invoiceId: string | null | undefined;
  onClose: () => void;
}) {
  const [vendorId, setVendorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: vendors = [] } = useRealVendors();
  const { data: ingredients = [] } = useIngredients();
  const { data: invoices = [] } = useRealInvoices();
  const activeId = uploadedId ?? (typeof invoiceId === "string" ? invoiceId : null);
  const invoice = invoices.find((i) => i.id === activeId);
  const { data: lines = [] } = useRealInvoiceLines(activeId ?? undefined);
  const isExtracting = !invoice || invoice.ocrStatus === "processing" || invoice.ocrStatus == null;

  const uploadInvoice = useUploadInvoice();
  const enqueueOcr = useEnqueueOcr();
  const checkOcr = useCheckOcr();
  const approveInvoice = useApproveInvoice();
  const updateLineIngredient = useUpdateInvoiceLineIngredient();
  const setInvoiceVendor = useSetInvoiceVendor();

  const open = invoiceId !== undefined;

  useEffect(() => {
    if (open) {
      setVendorId("");
      setFile(null);
      setUploadedId(null);
      setStarting(false);
      setStartError(null);
    }
  }, [open, invoiceId]);

  // Poll for a result only while the invoice is genuinely still
  // processing — re-checking an already-ready/failed job would just
  // re-insert its line items every time (the Railway service doesn't
  // dedupe on check).
  useEffect(() => {
    if (!activeId || invoice?.ocrStatus !== "processing") return;
    const t = setTimeout(() => {
      checkOcr.mutate(activeId);
    }, 3000);
    return () => clearTimeout(t);
    // checkOcr's identity changes every render; only isPending should re-arm the poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, invoice?.ocrStatus, checkOcr.isPending]);

  async function handleStart() {
    if (!vendorId || !file) return;
    setStarting(true);
    setStartError(null);
    try {
      const id = await uploadInvoice.mutateAsync({ vendorId, file });
      await enqueueOcr.mutateAsync(id);
      setUploadedId(id);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">
            {activeId ? "Invoice review" : "Upload invoice"}
          </SheetTitle>
          <SheetDescription>
            {activeId
              ? "Extracted with Mindee OCR — confirm the ingredient match on each line before approving."
              : "Upload a vendor invoice PDF. It's sent to Mindee for extraction, then you review the line items before approving."}
          </SheetDescription>
        </SheetHeader>

        {!activeId && (
          <div className="mt-5 space-y-4">
            <div>
              <Label>Vendor</Label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {vendors.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No vendors yet — add one in the Vendors tab of Inventory first.
                </p>
              )}
            </div>
            <div>
              <Label>Invoice PDF</Label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
              />
            </div>
            {startError && <p className="text-sm text-rose-600">{startError}</p>}
            <Button
              onClick={handleStart}
              disabled={!vendorId || !file || starting}
              className="gap-1.5"
            >
              {starting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {starting ? "Uploading…" : "Upload & extract"}
            </Button>
          </div>
        )}

        {activeId && isExtracting && (
          <div className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="text-sm font-medium">Extracting with Mindee…</div>
            <div className="text-xs text-muted-foreground">This usually takes 10–20 seconds.</div>
          </div>
        )}

        {activeId && invoice?.ocrStatus === "failed" && (
          <div className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
            <XCircle className="h-6 w-6 text-rose-600" />
            <div className="text-sm font-medium">Extraction failed</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => enqueueOcr.mutate(activeId)}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {activeId && invoice?.ocrStatus === "ready" && !invoice.vendorId && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-800">
              This invoice arrived by email — pick the vendor
            </div>
            {(invoice.sourceEmailFrom || invoice.sourceEmailSubject) && (
              <div className="mt-1.5 text-xs text-amber-900">
                {invoice.sourceEmailFrom && <div>From: {invoice.sourceEmailFrom}</div>}
                {invoice.sourceEmailSubject && <div>Subject: {invoice.sourceEmailSubject}</div>}
              </div>
            )}
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  setInvoiceVendor.mutate({ invoiceId: activeId, vendorId: e.target.value });
                }
              }}
              className="mt-2.5 h-9 w-full rounded-md border border-amber-300 bg-white px-3 text-sm"
            >
              <option value="">Select a vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeId && invoice?.ocrStatus === "ready" && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </div>
                <div className="font-display text-xl">
                  {invoice.totalCents != null ? formatMoney(invoice.totalCents / 100) : "—"}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Invoice #
                </div>
                <div className="font-display text-xl">{invoice.invoiceNumber ?? "—"}</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Items
                </div>
                <div className="font-display text-xl">{lines.length}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Line items — match to an ingredient
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extracted description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Ingredient match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div className="font-medium">{l.rawDescription || "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.quantity != null ? `${l.quantity} ${l.unit ?? ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {l.lineTotalCents != null ? formatMoney(l.lineTotalCents / 100) : "—"}
                      </TableCell>
                      <TableCell>
                        <select
                          value={l.ingredientId ?? ""}
                          onChange={(e) =>
                            updateLineIngredient.mutate({
                              lineId: l.id,
                              ingredientId: e.target.value || null,
                            })
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="">Unmatched</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {lines.filter((l) => l.ingredientId).length}/{lines.length} lines matched
              </span>
              {invoice.status === "approved" ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approved
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => approveInvoice.mutate(activeId)}
                  disabled={approveInvoice.isPending || !invoice.vendorId}
                  title={!invoice.vendorId ? "Pick a vendor above before approving" : undefined}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve invoice
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// =====================================================
// Automation tab — auto-ingestion of vendor invoices
// =====================================================

type SourceKind = "email" | "portal" | "edi" | "api";
type SourceStatus = "connected" | "syncing" | "needs-auth" | "disconnected";

type IngestionSource = {
  id: string;
  name: string;
  kind: SourceKind;
  status: SourceStatus;
  detail: string;
  lastSync: string;
  ingested30d: number;
  accuracy: number;
};

const SOURCES: IngestionSource[] = [
  {
    id: "s1",
    name: "Gmail · invoices@thrasherspub.com",
    kind: "email",
    status: "connected",
    detail: "Watching label: AP/Inbox · 14 vendors auto-detected",
    lastSync: "1m ago",
    ingested30d: 184,
    accuracy: 98.4,
  },
  {
    id: "s2",
    name: "Southern Glazer's · eInvoice portal",
    kind: "portal",
    status: "connected",
    detail: "Nightly login at 3:00am · headless agent",
    lastSync: "6h ago",
    ingested30d: 42,
    accuracy: 99.1,
  },
  {
    id: "s3",
    name: "Sysco · Sysco Now API",
    kind: "api",
    status: "connected",
    detail: "OAuth direct feed · webhook + nightly reconcile",
    lastSync: "12m ago",
    ingested30d: 38,
    accuracy: 99.6,
  },
  {
    id: "s4",
    name: "Columbia Distributing · portal",
    kind: "portal",
    status: "syncing",
    detail: "Pulling 4 new invoices…",
    lastSync: "just now",
    ingested30d: 22,
    accuracy: 97.2,
  },
  {
    id: "s5",
    name: "Restaurant Depot · receipt scan",
    kind: "email",
    status: "connected",
    detail: "OCR on PDF receipts forwarded from inbox",
    lastSync: "2h ago",
    ingested30d: 18,
    accuracy: 94.0,
  },
  {
    id: "s6",
    name: "Pacific Seafood · EDI 810",
    kind: "edi",
    status: "needs-auth",
    detail: "VAN credentials expired · reconnect to resume",
    lastSync: "3d ago",
    ingested30d: 12,
    accuracy: 99.8,
  },
];

type FeedEvent = {
  id: string;
  time: string;
  vendor: string;
  source: string;
  step: string;
  result: "auto-approved" | "queued" | "flagged" | "matched";
  detail: string;
};

const FEED: FeedEvent[] = [
  {
    id: "f1",
    time: "2m ago",
    vendor: "Sysco Foods",
    source: "API webhook",
    step: "Parsed INV-2841 · matched to PO-1184",
    result: "auto-approved",
    detail: "$3,284.60 · 12 line items · 100% confidence",
  },
  {
    id: "f2",
    time: "14m ago",
    vendor: "Pacific Seafood",
    source: "Gmail attachment",
    step: "Parsed INV-2838",
    result: "flagged",
    detail: "Short 4 branzino vs delivery sheet — credit memo drafted",
  },
  {
    id: "f3",
    time: "38m ago",
    vendor: "Southern Glazer's",
    source: "Portal scrape",
    step: "Downloaded 3 PDFs · OCR + extracted",
    result: "auto-approved",
    detail: "Aperol promo credit recognized — $96 savings posted",
  },
  {
    id: "f4",
    time: "1h ago",
    vendor: "Acme Bread",
    source: "Gmail attachment",
    step: "Parsed INV-2834",
    result: "queued",
    detail: "Net 7 overdue 2d — awaiting your payment approval",
  },
  {
    id: "f5",
    time: "2h ago",
    vendor: "Veritable Vegetable",
    source: "Gmail attachment",
    step: "Parsed INV-2835 · matched PO-1178",
    result: "matched",
    detail: "All quantities & prices match · auto-posted",
  },
  {
    id: "f6",
    time: "3h ago",
    vendor: "Niman Ranch",
    source: "Gmail attachment",
    step: "Parsed INV-2836",
    result: "auto-approved",
    detail: "$1,842.00 · 6 line items",
  },
];

type ReviewItem = {
  id: string;
  vendor: string;
  invoice: string;
  total: number;
  reason: string;
  confidence: number;
  arrived: string;
};

const REVIEW_QUEUE: ReviewItem[] = [
  {
    id: "rq1",
    vendor: "Pacific Seafood",
    invoice: "INV-2838",
    total: 1284.4,
    reason: "Quantity mismatch · billed 22 branzino, delivery sheet 18",
    confidence: 88,
    arrived: "14m ago",
  },
  {
    id: "rq2",
    vendor: "Sysco Foods",
    invoice: "INV-2839",
    total: 3284.6,
    reason: "Heirloom tomato unit price +18% vs 30d avg",
    confidence: 92,
    arrived: "1h ago",
  },
  {
    id: "rq3",
    vendor: "New vendor: Olio Verde",
    invoice: "OV-00214",
    total: 482.0,
    reason: "First invoice from this vendor — confirm mapping",
    confidence: 71,
    arrived: "4h ago",
  },
  {
    id: "rq4",
    vendor: "Restaurant Depot",
    invoice: "RD-887421",
    total: 1842.18,
    reason: "PO not found · ad-hoc purchase confirmation",
    confidence: 95,
    arrived: "6h ago",
  },
];

function sourceStatusBadge(s: SourceStatus) {
  if (s === "connected")
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
      </Badge>
    );
  if (s === "syncing")
    return (
      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
        <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Syncing
      </Badge>
    );
  if (s === "needs-auth")
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
        <AlertTriangle className="mr-1 h-3 w-3" /> Reconnect
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-muted bg-muted/40 text-muted-foreground">
      Disconnected
    </Badge>
  );
}

function kindIcon(k: SourceKind) {
  if (k === "email") return Mail;
  if (k === "portal") return Globe;
  if (k === "edi") return Plug;
  return Zap;
}

function resultBadge(r: FeedEvent["result"]) {
  const map = {
    "auto-approved": "border-emerald-200 bg-emerald-50 text-emerald-700",
    matched: "border-sky-200 bg-sky-50 text-sky-700",
    queued: "border-amber-200 bg-amber-50 text-amber-800",
    flagged: "border-rose-200 bg-rose-50 text-rose-700",
  } as const;
  return (
    <Badge variant="outline" className={`capitalize ${map[r]}`}>
      {r.replace("-", " ")}
    </Badge>
  );
}

function AutomationTab() {
  const connected = SOURCES.filter((s) => s.status === "connected" || s.status === "syncing").length;
  const total30d = FEED.length + REVIEW_QUEUE.length + 168;
  const autoRate = 92;

  return (
    <div className="space-y-4">
      {/* Hero strip */}
      <Card className="border-primary/30 bg-primary/[0.04] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
              Invoice ingestion agent
            </div>
            <h3 className="font-display text-xl">
              Pulling invoices automatically from email, vendor portals, and EDI feeds
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every PDF, email, and portal upload is OCR'd, matched to a PO and delivery receipt,
              then auto-approved or queued for your eye. You stop entering invoices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Sync now
            </Button>
            <Button size="sm" className="h-9 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Connect source
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources live</div>
            <div className="font-display text-2xl">{connected}/{SOURCES.length}</div>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ingested · 30d</div>
            <div className="font-display text-2xl">{total30d}</div>
            <div className="text-xs text-emerald-700">+24% vs last month</div>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-approved</div>
            <div className="font-display text-2xl">{autoRate}%</div>
            <div className="text-xs text-muted-foreground">{100 - autoRate}% routed to review</div>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Time saved</div>
            <div className="font-display text-2xl">14.2 hrs</div>
            <div className="text-xs text-muted-foreground">vs manual entry · 30d</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sources */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Inbox sources
              </div>
              <h3 className="mt-1 font-display text-xl">Where invoices come from</h3>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add source
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {SOURCES.map((s) => {
              const Icon = kindIcon(s.kind);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{s.name}</div>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {s.kind}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{s.detail}</div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <div>{s.ingested30d} · 30d</div>
                    <div>{s.accuracy}% acc.</div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">{s.lastSync}</div>
                  {sourceStatusBadge(s.status)}
                </div>
              );
            })}
          </div>

          <Separator className="my-5" />

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Gmail / Google Workspace", icon: Mail },
              { label: "Outlook / Microsoft 365", icon: Mail },
              { label: "Vendor portal (custom)", icon: Globe },
              { label: "EDI 810 / VAN", icon: Plug },
            ].map((c) => (
              <button
                key={c.label}
                className="flex items-center gap-2 rounded-xl border border-dashed bg-card/60 p-3 text-left text-sm hover:bg-accent"
              >
                <c.icon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{c.label}</span>
                <Plus className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>

        {/* Live activity feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Live activity
              </div>
              <h3 className="mt-1 font-display text-xl">Ingestion feed</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {FEED.map((f) => (
              <div key={f.id} className="border-l-2 border-primary/40 pl-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{f.time}</span>
                  <span>·</span>
                  <span>{f.source}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-medium">{f.vendor}</span>
                  {resultBadge(f.result)}
                </div>
                <div className="text-xs text-muted-foreground">{f.step}</div>
                <div className="text-xs">{f.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Review queue */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <FileSearch className="h-3.5 w-3.5" /> Needs your eye
            </div>
            <h3 className="mt-1 font-display text-xl">Review queue · {REVIEW_QUEUE.length}</h3>
          </div>
          <Button variant="outline" size="sm" className="h-8">
            Approve all matching rules
          </Button>
        </div>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Vendor / Invoice</TableHead>
              <TableHead>Why flagged</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Arrived</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {REVIEW_QUEUE.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.vendor}</div>
                  <div className="text-xs text-muted-foreground">{r.invoice}</div>
                </TableCell>
                <TableCell className="text-sm">{r.reason}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={r.confidence} className="h-1.5 w-20" />
                    <span className="text-xs font-medium">{r.confidence}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{formatMoney(r.total)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.arrived}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600">
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" className="h-7 gap-1 px-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Agent settings + pipeline */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Agent rules & guardrails
            </div>
          </div>
          <h3 className="mt-1 font-display text-xl">How aggressively to automate</h3>

          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="flex items-center justify-between">
                <Label>Auto-approve confidence threshold</Label>
                <span className="font-medium">95%</span>
              </div>
              <Progress value={95} className="mt-2 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                Anything below 95% extraction confidence goes to your review queue.
              </p>
            </div>

            {[
              {
                label: "Auto-approve trusted vendors under $500 with matching PO",
                desc: "Sysco, Niman Ranch, Veritable, Acme Bread, Columbia",
                on: true,
              },
              {
                label: "Auto-approve 3-way matched invoices (PO + delivery + invoice)",
                desc: "All quantities and prices within 2% tolerance",
                on: true,
              },
              {
                label: "Require approval for invoices >$2,500",
                desc: "Regardless of vendor or PO match",
                on: true,
              },
              {
                label: "Require approval on price increase >10%",
                desc: "Compared to trailing 30-day average unit price",
                on: true,
              },
              {
                label: "Always review first 3 invoices from new vendor",
                desc: "Helps the agent learn each vendor's layout",
                on: true,
              },
              {
                label: "Auto-pay invoices marked approved on due date",
                desc: "Uses your default payment account",
                on: false,
              },
            ].map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
                <Switch defaultChecked={r.on} />
              </div>
            ))}
          </div>

          <Separator className="my-5" />

          <div className="space-y-2 text-sm">
            <Label>Notify on exceptions</Label>
            <Input defaultValue="bali@thrasherspub.com, ap@thrasherspub.com" />
            <p className="text-xs text-muted-foreground">
              Email + push when something needs review. Daily digest at 9am.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              How the agent works
            </div>
          </div>
          <h3 className="mt-1 font-display text-xl">Extraction pipeline</h3>

          <ol className="mt-4 space-y-3">
            {[
              {
                icon: Mail,
                title: "1 · Collect",
                detail: "Watches inbox, portals, and EDI feeds 24/7 for new invoices.",
              },
              {
                icon: FileSearch,
                title: "2 · OCR + parse",
                detail: "Reads PDFs, photos, scans. Recovers line items even from messy layouts.",
              },
              {
                icon: Wand2,
                title: "3 · Extract",
                detail:
                  "AI pulls vendor, invoice #, dates, line items, unit prices, taxes, totals into structured JSON.",
              },
              {
                icon: CheckCircle2,
                title: "4 · 3-way match",
                detail: "Cross-checks invoice ↔ purchase order ↔ delivery receipt.",
              },
              {
                icon: AlertTriangle,
                title: "5 · Flag exceptions",
                detail:
                  "Catches price hikes, short qty, duplicates, missing POs, new vendors.",
              },
              {
                icon: Sparkles,
                title: "6 · Post or route",
                detail: "Auto-posts if confident, otherwise queues for your 1-click approval.",
              },
            ].map((step) => (
              <li key={step.title} className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>

          <Separator className="my-5" />

          <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">For your Claude backend</div>
            Suggested stack: Gmail / Microsoft Graph for email watch, Mistral OCR or Google
            Document AI for layout, Claude 3.5 Sonnet for line-item extraction, Playwright for
            portal scraping, and your DB to dedupe by invoice #.
          </div>
        </Card>
      </div>
    </div>
  );
}

// Label primitive (kept local to avoid extra import)
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium">{children}</div>;
}

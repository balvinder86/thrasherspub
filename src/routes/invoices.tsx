import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  FileText,
  Inbox,
  Loader2,
  Mail,
  PiggyBank,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  Upload,
  Wallet,
  XCircle,
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
  useEmailIngestionActivity,
  useEmailIngestionStatus,
  useEnqueueOcr,
  useIngredients,
  useRealInvoiceLines,
  useRealInvoices,
  useSetInvoiceVendor,
  useUpdateInvoiceLineIngredient,
  useUploadInvoice,
  useVendors as useRealVendors,
  useVendorSpendSummary,
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
      {
        item: "Hendrick's Gin 750ml",
        qty: "12 btl",
        unitPrice: 28.4,
        total: 340.8,
        category: "Beer & Wine",
        savings: 24,
      },
      { item: "Aperol 1L", qty: "6 btl", unitPrice: 22.1, total: 132.6, category: "Beer & Wine" },
      {
        item: "Lambrusco · case",
        qty: "8 cs",
        unitPrice: 96.0,
        total: 768.0,
        category: "Beer & Wine",
        savings: 96,
        flag: "credit",
      },
      {
        item: "Negroni pre-mix · keg",
        qty: "2 kg",
        unitPrice: 142.0,
        total: 284.0,
        category: "Beer & Wine",
      },
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
      {
        item: "Olive oil · 3L tin",
        qty: "8 tin",
        unitPrice: 38.2,
        total: 305.6,
        category: "Dry Goods",
        savings: 32,
      },
      {
        item: "Semolina flour 50lb",
        qty: "4 bag",
        unitPrice: 42.5,
        total: 170.0,
        category: "Dry Goods",
      },
      {
        item: "Nitrile gloves L · 1000ct",
        qty: "3 cs",
        unitPrice: 56.0,
        total: 168.0,
        category: "Paper & Chem",
      },
      {
        item: "To-go containers 16oz",
        qty: "10 cs",
        unitPrice: 38.4,
        total: 384.0,
        category: "Paper & Chem",
        savings: 48,
      },
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
      {
        item: "Heirloom tomatoes · 20lb",
        qty: "6 cs",
        unitPrice: 64.0,
        total: 384.0,
        category: "Produce",
        flag: "price-up",
      },
      { item: "Burrata 8oz", qty: "24 ea", unitPrice: 6.8, total: 163.2, category: "Dairy" },
      {
        item: "EVOO 5L · house",
        qty: "4 jug",
        unitPrice: 72.0,
        total: 288.0,
        category: "Dry Goods",
        savings: 36,
      },
      {
        item: "Parmigiano 24mo · wheel",
        qty: "1 ea",
        unitPrice: 482.0,
        total: 482.0,
        category: "Dairy",
        savings: 48,
      },
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
      {
        item: "Branzino whole · 1lb",
        qty: "18 ea",
        unitPrice: 14.2,
        total: 255.6,
        category: "Meat & Seafood",
        flag: "short",
      },
      {
        item: "Diver scallops U10",
        qty: "8 lb",
        unitPrice: 38.0,
        total: 304.0,
        category: "Meat & Seafood",
      },
      {
        item: "Live mussels · 5lb",
        qty: "6 bag",
        unitPrice: 18.0,
        total: 108.0,
        category: "Meat & Seafood",
      },
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
      {
        item: "Anchor Steam · 1/2 bbl",
        qty: "2 kg",
        unitPrice: 184.0,
        total: 368.0,
        category: "Beverage",
      },
      {
        item: "Topo Chico · 24pk",
        qty: "10 cs",
        unitPrice: 32.4,
        total: 324.0,
        category: "Beverage",
        savings: 36,
      },
      {
        item: "Fever-Tree tonic",
        qty: "6 cs",
        unitPrice: 48.0,
        total: 288.0,
        category: "Beverage",
      },
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
      {
        item: "Pork shoulder · whole",
        qty: "32 lb",
        unitPrice: 7.8,
        total: 249.6,
        category: "Meat & Seafood",
      },
      {
        item: "Bavette steak",
        qty: "24 lb",
        unitPrice: 18.4,
        total: 441.6,
        category: "Meat & Seafood",
        savings: 24,
      },
      {
        item: "Sweet Italian sausage",
        qty: "20 lb",
        unitPrice: 9.2,
        total: 184.0,
        category: "Meat & Seafood",
      },
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
      {
        item: "Little gem lettuce",
        qty: "12 cs",
        unitPrice: 28.0,
        total: 336.0,
        category: "Produce",
        savings: 24,
      },
      {
        item: "Stone fruit medley",
        qty: "8 flt",
        unitPrice: 36.0,
        total: 288.0,
        category: "Produce",
      },
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
      {
        item: "Focaccia sheet",
        qty: "20 ea",
        unitPrice: 11.5,
        total: 230.0,
        category: "Dry Goods",
      },
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
  {
    name: "Hendrick's Gin 750ml",
    vendor: "Southern Glazer's",
    spend: 2840,
    savings: 220,
    change: -6,
  },
  { name: "Burrata 8oz", vendor: "Sysco", spend: 2680, savings: 160, change: 0 },
  {
    name: "To-go containers 16oz",
    vendor: "Restaurant Depot",
    spend: 2120,
    savings: 280,
    change: -8,
  },
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending_review" | "approved">("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [ocrSheetInvoiceId, setOcrSheetInvoiceId] = useState<string | null | undefined>(undefined);

  const { data: realInvoices = [] } = useRealInvoices();
  const { data: realVendors = [] } = useRealVendors();
  const { data: vendorSpend = [] } = useVendorSpendSummary();

  const realKpis = useMemo(() => {
    const approved = realInvoices.filter((i) => i.status === "approved");
    const pending = realInvoices.filter((i) => i.status === "pending_review");
    const now = new Date();
    const thisMonthCount = realInvoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return {
      approvedSpendCents: approved.reduce((a, b) => a + (b.totalCents ?? 0), 0),
      approvedCount: approved.length,
      pendingCents: pending.reduce((a, b) => a + (b.totalCents ?? 0), 0),
      pendingCount: pending.length,
      thisMonthCount,
    };
  }, [realInvoices]);

  const filteredInvoices = useMemo(() => {
    return realInvoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (vendorFilter !== "all" && inv.vendorName !== vendorFilter) return false;
      if (query) {
        const haystack = `${inv.invoiceNumber ?? ""} ${inv.vendorName ?? ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [realInvoices, query, statusFilter, vendorFilter]);

  return (
    <>
      <Topbar eyebrow="Accounts payable" title="Invoices" />
      <main className="space-y-6 px-6 py-6">
        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPI
            label="Total spend · approved"
            value={formatMoney(realKpis.approvedSpendCents / 100, { compact: true })}
            hint={`${realKpis.approvedCount} approved invoice${realKpis.approvedCount === 1 ? "" : "s"}`}
            icon={Wallet}
          />
          <KPI
            label="Pending review"
            value={formatMoney(realKpis.pendingCents / 100, { compact: true })}
            hint={`${realKpis.pendingCount} invoice${realKpis.pendingCount === 1 ? "" : "s"}`}
            icon={FileText}
            tone={realKpis.pendingCount > 0 ? "warning" : "default"}
          />
          <KPI
            label="Active vendors"
            value={String(realVendors.length)}
            hint="in your vendor list"
            icon={Truck}
          />
          <KPI
            label="Invoices this month"
            value={String(realKpis.thisMonthCount)}
            hint="uploaded or emailed in"
            icon={Inbox}
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
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v)}
                    contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="hsl(var(--primary))"
                    fill="url(#sp)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    stroke="#10b981"
                    fill="url(#sv)"
                    strokeWidth={2}
                  />
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
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconCls}`}
                    >
                      <f.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{f.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{f.detail}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                      >
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
                  {(["all", "pending_review", "approved"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={statusFilter === s ? "default" : "ghost"}
                      onClick={() => setStatusFilter(s)}
                      className="h-8 px-3 text-xs capitalize"
                    >
                      {s === "pending_review" ? "Pending review" : s}
                    </Button>
                  ))}
                </div>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All vendors</option>
                  {realVendors.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>

            <Card className="overflow-hidden">
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
                  {filteredInvoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => setOcrSheetInvoiceId(inv.id)}
                    >
                      <TableCell className="font-medium">
                        {inv.vendorName ?? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-800"
                          >
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
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No invoices yet — upload one or connect email ingestion to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"}
                </span>
                <span>
                  Total:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoney(
                      filteredInvoices.reduce((a, b) => a + (b.totalCents ?? 0), 0) / 100,
                    )}
                  </span>
                </span>
              </div>
            </Card>
          </TabsContent>

          {/* Vendors tab */}
          <TabsContent value="vendors" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {vendorSpend.map((v) => (
                <Card key={v.vendorId} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-display text-lg">{v.name}</div>
                      {v.contactName && (
                        <div className="truncate text-xs text-muted-foreground">
                          {v.contactName}
                        </div>
                      )}
                    </div>
                    {v.terms && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {v.terms}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Approved spend
                      </div>
                      <div className="font-display text-lg">
                        {formatMoney(v.approvedSpendCents / 100, { compact: true })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Invoices
                      </div>
                      <div className="font-display text-lg">{v.approvedInvoiceCount}</div>
                      {v.pendingInvoiceCount > 0 && (
                        <div className="text-xs text-amber-700">
                          {v.pendingInvoiceCount} pending review
                        </div>
                      )}
                    </div>
                  </div>

                  {(v.email || v.phone) && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {v.email && <div>{v.email}</div>}
                        {v.phone && <div>{v.phone}</div>}
                      </div>
                    </>
                  )}
                </Card>
              ))}
              {vendorSpend.length === 0 && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No vendors yet — add one in Inventory &amp; Ordering.
                </p>
              )}
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
                  <Button variant="outline" size="sm" className="h-8">
                    Last 30 days
                  </Button>
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
                              i.change > 0
                                ? "text-rose-600"
                                : i.change < 0
                                  ? "text-emerald-600"
                                  : "text-muted-foreground"
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
                      <CartesianGrid
                        stroke="hsl(var(--border))"
                        strokeDasharray="3 3"
                        horizontal={false}
                      />
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

          {/* Automation tab */}
          <TabsContent value="automation" className="space-y-4">
            <AutomationTab />
          </TabsContent>
        </Tabs>
      </main>

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
// Edge Function → Railway service. KPIs, the "All invoices" list,
// vendor cards, and the Automation tab are now also wired to real
// data (see InvoicesPage / AutomationTab below) — the Weekly trend
// chart, Category mix, and AI flags card above the tabs are still
// Lovable-generated placeholder, out of scope for now.
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
// =====================================================
// Automation tab — real Gmail-based invoice ingestion.
// Replaces the old email/portal/API/EDI mockup with the one real
// connected source (Gmail), a real recent-activity feed from
// processed_email_messages, and the real pending-review queue.
// =====================================================

function AutomationTab() {
  const { data: status } = useEmailIngestionStatus();
  const { data: activity = [] } = useEmailIngestionActivity();
  const { data: allInvoices = [] } = useRealInvoices();
  const pending = allInvoices.filter((i) => i.status === "pending_review");

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.04] p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">
              Email ingestion
            </div>
            {status ? (
              <>
                <h3 className="font-display text-xl">{status.connectedEmail}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {status.labelFilter
                    ? `Watching the "${status.labelFilter}" label · checks every 15 minutes`
                    : "No label set — checks every message with a PDF attachment"}
                  {status.lastSyncedAt &&
                    ` · last ran ${new Date(status.lastSyncedAt).toLocaleString()}`}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-display text-xl">No inbox connected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Email ingestion hasn't been set up for this restaurant yet.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Recent activity
          </div>
          <h3 className="mt-1 font-display text-xl">Emails processed</h3>
          <div className="mt-4 space-y-3">
            {activity.map((e) => (
              <div key={e.id} className="border-l-2 border-primary/40 pl-3">
                <div className="text-xs text-muted-foreground">
                  {new Date(e.processedAt).toLocaleString()}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {e.vendorName ?? (e.invoiceId ? "Needs vendor" : "No PDF found")}
                  </span>
                  {e.invoiceId ? (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                      Invoice created
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-muted bg-muted/40 text-muted-foreground"
                    >
                      Skipped
                    </Badge>
                  )}
                </div>
                {e.totalCents != null && (
                  <div className="text-xs text-muted-foreground">
                    {formatMoney(e.totalCents / 100)}
                  </div>
                )}
              </div>
            ))}
            {activity.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No emails processed yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <FileSearch className="h-3.5 w-3.5" /> Needs your eye
          </div>
          <h3 className="mt-1 font-display text-xl">Pending review · {pending.length}</h3>
          <div className="mt-4 space-y-3">
            {pending.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{i.vendorName ?? "Needs vendor"}</div>
                  <div className="text-xs text-muted-foreground">{i.invoiceNumber ?? "—"}</div>
                </div>
                <div className="font-display">
                  {i.totalCents != null ? formatMoney(i.totalCents / 100) : "—"}
                </div>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing pending.</p>
            )}
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

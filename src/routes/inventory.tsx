import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  Filter,
  Mail,
  Minus,
  Package,
  Plus,
  Search,
  Send,
  Settings2,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
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

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & Ordering · Thrasher's Pub" },
      {
        name: "description",
        content:
          "Track par levels across beverages, alcohol, food and dry goods. Build smart carts and let the AI ordering agent send POs to vendors automatically.",
      },
    ],
  }),
  component: InventoryPage,
});

type Category = "Beverages" | "Alcohol" | "Food" | "Dry Goods" | "Miscellaneous";

type Item = {
  id: string;
  name: string;
  category: Category;
  unit: string;
  onHand: number;
  par: number;
  vendor: string;
  cost: number;
  weeklyUsage: number;
  lastOrdered: string;
};

const CATEGORIES: Category[] = [
  "Beverages",
  "Alcohol",
  "Food",
  "Dry Goods",
  "Miscellaneous",
];

const VENDORS = [
  "Southern Glazer's",
  "Columbia Distributing",
  "Sysco",
  "Restaurant Depot",
  "US Foods",
  "Pepsi Bottling",
  "Local Produce Co.",
];

const INITIAL_ITEMS: Item[] = [
  // Alcohol
  { id: "a1", name: "Tito's Handmade Vodka 1.75L", category: "Alcohol", unit: "btl", onHand: 4, par: 12, vendor: "Southern Glazer's", cost: 28.5, weeklyUsage: 9, lastOrdered: "Jun 18" },
  { id: "a2", name: "Jameson Irish Whiskey 1L", category: "Alcohol", unit: "btl", onHand: 6, par: 10, vendor: "Southern Glazer's", cost: 32.1, weeklyUsage: 6, lastOrdered: "Jun 20" },
  { id: "a3", name: "Don Julio Blanco 750ml", category: "Alcohol", unit: "btl", onHand: 2, par: 6, vendor: "Southern Glazer's", cost: 42.0, weeklyUsage: 4, lastOrdered: "Jun 15" },
  { id: "a4", name: "Bulleit Bourbon 1L", category: "Alcohol", unit: "btl", onHand: 5, par: 8, vendor: "Southern Glazer's", cost: 36.8, weeklyUsage: 5, lastOrdered: "Jun 21" },
  { id: "a5", name: "Guinness Draught 1/2 keg", category: "Alcohol", unit: "keg", onHand: 1, par: 3, vendor: "Columbia Distributing", cost: 195.0, weeklyUsage: 2, lastOrdered: "Jun 19" },
  { id: "a6", name: "Stella Artois 1/2 keg", category: "Alcohol", unit: "keg", onHand: 2, par: 4, vendor: "Columbia Distributing", cost: 168.0, weeklyUsage: 3, lastOrdered: "Jun 22" },
  { id: "a7", name: "Modelo Especial 24pk btl", category: "Alcohol", unit: "case", onHand: 3, par: 8, vendor: "Columbia Distributing", cost: 38.5, weeklyUsage: 6, lastOrdered: "Jun 21" },
  // Beverages
  { id: "b1", name: "Coke Syrup BIB", category: "Beverages", unit: "bag", onHand: 2, par: 6, vendor: "Pepsi Bottling", cost: 92.0, weeklyUsage: 3, lastOrdered: "Jun 17" },
  { id: "b2", name: "Diet Coke Syrup BIB", category: "Beverages", unit: "bag", onHand: 3, par: 4, vendor: "Pepsi Bottling", cost: 92.0, weeklyUsage: 2, lastOrdered: "Jun 17" },
  { id: "b3", name: "Sprite Syrup BIB", category: "Beverages", unit: "bag", onHand: 1, par: 3, vendor: "Pepsi Bottling", cost: 92.0, weeklyUsage: 2, lastOrdered: "Jun 17" },
  { id: "b4", name: "Cranberry Juice 32oz", category: "Beverages", unit: "btl", onHand: 8, par: 12, vendor: "Sysco", cost: 4.2, weeklyUsage: 5, lastOrdered: "Jun 22" },
  { id: "b5", name: "Fresh Lime Juice 1gal", category: "Beverages", unit: "gal", onHand: 1, par: 4, vendor: "Local Produce Co.", cost: 18.0, weeklyUsage: 3, lastOrdered: "Jun 23" },
  // Food
  { id: "f1", name: "Ground Beef 80/20 10lb", category: "Food", unit: "case", onHand: 4, par: 12, vendor: "Restaurant Depot", cost: 48.5, weeklyUsage: 8, lastOrdered: "Jun 20" },
  { id: "f2", name: "Chicken Wings Jumbo 40lb", category: "Food", unit: "case", onHand: 2, par: 6, vendor: "Sysco", cost: 142.0, weeklyUsage: 4, lastOrdered: "Jun 21" },
  { id: "f3", name: "Russet Potatoes 50lb", category: "Food", unit: "bag", onHand: 3, par: 8, vendor: "Local Produce Co.", cost: 24.0, weeklyUsage: 5, lastOrdered: "Jun 22" },
  { id: "f4", name: "Brioche Burger Buns 12ct", category: "Food", unit: "pack", onHand: 6, par: 20, vendor: "Sysco", cost: 6.8, weeklyUsage: 14, lastOrdered: "Jun 22" },
  { id: "f5", name: "Cheddar Slices 5lb", category: "Food", unit: "case", onHand: 4, par: 8, vendor: "Restaurant Depot", cost: 22.5, weeklyUsage: 5, lastOrdered: "Jun 19" },
  { id: "f6", name: "Romaine Hearts 12ct", category: "Food", unit: "case", onHand: 1, par: 4, vendor: "Local Produce Co.", cost: 28.0, weeklyUsage: 3, lastOrdered: "Jun 23" },
  // Dry Goods
  { id: "d1", name: "All-Purpose Flour 50lb", category: "Dry Goods", unit: "bag", onHand: 2, par: 4, vendor: "Restaurant Depot", cost: 18.5, weeklyUsage: 1, lastOrdered: "Jun 10" },
  { id: "d2", name: "Kosher Salt 3lb", category: "Dry Goods", unit: "box", onHand: 6, par: 8, vendor: "Restaurant Depot", cost: 4.2, weeklyUsage: 1, lastOrdered: "Jun 05" },
  { id: "d3", name: "Canola Oil 35lb", category: "Dry Goods", unit: "jug", onHand: 1, par: 4, vendor: "US Foods", cost: 42.0, weeklyUsage: 2, lastOrdered: "Jun 18" },
  { id: "d4", name: "Pasta Penne 20lb", category: "Dry Goods", unit: "case", onHand: 3, par: 5, vendor: "US Foods", cost: 26.0, weeklyUsage: 1, lastOrdered: "Jun 12" },
  // Misc
  { id: "m1", name: "Cocktail Napkins 4000ct", category: "Miscellaneous", unit: "case", onHand: 2, par: 4, vendor: "Restaurant Depot", cost: 38.0, weeklyUsage: 1, lastOrdered: "Jun 14" },
  { id: "m2", name: "To-Go Boxes 200ct", category: "Miscellaneous", unit: "case", onHand: 3, par: 6, vendor: "Restaurant Depot", cost: 32.0, weeklyUsage: 2, lastOrdered: "Jun 18" },
  { id: "m3", name: "Nitrile Gloves L 1000ct", category: "Miscellaneous", unit: "case", onHand: 1, par: 3, vendor: "US Foods", cost: 58.0, weeklyUsage: 1, lastOrdered: "Jun 16" },
  { id: "m4", name: "Dish Detergent 5gal", category: "Miscellaneous", unit: "pail", onHand: 1, par: 2, vendor: "US Foods", cost: 64.0, weeklyUsage: 1, lastOrdered: "Jun 11" },
];

const USAGE_TREND = [
  { week: "W19", usage: 14200 },
  { week: "W20", usage: 15100 },
  { week: "W21", usage: 13800 },
  { week: "W22", usage: 16400 },
  { week: "W23", usage: 15900 },
  { week: "W24", usage: 17200 },
  { week: "W25", usage: 16800 },
];

function suggestedQty(item: Item) {
  // suggested = par - onHand, padded by ~10% safety stock, min 0
  const base = Math.max(0, item.par - item.onHand);
  const safety = Math.ceil(item.weeklyUsage * 0.15);
  return base > 0 ? base + safety : 0;
}

function stockState(item: Item): { label: string; tone: string } {
  const ratio = item.onHand / item.par;
  if (ratio <= 0.34) return { label: "Critical", tone: "bg-[hsl(var(--terracotta))]/15 text-[hsl(var(--terracotta))] border-[hsl(var(--terracotta))]/30" };
  if (ratio <= 0.6) return { label: "Low", tone: "bg-amber-100 text-amber-900 border-amber-300" };
  if (ratio >= 1) return { label: "Stocked", tone: "bg-emerald-100 text-emerald-900 border-emerald-300" };
  return { label: "OK", tone: "bg-stone-100 text-stone-700 border-stone-300" };
}

function InventoryPage() {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);
  const [tab, setTab] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [autoSend, setAutoSend] = useState(true);
  const [confirmThreshold, setConfirmThreshold] = useState(true);
  const [sentToast, setSentToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (tab !== "All" && i.category !== tab) return false;
      if (vendorFilter !== "All" && i.vendor !== vendorFilter) return false;
      if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [items, tab, vendorFilter, query]);

  const kpis = useMemo(() => {
    const critical = items.filter((i) => i.onHand / i.par <= 0.34).length;
    const low = items.filter((i) => {
      const r = i.onHand / i.par;
      return r > 0.34 && r <= 0.6;
    }).length;
    const inventoryValue = items.reduce((s, i) => s + i.onHand * i.cost, 0);
    const cartValue = Object.entries(cart).reduce((s, [id, q]) => {
      const it = items.find((x) => x.id === id);
      return s + (it ? it.cost * q : 0);
    }, 0);
    return { critical, low, inventoryValue, cartValue };
  }, [items, cart]);

  const addToCart = (id: string, qty: number) => {
    if (qty <= 0) return;
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + qty }));
  };
  const setCartQty = (id: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };
  const updatePar = (id: string, par: number) => {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, par } : i)));
  };
  const updateOnHand = (id: string, onHand: number) => {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, onHand } : i)));
  };

  const autoFillCart = () => {
    const next: Record<string, number> = { ...cart };
    items.forEach((i) => {
      const q = suggestedQty(i);
      if (q > 0) next[i.id] = q;
    });
    setCart(next);
    setCartOpen(true);
  };

  // Group cart by vendor for the "send to vendors" view
  const cartByVendor = useMemo(() => {
    const groups: Record<string, { items: Array<Item & { qty: number; lineTotal: number }>; total: number }> = {};
    Object.entries(cart).forEach(([id, qty]) => {
      const it = items.find((x) => x.id === id);
      if (!it) return;
      const lineTotal = it.cost * qty;
      if (!groups[it.vendor]) groups[it.vendor] = { items: [], total: 0 };
      groups[it.vendor].items.push({ ...it, qty, lineTotal });
      groups[it.vendor].total += lineTotal;
    });
    return groups;
  }, [cart, items]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const sendToVendors = () => {
    const vendorCount = Object.keys(cartByVendor).length;
    setSentToast(`AI agent dispatched ${vendorCount} purchase order${vendorCount === 1 ? "" : "s"} to vendors. Confirmations expected within 15 min.`);
    setCart({});
    setCartOpen(false);
    setTimeout(() => setSentToast(null), 4500);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--cream))]">
      <Topbar />

      <main className="px-8 py-8 max-w-[1500px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--terracotta))] font-semibold">
              Stock & purchasing
            </p>
            <h1 className="font-serif text-4xl text-[hsl(var(--ink))] mt-2">
              Inventory & Ordering
            </h1>
            <p className="text-sm text-stone-600 mt-2 max-w-xl">
              Live counts across beverages, alcohol, food and dry goods. Update par levels, build a cart from AI suggestions, and dispatch POs to vendors automatically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAgentOpen(true)}>
              <Settings2 className="h-4 w-4" /> AI agent
            </Button>
            <Button variant="outline" onClick={autoFillCart}>
              <Wand2 className="h-4 w-4" /> Auto-fill cart
            </Button>
            <Button onClick={() => setCartOpen(true)} className="relative">
              <ShoppingCart className="h-4 w-4" /> Cart
              {cartCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-white/25 px-2 text-xs">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<AlertTriangle className="h-4 w-4 text-[hsl(var(--terracotta))]" />}
            label="Critical items"
            value={String(kpis.critical)}
            hint="≤ 34% of par"
            trend="down"
          />
          <KpiCard
            icon={<TrendingDown className="h-4 w-4 text-amber-700" />}
            label="Low stock"
            value={String(kpis.low)}
            hint="Suggested reorder"
          />
          <KpiCard
            icon={<Package className="h-4 w-4 text-[hsl(var(--ink))]" />}
            label="On-hand value"
            value={`$${kpis.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            hint="Across all categories"
          />
          <KpiCard
            icon={<ShoppingCart className="h-4 w-4 text-emerald-700" />}
            label="Cart subtotal"
            value={`$${kpis.cartValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            hint={`${cartCount} units staged`}
            trend="up"
          />
        </div>

        {/* AI Agent strip */}
        <Card className="p-5 bg-gradient-to-br from-[hsl(var(--ink))] to-stone-800 text-cream border-0">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Brain className="h-5 w-5 text-amber-200" />
            </div>
            <div className="flex-1 min-w-[260px] text-stone-100">
              <div className="flex items-center gap-2">
                <p className="font-serif text-lg">Ordering Co-pilot</p>
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30">Active</Badge>
              </div>
              <p className="text-sm text-stone-300 mt-1">
                I reviewed last 30 days of usage, weekend forecast and current par levels. <span className="text-amber-200 font-medium">14 items</span> need reorder across <span className="text-amber-200 font-medium">5 vendors</span>. Estimated PO total: <span className="text-amber-200 font-medium">${kpis.inventoryValue > 0 ? "2,418" : "0"}</span>.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="secondary" onClick={autoFillCart}>
                  <Sparkles className="h-3.5 w-3.5" /> Build smart cart
                </Button>
                <Button size="sm" variant="ghost" className="text-stone-200 hover:text-white hover:bg-white/10" onClick={() => setAgentOpen(true)}>
                  Agent settings
                </Button>
              </div>
            </div>
            <div className="w-[280px] h-[80px] hidden lg:block">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={USAGE_TREND}>
                  <Bar dataKey="usage" fill="hsl(var(--terracotta))" radius={[4, 4, 0, 0]} />
                  <XAxis dataKey="week" tick={{ fill: "#d6d3d1", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1c1917", border: "none", borderRadius: 8, color: "#fafaf9" }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Category | "All")}>
            <TabsList className="bg-[hsl(var(--cream))] border border-stone-200">
              <TabsTrigger value="All">All</TabsTrigger>
              {CATEGORIES.map((c) => (
                <TabsTrigger key={c} value={c}>
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items"
              className="pl-9 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-stone-500" />
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm"
            >
              <option value="All">All vendors</option>
              {VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items table */}
        <Card className="border-stone-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50/60">
                <TableHead className="w-[28%]">Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">On hand</TableHead>
                <TableHead className="text-center">Par</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">AI suggested</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const state = stockState(item);
                const suggested = suggestedQty(item);
                const ratio = Math.min(1, item.onHand / item.par);
                return (
                  <TableRow key={item.id} className="hover:bg-stone-50/50">
                    <TableCell>
                      <button
                        onClick={() => setEditing(item)}
                        className="text-left"
                      >
                        <p className="font-medium text-[hsl(var(--ink))]">{item.name}</p>
                        <p className="text-xs text-stone-500">
                          ${item.cost.toFixed(2)} / {item.unit} · uses ~{item.weeklyUsage}/wk
                        </p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-stone-700">{item.vendor}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium tabular-nums">{item.onHand}</span>
                        <span className="text-xs text-stone-500">{item.unit}</span>
                      </div>
                      <Progress value={ratio * 100} className="h-1 mt-1 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{item.par}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={state.tone}>
                        {state.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {suggested > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Sparkles className="h-3 w-3 text-[hsl(var(--terracotta))]" />
                          <span className="font-medium tabular-nums">{suggested}</span>
                          <span className="text-xs text-stone-500">{item.unit}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          disabled={suggested <= 0}
                          onClick={() => addToCart(item.id, suggested || 1)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Cart
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-sm text-stone-500">
                    No items match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Edit drawer */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="sm:max-w-md">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl">{editing.name}</SheetTitle>
                <SheetDescription>
                  {editing.category} · {editing.vendor}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <NumberRow
                  label="On hand"
                  unit={editing.unit}
                  value={editing.onHand}
                  onChange={(v) => {
                    updateOnHand(editing.id, v);
                    setEditing({ ...editing, onHand: v });
                  }}
                />
                <NumberRow
                  label="Par level"
                  unit={editing.unit}
                  value={editing.par}
                  onChange={(v) => {
                    updatePar(editing.id, v);
                    setEditing({ ...editing, par: v });
                  }}
                />
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Unit cost" value={`$${editing.cost.toFixed(2)}`} />
                  <Stat label="Weekly usage" value={`${editing.weeklyUsage} ${editing.unit}`} />
                  <Stat label="Last ordered" value={editing.lastOrdered} />
                  <Stat label="AI suggested" value={`${suggestedQty(editing)} ${editing.unit}`} />
                </div>
                <Separator />
                <Button
                  className="w-full"
                  onClick={() => {
                    addToCart(editing.id, suggestedQty(editing) || 1);
                    setEditing(null);
                  }}
                >
                  <ShoppingCart className="h-4 w-4" /> Add suggested qty to cart
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cart drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Order cart
            </SheetTitle>
            <SheetDescription>
              {cartCount === 0
                ? "Your cart is empty — add items or auto-fill from AI suggestions."
                : `Grouped by vendor. Agent will dispatch ${Object.keys(cartByVendor).length} PO${Object.keys(cartByVendor).length === 1 ? "" : "s"}.`}
            </SheetDescription>
          </SheetHeader>

          {cartCount === 0 ? (
            <div className="mt-10 text-center">
              <Button variant="outline" onClick={autoFillCart}>
                <Wand2 className="h-4 w-4" /> Auto-fill from AI
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {Object.entries(cartByVendor).map(([vendor, group]) => (
                <div key={vendor} className="border border-stone-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between bg-stone-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-stone-500" />
                      <p className="font-medium text-sm">{vendor}</p>
                    </div>
                    <p className="text-sm tabular-nums font-medium">
                      ${group.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {group.items.map((line) => (
                      <div key={line.id} className="flex items-center gap-2 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{line.name}</p>
                          <p className="text-xs text-stone-500">
                            ${line.cost.toFixed(2)} / {line.unit}
                          </p>
                        </div>
                        <div className="flex items-center border border-stone-200 rounded-md">
                          <button
                            className="h-7 w-7 flex items-center justify-center hover:bg-stone-50"
                            onClick={() => setCartQty(line.id, line.qty - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center tabular-nums text-sm">{line.qty}</span>
                          <button
                            className="h-7 w-7 flex items-center justify-center hover:bg-stone-50"
                            onClick={() => setCartQty(line.id, line.qty + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="w-16 text-right text-sm tabular-nums">
                          ${line.lineTotal.toFixed(2)}
                        </p>
                        <button
                          className="text-stone-400 hover:text-[hsl(var(--terracotta))]"
                          onClick={() => setCartQty(line.id, 0)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <p className="text-stone-600">Subtotal</p>
                <p className="font-semibold text-base tabular-nums">
                  ${kpis.cartValue.toFixed(2)}
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <Bot className="h-4 w-4 text-amber-700 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-medium">AI ordering agent</p>
                  <p className="mt-0.5">
                    {autoSend
                      ? "On submit, the agent will split this cart by vendor and email/EDI each PO directly. You'll get a copy and confirmation."
                      : "Auto-send is off. POs will be drafted and queued for your manual approval."}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCart({})}>
                  Clear
                </Button>
                <Button className="flex-1" onClick={sendToVendors}>
                  <Send className="h-4 w-4" /> {autoSend ? "Send to vendors" : "Queue POs"}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Agent settings drawer */}
      <Sheet open={agentOpen} onOpenChange={setAgentOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl flex items-center gap-2">
              <Brain className="h-5 w-5" /> Ordering agent
            </SheetTitle>
            <SheetDescription>
              Configure how the AI decides quantities and dispatches orders.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <ToggleRow
              icon={<Zap className="h-4 w-4 text-amber-600" />}
              title="Auto-send POs to vendors"
              desc="Email orders directly to each vendor (and EDI where available)."
              checked={autoSend}
              onChange={setAutoSend}
            />
            <ToggleRow
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              title="Confirm orders over $500"
              desc="Require owner approval for any single-vendor PO above threshold."
              checked={confirmThreshold}
              onChange={setConfirmThreshold}
            />

            <Separator />

            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">Signals used</p>
              <ul className="text-sm space-y-1.5 text-stone-700">
                <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[hsl(var(--terracotta))]" /> Trailing 30-day usage by item</li>
                <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[hsl(var(--terracotta))]" /> Reservations + weekend forecast</li>
                <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[hsl(var(--terracotta))]" /> Vendor lead time + delivery windows</li>
                <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[hsl(var(--terracotta))]" /> Open POs and last invoice prices</li>
              </ul>
            </div>

            <Separator />

            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">Vendor channels</p>
              <div className="space-y-2">
                {VENDORS.slice(0, 5).map((v) => (
                  <div key={v} className="flex items-center justify-between border border-stone-200 rounded-md px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-stone-500" />
                      <span>{v}</span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                      Connected
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <ClipboardList className="h-4 w-4" /> View agent activity log
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Toast */}
      {sentToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[hsl(var(--ink))] text-cream rounded-lg shadow-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-stone-100">{sentToast}</div>
          <button onClick={() => setSentToast(null)} className="text-stone-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down";
}) {
  return (
    <Card className="p-5 border-stone-200 bg-white">
      <div className="flex items-center gap-2 text-stone-600 text-xs uppercase tracking-wider">
        {icon}
        <span>{label}</span>
        {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-600 ml-auto" />}
        {trend === "down" && <TrendingDown className="h-3 w-3 text-[hsl(var(--terracotta))] ml-auto" />}
      </div>
      <p className="font-serif text-3xl text-[hsl(var(--ink))] mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-stone-500 mt-1">{hint}</p>}
    </Card>
  );
}

function NumberRow({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-stone-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => onChange(Math.max(0, value - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
          className="text-center tabular-nums"
        />
        <Button variant="outline" size="icon" onClick={() => onChange(value + 1)}>
          <Plus className="h-3 w-3" />
        </Button>
        <span className="text-sm text-stone-500 w-12">{unit}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-200 rounded-md p-3">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="text-sm font-medium text-[hsl(var(--ink))] mt-1">{value}</p>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 border border-stone-200 rounded-lg p-3">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

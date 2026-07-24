import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Package, PieChart, Receipt, Star, User } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { hasAccess, useCurrentMembership } from "@/lib/permissions";
import { NAV_OVERVIEW, NAV_GROWTH, NAV_OPERATIONS, NAV_UNGATED } from "@/lib/nav-items";
import { useInventoryItems, useRealInvoices } from "@/lib/boh/queries";
import { useProductMix } from "@/lib/pos/queries";
import { useReviews } from "@/lib/reviews/queries";
import { useCustomers } from "@/lib/marketing/queries";

const ALL_FEATURES = [...NAV_OVERVIEW, ...NAV_GROWTH, ...NAV_OPERATIONS];
const RESULTS_PER_CATEGORY = 6;

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => f?.toLowerCase().includes(query));
}

export function GlobalSearch({
  open,
  onOpenChange,
  query,
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const navigate = useNavigate();
  const membership = useCurrentMembership();

  const go = (url: string) => {
    onOpenChange(false);
    navigate({ to: url });
  };

  const q = query.trim().toLowerCase();

  const visibleFeatures = useMemo(
    () => [...ALL_FEATURES.filter((f) => hasAccess(membership, f.permission)), ...NAV_UNGATED],
    [membership],
  );
  const matchedFeatures = q
    ? visibleFeatures.filter((f) => f.title.toLowerCase().includes(q))
    : visibleFeatures;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search features, inventory, invoices, reviews and customers
        </DialogDescription>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Search features, inventory, invoices, reviews…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {matchedFeatures.length > 0 && (
              <CommandGroup heading="Features">
                {matchedFeatures.map((f) => (
                  <CommandItem key={f.url} value={f.url} onSelect={() => go(f.url)}>
                    <f.icon className="h-4 w-4" />
                    {f.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {open && q && <ItemResults query={q} onSelect={go} />}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Split out so its data hooks only ever run once the palette is open
// and the user has actually typed something — no point fetching
// inventory/invoices/reviews/customers just to show the static
// Features list.
function ItemResults({ query, onSelect }: { query: string; onSelect: (url: string) => void }) {
  const membership = useCurrentMembership();
  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: invoices = [] } = useRealInvoices();
  const { data: productMixItems = [] } = useProductMix(7);
  const { data: reviews = [] } = useReviews();
  const { data: customers = [] } = useCustomers();

  const matchedInventory = hasAccess(membership, "inventory")
    ? inventoryItems
        .filter((i) => matches(query, i.name, i.category, i.vendor))
        .slice(0, RESULTS_PER_CATEGORY)
    : [];

  const matchedInvoices = hasAccess(membership, "invoices")
    ? invoices
        .filter((i) => matches(query, i.vendorName, i.invoiceNumber))
        .slice(0, RESULTS_PER_CATEGORY)
    : [];

  const matchedMenuItems = hasAccess(membership, "product_mix")
    ? productMixItems
        .filter((i) => matches(query, i.name, i.category))
        .slice(0, RESULTS_PER_CATEGORY)
    : [];

  const matchedReviews = hasAccess(membership, "reviews")
    ? reviews
        .filter((r) => matches(query, r.reviewerName, r.reviewText))
        .slice(0, RESULTS_PER_CATEGORY)
    : [];

  const matchedCustomers = hasAccess(membership, "marketing")
    ? customers.filter((c) => matches(query, c.name, c.email)).slice(0, RESULTS_PER_CATEGORY)
    : [];

  return (
    <>
      {matchedInventory.length > 0 && (
        <CommandGroup heading="Inventory">
          {matchedInventory.map((item) => (
            <CommandItem key={item.id} value={item.id} onSelect={() => onSelect("/inventory")}>
              <Package className="h-4 w-4" />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {matchedInvoices.length > 0 && (
        <CommandGroup heading="Invoices">
          {matchedInvoices.map((inv) => (
            <CommandItem key={inv.id} value={inv.id} onSelect={() => onSelect("/invoices")}>
              <Receipt className="h-4 w-4" />
              <span className="flex-1 truncate">
                {inv.vendorName ?? "Unknown vendor"}
                {inv.invoiceNumber ? ` · #${inv.invoiceNumber}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {inv.status === "pending_review" ? "Pending review" : "Approved"}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {matchedMenuItems.length > 0 && (
        <CommandGroup heading="Product Mix">
          {matchedMenuItems.map((item) => (
            <CommandItem key={item.id} value={item.id} onSelect={() => onSelect("/product-mix")}>
              <PieChart className="h-4 w-4" />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground">{item.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {matchedReviews.length > 0 && (
        <CommandGroup heading="Reviews">
          {matchedReviews.map((r) => (
            <CommandItem key={r.id} value={r.id} onSelect={() => onSelect("/reviews")}>
              <Star className="h-4 w-4" />
              <span className="flex-1 truncate">
                {r.reviewerName} · {r.starRating}★
              </span>
              <span className="max-w-[220px] truncate text-xs text-muted-foreground">
                {r.reviewText ?? ""}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {matchedCustomers.length > 0 && (
        <CommandGroup heading="Customers">
          {matchedCustomers.map((c) => (
            <CommandItem key={c.id} value={c.id} onSelect={() => onSelect("/marketing")}>
              <User className="h-4 w-4" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.email ?? c.phone ?? ""}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );
}

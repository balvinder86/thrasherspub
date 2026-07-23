import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Calendar, Search } from "lucide-react";

export const DATE_RANGE_OPTIONS = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export function Topbar({
  title,
  eyebrow,
  dateRangeDays,
  onDateRangeDaysChange,
}: {
  title: string;
  eyebrow?: string;
  dateRangeDays?: number;
  onDateRangeDaysChange?: (days: number) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-accent" />
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h1 className="truncate font-display text-xl sm:text-[22px]">{title}</h1>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="mx-auto flex h-10 max-w-md items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search orders, items, suppliers…</span>
            <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dateRangeDays != null && onDateRangeDaysChange ? (
            <Select
              value={String(dateRangeDays)}
              onValueChange={(v) => onDateRangeDaysChange(Number(v))}
            >
              <SelectTrigger className="hidden h-9 w-auto gap-2 rounded-full sm:inline-flex">
                <Calendar className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.days} value={String(o.days)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 rounded-full sm:inline-flex"
            >
              <Calendar className="h-4 w-4" />
              Last 7 days
            </Button>
          )}
          <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          </Button>
        </div>
      </div>
    </header>
  );
}

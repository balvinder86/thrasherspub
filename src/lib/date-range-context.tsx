import { createContext, useContext, useState, type ReactNode } from "react";

import { type DateRange, addDays, startOfDay } from "@/lib/date-range";

function defaultRange(): DateRange {
  const today = startOfDay(new Date());
  return { from: addDays(today, -6), to: today };
}

const DateRangeContext = createContext<{
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
} | null>(null);

// One shared date range for the whole app, not per-page state — lives
// above the router's Outlet so it survives navigation (picking a
// range on Home and clicking to another page and back keeps it).
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within a DateRangeProvider");
  return ctx;
}

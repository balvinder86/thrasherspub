import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type DateRange, addDays, formatDateRange, startOfDay } from "@/lib/date-range";

function presetsFor(today: Date): { label: string; range: DateRange }[] {
  const end = startOfDay(today);
  const startOfMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const startOfLastMonth = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const endOfLastMonth = addDays(startOfMonth, -1);
  return [
    { label: "Today", range: { from: end, to: end } },
    { label: "Last 7 days", range: { from: addDays(end, -6), to: end } },
    { label: "Last 30 days", range: { from: addDays(end, -29), to: end } },
    { label: "This month", range: { from: startOfMonth, to: end } },
    { label: "Last month", range: { from: startOfLastMonth, to: endOfLastMonth } },
  ];
}

export function DateRangePicker({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>(range);

  const apply = (next: DateRange) => {
    onRangeChange(next);
    setDraft(next);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(range);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden h-9 gap-2 rounded-full sm:inline-flex"
        >
          <CalendarIcon className="h-4 w-4" />
          {formatDateRange(range)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r border-border p-3">
            {presetsFor(new Date()).map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start rounded-md"
                onClick={() => apply(p.range)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div>
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={range.to}
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: startOfDay(new Date()) }}
            />
            <div className="flex items-center justify-end gap-2 border-t border-border p-3">
              <Button
                size="sm"
                disabled={!draft?.from || !draft?.to}
                onClick={() =>
                  draft?.from && draft?.to && apply({ from: draft.from, to: draft.to })
                }
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

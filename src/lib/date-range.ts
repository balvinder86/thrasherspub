export type DateRange = { from: Date; to: Date };

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "Jul 17 – Jul 23" (same year, omitted), "Jul 23" (single day),
// "Dec 29, 2025 – Jan 2, 2026" (crosses a year boundary).
export function formatDateRange(range: DateRange): string {
  const sameDay = isoDate(range.from) === isoDate(range.to);
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const currentYear = new Date().getFullYear();

  const fmt = (d: Date, forceYear: boolean) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: forceYear || d.getFullYear() !== currentYear ? "numeric" : undefined,
    });

  if (sameDay) return fmt(range.from, false);
  return `${fmt(range.from, !sameYear)} – ${fmt(range.to, false)}`;
}

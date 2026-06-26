import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/scheduling")({
  head: () => ({ meta: [{ title: "Scheduling · Thrasher's Pub" }] }),
  component: () => (
    <Placeholder
      eyebrow="Labor"
      title="Scheduling"
      description="Build the weekly schedule against forecast demand, manage time-off, and keep labor under target."
      icon={CalendarClock}
    />
  ),
});

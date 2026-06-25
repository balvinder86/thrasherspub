import { createFileRoute } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/marketing")({
  head: () => ({ meta: [{ title: "Marketing · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Campaigns"
      title="Marketing"
      description="Run email and SMS campaigns to your guest list, measure attribution, and schedule social posts."
      icon={Megaphone}
    />
  ),
});

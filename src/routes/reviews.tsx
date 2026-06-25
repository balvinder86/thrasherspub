import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Guest sentiment"
      title="Reviews"
      description="Aggregate Google, Yelp, OpenTable, and Resy reviews. Respond fast and watch your rolling rating."
      icon={Star}
    />
  ),
});

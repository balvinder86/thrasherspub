import { createFileRoute } from "@tanstack/react-router";
import { PieChart } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/product-mix")({
  head: () => ({ meta: [{ title: "Product Mix · Thrasher's Pub" }] }),
  component: () => (
    <Placeholder
      eyebrow="Menu performance"
      title="Product Mix"
      description="Break down sales by category, course, and modifier. Spot stars, puzzles, and dogs across services."
      icon={PieChart}
    />
  ),
});

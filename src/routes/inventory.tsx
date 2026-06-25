import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Inventory · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Stock & purchasing"
      title="Inventory & Ordering"
      description="Track par levels, build POs to suppliers, and watch cost-of-goods trend against weekly forecast."
      icon={Package}
    />
  ),
});

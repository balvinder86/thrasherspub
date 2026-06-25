import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Accounts payable"
      title="Invoices"
      description="Review supplier invoices, match to deliveries, approve payments, and export to your bookkeeper."
      icon={Receipt}
    />
  ),
});

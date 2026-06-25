import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/seo")({
  head: () => ({ meta: [{ title: "SEO · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Discovery"
      title="SEO"
      description="Track local rankings, Google Business profile health, and keyword visibility for your neighborhood."
      icon={Search}
    />
  ),
});

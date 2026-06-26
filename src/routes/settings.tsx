import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Thrasher's Pub" }] }),
  component: () => (
    <Placeholder
      eyebrow="Workspace"
      title="Settings"
      description="Manage your restaurant profile, locations, integrations, tax settings, and billing preferences."
      icon={Settings}
    />
  ),
});

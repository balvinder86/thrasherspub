import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Workspace"
      title="Settings & Admin"
      description="Manage locations, team roles, integrations, tax settings, and billing for your account."
      icon={Settings}
    />
  ),
});

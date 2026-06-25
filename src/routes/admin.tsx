import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Placeholder } from "@/components/dashboard/Placeholder";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Maison Olive" }] }),
  component: () => (
    <Placeholder
      eyebrow="Workspace"
      title="Admin"
      description="Manage team roles, permissions, user access, and multi-location administration."
      icon={Shield}
    />
  ),
});

import { Topbar } from "./Topbar";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function Placeholder({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <>
      <Topbar eyebrow={eyebrow} title={title} />
      <main className="px-6 py-10">
        <Card className="mx-auto max-w-2xl border-dashed bg-card/60 px-10 py-16 text-center shadow-none">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 font-display text-2xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
            Module in development
          </div>
        </Card>
      </main>
    </>
  );
}

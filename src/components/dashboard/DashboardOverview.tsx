import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Hammer, Clock, ArrowRight } from "lucide-react";
import { useData } from "@/context/DataContext";
import { computeChecklist } from "@/lib/checklist";
import { Feature } from "@/types";
import { cn } from "@/lib/utils";

const DONE_MARKER = /✅|🟢|☑|✔|\bshipped\b|\bdone\b|\bcomplete(d)?\b|\bmerged\b/i;

// Pending / up-next roadmap. Not tracked as feature rows yet — edit here.
const PENDING: { title: string; note?: string }[] = [
  { title: "AI Assistant (Mia/Greg)", note: "Read phase 1, then read + write phase 2" },
  { title: "WhatsApp Guest automation" },
  { title: "Dynamic Pricing Phase 2" },
  { title: "Tenant self-service org settings" },
  { title: "AI Brief" },
  { title: "Integrations Page", note: "Where a customer integrates with e.g. PriceLabs" },
];

const shortTitle = (t: string) => t.replace(/\s*\(.*\)\s*$/, "");

function buildProgress(feature: Feature, all: Feature[]): { pct: number; label: string } {
  const children = all.filter((f) => f.parentExternalId === feature.externalId);
  if (children.length) {
    const shipped = children.filter((c) => (c.status as string) === "shipped").length;
    return { pct: Math.round((shipped / children.length) * 100), label: `${shipped}/${children.length} phases shipped` };
  }
  const tasks = computeChecklist(feature).filter((i) => i.kind === "checklist");
  if (!tasks.length) return { pct: (feature.status as string) === "shipped" ? 100 : 0, label: "" };
  const done = tasks.filter((t) => t.isDone || DONE_MARKER.test(t.text)).length;
  return { pct: Math.round((done / tasks.length) * 100), label: `${done}/${tasks.length} tasks` };
}

export const DashboardOverview: React.FC = () => {
  const { data } = useData();

  const building = useMemo(
    () =>
      data.features
        .filter((f) => !f.parentExternalId && (f.status as string) === "building")
        .map((f) => ({ feature: f, ...buildProgress(f, data.features) }))
        .sort((a, b) => b.pct - a.pct),
    [data.features]
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Currently building */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Hammer size={14} />
          </span>
          <h2 className="text-sm font-semibold">Currently building</h2>
        </div>

        {building.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is in the Building state right now.</p>
        ) : (
          <ul className="space-y-4">
            {building.map(({ feature, pct, label }) => (
              <li key={feature.id}>
                <Link
                  to={`/plan?focus=${encodeURIComponent(feature.id)}`}
                  className="group block"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {shortTitle(feature.title)}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  {label && <p className="mt-1 text-xs text-muted-foreground">{label}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Up next / pending */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Clock size={14} />
            </span>
            <h2 className="text-sm font-semibold">Up next</h2>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {PENDING.length} pending
          </span>
        </div>

        <ul className="space-y-2.5">
          {PENDING.map((item) => (
            <li key={item.title} className="flex items-start gap-2.5">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400")} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </div>
            </li>
          ))}
        </ul>

        <Link
          to="/plan"
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View the full plan <ArrowRight size={12} />
        </Link>
      </section>
    </div>
  );
};

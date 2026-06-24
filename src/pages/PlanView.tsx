import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";
import {
  ChevronDown,
  Circle,
  CheckCircle2,
  ListChecks,
  LayoutGrid,
  Map as MapIcon,
  AlertTriangle,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { computeChecklist } from "@/lib/checklist";
import { Feature } from "@/types";
import { FeatureDetailModal } from "@/components/features/FeatureDetailModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

// All six DB statuses (the Feature type narrows to 3, but rows carry the raw value).
type RawStatus =
  | "drafting"
  | "planned"
  | "building"
  | "shipped"
  | "blocked"
  | "deferred";

const STATUS_META: Record<
  RawStatus,
  { label: string; dot: string; chip: string }
> = {
  shipped: { label: "Shipped", dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20" },
  building: { label: "Building", dot: "bg-primary", chip: "bg-primary/10 text-primary ring-primary/20" },
  planned: { label: "Planned", dot: "bg-zinc-400", chip: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-zinc-500/20" },
  drafting: { label: "Drafting", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/20" },
  blocked: { label: "Blocked", dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20" },
  deferred: { label: "Deferred", dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-500 ring-amber-500/20" },
};

const STATUS_ORDER: RawStatus[] = ["building", "blocked", "planned", "drafting", "deferred", "shipped"];

const metaFor = (s: string) => STATUS_META[(s as RawStatus)] ?? STATUS_META.planned;

// The plan markdown narrates status with ✅ / "shipped" / "done" markers. Treat
// those as done for the read-only plan view even when the item was never ticked
// in the shared checklist, so a Building phase's progress reflects reality.
const DONE_MARKER = /✅|🟢|☑|✔|\bshipped\b|\bdone\b|\bcomplete(d)?\b|\bmerged\b/i;
const looksDone = (text: string) => DONE_MARKER.test(text);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const m = metaFor(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", m.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
};

interface PhaseRowProps {
  feature: Feature;
  onOpen: (id: string) => void;
  defaultOpen: boolean;
}

const PhaseRow: React.FC<PhaseRowProps> = ({ feature, onOpen, defaultOpen }) => {
  const [expanded, setExpanded] = useState(defaultOpen);
  const items = useMemo(() => computeChecklist(feature), [feature]);
  const tasks = items.filter((i) => i.kind === "checklist");
  // A shipped phase is complete by status — its per-item checklist may simply
  // never have been ticked, so treat every item as done rather than showing a
  // contradictory "Shipped · 6 remaining".
  const isShipped = (feature.status as string) === "shipped";
  const isItemDone = (t: { isDone: boolean; text: string }) => t.isDone || looksDone(t.text);
  const total = tasks.length;
  const doneTasks = isShipped ? tasks : tasks.filter(isItemDone);
  const done = doneTasks.length;
  const pct = total === 0 ? (isShipped ? 100 : 0) : Math.round((done / total) * 100);
  const remaining = isShipped ? [] : tasks.filter((t) => !isItemDone(t));
  const m = metaFor(feature.status);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{feature.title}</span>
            <StatusBadge status={feature.status} />
          </div>
          {feature.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{feature.description}</p>
          )}
          {total > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium tabular-nums">
                  {done}/{total} <span className="font-normal text-muted-foreground">items</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all duration-500", m.dot)} style={{ width: `${pct}%` }} />
              </div>
              {remaining.length > 0 && (
                <p className="text-xs text-primary">{remaining.length} remaining</p>
              )}
            </div>
          )}
        </div>
        <span
          onClick={(e) => { e.stopPropagation(); onOpen(feature.id); }}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Open PRD
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-muted/20"
          >
            <div className="space-y-4 p-4">
              {total === 0 && (
                <p className="text-sm text-muted-foreground">No tracked checklist items in this phase{"'"}s PRD.</p>
              )}
              {remaining.length > 0 && (
                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                    <ListChecks className="h-3.5 w-3.5" /> Remaining ({remaining.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {remaining.map((item) => (
                      <li key={item.key} className="flex items-start gap-2 text-sm">
                        <Circle className="mt-1 h-3 w-3 shrink-0 text-primary" />
                        <span>
                          {item.identifier && <span className="font-semibold text-primary">{item.identifier} </span>}
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {done > 0 && (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    Done ({done})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {doneTasks.map((item) => (
                      <li key={item.key} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="line-through">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PlanView: React.FC = () => {
  const { data } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const topLevel = useMemo(
    () => data.features.filter((f) => !f.parentExternalId).sort((a, b) => a.order - b.order),
    [data.features]
  );

  const focusId = searchParams.get("focus");
  const root = useMemo(() => {
    if (focusId) return data.features.find((f) => f.id === focusId) ?? null;
    return (
      topLevel.find((f) => f.externalId === "hostbase-prod-plan") ??
      topLevel.find((f) => /productization/i.test(f.title)) ??
      topLevel[0] ??
      null
    );
  }, [focusId, data.features, topLevel]);

  const phases = useMemo(() => {
    if (!root?.externalId) return [];
    return data.features
      .filter((f) => f.parentExternalId === root.externalId)
      .sort((a, b) => a.order - b.order);
  }, [data.features, root]);

  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of phases) counts[p.status] = (counts[p.status] ?? 0) + 1;
    return counts;
  }, [phases]);

  const shipped = breakdown["shipped"] ?? 0;
  const totalPhases = phases.length;
  const pct = totalPhases === 0 ? 0 : Math.round((shipped / totalPhases) * 100);
  const remainingPhases = phases.filter((p) => {
    const s = p.status as string;
    return s !== "shipped" && s !== "deferred";
  });

  const setFocus = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("focus", id);
    setSearchParams(next, { replace: true });
  };

  const selected = selectedId ? data.features.find((f) => f.id === selectedId) ?? null : null;

  return (
    <div className="pt-6 pb-10">
      {/* Header / timeline summary */}
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
        <div className="flex flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <MapIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight md:text-xl">{root?.title ?? "Plan"}</h1>
                {root?.description && (
                  <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{root.description}</p>
                )}
              </div>
            </div>
            {root && (
              <Link
                to={`/features/board?focus=${encodeURIComponent(root.id)}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board view
              </Link>
            )}
          </div>

          {totalPhases > 0 && (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium">
                  <span className="tabular-nums">{shipped}</span> of <span className="tabular-nums">{totalPhases}</span> phases shipped
                </span>
                <span className="text-2xl font-bold tabular-nums text-primary">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {STATUS_ORDER.filter((s) => breakdown[s]).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                    <span className="font-medium tabular-nums text-foreground">{breakdown[s]}</span> {STATUS_META[s].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {topLevel.length > 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
              {topLevel.map((f) => {
                const active = f.id === root?.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFocus(f.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {f.title.replace(/\s*\(.*\)\s*$/, "")}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Remaining to ship */}
      {remainingPhases.length > 0 && (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <ListChecks className="h-3.5 w-3.5" /> Remaining to ship ({remainingPhases.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {remainingPhases.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs hover:border-primary/40 transition-colors"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", metaFor(p.status).dot)} />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Phases */}
      <div className="mt-5 space-y-2.5">
        {!root ? (
          <EmptyState icon={AlertTriangle} title="No plan found" description="No top-level feature is available to show as a plan." />
        ) : phases.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title={`"${root.title}" has no phases`}
            description="This plan has no sub-features tracked as separate Compass rows yet."
          />
        ) : (
          phases.map((p) => (
            <PhaseRow key={p.id} feature={p} onOpen={setSelectedId} defaultOpen={(p.status as string) === "building" || (p.status as string) === "blocked"} />
          ))
        )}
      </div>

      <FeatureDetailModal feature={selected} isOpen={!!selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

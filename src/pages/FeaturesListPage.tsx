import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { Feature } from "@/types";
import { checklistProgress } from "@/lib/checklist";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Plus, Sparkles, FileText, Paperclip, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DerivedStatus = "pending" | "in_progress" | "completed";

interface FeatureRow {
  feature: Feature;
  derived: DerivedStatus;
  pct: number;
  done: number;
  total: number;
}

const STATUS_FILTERS: { value: "all" | DerivedStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function deriveStatus(feature: Feature): DerivedStatus {
  // feature.status carries the raw 6-state DB value at runtime.
  const s = feature.status as string;
  if (s === "shipped") return "completed";
  // Building/blocked = actively in flight, regardless of whether the per-item
  // checklist has been ticked (top-level docs rarely tick their own bullets).
  if (s === "building" || s === "blocked") return "in_progress";
  return "pending"; // planned, drafting, deferred
}

export const FeaturesListPage: React.FC = () => {
  const { data } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | DerivedStatus>("all");

  const rows: FeatureRow[] = useMemo(() => {
    return data.features
      .filter((feature) => !feature.parentExternalId)
      .map((feature) => {
        const { done, total } = checklistProgress(feature);
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        const derived = deriveStatus(feature);
        return { feature, derived, pct, done, total };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { building: 0, blocked: 0, planned: 1, drafting: 1, deferred: 2, shipped: 3 };
        const so = (order[a.feature.status] ?? 1) - (order[b.feature.status] ?? 1);
        if (so !== 0) return so;
        return a.feature.order - b.feature.order;
      });
  }, [data.features]);

  const attachmentsByFeature = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of data.featureAttachments) {
      map.set(a.featureId, (map.get(a.featureId) ?? 0) + 1);
    }
    return map;
  }, [data.featureAttachments]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.derived !== filter) return false;
      if (!q) return true;
      const f = row.feature;
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.prdMarkdown.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, searchQuery]);

  const counts = useMemo(() => {
    const out: Record<"all" | DerivedStatus, number> = {
      all: rows.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };
    for (const r of rows) out[r.derived] += 1;
    return out;
  }, [rows]);

  const goToBoard = () => navigate("/features/board");
  const openOnBoard = (featureId: string) => {
    const encoded = encodeURIComponent(featureId);
    navigate(`/features/board?focus=${encoded}`);
  };

  return (
    <div className="pt-6">
      <PageToolbar
        title="Features"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search features and PRDs..."
        count={rows.length}
        countLabel="features"
        actions={
          <Button size="sm" onClick={goToBoard}>
            <Plus size={16} className="mr-1" />
            New feature
          </Button>
        }
      />

      {data.features.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No features yet"
          description="Start by creating a feature on the board view. Attach a PRD as markdown or upload the one you generated with Claude as .md or .pdf."
          action={
            <Button onClick={goToBoard}>
              <Plus size={16} className="mr-1" />
              Open board
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    filter === f.value ? "opacity-90" : "opacity-60"
                  )}
                >
                  {counts[f.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden text-[13px]">
            <div className="overflow-x-auto">
              <div className="min-w-[880px] flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="w-[56px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-2 pl-3 font-medium text-zinc-500 text-right tabular-nums">
                  #
                </div>
                <div className="flex-1 min-w-[280px] border-r border-zinc-200 dark:border-zinc-800 p-2 pl-3 font-medium text-zinc-500">
                  Feature
                </div>
                <div className="w-[260px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-2 pl-3 font-medium text-zinc-500">
                  Status
                </div>
                <div className="w-[160px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-2 pl-3 font-medium text-zinc-500">
                  Owner
                </div>
                <div className="w-[160px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-2 pl-3 font-medium text-zinc-500">
                  Organization
                </div>
                <div className="w-[60px] shrink-0 p-2 font-medium text-zinc-500 text-center">
                  <span className="sr-only">Open</span>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic">
                  No features match the current filters.
                </div>
              ) : (
                filtered.map((row, idx) => (
                  <FeatureRowItem
                    key={row.feature.id}
                    row={row}
                    index={idx + 1}
                    owner={data.users.find((u) => u.id === row.feature.ownerId)?.name}
                    org={data.organizations.find((o) => o.id === row.feature.orgId)?.name}
                    attachmentCount={attachmentsByFeature.get(row.feature.id) ?? 0}
                    onClick={() => openOnBoard(row.feature.id)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface FeatureRowItemProps {
  row: FeatureRow;
  index: number;
  owner?: string;
  org?: string;
  attachmentCount: number;
  onClick: () => void;
}

const FeatureRowItem: React.FC<FeatureRowItemProps> = ({
  row,
  index,
  owner,
  org,
  attachmentCount,
  onClick,
}) => {
  const { feature, derived, pct, done, total } = row;
  const hasPrd = feature.prdMarkdown.trim().length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="min-w-[880px] border-b border-zinc-100 dark:border-zinc-800 last:border-0 group flex items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer focus:outline-none focus:bg-zinc-50 dark:focus:bg-zinc-800/30"
    >
      <div className="w-[56px] shrink-0 border-r border-zinc-100 dark:border-zinc-800 p-2.5 pl-3 text-right tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">
        {index}
      </div>
      <div className="flex-1 min-w-[280px] border-r border-zinc-100 dark:border-zinc-800 p-2.5 pl-3">
        <div className="font-semibold text-zinc-800 dark:text-zinc-100 line-clamp-1">
          {feature.title}
        </div>
        {feature.description && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
            {feature.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          {hasPrd && (
            <span className="inline-flex items-center gap-0.5">
              <FileText size={10} />
              PRD
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Paperclip size={10} />
              {attachmentCount}
            </span>
          )}
        </div>
      </div>
      <div className="w-[260px] shrink-0 border-r border-zinc-100 dark:border-zinc-800 p-2.5 pl-3">
        <StatusCell derived={derived} pct={pct} done={done} total={total} />
      </div>
      <div className="w-[160px] shrink-0 border-r border-zinc-100 dark:border-zinc-800 p-2.5 pl-3 text-zinc-600 dark:text-zinc-400 truncate">
        {owner ?? <span className="text-muted-foreground/60 italic">Unassigned</span>}
      </div>
      <div className="w-[160px] shrink-0 border-r border-zinc-100 dark:border-zinc-800 p-2.5 pl-3 text-zinc-600 dark:text-zinc-400 truncate">
        {org ?? <span className="text-muted-foreground/60 italic">—</span>}
      </div>
      <div className="w-[60px] shrink-0 p-2 text-center text-muted-foreground/60 group-hover:text-foreground transition-colors">
        <ChevronRight size={16} className="inline-block" />
      </div>
    </div>
  );
};

interface StatusCellProps {
  derived: DerivedStatus;
  pct: number;
  done: number;
  total: number;
}

const StatusCell: React.FC<StatusCellProps> = ({ derived, pct, done, total }) => {
  if (derived === "completed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">
        Completed
      </span>
    );
  }
  if (derived === "pending") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
        Pending
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-primary/10 text-primary border-primary/20">
          In progress
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-primary">
          {pct}%
        </span>
        {total > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {done}/{total}
          </span>
        )}
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden w-full">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useData } from "@/context/DataContext";
import { Feature, FeatureStatus } from "@/types";
import { computeChecklist } from "@/lib/checklist";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Plus,
  Sparkles,
  FileText,
  Paperclip,
  ArrowLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// feature.status carries the raw 6-state DB value at runtime even though the
// type narrows to 3. Render all six with PDF-aligned status colors.
type RawStatus = "drafting" | "planned" | "building" | "shipped" | "blocked" | "deferred";
const STATUS_META: Record<RawStatus, { label: string; dot: string; chip: string }> = {
  shipped: { label: "Shipped", dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20" },
  building: { label: "Building", dot: "bg-primary", chip: "bg-primary/10 text-primary ring-primary/25" },
  planned: { label: "Planned", dot: "bg-zinc-400", chip: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 ring-zinc-500/20" },
  drafting: { label: "Drafting", dot: "bg-violet-400", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-violet-500/20" },
  blocked: { label: "Blocked", dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20" },
  deferred: { label: "Deferred", dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-500 ring-amber-500/20" },
};
const metaFor = (s: string) => STATUS_META[s as RawStatus] ?? STATUS_META.planned;

// The plan markdown narrates completion with ✅ / "shipped" / "done" markers —
// count those as done so progress reflects reality, not just manual ticks.
const DONE_MARKER = /✅|🟢|☑|✔|\bshipped\b|\bdone\b|\bcomplete(d)?\b|\bmerged\b/i;

// Pull a short phase tag out of the title — the part between "Phase" and the
// title dash, so "Phase 2.4-B — …" → "2.4-B" and "Phase 1.1 + 1.2 — …" →
// "1.1+1.2" (internal hyphens kept; em/en dash is the boundary, not "-").
const phaseTag = (title: string): string | null => {
  const m = title.match(/\bphase\s+(.+?)\s*[—–]/i);
  if (!m) return null;
  return m[1].trim().replace(/\s*\+\s*/g, "+");
};

// Grid template shared by the header and every row so columns line up.
const COLS = "grid-cols-[3.5rem_minmax(200px,1.3fr)_minmax(240px,1.6fr)_8.5rem_9rem]";

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
  index: number;
  attachmentCount: number;
}

const PhaseRow: React.FC<PhaseRowProps> = ({ feature, index, attachmentCount }) => {
  const { actions } = useData();
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(() => computeChecklist(feature), [feature]);
  const tasks = items.filter((i) => i.kind === "checklist");
  const isShipped = (feature.status as string) === "shipped";
  const isDoneItem = (t: { isDone: boolean; text: string }) => t.isDone || DONE_MARKER.test(t.text);
  const total = tasks.length;
  const done = isShipped ? total : tasks.filter(isDoneItem).length;
  const pct = total === 0 ? (isShipped ? 100 : 0) : Math.round((done / total) * 100);
  const tag = phaseTag(feature.title);
  const m = metaFor(feature.status);
  const hasTasks = items.length > 0;
  const toggle = () => hasTasks && setExpanded((v) => !v);

  return (
    <div className="border-b border-border last:border-0">
      <div className={cn("grid items-center", COLS, "min-w-[760px] group hover:bg-muted/40 transition-colors")}>
        {/* # + expand */}
        <button
          onClick={toggle}
          className={cn("flex items-center gap-1 py-3 pl-3 pr-1 text-left", hasTasks ? "cursor-pointer" : "cursor-default")}
        >
          {hasTasks ? (
            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
          ) : (
            <span className="w-3.5" />
          )}
          <span className="text-xs font-semibold tabular-nums text-primary">{tag ?? index + 1}</span>
        </button>

        {/* Sub-phase (title) */}
        <button onClick={toggle} className="py-3 pr-3 text-left">
          <span className="text-sm font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {feature.title}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
            {feature.prdMarkdown.trim() && (<span className="inline-flex items-center gap-0.5"><FileText size={10} /> PRD</span>)}
            {attachmentCount > 0 && (<span className="inline-flex items-center gap-0.5"><Paperclip size={10} /> {attachmentCount}</span>)}
          </span>
        </button>

        {/* What it does */}
        <div className="py-3 pr-3 text-xs leading-relaxed text-muted-foreground line-clamp-2" title={feature.description}>
          {feature.description || <span className="italic opacity-60">—</span>}
        </div>

        {/* Status */}
        <div className="py-3 pr-3"><StatusBadge status={feature.status} /></div>

        {/* Progress */}
        <div className="py-3 pr-3">
          {total > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium tabular-nums text-foreground">{done}/{total}</span>
                <span className="tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all duration-500", m.dot)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-[11px] italic text-muted-foreground/60">no tasks</span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasTasks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-muted/20"
          >
            <div className="min-w-[760px] px-4 py-3 pl-12">
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <ChecklistTaskRow
                    key={item.key}
                    item={item}
                    forceDone={isShipped || DONE_MARKER.test(item.text)}
                    onToggle={() => actions.toggleChecklistItem(feature.id, item.key)}
                  />
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ChecklistTaskRowProps {
  item: ReturnType<typeof computeChecklist>[number];
  forceDone: boolean;
  onToggle: () => void;
}

const ChecklistTaskRow: React.FC<ChecklistTaskRowProps> = ({ item, forceDone, onToggle }) => {
  const checked = item.isDone || forceDone;
  if (item.kind === "heading") {
    const indent = Math.max(0, (item.headingLevel ?? 2) - 2) * 10;
    return (
      <li style={{ paddingLeft: indent }} className="pt-3 first:pt-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.text}</span>
      </li>
    );
  }
  const indent = 4 + (item.indent ?? 0) * 14;
  return (
    <li style={{ paddingLeft: indent }}>
      <button onClick={onToggle} className="group/task flex w-full items-start gap-2 rounded py-1 pr-2 text-left hover:bg-muted/60">
        <span
          className={cn(
            "mt-[2px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
            checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 group-hover/task:border-primary"
          )}
        >
          {checked && <Check size={9} strokeWidth={3} />}
        </span>
        <span className="flex min-w-0 flex-1 items-start gap-1.5">
          {item.identifier && (
            <span className={cn("shrink-0 text-[11px] font-bold tabular-nums text-primary", checked && "opacity-60")}>{item.identifier}</span>
          )}
          <span className={cn("text-[13px] leading-snug", checked ? "text-muted-foreground line-through decoration-1" : "text-foreground")}>
            {item.text}
          </span>
          {item.meta && (
            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-[1px] text-[10px] font-medium tabular-nums text-muted-foreground">{item.meta}</span>
          )}
        </span>
      </button>
    </li>
  );
};

export const FeaturesPage: React.FC = () => {
  const { data } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const clearScope = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const scopeFeature = useMemo(() => {
    const focusId = searchParams.get("focus");
    if (!focusId) return null;
    const f = data.features.find((x) => x.id === focusId);
    if (!f || f.parentExternalId) return null;
    return f;
  }, [searchParams, data.features]);

  const baseFeatures = useMemo(() => {
    if (!scopeFeature?.externalId) return data.features;
    return data.features.filter((f) => f.parentExternalId === scopeFeature.externalId);
  }, [data.features, scopeFeature]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseFeatures
      .filter((f) =>
        !q ||
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.prdMarkdown.toLowerCase().includes(q)
      )
      .sort((a, b) => a.order - b.order);
  }, [baseFeatures, searchQuery]);

  const attachmentsByFeature = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of data.featureAttachments) map.set(a.featureId, (map.get(a.featureId) ?? 0) + 1);
    return map;
  }, [data.featureAttachments]);

  // Summary chips (status breakdown) for the scoped plan.
  const breakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of rows) counts[f.status] = (counts[f.status] ?? 0) + 1;
    return counts;
  }, [rows]);

  return (
    <>
      <div className="pt-6">
        <div className="mb-3 flex items-center gap-3">
          <Link to="/features" className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft size={12} /> Back to features list
          </Link>
          {scopeFeature && (
            <button onClick={clearScope} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              · Show all features
            </button>
          )}
        </div>

        <PageToolbar
          title={scopeFeature ? scopeFeature.title : "Features"}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search phases and PRDs..."
          count={rows.length}
          countLabel={scopeFeature ? "phases" : "features"}
          actions={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-1" /> New feature
            </Button>
          }
        />

        {/* status breakdown */}
        {rows.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {(["building", "blocked", "planned", "drafting", "deferred", "shipped"] as RawStatus[])
              .filter((s) => breakdown[s])
              .map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
                  <span className="font-medium tabular-nums text-foreground">{breakdown[s]}</span> {STATUS_META[s].label}
                </span>
              ))}
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={scopeFeature ? `No phases yet for "${scopeFeature.title}"` : "No features yet"}
            description={
              scopeFeature
                ? "This plan has no sub-features tracked as separate Compass rows yet (set parent_external_id in frontmatter)."
                : "Start by creating a feature. Attach a PRD as markdown or upload one as .md or .pdf."
            }
            action={
              scopeFeature ? (
                <Link to="/features" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={12} /> Back to features list
                </Link>
              ) : (
                <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-1" /> New feature</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            {/* Header */}
            <div className={cn("grid min-w-[760px] items-center border-b border-border bg-primary/10", COLS)}>
              {["#", "Sub-phase", "What it does", "Status", "Progress"].map((h, i) => (
                <div key={h} className={cn("px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-primary", i === 0 && "pl-3")}>
                  {h}
                </div>
              ))}
            </div>
            {/* Rows */}
            {rows.map((f, i) => (
              <PhaseRow
                key={f.id}
                feature={f}
                index={i}
                attachmentCount={attachmentsByFeature.get(f.id) ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      <NewFeatureModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
    </>
  );
};

// ---------------------------------------------------------------------------
// New Feature Modal
// ---------------------------------------------------------------------------

interface NewFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const STATUS_ORDER: FeatureStatus[] = ["planned", "building", "shipped"];
const NEW_STATUS_LABEL: Record<FeatureStatus, string> = { planned: "Planned", building: "Building", shipped: "Shipped" };

const NewFeatureModal: React.FC<NewFeatureModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { data, actions } = useData();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<FeatureStatus>("planned");
  const [ownerId, setOwnerId] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("planned");
    setOwnerId("");
    setOrgId("");
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const id = actions.addFeature({
      title: title.trim(),
      description: description.trim(),
      status,
      ownerId: ownerId || undefined,
      orgId: orgId || undefined,
      prdMarkdown: "",
    });
    reset();
    onClose();
    onCreated(id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New feature">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Multi-property reservations view" autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Short description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One or two lines on what this is" rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (<SelectItem key={s} value={s}>{NEW_STATUS_LABEL[s]}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Owner</label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {data.users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Organization</label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {data.organizations.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>Create feature</Button>
        </div>
      </div>
    </Modal>
  );
};

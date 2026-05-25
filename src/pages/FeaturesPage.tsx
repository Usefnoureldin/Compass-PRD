import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useData } from "@/context/DataContext";
import { Feature, FeatureStatus } from "@/types";
import { computeChecklist } from "@/lib/checklist";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeatureDetailModal } from "@/components/features/FeatureDetailModal";
import {
  Plus,
  Sparkles,
  ClipboardCheck,
  Hammer,
  Rocket,
  FileText,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  FeatureStatus,
  { label: string; icon: typeof ClipboardCheck; tint: string; emptyHint: string; colSpan: string }
> = {
  planned: {
    label: "Planned",
    icon: ClipboardCheck,
    tint: "text-blue-500 bg-blue-500/10",
    emptyHint:
      "Create a feature here. Drop a .md to bootstrap the PRD, then drag to Building when work starts.",
    colSpan: "lg:col-span-1",
  },
  building: {
    label: "Building",
    icon: Hammer,
    tint: "text-primary bg-primary/10",
    emptyHint: "Drag features here when development kicks off.",
    colSpan: "lg:col-span-2",
  },
  shipped: {
    label: "Shipped",
    icon: Rocket,
    tint: "text-emerald-500 bg-emerald-500/10",
    emptyHint: "Drag features here once they're live in production.",
    colSpan: "lg:col-span-1",
  },
};

const STATUS_ORDER: FeatureStatus[] = ["planned", "building", "shipped"];

export const FeaturesPage: React.FC = () => {
  const { data, actions } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.features;
    return data.features.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.prdMarkdown.toLowerCase().includes(q)
    );
  }, [data.features, searchQuery]);

  const grouped = useMemo(() => {
    const out: Record<FeatureStatus, Feature[]> = {
      planned: [],
      building: [],
      shipped: [],
    };
    for (const f of filtered) {
      if (out[f.status]) out[f.status].push(f);
    }
    for (const k of STATUS_ORDER) out[k].sort((a, b) => a.order - b.order);
    return out;
  }, [filtered]);

  const selected = selectedId ? data.features.find((f) => f.id === selectedId) ?? null : null;

  const attachmentsByFeature = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of data.featureAttachments) {
      map.set(a.featureId, (map.get(a.featureId) ?? 0) + 1);
    }
    return map;
  }, [data.featureAttachments]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    actions.moveFeature(
      result.draggableId,
      result.destination.droppableId as FeatureStatus,
      result.destination.index
    );
  };

  return (
    <>
      <div className="pt-6">
        <PageToolbar
          title="Features"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search features and PRDs..."
          count={data.features.length}
          countLabel="features"
          actions={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-1" />
              New feature
            </Button>
          }
        />

        {data.features.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No features yet"
            description="Start by creating a feature. Attach a PRD as markdown or upload the one you generated with Claude as .md or .pdf."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} className="mr-1" />
                New feature
              </Button>
            }
          />
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {STATUS_ORDER.map((status) => {
                const meta = STATUS_META[status];
                const Icon = meta.icon;
                const items = grouped[status];
                return (
                  <Droppable droppableId={status} key={status}>
                    {(dropProvided, dropSnapshot) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className={cn(
                          "bg-muted/30 rounded-2xl p-3 min-h-[240px] flex flex-col transition-colors",
                          meta.colSpan,
                          dropSnapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", meta.tint)}>
                            <Icon size={14} />
                          </div>
                          <span className="font-semibold text-sm">{meta.label}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{items.length}</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          {items.length === 0 && !dropSnapshot.isDraggingOver && (
                            <div className="text-xs text-muted-foreground/70 italic text-center py-6 px-2 leading-relaxed">
                              {meta.emptyHint}
                            </div>
                          )}
                          {items.map((feature, index) => (
                            <Draggable draggableId={feature.id} index={index} key={feature.id}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={dragProvided.draggableProps.style}
                                  className={cn(dragSnapshot.isDragging && "opacity-90 shadow-lg")}
                                >
                                  <FeatureCard
                                    feature={feature}
                                    attachmentCount={attachmentsByFeature.get(feature.id) ?? 0}
                                    onClick={() => setSelectedId(feature.id)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {dropProvided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      <NewFeatureModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => setSelectedId(id)} />
      <FeatureDetailModal feature={selected} isOpen={!!selected} onClose={() => setSelectedId(null)} />
    </>
  );
};

interface FeatureCardProps {
  feature: Feature;
  attachmentCount: number;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, attachmentCount, onClick }) => {
  const { data, actions } = useData();
  const owner = data.users.find((u) => u.id === feature.ownerId);
  const org = data.organizations.find((o) => o.id === feature.orgId);
  const hasPrd = feature.prdMarkdown.trim().length > 0;

  const items = useMemo(() => computeChecklist(feature), [feature]);
  const total = items.length;
  const done = items.filter((i) => i.isDone).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const isBuilding = feature.status === "building";

  // Building cards show inline checklist + progress bar.
  // All other status cards stay compact — no checklist UI.
  if (isBuilding && total > 0) {
    return (
      <motion.div
        layout
        onClick={onClick}
        whileHover={{ y: -1 }}
        className="cursor-pointer w-full text-left bg-card border border-border/40 rounded-xl p-3 hover:border-primary/40 hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-semibold text-sm line-clamp-2 flex-1">{feature.title}</div>
          <div
            className={cn(
              "shrink-0 text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
              done === total
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {done}/{total}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Inline checklist */}
        <div
          className="max-h-72 overflow-y-auto -mx-1 px-1 py-1 space-y-0.5 rounded-md"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <InlineChecklistRow
              key={item.key}
              item={item}
              onToggle={() => actions.toggleChecklistItem(feature.id, item.key)}
            />
          ))}
        </div>

        {/* Footer metadata */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
          {hasPrd && (
            <div className="flex items-center gap-0.5">
              <FileText size={10} />
              PRD
            </div>
          )}
          {attachmentCount > 0 && (
            <div className="flex items-center gap-0.5">
              <Paperclip size={10} />
              {attachmentCount}
            </div>
          )}
          {owner && <div className="truncate">· {owner.name}</div>}
          {org && <div className="truncate">· {org.name}</div>}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ y: -1 }}
      className="cursor-pointer w-full text-left bg-card border border-border/40 rounded-xl p-3 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="font-semibold text-sm line-clamp-2 mb-1">{feature.title}</div>
      {feature.description && (
        <div className="text-xs text-muted-foreground line-clamp-2 mb-2">{feature.description}</div>
      )}
      <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
        {hasPrd && (
          <div className="flex items-center gap-0.5">
            <FileText size={10} />
            PRD
          </div>
        )}
        {attachmentCount > 0 && (
          <div className="flex items-center gap-0.5">
            <Paperclip size={10} />
            {attachmentCount}
          </div>
        )}
        {owner && <div className="truncate">· {owner.name}</div>}
        {org && <div className="truncate">· {org.name}</div>}
      </div>
    </motion.div>
  );
};

interface InlineChecklistRowProps {
  item: ReturnType<typeof computeChecklist>[number];
  onToggle: () => void;
}

const InlineChecklistRow: React.FC<InlineChecklistRowProps> = ({ item, onToggle }) => {
  const isHeading = item.kind === "heading";
  // Tighter indents than the modal version since space is limited inside the card.
  const indent = isHeading
    ? Math.max(0, (item.headingLevel ?? 2) - 2) * 8
    : 16 + (item.indent ?? 0) * 8;

  // Headings get a visual section break: background tint + slightly bigger.
  if (isHeading) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        style={{ paddingLeft: `${indent + 6}px` }}
        className={cn(
          "w-full text-left flex items-center gap-2 py-1 pr-2 mt-2 first:mt-0 rounded-md transition-colors group",
          "bg-muted/40 hover:bg-muted/70",
          item.isDone && "opacity-50"
        )}
      >
        <span
          className={cn(
            "shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center transition-all",
            item.isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/50 group-hover:border-primary"
          )}
        >
          {item.isDone && <Check size={8} strokeWidth={3} />}
        </span>
        <span
          className={cn(
            "flex-1 font-semibold leading-snug line-clamp-2",
            (item.headingLevel ?? 9) <= 2 && "text-xs",
            (item.headingLevel ?? 9) === 3 && "text-[11px]",
            (item.headingLevel ?? 0) >= 4 && "text-[10px] text-muted-foreground uppercase tracking-wide",
            item.isDone && "line-through decoration-1"
          )}
          title={item.text}
        >
          {item.text}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{ paddingLeft: `${indent + 4}px` }}
      className={cn(
        "w-full text-left flex items-start gap-2 py-1 pr-2 rounded transition-colors group",
        "hover:bg-muted/60",
        item.isDone && "opacity-50"
      )}
    >
      <span
        className={cn(
          "shrink-0 mt-[3px] w-3.5 h-3.5 rounded border flex items-center justify-center transition-all",
          item.isDone
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 group-hover:border-primary"
        )}
      >
        {item.isDone && <Check size={9} strokeWidth={3} />}
      </span>
      <span
        className={cn(
          "flex-1 text-[11px] leading-snug line-clamp-2",
          item.isDone && "line-through decoration-1"
        )}
        title={item.text}
      >
        {item.text}
      </span>
    </button>
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
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Multi-property reservations view"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Short description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two lines on what this is"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Owner</label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {data.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Organization</label>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {data.organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Create feature
          </Button>
        </div>
      </div>
    </Modal>
  );
};

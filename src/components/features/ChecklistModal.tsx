import React, { useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useData } from "@/context/DataContext";
import { Feature } from "@/types";
import { computeChecklist } from "@/lib/checklist";
import { Check, CheckCheck, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistModalProps {
  feature: Feature | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({ feature, isOpen, onClose }) => {
  const { actions } = useData();

  const items = useMemo(() => (feature ? computeChecklist(feature) : []), [feature]);
  const done = items.filter((i) => i.isDone).length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (!feature) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 pt-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ListChecks size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Checklist</div>
              <div className="text-lg font-bold truncate">{feature.title}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold tabular-nums">
                {done}<span className="text-muted-foreground text-base">/{total}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{pct}% done</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[280px]">
          {items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <ListChecks size={32} className="mx-auto mb-3 opacity-30" />
              <div>
                No items found in this PRD.
              </div>
              <div className="text-xs mt-1 max-w-xs mx-auto">
                Add headings (<code className="bg-muted px-1 rounded">## section</code>) or task list items (
                <code className="bg-muted px-1 rounded">- [ ] task</code>) to the PRD.
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <ChecklistRow
                  key={item.key}
                  item={item}
                  onToggle={() => actions.toggleChecklistItem(feature.id, item.key)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            {total > 0 ? `${total - done} item${total - done === 1 ? "" : "s"} remaining` : ""}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface ChecklistRowProps {
  item: ReturnType<typeof computeChecklist>[number];
  onToggle: () => void;
}

const ChecklistRow: React.FC<ChecklistRowProps> = ({ item, onToggle }) => {
  const isHeading = item.kind === "heading";

  // Indent rules:
  //   Heading h1 → 0, h2 → 0, h3+ → (level-2)*16
  //   Bullet    → 24 (base offset under headings) + indent*16
  const indent = isHeading
    ? Math.max(0, (item.headingLevel ?? 1) - 2) * 16
    : 24 + (item.indent ?? 0) * 16;

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ paddingLeft: `${indent + 8}px` }}
      className={cn(
        "w-full text-left flex items-start gap-3 py-1.5 pr-3 rounded-lg transition-colors group",
        "hover:bg-muted/60",
        item.isDone && "opacity-60",
        isHeading && "mt-2 first:mt-0"
      )}
    >
      {/* Checkbox */}
      <span
        className={cn(
          "shrink-0 mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all",
          item.isDone
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/40 group-hover:border-primary"
        )}
      >
        {item.isDone && <Check size={13} strokeWidth={3} />}
      </span>

      {/* Text */}
      <span
        className={cn(
          "flex-1 text-sm leading-snug",
          isHeading && "font-semibold",
          isHeading && (item.headingLevel ?? 9) <= 1 && "text-base",
          isHeading && item.headingLevel === 2 && "text-[15px]",
          isHeading && (item.headingLevel ?? 0) >= 4 && "text-xs text-muted-foreground uppercase tracking-wide",
          item.isDone && "line-through decoration-1"
        )}
      >
        {item.text}
      </span>
    </button>
  );
};

interface ChecklistProgressChipProps {
  feature: Feature;
  onClick: (e: React.MouseEvent) => void;
}

export const ChecklistProgressChip: React.FC<ChecklistProgressChipProps> = ({ feature, onClick }) => {
  const items = useMemo(() => computeChecklist(feature), [feature]);
  const total = items.length;
  if (total === 0) return null;
  const done = items.filter((i) => i.isDone).length;
  const isComplete = done === total;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors border",
        isComplete
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          : "bg-muted border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
      )}
      title="Open checklist"
    >
      {isComplete ? <CheckCheck size={11} /> : <ListChecks size={11} />}
      <span className="tabular-nums">
        {done}/{total}
      </span>
    </button>
  );
};

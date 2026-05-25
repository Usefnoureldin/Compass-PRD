import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { useData } from "@/context/DataContext";
import { cn } from "@/lib/utils";

export const SaveIndicator: React.FC = () => {
  const { saveStatus, saveError, retrySave } = useData();

  if (saveStatus === "idle") return null;

  if (saveStatus === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm bg-destructive text-destructive-foreground rounded-xl shadow-xl border border-destructive/50 px-4 py-3 flex items-start gap-3"
      >
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Save failed</div>
          <div className="text-xs opacity-90 break-words">{saveError ?? "Unknown error"}</div>
          <button
            onClick={retrySave}
            className="mt-2 text-xs font-medium underline-offset-2 hover:underline inline-flex items-center gap-1"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key={saveStatus}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full shadow-md border border-border/40 backdrop-blur px-3 py-1.5 text-xs flex items-center gap-1.5",
          saveStatus === "saving"
            ? "bg-background/90 text-muted-foreground"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        )}
      >
        {saveStatus === "saving" ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            <span>Saving…</span>
          </>
        ) : (
          <>
            <Check size={12} />
            <span>Saved</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

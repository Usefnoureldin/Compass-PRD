import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useData } from "@/context/DataContext";
import { storage } from "@/services/storage";
import { Feature, FeatureAttachment, FeatureStatus } from "@/types";
import { MarkdownPreview } from "./MarkdownPreview";
import {
  FileText,
  FileType2,
  Upload,
  Download,
  Trash2,
  Eye,
  Pencil,
  Save,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureDetailModalProps {
  feature: Feature | null;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "building", label: "Building" },
  { value: "shipped", label: "Shipped" },
];

const formatBytes = (b: number) => {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
};

export const FeatureDetailModal: React.FC<FeatureDetailModalProps> = ({ feature, isOpen, onClose }) => {
  const { data, actions } = useData();
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [prdDraft, setPrdDraft] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<FeatureAttachment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FeatureAttachment | null>(null);
  const [pendingFeatureDelete, setPendingFeatureDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft when feature changes.
  useEffect(() => {
    if (feature) {
      setPrdDraft(feature.prdMarkdown ?? "");
      setIsDirty(false);
      setMode("edit");
      setViewingPdf(null);
    }
  }, [feature?.id]);

  if (!feature) return null;

  const attachments = data.featureAttachments
    .filter((a) => a.featureId === feature.id)
    .sort((a, b) => b.uploadedAt - a.uploadedAt);

  const owner = data.users.find((u) => u.id === feature.ownerId);
  const org = data.organizations.find((o) => o.id === feature.orgId);
  const sprint = data.sprints.find((s) => s.id === feature.sprintId);

  const handlePrdChange = (val: string) => {
    setPrdDraft(val);
    setIsDirty(val !== (feature.prdMarkdown ?? ""));
  };

  const savePrd = () => {
    actions.updateFeature(feature.id, { prdMarkdown: prdDraft });
    setIsDirty(false);
  };

  // Any .md upload auto-populates the PRD body. PDFs just attach.
  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachment = await actions.uploadFeatureAttachment(feature.id, file, { setAsPrd: true });
        if (attachment.fileType === "md") {
          const text = await file.text();
          setPrdDraft(text);
          setIsDirty(false);
          setMode("preview");
        }
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onLoadMdIntoEditor = async (att: FeatureAttachment) => {
    try {
      const text = await storage.downloadAttachmentText(att.filePath);
      setPrdDraft(text);
      setIsDirty(true);
      setMode("edit");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    }
  };

  const onDownload = (att: FeatureAttachment) => {
    const url = storage.getAttachmentUrl(att.filePath);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.fileName;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const onOpenExternal = (att: FeatureAttachment) => {
    const url = storage.getAttachmentUrl(att.filePath);
    window.open(url, "_blank", "noopener");
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-8 pt-6 pb-4 border-b border-border/40 shrink-0">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={feature.title}
                  onChange={(e) => actions.updateFeature(feature.id, { title: e.target.value })}
                  className="text-xl font-bold border-0 shadow-none px-0 h-auto hover:bg-transparent focus-visible:ring-0"
                  placeholder="Feature title"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="w-44">
                    <Select
                      value={feature.status}
                      onValueChange={(v) => actions.updateFeature(feature.id, { status: v as FeatureStatus })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {owner && (
                    <div className="text-xs text-muted-foreground">
                      Owner: <span className="text-foreground font-medium">{owner.name}</span>
                    </div>
                  )}
                  {org && (
                    <div className="text-xs text-muted-foreground">
                      Org: <span className="text-foreground font-medium">{org.name}</span>
                    </div>
                  )}
                  {sprint && (
                    <div className="text-xs text-muted-foreground">
                      Sprint: <span className="text-foreground font-medium">{sprint.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_320px]">
            {/* PRD column */}
            <div className="flex flex-col min-h-0 border-r border-border/40">
              <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">PRD</span>
                  {isDirty && <span className="text-xs text-amber-500">• unsaved</span>}
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
                  <button
                    onClick={() => setMode("edit")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                      mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setMode("preview")}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1",
                      mode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {viewingPdf ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-muted-foreground truncate">{viewingPdf.fileName}</div>
                      <Button variant="ghost" size="sm" onClick={() => setViewingPdf(null)}>
                        Back to PRD
                      </Button>
                    </div>
                    <iframe
                      src={storage.getAttachmentUrl(viewingPdf.filePath)}
                      className="flex-1 w-full rounded-lg border border-border/40 bg-white min-h-[60vh]"
                      title={viewingPdf.fileName}
                    />
                  </div>
                ) : mode === "edit" ? (
                  <Textarea
                    value={prdDraft}
                    onChange={(e) => handlePrdChange(e.target.value)}
                    placeholder={`# ${feature.title}\n\n## Problem\n\n## Goals\n\n## Approach\n\n## Open questions\n`}
                    className="font-mono text-sm min-h-[55vh] h-full resize-none"
                  />
                ) : (
                  <MarkdownPreview source={prdDraft} />
                )}
              </div>

              {!viewingPdf && (
                <div className="border-t border-border/40 px-6 py-3 flex items-center justify-between shrink-0">
                  <div className="text-xs text-muted-foreground">
                    {prdDraft.length.toLocaleString()} chars
                  </div>
                  <Button size="sm" onClick={savePrd} disabled={!isDirty}>
                    <Save size={14} className="mr-1" />
                    Save PRD
                  </Button>
                </div>
              )}
            </div>

            {/* Attachments column */}
            <div className="flex flex-col min-h-0">
              <div className="px-5 py-3 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2">
                  <FileType2 size={16} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">Attachments</span>
                  <span className="text-xs text-muted-foreground ml-auto">{attachments.length}</span>
                </div>
              </div>

              {/* Drop zone */}
              <div className="px-4 pt-4 shrink-0">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files.length) {
                      handleFiles(e.dataTransfer.files);
                    }
                  }}
                  className={cn(
                    "rounded-xl border-2 border-dashed p-4 text-center transition-colors",
                    isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <Upload size={20} className="mx-auto text-muted-foreground mb-2" />
                  <div className="text-xs text-muted-foreground">
                    Drop <span className="font-medium text-foreground">.md</span> or{" "}
                    <span className="font-medium text-foreground">.pdf</span> here
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">
                    .md files auto-populate the PRD
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPickFile}
                    disabled={isUploading}
                    className="w-full text-xs mt-3"
                  >
                    {isUploading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                    Upload file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.pdf,text/markdown,application/pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </div>
                {uploadError && (
                  <div className="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    {uploadError}
                  </div>
                )}
              </div>

              {/* Attachment list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
                {attachments.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    No files yet
                  </div>
                ) : (
                  attachments.map((att) => (
                    <div
                      key={att.id}
                      className="group rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 transition-colors p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold",
                            att.fileType === "pdf"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-blue-500/10 text-blue-500"
                          )}
                        >
                          {att.fileType.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" title={att.fileName}>
                            {att.fileName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatBytes(att.fileSize)} ·{" "}
                            {new Date(att.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {att.fileType === "pdf" ? (
                          <button
                            onClick={() => setViewingPdf(att)}
                            className="text-[10px] px-2 py-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <Eye size={11} /> View
                          </button>
                        ) : (
                          <button
                            onClick={() => onLoadMdIntoEditor(att)}
                            className="text-[10px] px-2 py-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            <FileText size={11} /> Load into editor
                          </button>
                        )}
                        <button
                          onClick={() => onDownload(att)}
                          className="text-[10px] px-2 py-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Download size={11} /> Download
                        </button>
                        <button
                          onClick={() => onOpenExternal(att)}
                          className="text-[10px] px-2 py-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={11} /> Open
                        </button>
                        <button
                          onClick={() => setPendingDelete(att)}
                          className="ml-auto text-[10px] px-2 py-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border/40 px-6 py-3 flex items-center justify-between shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingFeatureDelete(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} className="mr-1" />
              Delete feature
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await actions.deleteFeatureAttachment(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
        title="Delete attachment?"
        description={`This will permanently remove "${pendingDelete?.fileName}" from storage.`}
        confirmText="Delete"
      />

      <ConfirmDialog
        isOpen={pendingFeatureDelete}
        onClose={() => setPendingFeatureDelete(false)}
        onConfirm={() => {
          actions.deleteFeature(feature.id);
          setPendingFeatureDelete(false);
          onClose();
        }}
        title="Delete feature?"
        description={`This deletes "${feature.title}" and all its attachments.`}
        confirmText="Delete"
      />
    </>
  );
};

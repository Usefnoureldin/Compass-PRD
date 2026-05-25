import type { ChecklistItem, ChecklistState, Feature } from "@/types";

interface ParsedItem {
  text: string;
  kind: "heading" | "checklist";
  headingLevel?: number;
  indent?: number;
}

/**
 * Strip common inline markdown so the displayed text reads as prose:
 *   **bold** / __bold__         → bold
 *   *italic* / _italic_         → italic
 *   `code`                      → code
 *   [text](url) / [text][ref]   → text
 *   ![alt](url)                 → alt
 * Leaves the underlying markdown body untouched.
 */
const stripInlineMarkdown = (s: string): string =>
  s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1") // ref-links
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2") // *italic*
    .replace(/(^|[^_])_([^_]+)_/g, "$1$2") // _italic_
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (s: string): string =>
  s.trim().toLowerCase().replace(/\s+/g, " ");

const makeKey = (item: ParsedItem): string => {
  const norm = normalizeText(item.text);
  return item.kind === "heading"
    ? `h${item.headingLevel}:${norm}`
    : `c${item.indent ?? 0}:${norm}`;
};

/**
 * Pull tracked items out of PRD markdown:
 *   - Headings (# .. ######) → kind: 'heading'
 *   - Bullet items (-, *, +) including GFM task lists ([ ] / [x]) → kind: 'checklist'
 *   - Numbered list items (1., 2., …) → kind: 'checklist'
 * Items appear in document order. Skips fenced code blocks.
 * Indent is computed from leading whitespace (2 spaces = 1 level).
 */
export function parsePrdItems(markdown: string): ParsedItem[] {
  if (!markdown) return [];

  const items: ParsedItem[] = [];
  const lines = markdown.split("\n");
  let inFence = false;

  for (const rawLine of lines) {
    const line = rawLine;

    // Toggle fenced code block (``` or ~~~).
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    // Heading: leading hashes (1-6), at least one space, then text.
    // Skip H1 — the document title is not actionable.
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) continue;
      const text = stripInlineMarkdown(heading[2].replace(/\s*#+\s*$/, ""));
      if (text) items.push({ kind: "heading", headingLevel: level, text });
      continue;
    }

    // Bullet item: -, *, or + with optional [ ]/[x] checkbox.
    const bullet = line.match(/^(\s*)[-*+]\s+(?:\[[ xX]\]\s+)?(.+?)\s*$/);
    if (bullet) {
      const indent = Math.min(6, Math.floor(bullet[1].length / 2));
      const text = stripInlineMarkdown(bullet[2]);
      if (text) items.push({ kind: "checklist", text, indent });
      continue;
    }

    // Numbered list item: "1. text", "2) text", etc.
    const numbered = line.match(/^(\s*)\d+[.)]\s+(.+?)\s*$/);
    if (numbered) {
      const indent = Math.min(6, Math.floor(numbered[1].length / 2));
      const text = stripInlineMarkdown(numbered[2]);
      if (text) items.push({ kind: "checklist", text, indent });
    }
  }

  return items;
}

/**
 * Combine parsed items with the persisted completion overlay.
 * Items not present in the overlay default to `isDone: false`.
 * Stable across PRD edits as long as item text doesn't change.
 */
export function computeChecklist(feature: Feature): ChecklistItem[] {
  const parsed = parsePrdItems(feature.prdMarkdown);
  const stateMap = new Map<string, ChecklistState>();
  for (const s of feature.prdChecklistState ?? []) stateMap.set(s.key, s);

  // De-duplicate keys by suffixing repeats so identical headings/items don't collide.
  const seen = new Map<string, number>();
  return parsed.map((item, order) => {
    const baseKey = makeKey(item);
    const count = seen.get(baseKey) ?? 0;
    seen.set(baseKey, count + 1);
    const key = count === 0 ? baseKey : `${baseKey}#${count}`;
    const state = stateMap.get(key);
    return {
      key,
      text: item.text,
      kind: item.kind,
      headingLevel: item.headingLevel,
      indent: item.indent,
      order,
      isDone: state?.isDone ?? false,
      completedAt: state?.completedAt,
    };
  });
}

/**
 * Compact summary used for progress chips on cards.
 */
export function checklistProgress(feature: Feature): { done: number; total: number } {
  const items = computeChecklist(feature);
  return { done: items.filter((i) => i.isDone).length, total: items.length };
}

/**
 * Toggle a key in the overlay; drops stale entries that no longer match any
 * parsed item so the state array doesn't grow unbounded.
 */
export function toggleChecklistKey(
  feature: Feature,
  key: string
): ChecklistState[] {
  const items = computeChecklist(feature);
  const validKeys = new Set(items.map((i) => i.key));
  const current = new Map<string, ChecklistState>();
  for (const s of feature.prdChecklistState ?? []) {
    if (validKeys.has(s.key)) current.set(s.key, s);
  }

  const existing = current.get(key);
  const next: ChecklistState = existing
    ? {
        key,
        isDone: !existing.isDone,
        completedAt: !existing.isDone ? Date.now() : undefined,
      }
    : { key, isDone: true, completedAt: Date.now() };
  current.set(key, next);

  return Array.from(current.values());
}

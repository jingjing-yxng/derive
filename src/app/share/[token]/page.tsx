"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, Calendar, Users, Globe, Pencil, Check, Plus, X, GripVertical, Moon,
} from "lucide-react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActivityRow } from "@/components/itinerary/ActivityRow";
import { ActivityDetailInline } from "@/components/itinerary/ActivityDetailInline";
import { ShareChatWidget } from "@/components/share/ShareChatWidget";
import { TripWorkspaceContext, type SelectedActivity } from "@/contexts/TripWorkspaceContext";
import { stripMarkdown } from "@/lib/strip-markdown";
import type { Itinerary, DayPlan, Activity } from "@/types/trip";

/* ─── Types ─── */

type PageBlock =
  | { id: string; type: "text"; content: string }
  | { id: string; type: "day"; dayIndex: number };

interface SharedData {
  itinerary: {
    id: string;
    title: string;
    summary?: string;
    days: DayPlan[];
    pageBlocks?: PageBlock[];
  };
  trip: {
    regions: string[];
    startDate: string;
    endDate: string;
    travelParty?: string;
  } | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Build default page blocks from days array */
function blocksFromDays(days: DayPlan[]): PageBlock[] {
  return days.map((_, i) => ({ id: `day-${i}`, type: "day" as const, dayIndex: i }));
}

/** Ensure saved blocks include all current days */
function mergeBlocks(saved: PageBlock[], dayCount: number): PageBlock[] {
  const existing = new Set(
    saved.filter((b): b is PageBlock & { type: "day" } => b.type === "day").map((b) => b.dayIndex)
  );
  const valid = saved.filter((b) => b.type !== "day" || (b.dayIndex !== undefined && b.dayIndex < dayCount));
  const missing = Array.from({ length: dayCount }, (_, i) => i)
    .filter((i) => !existing.has(i))
    .map((i) => ({ id: `day-${i}`, type: "day" as const, dayIndex: i }));
  return [...valid, ...missing];
}

/* ─── Sortable wrapper ─── */

function SortableBlock({ id, editing, children }: { id: string; editing: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editing });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="group/block relative mb-4">
      {editing && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -left-9 top-4 hidden cursor-grab rounded-md p-1 text-lavender-400 opacity-0 transition-opacity group-hover/block:opacity-80 hover:!opacity-100 hover:bg-lavender-50 lg:block touch-none"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}
      {children}
    </div>
  );
}

/* ─── Shared rich-text styles for contentEditable + view mode ─── */

const RICH_TEXT_CLASSES = [
  "[&_h1]:font-heading [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-n-900 [&_h1]:mt-1 [&_h1]:mb-0.5",
  "[&_h2]:font-heading [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-n-800 [&_h2]:mt-1 [&_h2]:mb-0.5",
  "[&_h3]:font-heading [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-n-700 [&_h3]:mt-0.5 [&_h3]:mb-0.5",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1",
  "[&_li]:text-[14px] [&_li]:leading-relaxed [&_strong]:font-semibold [&_u]:underline",
].join(" ");

/* ─── Slash menu options ─── */

const SLASH_OPTIONS = [
  { label: "Heading 1", tag: "h1", icon: "H1" },
  { label: "Heading 2", tag: "h2", icon: "H2" },
  { label: "Heading 3", tag: "h3", icon: "H3" },
  { label: "Bullet list", tag: "ul", icon: "•" },
  { label: "Numbered list", tag: "ol", icon: "1." },
];

/* ─── Text block card (WYSIWYG) ─── */

function TextBlockCard({
  content, editing, onChange, onDelete,
}: {
  content: string; editing: boolean; onChange: (c: string) => void; onDelete: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [slashMenu, setSlashMenu] = useState<{ x: number; y: number; filter: string } | null>(null);
  const [slashIdx, setSlashIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(false);

  // Track emptiness from the DOM directly (not from debounced state) to avoid placeholder lag
  const [editorEmpty, setEditorEmpty] = useState(true);
  const checkEmpty = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const empty = !html || html === "<br>" || html === "<p><br></p>" || !html.replace(/<[^>]*>/g, "").trim();
    setEditorEmpty(empty);
  }, []);

  const isEmpty = editing ? editorEmpty : (!content || content === "<br>" || content === "<p><br></p>" || !content.replace(/<[^>]*>/g, "").trim());

  // Set initial HTML once when entering edit mode
  useEffect(() => {
    if (editing && editorRef.current && !mountedRef.current) {
      editorRef.current.innerHTML = content || "";
      mountedRef.current = true;
      checkEmpty();
      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
    }
    if (!editing) mountedRef.current = false;
  }, [editing, content, checkEmpty]);

  const syncContent = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    }, 300);
  }, [onChange]);

  // Detect slash command on input
  const handleInput = useCallback(() => {
    checkEmpty();
    syncContent();

    const sel = window.getSelection();
    if (!sel?.rangeCount) { setSlashMenu(null); return; }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) { setSlashMenu(null); return; }

    const text = node.textContent || "";
    const offset = range.startOffset;
    const before = text.slice(0, offset);

    // Auto-replace arrows: -> → and <- ←
    const replacements: [RegExp, string][] = [[/->$/, "\u2192"], [/<-$/, "\u2190"], [/--$/, "\u2014"]];
    for (const [pattern, char] of replacements) {
      const m = before.match(pattern);
      if (m) {
        const start = offset - m[0].length;
        node.textContent = text.slice(0, start) + char + text.slice(offset);
        const nr = document.createRange();
        nr.setStart(node, start + 1);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        syncContent();
        return;
      }
    }

    const match = before.match(/\/([a-z0-9 ]*)$/i);

    if (match) {
      const rect = range.getBoundingClientRect();
      const edRect = editorRef.current!.getBoundingClientRect();
      setSlashMenu({ x: rect.left - edRect.left, y: rect.bottom - edRect.top + 4, filter: match[1].toLowerCase() });
      setSlashIdx(0);
    } else {
      setSlashMenu(null);
    }
  }, [checkEmpty, syncContent]);

  const filteredOptions = slashMenu
    ? SLASH_OPTIONS.filter((o) => o.label.toLowerCase().includes(slashMenu.filter))
    : [];

  // Save selection so we can restore it when clicking the dropdown
  const savedRange = useRef<Range | null>(null);
  useEffect(() => {
    if (slashMenu) {
      const sel = window.getSelection();
      if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, [slashMenu]);

  // Apply a slash command option
  const applySlashOption = useCallback((option: (typeof SLASH_OPTIONS)[0]) => {
    if (!editorRef.current) return;

    // Ensure focus is in the editor
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return;

    // Use live selection if available, fall back to saved range (for mouse clicks)
    if (!sel.rangeCount && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (!sel.rangeCount) return;

    // Remove the slash command text (e.g., "/hea") from the text node
    const curRange = sel.getRangeAt(0);
    const node = curRange.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      const offset = curRange.startOffset;
      const before = text.slice(0, offset);
      const si = before.lastIndexOf("/");
      if (si !== -1) {
        const after = text.slice(offset);
        node.textContent = text.slice(0, si) + after;
        const newPos = Math.min(si, (node.textContent || "").length);
        const nr = document.createRange();
        nr.setStart(node, newPos);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
      }
    }

    // Apply the formatting
    if (option.tag === "ul") document.execCommand("insertUnorderedList");
    else if (option.tag === "ol") document.execCommand("insertOrderedList");
    else document.execCommand("formatBlock", false, option.tag);

    setSlashMenu(null);
    savedRange.current = null;
    checkEmpty();
    // Sync immediately (not debounced) after formatting
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange, checkEmpty]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Slash menu navigation
    if (slashMenu && filteredOptions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx((i) => (i + 1) % filteredOptions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIdx((i) => (i - 1 + filteredOptions.length) % filteredOptions.length); return; }
      if (e.key === "Enter") { e.preventDefault(); applySlashOption(filteredOptions[slashIdx]); return; }
      if (e.key === "Escape") { setSlashMenu(null); return; }
    }

    // Cmd+B / Cmd+I / Cmd+U
    if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); document.execCommand("bold"); syncContent(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); document.execCommand("italic"); syncContent(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === "u") { e.preventDefault(); document.execCommand("underline"); syncContent(); return; }

    // Auto-bullet: space after lone "*" or "1." at start of block
    if (e.key === " ") {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      let block: Node | null = range.startContainer;
      while (block && block !== editorRef.current && !["P", "DIV"].includes((block as Element).tagName || "")) {
        block = block.parentNode;
      }
      const blockText = (block?.textContent || "").trim();
      if (blockText === "*") {
        e.preventDefault();
        if (block) block.textContent = "";
        document.execCommand("insertUnorderedList");
        syncContent();
        return;
      }
      if (blockText === "1.") {
        e.preventDefault();
        if (block) block.textContent = "";
        document.execCommand("insertOrderedList");
        syncContent();
        return;
      }
    }
  }, [slashMenu, filteredOptions, slashIdx, applySlashOption, syncContent]);

  // View mode
  if (!editing) {
    if (isEmpty) return null;
    return (
      <div className="rounded-[20px] border border-n-200 bg-n-0 px-6 py-5 shadow-sm">
        <div className={`text-[14px] leading-relaxed text-n-700 ${RICH_TEXT_CLASSES}`} dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  // Edit mode
  return (
    <div className="group/text relative rounded-[20px] border border-n-200 bg-n-0 px-6 py-5 shadow-sm transition-all focus-within:border-lavender-300 focus-within:ring-2 focus-within:ring-lavender-300/30">
      <div className="relative">
        {/* Placeholder */}
        {isEmpty && (
          <p className="pointer-events-none absolute left-0 top-0 text-[14px] text-n-300">
            Type here. Press <span className="font-medium">/</span> for headings &amp; lists.
          </p>
        )}
        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => { setSlashMenu(null); if (editorRef.current) onChange(editorRef.current.innerHTML); }}
          className={`min-h-[1.5em] w-full outline-none text-[14px] leading-relaxed text-n-700 ${RICH_TEXT_CLASSES}`}
        />
      </div>

      {/* Slash command dropdown */}
      {slashMenu && filteredOptions.length > 0 && (
        <div
          style={{ left: Math.max(0, slashMenu.x), top: slashMenu.y }}
          className="absolute z-10 overflow-hidden rounded-xl border border-n-200 bg-white shadow-lg min-w-[180px]"
        >
          {filteredOptions.map((opt, i) => (
            <button
              key={opt.tag}
              onMouseDown={(e) => { e.preventDefault(); applySlashOption(opt); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors ${
                i === slashIdx ? "bg-lavender-50 text-lavender-600" : "text-n-700 hover:bg-n-50"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-n-100 text-[11px] font-bold text-n-500">
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onDelete}
        className="absolute right-3 top-3 rounded-full p-1.5 text-n-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/text:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Day card ─── */

function DayCard({
  day, dayIndex, isLastDay, onActivityClick,
}: {
  day: DayPlan; dayIndex: number; isLastDay: boolean;
  onActivityClick: (dayIndex: number, actIndex: number, activity: Activity) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-n-200 bg-n-0 shadow-sm">
      {/* Day header */}
      <div className="flex items-center gap-2.5 border-b border-n-200 bg-n-50/60 px-4 py-3">
        <div className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-gradient-light px-2 text-[12px] font-bold text-white shadow-sm">
          {day.day}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[14px] font-semibold leading-snug text-n-900">
            {stripMarkdown(day.title)}
          </h3>
          {day.date && <p className="text-[11px] text-n-400">{day.date}</p>}
        </div>
        <span className="rounded-full bg-n-100 px-2 py-0.5 text-[10px] font-medium text-n-400">
          {day.activities.length} {day.activities.length === 1 ? "activity" : "activities"}
        </span>
      </div>

      {/* Activities */}
      <div className="min-h-[40px]">
        {day.activities.map((activity, i) => (
          <ActivityRow
            key={activity.id}
            id={activity.id}
            activity={activity}
            disabled
            isLast={i === day.activities.length - 1 && !day.overnight}
            onClick={() => onActivityClick(dayIndex, i, activity)}
          />
        ))}
        {day.activities.length === 0 && (
          <p className="px-4 py-4 text-[13px] italic text-n-400">No activities yet</p>
        )}
      </div>

      {/* Overnight */}
      {!isLastDay && day.overnight && (
        <div className="flex items-center gap-2.5 border-t border-n-100 bg-lavender-50/30 px-4 py-2.5">
          <Moon className="h-3.5 w-3.5 shrink-0 text-lavender-400" />
          <span className="text-[12px] text-n-600">{day.overnight}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */

export default function SharedItineraryPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Itinerary state
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<SelectedActivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Page blocks + edit mode
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const blockSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ─── Fetch ───
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          setError(res.status === 404 ? "This shared itinerary was not found." : "Something went wrong.");
          return;
        }
        const json: SharedData = await res.json();
        setData(json);

        const days = (json.itinerary.days || []).map((day: DayPlan) => ({
          ...day,
          activities: day.activities.map((a: Activity) => ({ ...a, id: a.id || crypto.randomUUID() })),
        }));

        setItinerary({
          id: json.itinerary.id, trip_id: "", session_id: "",
          title: json.itinerary.title, summary: json.itinerary.summary, days, ideas: [],
        });

        // Init page blocks
        const saved = json.itinerary.pageBlocks;
        if (saved && saved.length > 0) {
          setPageBlocks(mergeBlocks(saved, days.length));
        } else {
          setPageBlocks(blocksFromDays(days));
        }
      } catch {
        setError("Failed to load itinerary.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // ─── Persist helpers ───
  const persistPageBlocks = useCallback((blocks: PageBlock[]) => {
    clearTimeout(blockSaveRef.current);
    blockSaveRef.current = setTimeout(async () => {
      try {
        await fetch("/api/share", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, page_blocks: blocks }),
        });
      } catch (e) { console.error("Failed to save page blocks:", e); }
    }, 800);
  }, [token]);

  const persistChanges = useCallback((days: DayPlan[]) => {
    clearTimeout(saveTimeoutRef.current);
    clearTimeout(savedTimeoutRef.current);
    setSaving(true);
    setSaved(false);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/share", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, days }),
        });
        setSaving(false);
        setSaved(true);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
      } catch { setSaving(false); }
    }, 800);
  }, [token]);

  const persistTitle = useCallback((title: string) => {
    fetch("/api/share", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title }),
    }).catch(() => {});
  }, [token]);

  // ─── Itinerary handlers ───
  const handleUpdateDays = useCallback((days: DayPlan[]) => {
    setItinerary((prev) => (prev ? { ...prev, days } : prev));
    persistChanges(days);
  }, [persistChanges]);

  const handleUpdateIdeas = useCallback((ideas: Activity[]) => {
    setItinerary((prev) => (prev ? { ...prev, ideas } : prev));
  }, []);

  const handleUpdateActivity = useCallback((updated: Activity) => {
    if (!selectedActivity || !itinerary) return;
    if (selectedActivity.dayIndex === -1) {
      const ideas = (itinerary.ideas || []).map((a, i) => i === selectedActivity.actIndex ? updated : a);
      handleUpdateIdeas(ideas);
    } else {
      const days = itinerary.days.map((d, i) =>
        i === selectedActivity.dayIndex
          ? { ...d, activities: d.activities.map((a, j) => (j === selectedActivity.actIndex ? updated : a)) }
          : d
      );
      handleUpdateDays(days);
    }
    setSelectedActivity({ ...selectedActivity, activity: updated });
  }, [selectedActivity, itinerary, handleUpdateDays, handleUpdateIdeas]);

  const handleDeleteActivity = useCallback(() => {
    if (!selectedActivity || !itinerary) return;
    if (selectedActivity.dayIndex === -1) {
      const ideas = (itinerary.ideas || []).filter((_, i) => i !== selectedActivity.actIndex);
      handleUpdateIdeas(ideas);
    } else {
      const days = itinerary.days.map((d, i) =>
        i === selectedActivity.dayIndex
          ? { ...d, activities: d.activities.filter((_, j) => j !== selectedActivity.actIndex) }
          : d
      );
      handleUpdateDays(days);
    }
    setSelectedActivity(null);
  }, [selectedActivity, itinerary, handleUpdateDays, handleUpdateIdeas]);

  const handleActivityClick = useCallback((dayIndex: number, actIndex: number, activity: Activity) => {
    setSelectedActivity({ dayIndex, actIndex, activity });
  }, []);

  // ─── Page block handlers ───
  const handleAddTextBlock = useCallback(() => {
    const newBlock: PageBlock = { id: crypto.randomUUID(), type: "text", content: "" };
    setPageBlocks((prev) => {
      const updated = [newBlock, ...prev];
      persistPageBlocks(updated);
      return updated;
    });
  }, [persistPageBlocks]);

  const handleUpdateTextBlock = useCallback((blockId: string, content: string) => {
    setPageBlocks((prev) => {
      const updated = prev.map((b) => (b.id === blockId ? { ...b, content } : b));
      persistPageBlocks(updated);
      return updated;
    });
  }, [persistPageBlocks]);

  const handleDeleteTextBlock = useCallback((blockId: string) => {
    setPageBlocks((prev) => {
      const updated = prev.filter((b) => b.id !== blockId);
      persistPageBlocks(updated);
      return updated;
    });
  }, [persistPageBlocks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPageBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id);
      const newIdx = prev.findIndex((b) => b.id === over.id);
      const updated = arrayMove(prev, oldIdx, newIdx);
      persistPageBlocks(updated);
      return updated;
    });
  }, [persistPageBlocks]);

  // ─── Title editing ───
  const startEditTitle = useCallback(() => {
    if (!itinerary) return;
    setTitleDraft(itinerary.title);
    setEditingTitle(true);
  }, [itinerary]);

  const saveTitle = useCallback(() => {
    if (!titleDraft.trim()) { setEditingTitle(false); return; }
    setItinerary((prev) => prev ? { ...prev, title: titleDraft.trim() } : prev);
    persistTitle(titleDraft.trim());
    setEditingTitle(false);
  }, [titleDraft, persistTitle]);

  // ─── Context ───
  const workspaceCtx = {
    sendChatMessage: () => {},
    itinerary,
    updateItinerary: handleUpdateDays,
    updateIdeas: handleUpdateIdeas,
    selectedActivity,
    setSelectedActivity,
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-n-50">
        <Loader2 className="h-8 w-8 animate-spin text-lavender-400" />
      </div>
    );
  }

  if (error || !data || !itinerary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-n-50 px-4">
        <div className="rounded-[24px] border border-n-200 bg-n-0 px-8 py-10 text-center shadow-md">
          <h1 className="font-heading text-[20px] font-semibold text-n-900">Itinerary not found</h1>
          <p className="mt-2 text-[14px] text-n-500">{error || "This link may have expired or been removed."}</p>
          <a href="/" className="mt-6 inline-block rounded-full bg-brand-gradient-light px-6 py-2.5 text-[14px] font-semibold text-white shadow-md transition-shadow hover:shadow-lg">
            Plan your own trip
          </a>
        </div>
      </div>
    );
  }

  const { trip } = data;

  return (
    <TripWorkspaceContext.Provider value={workspaceCtx}>
      <div className="min-h-screen bg-n-50">
        {/* Hero header */}
        <div
          className="relative overflow-hidden rounded-b-[24px] px-4 pb-8 pt-10"
          style={{
            background: "linear-gradient(135deg, #F0EFF8 0%, #E2E0F2 20%, #C5C2E5aa 35%, #F0EFF8 50%, #FADCE0aa 65%, #F0EFF8 80%, #D0EDDE88 95%, #F0EFF8 100%)",
            backgroundSize: "200% 200%",
            animation: "ombre-flow 8s ease-in-out infinite",
          }}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-n-400">Shared Itinerary</p>
            {trip && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-n-200/60 bg-n-0/70 px-3.5 py-1.5 text-[13px] font-medium text-n-700 backdrop-blur-sm">
                  <Globe className="h-3.5 w-3.5 text-lavender-500" />
                  {trip.regions.join(", ")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-n-200/60 bg-n-0/70 px-3.5 py-1.5 text-[13px] font-medium text-n-700 backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5 text-rose-400" />
                  {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
                </span>
                {trip.travelParty && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-n-200/60 bg-n-0/70 px-3.5 py-1.5 text-[13px] font-medium text-n-700 backdrop-blur-sm">
                    <Users className="h-3.5 w-3.5 text-mint-500" />
                    {trip.travelParty}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={`mx-auto px-4 py-5 ${selectedActivity ? "max-w-6xl" : "max-w-3xl lg:max-w-4xl"} transition-all duration-300`}>
          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between">
            {/* Save indicator */}
            <span className="text-[12px] text-n-400">
              {saving ? "Saving..." : saved ? "Saved" : ""}
            </span>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={handleAddTextBlock}
                    className="inline-flex items-center gap-1.5 rounded-full border border-n-200 bg-n-0 px-4 py-2 text-[13px] font-medium text-n-600 shadow-sm transition-all hover:border-lavender-300 hover:text-lavender-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add text
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-lavender-200 bg-lavender-50 px-4 py-2 text-[13px] font-medium text-lavender-500 shadow-sm transition-all hover:bg-lavender-100"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Finalize
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-n-200 bg-n-0 px-4 py-2 text-[13px] font-medium text-n-500 shadow-sm transition-all hover:border-lavender-300 hover:text-lavender-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* Trip title */}
          <div className="mb-2">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                  onBlur={saveTitle}
                  autoFocus
                  className="flex-1 bg-transparent font-heading text-[24px] font-bold text-n-900 outline-none border-b-2 border-lavender-300 lg:text-[28px]"
                />
              </div>
            ) : (
              <h1
                className={`font-heading text-[24px] font-bold text-n-900 lg:text-[28px] ${editing ? "cursor-pointer hover:text-lavender-600 transition-colors" : ""}`}
                onClick={editing ? startEditTitle : undefined}
                title={editing ? "Click to edit title" : undefined}
              >
                {stripMarkdown(itinerary.title)}
                {editing && <Pencil className="ml-2 inline h-4 w-4 text-n-300" />}
              </h1>
            )}
          </div>

          {/* Summary */}
          {itinerary.summary && (
            <p className="mb-6 text-[14px] leading-relaxed text-n-500">
              {stripMarkdown(itinerary.summary)}
            </p>
          )}

          {/* Block stack + detail panel */}
          <div className="flex gap-5">
            <div className={`min-w-0 transition-all duration-300 ${selectedActivity ? "flex-1" : "w-full"}`}>
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={pageBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {pageBlocks.map((block) => (
                    <SortableBlock key={block.id} id={block.id} editing={editing}>
                      {block.type === "day" && itinerary.days[block.dayIndex] ? (
                        <DayCard
                          day={itinerary.days[block.dayIndex]}
                          dayIndex={block.dayIndex}
                          isLastDay={block.dayIndex === itinerary.days.length - 1}
                          onActivityClick={handleActivityClick}
                        />
                      ) : block.type === "text" ? (
                        <TextBlockCard
                          content={(block as PageBlock & { type: "text" }).content}
                          editing={editing}
                          onChange={(c) => handleUpdateTextBlock(block.id, c)}
                          onDelete={() => handleDeleteTextBlock(block.id)}
                        />
                      ) : null}
                    </SortableBlock>
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Desktop detail panel */}
            {selectedActivity && (
              <div className="hidden w-[380px] shrink-0 lg:block sticky top-6 self-start h-[calc(100vh-48px)]">
                <ActivityDetailInline
                  activity={selectedActivity.activity}
                  dayIndex={selectedActivity.dayIndex}
                  actIndex={selectedActivity.actIndex}
                  onUpdate={handleUpdateActivity}
                  onDelete={handleDeleteActivity}
                  onClose={() => setSelectedActivity(null)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile bottom sheet */}
        {selectedActivity && (
          <div className="fixed inset-0 z-40 flex items-end lg:hidden">
            <div className="absolute inset-0 bg-n-900/20 backdrop-blur-[2px]" onClick={() => setSelectedActivity(null)} />
            <div className="relative w-full max-h-[80vh] rounded-t-[24px] border-t border-n-200 bg-n-0 shadow-2xl overflow-hidden">
              <ActivityDetailInline
                activity={selectedActivity.activity}
                dayIndex={selectedActivity.dayIndex}
                actIndex={selectedActivity.actIndex}
                onUpdate={handleUpdateActivity}
                onDelete={handleDeleteActivity}
                onClose={() => setSelectedActivity(null)}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-2 text-center lg:max-w-4xl">
          <p className="text-[13px] text-n-400">
            Created with{" "}
            <a href="/" className="font-medium text-lavender-500 hover:text-lavender-600">Deriv&eacute;</a>
            {" "}&mdash; AI-powered travel planning
          </p>
          <a href="/" className="mt-4 inline-block rounded-full bg-brand-gradient-light px-6 py-2.5 text-[14px] font-semibold text-white shadow-md transition-shadow hover:shadow-lg">
            Plan your own trip
          </a>
        </div>

        {/* Chat widget */}
        <ShareChatWidget itinerary={itinerary} />
      </div>
    </TripWorkspaceContext.Provider>
  );
}

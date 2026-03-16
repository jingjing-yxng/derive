"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Send,
  Plane,
  Utensils,
  TreePine,
  Hotel,
  Coffee,
  GripVertical,
} from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import { useTranslation } from "@/lib/i18n/context";

/* ── Types ── */
type Tag = { name: string; cat: string; id: string };
type DayData = { day: number; title: string; tags: Tag[] };

/* ── Itinerary data ── */
const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-rose-50 text-rose-600 border-rose-200",
  activity: "bg-mint-50 text-mint-600 border-mint-200",
  transport: "bg-sky-50 text-sky-600 border-sky-200",
  accommodation: "bg-lavender-50 text-lavender-600 border-lavender-200",
  "free-time": "bg-amber-50 text-amber-600 border-amber-200",
};

const CATEGORY_ICONS: Record<string, typeof Plane> = {
  food: Utensils,
  activity: TreePine,
  transport: Plane,
  accommodation: Hotel,
  "free-time": Coffee,
};

/* ── Bold markdown helper ── */
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <Image
        src="/logo.png"
        alt="Derivé"
        width={30}
        height={30}
        className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
      />
      <div className="rounded-[24px_24px_24px_12px] bg-n-100 px-[18px] py-3.5">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot inline-block h-2 w-2 rounded-full bg-n-400"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Cursor icon ── */
function CursorIcon({ x, y, pressed }: { x: number; y: number; pressed: boolean }) {
  return (
    <svg
      className="pointer-events-none absolute z-30 transition-all duration-500 ease-out"
      style={{
        left: x,
        top: y,
        width: 22,
        height: 28,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
        transform: pressed ? "scale(0.9)" : "scale(1)",
      }}
      viewBox="0 0 24 28"
      fill="none"
    >
      <path
        d="M5 2l14 10.5L12 15l-2.5 8L5 2z"
        fill="white"
        stroke="#2E2F40"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Floating ghost tag shown while dragging ── */
function GhostTag({ x, y, tag, visible }: { x: number; y: number; tag: Tag | null; visible: boolean }) {
  if (!tag || !visible) return null;
  const Icon = CATEGORY_ICONS[tag.cat] ?? TreePine;
  return (
    <span
      className={`pointer-events-none absolute z-20 inline-flex items-center gap-1.5 rounded-full border px-[13px] py-[5px] text-[13px] font-medium shadow-lg transition-opacity duration-200 ${
        CATEGORY_COLORS[tag.cat]
      }`}
      style={{
        left: x - 60,
        top: y - 14,
        opacity: 0.9,
      }}
    >
      <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {tag.name}
    </span>
  );
}

export default function DemoWorkspace() {
  const { t } = useTranslation();

  const MESSAGES: { role: "user" | "ai"; text: string }[] = [
    { role: "user", text: t("demo.userMsg1") },
    { role: "ai", text: t("demo.aiMsg1") },
    { role: "user", text: t("demo.userMsg2") },
    { role: "ai", text: t("demo.aiMsg2") },
  ];

  const INITIAL_DAYS: DayData[] = [
    {
      day: 1,
      title: t("demo.day1Title"),
      tags: [
        { name: t("demo.kansaiAirport"), cat: "transport", id: "t1" },
        { name: t("demo.nishikiMarket"), cat: "food", id: "t2" },
        { name: t("demo.pontochoAlley"), cat: "activity", id: "t3" },
        { name: t("demo.ryokanStay"), cat: "accommodation", id: "t4" },
      ],
    },
    {
      day: 2,
      title: t("demo.day2Title"),
      tags: [
        { name: t("demo.fushimiInari"), cat: "activity", id: "t5" },
        { name: t("demo.matchaAtTsujiri"), cat: "food", id: "t6" },
        { name: t("demo.kinkakuji"), cat: "activity", id: "t7" },
        { name: t("demo.kaisekiDinner"), cat: "food", id: "t8" },
      ],
    },
    {
      day: 3,
      title: t("demo.day3Title"),
      tags: [
        { name: t("demo.shinkansen"), cat: "transport", id: "t9" },
        { name: t("demo.shibuyaCrossing"), cat: "activity", id: "t10" },
        { name: t("demo.omakaseDinner"), cat: "food", id: "t11" },
        { name: t("demo.goldenGai"), cat: "free-time", id: "t12" },
      ],
    },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [days, setDays] = useState<DayData[]>(INITIAL_DAYS);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [showTyping, setShowTyping] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(0);

  // Cursor animation state
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [cursorPressed, setCursorPressed] = useState(false);
  const [ghostTag, setGhostTag] = useState<Tag | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [hiddenTagId, setHiddenTagId] = useState<string | null>(null);

  // runId counter to trigger/cancel animation reruns
  const [runId, setRunId] = useState(0);
  const messagesReady = useRef(false);

  // Refs for tag elements and day rows
  const tagRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const dayRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const resetState = useCallback(() => {
    setDays(INITIAL_DAYS.map((d) => ({ ...d, tags: [...d.tags] })));
    setDropTarget(null);
    setShowTyping(false);
    setVisibleMessages(0);
    setCursorPos({ x: 0, y: 0 });
    setShowCursor(false);
    setCursorPressed(false);
    setGhostTag(null);
    setShowGhost(false);
    setHiddenTagId(null);
    messagesReady.current = false;
  }, [t]);

  // Observer: keep alive, reset on leave, replay on re-enter
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          resetState();
          setVisible(true);
          setRunId((id) => id + 1);
        } else {
          setVisible(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [resetState]);

  // Typewriter effect: reveal messages one at a time with typing indicator
  useEffect(() => {
    if (!visible) return;
    if (visibleMessages >= MESSAGES.length) {
      const timer = setTimeout(() => {
        setShowTyping(true);
        messagesReady.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
    const delay = visibleMessages === 0 ? 400 : 800;
    if (MESSAGES[visibleMessages]?.role === "ai" && visibleMessages > 0) {
      setShowTyping(true);
      const timer = setTimeout(() => {
        setShowTyping(false);
        setVisibleMessages((v) => v + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setVisibleMessages((v) => v + 1), delay);
    return () => clearTimeout(timer);
  }, [visible, visibleMessages, t]);

  // Helper: get position relative to content container
  const getRelPos = useCallback((el: HTMLElement) => {
    const cr = contentRef.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 + 4 };
  }, []);

  // Cursor drag animation — re-runs whenever runId changes
  useEffect(() => {
    if (!visible || runId === 0) return;

    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      // Wait for messages to finish
      while (!messagesReady.current && !cancelled) {
        await delay(200);
      }
      await delay(2000);
      if (cancelled) return;

      const content = contentRef.current;
      if (!content) return;

      // === Animation 1: Drag "Omakase Dinner" (t11) from Day 3 → Day 2 ===
      const sourceTag = tagRefs.current["t11"];
      const targetRow = dayRowRefs.current[1];
      if (!sourceTag || !targetRow) return;

      const cr = content.getBoundingClientRect();
      setCursorPos({ x: cr.width * 0.75, y: cr.height * 0.5 });
      setShowCursor(true);
      await delay(300);
      if (cancelled) return;

      let srcPos = getRelPos(sourceTag);
      setCursorPos(srcPos);
      await delay(600);
      if (cancelled) return;

      setCursorPressed(true);
      await delay(200);
      const omakaseTag: Tag = { name: t("demo.omakaseDinner"), cat: "food", id: "t11" };
      setGhostTag(omakaseTag);
      setShowGhost(true);
      setHiddenTagId("t11");
      await delay(200);
      if (cancelled) return;

      setDropTarget(1);

      const targetPos = getRelPos(targetRow);
      const targetX = targetPos.x + 40;
      const targetY = targetPos.y;
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        if (cancelled) return;
        const frac = i / steps;
        const eased = 1 - (1 - frac) * (1 - frac);
        const x = srcPos.x + (targetX - srcPos.x) * eased;
        const y = srcPos.y + (targetY - srcPos.y) * eased;
        setCursorPos({ x, y });
        await delay(25);
      }

      await delay(200);
      if (cancelled) return;

      setCursorPressed(false);
      setShowGhost(false);
      setGhostTag(null);
      setHiddenTagId(null);
      setDropTarget(null);

      setDays((prev) => {
        const next = prev.map((d) => ({ ...d, tags: [...d.tags] }));
        const tagIdx = next[2].tags.findIndex((tg) => tg.id === "t11");
        if (tagIdx === -1) return prev;
        const [tag] = next[2].tags.splice(tagIdx, 1);
        next[1].tags.push(tag);
        return next;
      });

      await delay(800);
      if (cancelled) return;

      // === Animation 2: Drag "Kaiseki Dinner" (t8) from Day 2 → Day 3 ===
      const sourceTag2 = tagRefs.current["t8"];
      const targetRow2 = dayRowRefs.current[2];
      if (!sourceTag2 || !targetRow2) return;

      let srcPos2 = getRelPos(sourceTag2);
      setCursorPos(srcPos2);
      await delay(600);
      if (cancelled) return;

      setCursorPressed(true);
      await delay(200);
      const kaisekiTag: Tag = { name: t("demo.kaisekiDinner"), cat: "food", id: "t8" };
      setGhostTag(kaisekiTag);
      setShowGhost(true);
      setHiddenTagId("t8");
      await delay(200);
      if (cancelled) return;

      setDropTarget(2);

      srcPos2 = getRelPos(sourceTag2);
      const targetPos2 = getRelPos(targetRow2);
      const targetX2 = targetPos2.x + 40;
      const targetY2 = targetPos2.y;
      for (let i = 0; i <= steps; i++) {
        if (cancelled) return;
        const frac = i / steps;
        const eased = 1 - (1 - frac) * (1 - frac);
        const x = srcPos2.x + (targetX2 - srcPos2.x) * eased;
        const y = srcPos2.y + (targetY2 - srcPos2.y) * eased;
        setCursorPos({ x, y });
        await delay(25);
      }

      await delay(200);
      if (cancelled) return;

      setCursorPressed(false);
      setShowGhost(false);
      setGhostTag(null);
      setHiddenTagId(null);
      setDropTarget(null);

      setDays((prev) => {
        const next = prev.map((d) => ({ ...d, tags: [...d.tags] }));
        const tagIdx = next[1].tags.findIndex((tg) => tg.id === "t8");
        if (tagIdx === -1) return prev;
        const [tag] = next[1].tags.splice(tagIdx, 1);
        next[2].tags.push(tag);
        return next;
      });

      await delay(500);
      if (cancelled) return;

      setShowCursor(false);
    }

    run();
    return () => { cancelled = true; };
  }, [runId, t]);

  return (
    <div ref={ref}>
      <BrowserFrame label="derive-app.vercel.app/trip/kyoto-tokyo">
        <div ref={contentRef} className="relative flex flex-col lg:flex-row" style={{ minHeight: 420 }}>
          {showCursor && (
            <CursorIcon x={cursorPos.x} y={cursorPos.y} pressed={cursorPressed} />
          )}
          <GhostTag x={cursorPos.x} y={cursorPos.y} tag={ghostTag} visible={showGhost} />

          {/* ── Left: Chat (hidden on mobile) ── */}
          <div className="hidden lg:flex w-[45%] flex-col border-r border-n-200">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {MESSAGES.slice(0, visibleMessages).map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[72%] rounded-[24px_24px_12px_24px] bg-gradient-to-br from-lavender-400 to-lavender-500 px-[18px] py-3.5 text-[15px] leading-[1.55] text-white shadow-[0_4px_20px_#7B82C730] stagger-child">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2">
                    <Image
                      src="/logo.png"
                      alt="Derivé"
                      width={30}
                      height={30}
                      className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
                    />
                    <div className="max-w-[90%] rounded-[24px_24px_24px_12px] bg-n-100 px-[18px] py-3.5 text-[15px] leading-[1.55] text-n-900 stagger-child">
                      {renderBold(m.text)}
                    </div>
                  </div>
                )
              )}
              {showTyping && visibleMessages < MESSAGES.length && (
                <TypingIndicator />
              )}
              {showTyping && visibleMessages >= MESSAGES.length && (
                <TypingIndicator />
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-n-100 p-3">
              <div className="flex items-center gap-2 rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 py-2">
                <span className="flex-1 text-[15px] text-n-400">
                  {t("demo.chatPlaceholder")}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lavender-400 text-white">
                  <Send className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Itinerary ── */}
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <h3 className="font-heading text-[22px] font-bold text-n-900">
              {t("demo.itineraryTitle")}
            </h3>
            <p className="mt-1 text-[14px] text-n-500">
              {t("demo.itinerarySubtitle")}
            </p>
            <p className="mt-2 text-[12px] text-n-400 italic">
              {t("demo.dragHint")}
            </p>

            <div className="mt-4 space-y-3">
              {days.map((day, di) => (
                <div
                  key={day.day}
                  ref={(el) => { dayRowRefs.current[di] = el; }}
                  className={`flex items-center gap-4 rounded-[20px] border border-n-200 bg-n-0 px-4 py-3 transition-colors ${
                    visible ? "stagger-child" : "opacity-0"
                  } ${dropTarget === di ? "drop-target" : ""}`}
                  style={
                    visible
                      ? { animationDelay: `${di * 200}ms` }
                      : undefined
                  }
                >
                  {/* Day badge */}
                  <div className="flex shrink-0 flex-col items-center gap-1 w-[110px]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-[12px] font-bold text-white">
                      {day.day}
                    </span>
                    <span className="font-heading text-[13px] font-semibold text-n-900 whitespace-nowrap">
                      {day.title}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-1 flex-wrap items-center gap-2 min-h-[36px]">
                    {day.tags.map((tag, ti) => {
                      const Icon = CATEGORY_ICONS[tag.cat] ?? TreePine;
                      const isHidden = hiddenTagId === tag.id;
                      return (
                        <span
                          key={tag.id}
                          ref={(el) => { tagRefs.current[tag.id] = el; }}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-[13px] py-[5px] text-[13px] font-medium shadow-sm transition-all ${
                            CATEGORY_COLORS[tag.cat]
                          } ${visible ? "stagger-child" : "opacity-0"}`}
                          style={{
                            ...(visible
                              ? {
                                  animationDelay: `${di * 200 + ti * 80 + 200}ms`,
                                }
                              : undefined),
                            opacity: isHidden ? 0.25 : undefined,
                          }}
                        >
                          <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

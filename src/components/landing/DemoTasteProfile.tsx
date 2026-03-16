"use client";

import { useRef, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import BrowserFrame from "./BrowserFrame";
import { useTranslation } from "@/lib/i18n/context";

const MINI_CARDS = [
  { gradient: "linear-gradient(135deg, #F4B8C0, #FADCE0, #ED95A1, #F4B8C0)", aspect: "aspect-[3/4]", dur: 7 },
  { gradient: "linear-gradient(135deg, #C5C2E5, #E2E0F2, #A8A4D8, #C5C2E5)", aspect: "aspect-[4/5]", dur: 8.5 },
  { gradient: "linear-gradient(135deg, #A8DBBE, #D0EDDE, #7EC4A0, #A8DBBE)", aspect: "aspect-[5/6]", dur: 7.5 },
  { gradient: "linear-gradient(135deg, #FFDF8A, #FFEFC4, #F5CB5C, #FFDF8A)", aspect: "aspect-square", dur: 9 },
];

const DRAG_SLIDER = 0;
const DRAG_FROM = 3;
const DRAG_TO = 7; // was SLIDERS[DRAG_SLIDER].value, hardcoded since SLIDERS moved inside component

const TAG_DESELECT_INDEX = 5; // "omakase" is index 5 in the TAGS array
const TAG_SELECT_INDEX = 12; // "artisan" is index 12 in the TAGS array
const INITIAL_SELECTED_INDICES = new Set([0, 3, 5, 7, 9, 11]); // wabi-sabi, temple aesthetic, omakase, matcha, contemplative, photogenic

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

export default function DemoTasteProfile() {
  const { t } = useTranslation();

  const SLIDERS = [
    { label: t("demo.adventure"), value: 7, color: "#7B82C7", low: t("demo.comfort"), high: t("demo.thrills") },
    { label: t("demo.nature"), value: 8, color: "#E0949D", low: t("demo.urban"), high: t("demo.outdoors") },
    { label: t("demo.activity"), value: 6, color: "#5DB888", low: t("demo.relaxed"), high: t("demo.packed") },
    { label: t("demo.luxury"), value: 5, color: "#E4B840", low: t("demo.budgetLow"), high: t("demo.splurge") },
    { label: t("demo.cultural"), value: 9, color: "#5C9AC5", low: t("demo.mainstream"), high: t("demo.deep") },
    { label: t("demo.social"), value: 4, color: "#A8A4D8", low: t("demo.solo"), high: t("demo.socialHigh") },
  ];

  const TAGS = [
    t("demo.wabiSabi"), t("demo.zenMinimalism"), t("demo.neonUrban"), t("demo.templeAesthetic"), t("demo.ryokanChic"),
    t("demo.omakaseTag"), t("demo.izakayaTag"), t("demo.matchaTag"), t("demo.ramenTag"),
    t("demo.contemplative"), t("demo.offBeatenPath"), t("demo.photogenic"), t("demo.artisan"),
  ];

  const BUDGET_OPTIONS = [t("demo.budgetLow"), t("tasteProfile.moderate"), t("tasteProfile.luxury"), t("tasteProfile.ultraLuxury")];

  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const tagDeselectRef = useRef<HTMLSpanElement>(null);
  const tagSelectRef = useRef<HTMLSpanElement>(null);
  const budgetUltraRef = useRef<HTMLSpanElement>(null);

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [sliderValue, setSliderValue] = useState(DRAG_FROM);
  const [isDragging, setIsDragging] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState(new Set(INITIAL_SELECTED_INDICES));
  const [selectedBudget, setSelectedBudget] = useState(2); // index 2 = "luxury"

  // Use a counter to trigger/cancel animation runs
  const [runId, setRunId] = useState(0);
  const [visible, setVisible] = useState(false);

  const resetState = () => {
    setShowCursor(false);
    setButtonPressed(false);
    setShowProfile(false);
    setSliderValue(DRAG_FROM);
    setIsDragging(false);
    setShowTags(false);
    setSelectedTags(new Set(INITIAL_SELECTED_INDICES));
    setSelectedBudget(2);
    setCursorPos({ x: 0, y: 0 });
  };

  const getRelPos = (el: HTMLElement) => {
    const cr = contentRef.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 + 4 };
  };

  // Observer: keep alive, toggle visible on enter/leave
  useEffect(() => {
    const el = sectionRef.current;
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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animation effect — re-runs whenever runId changes
  useEffect(() => {
    if (!visible || runId === 0) return;

    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function run() {
      await delay(600);
      if (cancelled) return;

      setShowCursor(true);
      const content = contentRef.current;
      const btn = buttonRef.current;
      if (!content || !btn) return;

      const cr = content.getBoundingClientRect();
      setCursorPos({ x: cr.width / 2, y: cr.height / 2 });
      await delay(100);

      const btnPos = getRelPos(btn);
      setCursorPos(btnPos);
      await delay(700);
      if (cancelled) return;

      setButtonPressed(true);
      await delay(200);
      setButtonPressed(false);
      await delay(300);
      if (cancelled) return;

      setShowProfile(true);
      await delay(600);
      if (cancelled) return;

      setShowTags(true);
      await delay(800);
      if (cancelled) return;

      // === Drag slider ===
      setIsDragging(true);
      const track = sliderTrackRef.current;
      if (!track) return;

      const getTrack = () => {
        const tr = track.getBoundingClientRect();
        const c = content.getBoundingClientRect();
        return { left: tr.left - c.left, width: tr.width, y: tr.top - c.top + tr.height / 2 + 4 };
      };

      let t = getTrack();
      setCursorPos({ x: t.left + t.width * (DRAG_FROM / 10), y: t.y });
      await delay(500);
      if (cancelled) return;

      const steps = 25;
      for (let i = 0; i <= steps; i++) {
        if (cancelled) return;
        const frac = i / steps;
        const eased = 1 - (1 - frac) * (1 - frac);
        const pctNow = (DRAG_FROM + (DRAG_TO - DRAG_FROM) * eased) / 10;
        t = getTrack();
        setCursorPos({ x: t.left + t.width * pctNow, y: t.y });
        setSliderValue(Math.round(DRAG_FROM + (DRAG_TO - DRAG_FROM) * eased));
        await delay(35);
      }

      await delay(400);
      setIsDragging(false);
      if (cancelled) return;

      // === Deselect "omakase" ===
      const deselectEl = tagDeselectRef.current;
      if (deselectEl) {
        const pos = getRelPos(deselectEl);
        setCursorPos(pos);
        await delay(500);
        if (cancelled) return;
        setButtonPressed(true);
        await delay(150);
        setSelectedTags((prev) => {
          const next = new Set(prev);
          next.delete(TAG_DESELECT_INDEX);
          return next;
        });
        setButtonPressed(false);
        await delay(400);
        if (cancelled) return;
      }

      // === Select "artisan" ===
      const selectEl = tagSelectRef.current;
      if (selectEl) {
        const pos = getRelPos(selectEl);
        setCursorPos(pos);
        await delay(500);
        if (cancelled) return;
        setButtonPressed(true);
        await delay(150);
        setSelectedTags((prev) => new Set([...prev, TAG_SELECT_INDEX]));
        setButtonPressed(false);
        await delay(400);
        if (cancelled) return;
      }

      // === Click "ultra-luxury" ===
      const ultraEl = budgetUltraRef.current;
      if (ultraEl) {
        const pos = getRelPos(ultraEl);
        setCursorPos(pos);
        await delay(500);
        if (cancelled) return;
        setButtonPressed(true);
        await delay(150);
        setSelectedBudget(3);
        setButtonPressed(false);
        await delay(400);
        if (cancelled) return;
      }

      await delay(300);
      setShowCursor(false);
    }

    run();
    return () => { cancelled = true; };
  }, [runId]);

  return (
    <div ref={sectionRef}>
      <BrowserFrame label="derive-app.vercel.app/profile">
        <div ref={contentRef} className="relative p-4 lg:p-6 overflow-hidden" style={{ minHeight: 380 }}>
          {showCursor && (
            <CursorIcon x={cursorPos.x} y={cursorPos.y} pressed={buttonPressed} />
          )}

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left: Mood board + Generate button */}
            <div className="lg:w-[38%] shrink-0">
              <h3 className="font-heading text-[18px] font-semibold text-n-900">
                {t("demo.yourMoodBoard")}
              </h3>
              <div className="mt-3 columns-2 gap-2">
                {MINI_CARDS.map((card, i) => (
                  <div
                    key={i}
                    className={`ombre-card mb-2 break-inside-avoid rounded-[16px] ${card.aspect}`}
                    style={{
                      backgroundImage: card.gradient,
                      "--ombre-duration": `${card.dur}s`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
              <button
                ref={buttonRef}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[15px] font-semibold transition-all duration-200 ${
                  buttonPressed && !showProfile
                    ? "bg-lavender-500 text-white scale-95 shadow-lg"
                    : showProfile
                    ? "bg-lavender-200 text-lavender-600 opacity-60"
                    : "bg-lavender-400 text-white shadow-md"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {showProfile ? t("demo.profileGenerated") : t("demo.generateMyProfile")}
              </button>
            </div>

            {/* Right: Profile card */}
            <div
              className={`flex-1 rounded-[32px] border border-n-200 bg-n-0 p-6 transition-all duration-500 ${
                showProfile
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4 pointer-events-none"
              }`}
            >
              <div className="space-y-4">
                {SLIDERS.map((s, i) => {
                  const val = i === DRAG_SLIDER ? sliderValue : s.value;
                  const pct = val * 10;
                  const draggingThis = isDragging && i === DRAG_SLIDER;

                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold uppercase tracking-[1px] text-n-500">
                          {s.label}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: s.color }}>
                          {val}/10
                        </span>
                      </div>
                      <div
                        ref={i === DRAG_SLIDER ? sliderTrackRef : undefined}
                        className="relative mt-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: `${s.color}18` }}
                      >
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
                          style={{ backgroundColor: s.color, width: `${pct}%` }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-[left] duration-75"
                          style={{
                            left: `${pct}%`,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            backgroundColor: s.color,
                            border: "2px solid white",
                            boxShadow: draggingThis
                              ? `0 0 0 4px ${s.color}30, 0 2px 8px rgba(46,47,64,0.15)`
                              : "0 2px 8px rgba(46,47,64,0.15)",
                            zIndex: 2,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-n-400">
                        <span>{s.low}</span>
                        <span>{s.high}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tags */}
              <div
                className={`mt-5 border-t border-n-100 pt-5 transition-all duration-500 ${
                  showTags ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((tag, i) => (
                    <span
                      key={i}
                      ref={
                        i === TAG_DESELECT_INDEX
                          ? tagDeselectRef
                          : i === TAG_SELECT_INDEX
                          ? tagSelectRef
                          : undefined
                      }
                      className={`rounded-full px-3.5 py-[6px] text-[13px] font-medium transition-all duration-200 ${
                        selectedTags.has(i)
                          ? "bg-lavender-100 text-lavender-700 border border-lavender-300"
                          : "bg-n-100 text-n-800 border border-transparent"
                      } ${showTags ? "stagger-child" : "opacity-0"}`}
                      style={showTags ? { animationDelay: `${i * 60}ms` } : undefined}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map((b, bi) => (
                    <span
                      key={bi}
                      ref={bi === 3 ? budgetUltraRef : undefined}
                      className={`rounded-full px-3.5 py-[6px] text-[13px] font-medium capitalize transition-all duration-200 ${
                        bi === selectedBudget
                          ? "bg-amber-400 text-white shadow-sm"
                          : "bg-n-100 text-n-600"
                      }`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

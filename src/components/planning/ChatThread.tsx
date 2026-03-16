"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Send, Square, Map, ChevronDown, MapPin, Calendar, Users, FileText } from "lucide-react";
import { parseAIResponse } from "@/lib/extract-json";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SuggestionTag } from "./SuggestionTag";
import { SuggestionCard } from "./SuggestionCard";
import type { Activity, DayPlan } from "@/types/trip";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatThreadProps {
  messages: Message[];
  onSubmit: (text: string) => void;
  isLoading: boolean;
  onStop?: () => void;
  onAddSuggestionToIdeas?: (suggestion: Omit<Activity, "id">) => void;
  onAddSuggestionToItinerary?: (suggestion: Omit<Activity, "id">) => void;
  itineraryDays?: DayPlan[];
  onSwitchToItinerary?: () => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyInlineFormatting(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
}

function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");

    // Check if this block is a list (lines starting with - or *)
    const listItems = lines.filter((l) => /^\s*[-*]\s+/.test(l));
    if (listItems.length > 0 && listItems.length >= lines.filter((l) => l.trim()).length * 0.5) {
      // Render as a list, with any non-list lines as a preceding paragraph
      const parts: React.ReactNode[] = [];
      let currentItems: string[] = [];
      let preamble = "";

      for (const line of lines) {
        const listMatch = line.match(/^\s*[-*]\s+(.*)/);
        if (listMatch) {
          currentItems.push(listMatch[1]);
        } else if (line.trim() && currentItems.length === 0) {
          preamble += (preamble ? "<br/>" : "") + applyInlineFormatting(line);
        }
      }

      if (preamble) {
        parts.push(
          <p key={`${i}-p`} dangerouslySetInnerHTML={{ __html: preamble }} />
        );
      }
      if (currentItems.length > 0) {
        parts.push(
          <ul key={`${i}-ul`} className="my-1 space-y-1 pl-4">
            {currentItems.map((item, j) => (
              <li
                key={j}
                className="relative pl-3 before:absolute before:left-0 before:top-[0.55em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-current before:opacity-35"
                dangerouslySetInnerHTML={{ __html: applyInlineFormatting(item) }}
              />
            ))}
          </ul>
        );
      }
      return <div key={i}>{parts}</div>;
    }

    // Regular paragraph
    const html = lines.map((l) => applyInlineFormatting(l)).join("<br/>");
    return (
      <p
        key={i}
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });
}

/** Detect and parse the auto-generated trip brief message */
function parseTripBrief(content: string): { dates: string; regions: string; party: string; description: string } | null {
  if (!content.startsWith("I'm planning a trip")) return null;
  const dates = content.match(/Dates:\s*(.+)/)?.[1] ?? "";
  const regions = content.match(/Regions:\s*(.+)/)?.[1] ?? "";
  const party = content.match(/Travel party:\s*(.+)/)?.[1] ?? "";
  const desc = content.match(/Description:\s*([\s\S]+?)$/m)?.[1]?.trim() ?? "";
  return { dates, regions, party, description: desc };
}

function TripBriefCallout({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const brief = parseTripBrief(content);
  if (!brief) return null;

  const items = [
    { icon: Calendar, label: brief.dates },
    { icon: MapPin, label: brief.regions },
    { icon: Users, label: brief.party },
  ].filter((item) => item.label && item.label !== "Not specified");

  return (
    <div className="mx-auto w-full max-w-[90%]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-[16px] border border-n-200 bg-n-50 px-4 py-2.5 text-left transition-colors hover:bg-n-100"
      >
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-n-500">
          {items.map(({ icon: Icon, label }, i) => (
            <span key={i} className="flex items-center gap-1">
              <Icon className="h-3.5 w-3.5 text-n-400" />
              {label}
            </span>
          ))}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-n-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && brief.description && brief.description !== "No specific requirements" && (
        <div className="mt-1.5 rounded-[14px] border border-n-200 bg-n-0 px-4 py-3">
          <div className="flex items-start gap-2 text-[13px] text-n-600">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-n-400" />
            <p className="leading-relaxed">{brief.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getQuickChips(messages: Message[]): string[] {
  if (messages.length === 0) return [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  if (!lastAssistant) return [];

  const content = lastAssistant.content.toLowerCase();
  const chips: string[] = [];

  if (content.includes("recommend") || content.includes("suggestion") || content.includes("option")) {
    chips.push("More like this", "Something different", "More budget-friendly");
  }
  if (content.includes("itinerary") || content.includes("day ")) {
    chips.push("Add more activities", "Make it more relaxed", "Add evening plans");
  }
  if (content.includes("restaurant") || content.includes("food") || content.includes("dining")) {
    chips.push("More food options", "Local street food", "Fine dining alternatives");
  }
  if (content.includes("hotel") || content.includes("stay") || content.includes("accommodation")) {
    chips.push("Boutique hotels", "Budget options", "Unique stays");
  }

  if (chips.length === 0) {
    chips.push("Tell me more", "Something different", "More budget-friendly", "Off the beaten path");
  }

  return chips.slice(0, 4);
}

export function ChatThread({
  messages,
  onSubmit,
  isLoading,
  onStop,
  onAddSuggestionToIdeas,
  onAddSuggestionToItinerary,
  itineraryDays,
  onSwitchToItinerary,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  // Streaming progress based on last assistant message content length
  const chatProgress = useMemo(() => {
    if (!isLoading) return 0;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return 2;
    const len = lastAssistant.content.length;
    const raw = Math.min(len / 5000, 0.95);
    return Math.round(raw * 100);
  }, [isLoading, messages]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track if user is near the bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = distFromBottom < 100;
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll: snap to bottom instantly (no smooth animation fighting user scroll)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input);
      setInput("");
    }
  };

  const quickChips = !isLoading ? getQuickChips(messages) : [];

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollContainerRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, msgIndex) => {
          // Render auto-generated trip brief as a compact callout
          if (msgIndex === 0 && msg.role === "user" && parseTripBrief(msg.content)) {
            return (
              <div key={msg.id}>
                <TripBriefCallout content={msg.content} />
              </div>
            );
          }

          const parsed = msg.role === "assistant"
            ? parseAIResponse(msg.content)
            : null;
          const text = parsed ? parsed.text : msg.content;
          const suggestions = parsed?.suggestions || [];
          const actions = parsed?.actions || [];
          const hasItinerary = parsed?.hasItinerary || false;

          return (
            <div key={msg.id}>
              <div
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <img src="/logo.png" alt="Derivé" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                )}
                <div
                  className={`text-[13px] leading-[1.5] ${
                    msg.role === "user"
                      ? "max-w-[80%] rounded-[18px_18px_8px_18px] bg-gradient-to-br from-lavender-400 to-lavender-500 px-3.5 py-2.5 text-white shadow-[0_4px_20px_#7B82C730]"
                      : "max-w-[92%] rounded-[18px_18px_18px_8px] bg-n-100 px-3.5 py-2.5 text-n-900"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-2">
                      {renderMarkdown(text)}

                      {/* Itinerary updated confirmation */}
                      {(hasItinerary || actions.length > 0) && (
                        <div className="mt-2 flex items-center gap-2 rounded-[20px] border border-mint-200 bg-mint-50 px-4 py-3 text-[13px] font-medium text-mint-600">
                          <Map className="h-4 w-4" />
                          Itinerary updated
                        </div>
                      )}

                      {/* Inline suggestion tags */}
                      {suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {suggestions.map((s, i) => (
                            <SuggestionTag
                              key={i}
                              suggestion={s}
                              onAddToIdeas={() => onAddSuggestionToIdeas?.(s)}
                            />
                          ))}
                        </div>
                      )}

                      {/* Rich suggestion cards for bigger proposals */}
                      {suggestions.length > 0 && suggestions.some((s) => s.description && s.description.length > 30) && (
                        <div className="mt-3 space-y-2">
                          {suggestions
                            .filter((s) => s.description && s.description.length > 30)
                            .map((s, i) => (
                              <SuggestionCard
                                key={i}
                                suggestion={s}
                                days={itineraryDays}
                                onAddToItinerary={() => onAddSuggestionToItinerary?.(s)}
                                onAddToIdeas={() => onAddSuggestionToIdeas?.(s)}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (() => {
          // Hide loading bubble if the last message is already a streaming assistant message with content
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.role === "assistant" && lastMsg.content.length > 0) return null;
          return (
            <div className="flex gap-3">
              <img src="/logo.png" alt="Derivé" className="h-6 w-6 shrink-0 rounded-full object-cover" />
              <div className="w-48 rounded-[18px_18px_18px_8px] bg-n-100 px-[18px] py-3.5">
                <ProgressBar progress={chatProgress} showLabel={false} />
              </div>
            </div>
          );
        })()}

        {/* Quick-reaction chips */}
        {quickChips.length > 0 && !isLoading && messages.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-11">
            {quickChips.map((chip) => (
              <button
                key={chip}
                onClick={() => onSubmit(chip)}
                className="rounded-full border-[1.5px] border-lavender-400/19 bg-lavender-400/8 px-3.5 py-1.5 text-[13px] font-medium text-lavender-400 transition-colors hover:bg-lavender-400/15"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-n-200 p-4">
        <div className="flex items-end gap-2 rounded-[20px] border-[1.5px] border-n-300 bg-n-0 px-4 py-2 focus-within:ring-2 focus-within:ring-lavender-400/40 focus-within:border-lavender-400 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = textareaRef.current;
              if (el) {
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 150) + "px";
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  onSubmit(input);
                  setInput("");
                  if (textareaRef.current) textareaRef.current.style.height = "auto";
                }
              }
            }}
            placeholder="Ask about your trip..."
            rows={1}
            className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base text-n-900 placeholder:text-n-400 outline-none"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-n-600 text-white transition-colors hover:bg-n-700"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender-400 text-white transition-colors hover:bg-lavender-500 disabled:opacity-45 disabled:pointer-events-none"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

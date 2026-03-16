"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Square } from "lucide-react";
import type { Itinerary } from "@/types/trip";
import Image from "next/image";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ShareChatWidgetProps {
  itinerary: Itinerary;
}

/** Render markdown bold/italic/lists in chat messages */
function renderChatMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    const lines = block.split("\n");

    // Check if block is a list
    const listItems = lines.filter((l) => /^\s*[-*]\s+/.test(l));
    if (listItems.length > 0 && listItems.length >= lines.filter((l) => l.trim()).length * 0.5) {
      const items = lines
        .map((l) => l.match(/^\s*[-*]\s+(.*)/))
        .filter(Boolean)
        .map((m) => m![1]);
      return (
        <ul key={i} className="my-1 space-y-0.5 pl-3.5">
          {items.map((item, j) => (
            <li
              key={j}
              className="relative pl-2.5 before:absolute before:left-0 before:top-[0.55em] before:h-[4px] before:w-[4px] before:rounded-full before:bg-current before:opacity-40"
              dangerouslySetInnerHTML={{ __html: applyInline(item) }}
            />
          ))}
        </ul>
      );
    }

    // Numbered list
    const numbered = lines.filter((l) => /^\s*\d+[.)]\s+/.test(l));
    if (numbered.length > 0 && numbered.length >= lines.filter((l) => l.trim()).length * 0.5) {
      const items = lines
        .map((l) => l.match(/^\s*\d+[.)]\s+(.*)/))
        .filter(Boolean)
        .map((m) => m![1]);
      return (
        <ol key={i} className="my-1 list-decimal space-y-0.5 pl-5">
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: applyInline(item) }} />
          ))}
        </ol>
      );
    }

    // Regular paragraph
    const html = lines.map((l) => applyInline(l)).join("<br/>");
    return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function applyInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ShareChatWidget({ itinerary }: ShareChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreaming(false);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/share-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          itinerary: {
            title: itinerary.title,
            summary: itinerary.summary,
            days: itinerary.days,
          },
          history: messages.slice(-10),
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [input, streaming, messages, itinerary]);

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-[16px] bg-white border border-n-200 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label="Open trip assistant"
        >
          <Image src="/logo.png" alt="Trip Assistant" width={32} height={32} className="rounded-[8px]" />
        </button>
      )}

      {/* Chat panel — full-screen on mobile, floating card on desktop */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-n-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-[24px] sm:border sm:border-n-200 sm:shadow-2xl sm:animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-n-200 px-4 py-3 bg-n-50/60">
            <Image src="/logo.png" alt="Derive" width={28} height={28} className="rounded-[8px]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-n-900">Trip Assistant</p>
              <p className="text-[11px] text-n-400 truncate">Ask anything about this itinerary</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-n-400 hover:bg-n-100 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <Image src="/logo.png" alt="" width={40} height={40} className="rounded-[12px] opacity-40" />
                <p className="text-[13px] text-n-400 max-w-[240px]">
                  Ask me anything about this itinerary — logistics, tips, alternatives, or local insights.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                  {["What should I pack?", "Best restaurants?", "Transport tips?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="rounded-full border border-n-200 bg-n-0 px-3 py-1 text-[11px] text-n-500 hover:bg-lavender-50 hover:text-lavender-500 hover:border-lavender-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
                    msg.role === "user"
                      ? "bg-lavender-500 text-white rounded-br-[6px]"
                      : "bg-n-100 text-n-800 rounded-bl-[6px]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <div className="space-y-1.5">{renderChatMarkdown(msg.content)}</div>
                    ) : (
                      streaming && i === messages.length - 1 && (
                        <Loader2 className="h-4 w-4 animate-spin text-n-400" />
                      )
                    )
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-n-200 px-3 py-2.5 pb-safe">
            <div className="flex items-center gap-2 rounded-[16px] border border-n-200 bg-n-0 px-3 py-1.5 focus-within:border-lavender-400 focus-within:ring-2 focus-within:ring-lavender-400/30 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask about this trip..."
                className="flex-1 bg-transparent text-[13px] text-n-900 outline-none placeholder:text-n-400"
                disabled={streaming}
              />
              {streaming ? (
                <button
                  onClick={cancelStream}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white transition-all hover:bg-rose-600"
                  aria-label="Stop generating"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lavender-500 text-white transition-all hover:bg-lavender-600 disabled:opacity-40 disabled:hover:bg-lavender-500"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

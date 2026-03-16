"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSession } from "@/hooks/use-session";
import { useTranslation } from "@/lib/i18n/context";
import { AppLayout } from "@/components/ui/app-layout";
import { ChatThread } from "@/components/planning/ChatThread";
import { ItineraryView } from "@/components/itinerary/ItineraryView";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, MessageCircle, Map, Bookmark, Share2, Link2, FileText, Copy, Check, Sparkles, RefreshCw, ExternalLink, Square } from "lucide-react";
import { PhotoOrbitLoader } from "@/components/loading/PhotoOrbitLoader";
import { buildTripUserPrompt } from "@/lib/ai/prompts/recommend";
import { buildItineraryFromBookmarks } from "@/lib/ai/prompts/plan";
import { extractJsonBlocks, parseAIResponse } from "@/lib/extract-json";
import { formatDateRange } from "@/lib/dates";
import { EditableRegions, EditableDates, EditableParty } from "@/components/planning/TripBrief";
import { RecommendationCard, getAllFeedback } from "@/components/planning/RecommendationCard";
import { TripWorkspaceContext, type SelectedActivity } from "@/contexts/TripWorkspaceContext";
import { normalizeItinerary } from "@/types/trip";
import { applyActions } from "@/lib/itinerary-actions";
import type { Trip, Itinerary, Recommendation, DayPlan, Activity } from "@/types/trip";

/** Fire-and-forget save of a chat message via server API (avoids client RLS issues) */
function saveChatMessage(tripId: string, role: string, content: string) {
  fetch("/api/chat-messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tripId, role, content }),
  }).catch((e) => console.error("Failed to save chat message:", e));
}

function generateTripTitle(trip: Trip, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (trip.title) return trip.title;
  const regionStr = trip.regions.join(" & ");
  const party = trip.travel_party?.toLowerCase() || "";
  if (party.includes("couple")) return t("tripWorkspace.couplesTrip", { region: regionStr });
  if (party.includes("solo")) return t("tripWorkspace.soloTrip", { region: regionStr });
  if (party.includes("family")) return t("tripWorkspace.familyTrip", { region: regionStr });
  if (party.includes("friend") || party.includes("group")) return t("tripWorkspace.withFriends", { region: regionStr });
  if (party) return `${regionStr} — ${trip.travel_party}`;
  return t("tripWorkspace.tripTo", { region: regionStr });
}

type Tab = "chat" | "itinerary";

export default function TripWorkspacePage() {
  const params = useParams();
  const tripId = params.id as string;
  const { sessionId, ready } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; role: string; content: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!ready) return;
      const supabase = createClient();
      const [tripRes, msgRes] = await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).single(),
        // Load chat messages via server API (uses service role key, avoids RLS issues)
        fetch(`/api/chat-messages?tripId=${encodeURIComponent(tripId)}`).then(async (r) => {
          if (!r.ok) return { data: [], error: `HTTP ${r.status}` };
          const json = await r.json();
          return { data: json.messages || [], error: null };
        }).catch((e) => ({ data: [], error: e })),
      ]);
      if (tripRes.error) console.error("Trip load error:", tripRes.error);
      if (msgRes.error) console.error("Messages load error:", msgRes.error);
      if (tripRes.data) setTrip(tripRes.data);
      setChatHistory(msgRes.data || []);
      setLoading(false);
    }
    load();
  }, [tripId, ready]);

  if (loading || !ready) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!trip) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-n-200 bg-n-0/50 py-16 text-center">
          <p className="text-n-500">{t("tripWorkspace.tripNotFound")}</p>
          <Button onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("tripWorkspace.backToDashboard")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return <TripWorkspace trip={trip} tripId={tripId} sessionId={sessionId} chatHistory={chatHistory} />;
}

const DISCOVER_PHRASES = [
  "Discovering hidden gems...",
  "Wandering off the beaten path...",
  "Asking the locals...",
  "Checking sunset spots...",
  "Finding the best street food...",
  "Scouting photo-worthy corners...",
  "Mapping out the vibes...",
  "Hunting for cozy cafés...",
  "Exploring side streets...",
  "Digging up local secrets...",
];

const GENERATE_PHRASES = [
  "Crafting your perfect day...",
  "Piecing together the puzzle...",
  "Balancing adventure and rest...",
  "Timing the golden hours...",
  "Mapping the best routes...",
  "Weaving in hidden gems...",
  "Fine-tuning the schedule...",
  "Adding the finishing touches...",
  "Making sure you won't miss a thing...",
  "Building something special...",
];

function CyclingLoadingText({ isGenerating }: { isGenerating: boolean }) {
  const phrases = isGenerating ? GENERATE_PHRASES : DISCOVER_PHRASES;
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Start with a random phrase
    setIndex(Math.floor(Math.random() * phrases.length));
  }, [phrases]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % phrases.length);
        setFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [phrases]);

  return (
    <p
      className="text-[13px] font-medium text-n-600 transition-opacity duration-300"
      style={{ opacity: fade ? 1 : 0 }}
    >
      {phrases[index]}
    </p>
  );
}

function TripWorkspace({
  trip,
  tripId,
  sessionId,
  chatHistory,
}: {
  trip: Trip;
  tripId: string;
  sessionId: string;
  chatHistory: Array<{ id: string; role: string; content: string; created_at: string }>;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  // Lock body scroll — this page is a full-viewport layout, never needs body scroll
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  const [tripData, setTripData] = useState<Trip>(trip);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [itineraryLoaded, setItineraryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const initialPromptSentRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<SelectedActivity | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tripSaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const itineraryPaneRef = useRef<HTMLDivElement>(null);
  const [itineraryFlash, setItineraryFlash] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [updatingItinerary, setUpdatingItinerary] = useState(false);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  // Resizable panes
  const [chatWidthPct, setChatWidthPct] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("derive-chat-width");
      if (saved) { const n = Number(saved); if (n >= 20 && n <= 70) return n; }
    }
    return 38;
  });
  const chatWidthRef = useRef(chatWidthPct);
  useEffect(() => { chatWidthRef.current = chatWidthPct; }, [chatWidthPct]);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(20, pct));
      setChatWidthPct(clamped);
    }
    function handleMouseUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("derive-chat-width", String(Math.round(chatWidthRef.current)));
      }
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const tripRefreshRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sendMessageRef = useRef<((...args: any[]) => void) | null>(null);
  const appliedActionsRef = useRef<Set<string>>(new Set());
  const processedItineraryRef = useRef<Set<string>>(new Set());
  const savedMessagesRef = useRef<Set<string>>(new Set());

  const handleTripUpdate = useCallback(
    (fields: Partial<Pick<Trip, "start_date" | "end_date" | "regions" | "travel_party" | "title">>) => {
      setTripData((prev) => ({ ...prev, ...fields }));

      // Debounced DB save (outside state updater to avoid Strict Mode double-execution)
      clearTimeout(tripSaveRef.current);
      tripSaveRef.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase.from("trips").update(fields).eq("id", tripId);
      }, 600);

      // Debounced AI refresh
      clearTimeout(tripRefreshRef.current);
      tripRefreshRef.current = setTimeout(() => {
        // Read latest tripData from the ref
        setTripData((current) => {
          const prompt = `My trip details have changed. Here are the updated details:\n- Regions: ${current.regions.join(", ")}\n- Dates: ${current.start_date} to ${current.end_date}\n- Travel party: ${current.travel_party || "Not specified"}\n\nPlease update your recommendations to match these new trip parameters.`;
          saveChatMessage(tripId, "user", prompt);
          sendMessageRef.current?.({ text: prompt });
          return current; // no state change, just reading
        });
      }, 2000);
    },
    [tripId]
  );

  // Close share menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    }
    if (shareOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [shareOpen]);

  const tripTitle = generateTripTitle(tripData, t);
  const tripSubtitle = `${formatDateRange(tripData.start_date, tripData.end_date)}${tripData.travel_party ? ` | ${tripData.travel_party}` : ""}`;

  const buildItineraryText = useCallback(() => {
    if (!itinerary) return null;
    const lines: string[] = [tripTitle, tripSubtitle, "", itinerary.title];
    if (itinerary.summary) lines.push(itinerary.summary);
    lines.push("");
    for (const day of itinerary.days) {
      lines.push(`--- ${day.title}${day.date ? ` (${day.date})` : ""} ---`);
      for (const act of day.activities) {
        lines.push(`  ${act.time}  ${act.title}`);
        if (act.description) lines.push(`          ${act.description}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }, [itinerary, tripTitle, tripSubtitle]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied("link");
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard API unavailable */ }
  }, []);

  const handleCopyItinerary = useCallback(async () => {
    const text = buildItineraryText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied("itinerary");
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard API unavailable */ }
  }, [buildItineraryText]);

  const handleNativeShare = useCallback(async () => {
    const text = buildItineraryText();
    try {
      await navigator.share({
        title: tripTitle,
        text: text || tripSubtitle,
        url: window.location.href,
      });
    } catch {
      // User cancelled or not supported
    }
    setShareOpen(false);
  }, [tripTitle, tripSubtitle, buildItineraryText]);

  const handleFinalizeShare = useCallback(async () => {
    if (sharing) return;

    // If itinerary exists but has no DB id yet, persist it first
    let currentId = itinerary?.id;
    if (itinerary && !currentId) {
      try {
        const res = await fetch("/api/itinerary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            sessionId,
            title: itinerary.title,
            summary: itinerary.summary,
            days: itinerary.days,
            ideas: itinerary.ideas || [],
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          currentId = saved.id;
          setItinerary((prev) => prev ? { ...prev, id: saved.id } : prev);
        }
      } catch {
        // continue with what we have
      }
    }

    if (!currentId) return;

    setSharing(true);
    try {
      // Mark trip as finalized
      const supabase = createClient();
      await supabase.from("trips").update({ status: "finalized" }).eq("id", tripId);
      setTripData((prev) => ({ ...prev, status: "finalized" }));

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itineraryId: currentId }),
      });
      const json = await res.json();
      if (json.shareUrl) {
        try {
          await navigator.clipboard.writeText(json.shareUrl);
        } catch {
          // Clipboard may fail in non-secure contexts — open in new tab as fallback
          window.open(json.shareUrl, "_blank");
        }
        setCopied("share");
        setTimeout(() => setCopied(null), 3000);
        setItinerary((prev) => prev ? { ...prev, share_token: json.shareToken } : prev);
      }
    } catch {
      // silent
    } finally {
      setSharing(false);
    }
  }, [itinerary, sharing, tripId, sessionId]);

  // Load existing itinerary (DB + localStorage ideas fallback)
  useEffect(() => {
    async function loadItinerary() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error("Itinerary load error:", error);
      if (data) {
        const normalized = normalizeItinerary(data);
        // Restore ideas from localStorage if DB doesn't have them
        if (!normalized.ideas || normalized.ideas.length === 0) {
          try {
            const stored = localStorage.getItem(`itinerary-ideas:${tripId}`);
            if (stored) normalized.ideas = JSON.parse(stored);
          } catch {}
        }
        setItinerary(normalized);
      }
      setItineraryLoaded(true);
    }
    loadItinerary();
  }, [tripId]);

  // Convert DB messages to UIMessage format for useChat
  const initialMessages = useMemo(
    () =>
      chatHistory
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: msg.content }],
          createdAt: new Date(msg.created_at),
        })),
    [chatHistory]
  );

  // Feedback counter — increment to force recalculation of feedback before next AI request
  const [feedbackVersion, setFeedbackVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const feedback = useMemo(() => getAllFeedback(), [feedbackVersion]);

  // Bookmarked recommendations
  const [savedRecs, setSavedRecs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`saved-recs:${tripId}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const toggleSaveRec = useCallback((name: string) => {
    setSavedRecs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try { localStorage.setItem(`saved-recs:${tripId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [tripId]);

  // Use refs for values accessed inside effects to avoid stale closures
  const itineraryRef = useRef(itinerary);
  useEffect(() => { itineraryRef.current = itinerary; }, [itinerary]);
  const savedRecsRef = useRef(savedRecs);
  useEffect(() => { savedRecsRef.current = savedRecs; }, [savedRecs]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          sessionId,
          regions: tripData.regions,
          tripId,
          feedback,
          budgetTier: tripData.trip_description?.match(/Budget preference:\s*(\S+)/)?.[1] || undefined,
          get itinerary() { return itineraryRef.current || undefined; },
        },
      }),
    [sessionId, tripData.regions, tripId, feedback, tripData.trip_description]
  );

  const { messages, sendMessage, stop, status, error, setMessages } = useChat({ transport });
  sendMessageRef.current = sendMessage;

  // Load chat history into useChat on mount
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(() => {
    if (!historyLoaded && initialMessages.length > 0 && messages.length === 0) {
      // Seed refs so we don't re-process or re-save old assistant messages on reload
      for (const msg of initialMessages) {
        if (msg.role === "assistant") {
          appliedActionsRef.current.add(msg.id);
          processedItineraryRef.current.add(msg.id);
          savedMessagesRef.current.add(msg.id);
        }
      }
      setMessages(initialMessages);
      setHistoryLoaded(true);
    }
  }, [historyLoaded, initialMessages, messages.length, setMessages]);

  const isLoading = status === "streaming" || status === "submitted";

  // Stop all generation — cancels the stream and resets loading flags
  const handleStop = useCallback(() => {
    stop();
    setGeneratingItinerary(false);
    setUpdatingItinerary(false);
  }, [stop]);

  // Streaming progress: track how much of the expected response has arrived
  const streamingProgress = useMemo(() => {
    if (!isLoading) return 0;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return 2; // just started, show a sliver
    const content = (lastAssistant.parts || [])
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    const len = content.length;
    // Expected size: ~5000 chars for recs, ~8000+ for itinerary JSON
    // Use a higher estimate so we don't hit 95% too early
    const expectedLen = 6000;
    const raw = Math.min(len / expectedLen, 0.95);
    return Math.round(raw * 100);
  }, [isLoading, messages]);

  // Auto-send initial prompt (only for brand-new trips with no history)
  // Uses ref to prevent double-sending in React Strict Mode
  useEffect(() => {
    if (initialPromptSentRef.current || initialPromptSent) return;
    if (chatHistory.length > 0) {
      initialPromptSentRef.current = true;
      setInitialPromptSent(true);
      return;
    }
    initialPromptSentRef.current = true;
    const userPrompt = buildTripUserPrompt(trip);
    saveChatMessage(tripId, "user", userPrompt);
    sendMessage({ text: userPrompt });
    setInitialPromptSent(true);
  }, [initialPromptSent, tripId, trip, sendMessage, chatHistory]);

  const handleChatSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        setFeedbackVersion((v) => v + 1); // refresh feedback before next AI call
        saveChatMessage(tripId, "user", text.trim());
        sendMessage({ text });
      }
    },
    [sendMessage, tripId]
  );

  // Add suggestion to ideas bucket — uses setItinerary directly to avoid
  // declaration-order issues with handleIdeasUpdate
  const handleAddSuggestionToIdeas = useCallback(
    (suggestion: Omit<Activity, "id">) => {
      setItinerary((prev) => {
        if (!prev) return prev;
        const newActivity: Activity = {
          ...suggestion,
          id: crypto.randomUUID(),
        };
        const updatedIdeas = [...(prev.ideas || []), newActivity];
        const updated = { ...prev, ideas: updatedIdeas };
        // Persist ideas in localStorage as fallback
        try { localStorage.setItem(`itinerary-ideas:${tripId}`, JSON.stringify(updatedIdeas)); } catch {}
        // Debounced persist via saveTimeoutRef
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          if (updated.id) {
            fetch("/api/itinerary", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: updated.id, days: updated.days, ideas: updated.ideas || [] }),
            });
          }
        }, 800);
        return updated;
      });
    },
    [tripId]
  );

  // Add suggestion to itinerary via AI — let the AI decide optimal placement
  const handleAddSuggestionToItinerary = useCallback(
    (suggestion: Omit<Activity, "id">) => {
      if (!itinerary) return;
      setUpdatingItinerary(true);
      const prompt = `[DERIVE_AUTO] Add "${suggestion.title}" to the itinerary. Place it in the most logical day and time slot based on location, category (${suggestion.category}), and the existing schedule. ${suggestion.description ? `Details: ${suggestion.description}` : ""}${suggestion.location ? ` Location: ${suggestion.location}` : ""}`;
      saveChatMessage(tripId, "user", prompt);
      sendMessage({ text: prompt });
    },
    [itinerary, tripId, sendMessage]
  );

  const HIDDEN_PREFIX = "[DERIVE_AUTO]";
  const ITINERARY_PREFIX = "[DERIVE_ITINERARY]";

  // All messages mapped to plain objects (used for data extraction)
  const allMappedMessages = useMemo(() =>
    messages.map((m) => {
      const partsText = m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      return {
        id: m.id,
        role: m.role as "user" | "assistant",
        content: partsText || (m as any).content || "",
      };
    }),
    [messages]
  );

  // Filtered messages for chat display:
  // - [DERIVE_AUTO]: hide user msg + following assistant response
  // - [DERIVE_ITINERARY]: replace verbose prompt with short display text, keep AI response
  const chatMessages = useMemo(() => {
    const hiddenIds = new Set<string>();
    for (let i = 0; i < allMappedMessages.length; i++) {
      if (allMappedMessages[i].role === "user" && allMappedMessages[i].content.startsWith(HIDDEN_PREFIX)) {
        hiddenIds.add(allMappedMessages[i].id);
        if (i + 1 < allMappedMessages.length && allMappedMessages[i + 1].role === "assistant") {
          hiddenIds.add(allMappedMessages[i + 1].id);
        }
      }
    }
    return allMappedMessages
      .filter((m) => !hiddenIds.has(m.id))
      .map((m) => {
        if (m.role === "user" && m.content.startsWith(ITINERARY_PREFIX)) {
          return { ...m, content: "Build my itinerary from my saved spots" };
        }
        return m;
      });
  }, [allMappedMessages]);

  // Derive all recommendations from ALL assistant messages (including hidden ones)
  const allRecommendations = useMemo(() => {
    const seen = new Set<string>();
    const recs: Recommendation[] = [];
    for (const msg of allMappedMessages) {
      if (msg.role !== "assistant") continue;
      const { recommendations } = extractJsonBlocks(msg.content);
      for (const rec of recommendations) {
        if (!seen.has(rec.name)) {
          seen.add(rec.name);
          recs.push(rec);
        }
      }
    }
    return recs;
  }, [allMappedMessages]);
  const allRecommendationsRef = useRef(allRecommendations);
  useEffect(() => { allRecommendationsRef.current = allRecommendations; }, [allRecommendations]);

  // Refresh itinerary when chat finishes + auto-apply actions + auto-switch tab
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant) {
        const content = (lastAssistant.parts || [])
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("");
        const parsed = parseAIResponse(content);

        // Save assistant message to DB (deduplicated via ref)
        if (!savedMessagesRef.current.has(lastAssistant.id)) {
          savedMessagesRef.current.add(lastAssistant.id);
          saveChatMessage(tripId, "assistant", content);
        }

        // Handle browse/itinerary mode switching
        if (parsed.browseMode) {
          setBrowseMode(true);
          return;
        }
        if (parsed.itineraryMode) {
          setBrowseMode(false);
          return;
        }

        // Auto-apply actions if we have an itinerary and haven't applied for this message
        const currentItinerary = itineraryRef.current;
        if (parsed.actions.length > 0 && currentItinerary && !appliedActionsRef.current.has(lastAssistant.id)) {
          appliedActionsRef.current.add(lastAssistant.id);
          const updated = applyActions(currentItinerary, parsed.actions);
          setItinerary(updated);
          setUpdatingItinerary(false);
          // Save to DB
          persistItinerary(updated);
          // Switch to itinerary tab on mobile
          setActiveTab("itinerary");
          return;
        }

        // If the AI response contains a full itinerary, apply it as a replacement.
        // This handles both initial generation AND major revisions (e.g., removing/replacing whole days).
        if (parsed.itineraryData && !processedItineraryRef.current.has(lastAssistant.id)) {
          processedItineraryRef.current.add(lastAssistant.id);
          const normalizedDays = parsed.itineraryData.days.map((day: any, i: number) => ({
            day: day.day || i + 1,
            date: day.date,
            title: day.title || `Day ${i + 1}`,
            activities: (day.activities || []).map((act: any) => ({
              ...act,
              id: act.id || crypto.randomUUID(),
              category: act.category || "activity",
            })),
          }));

          const prevItinerary = itineraryRef.current;
          const clientItinerary: Itinerary = {
            // Preserve existing DB id and ideas when replacing
            ...(prevItinerary ? { id: prevItinerary.id } : {}),
            trip_id: tripId,
            session_id: sessionId,
            title: parsed.itineraryData.title || prevItinerary?.title || "Trip Itinerary",
            summary: parsed.itineraryData.summary,
            days: normalizedDays,
            ideas: prevItinerary?.ideas || [],
          };

          const normalized = normalizeItinerary(clientItinerary);
          setItinerary(normalized);
          setBrowseMode(false);
          setGeneratingItinerary(false);
          setUpdatingItinerary(false);
          setActiveTab("itinerary");

          // Persist immediately if we have a DB id, otherwise insert new
          if (normalized.id) {
            persistItinerary(normalized);
          } else {
            // Insert new itinerary into DB
            (async () => {
              try {
                const res = await fetch("/api/itinerary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tripId,
                    sessionId,
                    title: normalized.title,
                    summary: normalized.summary,
                    days: normalized.days,
                    ideas: normalized.ideas || [],
                  }),
                });
                if (res.ok) {
                  const saved = await res.json();
                  setItinerary((prev) => prev ? { ...prev, id: saved.id } : normalizeItinerary(saved));
                } else {
                  console.error("Itinerary POST failed:", res.status, await res.text().catch(() => ""));
                }
              } catch (e) {
                console.error("Itinerary POST error:", e);
              }
            })();
          }
          return;
        }
      }

      // Default: refresh from DB
      async function refreshItinerary() {
        const supabase = createClient();
        const { data } = await supabase
          .from("itineraries")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          const prev = itineraryRef.current;
          const normalized = normalizeItinerary(data);

          // Seed bookmarked recommendations (deduplicated by title, only add missing ones)
          const currentSavedRecs = savedRecsRef.current;
          const currentAllRecs = allRecommendationsRef.current;
          if (currentSavedRecs.size > 0) {
            const existingIdeas = normalized.ideas || [];
            const existingTitles = new Set(existingIdeas.map((a) => a.title));
            const bookmarkedIdeas: Activity[] = currentAllRecs
              .filter((rec) => currentSavedRecs.has(rec.name) && !existingTitles.has(rec.name))
              .map((rec) => ({
                id: crypto.randomUUID(),
                time: "",
                title: rec.name,
                description: rec.description,
                category: "activity" as const,
              }));
            if (bookmarkedIdeas.length > 0) {
              normalized.ideas = [...existingIdeas, ...bookmarkedIdeas];
              if (prev) persistItinerary(normalized);
            }
          }

          setItinerary(normalized);
          setUpdatingItinerary(false);
          if (!prev) {
            setActiveTab("itinerary");
            // Persist on first load if bookmarks were seeded
            if ((normalized.ideas || []).length > 0) persistItinerary(normalized);
          }
        }
      }
      refreshItinerary();
    }

    // Reset loading states when stream ends (error or no itinerary data)
    if (status === "error" || status === "ready") {
      setGeneratingItinerary(false);
      setUpdatingItinerary(false);
    }
  }, [status, messages.length, tripId]);

  // Persist itinerary to DB (shared helper)
  const persistItinerary = useCallback(
    async (it: Itinerary) => {
      if (!it.id) return;
      setSaving(true);
      try {
        await fetch("/api/itinerary", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: it.id, title: it.title, summary: it.summary, days: it.days, ideas: it.ideas || [] }),
        });
        setSaved(true);
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 1500);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Auto-save itinerary changes (days) — uses functional updater to avoid stale closure
  const handleItineraryUpdate = useCallback(
    (days: DayPlan[]) => {
      setItinerary((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, days };
        clearTimeout(saveTimeoutRef.current);
        clearTimeout(savedTimeoutRef.current);
        setSaved(false);
        saveTimeoutRef.current = setTimeout(() => persistItinerary(updated), 800);
        return updated;
      });
    },
    [persistItinerary]
  );

  // Auto-save ideas changes — uses functional updater to avoid stale closure
  const handleIdeasUpdate = useCallback(
    (ideas: Activity[]) => {
      setItinerary((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ideas };
        // Persist ideas in localStorage as fallback
        try { localStorage.setItem(`itinerary-ideas:${tripId}`, JSON.stringify(ideas)); } catch {}
        clearTimeout(saveTimeoutRef.current);
        clearTimeout(savedTimeoutRef.current);
        setSaved(false);
        saveTimeoutRef.current = setTimeout(() => persistItinerary(updated), 800);
        return updated;
      });
    },
    [persistItinerary, tripId]
  );

  // Generate itinerary from bookmarked recommendations
  const handleGenerateItinerary = useCallback(() => {
    setBrowseMode(false);
    setGeneratingItinerary(true);
    const bookmarkedNames = allRecommendations
      .filter((rec) => savedRecs.has(rec.name))
      .map((rec) => rec.name);
    const prompt = buildItineraryFromBookmarks(
      {
        destination: tripData.regions.join(", "),
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        travelParty: tripData.travel_party,
      },
      bookmarkedNames
    );
    // Prefix with [DERIVE_ITINERARY] so the chat UI shows a short message
    // while the full prompt is sent to the AI
    const taggedPrompt = `${ITINERARY_PREFIX} ${prompt}`;
    saveChatMessage(tripId, "user", taggedPrompt);
    sendMessage({ text: taggedPrompt });
  }, [allRecommendations, savedRecs, tripData, tripId, sendMessage]);

  // Request more recommendations — dismiss unsaved recs, preserves bookmarks
  const handleRecommendMore = useCallback(() => {
    // Mark all currently unsaved recommendations as dismissed
    const newDismissed = new Set(dismissedRecs);
    for (const rec of allRecommendations) {
      if (!savedRecs.has(rec.name)) {
        newDismissed.add(rec.name);
      }
    }
    setDismissedRecs(newDismissed);

    const alreadySeen = allRecommendations.map((r) => r.name).join(", ");
    const prompt = `[DERIVE_AUTO] Recommend more places and activities for this trip. Do NOT repeat any of these already-suggested places: ${alreadySeen}. Give me fresh, different recommendations in the same JSON format as before.`;
    saveChatMessage(tripId, "user", prompt);
    sendMessage({ text: prompt });
  }, [allRecommendations, savedRecs, dismissedRecs, tripId, sendMessage]);

  // TripWorkspaceContext value
  const workspaceCtx = useMemo(
    () => ({
      sendChatMessage: handleChatSubmit,
      itinerary,
      updateItinerary: handleItineraryUpdate,
      updateIdeas: handleIdeasUpdate,
      selectedActivity,
      setSelectedActivity,
    }),
    [handleChatSubmit, itinerary, handleItineraryUpdate, handleIdeasUpdate, selectedActivity, setSelectedActivity]
  );

  const chatPane = (
    <ChatThread
      messages={chatMessages}
      onSubmit={handleChatSubmit}
      isLoading={isLoading}
      onStop={handleStop}
      onAddSuggestionToIdeas={handleAddSuggestionToIdeas}
      onAddSuggestionToItinerary={handleAddSuggestionToItinerary}
      itineraryDays={itinerary?.days}
      onSwitchToItinerary={() => {
        // Mobile: switch tab
        setActiveTab("itinerary");
        // Desktop: scroll itinerary pane into view + flash highlight
        if (itineraryPaneRef.current) {
          itineraryPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
          setItineraryFlash(true);
          setTimeout(() => setItineraryFlash(false), 1200);
        }
        // If itinerary hasn't loaded yet (race condition), try refreshing from DB
        if (!itinerary) {
          (async () => {
            const supabase = createClient();
            const { data } = await supabase
              .from("itineraries")
              .select("*")
              .eq("trip_id", tripId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (data) setItinerary(normalizeItinerary(data));
          })();
        }
      }}
    />
  );

  // Phase logic: itinerary → 2, recommendations → 1, otherwise → 0
  // Wait for itinerary DB query to complete before falling back to phase 1,
  // so we don't briefly flash recommendations when an itinerary already exists.
  const phase = (itinerary && !browseMode) ? 2 : (!itineraryLoaded ? 0 : allRecommendations.length > 0 ? 1 : 0);

  const isItineraryLoading = generatingItinerary || updatingItinerary;

  // Reset scroll position when loading starts so no leftover scroll from recommendations
  useEffect(() => {
    if ((isLoading || isItineraryLoading) && itineraryPaneRef.current) {
      itineraryPaneRef.current.scrollTop = 0;
    }
  }, [isLoading, isItineraryLoading]);

  // Ombre overlay: show the CSS ::after gradient on the OUTER pane via is-loading class
  const showOmbre = (phase === 2 && (updatingItinerary || isLoading)) || (phase !== 2 && (isLoading || isItineraryLoading));
  const isGenerating = generatingItinerary || updatingItinerary;

  const itineraryPane = phase === 2 ? (
    <ItineraryView
      itinerary={itinerary!}
      editable
      onUpdate={handleItineraryUpdate}
      onUpdateIdeas={handleIdeasUpdate}
      onUpdateMeta={(meta) => {
        setItinerary((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, ...meta };
          clearTimeout(saveTimeoutRef.current);
          clearTimeout(savedTimeoutRef.current);
          setSaved(false);
          saveTimeoutRef.current = setTimeout(() => persistItinerary(updated), 800);
          return updated;
        });
      }}
      saving={saving}
      saved={saved}
    />
  ) : phase === 1 ? (
    <div className="space-y-4">
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-400">
          <Sparkles className="h-4 w-4" /> {t("tripWorkspace.recommendedForYou")}
        </p>
        <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
          {allRecommendations.filter((rec) => !dismissedRecs.has(rec.name)).map((rec, i) => (
            <div
              key={rec.name}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
              style={{ animationDelay: `${i * 100}ms`, animationDuration: "400ms" }}
            >
              <RecommendationCard
                recommendation={rec}
                isSaved={savedRecs.has(rec.name)}
                onSave={() => toggleSaveRec(rec.name)}
                sessionId={sessionId}
                regions={tripData.regions}
              />
            </div>
          ))}
        </div>
        {isLoading && allRecommendations.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[13px] text-n-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("tripWorkspace.stillDiscovering")}
          </div>
        )}
      </div>

      {/* Generate Itinerary + Recommend More CTAs */}
      <div className="sticky -bottom-4 z-10 -mx-4 bg-white px-4 pt-4 pb-6 before:pointer-events-none before:absolute before:-top-8 before:left-0 before:right-0 before:h-8 before:bg-gradient-to-t before:from-white before:to-transparent">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="lg"
            className="shrink-0"
            onClick={handleRecommendMore}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            More places
          </Button>
          <Button
            className="flex-1"
            size="lg"
            onClick={handleGenerateItinerary}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("tripWorkspace.generatingItinerary")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("tripWorkspace.generateItinerary")}
                {savedRecs.size > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[12px]">
                    {t("tripWorkspace.savedCount", { count: savedRecs.size })}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[12px] text-n-400">
          {savedRecs.size > 0
            ? t("tripWorkspace.generateHintSaved", { count: savedRecs.size })
            : t("tripWorkspace.generateHintDefault")}
        </p>
      </div>
    </div>
  ) : (
    <div className="space-y-5">
      {/* Skeleton hint cards */}
      <div>
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[1px] text-n-400">
          <Sparkles className="h-4 w-4 pulse-ring" /> {t("tripWorkspace.discoveringPlaces")}
        </p>
        <div className="space-y-3">
          {[
            { w1: "w-3/5", w2: "w-full", w3: "w-4/5" },
            { w1: "w-2/3", w2: "w-full", w3: "w-3/4" },
            { w1: "w-1/2", w2: "w-5/6", w3: "w-2/3" },
          ].map((widths, i) => (
            <div
              key={i}
              className="rounded-[20px] border border-n-200 bg-n-0/70 p-5"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className={`h-4 ${widths.w1} rounded-full shimmer-bar`} />
              <div className={`mt-3 h-3 ${widths.w2} rounded-full shimmer-bar`} style={{ animationDelay: "0.3s" }} />
              <div className={`mt-2 h-3 ${widths.w3} rounded-full shimmer-bar`} style={{ animationDelay: "0.6s" }} />
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 rounded-full shimmer-bar" style={{ animationDelay: "0.9s" }} />
                <div className="h-6 w-20 rounded-full shimmer-bar" style={{ animationDelay: "1.1s" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-n-50">
      <TripWorkspaceContext.Provider value={workspaceCtx}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 lg:px-5">
          {/* Trip header — single compact row */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-1 h-4 w-4" /> {t("common.dashboard")}
              </Button>
              <div className="min-w-0">
                <input
                  className="w-full truncate bg-transparent font-heading text-[16px] font-semibold tracking-tight text-n-900 outline-none hover:bg-n-100/60 focus:bg-n-100/60 focus:ring-1 focus:ring-lavender-300 rounded px-1 -ml-1 lg:text-[18px]"
                  defaultValue={tripTitle}
                  key={tripTitle}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== tripTitle) handleTripUpdate({ title: v });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-n-500">
                  <EditableRegions
                    regions={tripData.regions}
                    onUpdate={(regions) => handleTripUpdate({ regions })}
                  />
                  <EditableDates
                    startDate={tripData.start_date}
                    endDate={tripData.end_date}
                    onUpdate={(start_date, end_date) => handleTripUpdate({ start_date, end_date })}
                  />
                  <EditableParty
                    party={tripData.travel_party || ""}
                    onUpdate={(travel_party) => handleTripUpdate({ travel_party })}
                  />
                </div>
              </div>
            </div>
              <div className="flex items-center gap-2">
                {/* Share button */}
                <div className="relative" ref={shareRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShareOpen((v) => !v)}
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    {t("common.share")}
                  </Button>
                  {shareOpen && (
                    <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-[20px] border border-n-200 bg-n-0 p-1.5 shadow-lg">
                      {itinerary && (
                        <button
                          onClick={handleCopyItinerary}
                          className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm text-n-900 transition-colors hover:bg-n-100"
                        >
                          {copied === "itinerary" ? <Check className="h-4 w-4 text-mint-500" /> : <FileText className="h-4 w-4 text-n-400" />}
                          {copied === "itinerary" ? t("tripWorkspace.itineraryCopied") : t("tripWorkspace.copyItinerary")}
                        </button>
                      )}
                      {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                        <button
                          onClick={handleNativeShare}
                          className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm text-n-900 transition-colors hover:bg-n-100"
                        >
                          <Copy className="h-4 w-4 text-n-400" />
                          {t("tripWorkspace.shareVia")}
                        </button>
                      )}
                      {itinerary && (
                        <>
                          <div className="my-1 border-t border-n-100" />
                          <button
                            onClick={handleFinalizeShare}
                            disabled={sharing}
                            className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm font-medium text-lavender-600 transition-colors hover:bg-lavender-50 disabled:opacity-50"
                          >
                            {copied === "share" ? (
                              <Check className="h-4 w-4 text-mint-500" />
                            ) : sharing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                            {copied === "share" ? "Link copied!" : sharing ? "Finalizing..." : tripData.status === "finalized" ? "Share link" : "Finalize & share"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Mobile tab toggle */}
          <div className="mb-2 flex rounded-full bg-n-100 p-[3px] lg:hidden">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-n-0 text-n-900 shadow-sm"
                  : "text-n-500 hover:text-n-900"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              {t("tripWorkspace.chat")}
            </button>
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "itinerary"
                  ? "bg-n-0 text-n-900 shadow-sm"
                  : "text-n-500 hover:text-n-900"
              }`}
            >
              <Map className="h-4 w-4" />
              {t("tripWorkspace.itinerary")}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-[20px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {t("tripWorkspace.chatError")} {error.message}
            </div>
          )}

          {/* Desktop: side-by-side layout with draggable divider */}
          <div ref={containerRef} className="hidden min-h-0 flex-1 lg:flex lg:items-stretch">
            {/* Chat pane — left */}
            <div
              className="flex shrink-0 flex-col overflow-hidden rounded-[20px] border border-n-200 bg-n-0"
              style={{ width: `${chatWidthPct}%` }}
            >
              {chatPane}
            </div>

            {/* Resize handle */}
            <div
              className="group relative z-10 flex w-4 shrink-0 cursor-col-resize items-center justify-center"
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingRef.current = true;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              onDoubleClick={() => {
                setChatWidthPct(38);
                localStorage.setItem("derive-chat-width", "38");
              }}
            >
              <div className="h-8 w-1 rounded-full bg-n-300 transition-all group-hover:h-12 group-hover:bg-lavender-400" />
            </div>

            {/* Itinerary pane — right */}
            <div
              className={`itinerary-pane-bg flex flex-col overflow-hidden rounded-[20px] border bg-white transition-colors duration-500 ${showOmbre ? "is-loading" : ""} ${itineraryFlash ? "border-lavender-400 ring-2 ring-lavender-400/30" : "border-n-200"}`}
              style={{ width: `calc(${100 - chatWidthPct}% - 1rem)` }}
            >
              {/* Loading overlay — sits above CSS ::after (z-10), inline styles override .itinerary-pane-bg > * rule */}
              {showOmbre && (
                <div
                  className="flex flex-col items-center justify-center gap-6"
                  style={{ position: "absolute", inset: 0, zIndex: 20 }}
                >
                  <PhotoOrbitLoader />
                  <CyclingLoadingText isGenerating={isGenerating} />
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 rounded-full border border-n-200 bg-n-0 px-5 py-2 text-[13px] font-medium text-n-600 shadow-sm transition-colors hover:bg-n-100 hover:text-n-900"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                </div>
              )}
              <div
                ref={itineraryPaneRef}
                className={`relative min-h-0 flex-1 overflow-x-hidden scroll-smooth px-4 pb-4 scrollbar-thin ${showOmbre ? "overflow-hidden" : "overflow-y-auto"}`}
              >
                {phase === 2 ? itineraryPane : <div className="pt-5">{itineraryPane}</div>}
              </div>
            </div>
          </div>

          {/* Mobile: tabbed layout */}
          <div className="lg:hidden">
            {activeTab === "chat" && (
              <div className="flex h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[20px] border border-n-200 bg-n-0">
                {chatPane}
              </div>
            )}
            {activeTab === "itinerary" && (
              <div className={`itinerary-pane-bg rounded-[20px] border border-n-200 bg-white ${showOmbre ? "is-loading min-h-[50vh]" : "p-4"}`}>
                {showOmbre && (
                  <div
                    className="flex flex-col items-center justify-center gap-6"
                    style={{ position: "absolute", inset: 0, zIndex: 20 }}
                  >
                    <PhotoOrbitLoader />
                    <CyclingLoadingText isGenerating={isGenerating} />
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 rounded-full border border-n-200 bg-n-0 px-5 py-2 text-[13px] font-medium text-n-600 shadow-sm transition-colors hover:bg-n-100 hover:text-n-900"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      Stop
                    </button>
                  </div>
                )}
                {!showOmbre && itineraryPane}
              </div>
            )}
          </div>
        </div>
      </TripWorkspaceContext.Provider>
    </div>
  );
}

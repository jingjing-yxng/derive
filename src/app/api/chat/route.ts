import { NextRequest } from "next/server";
import { streamText, generateText, type ModelMessage } from "ai";

export const runtime = "edge";
import { createServerClient } from "@/lib/supabase/server";
import { routeProvider, splitRegions } from "@/lib/ai/router";
import { claude, deepseek } from "@/lib/ai/providers";
import { buildClaudeSystemPrompt, buildDeepSeekSystemPrompt, serializeItinerary } from "@/lib/ai/prompts/recommend";
import { chatRequestSchema } from "@/lib/validation";
import { parseAIResponse } from "@/lib/extract-json";
import type { TasteProfile } from "@/types/profile";
import type { Itinerary } from "@/types/trip";

/** Strip internal UI prefixes so the AI sees clean prompts */
function stripUiPrefixes(content: string): string {
  return content.replace(/^\[DERIVE_(?:AUTO|ITINERARY)\]\s*/, "");
}

function convertMessages(messages: unknown[]): ModelMessage[] {
  return messages
    .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
    .map((msg: any) => {
      // Handle UIMessage format (parts array) from useChat
      if (msg.parts && Array.isArray(msg.parts)) {
        const textContent = msg.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("");
        return { role: msg.role, content: stripUiPrefixes(textContent) };
      }
      // Already CoreMessage format
      return { role: msg.role, content: stripUiPrefixes(msg.content || "") };
    });
}

/** Trim to last N messages, ensuring conversation starts with a user message */
function trimMessages(messages: ModelMessage[], tailCount: number): ModelMessage[] {
  if (messages.length <= tailCount) return messages;
  let trimmed = messages.slice(-tailCount);
  // Ensure conversation starts with a user message (required by most APIs)
  const firstUserIdx = trimmed.findIndex((m) => m.role === "user");
  if (firstUserIdx > 0) {
    trimmed = trimmed.slice(firstUserIdx);
  } else if (firstUserIdx === -1) {
    // No user message in the tail — fall back to last user message + everything after it
    const lastUserIdx = messages.reduce((acc, m, i) => (m.role === "user" ? i : acc), -1);
    if (lastUserIdx >= 0) return messages.slice(lastUserIdx);
    return messages.slice(-2); // absolute fallback
  }
  return trimmed;
}

/** Build a feedback addendum for system prompts */
function buildFeedbackNote(feedback?: { name: string; vote: number }[]): string {
  if (!feedback || feedback.length === 0) return "";
  const liked = feedback.filter((f) => f.vote > 0).map((f) => f.name);
  const disliked = feedback.filter((f) => f.vote < 0).map((f) => f.name);
  let note = "\n\nPast attraction feedback from this traveler:";
  if (liked.length > 0) note += `\n- Liked: ${liked.join(", ")} — suggest more attractions similar to these`;
  if (disliked.length > 0) note += `\n- Disliked: ${disliked.join(", ")} — avoid suggesting attractions similar to these`;
  return note;
}

/** Split a date range proportionally between two region groups.
 *  Returns null if the trip is too short to split (< 2 days). */
function splitDateRange(startDate: string, endDate: string, gcCount: number, otherCount: number) {
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Need at least 2 days to split between two region groups
  if (totalDays < 2) return null;

  const total = gcCount + otherCount;
  const gcDays = Math.max(1, Math.min(totalDays - 1, Math.round((totalDays * gcCount) / total)));

  const gcEnd = new Date(start);
  gcEnd.setUTCDate(gcEnd.getUTCDate() + gcDays - 1);

  const otherStart = new Date(gcEnd);
  otherStart.setUTCDate(otherStart.getUTCDate() + 1);

  return {
    gcStart: startDate,
    gcEnd: gcEnd.toISOString().split("T")[0],
    otherStart: otherStart.toISOString().split("T")[0],
    otherEnd: endDate,
  };
}

/** Create a UI message stream response from pre-generated text (for merged split results).
 *  Uses the AI SDK v6 SSE protocol expected by DefaultChatTransport. */
function createTextStreamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const messageId = crypto.randomUUID();
  const textPartId = crypto.randomUUID();

  function sse(data: string): Uint8Array {
    return encoder.encode(`data: ${data}\n\n`);
  }

  const stream = new ReadableStream({
    start(controller) {
      // 1. Start message
      controller.enqueue(sse(JSON.stringify({ type: "start", messageId })));
      // 2. Start step
      controller.enqueue(sse(JSON.stringify({ type: "start-step" })));
      // 3. Text start
      controller.enqueue(sse(JSON.stringify({ type: "text-start", id: textPartId })));
      // 4. Text deltas — chunk to simulate streaming
      const chunkSize = 80;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        controller.enqueue(sse(JSON.stringify({ type: "text-delta", id: textPartId, delta: chunk })));
      }
      // 5. Text end
      controller.enqueue(sse(JSON.stringify({ type: "text-end", id: textPartId })));
      // 6. Finish step
      controller.enqueue(sse(JSON.stringify({ type: "finish-step" })));
      // 7. Finish message
      controller.enqueue(sse(JSON.stringify({ type: "finish" })));
      // 8. Done marker
      controller.enqueue(sse("[DONE]"));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const { messages, sessionId, regions, tripId, feedback, budgetTier, itinerary: clientItinerary } = parsed.data;

    const supabase = createServerClient();

    // Fetch taste profile
    const { data: profile } = await supabase
      .from("taste_profiles")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    const allCoreMessages = convertMessages(messages);

    // Detect if this is an itinerary request — trim more aggressively
    // Check raw messages for [DERIVE_ITINERARY] prefix (before stripping), or the
    // stripped content for the itinerary prompt pattern
    const lastRawMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const lastRawContent = lastRawMsg?.parts
      ? (lastRawMsg as any).parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("")
      : ((lastRawMsg as any)?.content || "");
    const lastUserMsg = [...allCoreMessages].reverse().find((m) => m.role === "user");
    const lastUserContent = (lastUserMsg?.content as string) || "";
    const isItineraryReq = lastRawContent.startsWith("[DERIVE_ITINERARY]") ||
      lastUserContent.toLowerCase().includes("build my day-by-day itinerary");

    // For itinerary requests: only send last 2 messages (user request + maybe one assistant).
    // For normal chat: last 6 messages. This prevents Vercel 60s timeout.
    const coreMessages = trimMessages(allCoreMessages, isItineraryReq ? 2 : 6);

    // ── Split-provider logic ──
    // For mixed Greater China + other regions, use both DeepSeek and Claude in parallel
    const split = splitRegions(regions || []);
    if (split.isSplit) {
      const userMessages = coreMessages.filter((m) => m.role === "user");
      const lastUserContent = (userMessages[userMessages.length - 1]?.content as string) || "";
      const isFirstExchange = userMessages.length <= 1;
      const isItineraryRequest = lastUserContent.toLowerCase().includes("itinerary");

      if (isFirstExchange || isItineraryRequest) {
        return handleSplitRequest({
          coreMessages,
          lastUserContent,
          isItineraryRequest,
          gcRegions: split.gcRegions,
          otherRegions: split.otherRegions,
          profile,
          feedback,
          clientItinerary,
          budgetTier,
        });
      }
    }

    // ── Single-provider logic (existing) ──
    const { model, provider } = routeProvider(regions || []);

    let systemPrompt = profile
      ? provider === "deepseek"
        ? buildDeepSeekSystemPrompt(profile as TasteProfile, budgetTier)
        : buildClaudeSystemPrompt(profile as TasteProfile, budgetTier)
      : "You are a helpful travel planning assistant. Help the user plan their trip.";

    systemPrompt += buildFeedbackNote(feedback);

    if (clientItinerary) {
      try {
        const serialized = serializeItinerary(clientItinerary as Itinerary);
        systemPrompt += `\n\n${serialized}`;
      } catch {
        // skip
      }
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages: coreMessages,
      maxOutputTokens: provider === "deepseek" ? 8192 : 16384,
      // Note: assistant message + itinerary persistence is handled client-side.
      // Edge runtime onFinish is unreliable and caused duplicate DB inserts.
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Split request handler ──
// Makes parallel calls to DeepSeek (Greater China) and Claude (other regions),
// then merges recommendations / itinerary days into a single response.

async function handleSplitRequest({
  coreMessages,
  lastUserContent,
  isItineraryRequest,
  gcRegions,
  otherRegions,
  profile,
  feedback,
  clientItinerary,
  budgetTier,
}: {
  coreMessages: ModelMessage[];
  lastUserContent: string;
  isItineraryRequest: boolean;
  gcRegions: string[];
  otherRegions: string[];
  profile: any;
  feedback?: { name: string; vote: number }[];
  clientItinerary?: any;
  budgetTier?: string;
}): Promise<Response> {
  // Build region-scoped system prompts
  let gcSystem = profile
    ? buildDeepSeekSystemPrompt(profile as TasteProfile, budgetTier)
    : "You are a helpful travel planning assistant specializing in Greater China.";
  let otherSystem = profile
    ? buildClaudeSystemPrompt(profile as TasteProfile, budgetTier)
    : "You are a helpful travel planning assistant.";

  gcSystem += `\n\nIMPORTANT: You are handling ONLY the Greater China portion of this multi-region trip. Focus exclusively on: ${gcRegions.join(", ")}. Do NOT include recommendations or itinerary days for other regions.`;
  otherSystem += `\n\nIMPORTANT: You are handling ONLY the non-China portion of this multi-region trip. Focus exclusively on: ${otherRegions.join(", ")}. Do NOT include recommendations or itinerary days for Greater China regions.`;

  const feedbackNote = buildFeedbackNote(feedback);
  gcSystem += feedbackNote;
  otherSystem += feedbackNote;

  if (clientItinerary) {
    try {
      const serialized = serializeItinerary(clientItinerary as Itinerary);
      gcSystem += `\n\n${serialized}`;
      otherSystem += `\n\n${serialized}`;
    } catch {
      // skip
    }
  }

  // Build region-specific user messages
  const lastUserIdx = coreMessages.reduce((acc, m, i) => (m.role === "user" ? i : acc), -1);
  let gcUserContent = lastUserContent;
  let otherUserContent = lastUserContent;

  if (isItineraryRequest) {
    // Split dates proportionally for itinerary generation
    const dateMatch = lastUserContent.match(/(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const dates = splitDateRange(dateMatch[1], dateMatch[2], gcRegions.length, otherRegions.length);
      if (dates) {
        const restAfterDates = lastUserContent.slice(lastUserContent.indexOf(dateMatch[2]) + dateMatch[2].length);
        gcUserContent = `Build my day-by-day itinerary for ${gcRegions.join(", ")}, ${dates.gcStart} to ${dates.gcEnd}${restAfterDates}`;
        otherUserContent = `Build my day-by-day itinerary for ${otherRegions.join(", ")}, ${dates.otherStart} to ${dates.otherEnd}${restAfterDates}`;
      }
    }
  } else {
    // For recommendations: scope each model to their regions
    gcUserContent = lastUserContent.replace(/Regions: .+/, `Regions: ${gcRegions.join(", ")}`);
    otherUserContent = lastUserContent.replace(/Regions: .+/, `Regions: ${otherRegions.join(", ")}`);
  }

  const gcMessages: ModelMessage[] = coreMessages.map((m, i) =>
    i === lastUserIdx ? { role: m.role, content: gcUserContent } as ModelMessage : m
  );
  const otherMessages: ModelMessage[] = coreMessages.map((m, i) =>
    i === lastUserIdx ? { role: m.role, content: otherUserContent } as ModelMessage : m
  );

  // Parallel calls — use allSettled so one failure doesn't block the other
  const results = await Promise.allSettled([
    generateText({ model: deepseek, system: gcSystem, messages: gcMessages, maxOutputTokens: 8192 }),
    generateText({ model: claude, system: otherSystem, messages: otherMessages, maxOutputTokens: 16384 }),
  ]);

  const gcResult = results[0].status === "fulfilled" ? results[0].value : null;
  const otherResult = results[1].status === "fulfilled" ? results[1].value : null;

  if (!gcResult && !otherResult) {
    return new Response(
      JSON.stringify({ error: "Both AI providers failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse each response
  const gcParsed = gcResult ? parseAIResponse(gcResult.text) : null;
  const otherParsed = otherResult ? parseAIResponse(otherResult.text) : null;

  // Merge recommendations
  const mergedRecs = [...(gcParsed?.recommendations || []), ...(otherParsed?.recommendations || [])];

  // Merge itinerary days
  let mergedItinerary: any = null;
  if (gcParsed?.itineraryData && otherParsed?.itineraryData) {
    const gcDayCount = gcParsed.itineraryData.days.length;
    const allDays = [
      ...gcParsed.itineraryData.days,
      ...otherParsed.itineraryData.days.map((d: any, i: number) => ({
        ...d,
        day: gcDayCount + (d.day ?? i + 1),
      })),
    ];
    mergedItinerary = {
      title: [gcParsed.itineraryData.title, otherParsed.itineraryData.title].filter(Boolean).join(" + "),
      summary: [gcParsed.itineraryData.summary, otherParsed.itineraryData.summary].filter(Boolean).join(" "),
      days: allDays,
    };
  } else {
    mergedItinerary = gcParsed?.itineraryData || otherParsed?.itineraryData || null;
  }

  // Merge text
  const chatText = [gcParsed?.text, otherParsed?.text].filter(Boolean).join("\n\n");

  // Build full response with JSON blocks
  let fullResponse = chatText;
  if (mergedRecs.length > 0) {
    fullResponse += `\n\n\`\`\`json\n${JSON.stringify({ recommendations: mergedRecs })}\n\`\`\``;
  }
  if (mergedItinerary) {
    fullResponse += `\n\n\`\`\`json\n${JSON.stringify({ itinerary: mergedItinerary })}\n\`\`\``;
  }

  // Note: assistant message + itinerary persistence is handled client-side.
  // Server-side inserts caused duplicates since client also saves on status=ready.

  return createTextStreamResponse(fullResponse);
}

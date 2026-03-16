import { NextRequest } from "next/server";
import { streamText } from "ai";
import { claude } from "@/lib/ai/providers";
import { z } from "zod";

const reqSchema = z.object({
  message: z.string().min(1),
  itinerary: z.object({
    title: z.string(),
    summary: z.string().optional(),
    days: z.array(z.any()),
  }),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = reqSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const { message, itinerary, history = [] } = parsed.data;

  // Serialize the itinerary for context
  const itineraryText = itinerary.days.map((day: any) => {
    const activities = (day.activities || []).map((a: any) =>
      `  - ${a.time || "TBD"}: ${a.title}${a.location ? ` (${a.location})` : ""}${a.description ? ` — ${a.description}` : ""}`
    ).join("\n");
    return `Day ${day.day}: ${day.title}${day.date ? ` (${day.date})` : ""}\n${activities || "  No activities"}`;
  }).join("\n\n");

  const systemPrompt = `You are a friendly, knowledgeable travel assistant for the itinerary '${itinerary.title}'.

Here is the full itinerary:

${itineraryText}

${itinerary.summary ? `Summary: ${itinerary.summary}` : ""}

Guidelines:
- Answer questions about this specific itinerary: activities, locations, logistics, timing, food, culture, etc.
- Be concise (2-4 sentences for simple questions, more for detailed ones)
- If asked about something not in the itinerary, you can provide general travel knowledge but note it is not part of the plan
- Be warm and enthusiastic about the trip
- Give practical tips when relevant (best times to visit, what to wear, local customs, etc.)
- You can suggest modifications but do not rewrite the itinerary unless asked
- When quoting place names or activities, use single quotes (e.g. 'Old Town') not double quotes
- Do not use markdown formatting like **bold** or *italic* — write in plain, natural language`;

  const messages = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const result = streamText({
    model: claude,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reqSchema = z.object({
  number: z.string().min(1),
  type: z.enum(["flight", "train"]),
  date: z.string().optional(), // YYYY-MM-DD
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = reqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { number, type, date } = parsed.data;

  if (type === "flight") {
    return lookupFlight(number, date);
  }

  // For trains, we don't have a universal API — return the number as-is
  return NextResponse.json({
    found: false,
    number,
    type: "train",
    message: "Train schedule lookup is not yet available. The train number has been saved.",
  });
}

async function lookupFlight(flightNumber: string, date?: string) {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;
  if (!apiKey) {
    // Fallback: use Claude to infer typical schedule
    return lookupFlightWithAI(flightNumber, date);
  }

  try {
    // Normalize flight number (remove spaces)
    const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: normalized,
    });
    if (date) params.set("flight_date", date);

    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return lookupFlightWithAI(flightNumber, date);
    }

    const data = await res.json();
    const flight = data?.data?.[0];

    if (!flight) {
      return lookupFlightWithAI(flightNumber, date);
    }

    return NextResponse.json({
      found: true,
      number: normalized,
      type: "flight",
      departure: {
        airport: flight.departure?.airport || "",
        iata: flight.departure?.iata || "",
        time: flight.departure?.scheduled || "",
        terminal: flight.departure?.terminal || "",
      },
      arrival: {
        airport: flight.arrival?.airport || "",
        iata: flight.arrival?.iata || "",
        time: flight.arrival?.scheduled || "",
        terminal: flight.arrival?.terminal || "",
      },
      airline: flight.airline?.name || "",
    });
  } catch {
    return lookupFlightWithAI(flightNumber, date);
  }
}

async function lookupFlightWithAI(flightNumber: string, date?: string) {
  // Use Anthropic to look up flight info based on its knowledge
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      found: false,
      number: flightNumber,
      type: "flight",
      message: "Flight lookup is not available. The flight number has been saved.",
    });
  }

  try {
    const prompt = `Look up flight ${flightNumber}${date ? ` on ${date}` : ""}.
Provide the typical schedule for this flight route. Respond ONLY with a JSON object (no markdown, no explanation):
{
  "found": true/false,
  "departure_airport": "Full airport name",
  "departure_iata": "XXX",
  "departure_time": "HH:MM AM/PM",
  "arrival_airport": "Full airport name",
  "arrival_iata": "XXX",
  "arrival_time": "HH:MM AM/PM",
  "airline": "Airline name"
}
If you don't know this flight, return {"found": false}.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        found: false,
        number: flightNumber,
        type: "flight",
        message: "Could not look up this flight.",
      });
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ found: false, number: flightNumber, type: "flight" });
    }

    let info;
    try {
      info = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ found: false, number: flightNumber, type: "flight" });
    }
    if (!info.found) {
      return NextResponse.json({ found: false, number: flightNumber, type: "flight", message: "Flight not found." });
    }

    return NextResponse.json({
      found: true,
      number: flightNumber.replace(/\s+/g, "").toUpperCase(),
      type: "flight",
      departure: {
        airport: info.departure_airport || "",
        iata: info.departure_iata || "",
        time: info.departure_time || "",
      },
      arrival: {
        airport: info.arrival_airport || "",
        iata: info.arrival_iata || "",
        time: info.arrival_time || "",
      },
      airline: info.airline || "",
    });
  } catch {
    return NextResponse.json({
      found: false,
      number: flightNumber,
      type: "flight",
      message: "Could not look up this flight.",
    });
  }
}

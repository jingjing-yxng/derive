import { z } from "zod";

const activitySchema = z.object({
  id: z.string().optional(),
  time: z.string().default(""),
  title: z.string(),
  description: z.string().default(""),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  tips: z.string().optional(),
  tickets: z.string().optional(),
  transport: z.string().optional(),
  notes: z.string().optional(),
  estimated_budget: z.string().optional(),
  category: z.string().default("activity"),
}).passthrough();

const daySchema = z.object({
  day: z.number(),
  date: z.string().optional(),
  title: z.string(),
  activities: z.array(activitySchema),
});

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().optional(),
    parts: z.array(z.any()).optional(),
  })).min(1),
  sessionId: z.string().min(1),
  regions: z.array(z.string()).optional(),
  tripId: z.string().optional(),
  feedback: z.array(z.object({ name: z.string(), vote: z.number() })).optional(),
  budgetTier: z.string().optional(),
  itinerary: z.any().optional(),
});

export const itineraryCreateSchema = z.object({
  tripId: z.string().min(1),
  sessionId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  days: z.array(daySchema),
  ideas: z.array(activitySchema).optional(),
});

export const itineraryUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  days: z.array(daySchema),
  ideas: z.array(activitySchema).optional(),
});

export const profileUpdateSchema = z.object({
  sessionId: z.string().min(1),
}).passthrough();

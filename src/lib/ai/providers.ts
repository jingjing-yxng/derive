import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const claude = anthropic("claude-sonnet-4-20250514");

export const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
}).chat("deepseek-chat");

export const claudeVision = anthropic("claude-sonnet-4-20250514");

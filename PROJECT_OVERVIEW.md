# Derivé — Project Overview

## What This Is

Derivé is an AI-powered travel planning web app that builds a personalized taste profile from a user's social media content (Pinterest boards, Instagram profiles, RedNote/Xiaohongshu posts, uploaded screenshots), then uses that profile to drive every recommendation and itinerary it generates. It is built with Next.js 16, Supabase, and dual AI providers (Claude for international destinations, DeepSeek for Greater China).

Live at: https://derive-app.vercel.app

---

## Core Differentiator

Most travel planning tools ask users to fill out preference surveys or pick from generic categories. Derivé takes a fundamentally different approach: **it reads your visual taste.** Users provide content they've already curated — their Pinterest boards, RedNote saves, travel screenshots — and the system uses Claude's vision capabilities to infer a rich, multi-dimensional travel personality. The result is a taste profile the user never had to manually construct, derived from aesthetic and behavioral signals they've already expressed organically on social media.

This matters because:
- People curate social media boards that reflect aspirational preferences they may not articulate well in a survey (e.g., "I like warm-toned rustic Mediterranean architecture with natural textures" becomes measurable signals across adventure, luxury, cultural, and aesthetic dimensions).
- The profile becomes a persistent lens that shapes every AI interaction — not a one-time input, but a living context layer.
- Users can fine-tune any dimension or tag after generation, creating a feedback loop between AI inference and human correction.

The second differentiator is **intelligent AI routing**: trips to Greater China (mainland, Hong Kong, Macau, Taiwan, and specific Chinese cities) are automatically routed to DeepSeek, which has deeper local knowledge of Chinese destinations, apps (WeChat Pay, DiDi, 12306), and cultural context. All other destinations use Claude. The user never chooses a model — the system routes based on the trip's regions.

---

## User Experience Flow

### 1. Onboarding (First Visit)

New users land on a two-step onboarding flow:

**Step 1 — Add Content** (`/onboarding`)
- Users paste Pinterest board/pin URLs or RedNote post URLs, OR drag-and-drop/upload screenshot images.
- Each URL is processed server-side: the app fetches the page HTML, extracts images (from OG tags and platform-specific image CDN patterns like `pinimg.com` or `xhscdn.com`) and text metadata using cheerio.
- Uploaded images go to Supabase Storage and their public URLs are recorded.
- A masonry-style mood board previews all added content with source labels (e.g., "Pinterest - Board Name"), hover-to-remove controls, and external link indicators.
- Once content is added, the user clicks "Generate profile" which sends all extracted images (up to 10) and text to Claude Vision.

**Step 2 — Review Profile** (`/onboarding/profile`)
- The AI-generated taste profile is displayed with six slider dimensions (1-10 scale). Each slider thumb is a colored circle (matching its dimension color) with a white ✦ star inside:
  - **Adventure** (comfort vs. thrills)
  - **Nature** (urban vs. outdoors)
  - **Activity** (relaxed vs. active)
  - **Luxury** (budget vs. premium)
  - **Cultural** (leisure vs. immersion)
  - **Social** (solo vs. social)
- Plus four tag arrays: Aesthetic Styles, Cuisine Interests, Vibe Keywords, Travel Themes.
- Plus a Budget Tier selection (budget / moderate / luxury / ultra-luxury).
- Every field is editable. Changes auto-save after 800ms of inactivity with a subtle "Saving..." / "Saved" indicator.
- The user proceeds to the dashboard.

### 2. Dashboard (`/`)

- Displays all trips as cards in a grid, each showing: auto-generated title (based on regions + travel party), region tags, date range, travel party, and status badge.
- Trip statuses: **Brainstorming** (no recommendations yet), **Planning** (has recommendations or itinerary), **Finalized** (future — not yet implemented).
- Filter bar with status pills and a sort toggle (last activity vs. trip date).
- Empty state prompts the user to plan their first trip.
- If no profile exists, redirects to onboarding.

### 3. Trip Creation (`/trip/new`)

- Left panel: form with fields for dates (exact via calendar or flexible text input), regions (free-text with add/remove chips), travel party, and additional preferences (textarea).
- Right panel: a dual-month range calendar for selecting exact start/end dates with a nights counter.
- **Profile-powered intelligence**: the form reads the user's taste profile to generate:
  - **Region suggestions** ("Brainstorm for me" button) — e.g., high cultural + high luxury profiles get suggestions like Kyoto, Florence, Istanbul.
  - **Preference chips** — clickable one-liners derived from profile scores (e.g., "I want authentic local experiences over tourist traps" for cultural >= 8) that append to the description textarea.
- On submit, a trip record is created in Supabase and the user is routed to the trip workspace.

### 4. Trip Workspace (`/trip/[id]`)

This is the main planning interface, with two tabs:

**Chat Tab**
- A full-height chat interface with the AI travel planner.
- On first visit to a new trip, the system auto-sends an initial prompt containing the trip parameters (dates, regions, party, description) and asks for 3-5 destination recommendations.
- The AI responds with conversational text plus a structured JSON block containing recommendations (name, description, vibe_match percentage, highlights, best_for, estimated_budget).
- The JSON is parsed client-side and rendered as styled recommendation cards below the message, each with a "Plan this trip" button.
- Clicking "Plan this trip" sends a follow-up prompt asking the AI to create a detailed day-by-day itinerary for that destination.
- The AI's itinerary JSON is parsed and saved server-side.
- Users can continue chatting to refine recommendations, ask questions, or request changes.
- Messages display with user/assistant avatars, and a typing indicator shows during streaming.

**Itinerary Tab** (appears once an itinerary exists)
- Renders the structured itinerary as day cards, each containing time-stamped activities.
- Activities are color-coded by category: food (orange), activity (blue), transport (purple), accommodation (green), free-time (neutral).
- Each activity shows title, description, location, and practical tips.

### 5. Profile Management (`/profile`)

- Accessible anytime from the nav bar.
- Left column: compact URL input bar + file upload button for adding new content, plus the full mood board of all content sources with an AI-generated summary paragraph explaining what the profile is based on, and a "Regenerate profile" button.
- Right column: sticky taste profile card (same sliders, tags, and budget tier as onboarding) with auto-save.

---

## Technical Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide icons, react-day-picker, react-dropzone
- **Backend**: Next.js API routes (serverless functions on Vercel)
- **Database**: Supabase (PostgreSQL) with tables for sessions, content_sources, taste_profiles, trips, chat_messages, itineraries
- **Storage**: Supabase Storage bucket (`content-images`) for uploaded screenshots
- **AI**: Vercel AI SDK (`ai` package) with `@ai-sdk/anthropic` (Claude Sonnet 4) and `@ai-sdk/openai` (DeepSeek via OpenAI-compatible API)
- **Auth**: Anonymous session via localStorage UUID (no login required)
- **Content Extraction**: Server-side HTML fetching + cheerio parsing for Pinterest and RedNote URLs
- **Deployment**: Vercel (direct CLI deploy, no git repo)

### AI Provider Routing

The system maintains a list of Greater China regions/cities (in English and Chinese). When a trip's regions match any of these, the chat uses DeepSeek (`deepseek-chat`) with a China-specialized system prompt (includes guidance on Chinese names, local apps, seasonal factors). Otherwise, it uses Claude (`claude-sonnet-4`) with a general international travel prompt. Both prompts include the full serialized taste profile.

### Data Model

- **Sessions**: UUID-based, created on first visit, stored in localStorage
- **Content Sources**: Links or uploaded images with extraction status and results
- **Taste Profiles**: Six numeric dimensions + four tag arrays + budget tier + raw AI analysis JSON
- **Trips**: Date range, regions, travel party, description
- **Chat Messages**: Persisted with parsed recommendations/itinerary JSON, AI provider and model metadata
- **Itineraries**: Structured day-by-day plans with activities

---

## Design Language

The UI uses a muted blue-gray palette (`--primary: #8ba4b8`) with white cards on a light gray background (`#e2e6eb`). Components use consistent `rounded-2xl` corners, subtle shadows, and the Geist font family. Interactive elements follow a pill/chip pattern (rounded-full) for tags, filters, and status badges. The overall aesthetic is calm and minimal — intended to feel like a premium planning tool rather than a cluttered travel aggregator.

# TravelAI — Garden Pastel Style Guide

> This document defines the visual language for TravelAI. Use `design-tokens.js` for all color, spacing, radius, shadow, and typography values. Every spec below references tokens from that file.

---

## Core Principles

1. **No 90-degree corners** — Every element has a minimum border-radius of 8px (`radius.xs`). Cards use `radius.2xl` (32px), buttons and chips use `radius.full` (pill), inputs use `radius.lg` (20px).
2. **User autonomy over AI authority** — The UI should give users control (toggles, sliders, selectable chips, accept/reject patterns) rather than presenting AI output as final. Every AI suggestion should have an interactive response mechanism.
3. **Distinct multi-color identity** — The 5 brand colors (lavender, rose, mint, amber, sky) each have a clear role. Tags, sliders, and status badges use different colors so elements are instantly distinguishable.
4. **Soft and organic** — Lavender-tinted neutrals, pastel tint backgrounds, subtle shadows, generous rounding. The aesthetic is premium and calm, not clinical.
5. **Content first** — The UI stays soft so user content (mood board images, trip photos) stands out. Gradients and bold colors are used sparingly at high-impact moments.

---

## Typography

Three typefaces, each with a clear role:

| Role | Font | Usage |
|------|------|-------|
| **Headings** | Fraunces (variable serif) | Page titles, trip names, card headings, section labels |
| **Body** | Nunito Sans | All body text, buttons, labels, nav, form text, tags |
| **Mono** | JetBrains Mono | Timestamps in itinerary, hex values, technical labels |

### Type Scale

**Headings (Fraunces):**
- Display: 40px / w700 — page hero titles
- H1: 32px / w700 — page titles ("Plan a new trip", "Your Trips")
- H2: 26px / w600 — section titles ("Your Taste Profile", "Your Mood Board")
- H3: 22px / w600 — card titles, day headers
- H4: 18px / w600 — sub-headings, trip card titles
- Label: 14px / w500 — small heading labels

**Body (Nunito Sans):**
- Body LG: 18px / w400 — primary content paragraphs, AI chat messages
- Body: 16px / w400 — standard body text, input text
- Body SM: 14px / w400 — secondary text, dates, metadata, travel party
- Button: 15px / w600 — all button labels
- Caption: 13px / w500 — tags, badges, helper text
- Overline: 12px / w600 / uppercase / 1px letter-spacing — section labels like "AESTHETIC STYLES", "BUDGET TIER"

### Google Fonts Import
```
https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Nunito+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## Color System

### 5 Brand Colors

Each has a 10-step tint scale (50–900). The **400** shade is the default for each color.

| Color | Role | Default (400) |
|-------|------|---------------|
| **Lavender** | Primary — CTAs, nav, chat bubbles, main actions, accommodation tags | `#7B82C7` |
| **Rose** | Secondary — food tags, errors, destructive actions, warmth accents | `#E0949D` |
| **Mint** | Tertiary — success states, nature/activity tags, confirmations | `#5DB888` |
| **Amber** | Highlight — warnings, stars, budget, brainstorming status, saved items | `#E4B840` |
| **Sky** | Utility — transport tags, info callouts, tips, time indicators, links | `#5C9AC5` |

### Neutral Ramp (Lavender-tinted)

The neutrals have a slight lavender/violet undertone to harmonize with the brand palette. **Do not use pure gray.**

| Token | Hex | Usage |
|-------|-----|-------|
| `n.0` | `#FFFFFF` | Surface backgrounds (cards, modals) |
| `n.50` | `#F8F7FB` | Page background |
| `n.100` | `#F0EFF4` | Hover surfaces, AI chat bubble bg, subtle dividers |
| `n.200` | `#E8E5F0` | Default borders, card outlines |
| `n.300` | `#D6D3E0` | Input borders (default state) |
| `n.400` | `#B5B2C2` | Placeholder text |
| `n.500` | `#9595AD` | Muted/secondary text |
| `n.600` | `#76758C` | Secondary text, inactive nav |
| `n.700` | `#5A596E` | Input labels |
| `n.800` | `#3E3D50` | Strong secondary text |
| `n.900` | `#2E2F40` | Primary text |
| `n.950` | `#1E1F2E` | Heaviest text (rare) |

### Tint Pattern for Backgrounds

When a brand color is used as a background (tag bg, alert bg, selected state), use the **50** shade for the background and the **600** shade for the text. Example:
- Tag background: `lavender.50` (`#F0EFF8`), tag text: `lavender.600` (`#555CA0`)
- Alert background: `mint.50` (`#E6F5ED`), alert text: `mint.700` (`#2E6347`)

Alternatively, for subtle tinted backgrounds in code, append `14` (8% opacity) to the 400-shade hex: `${color}14`.

### Signature Gradient

Three core brand colors in a 135° gradient. Used **sparingly** — only for:
- App logo/icon
- Trip card header fills (at low opacity: `lavender.400 @ 22%, rose.400 @ 18%, mint.300 @ 16%`)
- AI assistant avatar
- Loading/skeleton states
- Hero moments

```css
/* Full gradient */
background: linear-gradient(135deg, #7B82C7, #E0949D, #7EC4A0);

/* Subtle card header fill */
background: linear-gradient(135deg, #7B82C722, #E0949D18, #7EC4A016);
```

---

## Spacing

Base-4 system. All padding, margins, and gaps use these values.

| Token | Value | Common usage |
|-------|-------|-------------|
| `1` | 4px | Tight inner gaps |
| `2` | 8px | Tag gaps, tight chip spacing |
| `3` | 12px | Compact padding, list item vertical padding |
| `4` | 16px | Card inner padding, standard gap |
| `5` | 20px | Section padding |
| `6` | 24px | Card padding, generous gaps |
| `8` | 32px | Section spacing |
| `10` | 40px | Large section gaps |
| `12` | 48px | Page section vertical rhythm |
| `16` | 64px | Major vertical spacing |

---

## Border Radius

**No 90-degree corners anywhere.** Minimum is 8px.

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 8px | Color swatches, inline code, small utility elements |
| `sm` | 12px | Chat bubble tails (the "pointed" corner) |
| `md` | 16px | Logo mark, medium containers |
| `lg` | 20px | Text inputs, textareas, alerts |
| `xl` | 24px | Recommendation cards, dropzone, nav bar, modals |
| `2xl` | 32px | Trip cards, main surface cards, large panels |
| `full` | 9999px | Buttons, tags, chips, pills, status badges, avatars, sliders |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `0 1px 2px rgba(46,47,64,0.05)` | Cards at rest, filled buttons |
| `md` | `0 2px 8px rgba(46,47,64,0.08)` | Cards on hover, slider thumbs |
| `lg` | `0 4px 16px rgba(46,47,64,0.10)` | Modals, popovers |
| `xl` | `0 8px 30px rgba(46,47,64,0.12)` | Large overlays |
| `glow` | `0 4px 20px ${color}30` | User chat bubble (lavender glow), active elements |

---

## Components

### Buttons

**Shape:** Always `border-radius: full` (pill-shaped). Never square or slightly-rounded.

**Sizes:**
| Size | Font | Padding |
|------|------|---------|
| `sm` | 13px / w600 | 8px 16px |
| `md` | 15px / w600 | 11px 24px |
| `lg` | 17px / w600 | 14px 32px |

**Variants:**
| Variant | Background | Text | Border | Shadow |
|---------|-----------|------|--------|--------|
| `filled` | `{color}` | white | none | `shadow.sm` |
| `soft` | `{color}` at 8% opacity | `{color}` | 1.5px `{color}` at 19% opacity | none |
| `outline` | transparent | `{color}` | 1.5px `{color}` at 27% opacity | none |
| `ghost` | transparent | `{color}` | none | none |

**Disabled state:** `opacity: 0.45`, `cursor: default`.

**Color mapping:**
- Primary actions (Plan trip, Generate profile): `lavender.400` filled
- Destructive (Remove, Delete): `rose.400` filled or ghost
- Confirm/Success: `mint.400` filled
- Secondary (Save idea): `amber.500` soft
- Info (View tips): `sky.400` soft

**Icons:** Placed before label text with 6px gap. Icon font size = button font size + 2px.

---

### Tags / Chips

**Shape:** Always `border-radius: full` (pill). Inline-flex, center-aligned.

**Sizes:**
| Size | Font | Padding |
|------|------|---------|
| `sm` | 12px / w500 | 4px 10px |
| `md` | 13px / w500 | 5px 13px |
| `lg` | 15px / w500 | 6px 16px |

**Style:** Background is the color at 8% opacity (`${color}14`), text is the raw color value.

**Removable tags:** Append a `✕` character with `opacity: 0.6`, font size 1px smaller than tag text, with 2px left margin.

**Itinerary category tags:**
- Food: `rose.400`
- Activity: `mint.400`
- Transport: `sky.400`
- Accommodation: `lavender.400`
- Free Time: `amber.400`

**Region tags** on trip cards should cycle through brand colors for visual variety.

**Aesthetic style tags and budget tier selectors** should be the **same size** — both use 13px font, `6px 14px` padding, `border-radius: full`.

---

### Status Badges

Pill-shaped with a small colored dot (6px circle) before the label text.

- **Brainstorming:** `amber.500`
- **Planning:** `lavender.400`
- **Finalized:** `mint.500`

Style: `background: ${color}14`, `color: ${color}`, `padding: 5px 14px`, `font: 13px / w600`, `border-radius: full`.

---

### Cards

**General card style:**
- Background: `neutrals.0` (white)
- Border: `1px solid neutrals.200`
- Border-radius: `radius.2xl` (32px)
- Shadow: `shadow.sm` at rest
- Transition: `all 0.2s ease`

#### Trip Card (Dashboard)
- **Header:** 88px tall, filled with the subtle brand gradient. Contains decorative translucent circles (mint and rose) and a status badge at bottom-left.
- **Body:** 20px padding. Trip title (Fraunces H4, 18px), date/party metadata (Nunito 14px, `n.500`), then region tags in a flex row with 6px gap.
- Entire card is clickable (`cursor: pointer`).

#### Recommendation Card (Chat)
- Border-radius: `radius.xl` (24px)
- Padding: `spacing.6` (24px)
- Header row: trip name (Fraunces H4, 18px) left, vibe match percentage badge right (mint.50 bg, mint.600 text, full-round, 13px)
- Description: 14px body text, `n.600`
- Highlight tags: flex row, cycling through lavender/rose/amber/sky
- CTA: small lavender filled button ("Plan this trip →")

#### Itinerary Day Card
- Day header: Fraunces H3 (22px) + date in 14px `n.500`
- Activities listed vertically with:
  - Left column: timestamp in mono (12px, `n.500`) + vertical colored rail (3px wide, category color at 40% opacity, `border-radius: full`)
  - Right column: activity title (Fraunces 16px w600) + category tag + optional tip text (14px, `n.500`)
  - Divider: `1px solid n.100` between items

---

### Form Elements

#### Text Input
- Background: `neutrals.0`
- Border: `1.5px solid neutrals.300` (focus: `lavender.400`)
- Border-radius: `radius.lg` (20px)
- Padding: `12px 16px`
- Font: Nunito Sans 16px
- Placeholder color: `neutrals.400`
- Label: Nunito Sans 14px / w600, `neutrals.700`, 6px margin-bottom

#### Textarea
- Same as text input but with `min-height: 100px` and `line-height: 1.5`

#### Dropzone (compact)
- Layout: horizontal flex (icon left, text right), centered
- Border: `2px dashed lavender.200`
- Border-radius: `radius.xl` (24px)
- Padding: `16px 24px`
- Background: `lavender.50` at 60% opacity
- Icon: 20px emoji, `lavender.300` color
- Title: Nunito 15px / w600, `n.700`
- Subtitle: Nunito 13px, `n.500`
- **Keep compact** — this is a secondary element, not the focus of any page.

---

### Taste Profile Sliders

Each slider dimension uses a **different brand color**:
- Adventure: `lavender.400`
- Nature: `rose.400`
- Activity: `mint.400`
- Luxury: `amber.400`
- Cultural: `sky.400`
- Social: `lavender.300`

**Structure:**
- Label row: dimension name left (Nunito 14px w500, `n.800`), value right (Nunito 14px w600, in the slider's color)
- Track: 6px tall, `border-radius: full`, background is the color at 9% opacity (`${color}18`)
- Fill: same height, fills left-to-right to the value percentage, solid color, `border-radius: full`
- **Thumb:** 22×22px circle filled with the slider's brand color (via `--slider-color` CSS variable), with a white ✦ four-pointed star SVG (10×10px) centered inside. White 2px border, `shadow: 0 2px 8px rgba(46,47,64,0.15)`, `cursor: grab`. Each dimension's thumb matches its track color (e.g., lavender for Adventure, rose for Nature, mint for Activity).
- Endpoint labels: "Low" / "High" in 11px `n.400`, below the track

---

### Interactive Controls

#### Toggle Switch
- Track: 48×26px, `border-radius: full`
- On state: track fills with brand color, thumb slides right
- Off state: track is `neutrals.300`, thumb is left
- Thumb: 22×22px white circle, `shadow.sm`
- Label: Nunito 15px / w500, left of toggle. Color is `n.900` when on, `n.500` when off.
- Transition: `all 0.3s ease`

#### Segmented Control
- Container: `neutrals.100` background, `border-radius: full`, 3px padding
- Active segment: white background, `shadow.sm`, `n.900` text, w600
- Inactive segment: transparent background, `n.500` text, w400
- Font: Nunito 14px
- Padding per segment: `8px 20px`

#### Selectable Chips (Travel Style)
- Layout: horizontal flex wrap with 8px gap
- Each chip: inline-flex, icon (16px) + label (Nunito 14px), 8px gap, `padding: 9px 18px`, `border-radius: full`
- **Selected:** background `${color}14`, border `1.5px solid ${color}`, text color `${color}`, w600
- **Unselected:** background `neutrals.0`, border `1.5px solid neutrals.200`, text `neutrals.600`, w400
- **No checkmarks** — selection state is communicated purely through color change.

#### Range Slider (Dual Thumb)
- Track: 6px tall, `neutrals.200`, `border-radius: full`
- Active range: filled in brand color between the two thumbs
- Thumbs: 24×24px white circles, `2px solid ${color}`, `shadow.md`, `cursor: grab`
- Value labels below: Nunito 14px / w600 in the brand color

#### Reorderable List
- Each item: flex row, white background, `1px solid n.200`, `radius.lg`, `padding: 12px 16px`, 8px bottom margin
- Drag handle: `⠿` character, `n.400`, left side
- Label: Nunito 15px / w500, `n.800`
- Category tag: right side, small
- Position number: mono 12px, `n.400`, far right

#### Accept/Reject AI Suggestions
- Suggestion card: `lavender.50` bg, `1px solid lavender.200`, `radius.lg`, 16px padding
- Header: ✦ icon + "AI Suggestion" label in `lavender.500`, 13px caption
- Body: Nunito 15px, `n.800`
- Actions: Accept (mint filled sm), Dismiss (rose ghost sm), Modify (neutral ghost sm)
- Accepted state: `mint.50` bg, `1px solid mint.200`, green text confirmation, `opacity: 0.7`

---

### Chat Interface

#### User Message
- Background: `linear-gradient(135deg, lavender.400, lavender.500)`
- Text: white, Nunito 15px, `line-height: 1.55`
- Padding: `14px 18px`
- Border-radius: `24px 24px 12px 24px` (tail bottom-right)
- Shadow: `glow(lavender.400)`
- Max-width: 72%
- Aligned right

#### AI Message
- Background: `neutrals.100`
- Text: `neutrals.900`, Nunito 15px, `line-height: 1.55`
- Padding: `14px 18px`
- Border-radius: `24px 24px 24px 12px` (tail bottom-left)
- Max-width: 90% (wider than user bubbles to accommodate longer AI responses)
- Aligned left
- **Avatar:** 30×30px circle showing the app logo (`/logo.png`), `object-cover`, `border-radius: full`

---

### Alerts / Feedback

Four states, each mapped to a brand color:

| Type | Color Scale | Icon |
|------|------------|------|
| Success | `mint` | ✓ |
| Error | `rose` | ✕ |
| Warning | `amber` | ! |
| Info | `sky` | i |

**Structure:**
- Container: `{color}.50` bg, `1px solid {color}.200`, `radius.lg`, `padding: 12px 16px`
- Icon: 24×24px circle, `{color}.600` bg, white icon text (13px w700)
- Message: Nunito 14px / w500, `{color}.700`

---

### Navigation Bar

- Background: `neutrals.0`
- Border: `1px solid neutrals.200`
- Padding: `16px 24px`
- Logo: 36×36px square with `radius.sm` (12px). Design: lavender background with a cream serif "D" and a winding path through it with rose and mint dashed lines
- Logo–brand gap: 10px. Brand–nav gap: 32px.
- Brand name: Fraunces 20px / w700, `neutrals.900`
- Nav items: Nunito 15px / w500, `neutrals.500` inactive, `lavender.500` active
- Active item: `lavender.50` background, `border-radius: full`, `padding: 10px 20px`
- Inactive item: same padding, transparent background

---

### Auto-save Indicator

- "Saving...": 6px amber dot (pulsing/reduced opacity), "Saving..." text in amber.400
- "Saved": 6px mint dot (full opacity), "Saved" text in mint.400
- Font: Nunito 13px / w500

---

### Empty State

- Centered layout, 56px vertical padding
- Icon container: 72×72px, `radius.xl`, subtle brand gradient background, large emoji centered
- Title: Fraunces 24px / w700
- Description: Nunito 16px, `n.500`, max-width 360px, `line-height: 1.5`
- CTA: large lavender filled button with ✦ icon

---

## Page-Specific Notes

### Trip Creation (`/trip/new`)
- **Keep the side-by-side dual-month calendar layout** — this is a deliberate design choice, do not change the layout.
- Left panel: form fields. Right panel: dual-month range calendar.
- Segmented control for "Exact dates" / "I'm flexible" toggle.
- Travel style preferences should use the **selectable chip** pattern (horizontal pills, color change on select, no checkmarks).
- **Budget tier pills:** selected state uses `amber.400` (white text), unselected uses `n.200` border with `n.500` text, hover uses `amber.50` bg with `amber.600` text. Must match the profile page budget tier styling.

### Dashboard (`/`)
- **Page heading area:** "Welcome back" (Body, 16px, `n.500`) above H1 "Your Trips" (32px). On mobile (<640px), the "Plan a new trip" CTA stacks below the heading as a full-width button. On sm+ it sits inline to the right.
- **Section spacing:** 32px between major sections (heading, filters, cards).
- Trip cards in a responsive grid (1 col mobile, 2 col sm, 3 col lg). **Upcoming/past group gap:** 40px.
- Filter bar uses the **filter pill** pattern (active = lavender filled, inactive = neutral)
- Sort uses the **segmented control** pattern

### Trip Workspace (`/trip/[id]`)
- **Trip header:** Three-row layout on mobile, collapsing to inline on desktop:
  - Row 1: "← Dashboard" back button (left) + "Share" button (right)
  - Row 2: Trip title (H1) + subtitle (dates, travel party)
  - Row 3 (mobile only): Chat/Itinerary tab toggle (full-width segmented control)
- **Trip title responsive sizing:** 22px mobile → 26px sm → 32px lg. Subtitle: 14px mobile → 16px sm+.
- **Section spacing:** 24px between header and content panes.
- Recommendation cards rendered inline below AI messages
- Each recommendation has a "Plan this trip →" CTA
- AI suggestions for itinerary changes use the **accept/reject** pattern

### Profile (`/profile`)

The profile page has two columns: left (content sources + mood board) and right (taste profile card, sticky).

#### Left Column
- **URL input bar + Upload button:** horizontal row on sm+ screens, stacks vertically on mobile (<640px). Input uses standard text input style. "Extract" button is small lavender filled. "Upload photos" button is small outline with centered text on mobile.
- **Mood board:** masonry grid of content source images with source labels overlaid at bottom-left.
- **AI Summary paragraph:** This is the "Based on your Pinterest board..." text block. Uses `Body` size (16px), `neutrals.600` color, `line-height: 1.6`. Sits inside a subtle card with `lavender.50` background, `radius.lg`, `16px` padding. **Do not use a smaller font size here — this is meaningful content the user should read comfortably.**
- **"Regenerate profile" button:** ghost lavender, centered below the summary.

#### Right Column — Taste Profile Card
This is a sticky card with clear visual hierarchy:

- **"Your Taste Profile"** — H2 (Fraunces 26px / w600). Same level as "Your Mood Board" on the left column — both are peer section headings.
- **"Taste Dimensions"** — H3 (Nunito 14px / w600, uppercase, `0.5px letter-spacing`, `neutrals.500`). A sub-heading within the taste profile card, clearly subordinate to the card title but distinct from the individual dimension overline labels.
- **Dimension names** ("ADVENTURE", "NATURE", etc.) — Overline style (Nunito 12px / w600, uppercase, `1px letter-spacing`, `neutrals.500`). These are the smallest labels in the hierarchy.
- **Dimension values** ("7/10") — Nunito 14px / w600, colored in the slider's brand color. Aligned right.
- **Slider track** — **CRITICAL: The track line MUST be visible.** It is a 6px tall bar spanning the full width, with `border-radius: full`, background `${color}18` (the slider's brand color at ~9% opacity). The filled portion uses the solid brand color. Without the track, sliders look like floating circles with no context.
- **Slider thumb** — 22×22px circle in the slider's brand color with a white ✦ star centered inside, 2px white border (see Taste Profile Sliders section).
- **Endpoint labels** — ("comfort"/"thrills", "urban"/"outdoors", etc.) Nunito 11px, `neutrals.400`, below the track, flex space-between.
- **Section divider** — `1px solid neutrals.100` between the sliders section and the tag arrays section.
- **Tag array section labels** ("AESTHETIC STYLES", "CUISINE INTERESTS", "VIBE KEYWORDS", "TRAVEL THEMES") — Overline style (12px uppercase, `n.500`).
- **Tag section internal spacing:** 14px (`mb-3.5`) between the overline label and the tag row below it. The label must be a **block element** (`<p>`) — using an inline `<span>` with `space-y` won't create proper vertical spacing. 24px between each tag section group. This ensures the tag sections have similar visual rhythm to the slider blocks above.
- **Tags** — All tag arrays use the **same size** as the budget tier selector: 13px font, `6px 14px` padding, pill-shaped, removable with ✕. They should wrap naturally in a flex row with 8px gap.
- **"+ Add" button** — Dashed outline pill, same size as tags, `neutrals.400` border and text.
- **Budget tier** — Same-size pills as tags, with selected state using `amber.400` filled (white text) and unselected using `neutrals.100` bg.

#### Common Mistakes to Avoid
1. **Missing slider tracks** — The most common bug. The colored track line must be rendered. Without it, the thumb circle floats in empty space. **Important:** CSS variables like `var(--color-lavender-400)` cannot be concatenated with hex opacity suffixes like `18`. Use raw hex values (e.g., `#7B82C718`) for the track gradient.
2. **AI summary text too small** — The "Based on your..." paragraph should be 16px, not 12px or 13px.
3. **Flat heading hierarchy** — Three distinct levels required: "Your Taste Profile" (H2, 26px semibold, Fraunces) = "Your Mood Board" (same level) > "Taste Dimensions" (H3, 14px uppercase semibold, Nunito) > "ADVENTURE" (overline, 12px uppercase). The two main section headings ("Mood Board" and "Taste Profile") must be the same size.
4. **Inconsistent section labels** — "AESTHETIC STYLES", "CUISINE INTERESTS", "VIBE KEYWORDS", "TRAVEL THEMES", and "BUDGET TIER" all use overline style (12px). "Taste Dimensions" uses a slightly larger sub-heading style (14px uppercase) to group the sliders as a unit.
5. **Budget tier color inconsistency** — Budget selectors always use `amber.400` for the selected state (white text), both in the profile taste card and in the trip creation form. Do not use `lavender.400` for budget.
6. **Slider thumb misalignment on WebKit** — When the track element has `height: 0`, WebKit positions the thumb's top edge at the track line, not centered. Fix with `margin-top: -(thumbHeight/2)` on `::-webkit-slider-thumb`.

- Dropzone is compact (horizontal layout, minimal height)

### 404 / Not Found Page
- Full-viewport centered layout with `n.50` background
- Compass icon in a 64×64px container with subtle brand gradient background and `radius.xl`
- Title: Fraunces 32px / w700, "Page not found"
- Description: Nunito 16px, `n.500`, max-width 384px, relaxed line-height
- CTA: large lavender filled button ("Back to Dashboard")

---

## Responsive Patterns

These responsive breakpoints apply across the app:

| Breakpoint | Width | Key changes |
|-----------|-------|-------------|
| Default (mobile) | <640px | Single column, stacked layouts, smaller headings |
| `sm` | ≥640px | Side-by-side layouts resume (dashboard CTA, profile input bar) |
| `lg` | ≥1024px | Full desktop layout (trip workspace side-by-side, 3-col grids) |

**Mobile-specific adaptations:**
- **Dashboard:** H1 + "Plan a new trip" CTA stack vertically; CTA becomes full-width
- **Profile:** URL input bar + Upload button stack vertically
- **Trip workspace:** Title shrinks to 22px; back/share buttons on own row; Chat/Itinerary toggle becomes full-width below the title; subtitle uses 14px
- **Trip cards:** single column
- **New trip form:** calendar hidden (native date inputs shown instead)

---

## Tailwind CSS 4 Integration

Add these custom properties to your global CSS `@theme` block:

```css
@import "tailwindcss";

@theme {
  /* Brand Colors */
  --color-lavender-50: #F0EFF8;
  --color-lavender-100: #E2E0F2;
  --color-lavender-200: #C5C2E5;
  --color-lavender-300: #A8A4D8;
  --color-lavender-400: #7B82C7;
  --color-lavender-500: #6970B5;
  --color-lavender-600: #555CA0;
  --color-lavender-700: #434A82;
  --color-lavender-800: #333964;
  --color-lavender-900: #242846;

  --color-rose-50: #FDF0F1;
  --color-rose-100: #FADCE0;
  --color-rose-200: #F4B8C0;
  --color-rose-300: #ED95A1;
  --color-rose-400: #E0949D;
  --color-rose-500: #D07A84;
  --color-rose-600: #B8616B;
  --color-rose-700: #9A4D57;
  --color-rose-800: #7A3B43;
  --color-rose-900: #5A2B32;

  --color-mint-50: #E6F5ED;
  --color-mint-100: #D0EDDE;
  --color-mint-200: #A8DBBE;
  --color-mint-300: #7EC4A0;
  --color-mint-400: #5DB888;
  --color-mint-500: #4A9B70;
  --color-mint-600: #3A7E5A;
  --color-mint-700: #2E6347;
  --color-mint-800: #234A35;
  --color-mint-900: #1A3426;

  --color-amber-50: #FFF7E6;
  --color-amber-100: #FFEFC4;
  --color-amber-200: #FFDF8A;
  --color-amber-300: #F5CB5C;
  --color-amber-400: #E4B840;
  --color-amber-500: #CFA12E;
  --color-amber-600: #B58A22;
  --color-amber-700: #8F6C1A;
  --color-amber-800: #6A5014;
  --color-amber-900: #4A380E;

  --color-sky-50: #EBF4FA;
  --color-sky-100: #D4E8F4;
  --color-sky-200: #AAD2EA;
  --color-sky-300: #7BAED4;
  --color-sky-400: #5C9AC5;
  --color-sky-500: #4482AF;
  --color-sky-600: #366A90;
  --color-sky-700: #2A5372;
  --color-sky-800: #1F3E55;
  --color-sky-900: #162C3C;

  /* Neutrals (lavender-tinted) */
  --color-neutral-0: #FFFFFF;
  --color-neutral-50: #F8F7FB;
  --color-neutral-100: #F0EFF4;
  --color-neutral-200: #E8E5F0;
  --color-neutral-300: #D6D3E0;
  --color-neutral-400: #B5B2C2;
  --color-neutral-500: #9595AD;
  --color-neutral-600: #76758C;
  --color-neutral-700: #5A596E;
  --color-neutral-800: #3E3D50;
  --color-neutral-900: #2E2F40;
  --color-neutral-950: #1E1F2E;

  /* Border Radius — no sharp corners */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(46,47,64,0.05);
  --shadow-md: 0 2px 8px rgba(46,47,64,0.08);
  --shadow-lg: 0 4px 16px rgba(46,47,64,0.10);
  --shadow-xl: 0 8px 30px rgba(46,47,64,0.12);

  /* Fonts */
  --font-heading: 'Fraunces', Georgia, serif;
  --font-body: 'Nunito Sans', 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

Then use in components: `className="bg-lavender-50 text-lavender-600 rounded-full"`, etc.

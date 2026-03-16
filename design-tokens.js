/**
 * TravelAI — Garden Pastel Design Tokens
 * ========================================
 * Import this file to access all design tokens programmatically.
 *
 * Usage:
 *   import { colors, neutrals, typography, spacing, radius, shadow, semantic } from '@/lib/design-tokens';
 *
 * With Tailwind CSS 4, map these into your global CSS as custom properties
 * (see STYLE_GUIDE.md for the full @theme block).
 */

// ─── Brand Colors ──────────────────────────────────────────────
// 5 scales, each with 10 steps (50–900). The 400 shade is the default.

export const colors = {
  lavender: {
    50:  "#F0EFF8",
    100: "#E2E0F2",
    200: "#C5C2E5",
    300: "#A8A4D8",
    400: "#7B82C7",
    500: "#6970B5",
    600: "#555CA0",
    700: "#434A82",
    800: "#333964",
    900: "#242846",
  },
  rose: {
    50:  "#FDF0F1",
    100: "#FADCE0",
    200: "#F4B8C0",
    300: "#ED95A1",
    400: "#E0949D",
    500: "#D07A84",
    600: "#B8616B",
    700: "#9A4D57",
    800: "#7A3B43",
    900: "#5A2B32",
  },
  mint: {
    50:  "#E6F5ED",
    100: "#D0EDDE",
    200: "#A8DBBE",
    300: "#7EC4A0",
    400: "#5DB888",
    500: "#4A9B70",
    600: "#3A7E5A",
    700: "#2E6347",
    800: "#234A35",
    900: "#1A3426",
  },
  amber: {
    50:  "#FFF7E6",
    100: "#FFEFC4",
    200: "#FFDF8A",
    300: "#F5CB5C",
    400: "#E4B840",
    500: "#CFA12E",
    600: "#B58A22",
    700: "#8F6C1A",
    800: "#6A5014",
    900: "#4A380E",
  },
  sky: {
    50:  "#EBF4FA",
    100: "#D4E8F4",
    200: "#AAD2EA",
    300: "#7BAED4",
    400: "#5C9AC5",
    500: "#4482AF",
    600: "#366A90",
    700: "#2A5372",
    800: "#1F3E55",
    900: "#162C3C",
  },
};

// ─── Neutrals (lavender-tinted grays) ──────────────────────────

export const neutrals = {
  0:   "#FFFFFF",
  50:  "#F8F7FB",
  100: "#F0EFF4",
  200: "#E8E5F0",
  300: "#D6D3E0",
  400: "#B5B2C2",
  500: "#9595AD",
  600: "#76758C",
  700: "#5A596E",
  800: "#3E3D50",
  900: "#2E2F40",
  950: "#1E1F2E",
};

// ─── Typography ────────────────────────────────────────────────
// Google Fonts URL (add to <head> or use next/font):
// https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Nunito+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap

export const typography = {
  fonts: {
    heading: "'Fraunces', Georgia, serif",
    body:    "'Nunito Sans', 'Segoe UI', sans-serif",
    mono:    "'JetBrains Mono', 'Fira Code', monospace",
  },
  scale: {
    // Headings — Fraunces
    display:  { size: 40, weight: 700, font: "heading", lineHeight: 1.2 },
    h1:       { size: 32, weight: 700, font: "heading", lineHeight: 1.25 },
    h2:       { size: 26, weight: 600, font: "heading", lineHeight: 1.3 },
    h3:       { size: 22, weight: 600, font: "heading", lineHeight: 1.35 },
    h4:       { size: 18, weight: 600, font: "heading", lineHeight: 1.4 },
    label:    { size: 14, weight: 500, font: "heading", lineHeight: 1.4 },
    // Body — Nunito Sans
    bodyLg:   { size: 18, weight: 400, font: "body", lineHeight: 1.55 },
    body:     { size: 16, weight: 400, font: "body", lineHeight: 1.55 },
    bodySm:   { size: 14, weight: 400, font: "body", lineHeight: 1.5 },
    button:   { size: 15, weight: 600, font: "body", lineHeight: 1 },
    caption:  { size: 13, weight: 500, font: "body", lineHeight: 1.4 },
    overline: { size: 12, weight: 600, font: "body", lineHeight: 1.4, letterSpacing: "1px", textTransform: "uppercase" },
  },
};

// ─── Spacing (base-4) ──────────────────────────────────────────

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

// ─── Border Radius ─────────────────────────────────────────────
// RULE: No 90-degree corners anywhere. Minimum radius is 8px.

export const radius = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   20,
  xl:   24,
  "2xl": 32,
  full: 9999,
};

// ─── Shadows ───────────────────────────────────────────────────

export const shadow = {
  sm:  "0 1px 2px rgba(46,47,64,0.05)",
  md:  "0 2px 8px rgba(46,47,64,0.08)",
  lg:  "0 4px 16px rgba(46,47,64,0.10)",
  xl:  "0 8px 30px rgba(46,47,64,0.12)",
  /** Colored glow — pass a hex color, e.g. shadow.glow("#7B82C7") */
  glow: (color) => `0 4px 20px ${color}30`,
};

// ─── Navigation Bar ──────────────────────────────────────────
export const nav = {
  padding: "16px 24px",
  logo: { size: 36, borderRadius: radius.sm },
  brandName: { size: 20, weight: 700, font: "heading" },
  item: { size: 15, weight: 500, font: "body", padding: "10px 20px" },
  activeItem: { bg: colors.lavender[50], text: colors.lavender[500] },
  inactiveItem: { text: neutrals[500] },
  brandGap: 10,  // gap between logo and brand name
  navGap: 32,    // gap between brand and nav links
};

// ─── Chat Bubbles ────────────────────────────────────────────
export const chat = {
  user: { maxWidth: "72%", borderRadius: "24px 24px 12px 24px" },
  assistant: { maxWidth: "90%", borderRadius: "24px 24px 24px 12px" },
  avatar: { size: 30, borderRadius: "full" },
  font: { size: 15, lineHeight: 1.55 },
};

// ─── Responsive Breakpoints ──────────────────────────────────
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// ─── Semantic Tokens ───────────────────────────────────────────
// These map design intent to specific color values.

export const semantic = {
  // Backgrounds
  bgPage:           neutrals[50],
  bgSurface:        neutrals[0],
  bgSurfaceHover:   neutrals[100],

  // Borders
  borderDefault:    neutrals[200],
  borderSubtle:     neutrals[100],

  // Text
  textPrimary:      neutrals[900],
  textSecondary:    neutrals[600],
  textMuted:        neutrals[500],
  textInverse:      neutrals[0],

  // Actions
  actionPrimary:      colors.lavender[400],
  actionPrimaryHover: colors.lavender[500],
  actionSecondary:    colors.rose[400],
  actionTertiary:     colors.mint[400],

  // Trip Statuses
  statusBrainstorming: colors.amber[300],
  statusPlanning:      colors.lavender[400],
  statusFinalized:     colors.mint[400],

  // Itinerary Categories
  tagFood:           colors.rose[400],
  tagActivity:       colors.mint[400],
  tagTransport:      colors.sky[400],
  tagAccommodation:  colors.lavender[400],
  tagFreeTime:       colors.amber[400],

  // Budget tier (always amber — both profile and trip form)
  budgetSelected:    colors.amber[400],
  budgetSelectedText: neutrals[0],
  budgetHoverBg:     colors.amber[50],
  budgetHoverText:   colors.amber[600],

  // Feedback
  feedbackSuccess:   colors.mint[500],
  feedbackError:     colors.rose[500],
  feedbackWarning:   colors.amber[400],
  feedbackInfo:      colors.sky[400],

  // Signature Gradient (3 core brand colors)
  gradientBrand: `linear-gradient(135deg, ${colors.lavender[400]}, ${colors.rose[400]}, ${colors.mint[300]})`,
  gradientBrandSubtle: `linear-gradient(135deg, ${colors.lavender[400]}22, ${colors.rose[400]}18, ${colors.mint[300]}16)`,
};

export interface TasteProfile {
  id?: string;
  session_id: string;
  adventure: number;
  nature: number;
  activity: number;
  luxury: number;
  cultural: number;
  social: number;
  aesthetic_styles: string[];
  cuisine_interests: string[];
  vibe_keywords: string[];
  travel_themes: string[];
  budget_tier: "budget" | "moderate" | "luxury" | "ultra-luxury";
  raw_analysis?: Record<string, unknown>;
}

export interface ContentSource {
  id?: string;
  session_id: string;
  source_type: "pinterest_url" | "rednote_url" | "uploaded_image" | "instagram_url" | "tiktok_url" | "douyin_url" | "url" | "data_export";
  source_url?: string;
  storage_path?: string;
  extracted_image_urls: string[];
  extracted_text?: string;
  status: "pending" | "processing" | "done" | "error";
}

export interface ConnectedAccount {
  id?: string;
  session_id: string;
  platform: "pinterest";
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  platform_user_id?: string;
  platform_username?: string;
  connected_at?: string;
  last_synced_at?: string;
}

export const PROFILE_DIMENSIONS = [
  { key: "adventure", label: "Adventure", description: "comfort vs thrills" },
  { key: "nature", label: "Nature", description: "urban vs outdoors" },
  { key: "activity", label: "Activity", description: "relaxed vs active" },
  { key: "luxury", label: "Luxury", description: "budget vs premium" },
  { key: "cultural", label: "Cultural", description: "leisure vs immersion" },
  { key: "social", label: "Social", description: "solo vs social" },
] as const;

export type DimensionKey = (typeof PROFILE_DIMENSIONS)[number]["key"];

import { createServerClient } from "@/lib/supabase/server";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_OAUTH_BASE = "https://www.pinterest.com/oauth";

export function getPinterestConfig() {
  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  const redirectUri = process.env.PINTEREST_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildPinterestAuthUrl(sessionId: string): string | null {
  const config = getPinterestConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "boards:read,pins:read,boards:read_secret,user_accounts:read",
    state: sessionId,
  });

  return `${PINTEREST_OAUTH_BASE}/?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const config = getPinterestConfig();
  if (!config) throw new Error("Pinterest not configured");

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const res = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Pinterest token exchange failed: ${error}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };
}

export async function refreshPinterestToken(refreshToken: string) {
  const config = getPinterestConfig();
  if (!config) throw new Error("Pinterest not configured");

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const res = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Pinterest token");
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export async function getValidToken(sessionId: string): Promise<string | null> {
  const supabase = createServerClient();

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("session_id", sessionId)
    .eq("platform", "pinterest")
    .single();

  if (!account) return null;

  // Check if token is expired (with 5-minute buffer)
  if (
    account.token_expires_at &&
    new Date(account.token_expires_at).getTime() < Date.now() + 5 * 60 * 1000
  ) {
    if (!account.refresh_token) return null;

    try {
      const refreshed = await refreshPinterestToken(account.refresh_token);

      await supabase
        .from("connected_accounts")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
        })
        .eq("id", account.id);

      return refreshed.access_token;
    } catch {
      return null;
    }
  }

  return account.access_token;
}

export async function pinterestApiFetch(
  accessToken: string,
  endpoint: string,
  params?: Record<string, string>
) {
  const url = new URL(`${PINTEREST_API_BASE}${endpoint}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Pinterest API error: ${res.status}`);
  }

  return res.json();
}

interface PinterestBoard {
  id: string;
  name: string;
  pin_count: number;
  privacy: string;
}

interface PinterestPin {
  id: string;
  title: string;
  description: string;
  media?: {
    images?: Record<string, { url: string; width: number; height: number }>;
  };
  link?: string;
}

export async function fetchPinterestBoards(
  accessToken: string
): Promise<PinterestBoard[]> {
  const boards: PinterestBoard[] = [];
  let bookmark: string | undefined;

  // Fetch up to 10 boards
  for (let i = 0; i < 4 && boards.length < 10; i++) {
    const params: Record<string, string> = { page_size: "25" };
    if (bookmark) params.bookmark = bookmark;

    const data = await pinterestApiFetch(accessToken, "/boards", params);

    if (data.items) {
      boards.push(...data.items);
    }

    bookmark = data.bookmark;
    if (!bookmark) break;
  }

  return boards.slice(0, 10);
}

export async function fetchBoardPins(
  accessToken: string,
  boardId: string,
  maxPins = 20
): Promise<PinterestPin[]> {
  const pins: PinterestPin[] = [];
  let bookmark: string | undefined;

  for (let i = 0; i < 4 && pins.length < maxPins; i++) {
    const params: Record<string, string> = { page_size: "25" };
    if (bookmark) params.bookmark = bookmark;

    const data = await pinterestApiFetch(
      accessToken,
      `/boards/${boardId}/pins`,
      params
    );

    if (data.items) {
      pins.push(...data.items);
    }

    bookmark = data.bookmark;
    if (!bookmark) break;
  }

  return pins.slice(0, maxPins);
}

export function extractPinImageUrl(pin: PinterestPin): string | null {
  const images = pin.media?.images;
  if (!images) return null;

  // Prefer largest image
  const sizes = ["1200x", "originals", "736x", "600x315", "400x300", "236x"];
  for (const size of sizes) {
    if (images[size]?.url) return images[size].url;
  }

  // Fallback to any available size
  const firstKey = Object.keys(images)[0];
  return firstKey ? images[firstKey]?.url || null : null;
}

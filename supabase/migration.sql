-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content sources (uploaded images, pasted URLs)
CREATE TABLE content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('pinterest_url', 'rednote_url', 'uploaded_image', 'instagram_url', 'tiktok_url', 'douyin_url', 'url', 'data_export')),
  source_url TEXT,
  storage_path TEXT,
  extracted_image_urls TEXT[] DEFAULT '{}',
  extracted_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taste profiles
CREATE TABLE taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  adventure INTEGER CHECK (adventure BETWEEN 1 AND 10),
  nature INTEGER CHECK (nature BETWEEN 1 AND 10),
  activity INTEGER CHECK (activity BETWEEN 1 AND 10),
  luxury INTEGER CHECK (luxury BETWEEN 1 AND 10),
  cultural INTEGER CHECK (cultural BETWEEN 1 AND 10),
  social INTEGER CHECK (social BETWEEN 1 AND 10),
  aesthetic_styles TEXT[] DEFAULT '{}',
  cuisine_interests TEXT[] DEFAULT '{}',
  vibe_keywords TEXT[] DEFAULT '{}',
  travel_themes TEXT[] DEFAULT '{}',
  budget_tier TEXT CHECK (budget_tier IN ('budget', 'moderate', 'luxury', 'ultra-luxury')),
  raw_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  regions TEXT[] DEFAULT '{}',
  trip_description TEXT,
  travel_party TEXT,
  ai_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  recommendations JSONB,
  itinerary JSONB,
  ai_provider TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itineraries
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  days JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected accounts (OAuth tokens for Pinterest etc.)
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('pinterest')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_username TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  UNIQUE(session_id, platform)
);

-- Storage bucket (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

-- Indexes
CREATE INDEX idx_content_sources_session ON content_sources(session_id);
CREATE INDEX idx_taste_profiles_session ON taste_profiles(session_id);
CREATE INDEX idx_trips_session ON trips(session_id);
CREATE INDEX idx_chat_messages_trip ON chat_messages(trip_id);
CREATE INDEX idx_itineraries_session ON itineraries(session_id);

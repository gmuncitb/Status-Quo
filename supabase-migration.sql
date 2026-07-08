-- ============================================
-- Status Quo: Supabase Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Globes table — one row per monthly globe
CREATE TABLE IF NOT EXISTS globes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month_id TEXT NOT NULL UNIQUE,         -- e.g. "2026-07"
  title TEXT NOT NULL DEFAULT '',         -- optional display title
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. News items table — one row per country news card
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  globe_id UUID NOT NULL REFERENCES globes(id) ON DELETE CASCADE,
  region TEXT NOT NULL,                   -- e.g. "asia", "europe"
  country_code TEXT NOT NULL,             -- e.g. "JPN", "USA"
  country_name TEXT NOT NULL,             -- e.g. "Japan"
  news_text TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#000000',
  affected JSONB NOT NULL DEFAULT '[]',   -- array of { countryCode, type }
  drag_dx FLOAT NOT NULL DEFAULT 0,
  drag_dy FLOAT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Enforce one news item per country per globe
  UNIQUE(globe_id, country_code)
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_news_items_globe_id ON news_items(globe_id);
CREATE INDEX IF NOT EXISTS idx_news_items_region ON news_items(globe_id, region);

-- 4. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_items_updated_at
  BEFORE UPDATE ON news_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Disable RLS (internal team tool, no auth needed)
ALTER TABLE globes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (anon key)
CREATE POLICY "Allow all on globes" ON globes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on news_items" ON news_items FOR ALL USING (true) WITH CHECK (true);

-- 6. Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE globes;
ALTER PUBLICATION supabase_realtime ADD TABLE news_items;

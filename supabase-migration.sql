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
  news_source TEXT,
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
DROP TRIGGER IF EXISTS news_items_updated_at ON news_items;
CREATE TRIGGER news_items_updated_at
  BEFORE UPDATE ON news_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Enable Row Level Security and configure secure anonymous policies
ALTER TABLE globes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow all on globes" ON globes;
DROP POLICY IF EXISTS "Allow all on news_items" ON news_items;
DROP POLICY IF EXISTS "Allow select for everyone" ON globes;
DROP POLICY IF EXISTS "Allow insert for editable months" ON globes;
DROP POLICY IF EXISTS "Allow select for everyone" ON news_items;
DROP POLICY IF EXISTS "Allow write for editable globes" ON news_items;

-- Helper function to check if a globe is editable (locks on the 5th of the following month)
CREATE OR REPLACE FUNCTION is_globe_editable(month_text text)
RETURNS boolean AS $$
DECLARE
  lock_date timestamp;
BEGIN
  -- Construct date for 1st of the month, add 1 month and 4 days to get 5th of next month
  lock_date := to_date(month_text || '-01', 'YYYY-MM-DD') + interval '1 month' + interval '4 days';
  RETURN now() < lock_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for globes table (anonymous select and insert for editable months, no updates or deletes)
CREATE POLICY "Allow select for everyone" ON globes 
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for editable months" ON globes 
  FOR INSERT WITH CHECK (is_globe_editable(month_id));

-- Policies for news_items table (anonymous select and write only if the parent globe is currently editable/unlocked)
CREATE POLICY "Allow select for everyone" ON news_items 
  FOR SELECT USING (true);

CREATE POLICY "Allow write for editable globes" ON news_items 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM globes 
      WHERE globes.id = news_items.globe_id 
      AND is_globe_editable(globes.month_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM globes 
      WHERE globes.id = news_items.globe_id 
      AND is_globe_editable(globes.month_id)
    )
  );

-- 6. Enable Realtime on both tables (checking if already member first to prevent SQL errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'globes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE globes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'news_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE news_items;
  END IF;
END $$;

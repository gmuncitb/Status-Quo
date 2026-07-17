-- Run this in your Supabase SQL Editor to apply the schema update
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS news_source TEXT;

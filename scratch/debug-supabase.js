const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseAnonKey = keyMatch[1].trim();
} catch (e) {
  console.error("Could not read .env.local manually:", e.message);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("Connecting to:", supabaseUrl);
  
  // Test globes table
  console.log("Checking 'globes' table...");
  const { data: globes, error: globesError } = await supabase
    .from('globes')
    .select('*')
    .limit(1);
  
  if (globesError) {
    console.error("Globes table error:", globesError.message, globesError.code);
  } else {
    console.log("Globes table exists! Records found:", globes.length);
  }

  // Test news_items table
  console.log("Checking 'news_items' table...");
  const { data: news, error: newsError } = await supabase
    .from('news_items')
    .select('*')
    .limit(1);

  if (newsError) {
    console.error("News_items table error:", newsError.message, newsError.code);
  } else {
    console.log("News_items table exists! Records found:", news.length);
  }
}

testConnection();

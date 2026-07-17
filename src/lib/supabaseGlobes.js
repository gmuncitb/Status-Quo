import { getSupabase } from './supabase';

// ============================================
// Globe CRUD
// ============================================

/**
 * Fetch all globes, sorted by month descending.
 */
export async function fetchGlobes() {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('globes')
    .select('*')
    .order('month_id', { ascending: false });
  if (error) {
    console.error('fetchGlobes error:', error);
    return [];
  }
  return data || [];
}

/**
 * Get or create a globe for a given monthId.
 * Returns the globe record.
 */
export async function getOrCreateGlobe(monthId) {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Try to fetch existing
  const { data: existing, error: fetchError } = await supabase
    .from('globes')
    .select('*')
    .eq('month_id', monthId)
    .single();

  if (existing) return existing;

  // Create new
  const title = formatMonthTitle(monthId);
  const { data: created, error: createError } = await supabase
    .from('globes')
    .insert({ month_id: monthId, title })
    .select()
    .single();

  if (createError) {
    console.error('createGlobe error:', createError);
    return null;
  }
  return created;
}

/**
 * Delete a globe and all its news items (cascading).
 */
export async function deleteGlobe(globeId) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('globes').delete().eq('id', globeId);
  if (error) console.error('deleteGlobe error:', error);
}

// ============================================
// News Items CRUD
// ============================================

/**
 * Fetch all news items for a globe.
 */
export async function fetchNewsItems(globeId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('globe_id', globeId)
    .order('updated_at', { ascending: true });
  if (error) {
    console.error('fetchNewsItems error:', error);
    return [];
  }
  return data || [];
}

/**
 * Upsert a news item (insert or update).
 * Uses the unique constraint (globe_id, country_code) for conflict resolution.
 */
export async function upsertNewsItem(globeId, region, item) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const row = {
    globe_id: globeId,
    region,
    country_code: item.countryCode,
    country_name: item.countryName,
    news_text: item.newsText || '',
    color: item.color || '#000000',
    affected: item.affected || [],
    drag_dx: item.dragDx ?? 0,
    drag_dy: item.dragDy ?? 0,
    news_source: item.newsSource || null,
  };

  let { data, error } = await supabase
    .from('news_items')
    .upsert(row, { onConflict: 'globe_id,country_code' })
    .select()
    .single();

  if (error) {
    console.warn('[StatusQuo] upsertNewsItem primary failed:', error.code, error.message, error.details, error.hint);
    // Fallback 1: try without news_source
    const { news_source, ...fallbackRow } = row;
    const fb1 = await supabase
      .from('news_items')
      .upsert(fallbackRow, { onConflict: 'globe_id,country_code' })
      .select()
      .single();
    
    if (fb1.error) {
      console.error('[StatusQuo] upsertNewsItem fallback1 also failed:', fb1.error.code, fb1.error.message, fb1.error.details, fb1.error.hint);
      return null;
    }
    data = fb1.data;
  }
  return data;
}

/**
 * Delete a news item by globe_id + country_code.
 */
export async function deleteNewsItem(globeId, countryCode) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('news_items')
    .delete()
    .eq('globe_id', globeId)
    .eq('country_code', countryCode);
  if (error) console.error('deleteNewsItem error:', error);
}

/**
 * Subscribe to real-time changes on news_items for a specific globe.
 * Returns a channel reference — call channel.unsubscribe() to clean up.
 */
export function subscribeToNewsItems(globeId, onInsert, onUpdate, onDelete) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const channel = supabase
    .channel(`news_items:globe_id=eq.${globeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'news_items',
        filter: `globe_id=eq.${globeId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'news_items',
        filter: `globe_id=eq.${globeId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'news_items',
        filter: `globe_id=eq.${globeId}`,
      },
      (payload) => onDelete(payload.old)
    )
    .subscribe();

  return channel;
}

// ============================================
// Helpers
// ============================================

function formatMonthTitle(monthId) {
  try {
    const [year, month] = monthId.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthId;
  }
}

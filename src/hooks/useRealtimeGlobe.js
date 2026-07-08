'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOrCreateGlobe,
  fetchNewsItems,
  upsertNewsItem,
  deleteNewsItem,
  subscribeToNewsItems,
} from '@/lib/supabaseGlobes';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Custom React hook for real-time globe state synchronization with Supabase.
 *
 * Provides:
 *  - newsItemsByRegion: grouped news items state
 *  - draggedOffsets: per-country drag offsets
 *  - handleNewsChange(region, items): update news items (with debounced DB sync)
 *  - handleDraggedOffsetsChange(offsets): update drag offsets (with debounced DB sync)
 *  - isLoading: whether initial data is still loading
 *  - isSynced: whether Supabase connection is active
 */
export default function useRealtimeGlobe(monthId) {
  const [globeRecord, setGlobeRecord] = useState(null);
  const [newsItemsByRegion, setNewsItemsByRegion] = useState({});
  const [draggedOffsets, setDraggedOffsets] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Debounce timers keyed by countryCode
  const debounceTimers = useRef({});
  // Track which country codes we are currently writing (to ignore our own echoes)
  const pendingWrites = useRef(new Set());
  // Ref to latest state for use in callbacks
  const newsItemsByRegionRef = useRef(newsItemsByRegion);
  newsItemsByRegionRef.current = newsItemsByRegion;

  // ── Bootstrap: get-or-create globe, load existing news items ──
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      const globe = await getOrCreateGlobe(monthId);
      if (cancelled || !globe) {
        setIsLoading(false);
        return;
      }
      setGlobeRecord(globe);

      const rows = await fetchNewsItems(globe.id);
      if (cancelled) return;

      // Group rows by region into newsItemsByRegion and extract drag offsets
      const grouped = {};
      const offsets = {};

      for (const row of rows) {
        if (!grouped[row.region]) grouped[row.region] = [];
        grouped[row.region].push(rowToItem(row));

        if (row.drag_dx !== 0 || row.drag_dy !== 0) {
          offsets[row.country_code] = { dx: row.drag_dx, dy: row.drag_dy };
        }
      }

      setNewsItemsByRegion(grouped);
      setDraggedOffsets(offsets);
      setIsLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [monthId]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!globeRecord) return;

    const channel = subscribeToNewsItems(
      globeRecord.id,
      // INSERT
      (row) => {
        if (pendingWrites.current.has(row.country_code)) {
          pendingWrites.current.delete(row.country_code);
          return; // Skip our own echo
        }
        setNewsItemsByRegion((prev) => {
          const region = row.region;
          const existing = prev[region] || [];
          if (existing.some((i) => i.countryCode === row.country_code)) return prev;
          return { ...prev, [region]: [...existing, rowToItem(row)] };
        });
        if (row.drag_dx !== 0 || row.drag_dy !== 0) {
          setDraggedOffsets((prev) => ({
            ...prev,
            [row.country_code]: { dx: row.drag_dx, dy: row.drag_dy },
          }));
        }
      },
      // UPDATE
      (row) => {
        if (pendingWrites.current.has(row.country_code)) {
          pendingWrites.current.delete(row.country_code);
          return; // Skip our own echo
        }
        setNewsItemsByRegion((prev) => {
          const region = row.region;
          const existing = prev[region] || [];
          const idx = existing.findIndex((i) => i.countryCode === row.country_code);
          if (idx === -1) {
            // Might be in a different region — insert
            return { ...prev, [region]: [...existing, rowToItem(row)] };
          }
          const updated = [...existing];
          updated[idx] = rowToItem(row);
          return { ...prev, [region]: updated };
        });
        setDraggedOffsets((prev) => ({
          ...prev,
          [row.country_code]: { dx: row.drag_dx, dy: row.drag_dy },
        }));
      },
      // DELETE
      (row) => {
        if (pendingWrites.current.has(row.country_code)) {
          pendingWrites.current.delete(row.country_code);
          return;
        }
        setNewsItemsByRegion((prev) => {
          const newState = {};
          for (const [region, items] of Object.entries(prev)) {
            const filtered = items.filter((i) => i.countryCode !== row.country_code);
            if (filtered.length > 0) newState[region] = filtered;
          }
          return newState;
        });
        setDraggedOffsets((prev) => {
          const next = { ...prev };
          delete next[row.country_code];
          return next;
        });
      }
    );

    if (channel) setIsSynced(true);

    return () => {
      if (channel) {
        channel.unsubscribe();
        setIsSynced(false);
      }
    };
  }, [globeRecord]);

  // ── Debounced write helper ──
  const debouncedUpsert = useCallback(
    (region, item) => {
      if (!globeRecord) return;
      const key = item.countryCode;

      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      debounceTimers.current[key] = setTimeout(async () => {
        pendingWrites.current.add(key);
        await upsertNewsItem(globeRecord.id, region, item);
        delete debounceTimers.current[key];
      }, 300);
    },
    [globeRecord]
  );

  // ── Public: handleNewsChange ──
  const handleNewsChange = useCallback(
    (region, items) => {
      // Find what changed compared to previous state
      const prevItems = newsItemsByRegionRef.current[region] || [];
      const prevCodes = new Set(prevItems.map((i) => i.countryCode));
      const newCodes = new Set(items.map((i) => i.countryCode));

      // Optimistic local update
      setNewsItemsByRegion((prev) => ({ ...prev, [region]: items }));

      if (!globeRecord) return;

      // Detect deletes
      for (const code of prevCodes) {
        if (!newCodes.has(code)) {
          pendingWrites.current.add(code);
          deleteNewsItem(globeRecord.id, code);
          // Clean up drag offset for deleted items
          setDraggedOffsets((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
          });
        }
      }

      // Detect inserts + updates
      for (const item of items) {
        const prev = prevItems.find((p) => p.countryCode === item.countryCode);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(item)) {
          debouncedUpsert(region, item);
        }
      }
    },
    [globeRecord, debouncedUpsert]
  );

  // ── Public: handleDraggedOffsetsChange ──
  const handleDraggedOffsetsChange = useCallback(
    (newOffsets) => {
      setDraggedOffsets(newOffsets);

      if (!globeRecord) return;

      // Find what changed and debounce-upsert those items
      for (const [code, offset] of Object.entries(newOffsets)) {
        // Find the item across all regions
        for (const [region, items] of Object.entries(newsItemsByRegionRef.current)) {
          const item = items.find((i) => i.countryCode === code);
          if (item) {
            debouncedUpsert(region, {
              ...item,
              dragDx: offset.dx,
              dragDy: offset.dy,
            });
            break;
          }
        }
      }
    },
    [globeRecord, debouncedUpsert]
  );

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    globeRecord,
    newsItemsByRegion,
    draggedOffsets,
    handleNewsChange,
    handleDraggedOffsetsChange,
    isLoading,
    isSynced,
  };
}

// ── Row ↔ Item conversion ──

function rowToItem(row) {
  return {
    countryCode: row.country_code,
    countryName: row.country_name,
    newsText: row.news_text,
    color: row.color,
    affected: row.affected || [],
    dragDx: row.drag_dx || 0,
    dragDy: row.drag_dy || 0,
  };
}

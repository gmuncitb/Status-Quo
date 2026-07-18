'use client';

import { useState, useCallback, use } from 'react';
import dynamic from 'next/dynamic';
import EditorPanel from '@/components/EditorPanel';
import REGIONS, { REGION_KEYS } from '@/lib/regions';
import { toBlob } from 'html-to-image';
import useRealtimeGlobe from '@/hooks/useRealtimeGlobe';

// Dynamically import Globe with SSR disabled (D3 requires DOM)
const Globe = dynamic(() => import('@/components/Globe'), { ssr: false });

const EMPTY_ARRAY = [];

export default function GlobePage({ params }) {
  const { monthId } = use(params);
  const decodedMonthId = decodeURIComponent(monthId);

  const isLocked = (() => {
    try {
      const [year, month] = decodedMonthId.split('-').map(Number);
      const lockDate = new Date(year, month, 5);
      return new Date() >= lockDate;
    } catch {
      return false;
    }
  })();

  const {
    globeRecord,
    newsItemsByRegion,
    draggedOffsets,
    handleNewsChange,
    handleDraggedOffsetsChange,
    isLoading,
    isSynced,
  } = useRealtimeGlobe(decodedMonthId);

  const [activeRegion, setActiveRegion] = useState('asia');
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);

  const region = REGIONS[activeRegion];
  const newsItems = newsItemsByRegion[activeRegion] || EMPTY_ARRAY;

  // Format month for display
  const monthDisplay = (() => {
    try {
      const [year, month] = decodedMonthId.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return decodedMonthId;
    }
  })();

  const handleRegionChange = useCallback((key) => {
    setActiveRegion(key);
    setHoveredCountry(null);
  }, []);

  const onNewsChange = useCallback(
    (items) => {
      handleNewsChange(activeRegion, items);
    },
    [activeRegion, handleNewsChange]
  );

  const handleCountryClick = useCallback((code) => {
    const exists = newsItems.some((item) => item.countryCode === code);
    if (exists) return;

    const country = region.countries.find((c) => c.code === code);
    if (!country) return;

    const CALLOUT_COLORS = require('@/lib/colors').default;
    onNewsChange([
      ...newsItems,
      {
        countryCode: code,
        countryName: country.name,
        newsText: '',
        color: CALLOUT_COLORS[0].hex,
      },
    ]);
  }, [newsItems, region, onNewsChange]);

  const handleExport = useCallback(async () => {
    const node = document.getElementById('globe-export-target');
    if (!node) return;

    try {
      const blob = await toBlob(node, {
        pixelRatio: 3.5,
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `status-quo-${activeRegion}-${decodedMonthId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [activeRegion, decodedMonthId]);

  if (isLoading) {
    return (
      <div className="app-layout app-visible" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font-body)', color: '#666' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Loading globe...</div>
          <div style={{ fontSize: 13 }}>Connecting to database</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-layout app-visible">
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            <a href="/" className="top-bar-back" title="Back to editions">←</a>
            <img
              src="/gmunc-logo.png"
              alt="GMUNC"
              className="top-bar-logo"
            />
            <div className="top-bar-title">
              <h1>Status Quo</h1>
              <p>{monthDisplay}</p>
            </div>
          </div>
          <div className="top-bar-actions">
            {isLocked && (
              <span className="readonly-badge">◆ View Only</span>
            )}
            {isSynced && (
              <span className="sync-indicator" title="Real-time sync active">
                <span className="sync-dot" />
                Live
              </span>
            )}
            <button className="btn" onClick={handleExport}>
              ↓ Export PNG
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="main-work-area">
          <div className="globe-area">
            <Globe
              region={region}
              newsItems={newsItems}
              canvasSize={760}
              hoveredCountry={hoveredCountry}
              onHoverCountry={setHoveredCountry}
              onClickCountry={isLocked ? undefined : handleCountryClick}
              draggedOffsets={draggedOffsets}
              onDraggedOffsetsChange={handleDraggedOffsetsChange}
            />
          </div>

          {isEditorMinimized && (
            <button 
              className="btn btn-primary btn-minimize-floating" 
              onClick={() => setIsEditorMinimized(false)}
            >
              → Open Editor
            </button>
          )}

          <EditorPanel
            activeRegion={activeRegion}
            newsItems={newsItems}
            onNewsChange={onNewsChange}
            hoveredCountry={hoveredCountry}
            onHoverCountry={setHoveredCountry}
            isMinimized={isEditorMinimized}
            onMinimizeChange={setIsEditorMinimized}
            readOnly={isLocked}
          />

          <div className="region-selector-bar">
            {REGION_KEYS.map((key) => (
              <button
                key={key}
                className={`region-tab-pill ${activeRegion === key ? 'active' : ''}`}
                onClick={() => handleRegionChange(key)}
              >
                {REGIONS[key].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden container for exporting un-cropped full globe */}
      <div style={{ position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none' }}>
        <div id="globe-export-target" style={{ width: 1140, height: 1140, background: 'transparent', position: 'relative' }}>
          <Globe
            region={{ ...region, scale: Math.min(region.scale || 1.38, 1.40) }}
            newsItems={newsItems}
            canvasSize={1140}
            hoveredCountry={null}
            isExportMode={true}
            draggedOffsets={draggedOffsets}
          />
        </div>
      </div>
    </>
  );
}

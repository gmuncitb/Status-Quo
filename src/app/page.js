'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SplashScreen from '@/components/SplashScreen';
import EditorPanel from '@/components/EditorPanel';
import REGIONS, { REGION_KEYS } from '@/lib/regions';
import { toBlob } from 'html-to-image';

// Dynamically import Globe with SSR disabled (D3 requires DOM)
const Globe = dynamic(() => import('@/components/Globe'), { ssr: false });

const EMPTY_ARRAY = [];

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeRegion, setActiveRegion] = useState('asia');
  const [newsItemsByRegion, setNewsItemsByRegion] = useState({});
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);
  const [draggedOffsets, setDraggedOffsets] = useState({});

  const region = REGIONS[activeRegion];
  const newsItems = newsItemsByRegion[activeRegion] || EMPTY_ARRAY;

  const handleRegionChange = useCallback((key) => {
    setActiveRegion(key);
    setHoveredCountry(null);
  }, []);

  const handleNewsChange = useCallback(
    (items) => {
      setNewsItemsByRegion((prev) => ({
        ...prev,
        [activeRegion]: items,
      }));
    },
    [activeRegion]
  );

  const handleCountryClick = useCallback((code) => {
    // Check if it's already highlighted
    const exists = newsItems.some((item) => item.countryCode === code);
    if (exists) return;

    // Find the country in the region's country list
    const country = region.countries.find((c) => c.code === code);
    if (!country) return;

    // Add to newsItems with a default color
    const CALLOUT_COLORS = require('@/lib/colors').default;
    handleNewsChange([
      ...newsItems,
      {
        countryCode: code,
        countryName: country.name,
        newsText: '',
        color: CALLOUT_COLORS[0].hex,
      },
    ]);
  }, [newsItems, region, handleNewsChange]);

  const handleExport = useCallback(async () => {
    const node = document.getElementById('globe-export-target');
    if (!node) return;

    try {
      const blob = await toBlob(node, {
        pixelRatio: 2, // 2x pixel ratio for high resolution output
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `status-quo-${activeRegion}-${new Date().toISOString().slice(0, 7)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [activeRegion]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <div className={`app-layout ${showSplash ? 'app-hidden' : 'app-visible'}`}>
        {/* Top bar */}
        <div className="top-bar">
          <div className="top-bar-left">
            <img
              src="/gmunc-logo.png"
              alt="GMUNC"
              className="top-bar-logo"
            />
            <div className="top-bar-title">
              <h1>Status Quo</h1>
              <p>GMUNC Monthly Recap</p>
            </div>
          </div>
          <div className="top-bar-actions">
            <button className="btn" onClick={handleExport}>
              ↓ Export PNG
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="main-work-area">
          {/* Globe — centered, seamless background */}
          <div className="globe-area">
            <Globe
              region={region}
              newsItems={newsItems}
              canvasSize={760}
              hoveredCountry={hoveredCountry}
              onHoverCountry={setHoveredCountry}
              onClickCountry={handleCountryClick}
              draggedOffsets={draggedOffsets}
              onDraggedOffsetsChange={setDraggedOffsets}
            />
          </div>

          {/* Floating trigger button to open editor when minimized */}
          {isEditorMinimized && (
            <button 
              className="btn btn-primary btn-minimize-floating" 
              onClick={() => setIsEditorMinimized(false)}
            >
              → Open Editor
            </button>
          )}

          {/* Editor Drawer — absolute positioned on the left */}
          <EditorPanel
            activeRegion={activeRegion}
            newsItems={newsItems}
            onNewsChange={handleNewsChange}
            hoveredCountry={hoveredCountry}
            onHoverCountry={setHoveredCountry}
            isMinimized={isEditorMinimized}
            onMinimizeChange={setIsEditorMinimized}
          />

          {/* Region Tabs (Pill Selector) — absolute positioned bottom center */}
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
            region={{ ...region, scale: 0.95 }} // Reset scale to 0.95 for export to ensure full sphere is visible
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

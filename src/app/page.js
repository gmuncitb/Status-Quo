'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SplashScreen from '@/components/SplashScreen';
import EditorPanel from '@/components/EditorPanel';
import REGIONS, { REGION_KEYS } from '@/lib/regions';
import { toBlob } from 'html-to-image';

// Dynamically import Globe with SSR disabled (D3 requires DOM)
const Globe = dynamic(() => import('@/components/Globe'), { ssr: false });

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeRegion, setActiveRegion] = useState('asia');
  const [newsItemsByRegion, setNewsItemsByRegion] = useState({});
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [isEditorMinimized, setIsEditorMinimized] = useState(false);

  const region = REGIONS[activeRegion];
  const newsItems = newsItemsByRegion[activeRegion] || [];

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

  const handleExport = useCallback(async () => {
    const node = document.getElementById('globe-export-target');
    if (!node) return;

    try {
      const blob = await toBlob(node, {
        pixelRatio: 3,
        backgroundColor: '#fafafa',
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
              canvasSize={640}
              hoveredCountry={hoveredCountry}
              onHoverCountry={setHoveredCountry}
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
    </>
  );
}

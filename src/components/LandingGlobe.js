'use client';

import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

export default function LandingGlobe({ size = 520 }) {
  const canvasRef = useRef(null);
  const phiRef = useRef(0);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderSize = size;
    let globe;

    try {
      globe = createGlobe(canvasRef.current, {
        devicePixelRatio: 2,
        width: renderSize * 2,
        height: renderSize * 2,
        phi: 0,
        theta: 0.25,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 20000,
        mapBrightness: 1.2, // Lower mapBrightness so dark dots are not washed out to white
        baseColor: [0.35, 0.35, 0.35], // Dark gray landmass dots for clear contrast on light background
        markerColor: [0.1, 0.1, 0.1], // Charcoal black markers
        glowColor: [0.95, 0.95, 0.95], // Subtle light glow matching off-white background
        markers: [
          { location: [35.6762, 139.6503], size: 0.06 },
          { location: [40.7128, -74.006], size: 0.06 },
          { location: [51.5074, -0.1278], size: 0.06 },
          { location: [-33.8688, 151.2093], size: 0.04 },
          { location: [48.8566, 2.3522], size: 0.05 },
          { location: [55.7558, 37.6173], size: 0.05 },
          { location: [-23.5505, -46.6333], size: 0.05 },
          { location: [1.3521, 103.8198], size: 0.04 },
          { location: [28.6139, 77.209], size: 0.06 },
          { location: [30.0444, 31.2357], size: 0.04 },
        ],
        onRender: (state) => {
          state.phi = phiRef.current;
          phiRef.current += 0.003;
        },
      });
    } catch (e) {
      console.error("Cobe init error:", e);
      setErrorMsg(e.message || String(e));
    }

    return () => {
      if (globe) {
        globe.destroy();
      }
    };
  }, [size]);

  if (errorMsg) {
    return (
      <div style={{ color: '#c0392b', fontSize: '12px', padding: '16px', border: '1px dashed #c0392b', borderRadius: '8px', background: '#fff' }}>
        Globe failed to load: {errorMsg}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="landing-globe-canvas"
      style={{
        width: '100%',
        maxWidth: size,
        aspectRatio: '1',
        contain: 'layout paint size',
      }}
    />
  );
}

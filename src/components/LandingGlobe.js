'use client';

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export default function LandingGlobe({ size = 600 }) {
  const canvasRef = useRef(null);
  const phiRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    let width = size;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 20000,
      mapBrightness: 4,
      baseColor: [0.25, 0.25, 0.25],
      markerColor: [0.8, 0.8, 0.8],
      glowColor: [0.15, 0.15, 0.15],
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
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [size]);

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

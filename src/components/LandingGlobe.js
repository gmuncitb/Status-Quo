'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getFlagUrl } from '@/lib/flags';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Live sample events for the landing page hero globe to show active geopolitical events
const LIVE_HERO_EVENTS = [
  {
    countryCode: 'USA',
    countryName: 'United States',
    coords: [-77.0369, 38.9072],
    title: 'Global Tech & AI Governance Summit',
    category: 'POLICY',
    color: '#0284c7',
    affected: [{ countryCode: 'JPN', type: 'improve' }, { countryCode: 'DEU', type: 'improve' }],
  },
  {
    countryCode: 'DEU',
    countryName: 'Germany',
    coords: [13.405, 52.52],
    title: 'EU Green Energy & Defense Accord',
    category: 'DIPLOMACY',
    color: '#16a34a',
    affected: [{ countryCode: 'FRA', type: 'improve' }],
  },
  {
    countryCode: 'JPN',
    countryName: 'Japan',
    coords: [139.6917, 35.6895],
    title: 'East Asia Semiconductor Alliance',
    category: 'TRADE',
    color: '#2563eb',
    affected: [{ countryCode: 'USA', type: 'improve' }, { countryCode: 'KOR', type: 'improve' }],
  },
  {
    countryCode: 'IND',
    countryName: 'India',
    coords: [77.209, 28.6139],
    title: 'Indo-Pacific Maritime Initiative',
    category: 'SECURITY',
    color: '#d97706',
    affected: [{ countryCode: 'AUS', type: 'improve' }],
  },
  {
    countryCode: 'BRA',
    countryName: 'Brazil',
    coords: [-47.9292, -15.7801],
    title: 'Amazon Bio-Economy Protection Pact',
    category: 'CLIMATE',
    color: '#059669',
    affected: [{ countryCode: 'COL', type: 'improve' }],
  },
];

// Great circle arc paths connecting active live event hubs
const LIVE_ARCS = [
  { from: [-77.0369, 38.9072], to: [13.405, 52.52], color: '#38bdf8' },  // USA -> DEU
  { from: [13.405, 52.52], to: [139.6917, 35.6895], color: '#6366f1' },  // DEU -> JPN
  { from: [139.6917, 35.6895], to: [77.209, 28.6139], color: '#a855f7' }, // JPN -> IND
  { from: [77.209, 28.6139], to: [-47.9292, -15.7801], color: '#f59e0b' },// IND -> BRA
  { from: [-47.9292, -15.7801], to: [-77.0369, 38.9072], color: '#10b981' },// BRA -> USA
];

export default function LandingGlobe({ size = 720 }) {
  const svgRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [calloutCoords, setCalloutCoords] = useState([]);

  // Drag & rotation state refs (smooth 60fps rAF loop)
  const rotationRef = useRef([20, -25, 0]);
  const dragRef = useRef(null);
  const velocityRef = useRef([0.22, 0]); // Auto-spin velocity

  // Fetch world topology
  useEffect(() => {
    d3.json(WORLD_TOPO_URL)
      .then((data) => setWorldData(data))
      .catch((err) => {
        console.error('Failed to load topology for landing globe:', err);
        setErrorMsg('Failed to load map data.');
      });
  }, []);

  // Manual Drag rotation
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRot: [...rotationRef.current],
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const now = performance.now();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const dt = Math.max(1, now - dragRef.current.lastTime);
    const vx = (e.clientX - dragRef.current.lastX) / dt;
    const vy = (e.clientY - dragRef.current.lastY) / dt;

    velocityRef.current = [vx * 4, -vy * 4];
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.lastTime = now;

    const sensitivity = 0.35;
    const nextLambda = dragRef.current.startRot[0] + dx * sensitivity;
    const nextPhi = Math.max(-60, Math.min(60, dragRef.current.startRot[1] - dy * sensitivity));

    rotationRef.current = [nextLambda, nextPhi, 0];
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // D3 & 60fps render loop
  useEffect(() => {
    if (!worldData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const scale = (size / 2) - 35; // Padded radius for atmosphere halo

    const projection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([size / 2, size / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection);

    const countries = topojson.feature(worldData, worldData.objects.countries);
    const borders = topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b);

    svg.selectAll('*').remove();

    // -------------------------------------------------------------
    // DEFS: Glow Filters & Gradients
    // -------------------------------------------------------------
    const defs = svg.append('defs');

    // Atmosphere Ring Halo
    const haloFilter = defs.append('filter')
      .attr('id', 'landing-atmosphere-halo')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    haloFilter.append('feGaussianBlur')
      .attr('stdDeviation', '18')
      .attr('result', 'blur');

    haloFilter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Water Sphere 3D Gradient
    const oceanGradient = defs.append('radialGradient')
      .attr('id', 'landing-ocean-gradient')
      .attr('cx', '35%')
      .attr('cy', '35%')
      .attr('r', '70%');

    oceanGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff');
    oceanGradient.append('stop').attr('offset', '70%').attr('stop-color', '#f8fafc');
    oceanGradient.append('stop').attr('offset', '100%').attr('stop-color', '#e2e8f0');

    // Atmosphere Edge Glow
    const atmosphereGradient = defs.append('radialGradient')
      .attr('id', 'landing-atmosphere-glow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    atmosphereGradient.append('stop').attr('offset', '82%').attr('stop-color', 'rgba(56, 189, 248, 0)');
    atmosphereGradient.append('stop').attr('offset', '96%').attr('stop-color', 'rgba(56, 189, 248, 0.18)');
    atmosphereGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(99, 102, 241, 0.35)');

    // Outer Glow Aura
    svg.append('circle')
      .attr('cx', size / 2)
      .attr('cy', size / 2)
      .attr('r', scale + 10)
      .attr('fill', 'rgba(56, 189, 248, 0.09)')
      .attr('filter', 'url(#landing-atmosphere-halo)');

    const g = svg.append('g').attr('class', 'landing-globe-group');

    // 1. Ocean Sphere
    const sphere = g.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', 'url(#landing-ocean-gradient)')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 0.8);

    // 2. Graticule
    const graticule = d3.geoGraticule().step([15, 15]);
    const graticulePath = g.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 0.5);

    // Alpha-3 to Numeric Mapping for active country fills
    const activeCountryCodes = new Set(LIVE_HERO_EVENTS.map(e => e.countryCode));
    const activeNumericMap = {
      'USA': '840',
      'DEU': '276',
      'JPN': '392',
      'IND': '356',
      'BRA': '76',
      'FRA': '250',
      'GBR': '826',
      'AUS': '36',
    };

    // 3. Landmasses
    const landPaths = g.selectAll('.land')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'land')
      .attr('d', path)
      .attr('fill', (d) => {
        const strId = String(d.id);
        const isActive = Object.values(activeNumericMap).includes(strId);
        return isActive ? '#475569' : '#cbd5e1';
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.4);

    // 4. Country Borders
    const borderPath = g.append('path')
      .datum(borders)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.4);

    // 5. Great Circle Arc Layer
    const arcGroup = g.append('g').attr('class', 'hero-arc-group');

    // 6. Centroid Nodes & Pulsating Beacons Layer
    const nodeGroup = g.append('g').attr('class', 'hero-node-group');

    // 7. Atmosphere Rim Overlay
    g.append('circle')
      .attr('cx', size / 2)
      .attr('cy', size / 2)
      .attr('r', scale)
      .attr('fill', 'url(#landing-atmosphere-glow)')
      .attr('pointer-events', 'none');

    // 8. Outer Rim Outline
    svg.append('circle')
      .attr('cx', size / 2)
      .attr('cy', size / 2)
      .attr('r', scale)
      .attr('fill', 'none')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.2)
      .attr('opacity', 0.6)
      .attr('pointer-events', 'none');

    // -------------------------------------------------------------
    // ANIMATION TICK LOOP
    // -------------------------------------------------------------
    let animId;
    let dashOffset = 0;

    const tick = () => {
      if (!dragRef.current) {
        velocityRef.current[0] = velocityRef.current[0] * 0.96 + 0.22 * 0.04;
        velocityRef.current[1] = velocityRef.current[1] * 0.96 + 0 * 0.04;

        rotationRef.current[0] += velocityRef.current[0];
        rotationRef.current[1] = Math.max(-60, Math.min(60, rotationRef.current[1] + velocityRef.current[1]));
      }

      projection.rotate(rotationRef.current);

      // Redraw base globe
      sphere.attr('d', path);
      graticulePath.attr('d', path);
      landPaths.attr('d', path);
      borderPath.attr('d', path);

      // Redraw Arcs & Moving Pulses
      dashOffset -= 0.9;
      arcGroup.selectAll('*').remove();

      const center = projection.invert([size / 2, size / 2]);

      LIVE_ARCS.forEach((arc, idx) => {
        const d1 = d3.geoDistance(arc.from, center);
        const d2 = d3.geoDistance(arc.to, center);

        if (d1 < Math.PI / 2 || d2 < Math.PI / 2) {
          const geoGen = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [arc.from, arc.to] },
          };

          const arcPathStr = path(geoGen);
          if (arcPathStr) {
            // Static glowing arc
            arcGroup.append('path')
              .attr('d', arcPathStr)
              .attr('fill', 'none')
              .attr('stroke', arc.color)
              .attr('stroke-width', 1.5)
              .attr('stroke-opacity', 0.4)
              .attr('stroke-dasharray', '3 3');

            // Moving energy pulse
            arcGroup.append('path')
              .attr('d', arcPathStr)
              .attr('fill', 'none')
              .attr('stroke', arc.color)
              .attr('stroke-width', 2.8)
              .attr('stroke-linecap', 'round')
              .attr('stroke-opacity', 0.9)
              .attr('stroke-dasharray', '14 70')
              .attr('stroke-dashoffset', dashOffset + idx * 18);
          }
        }
      });

      // Compute Callout Positions for HTML floating boxes
      nodeGroup.selectAll('*').remove();
      const nextCallouts = [];

      LIVE_HERO_EVENTS.forEach((event) => {
        const dist = d3.geoDistance(event.coords, center);
        const isVisible = dist < Math.PI / 2 - 0.1;

        if (isVisible) {
          const projected = projection(event.coords);
          if (projected) {
            const [cx, cy] = projected;

            // Animated Pulsating Radar Ring
            const pulseRadius = 5 + (Math.sin(dashOffset * 0.09 + cx) + 1) * 5;
            const pulseOpacity = 0.85 - (pulseRadius - 5) / 10;

            nodeGroup.append('circle')
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('r', pulseRadius)
              .attr('fill', 'none')
              .attr('stroke', event.color)
              .attr('stroke-width', 1.4)
              .attr('opacity', Math.max(0.1, pulseOpacity));

            // Centroid Core Dot
            nodeGroup.append('circle')
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('r', 3.5)
              .attr('fill', event.color)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 1.2);

            // Vector direction away from center for floating card positioning
            const dx = cx - size / 2;
            const dy = cy - size / 2;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;

            const pushDist = 80;
            const cardX = cx + (dx / len) * pushDist;
            const cardY = cy + (dy / len) * pushDist;

            nextCallouts.push({
              ...event,
              cx,
              cy,
              cardX,
              cardY,
              isVisible: true,
            });
          }
        }
      });

      setCalloutCoords(nextCallouts);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [worldData, size]);

  if (errorMsg) {
    return (
      <div style={{ color: '#ef4444', fontSize: '12px', padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', fontFamily: 'sans-serif' }}>
        {errorMsg}
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragRef.current ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {!worldData ? (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            className="landing-spinner"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '2.5px solid #e2e8f0',
              borderTopColor: '#0ea5e9',
              animation: 'landing-spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
            Initializing Geopolitical Engine...
          </span>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: size,
          maxHeight: size,
          aspectRatio: '1',
          overflow: 'visible',
          filter: 'drop-shadow(0 20px 30px rgba(15, 23, 42, 0.08))',
        }}
      />

      {/* SVG Leader Lines for Floating Live News Callouts */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {calloutCoords.map((item) => (
          <line
            key={`line-${item.countryCode}`}
            x1={item.cx}
            y1={item.cy}
            x2={item.cardX}
            y2={item.cardY}
            stroke={item.color}
            strokeWidth={1.2}
            strokeDasharray="2 2"
            opacity={0.7}
          />
        ))}
      </svg>

      {/* Floating Live Event Callout Cards */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        {calloutCoords.map((item) => {
          const flagUrl = getFlagUrl(item.countryCode);
          return (
            <div
              key={`callout-${item.countryCode}`}
              style={{
                position: 'absolute',
                left: item.cardX,
                top: item.cardY,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                borderRadius: '10px',
                padding: '8px 12px',
                width: '180px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
                pointerEvents: 'auto',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredEvent(item)}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt=""
                    style={{
                      width: '13px',
                      height: '9px',
                      objectFit: 'cover',
                      borderRadius: '1px',
                      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)',
                    }}
                  />
                )}
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.countryName}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: item.color,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    letterSpacing: '0.03em',
                  }}
                >
                  {item.category}
                </span>
              </div>

              {/* Event Title */}
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', lineHeight: 1.3, marginBottom: '6px' }}>
                {item.title}
              </div>

              {/* Relationship Pills */}
              {item.affected && item.affected.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {item.affected.map((rel) => {
                    const relFlag = getFlagUrl(rel.countryCode);
                    return (
                      <div
                        key={rel.countryCode}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 5px',
                          background: rel.type === 'improve' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${rel.type === 'improve' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                          borderRadius: '4px',
                        }}
                      >
                        {relFlag && <img src={relFlag} alt="" style={{ width: '10px', height: '7px', borderRadius: '0.5px' }} />}
                        <span style={{ fontSize: '7px', fontWeight: 700, color: rel.type === 'improve' ? '#16a34a' : '#dc2626' }}>
                          {rel.type === 'improve' ? '▲' : '▼'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Orbiting Ambient Badges */}
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '-2%',
          padding: '7px 13px',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#0f172a',
          pointerEvents: 'none',
          animation: 'floatSlow 4s ease-in-out infinite',
        }}
      >
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
        <span>177+ Countries Tracked</span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          right: '-1%',
          padding: '7px 13px',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '999px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#0f172a',
          pointerEvents: 'none',
          animation: 'floatSlow 4s ease-in-out 2s infinite',
        }}
      >
        <span style={{ fontSize: '13px' }}>⚡</span>
        <span>Real-Time Macro Feed</span>
      </div>

      <style jsx global>{`
        @keyframes landing-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

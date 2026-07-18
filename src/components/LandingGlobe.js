'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export default function LandingGlobe({ size = 520 }) {
  const svgRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch world topology on mount
  useEffect(() => {
    d3.json(WORLD_TOPO_URL)
      .then((data) => {
        setWorldData(data);
      })
      .catch((err) => {
        console.error('Failed to load topology for landing globe:', err);
        setErrorMsg('Failed to load map data.');
      });
  }, []);

  useEffect(() => {
    if (!worldData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const scale = (size / 2) - 10; // slightly padded boundary

    // Create orthographic projection
    const projection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([size / 2, size / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection);

    // Convert topojson back to geojson features
    const countries = topojson.feature(worldData, worldData.objects.countries);
    const borders = topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b);

    // Clear previous drawing
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // 1. Globe Water/Sphere background
    const sphere = g.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', path)
      .attr('fill', '#ffffff')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.8);

    // 2. Graticule (grid lines) for depth
    const graticule = d3.geoGraticule();
    const graticulePath = g.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-width', 0.5);

    // Define some major countries to highlight in premium grayscale for visual interest
    const highlightedIds = new Set([
      '840', // USA
      '76',  // Brazil
      '276', // Germany
      '392', // Japan
      '36',  // Australia
      '156', // China
      '710', // South Africa
      '643', // Russia
      '356', // India
      '124', // Canada
    ]);

    // 3. Land Paths
    const landPaths = g.selectAll('.land')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'land')
      .attr('d', path)
      .attr('fill', (d) => {
        // Highlighted countries get a premium charcoal color, others a warm soft light gray
        return highlightedIds.has(String(d.id)) ? '#888888' : '#f1f5f9';
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

    // 5. Outer ring for crisp outline
    const outerRing = svg.append('circle')
      .attr('cx', size / 2)
      .attr('cy', size / 2)
      .attr('r', scale)
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5);

    // Animation variables
    let lambda = 0;
    let animId;

    // Direct DOM animation loop for smooth 60fps rotation without React re-renders
    const tick = () => {
      lambda += 0.25; // Rotation speed
      projection.rotate([lambda, -20, 0]); // Rotated 20 degrees down for view depth

      // Redraw elements
      sphere.attr('d', path);
      graticulePath.attr('d', path);
      landPaths.attr('d', path);
      borderPath.attr('d', path);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [worldData, size]);

  if (errorMsg) {
    return (
      <div style={{ color: '#c0392b', fontSize: '12px', padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#ffffff', fontFamily: 'sans-serif' }}>
        {errorMsg}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!worldData ? (
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className="landing-spinner" style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #e2e8f0', borderTopColor: '#64748b', animation: 'landing-spin 1s linear infinite' }} />
          <span style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 500 }}>Loading Globe...</span>
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
        }}
      />
      <style jsx global>{`
        @keyframes landing-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

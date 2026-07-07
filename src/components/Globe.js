'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getFlagUrl } from '@/lib/flags';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/**
 * Collision avoidance for floating callout boxes.
 * Takes an array of { x, y, ... } positions and returns adjusted positions
 * so that boxes don't overlap each other.
 */
function resolveCollisions(items, boxWidth = 160, boxHeight = 44, canvasSize = 600) {
  if (items.length === 0) return items;

  const adjusted = items.map((item) => ({ ...item, adjX: item.x, adjY: item.y }));

  // Sort by y position for stable layout
  adjusted.sort((a, b) => a.y - b.y);

  const padding = 8;

  // Multiple passes to resolve overlaps
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let i = 0; i < adjusted.length; i++) {
      for (let j = i + 1; j < adjusted.length; j++) {
        const a = adjusted[i];
        const b = adjusted[j];

        const overlapX = Math.abs(a.adjX - b.adjX) < boxWidth + padding;
        const overlapY = Math.abs(a.adjY - b.adjY) < boxHeight + padding;

        if (overlapX && overlapY) {
          const pushY = (boxHeight + padding - Math.abs(a.adjY - b.adjY)) / 2;
          a.adjY -= pushY;
          b.adjY += pushY;
          moved = true;
        }
      }
    }

    // Clamp within canvas bounds
    for (const item of adjusted) {
      item.adjX = Math.max(8, Math.min(canvasSize - boxWidth - 8, item.adjX));
      item.adjY = Math.max(8, Math.min(canvasSize - boxHeight - 8, item.adjY));
    }

    if (!moved) break;
  }

  return adjusted;
}

export default function Globe({ region, newsItems, canvasSize = 640, hoveredCountry, onHoverCountry, onClickCountry }) {
  const svgRef = useRef(null);
  const worldDataRef = useRef(null);

  // Sync event handlers to refs to prevent D3 render loop invalidation from parent prop shifts
  const onHoverCountryRef = useRef(onHoverCountry);
  const onClickCountryRef = useRef(onClickCountry);

  useEffect(() => {
    onHoverCountryRef.current = onHoverCountry;
    onClickCountryRef.current = onClickCountry;
  }, [onHoverCountry, onClickCountry]);

  // Constants for fixed D3 rendering coordinate space
  const internalWidth = 800;
  const internalHeight = 800;
  const baseGlobeRadius = 220;

  // Animatable states for rotation and scale (synchronized across SVG paths and HTML callouts)
  const [rotation, setRotation] = useState(region.rotation);
  const [scale, setScale] = useState(baseGlobeRadius * (region.scale || 1.0));

  // Load world topology data once on mount
  useEffect(() => {
    d3.json(WORLD_TOPO_URL).then((world) => {
      worldDataRef.current = world;
      renderGlobe();
    });
  }, []);

  // Animate rotation and scale transitions via requestAnimationFrame loop (React-state driven)
  useEffect(() => {
    const targetRotation = region.rotation;
    const targetScale = baseGlobeRadius * (region.scale || 1.0);

    const startRotation = [...rotation];
    const startScale = scale;

    const duration = 750; // ms
    const startTime = performance.now();
    let animId;

    // Helper for shortest path rotation interpolation
    const interpolateRotation = (start, end, t) => {
      return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t
      ];
    };

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out

      const nextRotation = interpolateRotation(startRotation, targetRotation, ease);
      const nextScale = startScale + (targetScale - startScale) * ease;

      setRotation(nextRotation);
      setScale(nextScale);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [region]);

  // Build highlighted country lookup
  const highlightedCodes = useMemo(() => {
    const map = {};
    for (const item of newsItems) {
      map[item.countryCode] = item.color;
    }
    return map;
  }, [newsItems]);

  // Build set of country codes belonging to the active region for hover/click interaction
  const regionCountryCodes = useMemo(() => {
    return new Set(region.countries.map((c) => c.code));
  }, [region]);

  const numericToAlpha3 = useMemo(() => {
    return buildNumericToAlpha3();
  }, []);

  // Main D3 render routine
  const renderGlobe = useCallback(() => {
    if (!svgRef.current || !worldDataRef.current) return;

    const svg = d3.select(svgRef.current);
    const world = worldDataRef.current;

    // Set up orthographic projection with animated scale & rotation states
    const projection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([internalWidth / 2, internalHeight / 2])
      .clipAngle(90)
      .rotate(rotation);

    const path = d3.geoPath().projection(projection);

    const countries = topojson.feature(world, world.objects.countries);
    const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

    // Clear and redraw
    svg.selectAll('*').remove();

    // Create defs and add drop-shadow filter for 3D hover effect
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'hover-shadow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');

    filter.append('feDropShadow')
      .attr('dx', 2)
      .attr('dy', 4)
      .attr('stdDeviation', 3)
      .attr('flood-opacity', 0.22)
      .attr('flood-color', '#000000');

    const g = svg.append('g');

    // Water background — grows with the scale
    g.append('circle')
      .attr('cx', internalWidth / 2)
      .attr('cy', internalHeight / 2)
      .attr('r', scale)
      .attr('fill', '#ffffff')
      .attr('stroke', 'none');

    // Graticule grid
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#eeeeee')
      .attr('stroke-width', 0.3);

    // Landmasses
    g.selectAll('.globe-land')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'globe-land')
      .attr('d', path)
      .attr('fill', (d) => {
        const code = numericToAlpha3[d.id];
        return highlightedCodes[code] || '#dddddd';
      })
      .attr('stroke', (d) => {
        const code = numericToAlpha3[d.id];
        return highlightedCodes[code] ? '#ffffff' : '#f0f0f0';
      })
      .attr('stroke-width', (d) => {
        const code = numericToAlpha3[d.id];
        return highlightedCodes[code] ? 1 : 0.5;
      })
      .attr('transform', 'translate(0, 0)')
      .attr('filter', 'none')
      .style('cursor', (d) => {
        const code = numericToAlpha3[d.id];
        return regionCountryCodes.has(code) ? 'pointer' : 'default';
      })
      .on('mouseenter', function (event, d) {
        const code = numericToAlpha3[d.id];
        if (regionCountryCodes.has(code) && onHoverCountryRef.current) {
          onHoverCountryRef.current(code);
          d3.select(this).raise(); // Bring path to front so drop-shadow renders over adjacent borders
        }
      })
      .on('mouseleave', () => {
        if (onHoverCountryRef.current) {
          onHoverCountryRef.current(null);
        }
      })
      .on('click', (event, d) => {
        const code = numericToAlpha3[d.id];
        if (regionCountryCodes.has(code) && onClickCountryRef.current) {
          onClickCountryRef.current(code);
        }
      });

    // Country borders
    g.append('path')
      .datum(borders)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#bbbbbb')
      .attr('stroke-width', 0.3);

    // Globe outline (outside of clip group for crisp stroke boundary)
    svg.append('circle')
      .attr('cx', internalWidth / 2)
      .attr('cy', internalHeight / 2)
      .attr('r', scale)
      .attr('fill', 'none')
      .attr('stroke', '#bbbbbb')
      .attr('stroke-width', 1);

  }, [rotation, scale, highlightedCodes, regionCountryCodes, numericToAlpha3]);

  // Re-run D3 rendering when styling/data states change (excludes hoveredCountry to prevent DOM rebuilding)
  useEffect(() => {
    if (worldDataRef.current) {
      renderGlobe();
    }
  }, [rotation, scale, highlightedCodes, renderGlobe]);

  // Update hover styling dynamically in the DOM (allows smooth CSS transform & drop-shadow transitions)
  useEffect(() => {
    if (!svgRef.current || !worldDataRef.current) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll('.globe-land')
      .each(function(d) {
        const code = numericToAlpha3[d.id];
        const isHovered = code === hoveredCountry;
        const pathSelection = d3.select(this);

        if (isHovered) {
          // Calculate lift displacement vector from center of the globe
          const centroid = d3.geoCentroid(d);
          const projection = d3
            .geoOrthographic()
            .scale(scale)
            .translate([internalWidth / 2, internalHeight / 2])
            .clipAngle(90)
            .rotate(rotation);

          const projected = projection(centroid);
          if (projected) {
            const dx = projected[0] - internalWidth / 2;
            const dy = projected[1] - internalHeight / 2;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              const tx = (dx / len) * 8; // Lift outward by 8px
              const ty = (dy / len) * 8;
              pathSelection.attr('transform', `translate(${tx}, ${ty})`);
            }
          }
          pathSelection
            .attr('fill', highlightedCodes[code] ? '#1c1c1c' : '#c8c8c8')
            .attr('stroke', '#000000')
            .attr('stroke-width', 1.5)
            .attr('filter', 'url(#hover-shadow)')
            .raise();
        } else {
          pathSelection
            .attr('transform', 'translate(0, 0)')
            .attr('filter', 'none')
            .attr('fill', highlightedCodes[code] || '#dddddd')
            .attr('stroke', highlightedCodes[code] ? '#ffffff' : '#f0f0f0')
            .attr('stroke-width', highlightedCodes[code] ? 1 : 0.5);
        }
      });
  }, [hoveredCountry, scale, rotation, highlightedCodes, numericToAlpha3]);

  // Compute callout positions dynamically on every animation frame
  const calloutPositions = useMemo(() => {
    if (!worldDataRef.current || newsItems.length === 0) {
      return [];
    }

    const world = worldDataRef.current;
    
    // Virtual projection matching current animation frame
    const tempProjection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([internalWidth / 2, internalHeight / 2])
      .clipAngle(90)
      .rotate(rotation);

    const countries = topojson.feature(world, world.objects.countries);
    const positions = [];

    for (const item of newsItems) {
      const numId = alpha3ToNumeric(item.countryCode);
      const feature = countries.features.find((f) => String(f.id) === String(numId));

      if (feature) {
        const centroid = d3.geoCentroid(feature);
        const projected = tempProjection(centroid);

        if (projected) {
          const dist = d3.geoDistance(centroid, tempProjection.invert([internalWidth / 2, internalHeight / 2]));
          if (dist < Math.PI / 2) {
            // Map 800x800 internal coordinates to canvasSize screen pixels
            const scaleFactor = canvasSize / internalWidth;
            positions.push({
              ...item,
              x: projected[0] * scaleFactor,
              y: projected[1] * scaleFactor,
              centroidX: projected[0] * scaleFactor,
              centroidY: projected[1] * scaleFactor,
            });
          }
        }
      }
    }

    return resolveCollisions(positions, 160, 44, canvasSize);
  }, [newsItems, rotation, scale, canvasSize]);

  return (
    <div className="globe-canvas" style={{ width: canvasSize, height: canvasSize }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${internalWidth} ${internalHeight}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      />

      {/* SVG overlay for dynamic leader lines */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      >
        {calloutPositions.map((item) => (
          <line
            key={`line-${item.countryCode}`}
            x1={item.centroidX}
            y1={item.centroidY}
            x2={item.adjX + 80} // Center of 160px wide box
            y2={item.adjY + 22} // Vertical center of box
            stroke={item.color}
            strokeWidth={hoveredCountry === item.countryCode ? 1.8 : 1.2}
            fill="none"
            opacity={hoveredCountry === item.countryCode ? 0.8 : 0.4}
            style={{ transition: 'stroke-width 150ms ease, opacity 150ms ease' }}
          />
        ))}
      </svg>

      {/* Centroid dots */}
      <div className="callout-container" style={{ overflow: 'visible' }}>
        {calloutPositions.map((item) => (
          <div
            key={`dot-${item.countryCode}`}
            className="callout-dot"
            style={{
              left: item.centroidX,
              top: item.centroidY,
              color: item.color,
              backgroundColor: item.color,
              transform: `translate(-50%, -50%) scale(${hoveredCountry === item.countryCode ? 1.3 : 1})`,
            }}
          />
        ))}
      </div>

      {/* Floating callout boxes */}
      <div className="callout-container" style={{ overflow: 'visible' }}>
        {calloutPositions.map((item) => {
          const flagUrl = getFlagUrl(item.countryCode);
          const isHovered = hoveredCountry === item.countryCode;
          return (
            <div
              key={`box-${item.countryCode}`}
              className="callout-box"
              style={{
                left: item.adjX,
                top: item.adjY,
                borderColor: isHovered ? '#111111' : item.color,
                borderWidth: isHovered ? '1.5px' : '1px',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
              }}
              onMouseEnter={() => onHoverCountry && onHoverCountry(item.countryCode)}
              onMouseLeave={() => onHoverCountry && onHoverCountry(null)}
            >
              <div className="callout-box-header">
                {flagUrl && (
                  <img
                    src={flagUrl}
                    alt=""
                    style={{
                      width: 14,
                      height: 10,
                      objectFit: 'cover',
                      borderRadius: 1,
                      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05)',
                    }}
                  />
                )}
                <div className="callout-box-title">{item.countryName}</div>
              </div>
              <div className="callout-box-text">{item.newsText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildNumericToAlpha3() {
  return {
    '4': 'AFG', '8': 'ALB', '12': 'DZA', '20': 'AND', '24': 'AGO',
    '28': 'ATG', '32': 'ARG', '51': 'ARM', '36': 'AUS', '40': 'AUT',
    '31': 'AZE', '44': 'BHS', '48': 'BHR', '50': 'BGD', '52': 'BRB',
    '112': 'BLR', '56': 'BEL', '84': 'BLZ', '204': 'BEN', '64': 'BTN',
    '68': 'BOL', '70': 'BIH', '72': 'BWA', '76': 'BRA', '96': 'BRN',
    '100': 'BGR', '854': 'BFA', '108': 'BDI', '116': 'KHM', '120': 'CMR',
    '124': 'CAN', '140': 'CAF', '148': 'TCD', '152': 'CHL', '156': 'CHN',
    '170': 'COL', '174': 'COM', '178': 'COG', '180': 'COD', '188': 'CRI',
    '384': 'CIV', '191': 'HRV', '192': 'CUB', '196': 'CYP', '203': 'CZE',
    '208': 'DNK', '262': 'DJI', '212': 'DMA', '214': 'DOM', '218': 'ECU',
    '818': 'EGY', '222': 'SLV', '226': 'GNQ', '232': 'ERI', '233': 'EST',
    '231': 'ETH', '242': 'FJI', '246': 'FIN', '250': 'FRA', '266': 'GAB',
    '270': 'GMB', '268': 'GEO', '276': 'DEU', '288': 'GHA', '300': 'GRC',
    '308': 'GRD', '320': 'GTM', '324': 'GIN', '624': 'GNB', '328': 'GUY',
    '332': 'HTI', '340': 'HND', '348': 'HUN', '352': 'ISL', '356': 'IND',
    '360': 'IDN', '364': 'IRN', '368': 'IRQ', '372': 'IRL', '376': 'ISR',
    '380': 'ITA', '388': 'JAM', '392': 'JPN', '400': 'JOR', '398': 'KAZ',
    '404': 'KEN', '296': 'KIR', '408': 'PRK', '410': 'KOR', '414': 'KWT',
    '417': 'KGZ', '418': 'LAO', '428': 'LVA', '422': 'LBN', '426': 'LSO',
    '430': 'LBR', '434': 'LBY', '438': 'LIE', '440': 'LTU', '442': 'LUX',
    '807': 'MKD', '450': 'MDG', '454': 'MWI', '458': 'MYS', '462': 'MDV',
    '466': 'MLI', '470': 'MLT', '478': 'MRT', '480': 'MUS', '484': 'MEX',
    '498': 'MDA', '496': 'MNG', '499': 'MNE', '504': 'MAR', '508': 'MOZ',
    '104': 'MMR', '516': 'NAM', '524': 'NPL', '528': 'NLD', '554': 'NZL',
    '558': 'NIC', '562': 'NER', '566': 'NGA', '578': 'NOR', '512': 'OMN',
    '586': 'PAK', '591': 'PAN', '598': 'PNG', '600': 'PRY', '604': 'PER',
    '608': 'PHL', '616': 'POL', '620': 'PRT', '634': 'QAT', '642': 'ROU',
    '643': 'RUS', '646': 'RWA', '659': 'KNA', '662': 'LCA', '670': 'VCT',
    '882': 'WSM', '678': 'STP', '682': 'SAU', '686': 'SEN', '688': 'SRB',
    '690': 'SYC', '694': 'SLE', '702': 'SGP', '703': 'SVK', '705': 'SVN',
    '90': 'SLB', '706': 'SOM', '710': 'ZAF', '728': 'SSD', '724': 'ESP',
    '144': 'LKA', '275': 'PSE', '736': 'SDN', '740': 'SUR', '748': 'SWZ',
    '752': 'SWE', '756': 'CHE', '760': 'SYR', '158': 'TWN', '762': 'TJK',
    '834': 'TZA', '764': 'THA', '626': 'TLS', '768': 'TGO', '776': 'TON',
    '780': 'TTO', '788': 'TUN', '792': 'TUR', '795': 'TKM', '800': 'UGA',
    '804': 'UKR', '784': 'ARE', '826': 'GBR', '840': 'USA', '858': 'URY',
    '860': 'UZB', '548': 'VUT', '862': 'VEN', '704': 'VNM', '887': 'YEM',
    '894': 'ZMB', '716': 'ZWE', '-99': 'CYN', '900': 'KOS',
  };
}

function alpha3ToNumeric(alpha3) {
  const map = buildNumericToAlpha3();
  for (const [num, code] of Object.entries(map)) {
    if (code === alpha3) return num;
  }
  return null;
}

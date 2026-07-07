'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getFlagUrl } from '@/lib/flags';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/**
 * Collision avoidance for floating callout boxes.
 * Takes an array of { x, y, ... } positions and returns adjusted positions
 * so that boxes don't overlap each other.
 */
function resolveCollisions(items, boxWidth = 140, boxHeight = 52, canvasSize = 600) {
  if (items.length === 0) return items;

  const adjusted = items.map((item) => ({ ...item, adjX: item.x, adjY: item.y }));

  // Sort by y position for stable layout
  adjusted.sort((a, b) => a.y - b.y);

  const padding = 6;

  // Multiple passes to resolve overlaps
  for (let pass = 0; pass < 10; pass++) {
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

export default function Globe({ region, newsItems, canvasSize = 600, hoveredCountry, onHoverCountry }) {
  const svgRef = useRef(null);
  const worldDataRef = useRef(null);
  const projectionRef = useRef(null);
  const pathRef = useRef(null);

  // Load world topology data
  useEffect(() => {
    d3.json(WORLD_TOPO_URL).then((world) => {
      worldDataRef.current = world;
      renderGlobe();
    });
  }, []);

  // Build a set of highlighted country codes from newsItems
  const highlightedCodes = useMemo(() => {
    const map = {};
    for (const item of newsItems) {
      map[item.countryCode] = item.color;
    }
    return map;
  }, [newsItems]);

  // Mapping from numeric country IDs (used in topojson) to ISO alpha-3 codes
  // We use a lookup based on the Natural Earth / ISO standard
  const numericToAlpha3 = useMemo(() => {
    return buildNumericToAlpha3();
  }, []);

  const renderGlobe = useCallback(() => {
    if (!svgRef.current || !worldDataRef.current) return;

    const svg = d3.select(svgRef.current);
    const world = worldDataRef.current;

    const width = canvasSize;
    const height = canvasSize;
    const globeRadius = (Math.min(width, height) / 2) - 20;

    // Set up projection
    if (!projectionRef.current) {
      projectionRef.current = d3
        .geoOrthographic()
        .scale(globeRadius)
        .translate([width / 2, height / 2])
        .clipAngle(90)
        .rotate(region.rotation);
    }

    const projection = projectionRef.current;
    const path = d3.geoPath().projection(projection);
    pathRef.current = path;

    // Extract features
    const countries = topojson.feature(world, world.objects.countries);
    const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

    // Clear and redraw
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Water (globe background) — drawn first so land sits on top
    g.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', globeRadius)
      .attr('fill', '#ffffff')
      .attr('stroke', 'none');

    // Graticule
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#eeeeee')
      .attr('stroke-width', 0.3);

    // Countries
    g.selectAll('.globe-land')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', (d) => {
        const code = numericToAlpha3[d.id];
        if (code === hoveredCountry) return '#1c1c1c';
        return highlightedCodes[code] || '#dddddd';
      })
      .attr('stroke', (d) => {
        const code = numericToAlpha3[d.id];
        if (code === hoveredCountry) return '#000000';
        return highlightedCodes[code] ? '#ffffff' : '#f0f0f0';
      })
      .attr('stroke-width', (d) => {
        const code = numericToAlpha3[d.id];
        if (code === hoveredCountry) return 1.5;
        return highlightedCodes[code] ? 1 : 0.5;
      })
      .style('cursor', (d) => {
        const code = numericToAlpha3[d.id];
        return highlightedCodes[code] ? 'pointer' : 'default';
      })
      .on('mouseenter', (event, d) => {
        const code = numericToAlpha3[d.id];
        if (highlightedCodes[code] && onHoverCountry) {
          onHoverCountry(code);
        }
      })
      .on('mouseleave', () => {
        if (onHoverCountry) {
          onHoverCountry(null);
        }
      });

    // Borders
    g.append('path')
      .datum(borders)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#bbbbbb')
      .attr('stroke-width', 0.3);

    // Globe outline
    g.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', globeRadius)
      .attr('fill', 'none')
      .attr('stroke', '#bbbbbb')
      .attr('stroke-width', 1);
  }, [region, highlightedCodes, canvasSize, numericToAlpha3, hoveredCountry, onHoverCountry]);

  // Re-render when highlighted countries or hovered status change
  useEffect(() => {
    if (worldDataRef.current) {
      renderGlobe();
    }
  }, [highlightedCodes, hoveredCountry, renderGlobe]);

  // Animate rotation when region changes
  useEffect(() => {
    if (!projectionRef.current || !worldDataRef.current) return;

    const projection = projectionRef.current;
    const currentRotation = projection.rotate();
    const targetRotation = region.rotation;

    const interpolate = d3.interpolate(currentRotation, targetRotation);

    d3.transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .tween('rotate', () => {
        return (t) => {
          projection.rotate(interpolate(t));
          renderGlobe();
        };
      });
  }, [region, renderGlobe]);

  // Compute callout positions from country centroids
  const calloutPositions = useMemo(() => {
    if (!projectionRef.current || !worldDataRef.current || newsItems.length === 0) {
      return [];
    }

    const world = worldDataRef.current;
    const projection = projectionRef.current;
    const countries = topojson.feature(world, world.objects.countries);

    const positions = [];
    for (const item of newsItems) {
      const numId = alpha3ToNumeric(item.countryCode);
      const feature = countries.features.find((f) => String(f.id) === String(numId));

      if (feature) {
        const centroid = d3.geoCentroid(feature);
        const projected = projection(centroid);

        if (projected) {
          // Check if the point is on the visible side of the globe
          const dist = d3.geoDistance(centroid, projection.invert([canvasSize / 2, canvasSize / 2]));
          if (dist < Math.PI / 2) {
            positions.push({
              ...item,
              x: projected[0],
              y: projected[1],
              centroidX: projected[0],
              centroidY: projected[1],
            });
          }
        }
      }
    }

    return resolveCollisions(positions, 140, 52, canvasSize);
  }, [newsItems, region, canvasSize]);

  return (
    <div className="globe-canvas" id="globe-export-target" style={{ width: canvasSize, height: canvasSize }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
        width={canvasSize}
        height={canvasSize}
      />

      {/* SVG overlay for leader lines */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      >
        {calloutPositions.map((item) => (
          <line
            key={`line-${item.countryCode}`}
            x1={item.centroidX}
            y1={item.centroidY}
            x2={item.adjX + 80} // Center of 160px wide box
            y2={item.adjY + 22} // Vertical center of header area roughly
            stroke={item.color}
            strokeWidth={hoveredCountry === item.countryCode ? 1.8 : 1.2}
            fill="none"
            opacity={hoveredCountry === item.countryCode ? 0.8 : 0.4}
            transition="stroke-width 150ms ease, opacity 150ms ease"
          />
        ))}
      </svg>

      {/* Dots on country centroids */}
      <div className="callout-container">
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
      <div className="callout-container">
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

/**
 * Map from ISO numeric country codes to ISO alpha-3 codes
 * Covers most countries used in the Natural Earth / world-atlas topojson
 */
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

/**
 * Reverse lookup: alpha-3 code to numeric ID
 */
function alpha3ToNumeric(alpha3) {
  const map = buildNumericToAlpha3();
  for (const [num, code] of Object.entries(map)) {
    if (code === alpha3) return num;
  }
  return null;
}

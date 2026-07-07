'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import createGlobe from 'cobe';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getFlagUrl } from '@/lib/flags';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Numeric to Alpha-3 ISO mapping
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
    '894': 'ZMB', '716': 'ZWE', '-99': 'CYN', '900': 'KOS'
  };
}

function Flag({ code, size = 16 }) {
  const url = getFlagUrl(code);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      style={{
        width: size,
        height: Math.round(size * 0.7),
        objectFit: 'cover',
        borderRadius: 1,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Collision avoidance for floating callout boxes.
 */
function resolveCollisions(items, boxWidth = 160, boxHeight = 44, canvasSize = 800) {
  if (items.length === 0) return items;

  const adjusted = items.map((item) => ({ ...item, adjX: item.x, adjY: item.y }));
  adjusted.sort((a, b) => a.y - b.y);

  const padding = 8;

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

    for (const item of adjusted) {
      item.adjX = Math.max(8, Math.min(canvasSize - boxWidth - 8, item.adjX));
      item.adjY = Math.max(8, Math.min(canvasSize - boxHeight - 8, item.adjY));
    }

    if (!moved) break;
  }

  return adjusted;
}

export default function Globe({ region, newsItems, canvasSize = 640, hoveredCountry, onHoverCountry, onClickCountry }) {
  const canvasRef = useRef(null);
  const worldDataRef = useRef(null);

  // Coordinate dimensions (internal rendering space matching Cobe config)
  const internalWidth = 800;
  const internalHeight = 800;
  const baseGlobeRadius = 220;

  // Active rotation angles (radians) & scale (pixels)
  const [phi, setPhi] = useState(region.rotation[0] * Math.PI / 180);
  const [theta, setTheta] = useState(-region.rotation[1] * Math.PI / 180);
  const [scale, setScale] = useState(baseGlobeRadius * (region.scale || 1.0));

  // Sync event handlers & states to refs for use inside Cobe's 60fps draw loop
  const hoveredCountryRef = useRef(hoveredCountry);
  const onHoverCountryRef = useRef(onHoverCountry);
  const onClickCountryRef = useRef(onClickCountry);

  const phiRef = useRef(phi);
  const thetaRef = useRef(theta);
  const scaleRef = useRef(scale);

  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);

  // Update event handler refs
  useEffect(() => {
    hoveredCountryRef.current = hoveredCountry;
    onHoverCountryRef.current = onHoverCountry;
    onClickCountryRef.current = onClickCountry;
  }, [hoveredCountry, onHoverCountry, onClickCountry]);

  // Sync state coordinates to refs
  useEffect(() => {
    phiRef.current = phi;
    thetaRef.current = theta;
    scaleRef.current = scale;
  }, [phi, theta, scale]);

  // Load world topology once on mount
  useEffect(() => {
    d3.json(WORLD_TOPO_URL).then((world) => {
      worldDataRef.current = world;
    });
  }, []);

  // Smoothly animate transition to the active region's target coordinates
  useEffect(() => {
    const targetRotation = region.rotation;
    const targetPhi = targetRotation[0] * Math.PI / 180;
    const targetTheta = -targetRotation[1] * Math.PI / 180;
    const targetScale = baseGlobeRadius * (region.scale || 1.0);

    const startPhi = phiRef.current;
    const startTheta = thetaRef.current;
    const startScale = scaleRef.current;

    // Shortest path interpolation for angular rotation
    const diffPhi = Math.atan2(Math.sin(targetPhi - startPhi), Math.cos(targetPhi - startPhi));

    const duration = 800; // ms
    const startTime = performance.now();
    let animId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out

      const nextPhi = startPhi + diffPhi * ease;
      const nextTheta = startTheta + (targetTheta - startTheta) * ease;
      const nextScale = startScale + (targetScale - startScale) * ease;

      setPhi(nextPhi);
      setTheta(nextTheta);
      setScale(nextScale);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [region]);

  const numericToAlpha3 = useMemo(() => {
    return buildNumericToAlpha3();
  }, []);

  const regionCountryCodes = useMemo(() => {
    return new Set(region.countries.map((c) => c.code));
  }, [region]);

  // Compute location markers for Cobe to highlight countries
  const cobeMarkers = useMemo(() => {
    if (!worldDataRef.current) return [];
    const countries = topojson.feature(worldDataRef.current, worldDataRef.current.objects.countries);

    return newsItems.map((item) => {
      const feature = countries.features.find((f) => numericToAlpha3[f.id] === item.countryCode);
      if (!feature) return null;

      const centroid = d3.geoCentroid(feature); // [lng, lat]
      return {
        location: [centroid[1], centroid[0]], // [lat, lng]
        size: item.countryCode === hoveredCountry ? 0.08 : 0.05
      };
    }).filter(Boolean);
  }, [newsItems, hoveredCountry, numericToAlpha3]);

  // Initialize and run Cobe WebGL Globe
  useEffect(() => {
    if (!canvasRef.current) return;

    let autoRotatePhi = phiRef.current;

    const globe = createGlobe(canvasRef.current, {
      width: internalWidth * 2,
      height: internalHeight * 2,
      devicePixelRatio: 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 0,
      diffuse: 1.1,
      mapSamples: 16000,
      mapBrightness: 1.2,
      baseColor: [0.98, 0.98, 0.98], // Off-white matching GMC background
      markerColor: [0.1, 0.1, 0.1], // Sleek black/charcoal markers
      glowColor: [0.93, 0.93, 0.93],
      markers: cobeMarkers,
      onRender: (state) => {
        // Auto rotate slightly when there is no user dragging
        if (!pointerInteracting.current) {
          autoRotatePhi += 0.0012;
          // Sync back to React state so HTML callouts rotate with the globe
          setPhi(autoRotatePhi);
        } else {
          autoRotatePhi = phiRef.current;
        }

        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.width = canvasRef.current.offsetWidth * 2;
        state.height = canvasRef.current.offsetHeight * 2;
      }
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = '1';
      }
    });

    return () => globe.destroy();
  }, [cobeMarkers]); // Recreate globe options when markers change

  // Calculate HTML callout screen coordinates using D3 projection synced with Cobe's state
  const calloutPositions = useMemo(() => {
    if (!worldDataRef.current) return [];

    const projection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([internalWidth / 2, internalHeight / 2])
      .clipAngle(90)
      .rotate([phi * 180 / Math.PI, -theta * 180 / Math.PI, 0]);

    const countries = topojson.feature(worldDataRef.current, worldDataRef.current.objects.countries);
    const center = projection.invert([internalWidth / 2, internalHeight / 2]);

    const items = newsItems.map((item) => {
      const feature = countries.features.find((f) => numericToAlpha3[f.id] === item.countryCode);
      if (!feature) return null;

      const centroid = d3.geoCentroid(feature); // [lng, lat]
      const dist = d3.geoDistance(center, centroid);

      // Filter out countries on the back side of the sphere (further than 90 degrees)
      if (dist >= Math.PI / 2) return null;

      const projected = projection(centroid);
      if (!projected) return null;

      return {
        countryCode: item.countryCode,
        countryName: item.countryName,
        newsText: item.newsText,
        color: item.color,
        x: projected[0],
        y: projected[1],
      };
    }).filter(Boolean);

    return resolveCollisions(items, 160, 44, internalWidth);
  }, [newsItems, phi, theta, scale, numericToAlpha3]);

  // Handle Dragging
  const handlePointerDown = (e) => {
    pointerInteracting.current = [e.clientX, e.clientY];
    pointerInteractionMovement.current = 0;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerUp = () => {
    pointerInteracting.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handlePointerMove = (e) => {
    if (pointerInteracting.current !== null) {
      const dx = e.clientX - pointerInteracting.current[0];
      const dy = e.clientY - pointerInteracting.current[1];
      pointerInteractionMovement.current += Math.abs(dx) + Math.abs(dy);

      setPhi((prev) => prev + dx / 220);
      setTheta((prev) => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev - dy / 220))); // Clamp to prevent vertical flip
      pointerInteracting.current = [e.clientX, e.clientY];
    } else {
      // Handle Hover detection
      if (!canvasRef.current || !worldDataRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleFactor = internalWidth / rect.width;
      const mx = mouseX * scaleFactor;
      const my = mouseY * scaleFactor;

      const projection = d3
        .geoOrthographic()
        .scale(scale)
        .translate([internalWidth / 2, internalHeight / 2])
        .clipAngle(90)
        .rotate([phi * 180 / Math.PI, -theta * 180 / Math.PI, 0]);

      const countries = topojson.feature(worldDataRef.current, worldDataRef.current.objects.countries);
      const center = projection.invert([internalWidth / 2, internalHeight / 2]);

      let closestCountry = null;
      let minDistance = Infinity;

      for (const c of region.countries) {
        const feature = countries.features.find((f) => numericToAlpha3[f.id] === c.code);
        if (!feature) continue;

        const centroid = d3.geoCentroid(feature);
        const distToCenter = d3.geoDistance(center, centroid);
        if (distToCenter >= Math.PI / 2) continue;

        const projected = projection(centroid);
        if (!projected) continue;

        const dx = mx - projected[0];
        const dy = my - projected[1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Within 32px detection threshold
        if (dist < 32 && dist < minDistance) {
          minDistance = dist;
          closestCountry = c.code;
        }
      }

      if (closestCountry !== hoveredCountryRef.current) {
        if (onHoverCountryRef.current) {
          onHoverCountryRef.current(closestCountry);
        }
      }
    }
  };

  const handlePointerOut = () => {
    pointerInteracting.current = null;
    if (onHoverCountryRef.current) {
      onHoverCountryRef.current(null);
    }
  };

  const handleCanvasClick = (e) => {
    if (pointerInteractionMovement.current > 6) return; // Prevent triggering click during drags

    if (!canvasRef.current || !worldDataRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleFactor = internalWidth / rect.width;
    const mx = mouseX * scaleFactor;
    const my = mouseY * scaleFactor;

    const projection = d3
      .geoOrthographic()
      .scale(scale)
      .translate([internalWidth / 2, internalHeight / 2])
      .clipAngle(90)
      .rotate([phi * 180 / Math.PI, -theta * 180 / Math.PI, 0]);

    const countries = topojson.feature(worldDataRef.current, worldDataRef.current.objects.countries);
    const center = projection.invert([internalWidth / 2, internalHeight / 2]);

    let closestCountry = null;
    let minDistance = Infinity;

    for (const c of region.countries) {
      const feature = countries.features.find((f) => numericToAlpha3[f.id] === c.code);
      if (!feature) continue;

      const centroid = d3.geoCentroid(feature);
      const distToCenter = d3.geoDistance(center, centroid);
      if (distToCenter >= Math.PI / 2) continue;

      const projected = projection(centroid);
      if (!projected) continue;

      const dx = mx - projected[0];
      const dy = my - projected[1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 32 && dist < minDistance) {
        minDistance = dist;
        closestCountry = c.code;
      }
    }

    if (closestCountry && onClickCountryRef.current) {
      onClickCountryRef.current(closestCountry);
    }
  };

  return (
    <div
      className="globe-canvas"
      id="globe-export-target"
      style={{
        width: `${canvasSize}px`,
        height: `${canvasSize}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: 0,
          transition: 'opacity 500ms ease',
          cursor: 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleCanvasClick}
      />

      {/* Floating Callout Boxes Overlay */}
      <div className="callout-container">
        {calloutPositions.map((box) => {
          // Normalize coordinates from internal 800x800 to screen size
          const screenX = (box.adjX / internalWidth) * canvasSize;
          const screenY = (box.adjY / internalHeight) * canvasSize;
          const targetX = (box.x / internalWidth) * canvasSize;
          const targetY = (box.y / internalHeight) * canvasSize;

          const isHovered = box.countryCode === hoveredCountry;

          return (
            <div key={box.countryCode}>
              {/* Connector Line */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <line
                  x1={screenX + (screenX < targetX ? 160 : 0)}
                  y1={screenY + 22}
                  x2={targetX}
                  y2={targetY}
                  stroke={box.color}
                  strokeWidth={isHovered ? 1.5 : 1}
                  strokeDasharray={isHovered ? '0' : '2,2'}
                  opacity={isHovered ? 1 : 0.6}
                  style={{ transition: 'stroke-width 200ms ease, opacity 200ms ease' }}
                />
              </svg>

              {/* Text Card */}
              <div
                className={`callout-box ${isHovered ? 'hovered' : ''}`}
                style={{
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  borderColor: isHovered ? '#000000' : 'rgba(0, 0, 0, 0.08)',
                  boxShadow: isHovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
                  transform: isHovered ? 'translateY(-2px)' : 'none',
                }}
                onMouseEnter={() => onHoverCountry && onHoverCountry(box.countryCode)}
                onMouseLeave={() => onHoverCountry && onHoverCountry(null)}
              >
                <div className="callout-box-header">
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: box.color,
                    }}
                  />
                  <Flag code={box.countryCode} size={16} />
                  <span className="callout-box-title">{box.countryName}</span>
                </div>
                <div className="callout-box-text">
                  {box.newsText || 'No news highlights available.'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

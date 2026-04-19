'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Map as MLMap, Marker as MLMarker, GeoJSONSource } from 'maplibre-gl';
import type { Guess, Unit, CircleMode } from '@/types/game';
import { geodesicCircle } from '@/lib/geo';

interface Props {
  onMapClick?: (lat: number, lng: number) => void;
  /** Hider mode: shows a single pin the Hider has placed */
  hiderPin?: { lat: number; lng: number } | null;
  /** Seeker mode: all guesses placed so far */
  guesses?: Guess[];
  /** Which guess circles to draw: 'off' | 'last' | 'all'. Defaults to 'off'. */
  circleMode?: CircleMode;
  unit?: Unit;
  /** Revealed treasure location (shown on win/loss/give-up) */
  treasurePin?: { lat: number; lng: number } | null;
  /** Initial map center [lng, lat] — MapLibre's coordinate order. Defaults to
   *  [0, 20] (whole-globe world view centered near the equator). */
  center?: [number, number];
  /** Initial zoom level. Defaults to 2. */
  zoom?: number;
}

// Color ramp: red (far) → orange → yellow → lime → green (close)
const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function guessColor(index: number, total: number): string {
  if (total <= 1) return COLORS[0];
  const ratio = index / (total - 1);
  const colorIndex = Math.round(ratio * (COLORS.length - 1));
  return COLORS[colorIndex];
}

function makeGuessPinEl(guess: Guess, color: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `background:${color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid rgba(255,255,255,0.8);box-shadow:0 1px 3px rgba(0,0,0,0.6);cursor:pointer;`;
  el.textContent = String(guess.guessNumber);
  return el;
}

function makeTreasurePinEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));cursor:pointer;';
  el.textContent = '⭐';
  return el;
}

function makeHiderPinEl(): HTMLDivElement {
  const el = document.createElement('div');
  // Simple blue circle — matches the Hider's single treasure pin visual role
  el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:2px solid rgba(255,255,255,0.9);box-shadow:0 1px 3px rgba(0,0,0,0.5);cursor:pointer;';
  return el;
}

const CIRCLES_SOURCE = 'guess-circles';
const CIRCLES_FILL = 'guess-circles-fill';
const CIRCLES_LINE = 'guess-circles-line';

export default function MapComponent({
  onMapClick,
  hiderPin,
  guesses = [],
  circleMode = 'off',
  unit: _unit,
  treasurePin,
  center = [0, 20],
  zoom = 2,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const onMapClickRef = useRef(onMapClick);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialise the MapLibre GL map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current) return;

      const tileUrl =
        process.env.NEXT_PUBLIC_TILE_URL ??
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      const tileAttribution =
        process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ??
        'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          // 3D globe projection — auto-flattens to Mercator past ~zoom 6.
          projection: { type: 'globe' },
          sources: {
            satellite: {
              type: 'raster',
              tiles: [tileUrl],
              tileSize: 256,
              attribution: tileAttribution,
            },
          },
          layers: [
            { id: 'satellite-layer', type: 'raster', source: 'satellite' },
          ],
        },
        center,
        zoom,
        minZoom: 0,
        maxZoom: 18,
        attributionControl: { compact: true },
      });

      map.on('click', (e) => {
        onMapClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
      });

      map.on('load', () => {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

        // Empty GeoJSON source; real features set per prop change in the
        // redraw effect below.
        map.addSource(CIRCLES_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: CIRCLES_FILL,
          type: 'fill',
          source: CIRCLES_SOURCE,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.04,
          },
        });
        map.addLayer({
          id: CIRCLES_LINE,
          type: 'line',
          source: CIRCLES_SOURCE,
          paint: {
            'line-color': ['get', 'color'],
            'line-opacity': 0.6,
            'line-width': 1.5,
          },
        });

        mapRef.current = map;
        setMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — map initialises once

  // Re-draw all pins and circles whenever data props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove all previously drawn markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;

      // Hider pin (single blue dot)
      if (hiderPin) {
        const marker = new maplibregl.Marker({ element: makeHiderPinEl(), anchor: 'center' })
          .setLngLat([hiderPin.lng, hiderPin.lat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setText('Treasure placed here'))
          .addTo(map);
        markersRef.current.push(marker);
      }

      // Treasure revealed pin (gold star)
      if (treasurePin) {
        const marker = new maplibregl.Marker({ element: makeTreasurePinEl(), anchor: 'center' })
          .setLngLat([treasurePin.lng, treasurePin.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText('The treasure was here!'))
          .addTo(map);
        markersRef.current.push(marker);
        map.panTo([treasurePin.lng, treasurePin.lat]);
      }

      // Guess pins + circle polygons
      const total = guesses.length;
      const circleFeatures: GeoJSON.Feature[] = [];

      guesses.forEach((guess, i) => {
        const color = guessColor(i, total);

        const marker = new maplibregl.Marker({ element: makeGuessPinEl(guess, color), anchor: 'center' })
          .setLngLat([guess.lng, guess.lat])
          .setPopup(new maplibregl.Popup({ offset: 14 }).setText(`Guess #${guess.guessNumber}`))
          .addTo(map);
        markersRef.current.push(marker);

        const drawThisCircle =
          circleMode === 'all' ||
          (circleMode === 'last' && i === guesses.length - 1);
        if (drawThisCircle && guess.distanceMeters > 0) {
          const feature = geodesicCircle([guess.lng, guess.lat], guess.distanceMeters);
          circleFeatures.push({
            ...feature,
            properties: { color },
          });
        }
      });

      // Update the circle polygons source with the current set
      const src = map.getSource(CIRCLES_SOURCE) as GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: 'FeatureCollection',
          features: circleFeatures,
        });
      }
    })();
  }, [hiderPin, guesses, circleMode, treasurePin, mapReady]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

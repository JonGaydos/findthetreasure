'use client';

import { useEffect, useRef } from 'react';
import type { Map, Marker, Circle } from 'leaflet';
import type { Guess, Unit } from '@/types/game';

interface Props {
  onMapClick?: (lat: number, lng: number) => void;
  /** Hider mode: shows a single pin the Hider has placed */
  hiderPin?: { lat: number; lng: number } | null;
  /** Seeker mode: all guesses placed so far */
  guesses?: Guess[];
  /** Whether to draw distance-radius circles around each guess pin */
  showCircles?: boolean;
  unit?: Unit;
  /** Revealed treasure location (shown on win/loss/give-up) */
  treasurePin?: { lat: number; lng: number } | null;
  /** Initial map center [lat, lng]. Defaults to [20, 0] (world view). */
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

export default function MapComponent({
  onMapClick,
  hiderPin,
  guesses = [],
  showCircles = true,
  unit: _unit,
  treasurePin,
  center = [20, 0],
  zoom = 2,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const layersRef = useRef<(Marker | Circle)[]>([]);

  // Initialise the Leaflet map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      // Leaflet CSS must be imported dynamically alongside the library
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !containerRef.current) return;

      // Fix webpack/Next.js asset path for default marker icons
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: '/leaflet/marker-icon.png',
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      const map = L.map(containerRef.current).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on('click', (e) => onMapClick(e.latlng.lat, e.latlng.lng));
      }

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — map initialises once

  // Re-draw all pins and circles whenever data props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove all previously drawn layers
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    (async () => {
      const L = (await import('leaflet')).default;

      // Hider pin (standard blue marker)
      if (hiderPin) {
        const marker = L.marker([hiderPin.lat, hiderPin.lng]).addTo(map);
        marker.bindPopup('Treasure placed here');
        layersRef.current.push(marker);
      }

      // Treasure revealed pin (gold star emoji icon)
      if (treasurePin) {
        const goldIcon = L.divIcon({
          html: '<div style="font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));">⭐</div>',
          className: '',
          iconAnchor: [12, 12],
        });
        const marker = L.marker([treasurePin.lat, treasurePin.lng], { icon: goldIcon }).addTo(map);
        marker.bindPopup('The treasure was here!');
        layersRef.current.push(marker);
        map.panTo([treasurePin.lat, treasurePin.lng]);
      }

      // Guess pins (numbered, color-ramp from red to green)
      const total = guesses.length;
      guesses.forEach((guess, i) => {
        const color = guessColor(i, total);
        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid rgba(255,255,255,0.8);box-shadow:0 1px 3px rgba(0,0,0,0.6);">${guess.guessNumber}</div>`,
          className: '',
          iconAnchor: [11, 11],
        });
        const marker = L.marker([guess.lat, guess.lng], { icon }).addTo(map);
        marker.bindPopup(`Guess #${guess.guessNumber}`);
        layersRef.current.push(marker);

        if (showCircles && guess.distanceMeters > 0) {
          const circle = L.circle([guess.lat, guess.lng], {
            radius: guess.distanceMeters,
            color,
            fillColor: color,
            fillOpacity: 0.04,
            weight: 1.5,
            opacity: 0.6,
          }).addTo(map);
          layersRef.current.push(circle);
        }
      });
    })();
  }, [hiderPin, guesses, showCircles, treasurePin]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

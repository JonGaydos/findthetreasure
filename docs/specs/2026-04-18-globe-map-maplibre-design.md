# Globe Map — Swap Leaflet for MapLibre GL

**Date:** 2026-04-18
**Branch:** `globe-map-maplibre`
**Scope:** Replace Leaflet with MapLibre GL JS so the map renders as a 3D globe at low zoom. Fixes the wrapped-tile click bug as a side effect (globe projection doesn't have the wrap-around issue). Keeps the compact mobile layout, the satellite tile default, and the tri-state circles behavior intact.

## Problem

On `/hide` and `/play`, Leaflet renders the world as a flat Mercator-projected tile grid that **repeats horizontally indefinitely** by default. Clicks on wrapped copies produce `lng` values outside `[-180, 180]`, which both `/api/create-game` and `/api/guess` validate away with a 400 — the client swallows the error, nothing happens. The user experience: "the map works until you pan past the date line, then nothing responds."

Beyond the bug, the user wants the map to feel like a globe. A 3D projection matches the "pin a spot anywhere on Earth" theme of the game better than a flat scrollable carpet.

## Goal

- `/hide` and `/play` render a 3D globe at low zoom that smoothly flattens to a normal flat map around zoom 5-6 as the user zooms in.
- Initial view: `center=[0, 20]` (lng/lat), zoom 2 — the whole globe visible, like today.
- Every interactive behavior we have works on the globe: map-tap places pin, taps place guesses, guess circles track geographic radius, tri-state circles selector works, treasure-reveal pin appears on win/loss.
- No wrapped-tile click bug — clicking anywhere on the visible globe produces a valid `lng` in `[-180, 180]`.
- Callers (`/hide`, `/play` page components) keep the same `MapComponent` prop surface — no changes to their code.
- Public prop surface of `MapComponent`: `onMapClick`, `hiderPin`, `guesses`, `circleMode`, `treasurePin`, `center`, `zoom`, `unit` (all existing). No new props.

## Non-goals

- Adding a toggle between globe and flat on demand.
- 3D terrain, elevation data, or sky.
- Replacing the Esri satellite tile default. MapLibre consumes the same URL template.
- Adding a vector-tile-based style (MapTiler, OpenFreeMap, etc.). Keep raster tiles.
- New features — no rotation controls, no street-view, no compass.
- Fixing unrelated lint warnings in `hooks/useGameState.ts`.
- Changing `/`, `/find`, or desktop layout (map component behavior is identical on desktop).

## Design

### Library choice

**MapLibre GL JS 5.22+** (latest stable as of April 2026, globe projection has been GA since 5.0.0 in January 2025).

- **License:** BSD-3-Clause — free for any use including commercial. Future-proof; no ToS to re-read if this ever monetizes.
- **Bundle cost:** ~+250 KB gzipped vs Leaflet. `MapComponent` is already loaded via `next/dynamic({ ssr: false })`, so it lives in its own chunk that `/` and `/find` don't load.
- **WebGL requirement:** WebGL 1 + `OES_standard_derivatives` (practically every device shipped since 2015 including all current phones). Older devices get a blank canvas and a console warning — acceptable for this hobby game.

### Projection

```ts
new maplibregl.Map({
  container,
  projection: { type: 'globe' },
  center: [0, 20],       // lng, lat — MapLibre's coordinate order (opposite of Leaflet)
  zoom: 2,
  minZoom: 0,
  maxZoom: 18,
  attributionControl: { compact: true },
});
```

MapLibre auto-transitions from spherical globe to flat Mercator across zoom 5-6 natively — no code to write. Panning past the date line wraps smoothly (`worldCopyJump` equivalent is built in). Atmosphere/sky effect is on by default once `projection: 'globe'` is set.

### File / boundary changes

| File | Change |
|---|---|
| `components/MapComponent.tsx` | Rewrite against MapLibre GL API. Same public prop surface. |
| `package.json` | `-leaflet ^1.9.4`, `-@types/leaflet ^1.9.21`, `+maplibre-gl ^5.22.0` |
| `public/leaflet/` | Delete the directory. MapLibre doesn't need pre-staged marker icons (we already use custom `divIcon`-style HTML for every pin, which becomes `Marker({ element })` in MapLibre). |
| `app/globals.css` | Replace `@import 'leaflet/dist/leaflet.css'` reference (currently inside `MapComponent.tsx` as a module import) with `@import 'maplibre-gl/dist/maplibre-gl.css'` — same location. |
| `README.md` | Update the "Tech stack" line: `Leaflet` → `MapLibre GL JS` |
| `AGENTS.md` | Add a line in the Mobile Testing section: verify the map renders as a globe at zoom 2 and flattens smoothly as you zoom in. |
| `lib/geo.ts` (new file) | Pure helper `geodesicCircle(center, radiusMeters, vertices = 64)` → returns a GeoJSON `Polygon` feature approximating a circle of `radiusMeters` around `center` on the WGS-84 sphere. ~15 LOC using forward-haversine math, same spherical model as `lib/haversine.ts`. |
| `__tests__/lib/geo.test.ts` (new file) | Unit test for `geodesicCircle` — input NYC coords + 1 km radius, assert 65 vertices and round-trip distance via `haversineMeters` is within 1 m of the requested radius. |

### Data flow / render pipeline inside `MapComponent`

```
mount
 └─ dynamic import maplibre-gl
 └─ new maplibregl.Map({projection: 'globe', ...})
 └─ map.on('load', () => add one 'raster' source pointing at tileUrl, one 'raster' layer on top)
 └─ map.on('click', e => props.onMapClick?.(e.lngLat.lat, e.lngLat.lng))

re-render when guesses / hiderPin / treasurePin / circleMode change
 └─ remove prior Marker instances (tracked in a ref, same pattern as current Leaflet code)
 └─ for each guess: Marker with a colored/numbered HTML element
 └─ for hiderPin: Marker with default styling (or a reused icon)
 └─ for treasurePin: Marker with the ⭐ emoji HTML element
 └─ rebuild circles source+layer from GeoJSON FeatureCollection of polygons
     └─ off: empty FeatureCollection
     └─ last: one polygon around guesses[last]
     └─ all: polygons around every guess

unmount
 └─ map.remove()
```

### Markers

Current Leaflet `L.marker([lat,lng], { icon: L.divIcon({ html }) })` becomes:

```ts
const el = document.createElement('div');
el.innerHTML = htmlString;
new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
```

Same color ramp (`#ef4444 → #22c55e`), same `guessColor(i, total)` helper, same HTML string per pin. Guess popups using `marker.bindPopup('Guess #N')` in Leaflet become `marker.setPopup(new maplibregl.Popup().setText('Guess #N'))`.

### Circles — geodesic polygon approximation

MapLibre's built-in `circle` paint uses a pixel radius, which would visually shrink as you zoom. For geographic-radius circles we generate a polygon approximation.

```ts
function geodesicCircle(
  center: [number, number],  // [lng, lat]
  radiusMeters: number,
  vertices = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const R = 6_371_000;
  const d = radiusMeters / R;       // angular distance in radians
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const coords: [number, number][] = [];

  for (let i = 0; i <= vertices; i++) {
    const bearing = (i / vertices) * 2 * Math.PI;
    const φ = Math.asin(Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(bearing));
    const λ = lngR + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(latR),
      Math.cos(d) - Math.sin(latR) * Math.sin(φ),
    );
    coords.push([(λ * 180) / Math.PI, (φ * 180) / Math.PI]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}
```

Rendered as two MapLibre layers stacked on one GeoJSON source:
- `fill` layer with `fill-color` from the guess's color ramp, `fill-opacity: 0.04`
- `line` layer with `line-color` from the same ramp, `line-opacity: 0.6`, `line-width: 1.5`

This is a new pure function — **add a small unit test** (input: NYC coords + 1 km radius; expect the polygon to have 65 vertices and the farthest vertex to be ~1000 m from center via `haversineMeters`).

### Click handling — the wrap bug is gone

With globe projection, `map.on('click', e => e.lngLat)` always reports `lng` in `[-180, 180]` because the globe surface doesn't have overflow tiles. No client-side normalization needed. The API validation in `/api/create-game` and `/api/guess` (which rejects lng outside `[-180, 180]`) stops rejecting legitimate clicks because none will ever be out of range.

**Consequence:** the exact bug the user reported disappears without touching the API routes.

### Dependencies

```diff
  "dependencies": {
-   "@types/leaflet": "^1.9.21",
    ...
-   "leaflet": "^1.9.4",
+   "maplibre-gl": "^5.22.0",
    ...
  }
```

MapLibre ships TypeScript types in the main package — no separate `@types` package needed.

No new dev-dependencies.

## Implementation sequence

1. **Branch** `globe-map-maplibre` off latest `main`. *(Already done.)*
2. **Add** the `geodesicCircle` helper in a new file `lib/geo.ts` (pure function, easy to unit-test). Write the failing test first. (TDD.)
3. **Install** `maplibre-gl`, uninstall `leaflet` and `@types/leaflet`.
4. **Rewrite** `components/MapComponent.tsx`. Preserve prop surface. Port markers, circles, click handler.
5. **Delete** `public/leaflet/` directory.
6. **Update** `README.md` tech-stack line and `AGENTS.md` mobile checklist.
7. **Full verify:** `npm run lint` (no new issues over 8-baseline), `npm test` (old 45 + new geodesic test), `npm run build`, mobile emulator walkthrough on `/hide` and `/play`, production build walkthrough.
8. **Commit** (ideally two commits: `feat(map): add geodesicCircle helper + tests`, then `feat(map): swap Leaflet for MapLibre GL with globe projection`).
9. **Merge** to `main`, push to GitHub. Vercel auto-redeploys.
10. **Real-phone verification** on the live Vercel URL — walk the AGENTS.md mobile checklist end-to-end. This is the final authoritative check.

## Verification

- [ ] `/hide` mobile emulator: map shows a globe at initial zoom 2, controls (zoom +/-) visible. Tap anywhere → pin appears at the tapped location. Zoom in past level 6 — smoothly flattens to Mercator. Zoom back out — re-forms the globe.
- [ ] `/play` emulator (Practice mode): map starts zoomed out, globe visible. Tap to place a guess → pin appears, last-distance updates, circles selector cycles through off/last/all with correct rendering (no circle / only last guess / all guesses).
- [ ] Circles honor geographic radius: zoom in on a guess, the circle's visible radius grows proportionally (flat map zoom, not fixed pixel size).
- [ ] Wrap/date-line test: pan the globe so the International Date Line is visible, tap on the "other side" — guess/pin lands correctly, no 400 error, no silent failure.
- [ ] Production build (`npm run build && npm start`): same behavior as dev.
- [ ] `npm run lint` — at or below 8-problem baseline.
- [ ] `npm test` — 46 green (the new `geodesicCircle` test passes; existing 45 still pass).
- [ ] Vercel auto-deploy shows globe on the live URL after merge to main.
- [ ] **Real phone over cell or Wi-Fi**: AGENTS.md mobile checklist walkthrough end-to-end. Most important item: globe is visibly curved on initial load, taps land where expected, performance is acceptable (no frame drops panning the globe on a mid-range phone).

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| WebGL unavailable on an ancient browser | Low | Graceful degradation — MapLibre shows a blank canvas and logs a warning; user sees the panel but no map. Same functional consequence as a network failure. |
| Globe performance poor on low-end phones | Low-medium | Auto-switch projection (enabled by default) keeps the GPU-expensive sphere only at low zooms. User zooms in → flat map, cheap. |
| Esri raster tiles render with visible seams on the globe | Low | MapLibre's raster globe rendering handles tile reprojection correctly — Esri's tiles are standard Web Mercator raster, supported out of the box. Test during emulator verification. |
| Markers/circles visually misaligned at the poles | Low | Our game centers on `[0, 20]` (temperate latitudes); pole-edge pins are unlikely. `geodesicCircle` handles any latitude correctly via spherical math. |
| Bundle size regression hurts mobile data users | Accepted | ~+250 KB gzipped only loads on `/hide` and `/play`. Home and `/find` unaffected. User agreed to the tradeoff. |

## Rollback

If something breaks in production:

1. `git revert <merge-commit>` on `main`.
2. `git push origin main`.
3. Vercel auto-deploys the revert in ~60 seconds.

No data schema, no API, no localStorage, no share-code format changes — rollback is purely code.

## Success, in one sentence

The user opens the app on their phone, sees a 3D globe with satellite imagery, places a pin anywhere including on the far side of the planet, and the game plays through without the wrapped-tile bug — all on Vercel Hobby with no tile provider change.

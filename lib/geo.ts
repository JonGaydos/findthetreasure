/**
 * GeoJSON Polygon feature approximating a circle of `radiusMeters` around
 * `center` on the WGS-84 sphere. Built from evenly-bearing points using
 * the forward-haversine formula (same spherical model as lib/haversine.ts).
 *
 * Used by the map component to render guess-radius overlays that track a
 * real-world radius (MapLibre's built-in circle paint is pixel-based, which
 * wouldn't shrink/grow correctly as the user zooms).
 */

const EARTH_RADIUS_M = 6_371_000;

/** A minimal GeoJSON.Feature<Polygon> shape. Keeps the type self-contained
 *  so this module has no runtime or type dependencies beyond the standard
 *  library. */
export interface GeodesicCircleFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

/**
 * Generate a polygon approximation of a geographic circle.
 *
 * @param center       [lng, lat] in degrees — MapLibre/GeoJSON coordinate order.
 * @param radiusMeters Radius in meters.
 * @param vertices     Number of evenly-spaced bearing points around the ring.
 *                     Defaults to 64, which is visually smooth at any reasonable
 *                     zoom. The returned ring has `vertices + 1` points because
 *                     the last point equals the first (closed ring, per GeoJSON).
 */
export function geodesicCircle(
  center: [number, number],
  radiusMeters: number,
  vertices = 64,
): GeodesicCircleFeature {
  const [lng, lat] = center;
  const d = radiusMeters / EARTH_RADIUS_M; // angular distance in radians
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const coords: [number, number][] = [];

  for (let i = 0; i <= vertices; i++) {
    const bearing = (i / vertices) * 2 * Math.PI;
    const φ = Math.asin(
      Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(bearing),
    );
    const λ =
      lngR +
      Math.atan2(
        Math.sin(bearing) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(φ),
      );
    coords.push([(λ * 180) / Math.PI, (φ * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

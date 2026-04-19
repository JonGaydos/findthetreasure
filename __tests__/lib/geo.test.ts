import { geodesicCircle } from '@/lib/geo';
import { haversineMeters } from '@/lib/haversine';

// NYC — Empire State Building-ish
const NYC: [number, number] = [-74.0060, 40.7128]; // [lng, lat]

test('geodesicCircle: default vertex count produces 65 points (closed ring)', () => {
  const circle = geodesicCircle(NYC, 1000);
  expect(circle.type).toBe('Feature');
  expect(circle.geometry.type).toBe('Polygon');
  expect(circle.geometry.coordinates).toHaveLength(1); // outer ring only
  expect(circle.geometry.coordinates[0]).toHaveLength(65); // 64 vertices + closing point
});

test('geodesicCircle: first and last points are identical (closed ring)', () => {
  const circle = geodesicCircle(NYC, 1000);
  const ring = circle.geometry.coordinates[0];
  expect(ring[0]).toEqual(ring[ring.length - 1]);
});

test('geodesicCircle: every vertex is ~radius meters from center (within 1 m)', () => {
  const radius = 1000; // 1 km
  const circle = geodesicCircle(NYC, radius);
  const ring = circle.geometry.coordinates[0];
  const [lng, lat] = NYC;

  for (const [vLng, vLat] of ring) {
    const distance = haversineMeters(lat, lng, vLat, vLng);
    expect(distance).toBeCloseTo(radius, 0); // within 1 m (the 2nd arg is decimals of precision)
  }
});

test('geodesicCircle: accepts custom vertex count', () => {
  const circle = geodesicCircle(NYC, 500, 16);
  expect(circle.geometry.coordinates[0]).toHaveLength(17); // 16 + closing
});

test('geodesicCircle: 10 km radius also round-trips within tolerance', () => {
  const radius = 10_000;
  const circle = geodesicCircle(NYC, radius);
  const [lng, lat] = NYC;
  for (const [vLng, vLat] of circle.geometry.coordinates[0]) {
    expect(haversineMeters(lat, lng, vLat, vLng)).toBeCloseTo(radius, 0);
  }
});

test('geodesicCircle: works at extreme latitudes (near north pole)', () => {
  const nearPole: [number, number] = [0, 89];
  const radius = 50_000; // 50 km
  const circle = geodesicCircle(nearPole, radius);
  const [lng, lat] = nearPole;
  for (const [vLng, vLat] of circle.geometry.coordinates[0]) {
    expect(haversineMeters(lat, lng, vLat, vLng)).toBeCloseTo(radius, 0);
  }
});

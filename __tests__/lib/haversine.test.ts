import { haversineMeters } from '@/lib/haversine';

test('same point returns 0', () => {
  expect(haversineMeters(40.712776, -74.005974, 40.712776, -74.005974)).toBe(0);
});

test('NYC to LAX is approximately 3,940 km', () => {
  const d = haversineMeters(40.712776, -74.005974, 33.9425, -118.408056);
  // Allow ±50 km margin for Earth radius approximation
  expect(d).toBeGreaterThan(3_890_000);
  expect(d).toBeLessThan(3_990_000);
});

test('1 degree latitude apart at equator ≈ 111 km', () => {
  const d = haversineMeters(0, 0, 1, 0);
  expect(d).toBeCloseTo(111_195, -2);
});

test('symmetry: A→B equals B→A', () => {
  const d1 = haversineMeters(51.5, -0.1, 48.8, 2.3);
  const d2 = haversineMeters(48.8, 2.3, 51.5, -0.1);
  expect(d1).toBeCloseTo(d2, 6);
});

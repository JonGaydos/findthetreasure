import { metersToUnit, unitToMeters, formatDistance, toleranceUnit, toleranceRange } from '@/lib/units';

test('metersToUnit: 1 m = 3.28084 ft', () => {
  expect(metersToUnit(1, 'ft')).toBeCloseTo(3.28084, 4);
});

test('metersToUnit: 1000 m = 1 km', () => {
  expect(metersToUnit(1000, 'km')).toBe(1);
});

test('metersToUnit: 1609.344 m = 1 mi', () => {
  expect(metersToUnit(1609.344, 'mi')).toBeCloseTo(1, 4);
});

test('metersToUnit: same unit (m→m) is identity', () => {
  expect(metersToUnit(42, 'm')).toBe(42);
});

test('unitToMeters is the inverse of metersToUnit', () => {
  expect(unitToMeters(metersToUnit(500, 'ft'), 'ft')).toBeCloseTo(500, 4);
});

test('formatDistance: small value shows 2 decimals', () => {
  expect(formatDistance(3, 'm')).toBe('3.00 m');
});

test('formatDistance: large value rounds', () => {
  expect(formatDistance(5000, 'm')).toBe('5000 m');
});

test('toleranceUnit: ft for imperial units', () => {
  expect(toleranceUnit('ft')).toBe('ft');
  expect(toleranceUnit('mi')).toBe('ft');
});

test('toleranceUnit: m for metric units', () => {
  expect(toleranceUnit('m')).toBe('m');
  expect(toleranceUnit('km')).toBe('m');
});

test('toleranceRange: ft range is 1–500', () => {
  expect(toleranceRange('ft')).toEqual({ min: 1, max: 500, step: 1 });
});

test('toleranceRange: m range is 1–150', () => {
  expect(toleranceRange('km')).toEqual({ min: 1, max: 150, step: 1 });
});

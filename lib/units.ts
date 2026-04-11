import type { Unit } from '@/types/game';

const METERS_PER: Record<Unit, number> = {
  m: 1,
  ft: 0.3048,
  mi: 1609.344,
  km: 1000,
};

export function metersToUnit(meters: number, unit: Unit): number {
  return meters / METERS_PER[unit];
}

export function unitToMeters(value: number, unit: Unit): number {
  return value * METERS_PER[unit];
}

export function formatDistance(meters: number, unit: Unit): string {
  const value = metersToUnit(meters, unit);
  const label = unit;
  if (value < 10) return `${value.toFixed(2)} ${label}`;
  if (value < 100) return `${value.toFixed(1)} ${label}`;
  return `${Math.round(value)} ${label}`;
}

/** Returns the small unit of the chosen system (ft for imperial, m for metric). */
export function toleranceUnit(unit: Unit): 'ft' | 'm' {
  return unit === 'ft' || unit === 'mi' ? 'ft' : 'm';
}

/** Slider range for tolerance, always in the small unit of the chosen system. */
export function toleranceRange(unit: Unit): { min: number; max: number; step: number } {
  if (unit === 'ft' || unit === 'mi') return { min: 1, max: 500, step: 1 };
  return { min: 1, max: 150, step: 1 };
}

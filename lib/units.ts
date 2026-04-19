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

/** Slider range for tolerance, in the Hider's chosen unit. Each unit has a
 *  range sized to its scale — ft/m are fine-grain for backyard/park games,
 *  mi/km are coarser-grain (0.1 step) for neighborhood/regional games. */
export function toleranceRange(unit: Unit): { min: number; max: number; step: number } {
  switch (unit) {
    case 'ft': return { min: 1, max: 500, step: 1 };
    case 'm':  return { min: 1, max: 150, step: 1 };
    case 'mi': return { min: 0.1, max: 10, step: 0.1 };
    case 'km': return { min: 0.1, max: 15, step: 0.1 };
  }
}

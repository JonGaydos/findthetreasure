'use client';

import type { Guess, Unit } from '@/types/game';
import { formatDistance } from '@/lib/units';

interface Props {
  guesses: Guess[];
  unit: Unit;
}

function distanceColor(meters: number, allGuesses: Guess[]): string {
  if (allGuesses.length < 2) return 'text-slate-400';
  const min = Math.min(...allGuesses.map((g) => g.distanceMeters));
  const max = Math.max(...allGuesses.map((g) => g.distanceMeters));
  const range = max - min;
  if (range === 0) return 'text-slate-400';
  const ratio = 1 - (meters - min) / range;
  if (ratio > 0.66) return 'text-green-400';
  if (ratio > 0.33) return 'text-yellow-400';
  return 'text-red-400';
}

export default function GuessHistory({ guesses, unit }: Props) {
  if (guesses.length === 0) {
    return (
      <p className="text-slate-500 text-xs text-center py-2">No guesses yet</p>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-44">
      {[...guesses].reverse().map((g) => (
        <div
          key={g.guessNumber}
          className="flex justify-between items-center text-xs px-1 py-0.5"
        >
          <span className="text-slate-500">#{g.guessNumber}</span>
          <span className={distanceColor(g.distanceMeters, guesses)}>
            {formatDistance(g.distanceMeters, unit)}
          </span>
        </div>
      ))}
    </div>
  );
}

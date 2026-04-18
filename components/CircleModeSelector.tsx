'use client';

import type { CircleMode } from '@/types/game';

interface Props {
  value: CircleMode;
  onChange: (mode: CircleMode) => void;
}

const MODES: { value: CircleMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'last', label: 'Last' },
  { value: 'all', label: 'All' },
];

export default function CircleModeSelector({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Circles</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Circle overlay mode">
        {MODES.map(m => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={value === m.value}
            onClick={() => onChange(m.value)}
            className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
              value === m.value
                ? 'bg-blue-800 border-blue-600 text-blue-200'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

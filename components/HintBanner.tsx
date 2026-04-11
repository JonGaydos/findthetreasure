'use client';

import { useState } from 'react';

interface Props {
  hint: string;
}

export default function HintBanner({ hint }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-start justify-between gap-2 p-3 bg-amber-950/50 border border-amber-600/40 rounded-lg">
      <div className="min-w-0">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">
          💡 Hint Unlocked
        </p>
        <p className="text-amber-200 text-sm leading-snug">{hint}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 text-xs shrink-0 mt-0.5 transition-colors"
        aria-label="Dismiss hint"
      >
        ✕
      </button>
    </div>
  );
}

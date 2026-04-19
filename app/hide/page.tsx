'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import ShareCodeDisplay from '@/components/ShareCodeDisplay';
import { unitToMeters, toleranceUnit, toleranceRange } from '@/lib/units';
import type { Unit } from '@/types/game';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const UNITS: Unit[] = ['ft', 'm', 'mi', 'km'];

export default function HidePage() {
  const router = useRouter();
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [unit, setUnit] = useState<Unit>('ft');
  const [toleranceValue, setToleranceValue] = useState(25);
  const [hint, setHint] = useState('');
  const [hintAfterGuesses, setHintAfterGuesses] = useState(20);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tolerUnits = toleranceUnit(unit);
  const tolerRange = toleranceRange(unit);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPin({ lat, lng });
    setShareCode(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const toleranceMeters = unitToMeters(toleranceValue, tolerUnits);
      const body: Record<string, unknown> = { lat: pin.lat, lng: pin.lng, toleranceMeters, unit };
      if (hint.trim()) {
        body.hint = hint.trim();
        body.hintAfterGuesses = hintAfterGuesses;
      }
      const res = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShareCode(data.shareCode);
    } catch {
      setError('Failed to generate share code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pin, hint, hintAfterGuesses, toleranceValue, tolerUnits, unit]);

  // Compact single-page panel. Used on both mobile (below the sticky map)
  // and desktop (in the right-hand side panel). Rows scroll if content
  // overflows; the Generate button stays pinned at the bottom.
  const panel = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {/* Header row — back, title, pin status on one line */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            ← Back
          </button>
          <h1 className="text-white font-semibold text-sm">Hide</h1>
          {pin ? (
            <span className="text-green-400 text-[11px] tabular-nums">📍 placed</span>
          ) : (
            <span className="text-slate-500 text-[11px]">tap map</span>
          )}
        </div>

        {/* Unit pills — no separate label, pills are self-explanatory */}
        <div className="flex gap-2">
          {UNITS.map(u => (
            <button
              key={u}
              onClick={() => {
                setUnit(u);
                const range = toleranceRange(u);
                setToleranceValue(range.min + Math.floor((range.max - range.min) * 0.05));
              }}
              className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors ${
                unit === u
                  ? 'bg-blue-800 border-blue-600 text-blue-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Tolerance — label, slider, value on one row */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-[10px] uppercase tracking-wide shrink-0">
            Tolerance
          </span>
          <Slider
            min={tolerRange.min}
            max={tolerRange.max}
            step={tolerRange.step}
            value={[toleranceValue]}
            onValueChange={vals => setToleranceValue(vals[0])}
            className="flex-1"
          />
          <span className="text-white text-xs font-semibold shrink-0 tabular-nums min-w-[48px] text-right">
            {toleranceValue}{tolerUnits}
          </span>
        </div>

        {/* Hint — just the input; sub-control appears after typing */}
        <div>
          <Input
            id="hint"
            placeholder="Add a hint (optional)…"
            value={hint}
            onChange={e => setHint(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm"
          />
          {hint.trim() && (
            <div className="mt-2 flex items-center gap-3">
              <Label htmlFor="hint-after" className="text-slate-500 text-[10px] uppercase tracking-wide shrink-0">
                Unlock after
              </Label>
              <Slider
                id="hint-after"
                min={1}
                max={53}
                step={1}
                value={[hintAfterGuesses]}
                onValueChange={vals => setHintAfterGuesses(vals[0])}
                className="flex-1"
              />
              <span className="text-white text-xs font-semibold shrink-0 tabular-nums min-w-[44px] text-right">
                {hintAfterGuesses} {hintAfterGuesses === 1 ? 'guess' : 'guesses'}
              </span>
            </div>
          )}
        </div>

        {/* Share code result */}
        {shareCode && <ShareCodeDisplay shareCode={shareCode} />}
      </div>

      {/* Sticky action area */}
      <div className="shrink-0 p-3 pt-2 border-t border-slate-800/70 bg-slate-950">
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <Button
          onClick={handleGenerate}
          disabled={!pin || loading}
          className="w-full bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40"
        >
          {loading ? 'Generating...' : 'Generate Code ↗'}
        </Button>
      </div>
    </div>
  );

  const map = (
    <div className="absolute inset-0">
      <MapComponent onMapClick={handleMapClick} hiderPin={pin} />
      {!pin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-sm px-4 py-2 rounded-full border border-slate-700 pointer-events-none whitespace-nowrap">
          Tap anywhere to place the treasure
        </div>
      )}
      {pin && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-900/90 text-green-300 text-sm px-4 py-2 rounded-full border border-green-700 pointer-events-none whitespace-nowrap">
          ✓ Pin placed
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile layout: sticky map top (~70vh), compact panel below ── */}
      <div className="flex flex-col h-screen bg-slate-950 md:hidden">
        <div className="relative shrink-0" style={{ height: '70vh' }}>
          {map}
        </div>
        <div className="flex-1 min-h-0 bg-slate-950 border-t border-slate-800">
          {panel}
        </div>
      </div>

      {/* ── Desktop layout: full-bleed map + right side panel ── */}
      <div className="hidden md:flex h-screen bg-slate-950 overflow-hidden">
        <div className="flex-1 relative">{map}</div>
        <div className="w-72 bg-slate-900 border-l border-slate-800 h-full">{panel}</div>
      </div>
    </>
  );
}

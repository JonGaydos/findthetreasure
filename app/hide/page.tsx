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

  const handleGenerate = async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const toleranceMeters = unitToMeters(toleranceValue, tolerUnits);
      const body: Record<string, unknown> = {
        lat: pin.lat,
        lng: pin.lng,
        toleranceMeters,
        unit,
      };
      if (hint.trim()) {
        body.hint = hint.trim();
        body.hintAfterGuesses = hintAfterGuesses;
      }
      const res = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to generate code');
      const data = await res.json();
      setShareCode(data.shareCode);
    } catch {
      setError('Failed to generate share code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapComponent onMapClick={handleMapClick} hiderPin={pin} />
        {!pin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-sm px-4 py-2 rounded-full border border-slate-700 pointer-events-none">
            Click anywhere on the map to place the treasure
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
          <h1 className="text-white font-semibold">Hide a Treasure</h1>
        </div>

        {pin && (
          <p className="text-slate-500 text-xs">
            Pin: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </p>
        )}

        {/* Unit selector */}
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Distance Units</Label>
          <div className="flex gap-2">
            {UNITS.map(u => (
              <button
                key={u}
                onClick={() => { setUnit(u); setToleranceValue(toleranceRange(u).min + Math.floor((toleranceRange(u).max - toleranceRange(u).min) * 0.05)); }}
                className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                  unit === u
                    ? 'bg-blue-800 border-blue-600 text-blue-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Tolerance slider */}
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Win Tolerance: <span className="text-white">{toleranceValue} {tolerUnits}</span>
          </Label>
          <Slider
            min={tolerRange.min}
            max={tolerRange.max}
            step={tolerRange.step}
            value={[toleranceValue]}
            onValueChange={(vals) => setToleranceValue(Array.isArray(vals) ? vals[0] : vals)}
            className="w-full"
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>{tolerRange.min} {tolerUnits}</span>
            <span>{tolerRange.max} {tolerUnits}</span>
          </div>
        </div>

        {/* Hint */}
        <div>
          <Label htmlFor="hint" className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Hint (optional)
          </Label>
          <Input
            id="hint"
            placeholder="Add a clue..."
            value={hint}
            onChange={e => setHint(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm"
          />
          {hint.trim() && (
            <div className="mt-2">
              <Label htmlFor="hint-after" className="text-slate-400 text-xs mb-1 block">
                Unlock after <span className="text-white">{hintAfterGuesses}</span> guesses
              </Label>
              <Slider
                id="hint-after"
                min={1}
                max={53}
                step={1}
                value={[hintAfterGuesses]}
                onValueChange={(vals) => setHintAfterGuesses(Array.isArray(vals) ? vals[0] : vals)}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!pin || loading}
          className="w-full bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40"
        >
          {loading ? 'Generating...' : 'Generate Code ↗'}
        </Button>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {shareCode && <ShareCodeDisplay shareCode={shareCode} />}
      </div>
    </div>
  );
}

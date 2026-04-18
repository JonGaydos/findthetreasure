'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import GuessHistory from '@/components/GuessHistory';
import CircleModeSelector from '@/components/CircleModeSelector';
import HintBanner from '@/components/HintBanner';
import { formatDistance } from '@/lib/units';
import { Button } from '@/components/ui/button';
import type { Guess, Unit } from '@/types/game';

const UNITS: Unit[] = ['ft', 'm', 'mi', 'km'];

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const MAX_GUESSES = 54;

export default function PlayPage() {
  const router = useRouter();
  const { state, update, clearGame, hydrated } = useGameState();
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [guessing, setGuessing] = useState(false);

  // Redirect if no active game
  useEffect(() => {
    if (hydrated && !state.shareCode) {
      router.replace('/find');
    }
  }, [hydrated, state.shareCode, router]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!state.shareCode || state.gameOver || guessing) return;

    setGuessing(true);
    try {
      const nextGuessNumber = state.guesses.length + 1;
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode: state.shareCode,
          guessLat: lat,
          guessLng: lng,
          guessCount: nextGuessNumber,
        }),
      });
      if (!res.ok) throw new Error('Guess failed');
      const data = await res.json();

      const newGuess: Guess = {
        lat,
        lng,
        distanceMeters: data.distanceMeters,
        guessNumber: nextGuessNumber,
      };
      const newGuesses = [...state.guesses, newGuess];

      const updates: Partial<typeof state> = { guesses: newGuesses };

      if (data.isHintUnlocked && !state.hintUnlocked) {
        updates.hintUnlocked = true;
        updates.hint = data.hint ?? null;
      }

      if (data.isWin) {
        const revealRes = await fetch('/api/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareCode: state.shareCode }),
        });
        if (!revealRes.ok) { update(updates); return; }
        const revealData = await revealRes.json();
        updates.gameOver = 'win';
        updates.treasureLat = revealData.lat;
        updates.treasureLng = revealData.lng;
      } else if (newGuesses.length >= MAX_GUESSES) {
        const revealRes = await fetch('/api/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareCode: state.shareCode }),
        });
        if (!revealRes.ok) { update(updates); return; }
        const revealData = await revealRes.json();
        updates.gameOver = 'loss';
        updates.treasureLat = revealData.lat;
        updates.treasureLng = revealData.lng;
      }

      update(updates);
    } catch {
      // silently fail — user can try clicking again
    } finally {
      setGuessing(false);
    }
  }, [state, update, guessing]);

  const handleGiveUp = useCallback(async () => {
    if (!state.shareCode || guessing) return;
    setGuessing(true);
    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: state.shareCode }),
      });
      if (!res.ok) { setShowGiveUpConfirm(false); return; }
      const data = await res.json();
      update({ gameOver: 'gave_up', treasureLat: data.lat, treasureLng: data.lng });
      setShowGiveUpConfirm(false);
    } catch {
      setShowGiveUpConfirm(false);
    } finally {
      setGuessing(false);
    }
  }, [state.shareCode, update, guessing]);

  const handlePlayAgain = useCallback(() => {
    clearGame();
    router.push('/');
  }, [clearGame, router]);

  if (!hydrated || !state.shareCode) return null;

  const guessesLeft = MAX_GUESSES - state.guesses.length;
  const lastGuess = state.guesses[state.guesses.length - 1] ?? null;
  const prevGuess = state.guesses[state.guesses.length - 2] ?? null;
  const lastDistanceClass =
    !lastGuess
      ? 'text-slate-200'
      : !prevGuess
        ? 'text-slate-200'
        : lastGuess.distanceMeters < prevGuess.distanceMeters
          ? 'text-green-400'
          : 'text-red-400';

  const map = (
    <div className="absolute inset-0">
      <MapComponent
        onMapClick={state.gameOver ? undefined : handleMapClick}
        guesses={state.guesses}
        circleMode={state.circleMode}
        unit={state.unit}
        treasurePin={
          state.gameOver && state.treasureLat !== null && state.treasureLng !== null
            ? { lat: state.treasureLat, lng: state.treasureLng }
            : null
        }
      />
      {!state.gameOver && !guessing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700 pointer-events-none">
          Tap the map to guess
        </div>
      )}
      {guessing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-700 pointer-events-none">
          Calculating distance...
        </div>
      )}
    </div>
  );

  const panel = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {/* Header — title + guesses remaining on one line */}
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-white font-semibold text-sm">Find The Treasure</h1>
          {!state.gameOver && (
            <span className="text-slate-500 text-[11px] tabular-nums">{guessesLeft} left</span>
          )}
        </div>

        {/* Game-over banner */}
        {state.gameOver === 'win' && (
          <div className="bg-green-950 border border-green-700 rounded-lg p-3 text-center">
            <p className="text-green-300 font-bold">🎉 You found it!</p>
            <p className="text-green-500 text-xs mt-1">In {state.guesses.length} guess{state.guesses.length !== 1 ? 'es' : ''}</p>
          </div>
        )}
        {state.gameOver === 'loss' && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-center">
            <p className="text-red-300 font-bold">😔 Out of guesses</p>
            <p className="text-red-500 text-xs mt-1">Treasure revealed on map</p>
          </div>
        )}
        {state.gameOver === 'gave_up' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-slate-300 font-bold">🏳 You gave up</p>
            <p className="text-slate-500 text-xs mt-1">Treasure revealed on map</p>
          </div>
        )}

        {/* Feedback — big last-distance value */}
        {lastGuess && (
          <div className="flex items-baseline justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-slate-500 text-[10px] uppercase tracking-wide shrink-0">Last</span>
            <span className={`text-2xl font-bold tabular-nums ${lastDistanceClass}`}>
              {formatDistance(lastGuess.distanceMeters, state.unit)}
            </span>
            <span className="text-slate-600 text-[10px] tabular-nums shrink-0">
              {state.guesses.length}/{MAX_GUESSES}
            </span>
          </div>
        )}

        {/* Unit pills */}
        <div className="flex gap-2">
          {UNITS.map(u => (
            <button
              key={u}
              onClick={() => update({ unit: u })}
              className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                state.unit === u
                  ? 'bg-blue-800 border-blue-600 text-blue-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Circles tri-state selector */}
        <CircleModeSelector
          value={state.circleMode}
          onChange={mode => update({ circleMode: mode })}
        />

        {/* Hint banner (conditional) */}
        {state.hintUnlocked && state.hint && <HintBanner hint={state.hint} />}

        {/* Guess history — scrollable list fills remaining space */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex-1 min-h-[120px]">
          <p className="text-slate-500 text-[10px] uppercase tracking-wide mb-2">History</p>
          <GuessHistory guesses={state.guesses} unit={state.unit} />
        </div>
      </div>

      {/* Sticky action area */}
      <div className="shrink-0 p-3 pt-2 border-t border-slate-800/70 bg-slate-950">
        {state.gameOver ? (
          <Button
            onClick={handlePlayAgain}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white"
          >
            Play Again
          </Button>
        ) : showGiveUpConfirm ? (
          <div className="flex flex-col gap-2">
            <p className="text-slate-400 text-xs text-center">Reveal the treasure?</p>
            <div className="flex gap-2">
              <Button onClick={handleGiveUp} variant="destructive" size="sm" className="flex-1">
                Yes, give up
              </Button>
              <Button
                onClick={() => setShowGiveUpConfirm(false)}
                variant="outline"
                size="sm"
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowGiveUpConfirm(true)}
            variant="outline"
            className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            🏳 Give Up
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile layout: sticky map top (~60vh), compact panel below ── */}
      <div className="flex flex-col h-screen bg-slate-950 md:hidden">
        <div className="relative shrink-0" style={{ height: '60vh' }}>
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

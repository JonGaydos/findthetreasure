'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import GuessHistory from '@/components/GuessHistory';
import CircleToggle from '@/components/CircleToggle';
import HintBanner from '@/components/HintBanner';
import { formatDistance } from '@/lib/units';
import { Button } from '@/components/ui/button';
import type { Guess, GameOverReason, Unit } from '@/types/game';

const UNITS: Unit[] = ['ft', 'm', 'mi', 'km'];

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const MAX_GUESSES = 54;

export default function PlayPage() {
  const router = useRouter();
  const { state, update, clearGame, hydrated } = useGameState();
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [guessing, setGuessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'panel'>('map');

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

  const map = (
    <div className="absolute inset-0">
      <MapComponent
        onMapClick={state.gameOver ? undefined : handleMapClick}
        guesses={state.guesses}
        showCircles={state.circlesVisible}
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
    <div className="flex flex-col gap-3 p-4 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-white font-semibold text-sm">Find The Treasure</h1>
        {!state.gameOver && (
          <p className="text-slate-500 text-xs">{guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining</p>
        )}
      </div>

      {/* Game over banner */}
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

      {/* Last distance */}
      {lastGuess && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Last guess</p>
          <p className={`text-2xl font-bold mt-1 ${
            state.guesses.length < 2
              ? 'text-slate-200'
              : lastGuess.distanceMeters < state.guesses[state.guesses.length - 2].distanceMeters
                ? 'text-green-400'
                : 'text-red-400'
          }`}>
            {formatDistance(lastGuess.distanceMeters, state.unit)}
          </p>
        </div>
      )}

      {/* Guess counter */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
        <p className="text-slate-500 text-xs">Guesses</p>
        <p className="text-white text-lg font-bold">
          {state.guesses.length} <span className="text-slate-600 text-sm font-normal">/ {MAX_GUESSES}</span>
        </p>
      </div>

      {/* Unit selector */}
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Display Units</p>
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
      </div>

      {/* Circle toggle */}
      <CircleToggle
        checked={state.circlesVisible}
        onCheckedChange={v => update({ circlesVisible: v })}
      />

      {/* Hint banner */}
      {state.hintUnlocked && state.hint && <HintBanner hint={state.hint} />}

      {/* Guess history */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex-1">
        <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">History</p>
        <GuessHistory guesses={state.guesses} unit={state.unit} />
      </div>

      {/* Actions */}
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
            <Button
              onClick={handleGiveUp}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
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
  );

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="flex flex-col h-screen bg-slate-950 md:hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-800 bg-slate-900 shrink-0">
          <button
            onClick={() => setMobileTab('map')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'map' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={() => setMobileTab('panel')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'panel' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'
            }`}
          >
            🎯 Game {state.guesses.length > 0 ? `(${state.guesses.length})` : ''}
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 min-h-0 bg-slate-950 relative overflow-hidden">
          {mobileTab === 'map' ? map : (
            <div className="absolute inset-0 overflow-y-auto">{panel}</div>
          )}
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex h-screen bg-slate-950 overflow-hidden">
        <div className="flex-1 relative">{map}</div>
        <div className="w-72 bg-slate-900 border-l border-slate-800 overflow-y-auto h-full">{panel}</div>
      </div>
    </>
  );
}

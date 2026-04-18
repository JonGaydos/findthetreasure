'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Guess, Unit, GameOverReason, CircleMode } from '@/types/game';

export interface GameState {
  shareCode: string | null;
  guesses: Guess[];
  unit: Unit;
  circleMode: CircleMode;
  hintUnlocked: boolean;
  hint: string | null;
  gameOver: GameOverReason | null;
  treasureLat: number | null;
  treasureLng: number | null;
}

const KEYS = {
  shareCode: 'ftt_shareCode',
  guesses: 'ftt_guesses',
  unit: 'ftt_unit',
  circleMode: 'ftt_circleMode',
  hintUnlocked: 'ftt_hintUnlocked',
  hint: 'ftt_hint',
  gameOver: 'ftt_gameOver',
  treasureLat: 'ftt_treasureLat',
  treasureLng: 'ftt_treasureLng',
} as const;

/** Legacy key from before circles became tri-state. Removed on first mount after upgrade. */
const LEGACY_CIRCLES_VISIBLE_KEY = 'ftt_circlesVisible';

const DEFAULT: GameState = {
  shareCode: null,
  guesses: [],
  unit: 'ft',
  circleMode: 'off',
  hintUnlocked: false,
  hint: null,
  gameOver: null,
  treasureLat: null,
  treasureLng: null,
};

/** Resolve the stored circleMode, migrating from the legacy ftt_circlesVisible
 *  key if necessary. Writes the new key and deletes the legacy key on the
 *  localStorage instance passed in. */
function resolveCircleMode(ls: Storage): CircleMode {
  const current = ls.getItem(KEYS.circleMode);
  let mode: CircleMode;
  if (current === 'off' || current === 'last' || current === 'all') {
    mode = current;
  } else {
    const legacy = ls.getItem(LEGACY_CIRCLES_VISIBLE_KEY);
    mode = legacy === 'true' ? 'all' : 'off';
    ls.setItem(KEYS.circleMode, mode);
  }
  ls.removeItem(LEGACY_CIRCLES_VISIBLE_KEY);
  return mode;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const ls = localStorage;
    const shareCode = ls.getItem(KEYS.shareCode);
    const guessesRaw = ls.getItem(KEYS.guesses);
    const unit = ls.getItem(KEYS.unit) as Unit | null;
    const gameOverRaw = ls.getItem(KEYS.gameOver);
    const treasureLatRaw = ls.getItem(KEYS.treasureLat);
    const treasureLngRaw = ls.getItem(KEYS.treasureLng);

    setState({
      shareCode: shareCode || null,
      guesses: (() => { try { return guessesRaw ? (JSON.parse(guessesRaw) as Guess[]) : []; } catch { return []; } })(),
      unit: unit ?? 'ft',
      circleMode: resolveCircleMode(ls),
      hintUnlocked: ls.getItem(KEYS.hintUnlocked) === 'true',
      hint: ls.getItem(KEYS.hint),
      gameOver: (gameOverRaw || null) as GameOverReason | null,
      treasureLat: treasureLatRaw !== null ? Number(treasureLatRaw) : null,
      treasureLng: treasureLngRaw !== null ? Number(treasureLngRaw) : null,
    });
    setHydrated(true);
  }, []);

  const update = useCallback((updates: Partial<GameState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };
      const ls = localStorage;

      if ('shareCode' in updates) {
        updates.shareCode != null
          ? ls.setItem(KEYS.shareCode, updates.shareCode)
          : ls.removeItem(KEYS.shareCode);
      }
      if ('guesses' in updates) {
        ls.setItem(KEYS.guesses, JSON.stringify(updates.guesses));
      }
      if ('unit' in updates && updates.unit != null) {
        ls.setItem(KEYS.unit, updates.unit);
      }
      if ('circleMode' in updates && updates.circleMode != null) {
        ls.setItem(KEYS.circleMode, updates.circleMode);
      }
      if ('hintUnlocked' in updates) {
        ls.setItem(KEYS.hintUnlocked, String(updates.hintUnlocked));
      }
      if ('hint' in updates) {
        updates.hint != null
          ? ls.setItem(KEYS.hint, updates.hint)
          : ls.removeItem(KEYS.hint);
      }
      if ('gameOver' in updates) {
        updates.gameOver != null
          ? ls.setItem(KEYS.gameOver, updates.gameOver)
          : ls.removeItem(KEYS.gameOver);
      }
      if ('treasureLat' in updates) {
        updates.treasureLat != null
          ? ls.setItem(KEYS.treasureLat, String(updates.treasureLat))
          : ls.removeItem(KEYS.treasureLat);
      }
      if ('treasureLng' in updates) {
        updates.treasureLng != null
          ? ls.setItem(KEYS.treasureLng, String(updates.treasureLng))
          : ls.removeItem(KEYS.treasureLng);
      }

      return next;
    });
  }, []);

  const clearGame = useCallback(() => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(LEGACY_CIRCLES_VISIBLE_KEY);
    setState(DEFAULT);
  }, []);

  return { state, update, clearGame, hydrated };
}

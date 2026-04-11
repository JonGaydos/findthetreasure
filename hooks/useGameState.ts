'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Guess, Unit, GameOverReason } from '@/types/game';

export interface GameState {
  shareCode: string | null;
  guesses: Guess[];
  unit: Unit;
  circlesVisible: boolean;
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
  circlesVisible: 'ftt_circlesVisible',
  hintUnlocked: 'ftt_hintUnlocked',
  hint: 'ftt_hint',
  gameOver: 'ftt_gameOver',
  treasureLat: 'ftt_treasureLat',
  treasureLng: 'ftt_treasureLng',
} as const;

const DEFAULT: GameState = {
  shareCode: null,
  guesses: [],
  unit: 'ft',
  circlesVisible: true,
  hintUnlocked: false,
  hint: null,
  gameOver: null,
  treasureLat: null,
  treasureLng: null,
};

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
      guesses: guessesRaw ? (JSON.parse(guessesRaw) as Guess[]) : [],
      unit: unit ?? 'ft',
      circlesVisible: ls.getItem(KEYS.circlesVisible) !== 'false',
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
        ls.setItem(KEYS.shareCode, updates.shareCode ?? '');
      }
      if ('guesses' in updates) {
        ls.setItem(KEYS.guesses, JSON.stringify(updates.guesses));
      }
      if ('unit' in updates) {
        ls.setItem(KEYS.unit, updates.unit!);
      }
      if ('circlesVisible' in updates) {
        ls.setItem(KEYS.circlesVisible, String(updates.circlesVisible));
      }
      if ('hintUnlocked' in updates) {
        ls.setItem(KEYS.hintUnlocked, String(updates.hintUnlocked));
      }
      if ('hint' in updates) {
        ls.setItem(KEYS.hint, updates.hint ?? '');
      }
      if ('gameOver' in updates) {
        ls.setItem(KEYS.gameOver, updates.gameOver ?? '');
      }
      if ('treasureLat' in updates) {
        ls.setItem(KEYS.treasureLat, String(updates.treasureLat));
      }
      if ('treasureLng' in updates) {
        ls.setItem(KEYS.treasureLng, String(updates.treasureLng));
      }
      return next;
    });
  }, []);

  const clearGame = useCallback(() => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    setState(DEFAULT);
  }, []);

  return { state, update, clearGame, hydrated };
}

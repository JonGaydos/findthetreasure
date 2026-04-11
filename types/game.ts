export type Unit = 'ft' | 'm' | 'mi' | 'km';
export type GameOverReason = 'win' | 'loss' | 'gave_up';

/** Compact payload stored inside the encrypted share code */
export interface GamePayload {
  /** Treasure latitude */
  a: number;
  /** Treasure longitude */
  b: number;
  /** Win tolerance in meters */
  t: number;
  /** Display unit for distances */
  u: Unit;
  /** Optional hint text */
  h?: string;
  /** Unlock hint after this many guesses (1–53) */
  n?: number;
}

export interface Guess {
  lat: number;
  lng: number;
  /** Distance from treasure in meters */
  distanceMeters: number;
  guessNumber: number;
}

export interface GuessResponse {
  distanceMeters: number;
  unit: Unit;
  isWin: boolean;
  isHintUnlocked: boolean;
  hint?: string;
}

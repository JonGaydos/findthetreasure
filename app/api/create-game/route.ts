import { NextResponse } from 'next/server';
import { encryptPayload } from '@/lib/crypto';
import type { GamePayload, Unit } from '@/types/game';

const VALID_UNITS: readonly Unit[] = ['ft', 'm', 'mi', 'km'];

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { lat, lng, toleranceMeters, unit, hint, hintAfterGuesses } = body;

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof toleranceMeters !== 'number' ||
      !VALID_UNITS.includes(unit)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 },
      );
    }

    const payload: GamePayload = {
      a: lat,
      b: lng,
      t: toleranceMeters,
      u: unit as Unit,
    };

    const hintText = typeof hint === 'string' ? hint.trim() : '';
    if (hintText) {
      payload.h = hintText;
      if (
        typeof hintAfterGuesses === 'number' &&
        Number.isInteger(hintAfterGuesses) &&
        hintAfterGuesses >= 1 &&
        hintAfterGuesses <= 53
      ) {
        payload.n = hintAfterGuesses;
      }
    }

    const shareCode = encryptPayload(payload);
    return NextResponse.json({ shareCode });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

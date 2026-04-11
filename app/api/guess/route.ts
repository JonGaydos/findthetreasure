import { NextResponse } from 'next/server';
import { decryptPayload } from '@/lib/crypto';
import { haversineMeters } from '@/lib/haversine';
import type { GuessResponse } from '@/types/game';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { shareCode, guessLat, guessLng, guessCount } = body;

    if (
      typeof shareCode !== 'string' ||
      typeof guessLat !== 'number' ||
      typeof guessLng !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let payload;
    try {
      payload = decryptPayload(shareCode);
    } catch {
      return NextResponse.json({ error: 'Invalid share code' }, { status: 400 });
    }

    const distanceMeters = haversineMeters(payload.a, payload.b, guessLat, guessLng);
    const isWin = distanceMeters <= payload.t;

    const hintThreshold = payload.n;
    const isHintUnlocked =
      typeof hintThreshold === 'number' &&
      typeof guessCount === 'number' &&
      guessCount >= hintThreshold &&
      typeof payload.h === 'string';

    const response: GuessResponse = {
      distanceMeters,
      unit: payload.u,
      isWin,
      isHintUnlocked,
    };

    if (isHintUnlocked && payload.h) {
      response.hint = payload.h;
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

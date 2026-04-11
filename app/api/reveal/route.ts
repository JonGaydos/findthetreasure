import { NextResponse } from 'next/server';
import { decryptPayload } from '@/lib/crypto';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { shareCode } = body;

    if (typeof shareCode !== 'string') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let payload;
    try {
      payload = decryptPayload(shareCode);
    } catch {
      return NextResponse.json({ error: 'Invalid share code' }, { status: 400 });
    }

    return NextResponse.json({ lat: payload.a, lng: payload.b });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

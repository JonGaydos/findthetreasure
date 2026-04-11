import { POST } from '@/app/api/guess/route';
import { encryptPayload } from '@/lib/crypto';
import type { GamePayload } from '@/types/game';

function makeCode(overrides: Partial<GamePayload> = {}): string {
  const payload: GamePayload = {
    a: 40.712776,
    b: -74.005974,
    t: 10,
    u: 'ft',
    ...overrides,
  };
  return encryptPayload(payload);
}

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('returns distance for a valid guess', async () => {
  const shareCode = makeCode();
  const req = makeRequest({ shareCode, guessLat: 40.713, guessLng: -74.006, guessCount: 1 });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(typeof data.distanceMeters).toBe('number');
  expect(data.distanceMeters).toBeGreaterThan(0);
  expect(data.unit).toBe('ft');
  expect(data.isWin).toBe(false);
  expect(data.isHintUnlocked).toBe(false);
});

test('isWin is true when guess is within tolerance', async () => {
  const shareCode = makeCode({ t: 1000 }); // 1000 m tolerance
  const req = makeRequest({ shareCode, guessLat: 40.712776, guessLng: -74.005974, guessCount: 1 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isWin).toBe(true);
  expect(data.distanceMeters).toBe(0);
});

test('hint is NOT returned before threshold', async () => {
  const shareCode = makeCode({ h: 'Near the park', n: 5 });
  const req = makeRequest({ shareCode, guessLat: 41, guessLng: -75, guessCount: 3 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isHintUnlocked).toBe(false);
  expect(data.hint).toBeUndefined();
});

test('hint IS returned at the threshold', async () => {
  const shareCode = makeCode({ h: 'Near the park', n: 5 });
  const req = makeRequest({ shareCode, guessLat: 41, guessLng: -75, guessCount: 5 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isHintUnlocked).toBe(true);
  expect(data.hint).toBe('Near the park');
});

test('hint IS returned after the threshold', async () => {
  const shareCode = makeCode({ h: 'Near the park', n: 5 });
  const req = makeRequest({ shareCode, guessLat: 41, guessLng: -75, guessCount: 10 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isHintUnlocked).toBe(true);
  expect(data.hint).toBe('Near the park');
});

test('returns 400 for invalid share code', async () => {
  const req = makeRequest({ shareCode: 'FTT-invalid', guessLat: 40, guessLng: -74, guessCount: 1 });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('returns 400 for missing fields', async () => {
  const req = makeRequest({ shareCode: makeCode() });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('returns 400 when guessCount is missing', async () => {
  const shareCode = makeCode();
  const req = makeRequest({ shareCode, guessLat: 40, guessLng: -74 });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

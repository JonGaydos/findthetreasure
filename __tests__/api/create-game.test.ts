import { POST } from '@/app/api/create-game/route';
import { decryptPayload } from '@/lib/crypto';

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/create-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('returns a share code for a valid payload', async () => {
  const req = makeRequest({ lat: 40.712776, lng: -74.005974, toleranceMeters: 7.6, unit: 'ft' });
  const res = await POST(req);
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(typeof data.shareCode).toBe('string');
  expect(data.shareCode.startsWith('FTT-')).toBe(true);
});

test('share code decrypts to the original coordinates', async () => {
  const req = makeRequest({ lat: 51.5074, lng: -0.1278, toleranceMeters: 3, unit: 'm' });
  const res = await POST(req);
  const { shareCode } = await res.json();
  const payload = decryptPayload(shareCode);
  expect(payload.a).toBeCloseTo(51.5074, 4);
  expect(payload.b).toBeCloseTo(-0.1278, 4);
  expect(payload.t).toBe(3);
  expect(payload.u).toBe('m');
});

test('includes hint and threshold in encrypted payload', async () => {
  const req = makeRequest({
    lat: 0, lng: 0, toleranceMeters: 5, unit: 'ft',
    hint: 'Near the fountain', hintAfterGuesses: 15,
  });
  const res = await POST(req);
  const { shareCode } = await res.json();
  const payload = decryptPayload(shareCode);
  expect(payload.h).toBe('Near the fountain');
  expect(payload.n).toBe(15);
});

test('returns 400 for missing required fields', async () => {
  const req = makeRequest({ lat: 40.712776 });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

test('does not include hint fields when hint is empty string', async () => {
  const req = makeRequest({ lat: 0, lng: 0, toleranceMeters: 5, unit: 'ft', hint: '  ' });
  const res = await POST(req);
  const { shareCode } = await res.json();
  const payload = decryptPayload(shareCode);
  expect(payload.h).toBeUndefined();
  expect(payload.n).toBeUndefined();
});

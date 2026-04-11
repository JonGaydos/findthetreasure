import { POST } from '@/app/api/reveal/route';
import { encryptPayload } from '@/lib/crypto';

function makeRequest(shareCode: string): Request {
  return new Request('http://localhost/api/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareCode }),
  });
}

test('returns treasure coordinates for a valid code', async () => {
  const code = encryptPayload({ a: 48.8566, b: 2.3522, t: 5, u: 'm' });
  const res = await POST(makeRequest(code));
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.lat).toBeCloseTo(48.8566, 4);
  expect(data.lng).toBeCloseTo(2.3522, 4);
});

test('returns 400 for an invalid code', async () => {
  const res = await POST(makeRequest('FTT-garbage'));
  expect(res.status).toBe(400);
});

test('returns 400 for missing shareCode', async () => {
  const req = new Request('http://localhost/api/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});

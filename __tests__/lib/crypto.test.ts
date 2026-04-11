import { encryptPayload, decryptPayload } from '@/lib/crypto';
import type { GamePayload } from '@/types/game';

const sample: GamePayload = {
  a: 40.712776,
  b: -74.005974,
  t: 7.6,
  u: 'ft',
};

test('round-trip preserves payload', () => {
  const code = encryptPayload(sample);
  const result = decryptPayload(code);
  expect(result).toEqual(sample);
});

test('each encryption produces a unique code (random IV)', () => {
  const code1 = encryptPayload(sample);
  const code2 = encryptPayload(sample);
  expect(code1).not.toBe(code2);
});

test('code starts with FTT-', () => {
  const code = encryptPayload(sample);
  expect(code.startsWith('FTT-')).toBe(true);
});

test('tampered code throws on decrypt', () => {
  const code = encryptPayload(sample);
  const tampered = code.slice(0, -4) + 'XXXX';
  expect(() => decryptPayload(tampered)).toThrow();
});

test('round-trip preserves optional hint and threshold', () => {
  const withHint: GamePayload = { ...sample, h: 'Near a coffee shop', n: 20 };
  const code = encryptPayload(withHint);
  expect(decryptPayload(code)).toEqual(withHint);
});

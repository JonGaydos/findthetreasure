import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { GamePayload } from '@/types/game';

// Exactly 32 bytes for AES-256. Same key is hardcoded in every Docker image.
// This key keeps coordinates opaque to casual inspection — not a security system.
const APP_SECRET = Buffer.from('FndTrsrK3y!2024Secure32ByteKey!!');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = 'FTT-';

export function encryptPayload(payload: GamePayload): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, APP_SECRET, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Layout: [iv(12)] [tag(16)] [encrypted(n)]
  const combined = Buffer.concat([iv, tag, encrypted]);
  return PREFIX + combined.toString('base64url');
}

export function decryptPayload(code: string): GamePayload {
  if (!code.startsWith(PREFIX)) throw new Error('Invalid share code: missing prefix');
  const combined = Buffer.from(code.slice(PREFIX.length), 'base64url');
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid share code: too short');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, APP_SECRET, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as GamePayload;
}

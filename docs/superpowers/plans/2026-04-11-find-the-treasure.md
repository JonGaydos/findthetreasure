# Find The Treasure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-player async treasure hunt web app where the Hider pins a location, generates an encrypted share code, and the Seeker gets distance-only feedback for up to 54 guesses.

**Architecture:** Next.js full-stack app — API routes handle all encryption and distance math server-side so coordinates never reach the browser. The encrypted share code is re-sent with every guess; no database or session management needed. Browser localStorage persists game state across refreshes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Leaflet.js + OpenStreetMap, Node.js built-in `crypto` (AES-256-GCM), Jest + Testing Library, Docker (single container, standalone output)

---

## File Map

```
Map Game/
├── app/
│   ├── layout.tsx                      # Root layout — dark theme, Inter font
│   ├── page.tsx                        # Home screen — role selector
│   ├── hide/page.tsx                   # Hider screen — drop pin, set options, generate code
│   ├── find/page.tsx                   # Seeker code entry screen
│   ├── play/page.tsx                   # Seeker game screen — map, guesses, circles, sidebar
│   └── api/
│       ├── create-game/route.ts        # POST: encrypts payload → share code
│       ├── guess/route.ts              # POST: decrypts code + computes distance
│       └── reveal/route.ts            # POST: decrypts code → returns coordinates
├── components/
│   ├── MapComponent.tsx                # Leaflet wrapper (client-only, dynamic-imported)
│   ├── GuessHistory.tsx                # Scrollable list of past guesses
│   ├── ShareCodeDisplay.tsx            # Generated code + copy-to-clipboard button
│   ├── CircleToggle.tsx                # Hard mode toggle switch
│   └── HintBanner.tsx                  # Dismissible hint notification
├── hooks/
│   └── useGameState.ts                 # localStorage read/write for all Seeker game state
├── lib/
│   ├── crypto.ts                       # AES-256-GCM encrypt + decrypt
│   ├── haversine.ts                    # Distance between two lat/lng points (meters)
│   └── units.ts                        # Unit conversion + formatting + tolerance helpers
├── types/
│   └── game.ts                         # Shared TypeScript types (GamePayload, Guess, etc.)
├── public/
│   └── leaflet/                        # Copied Leaflet marker icon PNGs (offline support)
├── __tests__/
│   ├── lib/crypto.test.ts
│   ├── lib/haversine.test.ts
│   ├── lib/units.test.ts
│   └── api/
│       ├── create-game.test.ts
│       ├── guess.test.ts
│       └── reveal.test.ts
├── next.config.ts
├── jest.config.ts
├── jest.setup.ts
├── Dockerfile
└── docker-compose.yml
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `next.config.ts`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `public/leaflet/` (copy marker PNGs)

- [ ] **Step 1: Initialize Next.js project**

Run from inside `"C:/Users/jgayd/Downloads/Claude Projects Folder/Map Game"`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```
When prompted: use default answers (App Router: Yes, Tailwind: Yes, ESLint: Yes).

- [ ] **Step 2: Install dependencies**

```bash
npm install leaflet @types/leaflet
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 3: Install shadcn/ui and add components**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button card input label slider switch badge separator toast
```

- [ ] **Step 4: Configure Next.js for standalone Docker output**

Replace the contents of `next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
```

- [ ] **Step 5: Create Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default createJestConfig(config);
```

- [ ] **Step 6: Copy Leaflet marker icons to public/**

```bash
mkdir -p public/leaflet
cp node_modules/leaflet/dist/images/marker-icon.png public/leaflet/
cp node_modules/leaflet/dist/images/marker-icon-2x.png public/leaflet/
cp node_modules/leaflet/dist/images/marker-shadow.png public/leaflet/
```

- [ ] **Step 7: Configure Tailwind for dark mode**

In `tailwind.config.ts`, ensure the `darkMode` key is set:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 8: Set dark mode on the html element in layout**

Open `app/layout.tsx` and add `className="dark"` to the `<html>` tag:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Verify the scaffold runs**

```bash
npm run dev
```
Expected: Next.js starts on http://localhost:3000 with no errors.

- [ ] **Step 10: Commit and push to GitHub**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with shadcn/ui, Leaflet, and Jest"
git remote add origin https://github.com/JonGaydos/findthetreasure.git
git branch -M main
git push -u origin main
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `types/game.ts`

- [ ] **Step 1: Create the types file**

Create `types/game.ts`:
```typescript
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
  /** Unlock hint after this many guesses (1-53) */
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
```

- [ ] **Step 2: Commit**

```bash
git add types/game.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Crypto Utility (TDD)

**Files:**
- Create: `lib/crypto.ts`
- Create: `__tests__/lib/crypto.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/crypto.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/crypto.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/crypto'"

- [ ] **Step 3: Implement the crypto utility**

Create `lib/crypto.ts`:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import type { GamePayload } from '@/types/game';

// Exactly 32 bytes for AES-256. Same key is hardcoded in every Docker image.
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
  if (!code.startsWith(PREFIX)) throw new Error('Invalid share code');
  const combined = Buffer.from(code.slice(PREFIX.length), 'base64url');
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) throw new Error('Share code too short');
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, APP_SECRET, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as GamePayload;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/crypto.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/crypto.ts __tests__/lib/crypto.test.ts
git commit -m "feat: add AES-256-GCM crypto utility with tests"
```

---

## Task 4: Haversine Distance Utility (TDD)

**Files:**
- Create: `lib/haversine.ts`
- Create: `__tests__/lib/haversine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/haversine.test.ts`:
```typescript
import { haversineMeters } from '@/lib/haversine';

test('same point returns 0', () => {
  expect(haversineMeters(40.712776, -74.005974, 40.712776, -74.005974)).toBe(0);
});

test('NYC to LAX is approximately 3,940 km', () => {
  const d = haversineMeters(40.712776, -74.005974, 33.9425, -118.408056);
  // Allow ±50 km margin for Earth radius approximation
  expect(d).toBeGreaterThan(3_890_000);
  expect(d).toBeLessThan(3_990_000);
});

test('1 degree latitude apart at equator ≈ 111 km', () => {
  const d = haversineMeters(0, 0, 1, 0);
  expect(d).toBeCloseTo(110_574, -2);
});

test('symmetry: A→B equals B→A', () => {
  const d1 = haversineMeters(51.5, -0.1, 48.8, 2.3);
  const d2 = haversineMeters(48.8, 2.3, 51.5, -0.1);
  expect(d1).toBeCloseTo(d2, 6);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/haversine.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/haversine'"

- [ ] **Step 3: Implement haversine**

Create `lib/haversine.ts`:
```typescript
const EARTH_RADIUS_M = 6_371_000;

/**
 * Returns the great-circle distance in meters between two WGS-84 coordinates.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/haversine.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/haversine.ts __tests__/lib/haversine.test.ts
git commit -m "feat: add Haversine distance utility with tests"
```

---

## Task 5: Unit Conversion Utility (TDD)

**Files:**
- Create: `lib/units.ts`
- Create: `__tests__/lib/units.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/units.test.ts`:
```typescript
import { metersToUnit, unitToMeters, formatDistance, toleranceUnit, toleranceRange } from '@/lib/units';

test('metersToUnit: 1 m = 3.28084 ft', () => {
  expect(metersToUnit(1, 'ft')).toBeCloseTo(3.28084, 4);
});

test('metersToUnit: 1000 m = 1 km', () => {
  expect(metersToUnit(1000, 'km')).toBe(1);
});

test('metersToUnit: 1609.344 m = 1 mi', () => {
  expect(metersToUnit(1609.344, 'mi')).toBeCloseTo(1, 4);
});

test('metersToUnit: same unit (m→m) is identity', () => {
  expect(metersToUnit(42, 'm')).toBe(42);
});

test('unitToMeters is the inverse of metersToUnit', () => {
  expect(unitToMeters(metersToUnit(500, 'ft'), 'ft')).toBeCloseTo(500, 4);
});

test('formatDistance: small value shows 2 decimals', () => {
  expect(formatDistance(3, 'm')).toBe('3.00 m');
});

test('formatDistance: large value rounds', () => {
  expect(formatDistance(5000, 'm')).toBe('5000 m');
});

test('toleranceUnit: ft for imperial units', () => {
  expect(toleranceUnit('ft')).toBe('ft');
  expect(toleranceUnit('mi')).toBe('ft');
});

test('toleranceUnit: m for metric units', () => {
  expect(toleranceUnit('m')).toBe('m');
  expect(toleranceUnit('km')).toBe('m');
});

test('toleranceRange: ft range is 1–500', () => {
  expect(toleranceRange('ft')).toEqual({ min: 1, max: 500, step: 1 });
});

test('toleranceRange: m range is 1–150', () => {
  expect(toleranceRange('km')).toEqual({ min: 1, max: 150, step: 1 });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/units.test.ts
```
Expected: FAIL — "Cannot find module '@/lib/units'"

- [ ] **Step 3: Implement units utility**

Create `lib/units.ts`:
```typescript
import type { Unit } from '@/types/game';

const METERS_PER: Record<Unit, number> = {
  m: 1,
  ft: 0.3048,
  mi: 1609.344,
  km: 1000,
};

export function metersToUnit(meters: number, unit: Unit): number {
  return meters / METERS_PER[unit];
}

export function unitToMeters(value: number, unit: Unit): number {
  return value * METERS_PER[unit];
}

export function formatDistance(meters: number, unit: Unit): string {
  const value = metersToUnit(meters, unit);
  const label = unit;
  if (value < 10) return `${value.toFixed(2)} ${label}`;
  if (value < 100) return `${value.toFixed(1)} ${label}`;
  return `${Math.round(value)} ${label}`;
}

/** Returns the small unit of the chosen system (ft for imperial, m for metric). */
export function toleranceUnit(unit: Unit): 'ft' | 'm' {
  return unit === 'ft' || unit === 'mi' ? 'ft' : 'm';
}

/** Slider range for tolerance, always in the small unit of the chosen system. */
export function toleranceRange(unit: Unit): { min: number; max: number; step: number } {
  if (unit === 'ft' || unit === 'mi') return { min: 1, max: 500, step: 1 };
  return { min: 1, max: 150, step: 1 };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/units.test.ts
```
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/units.ts __tests__/lib/units.test.ts
git commit -m "feat: add unit conversion utility with tests"
```

---

## Task 6: API Route — create-game (TDD)

**Files:**
- Create: `app/api/create-game/route.ts`
- Create: `__tests__/api/create-game.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/create-game.test.ts`:
```typescript
import { POST } from '@/app/api/create-game/route';
import { decryptPayload } from '@/lib/crypto';

function makeRequest(body: object) {
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/api/create-game.test.ts
```
Expected: FAIL — "Cannot find module '@/app/api/create-game/route'"

- [ ] **Step 3: Implement the route**

Create `app/api/create-game/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { encryptPayload } from '@/lib/crypto';
import { unitToMeters, toleranceUnit } from '@/lib/units';
import type { GamePayload, Unit } from '@/types/game';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, toleranceMeters, unit, hint, hintAfterGuesses } = body;

    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof toleranceMeters !== 'number' ||
      !['ft', 'm', 'mi', 'km'].includes(unit)
    ) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    const payload: GamePayload = {
      a: lat,
      b: lng,
      t: toleranceMeters,
      u: unit as Unit,
    };
    if (hint && typeof hint === 'string' && hint.trim()) {
      payload.h = hint.trim();
    }
    if (typeof hintAfterGuesses === 'number' && hintAfterGuesses >= 1 && hintAfterGuesses <= 53) {
      payload.n = hintAfterGuesses;
    }

    const shareCode = encryptPayload(payload);
    return NextResponse.json({ shareCode });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/api/create-game.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/create-game/route.ts __tests__/api/create-game.test.ts
git commit -m "feat: add create-game API route with tests"
```

---

## Task 7: API Route — guess (TDD)

**Files:**
- Create: `app/api/guess/route.ts`
- Create: `__tests__/api/guess.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/guess.test.ts`:
```typescript
import { POST } from '@/app/api/guess/route';
import { encryptPayload } from '@/lib/crypto';
import type { GamePayload } from '@/types/game';

function makeCode(overrides: Partial<GamePayload> = {}): string {
  const payload: GamePayload = {
    a: 40.712776, b: -74.005974, t: 10, u: 'ft',
    ...overrides,
  };
  return encryptPayload(payload);
}

function makeRequest(body: object) {
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
});

test('isWin is true when guess is within tolerance', async () => {
  const shareCode = makeCode({ t: 1000 }); // 1000 m tolerance
  // Guessing exactly on the treasure
  const req = makeRequest({ shareCode, guessLat: 40.712776, guessLng: -74.005974, guessCount: 1 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isWin).toBe(true);
  expect(data.distanceMeters).toBe(0);
});

test('hint is not returned before threshold', async () => {
  const shareCode = makeCode({ h: 'Near the park', n: 5 });
  const req = makeRequest({ shareCode, guessLat: 41, guessLng: -75, guessCount: 3 });
  const res = await POST(req);
  const data = await res.json();
  expect(data.isHintUnlocked).toBe(false);
  expect(data.hint).toBeUndefined();
});

test('hint is returned at and after threshold', async () => {
  const shareCode = makeCode({ h: 'Near the park', n: 5 });
  const req = makeRequest({ shareCode, guessLat: 41, guessLng: -75, guessCount: 5 });
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/api/guess.test.ts
```
Expected: FAIL — "Cannot find module '@/app/api/guess/route'"

- [ ] **Step 3: Implement the route**

Create `app/api/guess/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { decryptPayload } from '@/lib/crypto';
import { haversineMeters } from '@/lib/haversine';
import type { GuessResponse } from '@/types/game';

export async function POST(req: Request) {
  try {
    const { shareCode, guessLat, guessLng, guessCount } = await req.json();

    if (typeof shareCode !== 'string' || typeof guessLat !== 'number' || typeof guessLng !== 'number') {
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
    const hintThreshold = payload.n ?? Infinity;
    const isHintUnlocked = typeof guessCount === 'number' && guessCount >= hintThreshold && !!payload.h;

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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/api/guess.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/guess/route.ts __tests__/api/guess.test.ts
git commit -m "feat: add guess API route with distance computation and hint logic"
```

---

## Task 8: API Route — reveal (TDD)

**Files:**
- Create: `app/api/reveal/route.ts`
- Create: `__tests__/api/reveal.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/reveal.test.ts`:
```typescript
import { POST } from '@/app/api/reveal/route';
import { encryptPayload } from '@/lib/crypto';

function makeRequest(shareCode: string) {
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/api/reveal.test.ts
```
Expected: FAIL — "Cannot find module '@/app/api/reveal/route'"

- [ ] **Step 3: Implement the route**

Create `app/api/reveal/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { decryptPayload } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const { shareCode } = await req.json();
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/api/reveal.test.ts
```
Expected: PASS (2 tests)

- [ ] **Step 5: Run all tests to confirm nothing is broken**

```bash
npx jest
```
Expected: All 22 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/reveal/route.ts __tests__/api/reveal.test.ts
git commit -m "feat: add reveal API route with tests"
```

---

## Task 9: Game State Hook

**Files:**
- Create: `hooks/useGameState.ts`

- [ ] **Step 1: Create the hook**

Create `hooks/useGameState.ts`:
```typescript
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
};

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
    setState({
      shareCode: ls.getItem(KEYS.shareCode),
      guesses: JSON.parse(ls.getItem(KEYS.guesses) ?? '[]'),
      unit: (ls.getItem(KEYS.unit) as Unit) ?? 'ft',
      circlesVisible: ls.getItem(KEYS.circlesVisible) !== 'false',
      hintUnlocked: ls.getItem(KEYS.hintUnlocked) === 'true',
      hint: ls.getItem(KEYS.hint),
      gameOver: (ls.getItem(KEYS.gameOver) as GameOverReason | null) || null,
      treasureLat: ls.getItem(KEYS.treasureLat) ? Number(ls.getItem(KEYS.treasureLat)) : null,
      treasureLng: ls.getItem(KEYS.treasureLng) ? Number(ls.getItem(KEYS.treasureLng)) : null,
    });
    setHydrated(true);
  }, []);

  const update = useCallback((updates: Partial<GameState>) => {
    setState(prev => {
      const next = { ...prev, ...updates };
      const ls = localStorage;
      if ('shareCode' in updates) ls.setItem(KEYS.shareCode, updates.shareCode ?? '');
      if ('guesses' in updates) ls.setItem(KEYS.guesses, JSON.stringify(updates.guesses));
      if ('unit' in updates) ls.setItem(KEYS.unit, updates.unit!);
      if ('circlesVisible' in updates) ls.setItem(KEYS.circlesVisible, String(updates.circlesVisible));
      if ('hintUnlocked' in updates) ls.setItem(KEYS.hintUnlocked, String(updates.hintUnlocked));
      if ('hint' in updates) ls.setItem(KEYS.hint, updates.hint ?? '');
      if ('gameOver' in updates) ls.setItem(KEYS.gameOver, updates.gameOver ?? '');
      if ('treasureLat' in updates) ls.setItem(KEYS.treasureLat, String(updates.treasureLat));
      if ('treasureLng' in updates) ls.setItem(KEYS.treasureLng, String(updates.treasureLng));
      return next;
    });
  }, []);

  const clearGame = useCallback(() => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    setState(DEFAULT);
  }, []);

  return { state, update, clearGame, hydrated };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useGameState.ts
git commit -m "feat: add useGameState hook for localStorage game state persistence"
```

---

## Task 10: MapComponent (Leaflet Wrapper)

**Files:**
- Create: `components/MapComponent.tsx`

- [ ] **Step 1: Create the Leaflet map component**

Create `components/MapComponent.tsx`:
```typescript
'use client';

import { useEffect, useRef } from 'react';
import type { Map, Marker, Circle, LatLngExpression } from 'leaflet';
import type { Guess } from '@/types/game';
import { metersToUnit } from '@/lib/units';
import type { Unit } from '@/types/game';

export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

interface Props {
  onMapClick?: (lat: number, lng: number) => void;
  hiderPin?: { lat: number; lng: number } | null;
  guesses?: Guess[];
  showCircles?: boolean;
  unit?: Unit;
  treasurePin?: { lat: number; lng: number } | null;
  /** Starting center [lat, lng]. Defaults to [20, 0] (world view). */
  center?: [number, number];
  zoom?: number;
}

export default function MapComponent({
  onMapClick,
  hiderPin,
  guesses = [],
  showCircles = true,
  unit = 'ft',
  treasurePin,
  center = [20, 0],
  zoom = 2,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const layersRef = useRef<(Marker | Circle)[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix default icon paths for webpack/Next.js builds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: '/leaflet/marker-icon.png',
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      });

      const map = L.map(containerRef.current!).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      if (onMapClick) {
        map.on('click', (e) => onMapClick(e.latlng.lat, e.latlng.lng));
      }

      mapRef.current = map;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-draw pins and circles whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous layers
    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    (async () => {
      const L = (await import('leaflet')).default;

      // Hider's placed pin (blue)
      if (hiderPin) {
        const marker = L.marker([hiderPin.lat, hiderPin.lng]).addTo(map);
        marker.bindPopup('Treasure location');
        layersRef.current.push(marker);
      }

      // Treasure revealed pin (gold star)
      if (treasurePin) {
        const goldIcon = L.divIcon({
          html: '<div style="font-size:24px;line-height:1;">⭐</div>',
          className: '',
          iconAnchor: [12, 12],
        });
        const marker = L.marker([treasurePin.lat, treasurePin.lng], { icon: goldIcon }).addTo(map);
        marker.bindPopup('Treasure was here!');
        layersRef.current.push(marker);
      }

      // Guess pins + optional circles
      const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
      guesses.forEach((guess, i) => {
        const colorIndex = Math.min(Math.floor((i / Math.max(guesses.length - 1, 1)) * (colors.length - 1)), colors.length - 1);
        const color = colors[colorIndex];

        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;">${guess.guessNumber}</div>`,
          className: '',
          iconAnchor: [11, 11],
        });
        const marker = L.marker([guess.lat, guess.lng], { icon }).addTo(map);
        marker.bindPopup(`Guess #${guess.guessNumber}`);
        layersRef.current.push(marker);

        if (showCircles) {
          const circle = L.circle([guess.lat, guess.lng], {
            radius: guess.distanceMeters,
            color,
            fillColor: color,
            fillOpacity: 0.05,
            weight: 1.5,
          }).addTo(map);
          layersRef.current.push(circle);
        }
      });
    })();
  }, [hiderPin, guesses, showCircles, unit, treasurePin]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MapComponent.tsx
git commit -m "feat: add Leaflet MapComponent with guess pins and circle overlays"
```

---

## Task 11: Shared UI Components

**Files:**
- Create: `components/GuessHistory.tsx`
- Create: `components/ShareCodeDisplay.tsx`
- Create: `components/CircleToggle.tsx`
- Create: `components/HintBanner.tsx`

- [ ] **Step 1: Create GuessHistory**

Create `components/GuessHistory.tsx`:
```typescript
'use client';

import type { Guess, Unit } from '@/types/game';
import { formatDistance } from '@/lib/units';

interface Props {
  guesses: Guess[];
  unit: Unit;
}

function distanceColor(meters: number, allGuesses: Guess[]): string {
  if (allGuesses.length === 0) return 'text-slate-400';
  const min = Math.min(...allGuesses.map(g => g.distanceMeters));
  const max = Math.max(...allGuesses.map(g => g.distanceMeters));
  const range = max - min || 1;
  const ratio = 1 - (meters - min) / range;
  if (ratio > 0.66) return 'text-green-400';
  if (ratio > 0.33) return 'text-yellow-400';
  return 'text-red-400';
}

export default function GuessHistory({ guesses, unit }: Props) {
  if (guesses.length === 0) {
    return <p className="text-slate-500 text-xs text-center py-2">No guesses yet</p>;
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-40">
      {[...guesses].reverse().map(g => (
        <div key={g.guessNumber} className="flex justify-between text-xs text-slate-400 px-1">
          <span>#{g.guessNumber}</span>
          <span className={distanceColor(g.distanceMeters, guesses)}>
            {formatDistance(g.distanceMeters, unit)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ShareCodeDisplay**

Create `components/ShareCodeDisplay.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  shareCode: string;
}

export default function ShareCodeDisplay({ shareCode }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-900 border border-dashed border-yellow-500/50 rounded-lg">
      <p className="text-slate-400 text-xs uppercase tracking-wide">Share Code</p>
      <p className="font-mono text-yellow-400 text-sm break-all leading-relaxed">{shareCode}</p>
      <Button
        onClick={handleCopy}
        variant="outline"
        size="sm"
        className="w-full border-slate-600 text-slate-300 hover:text-white"
      >
        {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
      </Button>
      <p className="text-slate-500 text-xs">Share this code with the Seeker via text, Discord, etc.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create CircleToggle**

Create `components/CircleToggle.tsx`:
```typescript
'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function CircleToggle({ checked, onChange }: Props) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
      <div>
        <Label htmlFor="circle-toggle" className="text-slate-300 text-sm cursor-pointer">
          Circle overlays
        </Label>
        <p className="text-slate-500 text-xs">Hide for hard mode</p>
      </div>
      <Switch
        id="circle-toggle"
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create HintBanner**

Create `components/HintBanner.tsx`:
```typescript
'use client';

import { useState } from 'react';

interface Props {
  hint: string;
}

export default function HintBanner({ hint }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start justify-between gap-2 p-3 bg-amber-950/50 border border-amber-600/50 rounded-lg">
      <div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide mb-1">💡 Hint Unlocked</p>
        <p className="text-amber-200 text-sm">{hint}</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 text-xs shrink-0 mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/GuessHistory.tsx components/ShareCodeDisplay.tsx components/CircleToggle.tsx components/HintBanner.tsx
git commit -m "feat: add shared UI components (GuessHistory, ShareCodeDisplay, CircleToggle, HintBanner)"
```

---

## Task 12: Home Screen

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Implement the home screen**

Replace `app/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const router = useRouter();
  const [hasActiveGame, setHasActiveGame] = useState(false);

  useEffect(() => {
    const code = localStorage.getItem('ftt_shareCode');
    const gameOver = localStorage.getItem('ftt_gameOver');
    setHasActiveGame(!!code && !gameOver);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <h1 className="text-3xl font-bold text-white mb-2">Find The Treasure</h1>
        <p className="text-slate-400 text-sm">A distance-only treasure hunt</p>
      </div>

      <div className="flex gap-4 w-full max-w-md">
        <Card
          className="flex-1 bg-slate-900 border-2 border-blue-700 hover:border-blue-500 cursor-pointer transition-colors"
          onClick={() => router.push('/hide')}
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-4xl">📦</span>
            <h2 className="text-blue-300 font-semibold">Hide a Treasure</h2>
            <p className="text-slate-500 text-xs">Pick a location &amp; share the code</p>
          </CardContent>
        </Card>

        <Card
          className="flex-1 bg-slate-900 border-2 border-green-700 hover:border-green-500 cursor-pointer transition-colors"
          onClick={() => router.push('/find')}
        >
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="text-4xl">🔍</span>
            <h2 className="text-green-300 font-semibold">Find a Treasure</h2>
            <p className="text-slate-500 text-xs">Enter a code &amp; start searching</p>
          </CardContent>
        </Card>
      </div>

      {hasActiveGame && (
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white"
          onClick={() => router.push('/play')}
        >
          ▶ Resume Active Game
        </Button>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Update layout with metadata and global styles**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Find The Treasure',
  description: 'A distance-only treasure hunt game',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify home screen renders**

```bash
npm run dev
```
Open http://localhost:3000 — should show the role selector with two cards.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: implement home screen with role selector"
```

---

## Task 13: Hider Screen

**Files:**
- Create: `app/hide/page.tsx`

- [ ] **Step 1: Implement the Hider screen**

Create `app/hide/page.tsx`:
```typescript
'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import ShareCodeDisplay from '@/components/ShareCodeDisplay';
import { unitToMeters, toleranceUnit, toleranceRange } from '@/lib/units';
import type { Unit } from '@/types/game';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const UNITS: Unit[] = ['ft', 'm', 'mi', 'km'];

export default function HidePage() {
  const router = useRouter();
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [unit, setUnit] = useState<Unit>('ft');
  const [toleranceValue, setToleranceValue] = useState(25);
  const [hint, setHint] = useState('');
  const [hintAfterGuesses, setHintAfterGuesses] = useState(20);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tolerUnits = toleranceUnit(unit);
  const tolerRange = toleranceRange(unit);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPin({ lat, lng });
    setShareCode(null);
  }, []);

  const handleGenerate = async () => {
    if (!pin) return;
    setLoading(true);
    setError(null);
    try {
      const toleranceMeters = unitToMeters(toleranceValue, tolerUnits);
      const body: Record<string, unknown> = {
        lat: pin.lat,
        lng: pin.lng,
        toleranceMeters,
        unit,
      };
      if (hint.trim()) {
        body.hint = hint.trim();
        body.hintAfterGuesses = hintAfterGuesses;
      }
      const res = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to generate code');
      const data = await res.json();
      setShareCode(data.shareCode);
    } catch (e) {
      setError('Failed to generate share code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapComponent onMapClick={handleMapClick} hiderPin={pin} />
        {!pin && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-300 text-sm px-4 py-2 rounded-full border border-slate-700 pointer-events-none">
            Click anywhere on the map to place the treasure
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col gap-4 p-4 overflow-y-auto">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="text-slate-500 hover:text-slate-300 text-sm">← Back</button>
          <h1 className="text-white font-semibold">Hide a Treasure</h1>
        </div>

        {pin && (
          <p className="text-slate-500 text-xs">
            Pin: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </p>
        )}

        {/* Unit selector */}
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Distance Units</Label>
          <div className="flex gap-2">
            {UNITS.map(u => (
              <button
                key={u}
                onClick={() => { setUnit(u); setToleranceValue(toleranceRange(u).min + Math.floor((toleranceRange(u).max - toleranceRange(u).min) * 0.05)); }}
                className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                  unit === u
                    ? 'bg-blue-800 border-blue-600 text-blue-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Tolerance slider */}
        <div>
          <Label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Win Tolerance: <span className="text-white">{toleranceValue} {tolerUnits}</span>
          </Label>
          <Slider
            min={tolerRange.min}
            max={tolerRange.max}
            step={tolerRange.step}
            value={[toleranceValue]}
            onValueChange={([v]) => setToleranceValue(v)}
            className="w-full"
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>{tolerRange.min} {tolerUnits}</span>
            <span>{tolerRange.max} {tolerUnits}</span>
          </div>
        </div>

        {/* Hint */}
        <div>
          <Label htmlFor="hint" className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Hint (optional)
          </Label>
          <Input
            id="hint"
            placeholder="Add a clue..."
            value={hint}
            onChange={e => setHint(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-sm"
          />
          {hint.trim() && (
            <div className="mt-2">
              <Label htmlFor="hint-after" className="text-slate-400 text-xs mb-1 block">
                Unlock after <span className="text-white">{hintAfterGuesses}</span> guesses
              </Label>
              <Slider
                id="hint-after"
                min={1}
                max={53}
                step={1}
                value={[hintAfterGuesses]}
                onValueChange={([v]) => setHintAfterGuesses(v)}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!pin || loading}
          className="w-full bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-40"
        >
          {loading ? 'Generating...' : 'Generate Code ↗'}
        </Button>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {shareCode && <ShareCodeDisplay shareCode={shareCode} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the Hider screen**

```bash
npm run dev
```
Navigate to http://localhost:3000/hide — map should load, clicking drops a pin, Generate Code button becomes active, clicking it shows the share code.

- [ ] **Step 3: Commit**

```bash
git add app/hide/page.tsx
git commit -m "feat: implement Hider screen with map, tolerance slider, hint, and code generation"
```

---

## Task 14: Seeker Code Entry Screen

**Files:**
- Create: `app/find/page.tsx`

- [ ] **Step 1: Implement the code entry screen**

Create `app/find/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FindPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.startsWith('FTT-')) {
      setError('Invalid code. Share codes start with FTT-');
      return;
    }

    setLoading(true);
    setError(null);

    // Validate the code by calling guess with a dummy location to check decryption
    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: trimmed, guessLat: 0, guessLng: 0, guessCount: 0 }),
      });
      if (!res.ok) {
        setError('Invalid or expired code. Please check and try again.');
        return;
      }
      // Code is valid — clear old game state and start fresh
      const keys = ['ftt_shareCode','ftt_guesses','ftt_unit','ftt_circlesVisible','ftt_hintUnlocked','ftt_hint','ftt_gameOver','ftt_treasureLat','ftt_treasureLng'];
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('ftt_shareCode', trimmed);
      router.push('/play');
    } catch {
      setError('Could not validate code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-1">Find a Treasure</h1>
        <p className="text-slate-400 text-sm">Enter the code shared by the Hider</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <Label htmlFor="code-input" className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">
            Share Code
          </Label>
          <Input
            id="code-input"
            placeholder="FTT-..."
            value={code}
            onChange={e => { setCode(e.target.value); setError(null); }}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            className="bg-slate-900 border-blue-700 text-yellow-400 font-mono text-lg text-center placeholder:text-slate-600 placeholder:font-sans placeholder:text-sm tracking-wider"
            autoFocus
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <Button
          onClick={handleStart}
          disabled={!code.trim() || loading}
          className="w-full bg-green-700 hover:bg-green-600 text-white disabled:opacity-40 py-5 text-base"
        >
          {loading ? 'Validating...' : 'Start Hunting →'}
        </Button>

        <button
          onClick={() => router.push('/')}
          className="text-slate-500 hover:text-slate-300 text-sm text-center"
        >
          ← Back
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the code entry screen**

```bash
npm run dev
```
Navigate to http://localhost:3000/find — text input should accept the code, show validation error for bad codes, and redirect to `/play` for valid codes.

- [ ] **Step 3: Commit**

```bash
git add app/find/page.tsx
git commit -m "feat: implement Seeker code entry screen with validation"
```

---

## Task 15: Seeker Game Screen

**Files:**
- Create: `app/play/page.tsx`

- [ ] **Step 1: Implement the game screen**

Create `app/play/page.tsx`:
```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/hooks/useGameState';
import GuessHistory from '@/components/GuessHistory';
import CircleToggle from '@/components/CircleToggle';
import HintBanner from '@/components/HintBanner';
import { formatDistance } from '@/lib/units';
import { Button } from '@/components/ui/button';
import type { Guess, GameOverReason } from '@/types/game';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

const MAX_GUESSES = 54;

export default function PlayPage() {
  const router = useRouter();
  const { state, update, clearGame, hydrated } = useGameState();
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [guessing, setGuessing] = useState(false);

  // Redirect if no active game
  useEffect(() => {
    if (hydrated && !state.shareCode) {
      router.replace('/find');
    }
  }, [hydrated, state.shareCode, router]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!state.shareCode || state.gameOver || guessing) return;

    setGuessing(true);
    try {
      const nextGuessNumber = state.guesses.length + 1;
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode: state.shareCode,
          guessLat: lat,
          guessLng: lng,
          guessCount: nextGuessNumber,
        }),
      });
      if (!res.ok) throw new Error('Guess failed');
      const data = await res.json();

      const newGuess: Guess = {
        lat,
        lng,
        distanceMeters: data.distanceMeters,
        guessNumber: nextGuessNumber,
      };
      const newGuesses = [...state.guesses, newGuess];
      setLastDistance(data.distanceMeters);

      const updates: Parameters<typeof update>[0] = { guesses: newGuesses };

      if (data.isHintUnlocked && !state.hintUnlocked) {
        updates.hintUnlocked = true;
        updates.hint = data.hint ?? null;
      }

      if (data.isWin) {
        // Reveal treasure location
        const revealRes = await fetch('/api/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareCode: state.shareCode }),
        });
        const revealData = await revealRes.json();
        updates.gameOver = 'win';
        updates.treasureLat = revealData.lat;
        updates.treasureLng = revealData.lng;
      } else if (newGuesses.length >= MAX_GUESSES) {
        const revealRes = await fetch('/api/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareCode: state.shareCode }),
        });
        const revealData = await revealRes.json();
        updates.gameOver = 'loss';
        updates.treasureLat = revealData.lat;
        updates.treasureLng = revealData.lng;
      }

      update(updates);
    } catch {
      // silently fail — user can try clicking again
    } finally {
      setGuessing(false);
    }
  }, [state, update, guessing]);

  const handleGiveUp = async () => {
    if (!state.shareCode) return;
    const res = await fetch('/api/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareCode: state.shareCode }),
    });
    const data = await res.json();
    update({ gameOver: 'gave_up', treasureLat: data.lat, treasureLng: data.lng });
    setShowGiveUpConfirm(false);
  };

  const handlePlayAgain = () => {
    clearGame();
    router.push('/');
  };

  if (!hydrated || !state.shareCode) return null;

  const guessesLeft = MAX_GUESSES - state.guesses.length;
  const lastGuess = state.guesses[state.guesses.length - 1] ?? null;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        <MapComponent
          onMapClick={state.gameOver ? undefined : handleMapClick}
          guesses={state.guesses}
          showCircles={state.circlesVisible}
          unit={state.unit}
          treasurePin={
            state.gameOver && state.treasureLat !== null && state.treasureLng !== null
              ? { lat: state.treasureLat, lng: state.treasureLng }
              : null
          }
        />
        {!state.gameOver && !guessing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700 pointer-events-none">
            Click the map to guess
          </div>
        )}
        {guessing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-blue-400 text-xs px-3 py-1 rounded-full border border-blue-700 pointer-events-none">
            Calculating distance...
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col gap-3 p-4 overflow-y-auto">
        {/* Header */}
        <div>
          <h1 className="text-white font-semibold text-sm">Find The Treasure</h1>
          {!state.gameOver && (
            <p className="text-slate-500 text-xs">{guessesLeft} guess{guessesLeft !== 1 ? 'es' : ''} remaining</p>
          )}
        </div>

        {/* Game over banner */}
        {state.gameOver === 'win' && (
          <div className="bg-green-950 border border-green-700 rounded-lg p-3 text-center">
            <p className="text-green-300 font-bold">🎉 You found it!</p>
            <p className="text-green-500 text-xs mt-1">In {state.guesses.length} guess{state.guesses.length !== 1 ? 'es' : ''}</p>
          </div>
        )}
        {state.gameOver === 'loss' && (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-center">
            <p className="text-red-300 font-bold">😔 Out of guesses</p>
            <p className="text-red-500 text-xs mt-1">Treasure revealed on map</p>
          </div>
        )}
        {state.gameOver === 'gave_up' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-slate-300 font-bold">🏳 You gave up</p>
            <p className="text-slate-500 text-xs mt-1">Treasure revealed on map</p>
          </div>
        )}

        {/* Last distance */}
        {lastGuess && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <p className="text-slate-500 text-xs">Last guess</p>
            <p className={`text-2xl font-bold mt-1 ${
              state.guesses.length >= 2 && lastGuess.distanceMeters < state.guesses[state.guesses.length - 2].distanceMeters
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {formatDistance(lastGuess.distanceMeters, state.unit)}
            </p>
          </div>
        )}

        {/* Guess counter */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
          <p className="text-slate-500 text-xs">Guesses</p>
          <p className="text-white text-lg font-bold">
            {state.guesses.length} <span className="text-slate-600 text-sm font-normal">/ {MAX_GUESSES}</span>
          </p>
        </div>

        {/* Circle toggle */}
        <CircleToggle
          checked={state.circlesVisible}
          onChange={v => update({ circlesVisible: v })}
        />

        {/* Hint banner */}
        {state.hintUnlocked && state.hint && <HintBanner hint={state.hint} />}

        {/* Guess history */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex-1">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">History</p>
          <GuessHistory guesses={state.guesses} unit={state.unit} />
        </div>

        {/* Actions */}
        {state.gameOver ? (
          <Button
            onClick={handlePlayAgain}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white"
          >
            Play Again
          </Button>
        ) : showGiveUpConfirm ? (
          <div className="flex flex-col gap-2">
            <p className="text-slate-400 text-xs text-center">Reveal the treasure?</p>
            <div className="flex gap-2">
              <Button
                onClick={handleGiveUp}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                Yes, give up
              </Button>
              <Button
                onClick={() => setShowGiveUpConfirm(false)}
                variant="outline"
                size="sm"
                className="flex-1 border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowGiveUpConfirm(true)}
            variant="outline"
            className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
          >
            🏳 Give Up
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the game screen end-to-end**

```bash
npm run dev
```
1. Go to http://localhost:3000/hide → drop pin → generate code → copy code
2. Go to http://localhost:3000/find → paste code → Start Hunting
3. Click the map to guess → distance should appear in sidebar
4. Toggle circle overlays — circles should show/hide
5. Click Give Up → confirm → treasure pin (⭐) should appear on map

- [ ] **Step 3: Commit**

```bash
git add app/play/page.tsx hooks/useGameState.ts
git commit -m "feat: implement Seeker game screen with guessing, circles, hint, and win/loss/give-up flow"
```

---

## Task 16: Docker

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create the Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
services:
  find-the-treasure:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

- [ ] **Step 3: Add a .dockerignore**

Create `.dockerignore`:
```
node_modules
.next
.git
*.md
.env*
```

- [ ] **Step 4: Build and run the Docker image**

```bash
docker build -t find-the-treasure .
docker run -p 3000:3000 find-the-treasure
```
Expected: App accessible at http://localhost:3000

- [ ] **Step 5: Test the full flow in Docker**

1. Open http://localhost:3000/hide → generate a code
2. Open http://localhost:3000/find in a second tab → enter the code → guess
3. Verify distances return correctly (proves the hardcoded key works inside Docker)

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add Docker build with standalone Next.js output"
```

---

## Task 17: Final Test Run + Cleanup

- [ ] **Step 1: Run full test suite**

```bash
npx jest --coverage
```
Expected: All tests pass. Coverage should show lib/ and api/ routes well covered.

- [ ] **Step 2: Run production build**

```bash
npm run build
```
Expected: Build completes with no errors or TypeScript issues.

- [ ] **Step 3: Add .gitignore entries for superpowers**

Add to `.gitignore`:
```
.superpowers/
```

- [ ] **Step 4: Final commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artifacts"
```

---

## Verification Checklist

- [ ] Hider: drop pin → set tolerance + optional hint → generate code → copy to clipboard
- [ ] Seeker: enter code → game loads with empty map
- [ ] Seeker: click map → distance returned in correct unit
- [ ] Seeker: circle overlays appear and toggle correctly with hard mode switch
- [ ] Seeker: hint NOT shown before threshold; shown after threshold as dismissible banner
- [ ] Seeker: WIN — guess within tolerance → ⭐ revealed, win banner shown
- [ ] Seeker: LOSS — 54th failed guess → ⭐ revealed, loss banner shown
- [ ] Seeker: GIVE UP → confirmation → ⭐ revealed
- [ ] Persistence: refresh page during active game → state restored from localStorage
- [ ] Docker: two browser tabs with same image decode each other's codes
- [ ] Offline: disable internet (except localhost) → map tiles may fail but all game logic works

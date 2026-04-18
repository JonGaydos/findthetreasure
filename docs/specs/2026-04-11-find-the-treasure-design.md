# Find The Treasure — Design Spec

**Date:** 2026-04-11
**Status:** Approved

---

## Overview

A two-player async treasure hunt game. User 1 (Hider) pins a secret location on a map and generates a share code. User 2 (Seeker) enters the code on their own instance and gets up to 54 guesses to find the location. After each guess, the Seeker receives only the distance to the treasure — no direction. The app runs entirely offline except for map tile data.

---

## Stack

- **Framework:** Next.js (full-stack — React UI + API routes)
- **Map:** Leaflet.js + OpenStreetMap tiles (free, no API key)
- **UI Components:** shadcn/ui, dark theme
- **Encryption:** AES-256-GCM via Node.js built-in `crypto` module, hardcoded app secret
- **Distance math:** Haversine formula (server-side only)
- **State:** Browser `localStorage` (no database, stateless server)
- **Hosting:** Docker (single container, single port 3000)

---

## Share Code Design

The share code is a compact encrypted string containing all game setup data. Both users run the same Docker image with the same hardcoded secret key, so codes decrypt transparently on either instance.

**Encrypted payload:**
```json
{
  "lat": 40.712776,
  "lng": -74.005974,
  "toleranceMeters": 7.6,
  "unit": "ft",
  "hint": "It's near something cold",
  "hintAfterGuesses": 20
}
```

**Encryption:** AES-256-GCM, random IV per game, base62-encoded output.

**Format:** `FTT-XXXX-XXXX` (prefix + two 4-char chunks for readability)

The Seeker's browser never receives the treasure coordinates — only distances. The share code is re-sent with every guess; the server decrypts it, computes the distance, and returns only the result.

---

## API Routes

| Route | Input | Output |
|-------|-------|--------|
| `POST /api/create-game` | `{ lat, lng, toleranceMeters, unit, hint?, hintAfterGuesses? }` | `{ shareCode }` |
| `POST /api/guess` | `{ shareCode, guessLat, guessLng, guessCount }` | `{ distance, unit, isWin, isHintUnlocked, hint? }` |
| `POST /api/reveal` | `{ shareCode }` | `{ lat, lng }` (only called on win, loss, or give up) |

---

## Game Rules

- **Max guesses:** 54. On the 54th failed guess, the game ends in loss.
- **Win condition:** Seeker's guess lands within the Hider's tolerance radius.
- **Win tolerance:** Set by Hider via slider, stored in meters internally. Slider displays in the small unit of the chosen system: ft if imperial (mi or ft selected), m if metric (km or m selected). Ranges: 1–500 ft / 1–150 m.
- **Units:** Hider selects display units (ft / m / mi / km) when creating the game. This unit is embedded in the share code and used for all distances shown to the Seeker.
- **Hint:** Optional text set by Hider. Unlocked automatically after N guesses (Hider sets N, max 53). Revealed via notification in the Seeker's UI.
- **Give up:** Seeker can give up at any time via a confirmation prompt. Triggers `reveal`.
- **End state:** On win, loss, or give up — the treasure pin is shown on the map.

---

## State Management

**Server:** Fully stateless. No database. The hardcoded secret key is the only persistent server-side data.

**Browser (`localStorage`):**
- `ftt_shareCode` — the active share code (persists across refreshes)
- `ftt_guesses` — array of `{ lat, lng, distance, guessNumber }`
- `ftt_unit` — selected display unit
- `ftt_circlesVisible` — boolean (circle overlay toggle)
- `ftt_hintUnlocked` — boolean
- `ftt_gameOver` — `null | "win" | "loss" | "gave_up"`

---

## Screens

### Home Screen
Role selector: two large cards — "Hide a Treasure" and "Find a Treasure". If `localStorage` contains an active Seeker game, a "Resume Game" option appears.

### Hider Screen
- Full-width Leaflet map (click to drop/move pin)
- Right panel: tolerance slider, hint text input, hint unlock threshold input, unit selector (ft/m/mi/km), "Generate Code" button (disabled until pin placed)
- After generation: share code displayed prominently with one-click copy

### Seeker — Code Entry
- Large code input field with monospace formatting
- "Start Hunting" button validates and loads the game

### Seeker — Game Screen
- Full-width Leaflet map (click to guess)
- Guess pins numbered and color-coded by distance (red → yellow → green)
- Circle overlays drawn around each pin at its distance radius
- Right panel:
  - Last distance (large, color-coded)
  - Guess counter (X / 54)
  - Circle overlay toggle switch (hard mode)
  - Guess history list
  - Give Up button (red, with confirmation)
- Hint shown as a dismissible notification banner when unlocked

### End Screen (Win / Loss / Give Up)
- Treasure pin revealed on map
- Summary: number of guesses used, final distance
- "Play Again" → home screen

---

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Single container. No environment variables required by end users. The encryption secret is compiled into the image.

---

## Project Structure

```
Map Game/
├── app/
│   ├── page.tsx                  # Home screen (role selector)
│   ├── hide/page.tsx             # Hider screen
│   ├── find/page.tsx             # Seeker code entry
│   ├── play/page.tsx             # Seeker game screen
│   ├── api/
│   │   ├── create-game/route.ts  # Encrypt + generate share code
│   │   ├── guess/route.ts        # Decrypt + compute distance
│   │   └── reveal/route.ts       # Decrypt + return coordinates
│   └── layout.tsx
├── components/
│   ├── MapComponent.tsx          # Leaflet wrapper (client-only)
│   ├── GuessHistory.tsx          # Scrollable guess list
│   ├── ShareCodeDisplay.tsx      # Generated code + copy button
│   ├── CircleToggle.tsx          # Hard mode toggle
│   └── HintBanner.tsx            # Dismissible hint notification
├── lib/
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── haversine.ts              # Distance calculation
│   └── units.ts                  # Unit conversion utilities
├── Dockerfile
├── docker-compose.yml
└── docs/superpowers/specs/
    └── 2026-04-11-find-the-treasure-design.md
```

---

## Verification

1. **Hider flow:** Drop pin → set options → generate code → code appears and copies to clipboard
2. **Seeker flow:** Enter code → map loads → click guess → distance returned correctly
3. **Encryption:** Two separate Docker instances with same image can decode each other's codes
4. **Circle overlays:** Circles drawn at correct distance radius, toggle hides/shows all circles
5. **Hint:** Does not appear before threshold; appears after threshold as notification
6. **Win:** Guessing within tolerance reveals treasure and shows win screen
7. **Loss:** 54th failed guess reveals treasure and shows loss screen
8. **Give up:** Confirmation → treasure revealed
9. **Persistence:** Refreshing the browser restores game state from localStorage
10. **Units:** All distances displayed in Hider-selected unit throughout the game

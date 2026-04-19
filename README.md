# 🗺️ Find The Treasure

A two-player, distance-only treasure hunt played on a world map.

One player (the **Hider**) taps a spot on the map, sets a win tolerance, and optionally writes a hint — the app returns an encrypted share code. The other player (the **Seeker**) enters that code and gets **54 guesses** to find the spot by tapping the map. Each guess gets distance feedback (green = closer, red = farther) but never a direction. Optional circle overlays show the radius of each guess.

Coordinates never leave the server — the share code carries an AES-256-GCM encrypted payload that only the `/api/guess` and `/api/reveal` routes can decrypt. No database, no accounts, no tracking.

## Playing

1. Visit the site.
2. **Hide a treasure** → tap to place a pin → pick a tolerance (e.g. 25 ft) → optionally add a hint → Generate Code. Share the code with a friend.
3. **Find a treasure** → paste the code → tap the map to guess. Or use **Practice** for a random land location anywhere in the world.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4 + a small set of shadcn/ui primitives
- [MapLibre GL JS](https://maplibre.org/) for the map (3D globe at low zoom, flat Mercator when zoomed in), with [Esri World Imagery](https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer) satellite tiles as the default
- Node's built-in `crypto` (AES-256-GCM) for the share code payload
- Jest + Testing Library for tests, Docker (standalone output) for deploys

## Quick start

Prereqs: Node 20 or newer (24 LTS works great), npm.

```bash
git clone https://github.com/JonGaydos/findthetreasure.git
cd findthetreasure
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing on a phone

The dev server also prints a **Network** URL like `http://192.168.0.35:3000`. Open it on any device on the same Wi-Fi. Next.js 16 blocks cross-origin requests to `/_next/*` dev assets by default, so the app ships an allowlist for typical home/small-office subnets (`192.168.*.*`, `10.*.*.*`) in `next.config.ts` — if your LAN uses a different range, add it there and restart.

See [AGENTS.md](./AGENTS.md) for a full mobile verification checklist.

## Configuration

All optional. Set in a `.env.local` file or your hosting platform's env config.

| Variable | Default | Purpose |
|---|---|---|
| `FTT_SECRET` | *(required for prod)* | 32-byte hex string used to AES-encrypt share codes. Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_TILE_URL` | Esri World Imagery (satellite) | Raster tile URL template. Swap for OSM, Mapbox, etc. without code changes. |
| `NEXT_PUBLIC_TILE_ATTRIBUTION` | Esri credit string | Tile attribution shown in the map's lower-right. Must match your `TILE_URL`. |

To get the classic OpenStreetMap street map back:

```env
NEXT_PUBLIC_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_TILE_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
```

### Tile provider notes

The default **Esri World Imagery** is free for non-commercial use. For a paid or high-traffic deployment, either:

- use OSM (above) — free for any use with attribution, or
- sign up for Mapbox / MapTiler / Stadia and set the `NEXT_PUBLIC_TILE_URL` accordingly.

## Build & deploy

### Production build (local)

```bash
npm run build
npm start
```

### Docker

A multi-stage `Dockerfile` and `docker-compose.yml` are included. Builds a Next.js standalone output running on port 3000.

```bash
docker compose up --build
```

Set `FTT_SECRET` in `.env` or your Docker environment for production. A missing or short secret will fall back to a dev-only default and log a warning.

### Vercel / Netlify / any Node host

Standard Next.js deploy. Just set `FTT_SECRET` as an environment variable.

## Repo layout

```
app/
  api/
    create-game/  POST  →  encrypt (lat,lng,tolerance,…) into a share code
    guess/        POST  →  decrypt, haversine, return distance + hint unlock
    reveal/       POST  →  decrypt, return coordinates (win/loss/give-up)
    random-location/ GET → random land lat/lng for Practice mode
  hide/           Hider screen — pin + options + Generate Code
  find/           Seeker code-entry screen + Practice launcher
  play/           Seeker game screen — map, guesses, circles, history
components/
  MapComponent.tsx         MapLibre GL wrapper (client-only, dynamic import)
  CircleModeSelector.tsx   Tri-state circles: Off / Last / All
  GuessHistory.tsx         Scrollable list of past guesses
  HintBanner.tsx           Shown after N guesses when a hint was set
  ShareCodeDisplay.tsx     Code + copy-to-clipboard button
hooks/
  useGameState.ts          localStorage-backed game state + legacy migration
lib/
  crypto.ts                AES-256-GCM encrypt/decrypt for share codes
  geo.ts                   GeoJSON polygon approximation of a geographic circle
  haversine.ts             Great-circle distance
  units.ts                 ft/m/mi/km conversion + display formatting
docs/specs/                Design specs for recent work
__tests__/                 Jest suites
```

## Contributing

- `npm test` runs the Jest suite (target: stays green).
- `npm run lint` runs ESLint.
- Mobile regressions are the most common break — follow the **Mobile testing** section in [AGENTS.md](./AGENTS.md) before merging anything that touches layout, event handling, or the map.

## License

MIT.

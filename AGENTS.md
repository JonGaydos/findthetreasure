<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mobile testing

The app targets desktop and mobile browsers. Mobile regressions are the single most common source of user-visible breakage — always verify mobile before declaring a task done.

## Two ways to test

**1. Chromium device emulation (fast iteration):**

- Run `npm run dev`.
- Open `http://localhost:3000` in Chrome → DevTools → Toggle device toolbar (Ctrl+Shift+M) → pick iPhone or Pixel.
- Good for: layout, viewport sizing, hover-vs-tap states, responsive breakpoints.
- **Not** good for: true touch-event behavior, iOS Safari quirks, performance on low-end devices.

**2. Real phone over LAN (authoritative):**

- Run `npm run dev`. Note the Network URL it prints, e.g. `http://192.168.0.35:3000`.
- On a phone joined to the same Wi-Fi, open that URL in Safari/Chrome.
- If the phone shows "no map, unresponsive buttons, but text is still selectable", the dev-origin allowlist is missing your LAN subnet. Add it to `allowedDevOrigins` in `next.config.ts` and restart the dev server. The current allowlist covers `192.168.*.*` and `10.*.*.*`. See `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md` for the full rules (Next 16 blocks cross-origin `_next/*` asset requests by default).
- Always run through the checklist below on a real phone before merging anything touching layout, event handling, or map code.

## Verification checklist

Run end-to-end on both desktop (≥1280px wide) and a real phone:

- [ ] Home `/` loads; "Hide a Treasure" and "Find a Treasure" cards navigate correctly.
- [ ] `/hide` — map renders, tab bar switches between Map and Options, tapping the map places a pin, unit selector buttons respond, tolerance slider drags, Generate Code button produces a share code.
- [ ] `/find` — code input accepts text, "Start Hunting" validates and navigates to `/play`, "Practice with Random Location" starts a solo game.
- [ ] `/play` — map renders, tab bar switches between Map and Game, tapping the map registers a guess, last-distance updates, guess counter increments, circles toggle works, give-up flow works.
- [ ] Resizing the desktop viewport across the `md` breakpoint toggles between the side-panel layout and the tabbed mobile layout without breaking either.
- [ ] `npm run lint` and `npm test` pass.
- [ ] `npm run build && npm start` — the production build behaves the same on both form factors.

If any step fails, capture: exact URL, device + browser + version, and DevTools console output. For Android Chrome: `chrome://inspect` from the desktop with the phone on USB. For iOS Safari: Safari → Preferences → Advanced → Show Develop menu, then connect via Lightning/USB-C.

# Mobile Single-Page Layout + Tri-State Circles — Design Spec

**Date:** 2026-04-18
**Branch:** `fix-mobile-ui` (continues from the 2026-04-17 LAN-origin fix)
**Scope:** Replace the mobile tabbed layout on `/hide` and `/play` with a single-page sticky-map layout, and replace the binary circles toggle with a tri-state mode selector. Default circles to off.

## Problem

Two independent user complaints, batched together because they both touch the mobile gameplay experience:

1. **Mobile tabs force context switching.** The current `/hide` and `/play` pages render a tab bar at the top of the viewport on mobile: *Map* tab or *Options / Game* tab, never both at once. The user can't see their pin or guesses while adjusting settings or reviewing history. The tabbed layout was originally introduced (commit `1460350`) as a workaround for untappable buttons, not as a deliberate UX choice — and that workaround is no longer needed now that the root cause of unresponsiveness is fixed.

2. **Circles default on is noisy, and "show all circles" is a blunt instrument.** Every guess gets a colored radius ring. Early-game this is informative; later-game the map fills with overlapping rings that make the last guess hard to see. Users who want just the current guess's circle have no way to limit the view.

## Goal

- Mobile `/hide` and `/play` show the map and the controls simultaneously. No tabs.
- Circle overlays default off, and when on, the user can choose between just the most recent guess's circle or all circles.
- Existing users' saved preferences migrate cleanly on first load.
- No regression on desktop, `/find`, or `/` home.

## Non-goals

- Redesigning `/find` (already single-page, no tabs).
- Touching the desktop side-panel layout.
- Redesigning the home `/` page.
- Replacing `CircleToggle` with a more elaborate control type (drawer, modal, etc.) — a segmented pill row is sufficient and consistent with the existing unit selector.
- Pre-existing lint warnings in `hooks/useGameState.ts`.
- Removing unused `components/ui/card.tsx`.
- Merging `fix-mobile-ui` to `main` — that is a follow-up step after verification, not part of this spec.

## Design — mobile layout

### Structure (both `/hide` and `/play` below the `md:` breakpoint)

- **Map area:** sticky at the top, takes ~70% of the viewport *height* on `/hide` and ~60–65% on `/play`. Always visible.
- **Panel area:** fills the remaining viewport height. Internal scroll when content overflows; the map stays pinned and never scrolls off. Header at top, primary action at bottom.
- **No tab bar.** `mobileTab` state, the tab JSX, and any code specific to switching between tab views are removed.

Desktop layout (≥ `md:` breakpoint, 768px) is unchanged: full-bleed map with a 288px side panel.

### `/hide` panel layout (~30vh)

| Row | Content | Notes |
|---|---|---|
| Header | `← Back   Hide   📍 placed` | Three elements on one row. Pin status in green when placed, neutral otherwise. |
| Units | `[ft] [m] [mi] [km]` | Pill row, no separate "Distance Units" label. |
| Tolerance | `TOLERANCE  ▬▬●▬▬  25 ft` | Label + slider + current value on one row. No min/max end-labels — the slider's visual position conveys range. |
| Hint | `Add a hint (optional)…` | Text input. The sub-control for "unlock after N guesses" appears only after the user types non-whitespace. |
| Errors / share code | inline, above the button | Same components as today. |
| Action | `Generate Code ↗` | Full-width primary button, pinned to the bottom of the panel. |

### `/play` panel layout (~35vh, scrollable)

| Row | Content | Notes |
|---|---|---|
| Header | `Find The Treasure   54 left` | Title + remaining-guesses count merged. |
| Game-over banner | conditional (win/loss/gave-up) | Same styling as today, slots in above Feedback. |
| Feedback | `LAST   1,240 ft` | Big value, color-coded green (closer than prior) or red (farther or first). |
| Units | `[ft] [m] [mi] [km]` | Pill row. |
| Circles | `CIRCLES  [Off] [Last] [All]` | Segmented pills. See next section. |
| Hint banner | conditional | Appears inline when unlocked. |
| History | scrolling list | Fills remaining panel height. Uses existing `GuessHistory` component unchanged. |
| Action | `🏳 Give Up` | Becomes `Play Again` on game over. |

## Design — circles tri-state

### State shape change

- Add `CircleMode = 'off' | 'last' | 'all'` to `types/game.ts`.
- Replace `GameState.circlesVisible: boolean` with `GameState.circleMode: CircleMode`.

### localStorage key change

- New key: `ftt_circleMode`, values `"off"` / `"last"` / `"all"`.
- Legacy key: `ftt_circlesVisible` (values `"true"` / `"false"`).

### Migration on load (inside `useGameState`'s mount `useEffect`)

```
read ftt_circleMode
if present → use it
else read ftt_circlesVisible
  if "true"  → circleMode = 'all'   // preserve prior behavior
  if "false" → circleMode = 'off'
  if absent  → circleMode = 'off'   // new default
remove ftt_circlesVisible from localStorage (one-time migration)
write ftt_circleMode with the resolved value
```

### Rendering change in `MapComponent`

- Prop `showCircles: boolean` becomes `circleMode: CircleMode`.
- The forEach over `guesses`:
  - `off` → draw no circles
  - `last` → draw circle only when `i === guesses.length - 1` and `distanceMeters > 0`
  - `all` → draw circle when `distanceMeters > 0` (current behavior)

### UI change

- Rename `components/CircleToggle.tsx` → `components/CircleModeSelector.tsx`.
- Signature:
  ```ts
  interface Props { value: CircleMode; onChange: (mode: CircleMode) => void; }
  ```
- Layout: one row with label + three pills, visual style identical to the unit selector in the same panel.

## Design — scope of file edits

| File | Change |
|---|---|
| `types/game.ts` | Add `CircleMode` type |
| `hooks/useGameState.ts` | Swap `circlesVisible` for `circleMode`, add migration in mount effect, update `DEFAULT`, update `update` setter branch for the new key |
| `app/hide/page.tsx` | Drop mobile tab JSX + `mobileTab` state, replace with sticky-map + compact panel structure, tighten rows per the table above |
| `app/play/page.tsx` | Same restructure, plus `showCircles` → `circleMode` prop threading, use new selector component |
| `components/MapComponent.tsx` | Prop change `showCircles` → `circleMode`, update rendering loop |
| `components/CircleToggle.tsx` | Rename to `CircleModeSelector.tsx`, rewrite as three-pill segmented control |
| `__tests__/…` (useGameState) | Add tests for migration paths (new user, legacy true, legacy false, new key present) |
| `AGENTS.md` | Update mobile checklist: new `/hide` panel layout (inline pin status, one-row tolerance), new `/play` panel layout (no tab bar, inline circles selector), Off/Last/All toggling on `/play`, legacy-key migration sanity check |

All other files stay as-is.

## Verification checklist

- [ ] Mobile emulator `/hide` — map ~70% of viewport, panel tight, all settings accessible, Generate Code works end-to-end.
- [ ] Mobile emulator `/play` — map ~60–65%, feedback + history scrollable, circles segmented control works in all 3 modes.
- [ ] Switching `Off → Last → All` on `/play` adds/removes circles correctly in real time without reload.
- [ ] Existing user with saved `ftt_circlesVisible=true` in localStorage → first page load shows `All` selected.
- [ ] Existing user with saved `ftt_circlesVisible=false` → first load shows `Off`.
- [ ] New user (cleared localStorage) → first load shows `Off`.
- [ ] Legacy `ftt_circlesVisible` key is removed from localStorage after first load in the new version.
- [ ] Desktop view (≥1280px wide) unchanged on `/hide`, `/play`, `/find`, and `/`.
- [ ] `npm run lint` — no new issues over the current baseline of 9 pre-existing.
- [ ] `npm test` — all pass, including new migration tests.
- [ ] `npm run build && npm start` — production build works the same on mobile emulator and real phone.
- [ ] Real phone over LAN — walk the AGENTS.md mobile checklist end-to-end. (This also closes the loop on the 2026-04-17 LAN-origin fix, which has not yet been verified on a physical device.)

## Open questions / deferred decisions

None. All decisions are made above. If something surfaces during implementation (e.g., Leaflet's behavior when a circle's reference guess is removed between renders), address it as part of the fix and note it in the commit message.

## Success, in one sentence

The user opens `/hide` or `/play` on their phone, sees the map and every control at the same time with no tab bar, and the map's guess-circles default to off with a tri-state selector that respects whatever they chose before.

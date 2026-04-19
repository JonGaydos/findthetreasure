# Hider Tolerance — One Unit Per Choice

**Date:** 2026-04-18
**Branch:** `hider-tolerance-per-unit`
**Scope:** Tiny fix. Make the `/hide` tolerance slider operate in the unit the Hider actually picks, instead of silently switching to ft/m.

## Problem

On `/hide`, the user picks a unit (`ft` / `m` / `mi` / `km`) to express their tolerance. The current code maps that to a "system" (imperial or metric) and forces the slider to operate in the small unit of that system — `ft` for imperial, `m` for metric. Concrete symptom: user clicks `mi`, the slider label still reads `"25ft"`. Confusing, surprising, and blocks regional-scale games ("treasure within 2 miles") because the max tolerance tops out at 500 ft.

## Design intent (reaffirmed)

- **Hider** picks the unit in which they want to express tolerance. The slider honors that choice end-to-end. A Hider can set "25 ft" for a backyard game, "0.5 mi" for a neighborhood game, or "5 km" for a regional game.
- **Seeker** picks their own display unit on `/play`, entirely independent of the Hider's choice. This is already the behavior — `payload.u` is stored in the share code but the seeker-side code never consumes it; `state.unit` on `/play` comes from the seeker's own `localStorage.ftt_unit`. No seeker-side changes needed.

## Non-goals

- Changing the share-code format. Tolerance is still stored in meters inside `payload.t`; existing share codes decrypt and play identically.
- Removing `payload.u` from the share code. It's dormant but not harmful. Leave it alone in case some future feature wants to read the Hider's original unit as a hint.
- Touching `/play`, `/find`, `/` — all unchanged.
- Fixing pre-existing useGameState lint issues (still tracked as a spawned follow-up task).

## Design

### `lib/units.ts`

- **Delete `toleranceUnit(unit: Unit): 'ft' | 'm'`**. Its only purpose was to collapse the 4 display units down to 2 slider units. No longer needed — the slider uses the Hider's chosen unit directly.
- **Expand `toleranceRange(unit: Unit)` to cover all 4 units**, each with a range appropriate to that unit's scale:

  | Unit | min | max | step |
  |---|---|---|---|
  | `ft` | 1 | 500 | 1 |
  | `m` | 1 | 150 | 1 |
  | `mi` | 0.1 | 10 | 0.1 |
  | `km` | 0.1 | 15 | 0.1 |

Rationale for the `mi` / `km` ranges: 0.1 granularity is comparable to the ~1 m / ~3 ft granularity of the small-unit sliders (0.1 mi ≈ 528 ft, 0.1 km = 100 m — a bit coarser but fine for regional-scale games where you wouldn't want 1-foot precision anyway). If the Hider wants foot-precision, they pick `ft`. Natural tiered design.

### `app/hide/page.tsx`

Three small edits:

1. **Drop** `const tolerUnits = toleranceUnit(unit);`. Use `unit` directly everywhere `tolerUnits` appeared.
2. **Fix the "reset tolerance on unit change" math** (the `setToleranceValue(range.min + Math.floor((range.max - range.min) * 0.05))` call when a unit pill is tapped). `Math.floor` gives 0 when `step < 1`, which makes `mi` and `km` jump straight to their `min` value. Replace with step-aware rounding:

   ```ts
   const range = toleranceRange(u);
   const target = range.min + (range.max - range.min) * 0.05;
   const quantized = Math.round(target / range.step) * range.step;
   // re-round to avoid float drift like 0.30000000000004
   const decimals = range.step >= 1 ? 0 : 1;
   setToleranceValue(Number(quantized.toFixed(decimals)));
   ```

3. **Format the inline readout with the right number of decimals:**

   ```ts
   const tolerDecimals = tolerRange.step >= 1 ? 0 : 1;
   // ...
   <span className="...">{toleranceValue.toFixed(tolerDecimals)}{unit}</span>
   ```

No other caller of `toleranceRange` exists outside `/hide`, so the change is contained.

### `__tests__/lib/units.test.ts`

- Check for any existing test covering `toleranceUnit` — remove it (the function is gone).
- Add quick tests for the new `toleranceRange` values:
  - `toleranceRange('ft')` = `{ min: 1, max: 500, step: 1 }`
  - `toleranceRange('mi')` = `{ min: 0.1, max: 10, step: 0.1 }`
  - (etc. for `m` and `km`)

## Verification

- [ ] On `/hide` mobile emulator: tap each of ft / m / mi / km. Slider range, step, and displayed value all switch to that unit. No "ft" stuck under a mi slider.
- [ ] Generate a code with `mi` selected at tolerance 2 mi. Copy the code. Open `/play` in a different browser/incognito — play a round. Distance feedback on `/play` honors the seeker's unit pill (proving seeker independence still works).
- [ ] `npm run lint` — no new issues over the 8-problem baseline.
- [ ] `npm test` — all green. The updated units tests cover the new ranges.
- [ ] `npm run build` — clean production build, no TS errors.
- [ ] Real phone: walk the AGENTS.md mobile checklist with focus on `/hide` tolerance.

## Success, in one sentence

A Hider who picks `mi` sees a slider that reads in miles with sensible ranges, and the Seeker keeps picking whatever unit they personally want on `/play`.

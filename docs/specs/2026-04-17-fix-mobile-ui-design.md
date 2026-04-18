# Fix Mobile UI — Design Spec

**Date:** 2026-04-17
**Branch:** `fix-mobile-ui`
**Scope:** Bugfix + targeted cleanup (scope "B" from brainstorming: make it work *and* clean up the mobile UI architecture).

## Problem

On `npm run dev` over LAN, loading `/hide`, `/find`, or `/play` from a mobile browser produces:

- No map visible on `/hide` and `/play` — Leaflet never renders.
- Buttons and tab bars don't respond to taps.
- Text on those pages is selectable (long-press, copy works).
- Home page `/` works correctly on the same phone in the same session.

Git history shows seven consecutive recent commits patching mobile issues (inline `touch-action`, Leaflet stacking-context fixes, `@base-ui/react` replacement with native HTML, Leaflet CSS import changes, tabbed mobile layout, hardcoded-IP and LAN-origin fixes). This pattern suggests prior fixes addressed symptoms rather than root cause.

## Leading hypothesis (unconfirmed)

Client hydration is failing on `/hide`, `/find`, `/play` but succeeding on `/`. Evidence fit:

- SSR-rendered HTML is visible (text selectable = native browser behavior, no JS required).
- React event handlers never attach → taps do nothing.
- `useEffect` never fires → Leaflet's initialization code (which lives in a `useEffect`) never runs → no map.
- Home page differs: no `useRouter`, no dynamic imports, no `useGameState`, fewer hooks.

Hypothesis must be **confirmed or replaced** with a named root cause before any fix is written.

## Goal

Mobile web UI fully functional on real phone in both `npm run dev` (LAN) and `npm run build && npm start` (local production build). Accumulated workarounds that become unnecessary after the fix are removed in the same pull request. Main stays shippable throughout.

## Non-goals

- Public deployment (Docker, Vercel, cloud hosting).
- HTTPS setup.
- PWA / installable app behavior.
- Rebuilding the mobile layer with a different pattern (bottom-sheet, full-screen map with floating controls, etc.).
- Replacing shadcn/ui with a different component library.
- New features (settings page, dark-mode toggle, account system, etc.).
- Fixing unrelated desktop bugs, unless they block verification.

## Investigation plan

1. Install dependencies: `npm install` in `D:\Claude Projects\findthetreasure` (`node_modules/` does not yet exist locally).
2. Start `npm run dev`.
3. Reproduce the bug in Chrome DevTools device-mode on desktop first for fast iteration.
4. Open DevTools console and collect evidence. Look for:
   - Hydration mismatch warnings from React 19.
   - Unhandled promise rejections during render.
   - Next.js client-manifest errors.
   - Any exception thrown during initial render of `/hide`, `/find`, or `/play`.
5. Open DevTools Network tab. Look for:
   - Blocked or failed requests to `_next/static/…`.
   - LAN-origin rejections, CSP violations, MIME-type errors.
6. Read `node_modules/next/dist/docs/` (per `AGENTS.md` directive: this is not the Next.js in training data). Focus on:
   - Client component hydration changes in Next 16.
   - Any breaking changes to `useRouter`, dynamic imports, or app-router client rendering.
   - Dev-server origin / HMR changes relevant to LAN access.
7. Once evidence is collected, name the root cause in a single sentence with a pointer to the evidence (console message, network trace line, or documented Next 16 change).
8. Verify the fix in DevTools device-mode. Then verify on real phone over LAN before declaring done.

**Exit criterion for investigation:** root cause is named and evidenced. "Probably X" is not acceptable — that's exactly what produced the existing workaround pile.

## Fix strategy

Principles that the fix must obey (not the fix itself — fix content depends on root cause):

- **Evidence-based.** Every change traces to a concrete observed error or a documented Next 16 behavior change.
- **Workarounds come out when the fix obsoletes them.** Same PR, not a follow-up. If the fix makes the inline `touch-action`, Leaflet stacking hack, or tabbed mobile layout unnecessary, they are removed.
- **Desktop cannot regress.** Verified on desktop Chrome (≥1280px width) + mobile emulator + real phone for every change touching layout or event handling.
- **Main stays shippable.** All work lives on `fix-mobile-ui` branch; merged only after full verification.

## Cleanup scope

The following cleanup is in-scope regardless of which root cause emerges:

1. **Remove `@base-ui/react` dependency.** Usages were all replaced in commit `82dfb47`. Run `npm uninstall @base-ui/react`. Grep for any stray imports. Delete if present.

2. **Consolidate `touch-action` handling.** Replace the ~10 scattered inline `style={{ touchAction: 'manipulation' }}` occurrences with a single CSS rule in `app/globals.css`:
   ```css
   button, a, [role="button"], input[type="range"] {
     touch-action: manipulation;
   }
   ```
   Verify buttons, links, and sliders still behave correctly after consolidation.

3. **Mobile testing documentation.** Add a "Mobile testing" section to `AGENTS.md` (the root `CLAUDE.md` forwards to it, so a single source of truth) covering:
   - How to open Chrome DevTools device mode.
   - How to test on a real phone over LAN (`npm run dev` + phone connects to `http://<host-ip>:3000`).
   - A verification checklist: home loads, `/hide` map renders, tabs switch, sliders drag, map tap places pin, `/find` code-entry responds, `/play` taps register as guesses, desktop layout still works.

4. **Mobile layout re-evaluation (conditional).** If the root cause reveals the tabbed mobile layout in `/hide` and `/play` was a workaround for the broken touch behavior rather than a genuine UX choice, evaluate whether to keep it. This decision is **deferred** until the investigation finishes. If kept, fine. If removed, the change lives in the same PR and is covered by the same verification steps.

Explicitly **out of cleanup scope**: ripping out other shadcn/ui components, consolidating page component files, or any refactor not directly tied to the root cause or the items above.

## Verification

The fix is not "done" until **all** of the following pass:

- [ ] `/hide`, `/find`, `/play` respond to taps on a real Android or iOS phone, loaded over LAN from `npm run dev`.
- [ ] Map renders on `/hide` and `/play` on the real phone.
- [ ] Sliders (tolerance, hint-after-N-guesses on `/hide`) drag smoothly on the phone.
- [ ] Map-tap places the pin on `/hide` and registers a guess on `/play` on the phone.
- [ ] Unit selector buttons respond on `/hide` and `/play`.
- [ ] Desktop Chrome (≥1280px wide) — all pages still render and function correctly.
- [ ] `npm run build && npm start` locally — same phone verification still passes against the production build.
- [ ] `npm run lint` clean.
- [ ] `npm test` (Jest) clean.
- [ ] New mobile-testing checklist in `AGENTS.md` walked through end-to-end at least once.

## Open questions / deferred decisions

- **Mobile tabbed layout fate.** Deferred until investigation identifies the root cause.
- **Whether the `min-h-screen` / `h-screen` usage is safe on mobile Safari with dynamic toolbars.** May surface during investigation; if so, addressed as part of the fix scope since it is plausibly linked to the map-not-rendering symptom.

## Success, in one sentence

A real phone can load the three broken pages over LAN `npm run dev`, tap everything, see the map, and play a full hide/find round end-to-end — and the codebase no longer carries workarounds that papered over the original bug.

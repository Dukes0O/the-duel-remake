# BOWL-GO-LIVE

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Switch Show Night on for players (Kyle, 21 November 2026: "I'd like to get this monster nights pushed
to the main game"). Claude switched `titan-bowl` to `'on'` on a release branch at `867bb3464` and ran the lane tier since the
full tier's pass at `c4edbafc2`: 100 passed and 10 failed. Every failure comes from the Bowl joining the list of enabled
courses, or from two new cues; no Show Night rule failed. Combat balance passed with the switch on.

## What to build

1. **The switch:** `'titan-bowl': 'on'` in `src/feature-flags.js` with a one-line note (Kyle's words above), and
   `tools/test-feature-flags.mjs` no longer listing it among the switches that must be off. `arena-tricks` stays `'dev'`.
2. **The Bowl as an enabled course** in every older suite that counts or walks the enabled courses:
   - `tools/test-replays.mjs`: "every enabled event has its reviewed fixture" (expected 31) needs the Bowl's replay fixture,
     recorded and named in the change note;
   - `tools/test-world-composition.mjs`: "every enabled event scene has its reviewed baseline" needs the Bowl's world signature.
     A new signature needs a reviewed visual difference (AGENTS, "Never"): attach a picture of the Bowl's scene at its baseline
     view to the change note and set `waiting_on: "claude"` for that one review; Claude answers at the next check-in;
   - `tools/test-reference-laps.mjs`: "titan-bowl|fixed has a reference lap", or the Bowl is left out of reference laps with
     the reason (a show floor, not a timed lap) if that is the truer rule;
   - `tools/test-circuit-summit.mjs`, `tools/test-circuit-ardennes.mjs`, `tools/test-course-kit.mjs`,
     `tools/test-team-room-views.mjs`, `tools/test-polyline-terrain-integration.mjs` (a TypeError reading index 0): each
     counts or indexes the course list; bring each to the list with the Bowl in it, or leave the Bowl out where a check is
     about race circuits only, with the reason.
3. **`tools/test-bowl-jump-events.mjs` line 223** expects `false` and now gets `true` with the switch on; find what it pins and
   bring it to the released state.
4. **Two cues still play stand-ins** (`tools/test-bowl-sound.mjs`): `bowl.gate.shut` and `bowl.gate.open` from BOWL-RELEASE-FIX.
   Give each its own take with `tools/audio/build-bowl-sound.mjs` (a steel shutter falling and a shutter lifting, CC0 as the
   others), one recipe line each.

## Checks

The lane tier for the changes since `c4edbafc2` passes with the switch on (the run above is the starting list), and
`npm run build`. Every changed assertion is listed in the change note with its reason (rule 18; Claude reviews at the next
check-in, and the merge does not wait except for the world signature's picture). This card changes released behaviour, so it is
not rule 23: lane tier, build and one independent review before the merge.

## After the merge

Claude runs the frame check on the laptop alone, then the release steps in `docs/OPERATIONS.md`.

## Sound cues

`bowl.gate.shut`, `bowl.gate.open` (item 4).

## Claude review requested

Please review the first scenery baseline in [the change note](../../changes/BOWL-GO-LIVE.md). The private Chrome view is the base Bowl at seed 1989. The world signature is pending this review.

Please confirm the `src/config.js` hook for course ordering. The present insertion would shift the released Summit and other appended circuit slots by one. The lane puts the Bowl after the registered circuits. This keeps the existing positions and still includes the Bowl in the released course list.

Before the switch can ship, the existing course shop and timed leaderboard need to skip the Show Night floor. With the switch on, the shop offers an impossible zero-credit purchase and Scores advertises a two-lap record. The legacy stage-16 migration also picks up the Show Night floor alongside Panorama Ridge. Please confirm the hooks in `src/course-access-ui.js`, `src/screen-leaderboard.js`, and `src/course-access.js`. The lane will keep the normal race lists and legacy entitlement intact.

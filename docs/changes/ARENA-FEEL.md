---
task: ARENA-FEEL
status: merged
kind: presentation
flag: scrapdome
player_facing: yes
---

# Tells, shimmer and sounds for arena fights (26 September 2026)

Built by Claude on Kyle's request, on top of the crash and Muddy Hollow sound
lane (stacked branch).

## Design (docs/SCRAPDOME.md section 5, decisions.md)

- A rammer that lines up a charge (in range and aligned) starts a tell of
  `BRAIN_DIFFICULTY.tellSec`: it eases to `ARENA_FEEL.tellSpeedShare` (60%)
  of its speed and emits `arenaTell` with its position. When the tell ends it
  charges (boost on Medium and Hard). Losing the line or backing off resets
  the charge, so every charge is announced.
- A respawned car carries `arenaShimmerSec` (1.2 s), decaying each step.
- Wreck-credit callouts already existed ("YOU WRECKED ...", "WRECKED BY ...").

## Presentation

- `src/arena/arena-tell-view.js`: two additive high-beam flares on the nose
  during a tell (pulsing, drawn over armour), a blue halo that grows and fades
  after a respawn. Reads the timers; writes no race state.
- Sounds (behind `scrapdome`): `arena.tell` (a rising engine roar, placed at
  the car), `arena.respawn` (a short rising shimmer), `arena.wreck-credit`
  (the approved hit-confirm recordings plus a low thump) when the player gets
  a wreck.
- `src/ambient-shading.js`: sprites are excluded from the ambient shading
  depth pass. Before, any sprite drew a dark rectangle through that pass.

## Tests

- New `tools/test-arena-feel.mjs` (5 tests, committed red first): every
  charge on Easy, Medium and Hard follows a full tell of the right length; the
  car eases off and exposes the tell; respawns shimmer within range; the tell
  is repeatable from seed; the three sounds play and stay silent with the
  switch off.
- `test-arena-event`, `test-arena-ui`, `test-arena-settlement`: pass.
- New browser scenario `tools/scenarios/arena-feel.mjs`: a real fight through
  the UI, captures a tell (2 visible flares) and a respawn (visible halo),
  0 console errors or warnings. `scrapdome` and `scrapdome-review` pass.
- Balance (`tools/arena-balance.mjs --quick`): see decisions.md; no target
  moved materially.

## Changed assertions

- `test-arena-event.mjs` round length: the upper bound was 180.1 s, but the
  rules allow a 3 s countdown, 150 s and up to 30 s of sudden death ending on
  damage (183 s). With tells, Easy seed 1989 now reaches that end; the bound
  is corrected to 183.1 s with the reason in a comment.

## Removed

Nothing.

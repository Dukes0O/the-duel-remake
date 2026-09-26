---
task: EGG-03
status: phase-1-merged
kind: easter-egg
flag: muddy-hollow
player_facing: yes
---

# Muddy Hollow

## Settled design

The six phases and their order are fixed by `docs/MUDDY_HOLLOW.md` and the
active EGG-03 board card. Each phase merges separately. This note starts phase
1 only: deterministic ground geometry on High Country Grand Tour. It does not
add mud or water driving, departure, collectibles, save data, detailed art,
particles, audio, or any menu action.

Phase 1 uses a world-space local frame at the middle of the Alpine Summit
section (`s = 2400 m`). The Hollow sits on the positive-lateral side. Its
valley is about 300 m across and begins beyond the ordinary road shoulder. A
steep ridge separates the race from the bowl. The authored height field names
the valley bowl, main hill, three pits, pond bed and ramp sites required by
the settled design. It blends back to the existing terrain at its boundary.

The normal course is built first. `installMuddyHollow(course)` then attaches a
separate `course.muddyHollow` object. It does not consume `course.rng`, add a
shortcut, or mutate racing samples, gates, route geometry, scenery or feature
arrays. `Course.groundAt` may read the authored height only off road and only
inside the zone. Flag-off construction remains byte-for-byte on the old path.

The zone exists only when the new `muddy-hollow` development switch is on and
the race owner has already found the Wasteland gate. Nothing is added to the
main menu. Because rendered terrain reads `groundAt`, the environment cache
key must distinguish Muddy-on from Muddy-off courses in this phase.

## Tests first

Independent acceptance tests were committed before runtime code. The first
focused run had seven intended failures: the dev switch and installer were
absent, and High Country exposed no gated zone, landforms, containment,
height queries, deterministic result or preservation proof. A second red
commit added discovery and environment-cache isolation; it failed both new
checks before implementation.

The tests cover course and switch isolation, deterministic named geometry, a
continuous boundary, unchanged road/scenery/random state, discovery gating
and distinct render cache keys.

## Changed assertions

- `tools/test-feature-flags.mjs` extends its exact switch catalog from six to
  seven entries and requires `muddy-hollow: dev` to stay off in production.
- `tools/test-wasteland-beta.mjs` extends the same exact catalog map. No old
  switch or state changed.
- `tools/test-render-reuse.mjs` adds a cache-isolation contract because the
  phase-1 ground changes are already consumed by terrain rendering.
- `src/generated-shortcut-presets.js` is regenerated because its freshness
  fingerprint covers `src/course.js`. Fresh-solver verification must prove
  that the 15 stored shortcut layouts and all course features stay exact.

## Evidence

- `node tools/test-muddy-hollow.mjs`: 11/11 phase-1 checks passed. The suite
  checks every named landform through `Course.groundAt`, the ellipse join and
  unchanged road on route seeds 1989, 42 and 17, the real Titan grade limit,
  discovery isolation, and flag-on road-driving parity at 30/60/144 FPS.
- `node tools/test-render-reuse.mjs`: 176 checks passed.
- `node tools/test-feature-flags.mjs`: 22 checks passed.
- `node tools/test-wasteland-beta.mjs`: 3/3 subtests passed.
- `node tools/test-replays.mjs`: 162 fingerprints passed across all 18 cases,
  16 events, three frame rates and three runs.
- `node tools/test-shortcut-presets.mjs --verify-solvers`: 241 checks passed,
  including exact agreement with all 15 freshly solved layouts. The first lane
  gate correctly rejected the stale `course.js` source fingerprint; the
  project generator refreshed it before this verification.
- Independent source review: clean after the boundary test exposed and fixed
  a too-steep blend. The final maximum intended-entry grade is 1.098, below
  the switched Titan limit of 1.65; the reviewed ellipse edge differs from the
  old terrain by at most 0.00245 m across all three route seeds.
- Browser review: passed on a private port with memory-only saves. The switch
  and discovery checks passed, all 10 frames rendered, and the console had no
  errors, warnings, exceptions or failed requests. High and Performance show
  a broad, smooth ridge with a grounded Titan and no crack. The phone frame
  shows the mountain, bowl and pond without terrain-camera clipping. A matched
  flag-off/on overview used identical camera coordinates (maximum difference
  0); it proved that a dark diagonal belongs to the ordinary terrain and is
  absent when the Hollow replaces that area.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 278/278
  suites passed in 419.67 seconds after the generated shortcut fingerprint was
  refreshed.
- `npm run build`: passed with 234 modules. The existing large-chunk warning
  remains; no new warning was introduced.
- Phase 1 merged at `3bba167` after the documentation-final lane rerun passed
  278/278 suites in 425.79 seconds and the build passed again.

## Removed

Nothing in phase 1.

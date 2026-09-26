---
task: EGG-03
status: active-phase-3
kind: easter-egg
flag: muddy-hollow
player_facing: yes
---

# Muddy Hollow

## Settled design

The six phases and their order are fixed by `docs/MUDDY_HOLLOW.md` and the
active EGG-03 board card. Each phase merges separately. The first section
records phase 1: deterministic ground geometry on High Country Grand Tour.
It did not add mud or water driving, departure, collectibles, save data,
detailed art, particles, audio, or any menu action.

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

## Phase 2 settled detail

Phase 2 adds simulation data and driving only. It does not add materials,
particles, audio playback, departure, jumps, collectibles or save fields.
The existing `muddy-hollow` development switch and discovered-gate snapshot
remain the only way to install the zone.

`course.surfaceAt(s, lateral)` keeps its existing road fields and gains two
numbers only inside the installed, off-road Hollow: `mud` from 0 to 1 and
`waterDepth` from 0 to 1 metre. Each of the three authored pit ellipses has a
smooth mud falloff. The authored pond ellipse has a smooth depth falloff to a
one-metre centre. Queries are deterministic and consume no random values.

Driving uses those shared values in the fixed step. Mud lowers traction and
adds drag at any speed. It also exposes a clamped `mudWheelSpin` state derived
from mud, throttle and vehicle speed, so the later renderer can show wheel
spin without changing simulation. Water drag rises with both depth and the
absolute entry speed; reverse uses the same magnitude rule. Crossing from
dry ground into at least 0.05 metre of water emits one
`muddyHollowSplash` event with depth, speed, position and the placeholder cue
`world.muddy-hollow-splash`. Remaining in the pond does not emit every tick;
leaving below the threshold arms the next entry. The separate audio lane will
implement the cue.

Phase-2 tuning must prove these player outcomes on the real Titan: full mud
has less steering authority and loses more speed than dry Hollow grass; deep
water loses more speed than shallow water at the same entry speed; a faster
entry loses more speed than a slower one at the same depth. Flag-off,
undiscovered, road, racing-line, scenery, RNG, replay and 30/60/144 FPS paths
stay exact.

## Phase 2 tests first

Independent acceptance tests were committed before runtime code. The first
focused run passed 12/20 checks and had eight intended failures: the pit and
pond fields and falloffs were absent; mud did not change steering, drag or
wheel spin; water did not add speed-dependent drag; and the splash event and
latch did not exist.

Review then reproduced an airborne Titan receiving mud, pond drag and a splash
five metres over the pond. A second independent red commit passed 20/22 checks
and retained two intended failures: flight still exposed surface state and the
airborne splash consumed the landing edge. Runtime code now treats mud and
water as tyre-contact effects. Flight exposes zero mud, water depth and wheel
spin; landing reads the surface and emits one splash.

No existing assertion was weakened. The phase-2 tests add the settled surface,
driving, event, contact and frame-scheduling contracts. The generated shortcut
preset changed only because its freshness fingerprint covers `src/course.js`;
fresh solver comparison confirms that every stored route remains exact.

## Phase 2 evidence

- `node tools/test-muddy-hollow.mjs`: 22/22 checks passed, including all three
  pits, the pond, smooth falloffs, road/outside/flag-off isolation, real Titan
  steering and drag, reverse water drag, splash payload and latch, airborne
  isolation, grounded landing, and exact 30/60/144 FPS scheduling.
- `node tools/test-replays.mjs`: 162 fingerprints passed across all 18 cases,
  16 events, three frame rates and three runs.
- `node tools/test-offroad-physics.mjs`: 8,788 checks passed.
- `node tools/test-terrain.mjs`: 2,545,523 checks passed.
- `node tools/test-feature-flags.mjs`: 22 checks passed.
- `node tools/test-wasteland-beta.mjs`: 3/3 subtests passed.
- `node tools/test-render-reuse.mjs`: 176 checks passed.
- `node tools/test-shortcut-presets.mjs --verify-solvers`: 241 checks passed,
  including exact agreement with all 15 freshly solved layouts.
- `node tools/test-audio.mjs`: 460 checks passed with actual PCM decoded. The
  first broad gate ran in a restricted process sandbox that blocked FFmpeg and
  therefore reported the expected recordings as unavailable. No audio source,
  fixture or assertion changed; rerunning with decoder access passed.
- Independent source review found and reproduced the airborne-contact defect.
  The independent red regression preceded the narrow grounded-contact fix.
- Independent re-review: clean. The actual airborne repro now keeps contact
  fields at zero and matches dry-flight speed; the first grounded step applies
  pond drag and emits once, and continued contact stays latched.
- This phase adds no rendering or UI. Phase 1 already reviewed the installed
  ground in a memory-only browser; phase 2 is verified through fixed-step
  simulation and ordinary replay controls. Phase 6 owns visual surfaces and
  particles, and the audio lane owns playback for the placeholder splash cue.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 187/187 suites
  passed in 341.33 seconds with audio-decoder access.
- `npm run build`: passed with 234 modules. The existing large-chunk warning
  remains; no new warning was introduced.

## Phase 2 removed

Nothing. Phase 2 adds isolated surface data and fixed-step behavior; it does
not replace an existing path.

## Phase 3 settled detail

Phase 3 adds departure only. It does not add jumps, props, collectibles, save
fields, detailed art, particles, audio playback, a new screen, or a main-menu
action. The installed `muddy-hollow` development switch and discovered-gate
race snapshot remain the only way to construct the zone.

The ridge crossing is a deterministic world-space boundary owned by the
Hollow. It is inside the zone, on the valley side of the authored ridge crest,
and is expressed in the zone's existing local frame. A racing Titan crossing
that boundary on its tyres leaves the race once. Other cars, an on-foot
fighter, an airborne vehicle, the racing line at the same course distance,
flag-off and undiscovered races cannot depart. This is an access guard as well
as a physical outcome: a test that places a non-Titan beyond the crest still
must not enter the playground.

Departure reuses the settled Hidden Road outcome rather than inventing a new
race result. The state becomes `exploring`; impact, tumble, boost, airborne
state and pending fines are cleared; and the app settles the active run once
as abandoned. Banked credits, records, unlocks and saved ghosts stay intact,
while unbanked race earnings and pending fines are discarded through the
existing settlement path. Race clocks, laps, checkpoints, rivals, police,
combat, scoring and finish/deadline outcomes freeze after departure.

Exploration remains fixed-step and drivable over the Hollow and back across
the ridge. Returning to the road does not resume the abandoned race. Static
contacts still resolve, but exploration cannot create a race crash, reward,
record, ticket or result. The existing pause menu is the menu exit; phase 3
adds no feature screen or control. If abandonment cannot be saved, that same
pause panel must say that progress lasts for this session. A crossing takes
priority over a simultaneous race deadline, matching the Hidden Road's
point-of-no-return ordering.

## Phase 3 tests first

Independent acceptance tests were committed before runtime code. The first
focused run passed 23/30 checks and retained seven intended failures: the
finite departure boundary was absent; the crossing did not leave the race or
win a deadline tie; exploration did not freeze race outcomes; fixed-step
schedules did not agree; the real App did not settle an abandoned run; and
the App settlement hook was absent.

Review then produced four more red contracts. A normal discovered race threw
before driving had initialized its previous pose. Diagonal sweeps could cross
outside either end of the finite ridge span, a landing sweep could depart
while its previous pose was airborne, and Pro engine overrev could freeze a
departed Titan. Save Guardian review also proved that denied storage was not
visible in the exploration pause panel. The four-review run passed 31/35
checks before the narrow fixes. Private browser QA found one last startup
case: the menu called the departure check before a course existed. Its red
regression passed 35/36 checks before the course guard.

No existing test was weakened. `tools/scenarios/muddy-hollow.mjs` extends the
existing private, memory-only scenario with non-Titan isolation, Titan
departure, one-time settlement, frozen race outcomes, drivable ridge return,
pause and menu exit.

## Phase 3 evidence

- `node tools/test-muddy-hollow.mjs`: 36/36 checks passed. This includes both
  ends of the swept boundary, a landing sweep, a normal countdown-to-racing
  start, a no-course menu start, Pro overrev exploration with an ordinary
  racing engine-failure control, 30/60/144 FPS agreement, and real App
  settlement and identity guards.
- Hidden Road controls remained green: journey 37/37, departure 7/7 and
  presentation 11/11. The shared abandoned-race and departed-explorer paths
  retain their existing behavior.
- `node tools/test-replays.mjs`: all 162 fingerprints passed across 18 cases,
  16 events, three frame rates and three runs.
- Result and lifecycle controls passed: busted/quit 280 checks, completion
  screen 162 checks, speed presentation 62 checks and App lifecycle 8 checks.
- Save Guardian re-review passed an actual denied-storage departure. Credits
  stayed at 2,400; the abandoned result had no reward or fine; `activeRace`
  cleared in memory; `profileSaved` became false; and the existing pause panel
  showed the session-only warning. Seven historical fixtures passed 247
  checks, backup and QA isolation passed, and the storage model remained
  3.47 MB of 4.00 MB.
- Independent runtime re-review: clean after the normal-start, swept-boundary,
  landing-sweep, Pro overrev and no-course startup fixes. The reviewer repeated
  the 36/36 focused suite, Hidden Road controls and replay fingerprints.
- Private browser QA passed on port 59970 with memory-only saves: 11 images,
  no console warning or error, and no failed request. Flag-off, undiscovered
  and non-Titan isolation passed. The Titan produced one departure and one
  zero-charge abandoned record, cleared the active race, froze the timer and
  result, drove 1.227 m back across the ridge in 13 fixed ticks, paused and
  returned to the menu without another event or result.
- Renderer-readiness checks replaced an invalid stale Falcone capture. The
  final capture proves a ready Titan asset, exact horizontal position and the
  refreshed terrain attitude. It also proves that the Titan body intersects
  the steep departure slope. Phase 3 changes no rendering; the feature stays
  dev-gated, and the active phase-6 acceptance now requires that grounding
  correction before visual completion.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 278/278 suites
  passed in 411.20 seconds with audio-decoder access.
- `npm run build`: passed with 234 modules. The existing large-chunk warning
  remains; no new warning was introduced.

## Phase 3 changed assertions

No existing assertion changed. New focused checks and browser assertions add
the phase-3 contracts. The shared paused-results renderer gains only a
session-only storage warning when an exploration save has failed, as recorded
in `docs/board/decisions.md`.

## Phase 3 removed

Nothing. Phase 3 reuses the existing abandoned-race settlement and pause panel
and adds an isolated departure state; it does not replace an old path.

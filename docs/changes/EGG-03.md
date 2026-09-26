---
task: EGG-03
status: active-phase-5
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

## Phase 4 settled detail

Phase 4 turns the five phase-1 ramp sites into the settled playground set:
one mega jump beside the pond, three dirt kickers across the valley and one
stacked-log ramp. They use the shared deterministic off-road flight and
landing physics. Exploration calls that physics between driving and static
contact resolution. Natural Hollow jumps do not create an arena jump token,
score, record, reward, callout or race event. The race clocks remain frozen.

The rock garden is a fixed, zone-owned group of climbable boulders on the
valley floor. It is queried through the existing support and static-contact
paths without adding the rocks to `course.features`, consuming course random
values or changing the ordinary High Country obstacle buckets. Every intended
garden boulder is within the Titan's installed rock-height limit. A car with
no matching off-road capability still treats the same boulders as solid.

King of the Hill keeps the phase-1 summit and gains one deterministic flag
marker at its top. The marker is presentation data, not a checkpoint or a
collectible: reaching it changes no state and emits no event. Phase 6 will
render this marker with the detailed Hollow scene. Phase 4 adds no menu,
screen, save field, collectible, particle or audio playback.

All phase-4 content exists only when the `muddy-hollow` development switch
and discovered-gate snapshot install the zone. The fixed-step outcomes must
agree under 30, 60 and 144 FPS scheduling, while the flag-off course,
ordinary course fingerprint and random stream remain unchanged.

## Phase 4 tests first

The phase-4 acceptance commit preceded runtime code. Its first focused run
passed 38/42 checks and retained four intended failures: the ramp roles,
rock garden and summit flag were absent; Dirt Kicker 2 did not launch; the
exploration path did not call shared jump physics; and no isolated Hollow
obstacle query existed.

Continuing the same trace after implementation found that Dirt Kicker 3 also
needed lift. The log-ramp trace then exposed a test-path error: the site lies
on a steep local-along descent, while its intended cross-slope approach has
the required crest. The test now follows the authored approach and retains
the original 3.8-metre log-ramp lift. Finally, measured mega-jump trials found
14 metres to be the first tested half-metre lift that carries the 92 mph Titan
into the pond span. These evidence-based changes are recorded in
`docs/board/decisions.md`.

## Phase 4 evidence

- `node tools/test-muddy-hollow.mjs`: 45/45 checks passed. All five named
  sites produce natural off-road flight without a score, record, reward,
  callout, race event or clock change. The mega line is airborne over the
  pond. Public exploration driving clears every ramp without a rejected
  climb-limit tumble, and measured airtime follows the fixed exploration
  clock. Thirty, 60 and 144 FPS scheduling agree exactly.
- Seven fixed, zone-owned rocks remain outside `course.features`; each is
  above the rally rock limit and within the switched Titan limit. The shared
  support query and public exploration step carry the Titan across every
  rock. Bucket-aligned lookup keeps the existing obstacle cache valid, and
  later laps repeat the same support and solid-contact lookup.
- Independent review reproduced and then cleared four defects: raw-distance
  rocks vanished on lap two; the frozen race clock held airtime at one tick;
  ordinary High Country mountain support buried Dirt Kicker 1; and abrupt
  rock support edges stopped real traversal. Review regressions were committed
  red at 42/45 before the narrow fixes. Ordinary mountain support remains
  unchanged outside the installed zone; phase 6 now owns masking its visual
  overlap at authored play sites.
- Final independent source re-review is clean. It repeated the 45/45 focused
  suite, real 30/60/144 scheduling, all five launches, seven rock crawls,
  later-lap support and rally collision, and the related replay, terrain,
  contact, jump, flag and beta-isolation controls.
- The summit flag is fixed to the deterministic King of the Hill centre and
  ground height. It is presentation data only. Flag-off construction exposes
  no Hollow content.
- `node tools/test-offroad-physics.mjs`: 8,788 checks passed.
- `node tools/test-contact-damage.mjs`: 195 checks passed.
- `node tools/test-jump-height.mjs`: 95 checks passed.
- `node tools/test-jump-distance.mjs`: 374 checks passed; the real arena
  control stayed 70.258 m / 1.358 s at 30 and 144 FPS.
- `node tools/test-terrain.mjs`: 2,545,523 checks passed across 16 circuits
  and four seeds.
- Feature-switch checks passed 22 assertions; Wasteland beta isolation passed
  all three subtests; all 162 replay fingerprints passed across 18 cases,
  16 events, three frame rates and three runs.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 187/187 suites
  passed in 311.77 seconds on the reviewed phase-4 candidate.
- `npm run build`: passed with 234 modules. The existing large-chunk warning
  remains; no new warning was introduced.

## Phase 4 changed assertions

No pre-existing assertion was weakened. The new ramp trace originally assumed
one local-along approach for every site. Actual height samples proved that this
was not the authored log-ramp line, so the new trace now reads each site's
deterministic approach vector. It still requires real flight and now reports
the nearest normalized pond radius when the mega-jump requirement fails.
Independent review supplemented that geometry trace with public
`duel.step` driving, bounded steering input, climb-limit instrumentation,
fixed exploration airtime and frozen outcome checks. The rock crawl stops
after clearing each target footprint so a later site cannot be misattributed
to the rock under test.

## Phase 4 removed

Nothing. Phase 4 extends the isolated Hollow zone and reuses shared flight,
rock support and static-contact paths. It does not replace ordinary course
features or introduce generated output.

## Phase 5 settled detail

Phase 5 adds the five fixed gold hubcaps, per-player Hollow progress, the gold
Titan paint reward and the settled five-race garage tip. It adds no main-menu
action, Hollow return entry, separate wallet, race reward, score, record,
particle, audio playback or detailed scene art. Phase 6 owns the visible
collectible models and final environment presentation.

The version-1 Wasteland save gains one additive `muddyHollow` object with a
boolean discovery marker, the unique allow-listed hubcap IDs and a High Country
Titan finish count clamped from zero to five. Unknown data remains intact. The
startup migration gate must make and verify a backup before an older save is
normalized to this shape.

The authored hubcaps sit at the King of the Hill summit, pond centre, mega-jump
landing, one mud pit and behind the log ramp. Only the current player's Titan
in departed exploration can collect them. A swept contact emits each ID once.
The App rechecks the current run and player before saving it. Existing found
IDs enter the race snapshot and cannot emit again. Collection changes no race
clock, score, record, wallet or result.

All five validated IDs derive ownership of a reward-only `titan_gold` finish.
It is hidden before it is earned, applies only to the Titan, costs nothing and
is not selected automatically. The existing appearance snapshot applies it to
a later race without changing vehicle statistics or record identity.

The garage hint count advances once for a completed High Country Titan result
whose race snapshot had both gate discovery and the `muddy-hollow` switch. It
does not count an abandoned or duplicate result, another car or course,
practice, flag-off or undiscovered play. At five, the settled tip appears only
on the Titan page and disappears after the guarded departure marks the Hollow
discovered.

## Phase 5 tests first

The phase-5 acceptance commit preceded runtime code. Its first focused run
passed 44/50 Muddy Hollow checks and retained six intended failures for the
five authored pickups and their swept contact, per-player persistence, the
derived Titan finish and the five-race garage hint. The Wasteland profile
suite passed 4/6 because the additive save field was absent. Paint acceptance
failed on the missing reward catalog entry, and backup acceptance rejected the
missing migration guard.

Independent runtime review then proved that the first implementation exposed
an earned gold finish when the development switch was later turned off. The
review also found that the abandonment comparison removed the whole new save
object instead of ignoring only its expected discovery change. The narrow fix
keeps the legitimate selection in the save, hides it from every inactive
garage and race path, rejects non-Titan and opaque future-schema entitlements,
and compares all other Hollow progress during abandonment.

No old test was weakened. The exact catalog count changes from three ordinary
finishes to three ordinary finishes plus one gated reward. The version-1
Wasteland shape gains its settled additive object. Existing abandonment tests
ignore only the `muddyHollow.discovered` field that the valid departure now
changes; hubcaps, finish count and unknown nested data remain under comparison.

## Phase 5 evidence

- `node tools/test-muddy-hollow.mjs`: 50/50 checks passed. The suite covers all
  five fixed sites, swept one-time contact, frozen outcomes, player isolation,
  reload, flag-off garage and race hiding, enabled Titan restoration,
  non-Titan isolation and the bounded Titan-only hint.
- `node tools/test-paint-presets.mjs`: 104 immutable-state, purchase,
  normalization and appearance-only checks passed. A valid selected reward
  survives JSON normalization while inactive, but it is visible only for an
  enabled version-1 gate owner with all five allow-listed IDs. Forged and
  future-schema rewards fail closed.
- Wasteland profile passed 6/6 subtests; career backup passed all seven
  historical fixtures; Paint App integration passed 35 checks; progression
  integration passed 146 assertions; all 162 replay fingerprints passed.
- Save Guardian review was clean on the implemented save contract. It checked
  migration, verified backup, malformed and future data, named-player and
  cross-tab isolation, denied storage, duplicate settlement, entitlement and
  the storage budgets. The largest ghost journal remained 2,500,604 bytes of
  the 4,000,000-byte limit.
- Independent runtime re-review was clean after the switch fix. It repeated
  the 50/50 Hollow suite, 104 paint checks, 35 Paint App checks, profile,
  backup and replay controls. Follow-up tests also protect Wasteland-visit and
  Scrapdome snapshots and prove that departure preserves a non-zero hint count
  and unknown nested data.
- Private browser QA passed on port 52471 with memory-only saves, no console
  errors or warnings and no failed requests. Five eligible finishes counted
  exactly from one to five; the settled tip was Titan-only and retired on
  discovery; all five hubcaps persisted in authored order. A flag-off reload
  hid the progress UI and selected reward in the garage and race without
  deleting them. Re-enabling restored the IDs and gold Titan. Another car and
  another named player remained isolated. The six captures distinguish the
  gold Titan, factory Titan and factory Falcone; the QA overlay and a stale
  loading label are evidence-only limits and do not cover the measured car.
- `npm run build`: passed with 234 modules. The existing large-chunk warning
  remains; no new warning was introduced.

## Phase 5 changed assertions

- `tools/test-wasteland-profile.mjs` extends the exact version-1 Wasteland
  shape with `muddyHollow`; it does not remove or rename an old field.
- `tools/test-paint-presets.mjs` extends the exact paint catalog from three to
  four entries. The fourth is reward-only and stays absent from ordinary and
  flag-off catalogs.
- Phase-3 abandonment comparisons now exclude only the expected discovery
  marker change and continue to compare every other nested Hollow field.

## Phase 5 removed

Nothing. Phase 5 adds bounded progress and a gated appearance reward. It does
not replace an old save field, reward path or menu entry.

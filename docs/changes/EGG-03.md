# EGG-03: gate arrival and invitation

## Independent core acceptance tests before implementation

Base: `16cfd59`. The initial core handoff is red: journey **1/37 passes** and
departure **1/7 passes**. Existing before-departure driving and active-race
controls pass. Missing journey state, choices and departure behavior account
for the failures; the simultaneous deadline case currently produces a race
result instead of exploration. Both suites finish in about two seconds combined.
No production source or saved race fingerprint was changed for this handoff.

Agreed public contract: `Duel.chooseHiddenRoad(choice)` queues a valid choice
for the next simulation step. The journey owns id, phase, elapsedSec,
phaseElapsedSec, progress, gateOpen, departed, controlsLocked and choiceReady.
Its phases are racing, exploring, arriving, opening, choice, entering, arrived
and turned-back. Departure uses status exploring and emits hiddenRoadDeparted
with journeyId. Phase, choice and arrival events carry the same identity.
App delegates choices and guards `_settleHiddenRoadDeparture(event, state)`
against stale state, journey, run and player identity before ordinary abandoned
settlement. No discovery schema or career unlock is authorized here.

Coverage includes physical 150 metre departure, the return window, ordinary
coordinate control, simultaneous deadline priority, frozen outcomes with real
movement, resolve-only wash contacts, paused/invalid/duplicate choices, smooth
stop and full gate passage for all nine cars on routes A/B/C, and common-time
30/60/144 Hz scheduling. A focused Pro limiter case preserves ordinary engine
failure while preventing departed exploration from freezing at overrev.

The wall contact fixture uses the actual approved asset planes: 420 metre
span, nine by seven metre opening, conservative facade front -1.575 metres,
back 5.5 metres, panel front -0.845 metres and lift 7.25 metres. The side-wall
bound deliberately includes the foremost jamb plane; irregular salvage clutter
is not claimed as exact triangle collision. Swept side-wall/closed-panel
controls and fully raised Titan passage retain the original course obstacles.

Synthetic App fixtures use only process-local memory storage. They seed a
valid saved best, leaderboard entry and ghost through existing production
APIs, then check credits, records, unlocks and saved ghost content survive.
Pending fines and unbanked earnings are abandoned exactly once. Duplicate,
stale and wrong-player callbacks, pause, menu, restart and both choices are
covered. Restart's existing ghost last-used timestamp is excluded only from
cross-restart content comparison; saved sample data is retained.

One existing assertion in `test-hidden-road.mjs` is explicitly superseded by
SPEC 0.2: whole-spur status can no longer stay racing. It now requires racing
before 150 metres and exploring afterward. All geometry, return, gate,
ordinary replay and shared-time assertions remain unchanged. The new collision
fixture endpoint was corrected from 8 to 12 metres before handoff, because a
Titan rear bumper cannot clear the 5.5 metre backplane from an 8 metre centre.
Its full-clearance assertion was retained. Headless App disposal has a no-op
animation cancellation stub because no browser animation loop runs.

Presentation/audio acceptance follows as a separate red handoff. No lane or
build gate has been run yet; this note makes no integration or release claim.

## Independent presentation and audio red handoff

`tools/test-hidden-road-presentation.mjs` has **0/10 groups passing** before
implementation (0.20 seconds). All failures identify the absent agreed selector,
DOM wrapper or audio update method. Core red tests were committed separately
as `b74d51f` so simulation work could proceed while this bounded suite was built.

The DOM-free `hiddenRoadPresentation(state, course)` contract returns active,
phase, hudOpacity, controlsLocked, choiceReady, gateOpen, camera, sparks and
arrivalReady. Repeated or rewound frozen snapshots must produce the same view;
rendering cannot advance the simulation. Gate fraction follows state, the low
camera uses finite world-space coordinates, sparks have a maximum of 64
presentation particles, and pause hides sparks and disables choice input while
holding the gate/camera. Turn back allows an agreed 0.8 second camera return
blend, then restores the normal camera. This is a presentation transition,
not another journey or gameplay timer.

`createHiddenRoadUi({host,onChoose,onMenu})` is checked with a small semantic
DOM fixture for clear Enter/Turn back/Return to menu buttons, eligible callback
dispatch, focus restoration and listener/container disposal. Actual renderer
panel linkage, cinematic readability and sound quality still require the
planned private browser/audio scenario; these headless checks do not claim it.

`EngineAudio({hiddenRoadVoiceFactory})` accepts an injected local voice factory
for bounded ownership checks. `updateHiddenRoad(state)` deduplicates simulation
cues, preserves state and cancels its voices once on pause, mute, menu or a new
journey. Resume may play current cues but cannot replay a queue of missed beats.
The production default remains local Web Audio and requires normal audio unlock.
No new dependency, browser storage or network access was used.
# Runtime implementation and focused checks

The headless journey now owns departure, exploration, arrival, opening, the
queued choice and passage. Only an actual player position in the Hidden Road
corridor at or beyond 150 m departs. The same race coordinate on the asphalt
does not. Within the pre-departure spur, motion checks departure before race
clocks and deadline settlement; ordinary and flag-off race order is unchanged.
After departure, the dedicated exploring status skips race clocks, opponents,
combat, police, checkpoints and results while retaining car controls.

App reuses the existing abandoned-result settlement. Current state, journey,
run and player ownership checks reject stale callbacks. The existing settled
result key and the current journey guard prevent duplicate settlement. Prior
credits, records, ghosts and unlocks stay intact; unbanked earnings and pending
fines are discarded. No profile schema, storage key or discovery flag is added.

Within 60 physical metres of the gate, a simulation-time trajectory aligns and
stops the car 12 m outside it. A three-second lift precedes the invitation.
Enter queues a simulation choice, rolls through the clear opening over three
seconds and stops 12 m inside. Turn back restores driving outside without
reopening the abandoned race. The arrived state holds safely for later yard
and discovery integration. Pause freezes the journey; phase locks, choices and
navigation clear driving input. Renderer or audio callbacks do not advance it.

The Director authorized two narrow extra hooks. The driving hook prevents the
Pro overrev branch from returning forever after its terminal crash has become
ineligible during exploration; existing speed and gear limits remain. The
contact hook resolves departed-player scenery contacts without damage,
destruction or race earnings. Prepared analytic Rustwall piers, header and
moving panel also stop side approaches that miss the gate takeover. Constants
match the 420 by 35 m structural envelope, 9 by 7 m opening and 7.25 m lift.
The front wall plane conservatively includes the jambs at local Z -1.575 m;
the structural back is 5.5 m. The panel spans Z -0.845 to -0.09 m. This is a
structural approximation, not exact collision for every decorative scrap.
The headless collision contract has no Three dependency and never changes
course obstacles or consumes the simulation random generator.

Initial focused results: **37/37 journey checks** and **7/7 synthetic-memory
departure checks** pass. They include all nine cars on routes A/B/C, closed
and open swept contacts, the crossing/deadline edge, sustained Pro overrev,
both choices, pause/navigation, saved-content preservation and identical
common-time states under 30/60/144 Hz presentation schedules. No independent
assertion was changed by the runtime builder. Independent source/Save Guardian
review, presentation checks, browser/audio evidence and final gates remain.

## Independent runtime and Save Guardian review

Reviewed runtime commit `5776623826f25cea5f72a02ed98fa0523fcb689c` under the
repository's reviewer and Save Guardian role instructions. No concrete defect
was found in the completed journey, App settlement, contact or Pro limiter
changes. This review precedes the separate presentation/audio handoff.

The App settlement guard checks current state identity, exploring status,
departed journey identity, run ownership and current player before invoking
existing abandoned-race settlement. The existing settlement key and journey
object guard prevent repeat awards or charges. Race clocks and outcomes stop
at departure; physical driving remains in simulation steps. The early drive
used for deadline priority is restricted to an actual spur position, preserving
ordinary and flag-off call order. Choices are queued, and navigation retires
the journey and held controls. The limiter exception only applies to departed
exploration and leaves normal speed/gear calculations in place.

Swept contacts retain vehicle dimensions and vertical clearance. Reviewed wall,
header and panel bounds against `tools/blender/rustwall.py`: the actual structural
body is 420 by 35 metres, header starts at seven metres, and panel lift is 7.25
metres. The facade depth is deliberately conservative, as described above.
Prepared colliders are local to the journey and do not alter course obstacles.
Collision response suppresses race damage/reward effects after departure.

The following existing suites each ran once against this runtime, using only
synthetic memory fixtures:

- `test-save-fixtures.mjs`: seven historical shapes and 247 first-load and
  round-trip checks passed (0.15 seconds).
- `test-career-backup.mjs`: seven historical fixtures, migration gate, damaged
  input validation, recovery and quota rollback passed (0.16 seconds).
- `test-career-archives.mjs`: historical records/ghost samples and storage
  failure preservation passed (0.15 seconds).
- `test-career-budget.mjs`: 64 full players, maximum ghost journal,
  restart/export/import and rollback checks passed (1.09 seconds).
- `test-storage-budget.mjs`: active-data model stayed within the 4,000,000-byte
  budget after the existing archive move (0.45 seconds).

No save schema, storage key, dependency or network behavior changed. The
existing migration backup path is unchanged and its gate passed. No historical
fixture or fingerprint was rewritten. The builder reports journey 37/37 and
departure 7/7 passing without assertion changes; this review did not repeat
those suites without a concrete reproduction need. Combined presentation,
browser/audio review and the final lane/build gate remain outstanding.
## Combined presentation review and physical spur camera regression

The independent review of `0d54300` found two presentation defects: the fade
selector named an absent weapon-HUD id instead of its actual class, and the
inactive dialog rewrote its title/copy every frame. A tiny read-only semantic
host probe counted 20 text writes for ten identical inactive snapshots.
Revision `a7f6aac` fixes both with `.weapon-hud` and change-guarded DOM writes;
the opacity custom property is also updated only when changed. The actual
legacy-combat capture verifies the corrected fade.

The revised gate cinematic camera reads the car's physical world position.
Its centered follow and final orbit clear the structural opening and Titan:
the orbit crosses the wall backplane at about x=0.97 metres, within the
4.5 metre half-opening, and the Titan rear extent at about x=2.49 metres,
outside its 1.4 metre half-width. The low camera stays below the seven metre
header. Renderer and UI still read simulation state only. Gate spark resources
remain graph-owned and bounded; original audio voices cancel on pause, mute,
menu and new journey. Cinematic bus ducking resets on normal/menu snapshots.
Pause silences the master and cancels voices while retaining the cinematic bus
target for resume. No heavy check ran during either recording window.

The later **settled legacy image exposed a production defect** outside that
cinematic path. After the 149.9 metre departure fixture and 1.4 seconds of
simulation, the normal driving camera remained underground/inside scenery even
after 600 ms of rendered settling. This supersedes the initial stale-fixture
assumption. Normal chase/back/aim positions still used main-road coordinates,
and a main-road tunnel constraint could pull the remote spur camera into its
unrelated tunnel. Preserve the original failed image as evidence.

The Director authorized a narrow `hiddenRoadDrivingCamera(state, course, mode)`
helper and renderer hook. The new independent acceptance group is red:
**presentation 10/11 passes**, with only the missing helper failing (0.18
seconds). It checks actual 100/150 metre poses on A/B/C, before and after
departure, all seven existing camera modes, actual car heading plus slip,
local ground support and clearance against real wash-bank geometry. The mode
must keep its intended side while safely shortening a view that would enter a
bank. Repeated frozen snapshots are identical. Menu, ordinary racing-lane and
flag-off controls return null so their existing camera path is retained.
No existing assertion was weakened. This is one bounded regression group,
not a new render or balance matrix. The source fix and subsequent actual
browser verification remain pending.
## Final bounded source review

Reviewed `7ad8a32` and the final narrow production correction `bc60aa4`.
Production source tree: `aaeb4ee4dec3868a1333aca4290dab1775be6aeb`.
The physical-spur helper uses actual world position, heading/slip and ground
support before or after departure. Its bank margin shortens unsafe side views.
Menu, flag-off and returned-to-main-road cases retain the existing camera path.
The renderer skips unrelated tunnel constraints only for the physical spur or
cinematic view. The immutable gate pose is cached by road identity in a WeakMap;
HUD-only selection avoids building unused cameras and spark arrays. Neither
path mutates course or race state.

The first renderer hook still suppressed the physical base throughout a
cinematic. A 0.18 second geometry probe exposed the transition mismatch:
route A arrival at age 0.01 had a camera distance of 17.84 metres versus the
physical base's 8.70 metres, and Turn back at age 0.79 had 18.24 versus 8.70.
`bc60aa4` retains the physical base for every partial blend, then omits its work
only when the cinematic fully replaces it. This closes that source finding.
The builder's actual final capture reports a 0.004 metre Turn-back boundary
movement; its visual acceptance remains the Director's decision.

The performance-fixture hook is gated by `__DUEL_QA__`, defined true only in
`tools/vite-qa.config.js`; normal configuration does not create the window hook
or take the skip branch. Both corrected comparison conditions execute the
same App frame and ordinary HUD work. Only gate UI updating and spark update/
draw are removed from the disabled condition. The fixture restores the QA
switch, renderer method, gate updater, RAF function and saved state in finally.
A small failed-setup cleanup issue was reported: missing-hook validation must
precede installing the renderer wrapper. The builder is moving that check;
it does not change the measured loop or production source.

No further production defect was found in this bounded review. The camera
regression is the only additional assertion group; no previous assertion or
fingerprint was weakened. Journey, App settlement, contact and driving files
remain unchanged since `5776623`, so the recorded runtime and Save Guardian
review still applies. No heavy check or build ran during the capture windows.
Final lane/build gates remain on hold until the Director accepts the retained
visual, motion, audio and corrected cost evidence.

## Presentation builder handoff

The presentation consumes simulation-owned journey clocks, gate fraction and
choice readiness. It adds the original drum/chain/latch cues, a bounded
24-point spark pool, faded race/combat HUD, keyboard-focus-safe choices, camera
arrival/inside travel and menu cleanup. Renderer, UI and audio do not advance
the journey or settle race results. Arrival holds safely inside with only the
approved return-to-menu action. Normal driving audio is unchanged outside the
cinematic vehicle-bus duck.

Focused checks: presentation **11/11**, existing audio **459 checks**, and
Rustwall scene **18/18** passed during this slice. No existing assertion was
changed. The independent additional camera group first failed at 10/11, then
passed after the physical spur fix. No fingerprint, save, dependency, model or
live-server change was made. The final fixture setup cleanup is now complete:
missing-hook validation precedes renderer wrapping (`d9b5342`).

Retained evidence is under `docs/board/looks/hidden-road-arrival/`:

- Round 1: ten actual images, actual PCM, cue/event logs, spectrogram/loudness
  plots and browser report. Private port 24178, zero warnings/errors.
- Round 2: eleven images and refined actual PCM/plots; private port 28790,
  zero warnings/errors. Desktop/phone framing, inside camera, sparks, sound
  duck and both review fixes are visible. Initial missing-video and failed
  legacy camera evidence remain in the round, with explicit provenance.
- Round 3: actual corrected wash camera, continuous canvas-only gate/Enter
  WebM and time-labeled frame strip. Private port 10785, zero warnings/errors.
  The original cost baseline is retained but invalid for gate-specific
  attribution because it excluded ordinary HUD work.
- `round-3/final-correction`: one fair gate-only stationary pair per quality
  plus actual arrival/Turn-back transition views on `bc60aa4`. Private port
  49199, four images, zero warnings/errors. Normal HUD runs in both conditions;
  only the gate UI update and spark presentation are disabled in the baseline.

Corrected total CPU p95 is High 2.6→2.5 ms and Performance 1.6→1.7 ms (+6.25%).
RAF p95 is 18.2→18.1 and 18.3→18.2 ms. Each pair adds one draw with unchanged
triangles. Performance render-call CPU alone is 1.1→1.3 ms (+18.2%), retained
as a limitation rather than claiming every metric passed. Each sample has
120 ordered frames after 12 warm-up frames. This is CPU submission evidence,
not GPU timing or a whole-course performance matrix. The measured Turn-back
camera movement across its blend boundary is 0.00399 m.

Audio peaks are -12.47/-13.34 dBFS without clipping. Gate RMS exceeds the
ducked vehicle bus in these sequences. R2 measures the actual vehicle bus
(engine plus tire/accent layers), while R1's engine-only stem was before that
bus; they are not directly comparable. R3 reuses unchanged R2 audio source
and evidence. There is no subjective listening or whole-race sound claim.

Contact sheets exist for all rounds; each round's provenance names source
commits, capture corrections and limits. The Director owns independent scores,
acceptance and final lane/build/integration gates. No further optional capture
or testing is planned by the presentation builder.

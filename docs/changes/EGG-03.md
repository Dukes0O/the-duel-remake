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
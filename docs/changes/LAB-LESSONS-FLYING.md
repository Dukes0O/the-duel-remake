# LAB-LESSONS-FLYING

Branch: `codex/lab-lessons-flying`. Switch: `lab-2`, dev.

## Round 2 design (Claude's round-1 verdict)

Claude approved the teaching logic, numbers and assertions. Round 2 changes
the pictures: low close cameras, bright parcels with persistent thick trails,
large colour-matched weights, countable air dots and at most three captions
anchored beside their objects. The drop and string lengths use one tenth
of the real dimensions; clocks and all printed values keep the real units.
Each machine has a scale plate. Brian explains the scale once per visit.
The shared challenge card moves to bottom left above the instruments; browser
captures wait for the renderer's world readiness and check button clearance.
The sheet has four large Watch captures with small supporting strips.
Current integration is merged first (generated STATUS conflict only).
Checks: focused drawing/unchanged teaching tests, memory-only browser flow,
lane tier with jobs 4, build and independent review. No frame timing.

Round-2 assertion change: the exact parcel endpoint drawing multiplier changes
from `.065` to `.1`, because Claude requires a one-tenth model. This keeps an
exact equality and does not change or loosen the physics, aim or timing checks.
The new ninth test verifies one-tenth lengths, visible arm/parcel/height labels
at 10/30/60 m, readable balls/air dots, matched bob colours and three anchors.
The browser's prediction check now checks the three captions individually,
because the model's scale plate must remain visible. Challenge capture adds
world readiness and button-overlap checks. No game rules or save code changed.

Independent review found and confirmed fixes for a clipped drop control,
concurrent introduction/Wonder prose, and repeated DOM style writes. The
introduction now replaces Wonder prose briefly and restores it before Continue;
it is marked shown only after an actual Wonder display. Nine focused tests pass.

## Round 2 verification

The complete memory-only browser flow passed on private port 18402: 65 captures,
zero warnings and zero errors. It checks exactly one scale introduction,
caption-free prediction cards, all machine inputs, final experiment key cards,
fully presented challenge worlds and no card/button overlap. The later Fire
plate and Pendulum label/cable-camera adjustments passed their targeted refresh
on private port 26665: 34 captures, zero warnings and zero errors. The full-flow
receipt is preserved separately from the refresh receipt. Each browser visit
checks one introduction. All 65 current full-size views remain for Claude.
The final sheet is 493,490 bytes, with four large Watch views and small strips.
Claude's round-2 look verdict remains pending.

The first capture exposed picture cards over the low flag handle; choosing the
prediction first fixes the real input sequence. The Fire camera was lowered
and widened so the pit and bucket remain above the panel. Code review approved
the final drawing fixes. A queued capture was stopped when it and the gate
claimed the same slot; only this lane's later job was stopped.

A browser build then emptied `.qa-dist` while `test-medals` was using a fixture
there. The missing-file failure is a scratch collision, not a changed assertion.
The capture refresh uses the harness's existing isolated QA-bundle API.
The required lane command with jobs 4 finished with 26 passed, one scratch
failure and eight not run. The nine-suite continuation passed all nine in
137.08 s: only medals and those eight suites ran. All 35 selected suites are
covered and green; no passing suite was repeated. `npm run build` passed in
926 ms after the full tier in `codex/go-live-evening` finished. It reports the
existing mixed-import and large-chunk advisories. Commands used PowerShell
with System32 first on PATH. No frame timing was run.
The medals retry passed. Replay fingerprints remain 225 checks across 25 cases,
23 events, nine categories, three FPS values and three runs. World composition
passed all 47 immutable-feature and complete-scene checks across twenty events;
no signature was regenerated. Runtime assets are unchanged.

## Design settled before code

Four discovered lesson packets replace the four Lab 2 bench panels. The
shared frame keeps navigation, notebook and the existing flying challenges;
no room, Brian, save, reward or flight rule changes are needed. Lab 2 off
keeps the existing benches until the switch goes live, as LAB.md 12 says.
Each lesson reuses its current machine model, with teaching marks and
particles drawn over it. Machine parts and named keyboard buttons accept
the same actions. Prediction pictures hide the teaching captions.

Projectile motion first compares two compact parcels without air (the
existing stone model), then explains that the game's water slows in air.
The water try and its flag use `projectileBench.run`, not a second fall
formula. Fall marks are rounded from `stoneFallAfter`, not hard-coded 5/20/45.
Pendulums time the existing string model and name its small-swing limit;
the car example also reads the actual cable model. Altitude compares the
stand's own lift in kg against the chosen load; its 71% explanation is
computed from the summit bench result. Fire uses the pit's triangle rules
and the game's seeded spread for the cleared and retardant strips. The
retardant demonstration needs a small extension to this corner's fire bench
helper; it does not change the old bench's results or challenge.

Sound: existing `lab.tick` teaching navigation and `lab.clunk` machine controls;
existing splash/burner cues remain with the existing challenges. No voice
recording, model generation or frame timing.

## Checks planned

- Pure checks: every offered prediction against its challenge bench, all
  teaching stages, correct check replay, useful failure hints and model poses.
- Memory-only Lab browser flow through all four lessons, real machine
  inputs, help, checks and the unchanged flight challenge handoff; round-1 sheet.
- Lane tier with jobs 4, build, one independent code review.

## Changed assertions

No existing test assertions or tolerances change. The eight new focused tests
cover all 81 flag positions at every offered height and trolley speed, each
fire tool against the pit, all length/weight pairs, and each altitude/load.
The new flag test was tightened from the challenge's 12 m buoy ring to the
flag handle's nearest-metre precision (0.5 m); the flight challenge is unchanged.
The new hint test deliberately selects Faster for the default 15 m string;
its first draft accidentally selected the correct Same picture and was fixed.
The new arrow-ratio check allows only floating-point rounding (1e-12) after
converting the internal forces to newtons; the displayed kg remain exact
copies of the bench results. No existing assertion is loosened.

The eighth test allows exactly the card's three Flying JPG sheet paths and
rejects a fourth round, PNG, raw suffix and another folder. The placement
checker gains one strict path registration; its old raw-capture and size
rules stay intact. Independent review approved this addition.

## Implementation and review

The projectile helper adds a trace of a real `stepBucket` parcel; the draw
never invents its own water trajectory. The altitude helper adds the flight
HUD's free-air lift at each named altitude, leaving the old ground stand
result intact. The fire helper optionally
returns its seeded spread poses and models treated plants with the existing
retardant threshold; old callers keep the same result shape.

Independent review approved after fixes to Wonder mode and buoy placement,
water time scaling and splash, heavy short/long weights and their periods,
the 60 m three-second gravity example, cached bench results and guarded DOM
writes. Kestrel and Dusthawk are the existing runtime models. Async model
loads, borrowed room assets and owned resources were reviewed for disposal.
No shared room, Brian, switch, reward, save or challenge files changed.

Final drawing alignment uses the existing recipes' scaled pivots: the
drop carriage releases the parcel at its actual arm, and hit targets cover
the machine handles and tools. The altitude stand shows borrowed weights;
its thick arrows share one scale, start on the rotor and stay above the floor.
The car's cable period reads the Dusthawk mass from the existing load rules.

Browser checks found and fixed a blocked fire-pit view, the altitude trials'
starting-site mismatch, and missing-input reads at the final key-idea card.
The seventh regression test covers the empty drawing at that card. Sand
now covers the fire visibly rather than borrowing the lid animation; the
lid question replays the actual lid. Final review approved these fixes.
The QA recipe enables the existing Rescue and Summit switches because the
unchanged altitude challenge requires Summit as a helicopter destination.

## Round 1 verification

The memory-only browser scenario passed all four complete lesson flows on
private port 34006: 61 captures, zero warnings and zero errors. It uses real
walking and machine inputs, wrong-answer replay, help and the existing flight
challenge handoff. No player saves were read or written. No frame timing.

Round 1: `docs/board/looks/lab-2/lab-lessons-flying-1.jpg` (464,300 bytes).
Claude's look verdict is pending; the sheet does not claim art acceptance.

The required lane command first passed 30 suites, then stopped at the
card-prescribed sheet filename: one failed, four not run. After the strict
registration, only the affected tests and the four unrun suites continued.
The passing game suites were not repeated. Replay fingerprints remain
225 checks across 25 cases, 23 events, nine categories and three FPS values.
The seven-suite continuation passed: the eight focused tests, both hygiene
suites, review evidence, test runner, Warlord art and world composition.
All 35 selected lane suites are now covered and green, with jobs 4.
`npm run build` passed (1.11 s). Vite reports the existing game.js mixed
static/dynamic import and large-chunk advisories. All commands used PowerShell
with `C:\Windows\System32` first on PATH and respected the two-heavy-job cap.

Cockpit task `pers-the-duel:T-061` now names this board card; the protected
board sync sets its status. The session status snapshot is included.

## Removed

Round 2 removes the distant camera helper and the floating corner-list layout.
Readable teaching cords/bobs replace the tiny bob drawing path; the shared
runtime machine assets stay available to the original benches with Lab 2 off.
Reviewed round-1 raw captures and the stopped QA profile were recycled.
Round-2 QA scratch, gate/build logs and generated production output were
recycled after their results were recorded. The final 65 full-size captures
and both passing browser receipts remain only for Claude's pending look review.

The old Lab 2 panel route for these four lessons is replaced by automatic
packet discovery. The old panels remain only with Lab 2 off until go-live.
No models, runtime binaries or shared room code were replaced. Teaching
resources are disposed when leaving a lesson. Browser build scratch and
failed-route captures are sent to the Recycle Bin; the final captures remain
only until Claude's pending review.

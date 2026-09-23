---
task: RFX-03
status: integrated
kind: simulation-refactor
flag: none
player_facing: no
---

## Scope

`state.opponents[]` now owns the CPU cars. `state.rival` remains a live alias
for the first car so old race code and tests keep working. Campaign entry can
create zero to three CPU cars. The normal one-rival path retains its exact
replay results.

The fixed-step simulation now advances every opponent, checks player, CPU and
traffic contacts, plans routes with separate actor state, avoids other CPU
cars during lane changes, and keeps police and safe resets clear of the whole
field. The renderer creates and retires one model per CPU car. The HUD, route
map and result screen show field size and player rank. For timed objectives
and pursuits, the HUD keeps the deadline and event goal prominent while rank
remains visible.

## Verification

The new `tools/test-opponents.mjs` checks three CPU cars on all 16 course
definitions. Practice has no finish line and spawns no rivals. On every
finishable course, a scripted driver runs the real fixed-step simulation
through both laps with three live CPU cars and reaches a ranked result. The
Titan stunt event uses ordinary steering, throttle and braking inputs aimed
at its crushable props. The other events use the existing App autopilot. The
test extends objective event clocks solely to isolate lap completion and
field ranking from objective tuning. It also checks three physical opponent
contacts, finite poses after impact, field HUD/map/results, objective deadline
priority and the three-car spawn cap.

| Check | Result |
| --- | --- |
| `node tools/test-opponents.mjs` | 213 checks passed across 16 courses |
| `node tools/test-replays.mjs` | 162 pinned one-opponent fingerprints unchanged |
| `node tools/run-tests.mjs --tier lane --changed --jobs 8` | 174 suites passed, 0 failed, 0 not run in 316.40 s |
| `node tools/run-tests.mjs --tier full --jobs 10` | 174 suites passed, 0 failed, 0 not run in 290.46 s |
| `npm run build` | Passed; 173 modules transformed. Existing large-chunk advisory remains. |
| `node tools/browser-harness.mjs smoke` | High and Performance menu/race passed; four screenshots, zero warnings or errors; private port 16468 |
| `node tools/browser-harness.mjs scenario opponents` | Four visible car models, rank 04/04, map announces three opponents; one screenshot, zero warnings or errors; private port 50599 |
| `git diff --check` | Passed |

Focused screenshot: `.qa-dist/browser-output/opponents-2026-09-23T18-34-16-710Z/three-opponent-field.png`.
Smoke report: `.qa-dist/browser-output/smoke-2026-09-23T18-33-49-411Z/report.json`.
Both browser checks use a throwaway Chrome profile and memory-only saves. The
live checkout, live save store and port 5174 were untouched.

## Boundaries

This card builds the field list needed for later combat and arena modes.
Combat scene presentation still attaches its shield and rig effects to the
first rival. RFX-04 will extend combat weapons and effects across the list.
The normal menu still starts a one-rival race; larger fields are available to
the upcoming modes and to QA entry. No save format or player records changed.

## Exact integration

The reviewed commits merged as `66b3cb9` and `5d00eeb`. The combined branch,
which also contains the crowded-checkpoint follow-up and new diagnostic tools,
passed the 168-suite merge tier in 215.04 seconds with zero failures. All 162
replay fingerprints remain unchanged. The production build, private High and
Performance smoke, three-opponent scene and six narrow-dialog checks passed
with zero browser warnings or errors. The live release still needs its full
check on the final commit.

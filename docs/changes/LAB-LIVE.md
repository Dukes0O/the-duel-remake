# LAB-LIVE

Task: LAB-LIVE. Kind: release preparation. Flags: lab and lab-tuning on.

Claude (Release Manager) decided Story release 2 goes live; Kyle explicitly
requests these two switches on. No other runtime change. Commit on the lane
only; no merge, push or live installation.

Design settled before code: use the existing headed eight-car frame-pacing
countdown recipe at Harbour Lights (busy night grid). An opt-in
LAB_FAN_FRAMES_ONLY=1 selects the Speirling for all eight cars. Keep the
existing frame paths and their assertions intact. Use memory-only players.
Checks: lane tier jobs 4, production build, combat balance --check; the five
requested browser scenarios jobs 1. Frame check: High and Performance, headed,
jobs 1, alone, GPU idle, laptop panel off; delivered p95 <=18.5 ms and world
build <1000 ms. First-race load >5 s is a warning.

## Changed assertions

| File | Old expectation | New expectation | Why |
| --- | --- | --- | --- |
| tools/test-feature-flags.mjs | lab and lab-tuning each dev in exact inventory | Both on in exact inventory | Approved Story release 2; every other state and total count unchanged. |
| tools/test-lab-rules.mjs | FEATURE_STATES.lab equals dev | Equals on | Approved Lab release. |
| tools/test-lab-rules.mjs | FEATURE_STATES[lab-tuning] equals dev | Equals on | Approved tuning release. |
| tools/test-lab-rules.mjs | Production lab enabled equals false | Equals true | Lab must be reachable without QA opt-in. |
| tools/test-lab-rules.mjs | Production lab-tuning enabled equals false | Equals true | Tuning must be reachable without QA opt-in. |
| tools/scenarios/frame-pacing.mjs (before timing) | All eight car IDs must match the requested car on the F1 path | Same F1 check; also required on the opt-in Speirling path | Proves the measured field has eight Speirlings, using native roster selection. |
| tools/scenarios/frame-pacing.mjs (each measured frame) | Same-car roster check on the F1 path | Same check on F1 or opt-in Speirling path | Keeps the roster valid throughout the sample; no limit or prior condition changed. |

start-preview.bat drops only lab and lab-tuning from its explicit opt-in list;
they are now enabled by default. Its existing all-dev-switch coverage stays.

All other assertions, save fixtures and race fingerprints remain unchanged.
Claude can review the exact assertion changes above before integration.

## Checks

Independent code review: clear; default frame routes, roster selection,
memory-only saves and existing limits preserved.

Frame recipe (run only after idle/process and display checks):

```powershell
$env:LAB_FAN_FRAMES_ONLY='1'
$env:DUEL_NIGHT_FRAMES='1'
$env:DUEL_NIGHT_IDLE_AWAKE='1'
node tools/run-browser-scenarios.mjs --scenarios frame-pacing --headed --jobs 1
```

- Lane command: `node tools/run-tests.mjs --tier lane --changed --jobs 4`.
  Initial restricted run: 22 passed, 1 failed, 19 not run (217.96 s).
  Follow-up with required fixture/process permissions: full-check tool suite
  plus the 19 unrun suites, jobs 4: 20/20 passed, 134.76 s. No source or
  assertions changed between these runs. An isolated course-kit diagnostic
  also passed 8/8; it was repeated unnecessarily while diagnosing the
  stopped run. No other passing suite was repeated.
- `npm.cmd run build`: passed (985 ms). PowerShell blocks npm.ps1; npm.cmd
  invokes the same build. Vite needed permission for the shared dependency
  cache. Existing chunk-size and dynamic-import warnings only.
- `node tools/combat-balance.mjs --check`: passed, 356 s; 51 policy runs and
  90 baseline races, both Lab switches on in the real catalog.
- Combat replay guards: 12 checks / four encounters passed; reference-lap,
  ordinary replay and world-composition guards passed without re-recording.
- `node tools/build-status.mjs`: ran; STATUS included in this lane commit.
  Full-tier result remains stale; this work does not claim a release pass.
- Required session-end cockpit-sync ran through the protected runner.

Browser command: `node tools/run-browser-scenarios.mjs --scenarios lab-view,lab-restore,lab-fan-view,grand-prix-existing,deep-sirena --jobs 1`.
All five passed, zero warnings/errors: screenshots 4 / 15 / 4 / 36 / 6.
Grand Prix covers all nine existing circuits in both qualities.

First frame attempt: no samples collected in either quality. Native race entry
correctly refused the temporary Speirling because its test helicopter field
lacked version 1; normalization discarded its staged Harbour location. Fixed
only that fixture field, as in the existing F1 recipe. No game code, frame
limits or other expectations changed. Independent reviewer confirmed the
version fix against normalizeHeli. The corrected real headed run passed.

| Quality | Delivered p95 | World build | First-race load |
| --- | --- | --- | --- |
| High | 18.4 ms | 401 ms | 3214.5 ms |
| Performance | 18.3 ms | 553 ms | 3780.7 ms |

Harbour Lights night, Seafront Straight grid; 120 delivered frames per quality,
all eight roster IDs mcmurtry_speirling checked before and during timing.
Normal App loop and mirror active, visible headed browser, memory-only saves.
Run alone with --headed --jobs 1. Before starting and before the corrected
attempt: no competing heavy process, NVIDIA GPU 0% (three idle samples before
the first attempt, another 0% before the corrected attempt). Windows reported
only the two 2560x1440 external displays; Second screen only confirmed.
The corrected frame scenario passed with two screenshots, no warnings/errors.
Only one measured sample per quality; the first attempt never started a race.

The final fixture-only version fix is covered by the actual frame rerun and
independent review; the earlier lane/build/balance/five-browser results cover
identical game code. No thresholds or game code changed after those checks.
Consumed screenshots, reports, lane JSON and production build recycled after
recording these verdicts. No raw evidence retained.

## Removed

Removed the two obsolete preview opt-ins. No replaced assets or code paths.

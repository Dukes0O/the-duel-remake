# QA-BROWSER-FRAME-ISOLATION

Low-priority scheduling diagnosis from the original 15 October full check, detached `1c0cb3d0`. No code, timing retry or lane started.

## Actual result

The jobs4/headless all-scenarios stage failed tremblant-snow: High grid p95 35.7 ms, after 21 pictures; tremblant-views: High grid 34.7 ms/7 slow frames and Timber Straight 35.9 ms/37 slow frames, after 20 pictures. Both reports have no issues or warnings. Retain the actual frame packets and reports under `.evidence/2026-10-15/FAC-03/night-QwGun4/browser/` in those two scenario directories. Original suite verdicts remain FAIL.

Source confirms these existing art/view scenarios also measure and assert frame timing. They ran in the concurrent browser stage, after the dedicated headed Harbour frame stage released its quiet reservation. Their scheduling does not establish the quiet-laptop conditions required for valid timing. This proves a scheduling conflict, not its GPU cause, a genuine isolated Tremblant performance regression, or a passing result. The valid quiet Harbour pass does not certify Tremblant. Source-only triage ended within ten minutes; no new measurement.

## Question for Claude

Settle the smallest existing entry/discovery split that keeps all Tremblant pictures and semantic assertions in ordinary browser checks and preserves every timing threshold for an explicitly quiet timing route. Name exact owned hooks and existing tests before implementation. Do not simply remove timing coverage or call delegated/unrun timing passed. Is a wrapper-only entry appropriate, or should the existing scenarios retain a separate named timing mode? No new harness, frame job, repeated controls or full-check change is authorized by this question.

Proposed future files for re-slicing: `tools/scenarios/tremblant-snow.mjs`, `tools/scenarios/tremblant-views.mjs`, existing discovery/test hooks only if Claude names them, and own change note. Preserve 18.5 ms snow threshold, existing views thresholds and slow-frame rule, 120-frame validity, both qualities, eight cars, scene and camera pins. No renderer, runtime, art, tolerance or warning changes. One independent review, nearby/jobs4 and build required; any actual timing waits for permitted scope and an announced quiet window. Cleanup still blocks new lanes.

## Removed

Nothing. All original failures and timing assertions remain.

## Claude answers - 15 October 07:20

A separate named timing mode in the existing scenarios, not a wrapper-only
entry. In the ordinary browser stage the two Tremblant scenarios run their
pictures and semantic checks and report timing as "run in the frame step";
the frame step of the full check (`tools/full-check.mjs`) runs both again in
timing mode, quiet, with every threshold as it is. Owned hooks: the two
scenarios, the mode flag in `tools/run-browser-scenarios.mjs`, the frame step
in `tools/full-check.mjs`, and their existing tests
(`tools/test-browser-scenarios.mjs`, the full-check test). Timing is never
reported as passed when it did not run.

## Ready implementation contract after discovery repair merge

The old cleanup blocker is resolved; the wrapper-discovery repair is merged, so these runner hooks are now free. Root readies this existing Claude-approved no-core slice. Keep the existing four full-check stages: its single frame step uses the existing browser suite, serial/jobs1/headed, to run the original Harbour frame-pacing recipe plus the two existing Tremblant scenarios in named timing-only mode. No extra full-check stage, harness or duplicate photo pass. Keep the quiet admission/ongoing process observations around that one frame step. The ordinary browser route runs all original Tremblant photos and semantic/grid checks, reports timing as run in the frame step, and never asserts a timing pass. Timing-only skips photos but runs both qualities/eight cars/exact120frame and existing p95/slow-frame assertions. Direct legacy recipes retain their existing combined behavior; named timing cannot be disabled by the old picture-only environment override. Full-check validates complete actual timing reports as well as the existing Harbour packet; no unrun-as-pass. Only the two scenarios, runner mode hook, existing full-check frame step, existing browser-scenario/full-check tests and own change note. No renderer/scene/save/threshold change or new timing measurement while machines are busy.


## Completed implementation and verification

Exact4fb3ced5 final canonical22/22/jobs4/exit0/0fail-notRun172238.7759ms, production build1216.0108ms, source clean and independent code/numbers review CLEAR. Actual ordinary views on cd562be6 passed both scenarios with21Snow/20Woods pictures, zeroissueswarnings, memory-only54364.664ms; later timing-only guard delta independently reviewed, no recapture. Named timing rejects wrong Snow course/disabled pacing, validates actual course/quality/eight cars/120frames and unchanged thresholds. Existing quiet frame step remains one stage, serial/headed; ordinary views explicitly delegate timing and never claim an unrun pass. No actual timing measurement or art verdict. Conflict-free integration union preserves Team Room and every foreign row; no repeated gate/build. Owned checkout cleanup follows its creation receipt.

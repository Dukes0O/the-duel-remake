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

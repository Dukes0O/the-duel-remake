# QA-TITAN-REPLAY-TIMEOUT

Titan no longer starts a duplicate full replay suite when the final runner plan already schedules that exact suite. The existing selectPlan adds --replays-in-plan only to tools/test-titan-climb.mjs, after all tier and filter selection. Titan prints that its child is delegated and excludes the unrun child from its own passed-check count. The outer replay task, its result, failure and unrun coverage remain authoritative.

Standalone Titan and plans whose final filters exclude tools/test-replays.mjs retain the exact original spawn, 180000 ms timeout and status assertion. All climbing assertions, replay fingerprints, thresholds, plan order and other task arguments are unchanged. No generic dependency exclusion or runtime change is added.

## Evidence

The original b486aaf0 gate recorded a nested replay timeout with null status and no output while its separate replay guard passed. Its one unchanged standalone rerun passed eight checks. This proves duplicate dispatch and an unreliable timeout, not a fingerprint defect or a proved timing cause.

New cases were authored first in the existing runner suite: solo/both-selected/tier/filter/overlap/exact-suite selection, actual child arguments, replay nonzero/signal propagation and fail-fast unrun reporting. They are UNRUN. No executed RED, test, import, gate, build or native result is claimed during the active release hold. Independent source review is pending.

## Removed

Only the duplicate nested replay child when its real counterpart is selected in the same final plan. The standalone child, every original fingerprint/climbing assertion and the full/default replay guard remain.

## Final green merge

Mergede80e6ca4 from clean1e55b12f after the original canonical429/429 nearby/jobs4/keep-going gate, zero failures/unrun, aggregate1069952.0539ms/wall1070182.0691ms, ended05:23:03UTC. Build passed703ms/wall1238.8202ms on the same clean source, GOMAXPROCS4. Root independent code review CLEAR; exact final filtered plan alone decides Titan delegation, actual ordinary replay suite still runs and controls overall success, standalone assertions/180000ms timeout stay exact, no delegated fingerprint count. No tolerance, pin, old behavior or harness is weakened.

Conflict-free merge needed no rerun. Own lane/dependency junction/branch were safely recycled/deleted after exact source, cleanliness, ancestry, junction target and prune registration verification. Other lanes remain. No release/push or save access.

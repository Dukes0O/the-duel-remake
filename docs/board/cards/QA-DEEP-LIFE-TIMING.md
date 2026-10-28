# QA-DEEP-LIFE-TIMING

The unchanged `test-deep-life.mjs` CPU timing test failed during the
DEEP-PLAYTEST-1 lane run at 4.287 ms/frame (limit below 4 ms). The one allowed
rerun alone passed at 1.751 ms/frame, all 23 checks green. No assertions changed.

Review how this timing check runs in the parallel lane tier. Prefer an existing
quiet-run hook; do not add test machinery or loosen the limit. Acceptance:
keep the behavior checks and demonstrate that competing lane workers cannot
invalidate this CPU timing result. Does not hold DEEP-PLAYTEST-1.

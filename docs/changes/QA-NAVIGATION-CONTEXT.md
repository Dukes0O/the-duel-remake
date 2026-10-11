# QA-NAVIGATION-CONTEXT

## Design, before code

Historical failure reports are gone; its exact navigation remains unproved.
Actual old harness functions fail during a legal context replacement after
single accepted navigate/reload/history mutations, and can accept old readiness.
Register session/main-frame events before each single mutation; await its
committed document, DOM lifecycle and default execution context before polling.
Observe the writer BFCache pageshow reload; do not retry a history mutation.
Use explicit reload/back hooks, with Page.navigateToHistoryEntry once for back.
Keep existing command and readiness timeouts, native assertions and memory saves.
Reject arbitrary evaluation errors, detach/closure and failed navigation.
No game startup/storage code changes. Native and gates wait the shared slot.

## Checks

Old actual-source replay reproduces the exact context error after each single
navigate/reload/history action, plus old-document readiness passing early.
New lifecycle regression RED on missing barrier, then GREEN9/9 in78ms before
loader's quiet slot: stale/subframe/session filtering, default-context requirement,
reload, BFCache restore then guard reload, one history entry mutation, arbitrary
evaluation failure/target detach propagation and listener cleanup.
Existing14 browser evidence checks and all writer assertions stay unchanged.
45s lifecycle bound uses existing TIMEOUT_MS; CDP20/60s and polling45/60s stay exact.
Native original writer scenario, lane/build and ordinary review remain pending.
Original telemetry trigger and new native scenario remain unproved.

## Removed

Replace immediate post-navigation polling and raw reload/history calls in the
writer scenario with awaited document lifecycle. No game resources removed.

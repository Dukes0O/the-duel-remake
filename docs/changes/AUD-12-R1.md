---
task: AUD-12-R1
status: ready-to-merge
kind: fix
flag: none
player_facing: no
---

# Preserve generated takes when accounting fails

## Design

Save successful generation bytes before the follow-up credit query. A failed
follow-up returns the saved take with an explicit accounting warning and a
labelled estimate. Never retry generation as a way to recover accounting.
Keep the initial credit check, so failure before generation still prevents a
charge. Kyle's selected gatekeeper take is not changed.

## Evidence

New fake-only regression covers HTTP 503, network failure and invalid JSON
after successful generation. No real API calls or credits are authorized by
this card. The regression failed against the original implementation before
the fix. All 51 sourcing checks now pass.

Integration was merged at ad4bf1b before readiness. Lane tier: 254/254
in 344.96 seconds. Production build passed in 378 ms with the existing
large-chunk advisory. Full tier on 9268cb9: 254/254 in 336.88 seconds,
clean at start and end. All 48 expansion drives completed and won; existing
race fingerprints remained unchanged. Logs are in the ignored lane evidence
folder `.evidence/2026-09-25/AUD-12-R1/`.

Self-review tightened the new ordering assertion so the mocked request cannot
catch its own assertion failure. The check observes persistence inside the
request and asserts it after the production call returns. No old assertion
was relaxed. Exact returned bytes, one generation request, explicit warning,
labelled credit estimate, and no key leakage are covered. Zero real credits
were used; no take was generated, kept, or changed.

AUD-10 remains in progress. This note marks only AUD-12-R1 ready; it does not
authorize merging the unfinished sound-bank series. The fix commits are
96cf90a and 9268cb9.

## Removed

The post-generation dependency that could discard returned bytes before they
were persisted is replaced by persistence before accounting.

## Behavior and test changes

No runtime game or save behavior changes. Existing assertions remain. The
new test must fail against the original implementation before the fix.

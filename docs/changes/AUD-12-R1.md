---
task: AUD-12-R1
status: in-progress
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
this card. Gate results pending.

## Removed

The post-generation dependency that could discard returned bytes before they
were persisted is replaced by persistence before accounting.

## Behavior and test changes

No runtime game or save behavior changes. Existing assertions remain. The
new test must fail against the original implementation before the fix.

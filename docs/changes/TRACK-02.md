---
task: TRACK-02
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

Aligned `AGENTS.md` and the playbook's workflow, examples and Director,
Integrator, full-check and release prompts with SPEC 0.5. Every merge needs
the lane tier with 8 jobs and a production build. Full tests use 8 jobs and
keep going after failures; they run after 5 merges or 2 hours of merging,
whichever comes first, and at every session and overnight-run end. Failed
full runs stop feature merges until fixed and green.

Release still requires full tests on the exact final commit and the complete
build, balance, browser, frame, art and save evidence as applicable. Feature
checks remain required. STATUS refreshes after every merge and session end;
a later metadata commit does not inherit a passing full run.

Section 0 takes precedence, its 0.6 cards stay ordered, and D8 remains
unapproved. D4 still permits the master backup push after release. Docs-only
cards use independent review without adding tests that just check wording.

## Evidence

- Read SPEC 0, the task card and current operations instructions.
- `git diff --check`: passed.
- Inspected the active gates and prompts; no mandatory merge tier with 12
  jobs or full tier with 10 jobs remains in the two owned instruction files.
- Independent review, lane gate and build are pending at builder handoff.
  The Director dispatches the reviewer and test runner before integration.
- Browser checks and new tests: not applicable to these instruction changes.
  No browser or real save was accessed.

## Behavior and test changes

No game code, test assertions, race fingerprints or security profile settings
changed. Only the two owned instruction files and this change note changed.

## Independent handoff

Review of 4b6131f..7d8a011 found no blockers. On clean HEAD 7d8a011,
`node tools/run-tests.mjs --tier lane --changed --jobs 8` passed all five
selected suites in 37.11 seconds. The production build passed in 1.30 seconds
with the existing chunk-size advisory. Campaigns were not selected by this
docs-only lane check; no extra broad or browser run was needed.

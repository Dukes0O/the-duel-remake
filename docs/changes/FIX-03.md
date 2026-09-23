---
task: FIX-03
status: merged
kind: fix
flag: none
player_facing: no
---

## What changed

Updated the menu eligibility test fixture for custom rival controls and the
driver skill label added in commit `7564c7d`.

## Evidence

- Before: the test failed because `rival-customization` was absent from its
  hand-made UI fixture.
- `node tools/test-course-eligibility.mjs`: 2,066 checks passed across nine
  cars and 16 courses.

## Behavior and test changes

No game behavior or assertion changed. RFX-01 will replace source-text
extraction with imports of real menu functions.

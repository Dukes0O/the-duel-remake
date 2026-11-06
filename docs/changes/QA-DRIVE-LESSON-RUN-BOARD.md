# QA-DRIVE-LESSON-RUN-BOARD

## Changed

- Updated `tools/scenarios/drive-lesson-run.mjs` to compare the new player's displayed lesson 1 corner choices with the current app corner list, reduced to the first listed corner per course.
- Kept the three later lesson rows locked. Each row must still say “Opens later,” have no action control, and not use a pointer cursor. The scenario also verifies each rendered course choice is enabled and can be selected.

## Checks

- `node tools/test-drive-lessons-view-2.mjs` — passed, 9 tests.
- `node --check tools/scenarios/drive-lesson-run.mjs` — passed.
- `npm.cmd run build` — passed. Existing dynamic import and large chunk warnings remain.
- Browser scenario `drive-lesson-run` — Claude runs. Chrome is unavailable to this job, as directed; Claude should check the board screenshot for corner labels and the three visibly locked “Opens later” rows, then run the scenario through the native lesson result flow.
- Changed assertion: replaced the fixed three-course ID expectation with equality between displayed corner choices and the current app corner list (first corner per course). The lock count, “Opens later” text, non-pointer cursor, and absence of action controls remain required.
- Race fingerprints: none recorded or expected; this changes only a browser scenario assertion.

## Removed

- Removed the stale hard-coded course-choice expectation from the browser scenario.
- No game code, assets, or other tests were replaced.

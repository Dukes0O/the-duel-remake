# DRIVE-LESSON-SAVE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 7 and 3.7.

Add optional `profile.drivingLessons = {version: 1, done: {corner},
best: {corner}, rewarded: {corner}}` with its normalizer (one line in
`normalizeProfile`), `finishDriveLesson(profile, id, marginSeconds, carId)`
and `grantDriveLessonReward(profile, id, carId)`. The reward is settled
(Kyle, 14 October 2026: "A brake upgrade or 600"): one free brake level on
that car, or 600 credits when its brakes are already at level 3. It is given
once (`rewarded`).

Owns: `src/lessons/drive-lesson-save.js`, `tools/test-drive-lesson-save.mjs`,
`tools/fixtures/saves/11-driving-lessons.json`,
`docs/changes/DRIVE-LESSON-SAVE.md`.
Hooks: `src/progression.js` `normalizeProfile` (one line), the save checker.
Locks: `save-shape`.

Acceptance: old saves read as no lessons done and unchanged otherwise; the
reward lands once and never on a retake; a maxed car gets the credits; the
save checker passes with the new fixture; lane tier, build, one review (the
save helper review that AGENTS rule 6 asks for).
Removed: nothing.

## Build claim — 15 October afternoon

Kyle directed continued building. drive-lesson-save/codex/drive-lesson-save holds save-shape, separate from the frozen Snow lane. Build only the settled optional save/reward slice; no lesson gameplay or switch-on. A successful finish takes a finite positive challenge margin, retains the best margin, and grants the one-time reward atomically on the passed car. Retakes may improve best but never pay again. A separate reward call can settle a done-but-unrewarded lesson once. Unknown lesson IDs and invalid/locked cars cannot earn. The existing fixture roster now includes heli/fire and medals; add the named11-driving-lessons fixture without replacing either. Save helper review required.

## Narrow hook correction from save review

The existing backup checker tools/test-career-backup.mjs also pins the save-fixture roster at12. Director grants only its12-to13 roster assertion for the new additive fixture; preserve every migration, backup, restore and failure assertion. This is required to verify the same fixture, not a new harness or weakened backup check. Independent review found this real fault before merge; confirm the correction with the same reviewer.

## Remaining fixture roster hook — same additive save slice

Canonical c9a70ed7 stopped at tools/test-arena-settlement.mjs:129:13fixtures versus expected12;53passed/1failed/209unrun, not a green lane. A targeted source search found exactly three save-directory roster pins: the checker and backup assertion already corrected, plus this arena assertion. Director grants only that existing arena12-to13 roster hook. Preserve all settlement, identity, completion, duplicate and failed-save assertions. No game-code fault or flaky claim; rerun the corrected complete lane and confirm the same reviewer.

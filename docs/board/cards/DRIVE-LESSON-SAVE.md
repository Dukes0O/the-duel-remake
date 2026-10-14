# DRIVE-LESSON-SAVE

The short board entry controls current state, ownership, dependencies and locks.
The design is `docs/DRIVING_LESSONS.md`; this card names the slice, files and acceptance.

Codex. Packet sections 7 and 3.7.

Add optional `profile.drivingLessons = {version: 1, done: {corner},
best: {corner}, rewarded: {corner}}` with its normalizer (one line in
`normalizeProfile`), `finishDriveLesson(profile, id, marginSeconds, carId)`
and `grantDriveLessonReward(profile, id, carId)`. The reward follows Kyle's
answer to the packet's section 11 question; until he answers, build the
recommendation (one free brake level on that car, or 600 credits when its
brakes are at level 3) inside `grantDriveLessonReward` only, so a different
answer changes that one function. The reward is given once (`rewarded`).

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

# STORY-REPLAY-PICK

Completed Night 2 replays compare both tellings under the existing `story-choices` switch. Keep how it stands is focused. Keep this time asks before writing one telling.
Confirmation replaces Night 2 effects, carries forward later nights and their actual banks, and marks those that read changed facts. Career pay is awarded once on first completion.
Cloud on `b684a438b653487fb287f1b57f10ecab9ec12b56` passed `test-story-replay-pick`, `test-story-save`, `test-story-ledger`, `test-night-2` and `test-night-2-scenario`, including browser expression parsing.
Cloud lane on `b684a438b` ran 272 suites with 4 workers. 269 passed, including all 297 race replay checks. The P4 follow-up and `npm run build` passed on `6989c715b`.
Two remaining lane failures reproduced identical hashes on untouched `f20a59f3b` in separate worktrees. `test-lab-radio` rebuilt `lab.fan` differently with Debian FFmpeg 7.1.5. `test-world-composition` differed at Pacific Canyon with unchanged scene counts.
Independent save checker passed `b684a438b`. The combined tree `b2b80d55407d749e9893d60f5a7de8770cfbaab7` checked Wash `5e3ed335f` and replay `b684a438b`. The updated tree `7527537674f65f5c76eb568f5027fb93137bfd16` checked Wash `922710d96` and replay `6989c715b`. Both preserved the original bytes on Keep and protected balances and the second player through both replacement directions.
**Combining Slice B** Keep both sets of chapter imports in `src/world/jobs/night-2.js`, the `freshPlayer` and `washFight` options in `tools/scenarios/story-night-2.mjs`, and both native chapter paths in `tools/test-night-2.mjs` as in the checked combined tree.
**For Claude to run** The `story-night-2` browser scenario and both replay choices by hand, including focus and the synthesized `story.ledger.choose` cue. Target look and audio need laptop review.
**Laptop suites** `test-course-kit`, `test-drive-through`, `test-earned-cars-ui`, `test-full-check`, `test-medals`, `test-salt-flats`, plus the Lab and Pacific Canyon baseline failures. The lane planner left seven long suites for overnight.
**Changed assertions** The previous Night 2 replay check now expects a comparison and an explicit choice. `test-p4-audio` excludes the new ledger cue from its pre-P4 projection. The historical pin and P4 race fingerprint both pass on `6989c715b` (race `797e1c5a53423d2cacf2317b084aa4fffb9785a1dee353d828a1a4624823f038`).
**Codex decided** Ledger v1 gains optional journal details and dependency notes. Scenes that branch on earlier facts record their reads. No save migration.
**Removed** The automatic discard of the newly played ending.

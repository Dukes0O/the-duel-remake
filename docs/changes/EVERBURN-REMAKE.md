# EVERBURN-REMAKE, slice 5

- Cinder accepts the stopped car within 12 m. Her brazier moved from 7 m to 20 m left of the gate line, clear of both approaches. No new event or sound cue.
- Wrong message cause: a weapon start triggers Rook's callout without checking for a nearby fence or rider; reproduced by stepping the voice event.
- Rook's callout waits for nearby danger to clear and stops if a fence or rider comes close. No new sound cue.
- `node --test tools/test-fight-voices.mjs` passed on ce9b3d0ed plus this change (27 tests); `git diff --check` passed.
- `node tools/test-everburn-play-start.mjs` passed on 494f2b9e3 plus this change, including the hand-over boundaries, both fire clearances and the 12 m ring. `git diff --check` passed.
- Changed assertions, for Claude to review: pickup boundary 8.1/7.9 m to 12.1/11.9 m; brazier left offset 7 m to 20 m and distance from Cinder below 3 m to at least 6 m, as ruled on the card.
- Fence: the flame tests the drawn fence's full 12 m length; within 40 m the job line names the key. No new sound cue.
- Fence cone, range and guidance checks and `node tools/test-world-hud.mjs` passed on 81d90ec8e plus this change.
- `node tools/test-everburn-job1.mjs` failed before the new checks: yard exit `exit.along >= 20` at line 365. The cause remains to be found.
- Codex decided: none. **Removed:** the old hand-over radius, brazier position and centre-point fence flame target.
- Still needed: rider and gate causes and cures; investigate the yard-exit failure; all remaining card, older-suite, replay, world-signature, lane and build checks. For Claude to run: the browser scenario.

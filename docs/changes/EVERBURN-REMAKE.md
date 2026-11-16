# EVERBURN-REMAKE, slice 5

- Cinder accepts the stopped car within 12 m. Her brazier moved from 7 m to 20 m left of the gate line, clear of both approaches. No new event or sound cue.
- `node tools/test-everburn-play-start.mjs` passed on 494f2b9e3 plus this change, including the hand-over boundaries, both fire clearances and the 12 m ring. `git diff --check` passed.
- Changed assertions, for Claude to review: pickup boundary 8.1/7.9 m to 12.1/11.9 m; brazier left offset 7 m to 20 m and distance from Cinder below 3 m to at least 6 m, as ruled on the card.
- Codex decided: none. **Removed:** the old hand-over radius and brazier position.
- Still needed: fence, message, riders and gate causes and cures; all remaining card, older-suite, replay, world-signature, lane and build checks. For Claude to run: the browser scenario.

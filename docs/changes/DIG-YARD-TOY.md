# DIG-YARD-TOY

- In progress: The Dig has its own `dev` switch for its yard button and entry; the town keeps its switch.
- Kept the later switch values: `wasteland-town` is `dev`, `nissan-skyline` is `on`.
- Opening controls already appear without input in `src/machines/dig-game.js`.
- Checks on abb52e7e0 plus this change: `test-dig-yard-switches`, `test-the-dig`, `test-feature-flags`, `test-town-hooks` passed.
- Changed assertions for Claude: switch count 55 to 56 for the new switch; Dig entry test uses `the-dig` instead of `wasteland-town`.
- Sound: no new game event or cue.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` switch entries.
- Still needed: shared machine help in the yard, save and sound checks, atlas audit and any fix, scenario, older suites, lane tier and build.
- For Claude: browser scenario, play with sound, picture check and Dig yard frame check.

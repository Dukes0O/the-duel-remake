# DIG-YARD-TOY

- In progress: The Dig has its own `dev` switch for its yard button, entry and four shared machine sounds; the town keeps its switch. The yard shares the Dig's machine help.
- Kept the later switch values: `wasteland-town` is `dev`, `nissan-skyline` is `on`.
- Opening controls already appear without input in `src/machines/dig-game.js`.
- Checks: `test-feature-flags` and `test-town-hooks` passed on abb52e7e0 plus the switch change; `test-dig-yard-switches` and `test-the-dig` passed on cbf13d8ac plus the yard help change; `test-machine-view` passed on baad701a7 plus the sound switch fix.
- `test-the-dig` passed on b9aea8da0 plus the sound check: all four machine-view cues have sound-bank recipes and the Dig switch.
- Changed assertions for Claude: switch count 55 to 56 for the new switch; Dig entry test uses `the-dig` instead of `wasteland-town`.
- Sound: no new game event or cue.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` switch entries.
- Still needed: save check, remaining sound audit, atlas audit and any fix, scenario, older suites, lane tier and build. Drill, road and borer sounds have separate tone players to account for in the sound audit.
- For Claude: browser scenario, play with sound, picture check and Dig yard frame check.

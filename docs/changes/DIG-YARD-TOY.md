# DIG-YARD-TOY

- In progress: The Dig has its own `dev` switch for its yard button, entry and four shared machine sounds; the town keeps its switch. The yard shares the Dig's machine help.
- Kept the later switch values: `wasteland-town` is `dev`, `nissan-skyline` is `on`.
- Opening controls already appear without input in `src/machines/dig-game.js`.
- Checks: `test-feature-flags` and `test-town-hooks` passed on abb52e7e0 plus the switch change; `test-dig-yard-switches` and `test-the-dig` passed on cbf13d8ac plus the yard help change; `test-machine-view` passed on baad701a7 plus the sound switch fix.
- `test-the-dig` passed on b9aea8da0 plus the sound check: all four machine-view cues have sound-bank recipes and the Dig switch.
- Changed assertions for Claude: switch count 55 to 56 for the new switch; Dig entry test uses `the-dig` instead of `wasteland-town`.
- Sound: no new game event or cue.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` switch entries.
- Scenario now opens with `the-dig` only, checks opening controls and compares memory-only storage after machine use and a borer cut; it awaits a browser run. All page expressions parse in Node.
- `test-the-dig` passed on 10148ac89 plus the scenario change.
- Drill, road and borer tone recipes now live in the sound bank and are shared with their existing players; emitted cues are checked.
- UV audit: machines-1 0 of 63,426 and borer 0 of 44,876 vertices sampled near white before and after; town materials use separate repeating tiles. This does not inspect triangle interiors.
- Checks: `test-the-dig` and `test-dig-yard-switches` passed on fb4dff498 plus this change.
- Still needed: browser save check, triangle-interior texture audit, older suites, lane tier and build.
- For Claude: browser scenario, play with sound, picture check and Dig yard frame check.

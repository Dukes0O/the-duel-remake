# DIG-YARD-TOY

- The Dig has its own `dev` switch for yard entry and machine sounds; the town keeps its switch. The yard shares machine help. Opening controls already appeared without input.
- Kept later values: `wasteland-town` is `dev`, `nissan-skyline` is `on`. Preview lists the Dig.
- Machine cues have sound-bank recipes, shared with the existing players. No new game event or cue.
- Texture audit: machines-1 has 0 of 63,426 UV vertices near white; borer has 0 of 44,876. Before and after match: no model changed.
- All town tile images have zero near-white pixels, including triangle interiors. Borer photo textures have 44 scattered near-white pixels, at most three in any row, not empty white cells. Claude's picture check remains needed.
- Checks on 3f5c22450 plus this change: `test-the-dig`, `test-dig-yard-switches`, `test-machine-borer-scenario` and `test-machine-borer-apprentice-scenario` passed. Scenario page expressions parse in Node; literal machine sound requests have recipes.
- Earlier checks passed: `test-feature-flags`, `test-town-hooks`, `test-machine-view`, `test-preview-launcher`, `test-yard-home` and `test-yard-next`.
- Changed assertions for Claude: switch count 55 to 56 for the new switch; Dig entry test uses `the-dig` instead of `wasteland-town`.
- Removed: earlier duplicate `wasteland-town` and `nissan-skyline` switch entries.
- Still needed: remaining older suites, lane tier, build, browser save check and independent code review.
- For Claude: run the browser scenario with memory-only storage, play with sound, check the pictures and run one Dig yard frame check.

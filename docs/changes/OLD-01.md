---
task: OLD-01
status: merged
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

The ordinary-race HUD now counts crash slots spent (`five minus lives left`),
the rule that ends the race. Its five bars, text, and screen-reader label use
that same count. At four crashes the count stays visible and turns critical;
the impact callout says the next crash ends the race. Wasteland combat keeps
its separate major-hit and automatic-recovery display. Persistent-vehicle
events keep their time-penalty display.

The ordinary game-over text now says that five crashes used all slots.
No race rule, damage threshold, score, or repair amount changed.

## Tests and evidence

- The new private browser scenario failed on the old HUD before any hit:
  `0 / 5 MAJOR CRASHES`. It also showed the wrong count after moderate hits.
- `node tools/browser-harness.mjs scenario crash-counter`: five 64 km/h rock
  hits consume five lives, leave `majorCrashes` at zero, and end the race.
  The production HUD shows `0 / 5` through `5 / 5 CRASHES` at each step.
  Private port 52074, disposable browser profile and memory-only save;
  zero console warnings or errors.
- The QA app handle is exposed only on `tools/menu-check.html`; production
  pages do not expose it.
- Independent review caught a misleading Wasteland callout at four major
  hits. It now says `ARMOR HIT. AUTO RECOVERY.` The browser scenario also
  checks the five visual bars after every ordinary hit and the Wasteland
  message. Its final rerun passed on private port 12445 with zero browser
  warnings or errors.
- `node tools/test-course-access-ui.mjs`: 38 checks passed after the test's
  source-slice harness received the newly imported `LIVES` constant. No
  assertion was removed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 154/154 suites
  passed in 302.39 seconds. Replay fingerprints and all 48 expansion-driving
  outcomes held.
- `npm run build`: passed with the existing large rendering chunk warning.

## Review

Independent review found and resolved the Wasteland wording error and requested
visual-bar coverage. Ready for integration.

## Integration gate

Cherry-picked as `6fc9133`. The exact integration commit passed 147/147 merge
suites in 350.80 seconds, the production build, and private High/Performance
smoke with four screenshots and zero warnings or errors. The `crash-counter`
scenario passed on private port 48874 with zero warnings or errors.

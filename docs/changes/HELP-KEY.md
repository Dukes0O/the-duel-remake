---
task: HELP-KEY
status: ready-to-merge
kind: fix
flag: none
player_facing: yes
---

# Controls on request, not all the time (Claude, 4 October 2026)

Kyle: in Mad Max mode the key controls sat in the middle of the playing
screen the whole time. They should be there on demand.

## What changed

- The car exit and entry hint (the "Hold F ... step out ... bail out" box) no
  longer shows by itself. Nothing about the controls is on screen unless asked.
- **H** (or gamepad Back) shows or hides a controls panel down the left side:
  driving keys, the weapon keys in Wasteland, car exit and re-entry, and the
  on-foot keys when on foot. The existing hint line sits at the bottom of it,
  so the exact hold times still come from the game's own tuning. It is
  never shown while paused, in a menu, or after a race ends, and a new race
  always starts with it hidden.
- A small "H HELP" sits beside "ESC PAUSE" under the speedometer so the key can
  be found. The pause screen's controls line now also says "H for all controls".
- src/controls-help.js (new), src/screen-hud.js, src/input-contexts.js,
  src/app.js (`toggleHelp`, hidden on menu and race start), src/style.css.

## Tests

- New tools/test-controls-help.mjs (4 checks). test-onfoot-hints has a check
  that the controls are hidden by default and shown on request.
- Changed assertion, on purpose: test-onfoot-camera-choice pins the on-foot
  gamepad map and now expects Back (button 8) to be help. test-onfoot-hints
  reads the hint with the help showing, since it no longer shows by default.
- Browser: scenario onfoot-hints presses a real H key, checks the panel is
  hidden by default and clear of the other HUD.

## Removed

- The always-on placement of the exit hint (its old absolute position rules).

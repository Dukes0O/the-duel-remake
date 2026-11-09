# MACHINE-VIEW

## Changed

- Added a Three.js machine view that clones a supplied GLB, moves its named joint nodes from machine state, shows a material load, and draws exhaust, dust, and ground marks behind moving tracks.
- Added cab, chase, and working-end orbit camera placement. The working-end view accepts orbit, distance, and height values for free looking.
- Added named machine sound cue identifiers and an optional callback for engine, hydraulic, digging, and tipping events. The view reads machine state and does not edit it.
- Added `tools/test-machine-view.mjs` for named joints, load visibility, effects, sound cues, state isolation, and camera modes.

## Checks

- `node tools/test-machine-view.mjs` — passed.
- `npm.cmd run build` — passed. Vite reported its existing dynamic-import warning for `src/game.js` and existing large-chunk warnings.
- Lane tier — not run; Claude runs it for this card.
- Browser and look checks — not run here. Claude should, after wiring the view to the machine yard, check that: (1) cab, chase, and working-end orbit views keep the excavator and bucket visible while moving each joint; (2) an excavator digs and loads a truck, then a truck drives and tips, with material visible in the bucket and bed; (3) moving tracked machines leave marks on the ground, and exhaust and dirt dust read clearly at play distance; and (4) viewing or changing camera modes does not change machine position, joints, load, or ground edits. Check engine, hydraulic, dig, and tip cues fire from their named events.
- Changed existing assertions — none. Added assertions only in the new view test.
- Race fingerprints — not applicable; this view does not change race simulation.

## Removed

- None.

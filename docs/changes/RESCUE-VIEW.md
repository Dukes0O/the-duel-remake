# RESCUE-VIEW: drawing H4 Rescue

Card: RESCUE-VIEW (Claude, UI lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 5, 7 and 13. Data: `view().rescue` from RESCUE-HOOKS. Switch:
`rescue` (dev). Drawing only: nothing here changes the session or a race.

## What changed

- `src/heli/heli-rescue-view.js` (new): the rescuer on the line (alone, or
  clipped to the casualty), the hiker (walking to the clearing, then standing
  and waving) with the orange flare and its smoke column, the faint 300 m
  search ring, the 12 m clearing ring, the avalanche's snow blocks (up to 220
  instanced blocks over the 80 by 200 m area, dirtier than the clean snow so
  they read), the skier coming up out of the snow as the dig bar fills with
  the beacon and puffs of snow, the driver on the slope, the three supply
  crates and the yard ring, and the handover (two paramedics walk in, the
  person walks, limps or goes off on a stretcher, by condition). People and
  props are the RESCUE-PEOPLE and RESCUE-PROPS files; the flare's smoke
  and the digging snow use H2's fire atlas, tinted. Every file loads the
  first time something needs it.
- `src/heli/heli-scene.js`: the helicopter view makes the rescue view only
  when the session gives a `rescue` view, hides it with the rest, and ends
  the cable at the rescuer's raised hand or a hooked crate.
- `src/heli/heli-ui.js` and `heli-ui.css`: the mission line under the
  instruments ("RESCUE 120° 0.6 km · 9:40", orange and bold in the last
  minute; "RESCUE AT TREMBLANT SNOW" on another course), the answer prompt
  while a call rings, the beacon bar (and "NO SIGNAL" out of range, never a
  distance), the dig or hold bar, "CRATES 1/3", a HURT or BADLY HURT mark, notices for every
  rescue event, and the dusk: over the hiker's last 3 minutes the panel's
  dimming layer cools and darkens the picture behind the instruments.
  The fire line no longer calls a rescue call a fire call (the rescue calls
  ring through the fire engine, so the old line said "FIRE CALL" for them).
- `src/heli/heli-fire-run.js`: Roger's "later" line is said once for each
  rescue call, however often Later is pressed (RESCUE-HOOKS' review note).
- `src/heli/heli-session.js` (one line, **not on the card's list**, its own
  commit so it can be dropped): `view().rescue.ground`, the course's height
  sampler, so people and snow blocks stand on the terrain. Without it the
  drawing falls back to the heights the view already holds (the clearing,
  the beacon, the driver), which leaves the snow blocks off the ground
  (a flat guess misses the ski hill by 4 m on average, measured).
- `tools/test-heli-rescue-view.mjs` (new, 149 checks) and
  `tools/scenarios/rescue-view.mjs` (new browser look check).

## The switch-off proof

With the switch off the session has no `rescue` key, so the helicopter view
never makes the rescue view (nothing in the scene, nothing downloaded), the
instruments add an empty string, and the dusk layer is never set. Tested with a
view with no rescue part, with the real session built with `rescueEnabled:
false`, and by counting the scene's children and the files asked for.
`test-heli-rescue-session`'s fingerprint of the fire session is unchanged.

## Tests

- `test-heli-rescue-view` (149): the model contracts; the switch off; the
  rescuer and pair on the line (clip point, facing, the cable end); the
  hiker (ring on the ground, walking, waving, flare out after 60 s,
  hidden aboard, no sampler); the slide (inside the area, on the ground,
  skier rising with the hold, hidden when clipped); the driver; the
  crates resting on the ground and the cable end on a hooked crate; the
  handover for walk, limp and stretcher; the same frames drawn the same;
  the mission line, beacon bar, hold bar, crates, orange, notices, and the
  fire line ignoring a rescue call; the real session's rescue view drawing
  and Later said once.
- `test-fire-view` (50), `test-heli-view` (98), `test-heli-mode` (158),
  `test-heli-rescue-session` (442), `test-heli-fire-session` (79),
  `test-heli-missions`, `test-heli-hooks` (291): pass.
- Browser look check (`RESCUE_VIEW_SHEET=1 node tools/browser-harness.mjs
  scenario rescue-view`, headless, memory-only saves, High quality): passed;
  round 1 sheet in `docs/board/looks/heli-rescue/`. No frame timing (Claude's).
- Gates: see the end.

## Changed assertions

`tools/test-heli-mode.mjs`, two lists only (the same kind of entry FIRE-VIEW
added): the drawing files exempt from the "rules files use no page or window"
check gain `heli-rescue-view.js`, and the import allow-list gains the browser
scenario's five heli imports. Nothing loosened: no check was removed or
relaxed.

## Removed

Nothing replaced.

## Open for Claude

- `src/heli/heli-session.js` was touched for the ground sampler (above); drop
  that commit if the sampler should come another way (render3d passing one).
- The hiker's height while walking is the ground sampler's; without it, the
  clearing's.
- The driver's car is not drawn: the view does not say which car it is.
- The dusk is a dimming layer over the picture behind the panel, not a
  change to the world's lights (render3d's, not this card's).
- The walking pose is the one frozen stride, with a small bob and sway.
- The supply run was pictured at the home pad only (a crate on the line and
  the three waiting); setting a crate down in the yard was not pictured.
- A stretcher's casualty is always the driver-lying model, whoever was rescued.
- The drawing has no quality setting yet: 220 blocks and at most 160 + 160
  sprites on both High and Performance. Frame check (rule 8) over the
  avalanche is Claude's.

# RESCUE-VIEW: drawing H4 Rescue

Card: RESCUE-VIEW (Claude, UI lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 5, 7 and 13. Data: `view().rescue` from RESCUE-HOOKS. Switch:
`rescue` (dev). Drawing only: nothing here changes the session or a race.

## What changed

- `src/heli/heli-rescue-view.js` (new): the rescuer on the line (alone, or
  clipped to the casualty), the hiker (walking to the clearing, then standing
  and waving) with the orange flare and its smoke column, the faint 300 m
  search ring, the 12 m clearing ring, the avalanche's packed-snow chunks (up
  to 220 rounded lumps of 0.3 to 3 m in four shapes, half sunk in the slope,
  white on top and blue-grey in the shade, thickest in a fan down the slope,
  generated in code; Performance has half), the skier coming up out of the snow as the dig bar fills with
  the beacon and puffs of snow, the driver on the slope, the three supply
  crates and the yard ring, and the handover (two paramedics walk in, the
  person walks, limps or goes off on a stretcher, by condition). People and
  props are the RESCUE-PEOPLE and RESCUE-PROPS files; the flare's smoke
  and the digging snow use H2's fire atlas, tinted. Round 2: every person is
  drawn 1.25 times life size (so they read from the cameras), the rescuer's
  helmet is white on a stronger red suit, crates are 1.5 times larger with a
  dark rim, and the paramedics are unchanged (upright; they only look flat
  from straight above). Every file loads the
  first time something needs it.
- `src/heli/heli-scene.js`: the helicopter view makes the rescue view only
  when the session gives a `rescue` view, hides it with the rest, and ends
  the cable at the rescuer's raised hand or a hooked crate. The cameras
  frame a rescuer on the line or a hooked crate as they frame a car on the
  hook, 8 m lower than it hangs so the instrument panel does not cover the
  people. The rescue drawing follows the quality the game sets for the fire
  (`fire.setQuality` passes it on; render3d is untouched).
- `src/heli/heli-ui.js` and `heli-ui.css`: the mission line under the
  instruments ("RESCUE 120° 0.6 km · 9:40", orange and bold in the last
  minute; "RESCUE AT TREMBLANT SNOW" on another course), the answer prompt
  while a call rings, the beacon bar (and "NO SIGNAL" out of range, never a
  distance), the dig or hold bar, "CRATES 1/3", a HURT or BADLY HURT mark, notices for every
  rescue event, and the dusk: over the hiker's last 3 minutes the panel's
  dimming layer cools and darkens the picture behind the instruments.
  The destination buttons come from `view.destinations` when the session gives
  one (Summit Run on: a fourth "Summit Run" button, its name in the cruise
  prompt and notices); without it they are the usual three, as before.
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
- `tools/test-heli-rescue-view.mjs` (new, 176 checks) and
  `tools/scenarios/rescue-view.mjs` (new browser look check).

## The switch-off proof

With the switch off the session has no `rescue` key, so the helicopter view
never makes the rescue view (nothing in the scene, nothing downloaded), the
instruments add an empty string, and the dusk layer is never set. Tested with a
view with no rescue part, with the real session built with `rescueEnabled:
false`, and by counting the scene's children and the files asked for.
`test-heli-rescue-session`'s fingerprint of the fire session is unchanged.

## Tests

- `test-heli-rescue-view` (176): the model contracts; the switch off; the
  rescuer and pair on the line (clip point, facing, the cable end); the
  hiker (ring on the ground, walking, waving, flare out after 60 s,
  hidden aboard, no sampler); the slide (four lump shapes, rounded and not
  flat, white above and blue-grey below, inside the area, half sunk, mostly
  small and none over about 3 m, thicker down the slope, half as many on
  Performance and when the quality changes; skier rising with the hold, hidden when clipped); the driver; the
  crates resting on the ground and the cable end on a hooked crate; the
  handover for walk, limp and stretcher; the same frames drawn the same;
  the destination buttons with and without a list; the mission line, beacon bar, hold bar, crates, orange, notices, and the
  fire line ignoring a rescue call; the real session's rescue view drawing
  and Later said once.
- `test-fire-view` (50), `test-heli-view` (98), `test-heli-mode` (158),
  `test-heli-rescue-session` (442), `test-heli-fire-session` (79),
  `test-heli-missions`, `test-heli-hooks` (291): pass.
- Browser look check (`RESCUE_VIEW_SHEET=1 node tools/browser-harness.mjs
  scenario rescue-view`, headless, memory-only saves, High quality): passed;
  round 2 sheet in `docs/board/looks/heli-rescue-view/` (RESCUE-PROPS already
  has a `round-2.jpg` in `heli-rescue/`, so this card's sheets live in their own
  folder; round 1's sheet was removed once round 2 replaced it). No frame
  timing (Claude's).
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

- `src/heli/heli-session.js` was touched for the ground sampler (accepted).
- The rescuer's pose is the RESCUE-PEOPLE file's (one arm up on the line, legs
  hanging, the line at his raised hand). Arms out to the casualty and the hook at
  the chest need a change to `tools/blender/rescue-people.py`; here his helmet
  is white, the suit redder and he is 1.25 times life size.
- `public/assets/heli/rescue/debris.glb` (RESCUE-PROPS) is no longer loaded:
  remove it with its part of `rescue-props.py` and `test-blender-output.mjs`.
- The hiker's height while walking is the ground sampler's; without it, the
  clearing's.
- The driver's car is not drawn: the view does not say which car it is.
- The dusk is a dimming layer over the picture behind the panel, not a
  change to the world's lights (render3d's, not this card's).
- The walking pose is the one frozen stride, with a small bob and sway.
- The supply run was pictured at the home pad only; setting a crate down in
  the yard was not pictured.
- A stretcher's casualty is always the driver-lying model, whoever was rescued.
- Performance (half the chunks, half the sprites) is tested but not pictured;
  the frame check (rule 8) over the avalanche is Claude's.

## Gates

Round 2, lane tier on 5531ed5a (`node tools/run-tests.mjs --tier lane --changed
--jobs 4 --keep-going`, PowerShell): 160 passed, 0 failed, 0 not run in 799 s.
`npm run build`: passed. (Round 1: 160 passed in 903 s, build passed.)

## Review (Claude)

Review CLEAR. Applied its one note: the instanced debris meshes are disposed with the scene. The picture recipe stays a recurring browser check, like fire-view. The fourth destination button works once RESCUE-AUTOPILOT (which supplies `view().destinations`) is merged alongside.

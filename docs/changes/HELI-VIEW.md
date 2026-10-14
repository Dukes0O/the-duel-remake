# HELI-VIEW

What the player sees while flying (docs/HELICOPTER.md section 8): the
instruments, the route buttons and the pump, notices, radio subtitles, the
helicopter's pause screen, and the look of each destination from 150 m.

## What landed

- `src/heli/heli-ui.js` and `heli-ui.css`: a cockpit panel along the
  bottom with altitude (feet, and metres below), height above the ground,
  airspeed (knots and m/s), climb rate (ft/min and m/s), an artificial
  horizon, compass heading, rotor speed, fuel (kg and minutes left) and
  weight (now, and the most the rotor can hover here). Low fuel, low rotor
  with the engine out, and too heavy to hover show in orange. Under it the
  autopilot state and the keys P, C and H.
- A FLY TO panel: the three destinations with each leg's fuel, the chosen
  one marked, and at the home pad on the ground a FILL UP button (the
  first tank says it is free; later fills show their price, 1.5 credits a
  kg). The cruise prompt (ENTER) when the helicopter leaves the area.
- Short notices for repairs (with any forgiven part), fuel bought, cruise
  refused, a car that cannot lift, deliveries and the autopilot; the
  instructor's words as a subtitle for 6 seconds, so the radio is followed
  with the sound off too.
- While flying the race HUD steps aside (`heli-active`).
- `src/screen-results.js`: the helicopter's own pause screen, BACK TO
  FLYING and MAIN MENU, no RESTART RUN (the HELI-HOOKS review's note).
- `src/screen-router.js`: mounts the panel and toggles `heli-active`.
- The model: Codex's HELI-ART-SRC is still sourcing, so the plain stand-in
  from HELI-HOOKS stays in development builds. Never at release; the
  model contract is on the HELI-ART-SRC card. When the model passes, it
  replaces the stand-in in `heli-scene.js` (a short follow-up card, since
  this one cannot wait for the art).
- `tools/scenarios/heli-first-flight.mjs`: also checks the pause screen and
  takes each destination from 150 m (a climb at home, then cruise legs to
  Tremblant Snow and Panorama Ridge).

## From 150 m

Claude looked at each destination from 150 m: Tremblant Woods (the circuit,
lake, hills and treeline), Tremblant Snow (snow plain and hills in the
haze) and Panorama Ridge (rolling hills and the rock spires). No edge of
the world shows at that height in any of them, so no ceiling change was
needed in H1. One fix came from the snow picture: the key hints under the
panel were hard to read over white snow and now sit on a dark backing.

## Checks

- `node tools/test-heli-view.mjs`: 67 checks pass. Every gauge equals the
  simulation's own reading (`heliReadout`) after a real flight with a car;
  the warnings; the horizon's direction; repair, fuel, cruise and delivery
  notices; route buttons with leg fuel, the chosen one, the pump's price,
  the free first tank, a full tank, no pump in the air or away from home;
  the four camera views.
- Browser (`node tools/browser-harness.mjs scenario heli-first-flight`,
  private port, memory-only): HELIPAD, the scene, the free tank, lift-off,
  the four views, the pause screen without RESTART, 150 m over all three
  destinations through two cruise legs, back to the menu; 9 pictures, 0
  errors, 0 warnings. Pictures deleted after review.
- Frame check (rule 8, 150 m over Panorama Ridge, Performance and High):
  not run in this lane. Other teams' gates and builds were running the
  whole time, and a frame measurement needs the laptop to itself (rule 7).
  It moves to HELI-FINISH, which runs it when the laptop is quiet.
- The pump label promises exactly what the purchase does: a test compares
  it with the real `buyFuel` in nine cases (short credits, none, fractional
  fuel, the free first tank).
- Review (rule 17): one independent reviewer found two small faults over
  two turns: the pump could promise fuel the player could not pay for (or
  one credit too little for fractional fuel), and the route panel was
  rebuilt every few seconds on the pad, which could swallow a click. Both
  fixed (the pump label mirrors `buyFuel`, and only the label's words
  change) with its notes on the horizon's pivot and the low rotor warning
  on the ground; the reviewer confirmed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  (PowerShell, after merging HELI-DISPATCH in): 48 passed, 0 failed, 0 not
  run in 152.41 s. `npm run build`: passed in 676 ms.

## Changed assertions

- `tools/test-heli-mode.mjs`: the import guard approves the router's two
  new imports (`heli-ui.js`, `heli-ui.css`).

## Race fingerprints

No race code changed. The race HUD is only hidden while the helicopter
status is on.

## Sound cue

None new.

## Removed

Nothing was replaced. The stand-in model goes when HELI-ART-SRC's model
passes (follow-up card).

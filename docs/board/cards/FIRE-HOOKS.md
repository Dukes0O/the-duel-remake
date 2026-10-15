# FIRE-HOOKS

Wire H2 into the game: the session, the board's radio and bucket buttons, play days on profile activation, the race start check, the burnt look in races.

Owner: Claude. Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 8.1, 8.3, 9 and 13. Holds `busy-game-files` once, briefly:
`src/app.js` (play day when a profile becomes active, `courseClosed` on the
race start path, the session's new events) and `src/render3d.js` (one call
into `src/burnt-look.js`). Also `src/heli/heli-session.js`,
`src/heli/heli-board.js`, `src/input-contexts.js` (R and Y), and
`tools/test-heli-fire-session.mjs`. Switch off: race replays, world
signatures and the menu stay exactly as they are.

## Claude answers (14 October): how H2 is wired

- **Switch.** Fire runs only with `helicopter` and `forest-fire` both on.
  Off, the session, board, course menu, race start and sound behave exactly
  as in H1 (the H1 suites pass unchanged).
- **The runner.** `src/heli/heli-fire-run.js` (new) holds the visit's fire
  rules: arming after lesson 4, the call clock, the 20 s answer window, the
  fire's clock, water, out and lost, and what the board and instruments
  read. `heli-session.js` drives it and owns the bucket on its cable.
- **Course models.** Fire grids are built from their own course model at
  the helicopter's seed (`loadFireCourse`, once per course), never from the
  course being flown, so building one never moves the visit. Only a course
  with its burnt look made is built and checked.
- **Play days.** The app notes a play day when a player who has flown
  becomes active on a date (start-up and changing player), so closures count
  days the player only races; a burning fire takes its three day steps
  (`fireOnNewDay`). A player who never flew gains no helicopter field.
- **Engine time** builds up while the engine runs and is saved every 10 s in
  whole chunks (so the save's tenths never stall it): every 90 s is a spread
  step, and it runs down the quiet spell. A cruise leg counts fuel / 0.6.
- **The call.** At each lift-off with a call due, a clock rings once 20 to
  60 s later, 30 m up, never in a lesson. Then the alert tone, Roger's call,
  the fire starts and is saved, and R answers within 20 s; otherwise Roger
  says later, the call waits, and R or the board's Answer button answers it.
  The first lift-off of a visit with a fire burning hears the wind, or a
  reminder while unanswered.
- **Keys.** KeyR is `heli-radio`. On a gamepad the packet's Y is already the
  H1 camera (moving it would change H1), so the radio is the right shoulder
  (button 5). Holding H, or the hook button, pours with the bucket fitted; H
  never unhooks the bucket and no car can be hooked while it hangs.
- **The bucket** is fitted, taken off and repaired from the board on the home
  pad's ground (never with a car on the cable), laid out 6 m to the
  helicopter's right so the cable is slack until lift-off. Its hits dent it
  (saved at once) and charge nothing; the view never shows it as a car.
- **Water.** A drop reaches the fire as a whole: the session gathers a
  drop's wet patches until its last parcel lands, then applies them
  together, so water a cell does not need runs on to the cells round it
  (FIRE-SPREAD). Flown headless a parcel at a time, most of each drop was
  wasted. Out: pay, scar, count and badge in one save step, the quiet spell,
  Roger's out line, Sarah's thanks, the badge chime the first time. Half
  out: Roger once. Lost: the course burns today, Roger's lost line.
- **The autopilot on the fire course** (section 9): with the bucket on, the
  call answered and no other destination, empty it flies to the lake and
  stops 25 m above the water; with water, to the upwind side of the hot edge,
  40 m above the trees, refreshed once a second. Scooping and pouring stay
  the pilot's.
- **Races.** `courseClosed` is checked in `startCampaign`, the one start path
  for single races, Grand Prix events and qualifying, with the course's
  refusal line. `buyBackCourse(id)` is on the app; the router passes
  `forestFire` to the course screen.
- **Sound.** The session's `cue` events play; the steam hiss scales with the
  litres on fire; the crackle (burning cells and distance, within 400 m),
  scoop and pour loops follow the view every frame (`heliAudio.fireBeds`);
  the fire recordings load only when fire is on (`preloadFire`).
- **Left for later, with reasons.** Sarah's regrowth news needs one saved
  field per burnt course (`burnt[course].heard`); EARN-MEDALS holds
  `save-shape` now, so it waits for FIRE-FINISH (the course menu already
  carries the news). The call from `render3d.js` into `burnt-look.js` moves to
  FIRE-VIEW, which writes that file, so no empty drawing module ships here.
  The cable checks tree strikes at the bucket's ring, not its bottom
  (noted by FIRE-BUCKET); FIRE-FINISH tries it in flight.

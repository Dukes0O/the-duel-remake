---
task: LAB-VIEW
status: done
flag: lab
player_facing: no
---

# LAB-VIEW: the Lab screen

Cloud session (Claude Sonnet 5.5), 25 October 2026. Card `docs/board/cards/LAB-VIEW.md`; design `docs/LAB.md` sections 2, 3, 4
and 8. Behind `lab` (dev), with `helicopter` for the flying lessons: nothing changes for players while the switch is off. The
design lead confirmed all seven design picks in writing (recorded on the card under "Claude answers").

## What it does

- **Entry.** A "The Lab" tab in the garage header, and a "The Lab" door on the helipad's instructor board. The door ends the
  helicopter visit (`app.labFromHeli()`, the same `returnToMenu` Race here uses) and opens the Lab, so the Lab never changes a
  flight. No main-menu button. The Lab is a menu-state screen: `app.labOpen`, `openLab()`, `closeLab()`.
- **Board.** The shared lesson board with the four groups. A shut lesson now says why (`note`) instead of "Opens later"
  (`lesson-board.js`, one line; rows without a note print exactly what they did).
- **Benches.** Each lesson has its dials (sliders and choices from the bench's own controls), a Run button, a readout in words
  and units (`readoutRows`, one case per bench, every number the bench's own), Brian's lines (intro on opening, explanation after
  the first run and on "Brian again", pass line on passing) with a caption strip that always shows, and a challenge button.
- **The room.** `src/lab/lab-scene.js`: the hangar and thirteen bench models from `public/assets/models/lab/` on a canvas of the
  Lab's own, the camera gliding to the bench in use (it tries seven angles and takes the first not blocked by a pillar or
  another bench). Moving parts follow the last result (rotor, fan, the pendulum cord that matches the string, the turning arm and
  its plumb bob, the launcher's angle, the fire pit's logs and lid). With the Lab open the game's own renderer does no 3D work
  (`render3d.js`, one line); the Lab's scene, renderer and models are released on close.
- **Challenges.** Launch angles and Strength against weight pass on the bench the moment their goal is met. Rust: after the bench's
  seven days, "Try the challenge" opens the protection picker (below). The six flying lessons (Lift, Projectile, Fire, Pendulums,
  Air and altitude, Headings) take "Try the challenge" to the helipad, start the visit and the challenge (`startChallenge`); if
  the session refuses (a tank not full) the pad's Lab menu shows the reason. G-force arms the lap (below). Ski wax says where it
  is taken (the ski drop). The five wind-tunnel lessons run their benches and Brian explains them; their button reads "Opens with
  tuning" (LAB-TUNE-VIEW turns them on).
- **The G-force lap.** `lab-gforce.js` (pure monitor) and `lab-lap.js` (controller). Fed the race's own numbers once per fixed
  step, read-only: distance along the course, speed, yaw rate, off-road. The push is the bench's own formula (v squared over r,
  with r = speed / yaw rate). A corner counts when 2 g is reached in it on the road and the car leaves it on the road; three
  different corners pass the lesson. The pass is saved through `labCommit`. A strip shows the g, the corners counted and what the
  corner in hand is doing; with the lap armed the menu shows a reminder with a Cancel button.
- **The rust protection challenge.** `lab-workshop.js`: three parts (underbody in salt-water splash, exhaust tucked away dry,
  armour plate in the rain), each a bench jar; the right choice is the least protection that keeps the week's rust at or under 10%
  (zinc where the bare part would rust, bare where it would not). The check shows each part's rust with your choice and bare.
  The lesson texts say "paint" nowhere, as the LAB-RADIO note asks (the bench has no paint jar).
- **Shop.** Every upgrade its lesson opens with price, Buy, owned marks and the reason it is shut; the drop ring and cable
  choices. Buying uses `buyUpgrade` (the price is taken once).
- **Helicopter pad.** `heli-board.js`: a Lab box with the bucket's Water/Retardant buttons (once the tank is owned), the 15 or 25 m
  cable, and the six challenges with Start/Stop/Again and the last refusal's reason. `heli-ui.js`: the door, the challenge line
  with its goal, a Stop button and the challenge notices. `heli-scene.js`: the challenge props (buoys, smoke marker, practice
  fire cells). `heli-fire-view.js`: the litre bar divides by the bucket's own `holds`.
- **`app.js`.** `labEnabled` is now passed to the helicopter session. The new `Lab` block holds `labOpen`, `openLab`, `closeLab`,
  `labFromHeli`, and `labCommit(make)`, the one place the Lab's save calls land.

## A fault found on the way (fixed)

The helicopter session's `persist` and `leave()` copied only `heli` and credits back to the app's profile, so a Lab choice made
in a flight (the cable, a bucket load) and a challenge pass would have been lost. Both now also carry `lab`
(`test-lab-view.mjs` "the helicopter's Lab choices reach the saved profile" fails without it; checked by removing the line).

## Review (one independent reviewer, no edits by them) and what changed

Seven findings, all taken; each fixed with a test that fails without it unless noted:

- **`labOpen` outlived the menu.** Opening the Lab and then starting a race by keyboard (Shift+Tab reached the menu behind) left
  `labOpen` true: the game's renderer rested for the whole race and the Lab popped open again afterwards. `labOpen` is now open
  only while the status is the menu (starting a race or a flight closes it for good), and the Lab traps Tab inside its panel.
- **The G-force lap could never pass on the three off-road courses**: the race's `offRoad` flag is true all the time there. The
  lap now measures the road (`|lateral|` against the road's half width, and the flag).
- **Brian's caption was hidden behind the room's canvas** (same stacking level, canvas later). Fixed; the scenario now checks the
  caption is the top element at its own middle.
- **Scene leaks on failure paths**: a late failed start could orphan a newer room, and a machine with no 3D left a blank canvas
  each open. The room's life is now one small keeper (`createSceneKeeper`) that drops a late start and builds the renderer before
  adding the canvas; both are tested.
- **The fire bar** changed for a damaged bucket with the switch off; it divides by the larger of 600 and `holds`, so a smaller
  bucket reads as before and only a bigger one fills the bar. (Not tested: a drawing detail.)
- **A spin read as cornering, and a refused pass looked saved.** The monitor ignores the push while the car is turned more than
  0.6 rad from the road; if the Lab refuses the pass, the strip says "Passed, but not saved: why".
- **A stale "Fill the tank first"** on the pad menu is dropped once the fuel, the bucket or the challenge in hand changes.

The reviewer also checked and found fine: credit and ownership rules, a newer-version `lab` field refused and never
overwritten, `profile.lab` through a visit, HTML escaping, and the race fingerprint with a mid-race pass (identical over 5,400
steps).

## Settled in writing

The card's questions and the design lead's answers are on the card (`docs/board/cards/LAB-VIEW.md`, "Claude answers"). One
smaller call I made and record here: the heli challenge's refusal reason is kept for the pad menu through
`app.heliChallengeNote` (set by the Lab, read once by the board), instead of adding a notice type to the session.

## Sounds

Brian's lines play by id through `app.audio._playCue`, loaded when first asked for (the Lab's file cues are not in the general
preload). The bench cues (`lab.clunk`, `lab.burner`, `lab.fizz`, `lab.snap`/`lab.creak`, `lab.splash`, `lab.tick`) play on Run
and passing and buying use `interface.bonus`. One line at a time; a muted game still shows the caption. `lab.fan` (a loop) and
the REVERSE sounds are not used here: the fan bench's hum and the secret belong to LAB-TUNE-VIEW and LAB-FAN-VIEW.

## Tests and gates

After merging current `integration/wasteland` (nothing new since the branch point), once:

- `node tools/test-lab-view.mjs`: 29 tests. Highlights: the G-force monitor (3 corners pass, off-road spoils, a corner across
  the start line, no double count); **a race's fingerprint (5,400 steps of an autopilot race, hashed every step) is identical with
  the lap armed and not armed**, with the monitor shown to be watching (peak g above 0.3); the rust answer comes from the bench's
  jars; every lesson has a bench, a challenge kind, three Brian lines and a bench in the room; every bench reads out with no
  NaN; the Lab's save calls through the app; the door and the pad menu; **opening and closing the room twice leaves no
  renderer, canvas, resize listener or frame request** (fake renderer and window; real three.js scene graph), and a room closed
  while its models load frees them when they arrive.
- Browser scenario `node tools/browser-harness.mjs scenario lab-view` (private port, memory-only saves): the Lab tab in the
  garage, the Lab opens with its room, the board lists the lessons, the lift bench with Brian's intro caption and "She stays on
  the pad" at 3,000 kg, the strength hook arm passes and saves, the Heavy hook costs exactly 2,000, the Lab closes and its canvas
  goes, twice. It also counts draw calls: **the game's own canvas draws nothing while the Lab is open** and the Lab's canvas does
  (negative control: with the one render3d line removed the scenario fails, 527 calls). Run here with Chromium and
  `--no-sandbox` (a wrapper script), 0 errors, 0 warnings.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 61 passed, 4 failed (after the review fixes and a second merge of integration). The four are the laptop-only suites
  that cannot run in this cloud environment: `test-drive-through` (needs Windows: its cleanup asserts `win32`),
  `test-course-kit`, `test-earned-cars-ui` and `test-medals` (the same three that failed on the earlier cloud cards before any of
  this branch's files existed). None names a file this card changed. `test-heli-mode` (the import guard) passes **unchanged**:
  the Lab files add no helicopter-file import (the monitor uses the bench's `lateralG`).
- `npm run build` passes.
- Not run here: the laptop-only suites above, any frame check (rule 9: the Lab is not a race), the look of the room (Claude's call;
  the camera views are in the browser scenario's screenshots, not committed).

## Removed

Nothing replaced and nothing removed: every file is new except small named blocks in shared files.

## Notes for the laptop and for Claude

- Shared-file edits, each marked `LAB-VIEW`: `app.js` (imports, constructor, `labEnabled`, two persist lines, the step call, the
  Lab block), `screen-router.js` (import, component, action, one render line), `screen-garage.js` (the tab), `render3d.js` (one
  line), `heli-ui.js` (the door is Claude's file and one line of markup, plus the challenge line and notices), `heli-board.js`,
  `heli-scene.js` and `heli-fire-view.js`. Merge conflicts with ENGINE-CURVE or DEEP-SIRENA-VIEW should be in `app.js` and
  `screen-router.js` only.
- `heli-board.js` and `heli-ui.js` carry the six challenge names in a table of their own (the board is a helicopter rules file by the
  import guard and may not import the Lab).
- Look: the room reads well from the overview and most benches; a few camera views have a pillar close in the foreground (the
  line to the bench is clear, the camera's own surroundings are not checked). Left for Claude's look pass.

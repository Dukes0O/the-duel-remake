# LAB-LOOK

Kyle, 11 November 2026: "I'd start with the lab lessons. we want that environment to be really compelling to learn
from. Both in lesson UX and in UI." This follows his direction of the same day to draw in code before building model
files (`docs/board/decisions.md`).

Owner: Claude (design, the first example of each new thing, every verdict). Sonnet helpers repeat an established
example on further lessons and do the routine fixes. Codex's image tool makes painted pictures.

## What the survey found (a Sonnet helper, 11 November)

- Sixteen lessons, all on the classroom pattern, 236 steps, with sixteen challenges. The structure, the words and
  the numbers are sound and stay as they are.
- Every lesson picture is already drawn in code: one 1000 x 680 board per lesson (`src/lab/lessons/<id>-board.js`)
  through one small shared file, `src/lab/classroom/board-art.js`. No lesson picture is a photo or a model.
- What makes the Lab feel flat is the drawing, not the method: a small diagram in a dark void, thin lines, no light,
  no place; Brian as a rough 3D render 72 pixels wide; three columns of small text.
- The six flying challenges, the lap and the ski run happen in the game's 3D world, where fire and smoke are plain
  squares (`src/heli/heli-scene.js` 120 to 141).

## The look (Claude)

Brian's workshop under one hanging lamp, and the pad outside at dusk. Every board is a place with light in it.

- **The wall:** corrugated steel with rust, a warm pool of lamp light and a dark edge. **The floor:** worn concrete
  with slab joints. Things stand on the floor and cast soft shadows.
- **The subject is drawn as a thing, not an outline:** shaded metal, glass with a reflection, a rotor that blurs,
  lights that blink. It fills as much of the board as the lesson's controls allow.
- **Forces are lit arrows,** one colour each through the whole Lab as LAB.md 12.3 says: lift green, weight red, drag
  orange, grip blue. Air and water are streaks whose length shows speed; dust and spray show where they land.
- **Where a board does not fill its panel,** the wall carries on behind it and the board hangs in a brass frame.
- **Brian is a painted portrait** with four moods the classroom already has (talk, cheer, hint, explain), large
  enough to read his face.
- Nothing about a lesson's steps, words, numbers, controls or hit areas changes in this card.

## Round 1 (Claude, 11 November 2026): the shared art and the Lift lesson

- `src/lab/classroom/board-art.js`: new `background` (the wall), `outdoors` (the pad at dusk), `helicopter` and `car`
  with the same anchor points and sizes as before, and new `floor`, `shadow` and `forceArrow`. The wall and the dusk
  scene are painted once and copied each frame, which costs less than the old background did. All sixteen boards use
  `background`, so all sixteen change with this file.
- `src/lab/lessons/lift-board.js`: the example. Planked crates, a weighing pad on load cells with a hazard edge, a
  brass dial, air that streaks down faster and thicker with lift, dust blown along the pad, lit force arrows, the
  helicopter's shadow shrinking as it climbs, the workshop floor.
- Checks: the lesson tests pass unchanged (no assertion touched). Claude looked at Lift's screens.

## Round 2 (a Sonnet helper; judged by Claude, 11 November 2026)

Brian's four painted portraits are wired in, and five of the six routine fixes are done
(`docs/board/looks/lab-look/round-2.jpg`, `docs/changes/LAB-LOOK.md`). The sixth, removing the old five-step lesson
frame, needs edits in the walking room and the lesson opener and waits for its own small job.

## Round 3 (a Sonnet helper; judged by Claude, 11 November 2026)

Braking, Downforce and Fuel are redrawn to the Lift lesson's standard (`docs/board/looks/lab-look/round-3.jpg`), with
a shared road car, tarmac, posts, steel and lit readouts added to `board-art.js` for later boards to use. Twelve
boards remain: Pendulums, Projectile, Altitude, Strength; Fire, Rust, Wax, Launch; G-force, Grip, Headings, Suspension.

## Round 4 (a Sonnet helper; judged by Claude, 12 November 2026)

Pendulums, Projectile motion, Altitude and Strength are redrawn (`docs/board/looks/lab-look/round-4.jpg`). Eight
boards remain: Fire, Rust, Wax, Launch; G-force, Grip, Headings, Suspension.

## Round 5 (a Sonnet helper; judged by Claude, 12 November 2026)

Fire, Rust, Wax and Launch are redrawn (`docs/board/looks/lab-look/round-5.jpg`). Four boards remain: G-force, Grip,
Headings, Suspension. After those, the lessons whose subjects are small in their boards (Pendulums, Wax, Launch,
the distance strips) want the stage step: a larger board.

## Round 6 (a Sonnet helper; judged by Claude, 12 November 2026)

G-force, Grip, Headings and Suspension are redrawn (`docs/board/looks/lab-look/round-6.jpg`). **All sixteen lesson
boards are now redrawn.** Two old pictures that contradicted their own labels were put right on the way (the
Suspension body's lean and the Grip tyre's direction; see the round's review note).

What is left on this card, in order: the stage step (a larger board, so that the subjects that are small in Pendulums,
Wax, Launch, Grip, Suspension and the distance strips can grow); the small answer-card pictures, which are still
flat; one copy of the crate and weighing pad that Lift and `board-art.js` both hold; the old five-step lesson frame's
removal; the challenges in the 3D world; and the walking hangar.

## Round 7 (a Sonnet helper; judged by Claude, 12 November 2026)

- The small pictures on the answer cards of all sixteen lessons are drawn with the boards' own parts on the workshop
  wall and floor (`cardScene` in `board-art.js`). Every card says what it said before, and no choice is drawn with
  more care than another. No test assertion changed.
- Lift draws its crate and weighing pad through the shared drawing; one copy remains.
- The old five-step lesson frame is removed: `lesson-frame.js`, `lesson-pictures.js`, three modules nothing imported,
  the example hook in `tools/menu-check.js`, its fixture and `tools/test-lab-lesson-frame.mjs`, which tested only the
  removed frame. `lesson-ui.js` keeps what the classrooms, the notebook and the word meanings use.
- Checks on the builder's run: every `tools/test-lab-*.mjs`, all sixteen classroom browser scenarios, `lab-view`,
  `lab-navigation`, `lab-brian-faces`, and `lab-walk` on its one rerun alone (it timed out once while other jobs were
  running, rule 7); lane tier 45 of 45; build.
- Still to do: `docs/lab-lesson-authoring.md` and some old change notes still describe the removed frame. The answer
  cards show at 120 by 60 pixels, so their small text is near 6 pixels; the stage step enlarges them.

## Order of work

1. **Claude looks at every lesson once** with the new shared art and lists what the wall broke (a label that lost
   contrast, a picture that now sits on nothing).
2. **Brian's portraits** (Codex's image tool, then a Sonnet helper wires them in): four moods, shown about 150 pixels
   tall in Brian's panel. The 3D render and `brian-portrait.js` are removed in the same change.
3. **The other fifteen boards** (Sonnet helpers, three lessons a job, Lift as the example): each board gets the
   floor, shadows, lit arrows and its own subject drawn as a thing. Claude judges each lesson from a sheet before it
   merges. A lesson that falls short comes back to Claude, not round a loop.
4. **The stage:** the board fills its panel on a wide window, the physics panel keeps its show and hide, text sizes
   go up one step. One change in `classroom.css` and `fitBoard`, by Claude.
5. **The challenges in the 3D world:** fire, smoke and water drops drawn by `src/world/scrap-look.js` in place of the
   squares (a Sonnet helper, the furnace as the example).
6. **The walking hangar** last, and only if the lessons are done: photo surfaces and lamp light.

## Routine fixes the survey turned up (card LAB-UX-FIXES, a Sonnet helper)

- A lesson's taught words are turned into boxed buttons inside lesson titles on the door board and in the shop
  ("Lift and weight" breaks into pieces). Titles are never broken up.
- G-force's last button reads "Finish the lesson" and then closes the Lab and starts a lap. The button says what it
  does.
- `docs/LAB.md` says the Projectile challenge counts a hit within 5 m and the Fire challenge lasts 3 minutes; the
  game uses 10 m and 420 seconds. It also names `tools/blender/lab.py`, which does not exist. The page is corrected
  to the game.
- Two narrow-window style rules remain (`lab-ui.css` 70, `lab-walk.css` 44). The game is for a laptop; remove them.
- Two near-identical golds and two near-identical off-whites are in use. One of each.
- The older five-step lesson frame (`lesson-frame.js`, `lesson-pictures.js`, the `.lab-teaching` styles) still ships
  with no lesson in it. Remove it if `node tools/repo-audit.mjs` agrees.

## Checks

- Each change: the tests of the lessons whose boards it touches, and their `lab-classroom-<id>` browser scenarios.
- When a batch merges: every `lab-*` browser scenario (rule in Claude's notes for Lab merges).
- Look (Claude): one contact sheet per batch under `docs/board/looks/lab-look/`, with its review note.
- No frame check: the boards are flat pictures and are cheaper to draw than before.

## Removed

Round 1: the brushed-steel background and the outline helicopter and car in `board-art.js`.

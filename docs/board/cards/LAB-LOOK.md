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
- `docs/lab-lesson-authoring.md` described the removed frame and is deleted; its one live part, the three-sentence
  wording rule for classroom lessons, is now `docs/LAB.md` section 13.1. Some old change notes still describe the frame. The answer
  cards show at 120 by 60 pixels, so their small text is near 6 pixels; the stage step enlarges them.

## The stage step, settled (Claude, 12 November 2026)

Sixteen redrawn boards showed the same limit again and again: the subject is small, because each 1000 by 680 board
also holds its tables, readouts, dials and key hints. The board's height is what the screen limits, so hiding a side
panel gains nothing. The cure is a rule about what belongs on the board.

- **The board is for the picture.** The thing being taught, the forces on it, the place it stands in, and the few
  labels that point at parts of it.
- **Numbers and tables leave the board** for a strip of the page under it (HTML, in `classroom-ui.js`): the readouts
  ("Lift 3,887 kg"), the table of the player's results, and the dials' numbers. They keep their words and their live
  values, and the "physics" panel beside the board keeps its formulas. Text in the page is sharper and larger than
  text drawn on a board, and a child can point at it.
- **Controls the player drags stay on the board,** on the thing itself (the lever, the crate, the wing).
- **With the tables gone, the scene grows:** each board's scene scale rises until its subject fills about two thirds
  of the board's width. Hit areas scale with it, in the same change, with the board's hit tests updated and the
  browser scenario proving every control still works.
- **Answer cards grow** from 120 by 60 to 200 by 100 pixels on screen, two to a row.
- Lift is Claude's first example. The others follow by helper, three lessons a job, each judged from a sheet and
  each proved by its own browser scenario. A lesson whose board has no table on it (Headings) only gets larger cards.
- This step changes where things are on screen, so each lesson's test and scenario assertions about positions are
  reviewed by Claude as they change (rule 18). No step, word or number changes.

## Round 8: the stage step on Lift (a Sonnet helper; judged by Claude, 12 November 2026)

Built and merged (`docs/board/looks/lab-look/round-8.jpg`). A board may now export `strip(view)`; the page shows its
readouts and tables under the board, and a board without it looks exactly as before. Lift's scene is 1.55 times its
own size. The helicopter is about a quarter larger on screen.

**What limits the picture:** every board is 1000 by 680, and on a laptop the board's panel is wider than that, so
about 150 pixels stand empty at each side while the strip takes height. A wider board (about 1300 by 680) would use
that width. For Lift it would gain little, because Lift's scene is tall: the helicopter has to climb 10 m inside the
board, and that height, not the width, sets its size. A wide board pays where the scene is long and low: Braking's
and Fuel's strips, Wax's lanes, Launch's flight, Projectile's water. So the next stage-step lessons are those five,
on a wide board, with the readout strip moved beside the board where the panel has room. Claude settles the wide
board's rules on one of them (Braking) before the rest follow by helper.

Also seen: under 1500 pixels of window width, the free-test step's seven buttons wrap onto extra lines and squeeze
the board to almost nothing. That was there before this card and needs its own fix (fewer, shorter buttons on that
step).

## The wide board's rules (settled by Claude, 12 November 2026; Braking is the first build, by a helper)

Every board is 1000 by 680, and the classroom fits that shape into the board's panel (`fitBoard` in
`src/lab/classroom/board-art.js`). On a laptop the panel is about 1,300 wide, so 150 pixels of wall stand at each
side. A wide board takes that width for the picture.

- **A board may name its own size.** A lesson's board exports `size` (`{width, height}`); a board that exports none
  is 1000 by 680 and is drawn exactly as today. The wide board is **1320 by 680**. `fitBoard` fits the size it is
  given, and the classroom's pointer code already converts through what `fitBoard` answers, so hit tests follow.
- **Shared art takes a width.** The wall, the dusk, the floor and anything else in `board-art.js` that assumes 1000
  takes the board's width, with 1000 as its default, so that no other lesson's picture moves by a pixel.
- **The strip stays under the board.** The wide board uses the panel's whole width, so there is no room beside it.
  (This replaces round 8's thought of moving the strip to the side.)
- **The scene grows with the board, not the labels.** On a wide board the scene's scale rises until the subject's
  whole travel fills the width with 40 pixels clear at each end. For Braking that is the road from the braking line
  to the longest stop the lesson allows. Text sizes stay as they are; they are already sized for reading.
- **Numbers leave the board** as round 8 settled: readouts and the table of results go to the strip, and only labels
  that point at a part of the picture stay.
- **Answer cards are not the board's.** (Corrected after the first build: the cards a player picks are HTML buttons
  in Brian's panel, and round 7 already redrew their pictures. The wide board does not change them.)
- **With the physics panel open** the board's panel is narrower than the wide board's shape, so the board is fitted
  by width and the wall shows above and below it. That is accepted; nothing is rearranged.
- **Order:** Braking first, judged by Claude from a sheet at 1536 by 864 and at 1920 by 1080, with the physics panel
  closed and open. Then Fuel, Wax, Launch and Projectile, by helper, each with its own browser check.

Checks for Braking's build, named before code:

1. Braking's own test, with every changed position reviewed by Claude (rule 18); no step, word or number changes.
2. Braking's browser check proves every control still answers where it is drawn.
3. One new check that a board with no `size` is fitted exactly as before, and every other `lab-*` browser check
   passes untouched (memory: when the classroom changes, run them all).
4. The sheet, before and after, at the four views above.

## Round 9: the wide board on Braking (a Sonnet helper; judged by Claude, 12 November 2026): built, not merged

Branch `lab-look/braking-wide` (two commits on top of 131947147; its sheet is
`docs/board/looks/lab-look/round-9.jpg` on that branch). The plumbing is right and can be kept: `fitBoard` takes a
size, the wall and floor take a width, the classroom reads a board's `size`, a board without one is fitted exactly as
before (new check), Braking's readouts and table are in the strip. Braking's own test, the classroom tests, three
browser checks and the build pass on the branch.

Claude's verdict from the sheet: **not yet better than before, so it is not merged.**

- The road is about a third longer on screen and fills the panel's width. That part works.
- The car in the close-up is no larger than before, and it now stands in the left third with empty board beside it.
  The close-up is the thing being taught (weight moving onto the front tyres), so it must grow: about 1.3 times, with
  its two arrows and labels, centred over the road.
- In the free test the table left for the strip and nothing took its place: the top left of the board is empty.
  Bring the close-up car into that space at the larger size.
- Two wordings changed (the strip's hover no longer says "80 m long"; "past the end" is gone). No word may change:
  put both back.
- Only three of the Lab's browser checks were run. All `lab-*` checks are owed before a merge.

Changed assertions on the branch, to be reviewed when it is merged, not before: four hover points and one lever
click moved with what they point at; one hover check became a check of the strip's hint and table title.

Next: the same helper pattern, one more round on that branch with the four fixes above, then all `lab-*` browser
checks, then Claude's verdict from a sheet whose pictures are large enough to read (two views a row, not four).

## Round 10: the wide board on Braking, finished and merged (a Sonnet helper; judged by Claude, 12 November 2026)

Sheet and note: `docs/board/looks/lab-look/round-10.jpg` and `round-10-review.md`. Verdict: **better than the board
before, merged.** The board fills the panel, the close-up car is 1.3 times larger and centred over the road, the
free test has the close-up car where its table was, and "80 m long" and "past the end" are back. The helper played
every step at every speed on all five cars and compared every word with the old board: only the table's column
words differ, because round 8 moved the table to the strip.

**Changed assertions, reviewed by Claude (rule 18).** In `tools/test-lab-classroom-braking.mjs` three hover points
moved with what they point at (the close-up car and its pads from x 300 to x 655, the speed dial from x 780 to
x 1100), and the check that hovering names the table became a check of the strip's hint and the table's title,
because the table is in the strip. In `tools/scenarios/lab-classroom-braking.mjs` the lever is clicked at
(1230, 285) on a board 1320 wide. Each still checks the same thing in its new place; nothing is loosened. Two tests
were added.

Still weak, for the round that does Fuel, Wax, Launch and Projectile:

- The road's own labels (10 m marks, "brakes on", the lane names) are about 10 pixels tall on a laptop. The rule
  that labels keep their size is wrong for these: on a wide board the road's labels go up one step.
- One-lane steps leave bare floor under the road, and past 80 m the road has no marks.
- In the free test the close-up is the Falcone whichever car is chosen.

## Round 11: the wide board on Fuel, Wax, Launch and Projectile (rules settled by Claude, 12 November 2026)

Braking is the example (`src/lab/lessons/braking-board.js`): the board exports `size` (1320 by 680) and
`strip(view)`, its readouts and tables are in the strip, and its scene is scaled so that the subject's whole travel
fills the width with 40 pixels clear at each end. The rules of "The wide board's rules" above stand, with three
added after round 10:

- **No text on a wide board is smaller than 15 board units.** A laptop shows the board at about 0.8 of its drawn
  size, so 15 is 12 pixels on screen. This replaces "labels keep their size" for the small labels (distance marks,
  lane names, "brakes on"). Larger text stays as it is. Braking is brought to this rule in the Fuel and Wax job.
- **The subject is the largest thing on the board** and stands in the middle third. No bare area larger than about
  a quarter of the board.
- **No word, number or step changes.** The builder proves it as round 10 did: every word the old board draws at
  every step and setting is drawn by the new board or its strip.

Two jobs, each a Sonnet helper in its own folder: Fuel and Wax (with Braking's labels); Launch and Projectile.
Checks for each: the lessons' own tests with every moved point listed for Claude's review; every `lab-*` browser
check; lane tier and build; one sheet (before and after of the step that shows the subject best, the free test, one
with the physics panel open, at 1536 by 864, two pictures a row). A lesson whose picture is not better than before
is not merged; the builder says so plainly.

## Round 11, Fuel and Ski wax: merged (a Sonnet helper; judged by Claude, 12 November 2026)

Sheet and note: `docs/board/looks/lab-look/round-11.jpg` and `round-11-review.md`. Both lessons are better than
before. Braking's small labels are at 15. The helper compared every word of the three lessons with the old boards
over 24,000 drawn moments: only table headings moved into the strip's rows.

Accepted differences: the strip's table keeps the last three tests (the old boards kept eleven and six; the lesson
asks for three). One shared change: a strip table's row may wrap its value under its label
(`src/lab/classroom/classroom.css`), because Fuel's and Wax's rows are long.

Put back by Claude at the merge: the helper had widened the hygiene test's rule for sheet names to fit the file name
Claude's brief gave it. The rule stands; the sheet is `round-11.jpg`, and Launch and Projectile's will be
`round-12.jpg`.

**Changed assertions, reviewed by Claude (rule 18).** In `tools/test-lab-classroom-fuel.mjs` eight hover and click
points moved with the tank, scale, can, car panel and jugs they point at, and the lane hover uses the board's own
`lanePoint` because a fixed point missed the free test's single lane. In `tools/test-lab-classroom-wax.mjs` six
points moved right with the tabs and tins. The two scenarios fit a board 1320 wide and click the tap and the medium
tin where they now are. Each checks the same thing in its new place; nothing is loosened. Each lesson gained a test
that no text is under 15 board units at any step.

Still weak: Wax's three-strip step leaves the right third bare; Fuel's free test is one car on a long road; table
rows wrap to two lines at a laptop's width.

## Round 12, Launch and Projectile: merged (a Sonnet helper; judged by Claude, 12 November 2026)

Sheet and note: `docs/board/looks/lab-look/round-12.jpg` and `round-12-review.md`. Launch draws its flights at 21
units to the metre where it drew 9; Projectile at 16 where it drew 12, as high as a 30 m drop on a board 680 tall
allows. The helper compared 14,000 drawn moments with the old boards: no word or number is missing. One shared
change: `outdoors` and `waterBody` in `board-art.js` take a width, 1000 by default.

**Changed assertions, reviewed by Claude (rule 18).** `tools/test-lab-classroom-launch.mjs`: the hovers over the tape
box and the table became checks of the strip's hint, because both moved to the strip; the launcher, deck and flag
hovers moved with the scene and are now written from the scene's own lip, deck and scale; and "the flights stay on
the board" checks every ramp at every dial reading against the scene's own edges where it checked three flights
against fixed numbers, which is stronger. `tools/test-lab-classroom-projectile.mjs`: the buoy hover is taken from
the board's own geometry, and "Show me lands on the board" allows the board's width, 1320, where it allowed 1000.
The two scenarios fit a board 1320 wide, and their click and drag moved with the controls. Nothing is loosened.

## Round 13 (not started; Claude): the physics panel must not shrink the picture

With the physics panel open a wide board is fitted by width and is about a quarter smaller than the old board was,
with text near 8 pixels. "That is accepted" in the wide board's rules above was wrong. The stage changes, not the
boards: when the physics panel is open on a wide board it takes its room from Brian's column (Brian's page narrows
or the physics shows as a tab of his column), so that the picture keeps its width. One change in
`classroom-ui.js` and `classroom.css`, with a sheet of all five wide boards, panel open, before and after.

Also for round 13: Projectile's short falls leave the right of the board to sky and ruler; Launch's job card hides a
rising arc for ramps of 70 degrees or more; Wax's three-strip step leaves the right third bare.

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

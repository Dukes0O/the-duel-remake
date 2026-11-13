# EVERBURN-PLAY-FIXES

From the first play of the whole Everburn in the real game (a helper's scripted drivers on Medium, 12 November 2026):
`docs/board/looks/everburn-play/round-1.jpg`, `round-2.jpg` and `round-1-review.md`, which holds every fault with its
picture and a pointer into the code. Every job, both gas runs and the battle can be finished. A ten-year-old still
could not play the story without help. This card is what stands between the story and its switch.

Owner: Claude (design below, verdict by a second play). Built in two parts that touch different files: **part A**
by Codex (what the screen says and shows), **part B** by a Sonnet helper (where things start and where the camera
stands). Switches: `story-everburn` and `scablands-runs`, both off.

## Settled design (Claude)

### Part A: what the screen says and shows

1. **A caption stays long enough to read.** The job's own clock keeps its 2.2 seconds a line; nothing in the job's
   rules or timing changes. The screen keeps its own queue of the story's captions: each is shown for
   1.2 seconds plus 0.055 seconds a character, no less than 2.5 and no more than 7.5 seconds, one after another in
   the order they were said. If three or more are waiting, each waiting one is shown for its time times 0.7, never
   less than 2.5 seconds. An urgent line (an alarm, a warning to get clear, a line marked urgent on its step) goes
   to the front, and the line it interrupts has had at least 1.5 seconds. The queue empties when the job ends.
2. **"Closer! You're losing him!" is said when the player is losing him.** In a chase the falling-behind line is
   not said in the first 8 seconds, nor until the gap has grown at least 20 m beyond the gap at the start.
3. **No race words in a job.** In a world job the screen never shows LOOSE SURFACE, ROADSIDE AMBUSH AHEAD, KEEP YOUR
   LINE or any other race callout in the caption's place.
4. **The objective is said once.** In a world job the objective shows in the bar at the top only: not under the
   clock and not at the foot of the map panel. Nothing lies over the rear-view mirror.
5. **The clock can be read.** The M MAP button stands under the clock, not on its seconds.
6. **The big map (M) in a world job** draws the job's own ground, as the small panel does, with no oval and no
   FINDS list. In the small panel, names that would print over each other are thinned to the step's main place.
7. **After job 6 the yard points at something real.** The results screen has one BACK TO THE YARD button. In the
   yard, Next up reads "The Everburn is lit. Big Bess is loading gas for Tin Town." with a button STORY WALL when
   `scablands-runs` is on, and "The Everburn is lit. Replay any job from the Story Wall." with the same button when
   it is off. "Drive the Scablands" is said nowhere.

### Part B: where things start and where the camera stands

1. **The camera never sits inside a big machine.** When the chase camera's place falls inside the furnace's or Big
   Bess's body (its box plus 1 m), the camera rises to 2 m above the machine's top and looks down at the player's
   car, and comes back down smoothly when clear. Drawing only.
2. **A job opens looking where the car looks.** At the first frame of every world job the camera stands behind the
   car along the car's own facing. In job 6 the derrick is in the first picture.
3. **Every job starts in the open.** A check for all six jobs, both runs and the battle: the car's start is 3 m
   clear of every solid, and so is the camera's place behind it. Job 2 starts inside Tin Town's gate on open ground,
   facing the forge. Job 5 starts on the road 150 m short of the Dead Mall, facing it, so that Cinder's "Leave the
   car outside" is heard before the mall is reached.
4. **An escort starts beside what it escorts.** In job 4, every gas run and the battle, the car starts 10 m behind
   Big Bess and 6 m to her right, facing along her road. The scripted drivers' tables on RUN-GAS and
   FIELD-BATTLE-ASH are measured again; a target that no longer holds is reported, not hidden.
5. **Job 6's raiders.** No raider appears nearer than 60 m to the car, and the first wave comes after Cinder's
   opening line. When the defence ends, raiders still standing leave or are removed; none is left piled at the well
   during the chase.
6. **Job 4's result line** is "The gas is in Tin Town and the forge is lit."

## Part A result (built by Codex; reviewed by Claude, 12 November 2026): merged

Change note: `docs/changes/EVERBURN-PLAY-FIXES-A.md`. All seven items are built. The caption queue lives in
`src/story/caption-queue.js` and is fed by a one-way notice from the game (`_storyCallout`); the job's clock and
rules are untouched, and the replay fingerprints did not move (297 race and 12 combat checks).

Two points from Claude's review, both made: a wrecked or recovering car still gets its message in a job (only race
words are gone); and the Easy arrows for the furnace's doors and the chimney warning keep their own time and are
dropped once their moment has passed, so that an arrow never points at a door that has shut.

**Changed assertion, reviewed by Claude (rule 18).** `tools/test-world-jobs.mjs` expected the falling-behind line
the instant the leash broke. Item 2 moves that line to eight seconds in and a gap grown by 20 m, so the test now
expects it then; the check that the chase restarts when the leash breaks is as it was. Nothing is loosened.

Checks: Codex's part A test 43, `test-old-smoke` 650, `test-field-battle` 792, `test-run-gas` 1,116,
`test-everburn-easy`, lane tier 108 of 110 on the branch; the two it could not run (`test-warlord-blackiron` 16,
`test-warlord-tollkeeper` 28), seven browser checks (`everburn`, `everburn-play`, `everburn-well`, `run-gas`,
`field-battle`, `scrapdome`, `grand-prix`) and the build on the merged result by Claude.

## Part B result (built by a Sonnet helper; reviewed by Claude, 12 November 2026): merged

Change note: `docs/changes/EVERBURN-PLAY-FIXES-B.md`; sheet `docs/board/looks/everburn-play/round-3.jpg`. All six
items are built. Where the build differs from the design, accepted by Claude:

- The camera stands behind the car's own facing for the whole of a world job, not only its first frame: a camera
  tied to the venue's oval could not show a car that starts across it.
- A gas run and the battle start 13 m behind Big Bess, not 10, because she begins inside the well's 18 m box and at
  10 m the car or its camera is against it. Job 4 keeps 10 m.
- Job 6's raiders come from whichever of four places 64 m out is farthest from the car, at 3 m/s where they came at
  1.5 from 27 m, so that a wave still takes about 21 seconds to arrive.

**The tables, measured again on the same seeds (the car now starts beside Big Bess).** No target is missed and
nothing was retuned. Gas runs, Medium driver who fights: home 10 of 10 on every road and feud as before, and Big
Bess's lowest health on arrival is higher everywhere (Boneyard road at War party 25, was 2). The battle: Easy 10 home,
10 won; Medium who fights 10 home, 8 won (was 9), fire on her 12 to 22 s in 10 of 10; Hard who fights 10 home, 7 won
(was 4), which is the top of its range of 3 to 7. The drivers who never fight are unchanged.

**Changed test input, reviewed by Claude (rule 18).** With raiders coming from far off, the child-pace driver in
`tools/test-everburn-easy.mjs` won job 6 on Easy 0 times in 10: it circled a raider at arm's length, because a car
cannot turn on the spot. The helper changed that driver's defence only: it runs at the nearest raider, and when it
is nearer than 6 m and not lined up it drives off to 28 m and runs at it again. The assertion (8 of 10) is as it
was, and the driver now wins 10 of 10 in 199 s (223 s before). Claude accepts it, because backing off and coming
again is what a child does, with one caution written down: the old driver's failure is a real sign that fighting a
raider at arm's length is awkward, and the second play and a play by hand on Easy must look at it.

**Changed assertions after the merge, by Claude (rule 18).** Moss's "That is his furnace on the road behind us"
was said at the battle's first second, 560 m of road before any furnace is out. It is now said as the furnace comes
out, before Clinker's line, and the battle starts on Moss's Boneyard line. Three checks follow that change: the
battle's start line in `tools/test-field-battle.mjs` and `tools/test-ember-lines.mjs`, the count of the battle's
lines (8, was 7), and the real-game check, which now proves Moss does not name the furnace before it is out, names it
once as it comes out, and does so before Clinker speaks. That last check is stronger than the one it replaces.

Left for other cards: Big Bess starts inside the well's box, so the derrick stands between her and the car at a
run's start (with the well's oversized box, SCABLANDS-LAND); the `tin-town-shell` solid sits 46 m west of the town
that is drawn.

## Not in this card

The Hand Flamer drawn as a launcher tube (art, with the furnace's next look). Driving the Scablands freely.

## Checks (named before code)

- Part A: a test of the caption queue (reading time by length, order, the crowded rule, an urgent line, emptying at
  the job's end) and that the job's timing is untouched (replay fingerprints, `test-old-smoke`, `test-field-battle`,
  `test-run-gas`, `test-everburn-easy` all as they are); a test of the chase's falling-behind rule; tests of the
  yard's Next up in both switch states. Lane tier and build.
- Part B: the start check for every job; the camera rule's own test; the escort tables measured again; lane tier,
  build, and the `everburn`, `everburn-play`, `everburn-well`, `run-gas` and `field-battle` browser checks.
- Then the same helper plays the story again and Claude judges the second pair of sheets.

## Removed

To be listed by each part's change note.

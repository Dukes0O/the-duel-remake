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

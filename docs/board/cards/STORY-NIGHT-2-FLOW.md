# STORY-NIGHT-2-FLOW

Kyle played Night 2 on 19 November 2026. These are his findings that are not dialogue (the dialogue is rewritten on
STORY-DIALOGUE-PLAIN, Claude's). Codex's card, for its cloud. Everything stays behind `story-choices` (dev).

## What to build

1. **Esc frees the mouse without pausing.** While the picture holds the mouse, Esc only releases it; the game keeps
   running. Pause stays on P, and on Esc when the mouse is already free. Update `test-app-lifecycle` and
   `onfoot-controls-camera`, and say so on the **Removed** line ("Esc while captured no longer pauses").
2. **Cold breath that reads as breath.** The puff now looks like a grey blob over people's faces. Make it thin, pale,
   short-lived vapour that leaves the mouth and drifts up and away, never covering the face; or leave it out until it
   reads. Check it on the gate tableau at the approved camera.
3. **No break in the story at the end of the night.**
   - Do not send the player back to the yard when the night ends, and never replay the Wasteland arrival
     ("Outsiders don't find this place...") on the way into a story night; that arrival plays once in a career.
   - Do not stop play with the "What people remember" page. Keep the page, but reach it from the pause menu and the
     Story Wall as the story's journal. At the end of the night, show the ending in the world and one line at the top
     of the screen ("Remembered: the Walkers owe you two nights' watch"), then carry on.
   - When the next chapter exists, the night leads straight into it. Until then, the night ends in the world at dawn
     with a "Continue" that returns to the yard without the arrival.
   - The end-of-replay choice ("which telling stands") still appears, because it needs the player's decision.
4. **The Ash scout.** Kyle could not burn the scout. Check that the "scout-stopped" branch can be reached by hand with
   the hand flamer at its real reach, and show on screen when the scout is in reach. If the design means the scout
   always escapes, say so in the note and Claude decides.

5. **Choices without labels.** Drop the "SAY" and "ASK" labels from the choice bubbles; show the words, with the
   number key small beside them. The talk tests that read the labels change with it.
6. **The Wash camp, from Kyle's play of the fight (Claude's decisions):**
   - **Fire follows the ember.** The Walkers came to Tin Town because they had no fire. Their camp has firelight only
     on branches where they got an ember (the gift, the watch, carrying one out). On the refuse branches the camp is
     dark and cold, in the tower view and at the Wash alike.
   - **The riders lay siege.** One rider circles the camp at about 30 m with its headlights on, so no Walker can slip
     away and so a player can find a dark camp by those lights; the others turn to meet the player. When the fight is
     won, the circling rider breaks off last.
   - **Ash Men on foot can be run down.** The crew who leave a wrecked rider car run for the camp. A hit from the
     player's car stops one for good (no gore: they fall and stay down). Any that reach the camp take it: the Walkers
     are driven off and the ledger records `wash-camp-taken` (the Walkers' word drops one step, and Day 3 reads it).
   - **The camp is solid.** The shelters, carts, crates and fires stop the car; nothing drives through them.
   - **No figure on the player's car.** Kyle's picture shows a person standing in the player's car at the Wash, with
     a brown puff behind. Find which figure it is (a bailing crew member placed at a car's position, a Walker, or the
     player on foot), and put it on the ground beside the car.
7. **The scout and the crew read the same way:** whatever stops an Ash Man on foot at the Wash also works on the scout
   in town (item 4), so the player learns one rule.

## Checks

- `test-night-2` and `test-story-replay-pick` cover the end of the night without the yard and without the arrival;
  the journal opens from the pause menu.
- `test-app-lifecycle`: Esc while captured releases without pausing; Esc while free pauses.
- For Claude to run: the `story-night-2` scenario, a hand play to dawn on each branch, the breath at the gate camera.

Sound: `story.journal.note` for the one-line "Remembered" notice, from the bank's own layers.

## Builder decided (Claude to review)

- **Esc (item 1)** sits behind `story-choices` like the rest: with the switch off, releasing the mouse still pauses, as in the
  released game. `onfoot-controls-camera` now runs with the switch on.
- **The arrival (item 3)** is skipped on every way back to the yard from Night 2 (Continue at dawn, and BACK TO THE YARD from a
  night left unfinished). Other jobs still replay it on their way back; whether it should play only once in a whole career is
  left for Claude.
- **The Remembered line** comes from tonight's ledger: the latest promise or debt; else the Ash Men taking the camp; else the
  latest mark with a page line; else how the Walkers now stand. A scout nobody saw is never named. Five new sentences for the
  last case, one per word (Sworn, Friendly, Strangers, Wary, Cold).
- **The scout (item 4)** can be stopped by rule: he walks 84 m from the pump to the wall at 2.4 m/s (35 s), and the player starts
  9.5 m from him and walks at 4.5 m/s, so he is within the flamer's 6 m in about two seconds. The design does not make him
  always escape. The HUD now says when he is in reach and whether to turn to face him.
- **The siege rider** stands still on its circle while the tower talks, because a talk holds the world still; it drives the
  circle in play. It wears a forward headlight beam as well as its roof lamps.
- **A taken camp** skips Rell's thanks; the win still counts against the Ash Men, but the Walkers' word is not set again.
  The fight is not won while a crewman still runs for the camp; one that cannot move for 4 s has given up.
- **The figure in the car (item 6)** was a crewman from a rider wrecked alongside the player's car: his door point lay inside the
  car (the Wash test reproduced it before the fix). Bailing men are now put on the ground beside the car.

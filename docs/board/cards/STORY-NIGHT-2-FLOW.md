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

## Checks

- `test-night-2` and `test-story-replay-pick` cover the end of the night without the yard and without the arrival;
  the journal opens from the pause menu.
- `test-app-lifecycle`: Esc while captured releases without pausing; Esc while free pauses.
- For Claude to run: the `story-night-2` scenario, a hand play to dawn on each branch, the breath at the gate camera.

Sound: `story.journal.note` for the one-line "Remembered" notice, from the bank's own layers.

# STORY-TALK

The talk screen: a person speaks, the player may ask, then the player decides, with each price shown first. The design
is `docs/story/five-cold-nights.md` (section 2, "The rules that go with it", and the tables of section 4). Codex's card.
Behind the switch `story-choices` (`dev`). It can be built beside STORY-LEDGER; they meet in STORY-NIGHT-2.

## What to build

1. **A scene is data.** A scene has: lines (who, the words, and whether it is said low or on the radio); questions
   that may be asked (the words, the answer's lines, a sentence of what the answer shows, and whether it opens another
   question or changes the odds of a named throw); and choices (the words, the effects, what must be true for the
   choice to be offered, and where it leads).
2. **The rule** in `src/story/talk.js`, pure: lines one at a time, then the questions and the choices together. A
   question costs nothing, can be asked once, and may open another. A choice whose need is not met is still listed,
   greyed, with its reason ("Only if the Walkers are Friendly"), so that a player sees what a friend would have opened.
   Choosing returns the choice and its effects and ends the scene. Nothing changes before that.
3. **The screen** in `src/story/talk-view.js`: the lower third of the screen over the game. A face when there is one
   (STORY-FACES; a name alone when there is not), the name, one line at a time. Space, Enter or a click moves on.
   Questions are listed under "Ask" and choices under "Decide", each with a number key, and each choice has its price
   line under it, from STORY-LEDGER's price function when that exists and from the choice's own text until then.
   The look follows the town's reports and their answers (`src/town/town-reports.js` and its view).
4. **In a job.** A new step kind `talk` in `src/world/jobs/steps/`: while it runs the world waits (nothing moves, no
   night passes), the scene plays, and the step ends with the chosen id for the job to branch on. Outside a job, the
   Story Wall can play a scene the same way.
5. The player can re-read: a key shows the lines already said in this scene.

## What stays fixed

- The screen never changes the game's state. It reports what was chosen; rules act on it.
- Keyboard alone is enough. The mouse also works.
- No line over 260 characters. No line is voiced; the radio's click is used as captions use it today.

## Checks

- New `tools/test-story-talk.mjs`: the order of a scene; a question is free, asked once, and can open another; a choice
  that is not offered cannot be chosen and carries its reason; the chosen effects are returned unchanged; the `talk`
  step holds the world still and ends with the chosen id.
- The suites that own `src/world/jobs/steps/` and the captions, and every older suite that names them.
- For Claude to run: browser scenario `story-talk`, with four pictures: a line with a face, the questions, the decision
  with its prices, a greyed choice with its reason.

Sounds, from the bank's own layers: `story.talk.line` (a soft tick as a line appears), `story.talk.choose` (a match
struck, when a choice is made).

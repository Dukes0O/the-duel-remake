# STORY-TALK

Talk bubbles and thought bubbles. Kyle, 18 November 2026: "I'd rather the mechanics be that the person you're talking
to has got a talk bubble", and the player's own weighing is "a thinking bubble". No panel of text, and no list of
prices: "I don't like the idea of binary prices being presented ... this allows the mystery and the risk and the
uncertainty of the game to be more compelling." The design is `docs/story/five-cold-nights.md`, section 2, "The rules
that go with it", and the tables of section 4. Codex's card. Behind the switch `story-choices` (`dev`). It can be
built beside STORY-LEDGER; they meet in STORY-NIGHT-2.

## What to build

1. **A scene is data.** Lines (who, the words, and whether said low or on the radio). Questions the player may ask
   (the words, the answer's lines, and what the answer changes out of sight or opens). The player's thoughts before the
   decision. Choices: the words; the effects; what must be true for the choice to be there at all; and, for the
   screen, only two things: the *plain* change, if there is one, and one *thought*, if the writer gave one. Everything
   else a choice does is hidden, and the screen is given no way to show it.
2. **The rule** in `src/story/talk.js`, pure: lines one at a time; then the player's thoughts; then the questions and
   the choices together. A question costs nothing, can be asked once, and may open another. A choice whose need is not
   met is not shown at all. Choosing returns the choice and its effects and ends the scene. Nothing changes before that.
3. **Talk bubbles** in `src/story/talk-view.js`: a bubble over the head of the person speaking, fixed to that person in
   the world, with the view turned to frame the speaker and the player's own shoulder or bonnet. One line at a time; Space,
   Enter or a click moves on. The bubble's tail points at the speaker, and it stays on the screen if the speaker is near
   an edge. A line on the radio is a bubble with a jagged edge beside the radio. A line said low is in smaller letters.
4. **Thought bubbles.** The player's thoughts are cloud-edged bubbles at the lower middle of the screen. Before a
   decision one or two appear by themselves. Then the questions ("Ask") and the choices ("Say") are thought bubbles
   too, each with a number key. When a choice has a plain change, the thing itself shows it: the ember count on the
   screen blinks to what it would become while that choice is under the pointer or its number is held. No sentence of
   price is written anywhere.
5. **In a job.** A new step kind `talk` in `src/world/jobs/steps/`: while it runs the world waits (nothing moves, no
   night passes), the scene plays, and the step ends with the chosen id for the job to branch on.
6. A key shows again the lines already said in this scene.

## What stays fixed

- The screen never changes the game's state, and is never handed a hidden effect to show. A check proves the second.
- Keyboard alone is enough. The mouse also works.
- No line over 260 characters. No line is voiced; the radio's click is used as captions use it today.

## Checks

- New `tools/test-story-talk.mjs`: the order of a scene; a question costs nothing, is asked once, and can open another; a
  choice whose need is not met is absent and cannot be chosen; the chosen effects are returned unchanged; what the
  screen is given for a choice holds only its words, its plain change and its thought, whatever else the choice does;
  the `talk` step holds the world still and ends with the chosen id.
- The suites that own `src/world/jobs/steps/` and the captions, and every older suite that names them.
- For Claude to run: browser scenario `story-talk`, with five pictures: a talk bubble over a person at the gate, a
  radio line, the player's two thoughts, the questions and choices as thought bubbles, the ember count blinking under
  a choice.

Sounds, from the bank's own layers: `story.talk.line` (a soft tick as a line appears), `story.thought` (a softer one
for a thought), `story.talk.choose` (a match struck, when a choice is made).

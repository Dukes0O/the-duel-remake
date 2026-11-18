# STORY-NIGHT-2

The first chapter a player can test: **Night 2, Strangers at the gate**, exactly as written in
`docs/story/five-cold-nights.md`, section 4. That section is the specification: every line, every question, every
thought, every choice, and for each choice what is plain to see, what is only a thought and what is kept out of sight. Codex's card, in two slices. Needs STORY-LEDGER and STORY-TALK; slice B needs
ROAD-RIDERS. Behind `story-choices` (`dev`). Kyle tries it only after Claude has played every branch by hand.

## How a player reaches it

With the switch on, the Story Wall shows "Five Cold Nights" and offers Night 2. For now it starts from the example in
the design, with people from STORY-PEOPLE once they exist and today's figures until then: 4 embers, the Ash Men Watching, the Word on the road 0 (Night 1 is not built yet; say so on the wall in one
line). The test page gets a button that makes a temporary player ready for it.

## Slice A: the talk, the four answers, and everything on foot

1. **The scenes as data** in `src/story/scenes/night-2.js`: the lines of section 4 word for word, the four questions
   with what each shows, the four choices with their effects, and each branch's later scenes.
2. **The chapter as a world job** at Tin Town, at dusk and then night (the evening light that exists):
   the hearth, a walk to the gate by the arrow, the talk at the gate, then the branch.
   - **"Take one. No terms."** The named throw for Dace. Kind: the dawn scene with the salt and the boy asleep. Unkind:
     the theft, then **the chase on foot**: Dace runs from the store through the alleys for the open west side and the
     Wash camp, by a way a walker can take. The arrow gives the player both ways (after him, or round by the gate) with
     their metres. Caught within 1.5 m before the Wash: the scene of three choices. Not caught: Rell at dawn.
   - **"For two nights' watch."** The whistle, then **the scout on foot**: an Ash Man leaves the pump lamp for the wall.
     Fire turns him, as it turns every Ash Man in Light the Town. Out by the gate is a win. Over the wall is a loss.
   - **"Come inside."** **A lamp:** a brand from the hearth to the pump lamp, nobody against the player (the lamp, the
     ring and the bar that exist), then the scene at the hearth.
   - **"I can't."** The free line about the Dead Mall. Then the view from the gate tower, Clinker's lines, and three
     answers: watch (a named throw, with odds changed by the Mall line), carry an ember out (**the pot run** that
     exists, 600 m to the Wash camp with riders standing in the way), or drive out and fight (slice B).
3. **The close on every branch:** Auntie Solder's count, banking the hearth, and the page "What people remember" opening
   with tonight's changes marked.
4. **What must be seen:** eleven Walkers and four handcarts at the gate and at the Wash camp (the figures and lean-tos
   that exist; new: a handcart, drawn in code), the gate bell, the ladle, the salt blocks. Dace, Rell and Wim are told
   apart by height and by one colour each.

## Slice B: the fight at the Wash

"Drive out and run the riders off": three riders of ROAD-RIDERS at the Walkers' camp, at night. Won, lost and wrecked
each lead where section 4 says.

## What stays fixed

- The words are the design's. A line that does not fit the screen is reported, not shortened.
- Every effect on the ledger is the one in section 4's tables. The screen shows only the column "Plain to see" and the
  thought; nothing from "Kept out of sight" appears before it happens, and no notice says that luck was thrown.
- A consequence is tied back in a person's line, as section 4 writes it (Dace on the scout, Cinder on the fourth
  night), never by a notice.
- Nothing here touches the remade jobs 1 to 4 or anything saved before.

## Checks

- New `tools/test-night-2.mjs`, stepping the real job without graphics: each of the four answers changes the ledger
  exactly as section 4 says; both answers of each named throw are reached from two seeds; the chase caught and not
  caught; the three choices over Dace; the scout stopped and not stopped; the Mall line changes the Walkers' word and
  the odds; every branch ends with the count, a banked hearth and the page asked for; no line is over 260 characters.
- The card's one scripted play: the watch branch from the hearth to the close, with the scout stopped.
- Every older suite that names Tin Town's lamps, the brand, the pot run or the walker's ways.
- For Claude to run: browser scenario `story-night-2` (the gate, the decision with its prices, the chase, the scout, the
  lamp, the tower's view, the page at the close). Then every branch by hand.

Sounds: `town.gate.bell`, `night.whistle` (Dace), `luck.kind` and `luck.unkind` (two short notes, told apart with eyes
shut), each from the bank's own layers; the pot's, the lamp's and the flamer's cues as they are.

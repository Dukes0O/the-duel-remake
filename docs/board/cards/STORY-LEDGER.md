# STORY-LEDGER

The one ledger for the Wasteland: what the game remembers of a player's choices. The design is
`docs/story/five-cold-nights.md`, sections 2 and 7. Codex's card. Rules and a page; no driving, no browser needed to build.
The first user is STORY-NIGHT-2. Everything is behind a new switch, `story-choices` (`dev`).

## What to build

1. **The ledger** in a new file `src/story/ledger.js`: plain data and pure functions, no drawing, nothing from Three.js.
   - It holds: the night's number; stocks (embers, gas); for each people a word and what is owed either way; the Word
     on the road (0 to 5); marks (ids of things done); things made; and the seed for luck.
   - The words for friends, in order: Sworn, Friendly, Strangers, Wary, Cold. For a people at feud: Watching, Raiding,
     Hunting, War party (the words `src/story/ember-save.js` has already; do not change that file's saved shape).
   - **Effects** are small named changes that a choice lists: embers and gas up or down, a people's word up, down or set,
     the Word on the road, a feud step, a mark, a debt ("the Walkers owe you two nights' watch"), a promise with the
     night it falls due, a thing made. One function applies a list of effects and returns the new ledger and a list of
     what changed, in order, for the screen.
   - **The price, in words.** One function turns a choice's effects into the line shown before it is chosen, from the
     ledger as it stands: "Embers 4 to 3. They will owe you a watch." The numbers come from the ledger, never from text.
   - **Luck.** One function answers a named throw ("night-2/dace") with odds, from the ledger's seed and the name. The
     same save gives the same answer every time; a different seed may give the other. It returns the answer and the
     words for the odds (Unlikely, Could go either way, Likely).
   - **Night.** Banking the hearth burns the night's embers (one, and what the ledger says is added), moves the night
     on, and reports promises that fell due.
2. **People** in `src/story/people.js`: one list of ids and names used by every story (the Walkers, Rell, Dace, Wim, Auntie
   Solder, Cinder, the Ash Men, Clinker, the Deck Folk, Dot). Scenes name people only by these ids.
3. **Saving.** One optional entry under the player's story, registered with `registerStory` in `src/story/story-save.js`
   as the other stories are. Loading a save that has no ledger adds nothing. Writing the ledger changes no other entry.
4. **The page "What people remember"** on the Story Wall (`src/story/ledger-ui.js`): the stocks with "Enough for N
   nights", each people met with its word and what is owed, the Word on the road in words, and each mark as its plain
   sentence. It can be opened at any time, and a scene can ask for it to open with tonight's changes marked.
5. **The "Because" line.** When a scene acts on a mark, it can show "Because" and that mark's sentence, through the
   caption the game has already.

## What stays fixed

- No saved field of any other story changes. If one seems to need changing, stop with CARD BLOCKED: saves wait for Kyle.
- The view never changes the ledger. Only the rules do, from a choice the player made.
- Every sentence a player reads is whole, plain and under 260 characters.

## Checks

- New `tools/test-story-ledger.mjs`: effects apply in order and stay inside their limits; the price line is right for
  three ledgers; a named throw is the same on every call for one save and differs between some two seeds; banking burns
  the right count and reports a promise due; a save with other stories in it is byte for byte the same in every other
  entry after the ledger is written; a save without a ledger loads with none added.
- `tools/test-story-save.mjs` (or whichever suite owns `story-save.js`) and every older suite that names it.
- One independent review of the saved shape, as rule 17 asks for saves.
- For Claude to run: browser scenario `story-ledger` (the page with an example ledger).

Sound: `story.ledger.open`, a soft page turn made from the bank's own layers. No other new cue.

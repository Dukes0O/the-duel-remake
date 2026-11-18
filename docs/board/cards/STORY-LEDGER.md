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
   - **What is plain, and nothing else.** One function answers, for a choice, the only thing the screen may show
     before it is chosen: what a stock would become ("embers 4 to 3"), or nothing. Words, feuds, the Word on the road,
     marks and luck are never given to the screen ahead of a choice (Kyle, 18 November: no list of prices; "you might
     just have to find that out").
   - **Where a thing came from.** Every change the ledger makes keeps the id of the choice that caused it, and the
     night. A later scene can ask "what began this?" and get the choice back, so that a person can say it in a line:
     "You shut your gate on him." A consequence is *told* once a scene has said so; until then the page does not show it.
   - **Luck.** One function answers a named throw ("night-2/dace") with odds, from the ledger's seed and the name. The
     same save gives the same answer every time; a different seed may give the other. It returns the answer only. No
     odds are ever shown to a player.
   - **Night.** Banking the hearth burns the night's embers (one, and what the ledger says is added), moves the night
     on, and reports promises that fell due.
2. **People** in `src/story/people.js`: one list of ids and names used by every story (the Walkers, Rell, Dace, Wim, Auntie
   Solder, Cinder, the Ash Men, Clinker, the Deck Folk, Dot). Scenes name people only by these ids.
3. **Saving.** One optional entry under the player's story, registered with `registerStory` in `src/story/story-save.js`
   as the other stories are. Loading a save that has no ledger adds nothing. Writing the ledger changes no other entry.
4. **The page "What people remember"** on the Story Wall (`src/story/ledger-ui.js`). It shows only what the player
   would know: the stocks with "Enough for N nights"; what was promised and what is owed, as sentences; each people
   met, with the last thing they said or did to your face; and each consequence that has been *told*, with the choice
   it came from ("The Walkers ride with the Ash Men. It began the night you shut the gate."). It never shows the Word
   on the road, a feud's step, a throw of luck, or a consequence nobody has told yet. It can be opened at any time.

## What stays fixed

- No saved field of any other story changes. If one seems to need changing, stop with CARD BLOCKED: saves wait for Kyle.
- The view never changes the ledger. Only the rules do, from a choice the player made.
- Every sentence a player reads is whole, plain and under 260 characters.

## Checks

- New `tools/test-story-ledger.mjs`: effects apply in order and stay inside their limits; the plain change is right for
  three ledgers and is empty for a choice that moves only hidden things; every change can be traced to its choice; the
  page's data holds nothing hidden and no consequence that has not been told; a named throw is the same on every call for one save and differs between some two seeds; banking burns
  the right count and reports a promise due; a save with other stories in it is byte for byte the same in every other
  entry after the ledger is written; a save without a ledger loads with none added.
- `tools/test-story-save.mjs` (or whichever suite owns `story-save.js`) and every older suite that names it.
- One independent review of the saved shape, as rule 17 asks for saves.
- For Claude to run: browser scenario `story-ledger` (the page with an example ledger).

Sound: `story.ledger.open`, a soft page turn made from the bank's own layers. No other new cue.

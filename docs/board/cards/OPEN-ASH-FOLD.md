# OPEN-ASH-FOLD

The short board entry controls current state, ownership, dependencies and locks.

Owner: Claude. Rule 23: everything here is behind `story-choices` (still `dev`), changes no save and no pay, and
changes nothing the Road Rats' turn does today.

## What to do

Fold the Ash Men's turn of "Smoke over a friend" (`src/story/threads/content/burned-camp-ash-men.js`, page
`docs/story/threads/burned-camp-ash-men.md`, card OPEN-WRITE-4) into the burned camp's own file, so that one file holds
both turns, and delete the separate file and page in the same change.

1. Every beat, line, thought, thing to find, question and choice of the Ash Men's file moves into
   `src/story/threads/content/burned-camp.js` with its words unchanged. Each Ash Men row keeps its `when` (`ASH` or
   `BLAMED`), and the `grey-*`, `false-trail` and `false-rim` beats move as they are.
2. One copy of each choice the Ash Men's file marks as shared (`notes.sameAsRoadRats`: `raise-party`, `stay-inside`).
   `cannot` is one choice with its Ash Men effects under `ASH`; OPEN-BURNED-RESCUE adds the Road Rats' effects beside
   them.
3. The page becomes `docs/story/threads/burned-camp.md`, the page of the storyline file, with every word kept.

## Settled before code

- **The Road Rats' rows that an Ash Men row replaces** get `when: RATS` (`{cast: 'enemy', is: 'road-rats'}`), so that
  the two turns never show at once: the keeper's line at the sign, the smashed frames, the lamp, the narrow tracks, the
  ruts, Cinder's, Auntie Solder's and Rell's answers, Moss's question about narrow tracks, the two thoughts of the
  decision and the choice to follow the tracks. The bean pods, the pump, the drive home and the drive on are both
  turns', as the Ash Men's page says. A question asked the same way in both turns keeps one id in each turn's row,
  because only one of the two is ever offered.
- **The cast, the start and the sign stay the Road Rats'.** The register's casting (`src/story/threads/cast.js`) asks
  one condition of every candidate, and it cannot ask "the Ash Men only after the mark `ash-raid`". The Ash Men's
  enemy row, their start and their sign's one night are kept word for word in the storyline's `notes.ashMenTurn`, for
  the card that writes `ash-raid` and lets a role ask a condition of one candidate. Until then the Ash Men are never
  cast, so every `ASH` row waits, exactly as the separate file waited unloaded.
- **Shared beats** (`home`, `rescue`, `gate`) hold the Ash Men's rows now. `home` keeps its note that OPEN-BURNED-RESCUE
  builds the Road Rats' Scene 5 on it; `rescue` keeps the Ash Men's mission, which OPEN-BURNED-RESCUE makes the
  Road Rats' too.
- **The `later` rows** become rows of people's talk tables (`src/world/open/content/talk-threads.js`), which ask only
  facts of the land. Seven Ash Men rows ask who was cast or a promise falling due. As `dace-goes-looking.js` does,
  each such row's `when` asks the land's nearest fact (the mark `ash-raid`, nothing writes it yet; the promise; the
  mark `went-to-grey-camp` for the false trail) and `notes.laterWhen` keeps the storyline's own condition. Two rows
  said by "any trader" name the register's `traders`, as the other storylines do.
- **Mission kinds not built yet:** `fight` (`grey-alone`), `creep` (`grey-creep`, `grey-break-out`) and `rescue`
  (`rescue`). OPEN-BURNED-PEN builds `fight` and `creep` for the Road Rats; OPEN-BURNED-RESCUE builds `rescue`. Each
  such beat's `notes.builtBy` names the card. A mission whose kind is not built prepares no route, so its beat waits.

## Files

`src/story/threads/content/burned-camp.js`; deleted `src/story/threads/content/burned-camp-ash-men.js`;
`docs/story/threads/burned-camp.md` (new, from the Ash Men's page); deleted `docs/story/threads/burned-camp-ash-men.md`;
`tools/test-thread-shape.mjs`, `tools/test-open-missions.mjs` (its list of stub beats), and any other suite in `tools/`
that names either file. No lock.

## Checks

1. `node tools/test-thread-shape.mjs`, with the burned camp's counts the sum of the two files' less the shared rows
   kept once.
2. `node tools/thread-crossings.mjs --check` reports only the stubs `alone` and `drain` (OPEN-BURNED-PEN) and nothing
   new.
3. `node tools/test-open-missions.mjs` and `node tools/test-burned-camp.mjs`, unchanged.
4. Rule 23's set: `node tools/run-tests.mjs --jobs 2 --filter core --filter test-replays --filter test-combat-replays
   --filter test-world-composition --filter test-burned-camp --filter test-thread-shape`, and `npm run build`.

No sound cue is added: the Ash Men's cues (`open.ash.bell`, `open.furnace.door`) move with their rows.

# OPEN-WRITE-4

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session writes this.** Cut on 25 November 2026, for the second of Kyle's two days on the open
Scablands. Design: `docs/story/open-scablands.md`, section 21 in full (above all "When the enemy is the Ash Men" and
"When there is a false trail"), section 18 with "The one shape of a storyline's file" and "Added to the shape", and
the story pages it names.

## What to write

**Smoke over a friend, the Ash Men's turn,** in full, as section 21 writes the Road Rats' turn: every scene from the
smoke to what becomes of the camp, for the case where the role `enemy` is cast as the Ash Men; and the false trail's
drive to the Grey Camp, where there is no pen.

- **The Grey Camp** as the place it is: on the burn, a ring of ash banks for a pen, captives carrying coal for the
  furnace, Old Smoke's people at home. Read `docs/story/five-cold-nights.md`, `docs/story/the-long-dry.md` and what the
  pages say of Clinker, Old Smoke and the Ash Men, and keep to it. The Ash Men put fires out and are proud of it; they
  take a camp's fire as well as its people; their price is embers only.
- **Every scene's choices** have costs a player can weigh, at least one has no best answer, and danger is felt in play.
  Nobody dies, nothing saved is wiped, and no screen says the game is over.
- **During Five Cold Nights** this turn can only come after the Ash Men's raid on Day 4. Say what the parley of the
  fifth night reads from each ending.

## Files

New: `docs/story/threads/burned-camp-ash-men.md` (the page, in the form of section 21) and
`src/story/threads/content/burned-camp-ash-men.js`, a data file in the one shape that holds only the beats, lines and
choices that differ from the Road Rats' turn, each with `when: {cast: 'enemy', is: 'ash-men'}`. OPEN-THREADS is
building the burned camp's own file today (`src/story/threads/content/burned-camp.js`); do not edit it. A later card
folds this file into it. List any new name under "New names".

## Rules for the writing

Every line is a whole plain sentence a person would say (Kyle, 19 November 2026; read
`docs/story/night-2-lines-review.md`), with no em dash. Talk bubbles and thought bubbles only, and nothing shown that a
person standing there would not know. The player is about twelve. A reason before every fight. Three short sittings at
most.

## Checks

`checkThread` on the data file reports nothing but new names; `node tools/thread-crossings.mjs`; `node tools/test-board.mjs`;
`node tools/test-repo-hygiene.mjs`; `npm run build`. Read every line against the rules above before handing over.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-WRITE-4`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` to "Claude (cloud)" with the date. Questions go to
`docs/board/questions/OPEN-WRITE-4.md` with your pick, and you carry on. Ask Kyle nothing. Write
`docs/changes/OPEN-WRITE-4.md`, push, and open one pull request into `integration/wasteland`. After that the card is
finished: do not wait for review comments. The repository is public. Never merge, and never push
`integration/wasteland` or `master`.

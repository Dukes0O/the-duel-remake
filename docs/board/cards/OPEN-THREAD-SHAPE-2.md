# OPEN-THREAD-SHAPE-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (Kyle, 20 November 2026: Sol builds what is not graphics or physics; 25 November 2026: further
rounds go to Codex). Cut on 25 November 2026 from Claude's answers to OPEN-THREAD-SHAPE's questions.

## What to build

OPEN-THREAD-SHAPE brought the nine storylines in `src/story/threads/content/` to the one shape of
`docs/story/open-scablands.md` section 18, and put word for word under `notes` everything the shape could not yet
say. Section 18 now has a part, "Added to the shape on 25 November 2026", with a key for each of those needs.

1. **Lift every such thing out of `notes` and into its key,** in all nine files, as that table says. What is listed
   there as "kept in `notes` for now" stays. Delete the repeated copies of a mark's sentence.
2. **Teach `checkThread`** (`src/world/open/check-tables.js`) each new key and condition (`sign`, `ended`, `reach` to a
   person, a role cast from persons or peoples, or `'sign'`, the five parts of the day, `TIN_TOWN_SPOTS`), and to refuse
   a beat that leads to an end and is not reached.
3. **Add `TIN_TOWN_SPOTS`** to `src/world/open/register.js`, the seven spot names only.

Nothing a player reads changes: the same strings as before, each the same number of times, less the deleted repeats.

## Files and locks

The nine files, `src/world/open/check-tables.js`, `src/world/open/register.js` (one list),
`tools/test-thread-shape.mjs`, `tools/test-open-shared.mjs`. No lock. OPEN-THREADS builds the storyline rule at the
same time; tell it nothing, and edit none of its files.

## Checks

1. The string comparison of OPEN-THREAD-SHAPE, before and after: nothing missing, nothing extra but the deleted
   repeats, which are listed.
2. `checkThread` reports nothing on all nine; `node tools/thread-crossings.mjs --check` reports no fault but the two
   that are expected until OPEN-BURNED-SCOUT and OPEN-BURNED-RESCUE build the scenes they lead to (the burned camp's
   beats `scout` and `home` have no way out yet);
   `tools/test-thread-shape.mjs` keeps its counts and refuses one misspelt new key.
3. Rule 23: `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-shared --filter test-thread-shape --filter test-thread-crossings`
   and `npm run build`.

## Sound cues

None.

## Claude answers (26 November 2026, morning)

**Mechanics with no key** (Dace's trouble call, the hauler's checkpoint exclusion, the runaway's search and hiding):
your pick. They stay word for word in `notes` for the cards that build those missions, and this card uses the
approved keys wherever they say the writer's intent.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), section 18; it wins over this card where they
differ. Everything is behind `story-choices`; nothing loads these files in play yet. Stay inside the files named here.
Questions go to `docs/board/questions/OPEN-THREAD-SHAPE-2.md` on the branch with your pick, and you carry on.
Write `docs/changes/OPEN-THREAD-SHAPE-2.md` with a **Removed** line. After the pull request is open the card is
finished: do not wait for review comments.

# OPEN-THREAD-SHAPE

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session builds this, on Sonnet.** Cut on 25 November 2026. Design: `docs/story/open-scablands.md`,
section 18 and its part "The one shape of a storyline's file", which is the whole specification.

## Why

Nine storylines were written in full by three writers at the same time (`src/story/threads/content/`, with their pages
in `docs/story/threads/`). Where section 18 was not yet specific, each writer chose a different word for the same
need: where a choice leads, a condition on a line, the sentence a mark shows, a mission's numbers. One storyline rule
cannot read three dialects. The shape is now written, and this card brings every file to it.

## What to build

1. **Bring the nine data files to the one shape.** Nothing a player reads may change: every spoken line, thought,
   question, choice and ledger sentence stays word for word, and so does who says it and when. Only the keys that
   carry them change. The three dialects, file by file:
   - *stranded-hauler, dry-pump, dace-goes-looking:* `act` becomes `by`; `when` on a choice stays; the `marks` table at
     the foot becomes `text` on each mark effect; `next` lists stay; `rolls` become effects with a `draw` in their
     `when`; `afterwards.rows` and `later` become the top-level `later`; `{banked: n}` becomes `{nights: n}`;
     `is` on a role goes and the person is named; `rumour` on a row becomes the `rumour` effect; `mission` with
     `kind` on the beat becomes the `mission` object.
   - *radio-hill-voice, lights-on-the-whites, runaway:* every hand-written `thread` effect becomes `next`; `does`
     becomes `words` with `by: 'do'` or `'go'`; `needs` becomes `when` (a list becomes `all`, a question's id becomes
     `{asked: id}`); `only` on a role goes and the site is named; `job` becomes the `mission` object, with its numbers
     under `rule`; `effectsWhen` becomes `when` on each effect; `tiedBack` and `ignored.later` become the top-level
     `later`, and each prose `where` becomes a person (`by`) and a condition (`when`); a table of lines by people
     becomes lines with `when: {cast, is}`; `castWhen` becomes `late: true` with `cast` on the choice or outcome that
     fills the role.
   - *mall-road-toll, market-day, somebody-elses-flag:* `needs` becomes `when`; `for` becomes `when: {cast, is}`;
     `end` and `ends` become `next`; `steps`, `kept` and `leftOut` become effects with `when`; `fight`, `lookout`,
     `squeeze` and `offer` go under the `mission` object (its `kind`, and their numbers under `rule`); `tiedBack` and
     `ignored.told` become the top-level `later`; `not` on a role becomes `apartFrom`; `at` on a beat becomes a
     `reach` or a `part` in its `when`.
   - *In all nine:* a place is `'@role'`, an id, or `[place, spot]`; a car wrecked in a mission is not written (it is
     the open land's own rule); whatever the shape has no key for and the builder still needs goes under `notes`, in
     the writer's own words.
2. **Hold the files to the shape.** `checkThread` in `src/world/open/check-tables.js` refuses a key that the shape does
   not have, on the storyline, a role, the sign, a beat, a line, a thought, a question, a thing to find, a mend, a
   choice, a mission, an outcome, a `later` row and `ignored`, and says which key and where. It reads the new
   conditions (`reach`, `after`, `nights`, `seconds`, `part`, `cast`, `asked`, `found`, `chose`, `due`) and checks that
   each names a beat, a role, a question, a thing or a choice that the file has. `next` names a beat or an end. Do not
   change `checkFact`, `checkEffect` or anything else in `src/world/open/`.
3. **Bring the nine pages into step** only where a page shows a key: the pages are prose and tables, and almost
   nothing in them changes.

## Files and locks

The nine files in `src/story/threads/content/`; `checkThread` and its helpers in `src/world/open/check-tables.js`;
`tools/test-open-shared.mjs` (the storyline in it is brought to the shape, and a refused key is asserted);
`tools/test-thread-shape.mjs` (new). No lock. OPEN-THREADS builds the storyline rule at the same time, against the
shape and not against these files; do not edit its files.

## Checks

1. **Nothing a player reads has changed.** Before the first edit, write every string of each file that holds a space
   (with the path of keys that leads to it) to a scratch file that is not committed. After the last edit, the same
   strings are there, each once for each time it was there before. `tools/test-thread-shape.mjs` keeps the count of
   lines, thoughts, questions and choices of each file as numbers, so that a later edit that drops one is seen.
2. `checkThread` reports nothing on any of the nine, and `tools/test-thread-shape.mjs` shows that it refuses one key
   of each dialect.
3. `node tools/test-open-shared.mjs`, `node tools/test-board.mjs`, `node tools/test-repo-hygiene.mjs`, `npm run build`.

Rule 23 (behind an off switch; nothing loads these files yet): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-open-shared --filter test-thread-shape`.

## Sound cues

None.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-THREAD-SHAPE`, cut from `origin/integration/wasteland`.
The first commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files
named here. Never wait on a question: write it to `docs/board/questions/OPEN-THREAD-SHAPE.md` (what needs deciding,
the options, your pick), push, and carry on with your pick. Where the shape has no way to say something a file says,
that is a question for the file: write it there, put the thing under `notes`, and carry on. Ask Kyle nothing and leave
him nothing to do. Write `docs/changes/OPEN-THREAD-SHAPE.md` (15 lines at most, with a **Removed** line), push, and
open one pull request into `integration/wasteland` that says what was built, each check and its result with the
commit, "For Claude to run", and what is not right yet. Then watch the pull request for review comments and act on
them. The repository is public: no key, address, account or amount of money goes into it. Never merge, and never push
`integration/wasteland` or `master`.

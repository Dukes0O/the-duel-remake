# OPEN-CROSSINGS

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session builds this, on Sonnet** (Kyle, 25 November 2026: two days of work on the open Scablands,
mostly in the cloud). Design: `docs/story/open-scablands.md` sections 12, 18 and 19.

## Why

Thirteen storylines are being written by several writers at once. Two storylines cross because a fact written by one
is read by another, and no storyline's file names another. So nobody can see the crossings by reading one file. This
tool reads all of them and shows where they touch, and finds the slips that only show when they are read together.

## What to build

One tool, `node tools/thread-crossings.mjs`, with no dependency beyond Node. It loads the default export of every file
in `src/story/threads/content/`, and works when there are none.

1. **Each storyline is checked** with `checkThread` (`src/world/open/check-tables.js`), and every sentence it returns
   is printed under the storyline's title.
2. **The table of reads and writes.** For each storyline: its kind, and what it reads and writes, gathered by walking
   the file (every object with `fact`, and every effect under `effects` or `gives`) and not from its `reads` and
   `writes` lists alone. A fact or an effect is named with its key where it has one: `word of glasshouse`,
   `feud of road-rats`, `mark burned-camp/drove-on`, `stage of a camp` (a role, where the storyline does not name the
   site), `found radio-hill`, `favour of walkers`, `stock embers`, `scrap`.
3. **The crossings.** For each such key: who writes it and who reads it. Printed as rows of "writer, the fact, reader".
   Two lists follow. *Read and never written:* a mark that a storyline reads and that no storyline writes (a table of
   the land may write it, so this is a warning and it names where it is read). *Written and never read:* for the
   writers to see what nobody has used yet.
4. **Every storyline is walked without graphics.** Its beats and ends are a graph. An edge runs from a beat along its
   `next`, along each choice's `next`, and along the `next` of each outcome of its mission (section 18, "The one
   shape of a storyline's file"; a `next` may be a list of `{when, to}`). Until OPEN-THREAD-SHAPE has merged, some
   files still write an edge as a `thread` effect or as `end`: follow those too, and list each under "not yet in the
   shape". Reported: an end that no path reaches; a beat that no path reaches; a beat with no way out
   that is not an end.
5. **A page to look at.** `--html <file>` writes one page that stands alone, with an inline SVG: the storylines as
   boxes round a ring, one line for each crossing with the fact written on it, and the tables below. Without a file
   name it writes `.qa-dist/thread-crossings.html`. The page is plain: system fonts, light and dark, no script needed
   to read it.
6. **`--check`** exits with 1 when a storyline fails `checkThread` or the walk finds a fault, and with 0 otherwise.

## Files and locks

New: `tools/thread-crossings.mjs`, `tools/test-thread-crossings.mjs`. No lock. Do not edit `src/world/open/` or any
storyline's file: a slip found in a storyline is reported in the pull request for its writer.

## Checks

1. `tools/test-thread-crossings.mjs`, with small storylines made in the test itself: a crossing between two is found
   in both directions of the table; a mark read and never written is listed; an end that cannot be reached, a beat
   that cannot be reached and a beat with no way out are each reported; `--check` exits as item 6 says; the page is
   written, holds one `<svg>`, and names every storyline.
2. Run the tool on the real folder and put what it prints in the pull request.
3. `node tools/test-open-shared.mjs`, `node tools/test-repo-hygiene.mjs` and `npm run build`.

## Sound cues

None.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-CROSSINGS`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here.
Never wait on a question: write it to `docs/board/questions/OPEN-CROSSINGS.md` (what needs deciding, the options, your pick),
push, and carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-CROSSINGS.md` (15
lines at most, with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what
was built, each check and its result with the commit, "For Claude to run", and what is not right yet. Then watch the
pull request for review comments and act on them. The repository is public: no key, address, account or amount of money
goes into it. Never merge, and never push `integration/wasteland` or `master`.

# OPEN-WRITE-1

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session writes this, on Fable** (Kyle, 25 November 2026: two days of work on the open Scablands, mostly
in the cloud). Design: `docs/story/open-scablands.md`, all of it, and above all sections 12, 17, 18, 19 and 21.

## What to write

Three storylines of section 19, each in full, as a page and a data file.

| Id | Title | Kind | What section 19 fixes | Notes for the writer |
| --- | --- | --- | --- | --- |
| `stranded-hauler` | The stranded hauler | A stranger | A car with its bonnet up at a checkpoint. Stop for a stranger who may be bait. It leaves a trader who comes to the gate with goods and news, or an ambush survived | Whether it is bait is a named draw, more likely as the Road Rats' feud rises. A careful player can read tells before stopping, as the burned camp's six things are read. The trader has a name, a trade and a way of talking. Promised crossing: a trader who was helped has left cart tracks at a burned camp and can be asked what was seen |
| `dry-pump` | The dry pump | A need | A camp needs a part that only the Dead Mall has. Spend the day's outing on somebody else's water. It leaves a camp Sworn and a way into the Dead Mall learnt | The camp is a role: any found camp. The trip into the Mall is driven and then walked, with something to lose. "A way into the Dead Mall" is a mark that a later trip there can read |
| `dace-goes-looking` | Dace goes looking | A need | Dace, if he owes the player, asks for the old pickup and two days. Let a boy of fourteen drive out alone. It leaves a site found by somebody else and a short log of how it went, or a boy to fetch home | It needs the Walkers living inside the fence or Friendly. How it goes is a named draw that the player's own choices weight: what was mended on the pickup, what he was told, whether a radio check was agreed. The log is read at the hearth in Dace's own words. Fetching him home is a drive |

## Files and locks

New: `docs/story/threads/stranded-hauler.md`, `docs/story/threads/dry-pump.md`,
`docs/story/threads/dace-goes-looking.md`, and the three data files of the same names under
`src/story/threads/content/`. No lock. OPEN-WRITE-2 and OPEN-WRITE-3 write six other storylines at the same time; read
their rows in section 19 and write no file of theirs.

## What each page holds

One page for each storyline, at `docs/story/threads/<id>.md`, in the form of `docs/story/open-scablands.md` section 21,
which is the worked example. In this order:

1. A table of what the storyline reads and what it writes.
2. When it can begin, in the facts of section 12, and its sign: one of the seven kinds in section 18.
3. Its cast as roles (section 18, part 2) and the people in it. A storyline tied to one place may name that place.
4. "Where things stand, in this example": the one state of the land and the ledger that the scenes are written for.
5. Scenes. Each has what the player sees and hears, the thoughts, the talk, a table of choices with section 21's
   columns (You do, Plain to see, Your thought, Kept out of sight), and the ledger when the player leaves.
6. How you can lose. What it costs never to follow the sign. What this changes later.
7. For each fact it reads: what happens when nobody ever wrote that fact. Every storyline can be played alone.
8. Crossings: at least three rows of "when this has happened, this changes", each a fact that this storyline writes and
   another could read, or a fact that it reads. Section 19's second table gives the rows already promised.
9. What it takes to play, in sittings. What it needs made, new or in hand. Sound cues, named `open.<thing>.<event>`,
   with one line each.
10. New names: every person, people, place, scarce thing and mark the page brings in, with one line each. Claude
    joins these to the register when the card merges.

## The data file

One file for each storyline, at `src/story/threads/content/<id>.js`, with a default export in the shape of section 18:
`id`, `title`, `kind`, `reads`, `writes`, `cast`, `starts`, `sign`, `beats`, `ends`, and `ignored` (what happens when the
sign is never followed). It uses only the facts and the effects of section 12. Every line a player reads is in the
file exactly as the page has it, with role names put in as `{camp.leader}`. Nothing loads the file yet; OPEN-THREADS
will.

## Rules for the writing

- **No storyline's file names another storyline.** The page may, in its crossings. A mark begins with the storyline's
  own id: `<id>/<what-was-done>`.
- **Every line is a whole plain sentence that a person would say** (Kyle, 19 November 2026): no fragments, no em dash,
  nothing clipped. Read `docs/story/night-2-lines-review.md` first. The player is about twelve and is not talked down to.
- **Talk bubbles and thought bubbles only, and nothing is shown that a person standing there would not know**
  (`docs/story/five-cold-nights.md`, section 2).
- **Real choices** (Kyle, 18 November 2026). Each choice has a cost the player can weigh before choosing. At least one
  choice in each storyline has no best answer. Where it can be, a choice is made by going somewhere or doing something.
- **Danger is felt in play.** At least one scene is driven or walked with something to lose. Nobody dies, nothing saved
  is wiped and no screen says the game is over.
- **A reason before a fight** (Kyle, 11 November 2026): the player knows who is being fought, and why, before it starts.
- **It uses what stands.** The places, peoples and people of `docs/story/the-long-dry.md`,
  `docs/story/five-cold-nights.md` and `docs/WASTELAND_WORLD.md`, and the parts in section 11's table. A storyline that
  needs something the game cannot do yet says so in "What it needs made", and needs one such thing at most.
- **Three sittings of about ten minutes at most,** which may be days apart. One keyboard, one player at a time.
- **The join with the town comes later** (Kyle, 21 November 2026): no well is claimed, no fence built and no tower
  raised here. A page may say what the join will add.

## Checks

1. Each data file loads: `node -e "import('./src/story/threads/content/<id>.js').then(m=>console.log(m.default.id))"`.
2. `node tools/test-board.mjs`, `node tools/test-repo-hygiene.mjs` and `npm run build`.
3. When `src/world/open/check-tables.js` is on `origin/integration/wasteland` (card OPEN-SHARED, due within hours of
   this card starting), merge `origin/integration/wasteland` and run its `checkThread` on each file, and mend what it
   reports. If it has not arrived when the pages are done, say so in the pull request and hand over.
4. Read every line aloud in your head against the rules above before handing over, and say in the pull request that
   this was done.

## Rules for every cloud card of the open Scablands

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-WRITE-1`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here.
Never wait on a question: write it to `docs/board/questions/OPEN-WRITE-1.md` (what needs deciding, the options, your pick),
push, and carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-WRITE-1.md` (15
lines at most, with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what
was written, each check and its result with the commit, "For Claude to run", and what is not right yet. Then watch the
pull request for review comments and act on them. The repository is public: no key, address, account or amount of money
goes into it. Never merge, and never push `integration/wasteland` or `master`.

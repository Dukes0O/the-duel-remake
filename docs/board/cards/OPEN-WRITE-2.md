# OPEN-WRITE-2

The short board entry controls current state, ownership, dependencies and locks.

**A Claude cloud session writes this, on Fable** (Kyle, 25 November 2026: two days of work on the open Scablands, mostly
in the cloud). Design: `docs/story/open-scablands.md`, all of it, and above all sections 12, 17, 18, 19 and 21.

## What to write

Three storylines of section 19, each in full, as a page and a data file.

| Id | Title | Kind | What section 19 fixes | Notes for the writer |
| --- | --- | --- | --- | --- |
| `radio-hill-voice` | The voice on Radio Hill | A find | A voice on the car's radio at night, giving bearings. Trust a voice you cannot see, and drive where it says. It leaves Radio Hill found, or a trap sprung, and later warnings of riders | Hetty and Bern keep the mast (section 16). Somebody else may have a radio too, and a careful listener can tell the voices apart. Promised crossing: when Radio Hill is Friendly, every sign that is a call reaches the player wherever the car is |
| `lights-on-the-whites` | Lights on the Whites | A find | Lamps moving on the salt at night, far off. Follow lights that lead away from every road. It leaves the Deck Folk's lost shore party, and the way into Ships in the Sand | Read `docs/story/ships-in-the-sand.md` and keep to its people. The salt pan is real ground in the game (`src/world/scablands-regions.js`), flat and without landmarks, so losing the way back is the danger |
| `runaway` | The runaway | A stranger | A grey boy hiding in a shed in Tin Town. Hide somebody who has left the Ash Men, hand him back, or send him on. It leaves a stoker who knows the Grey Camp from inside, and Clinker's anger | Read what the story pages say of Clinker and Old Smoke and keep to it. During Five Cold Nights this crosses the main story: say what the parley of the fifth night would read. Promised crossing: a runaway who was hidden draws the Grey Camp's back way in the dirt, and a rescue party's odds are better |

## Files and locks

New: `docs/story/threads/radio-hill-voice.md`, `docs/story/threads/lights-on-the-whites.md`,
`docs/story/threads/runaway.md`, and the three data files of the same names under `src/story/threads/content/`. No
lock. OPEN-WRITE-1 and OPEN-WRITE-3 write six other storylines at the same time; read their rows in section 19 and
write no file of theirs.

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

**Roles, as `checkThread` holds them** (added 25 November 2026, after the card started; section 18 has the example).
In a condition or an effect a role of the cast is written with an at sign: `{type: 'site', id: '@camp', stage:
'burned'}`, `{type: 'word', person: '@camp.people', by: 1}`, `{fact: 'feud', of: '@enemy', atLeast: 'Raiding'}`. In a
line a role has four words: `{camp.name}`, `{camp.people}`, `{camp.leader}`, `{camp.thing}`. A favour is owed by a
people, not a person. A draw is named short (`start`); the game puts the storyline and the night in front of it. A
thread effect moves only to a beat or an end that the file has.

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

Read `AGENTS.md` first. Work only on the branch `cloud/OPEN-WRITE-2`, cut from `origin/integration/wasteland`. The first
commit sets this card's `claimed_by` on the board to "Claude (cloud)" with the date. Stay inside the files named here.
Never wait on a question: write it to `docs/board/questions/OPEN-WRITE-2.md` (what needs deciding, the options, your pick),
push, and carry on with your pick. Ask Kyle nothing and leave him nothing to do. Write `docs/changes/OPEN-WRITE-2.md` (15
lines at most, with a **Removed** line), push, and open one pull request into `integration/wasteland` that says what
was written, each check and its result with the commit, "For Claude to run", and what is not right yet. Then watch the
pull request for review comments and act on them. The repository is public: no key, address, account or amount of money
goes into it. Never merge, and never push `integration/wasteland` or `master`.

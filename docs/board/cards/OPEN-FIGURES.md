# OPEN-FIGURES

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics. Reviewed on 21 November 2026 when the Bowl
fix cards moved to Sol: this card stays with Astra, because all of it is new figures modelled by a Blender recipe,
their poses and a look sheet).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## Re-cut on 25 November 2026: read this first

OPEN-FIGURES-2 is built at the same time (Kyle, 25 November 2026). Keep this card's rows of `PROFILES` and its poses
in one block each, so that the two branches join without a clash; the laptop joins them at the merge.

## What to build

Section 13, and `five-cold-nights.md` section 16 ("Moss, Odessa as figures").

Five figures by the method that made the Walkers (`tools/blender/story-walkers.py`, `tools/art/story-people-poses.mjs`),
each told apart at twenty metres by shape and colour, gritty and never toy-like:

- **Odessa:** broad, a welder's apron, a mask pushed up on her head, gloves. Tasks: weld, inspect, carry.
- **Moss:** tall and stooped, overalls with gas stains, a rag in a back pocket. Tasks: scrub with a long brush, carry
  a bucket, sit.
- **Three townspeople,** two adults and one child, who can cook, haul a sack, sit and sleep.

Each gets a row in `PROFILES` (`src/world/jobs/story-people.js`) and the task poses named above in the view.

## Files and locks

`tools/blender/story-walkers.py` (or a sibling recipe beside it), `tools/art/story-people-poses.mjs`, the figure
files the game loads under `public/assets/`, the `PROFILES` rows in `src/world/jobs/story-people.js`, the poses in
`src/world/story-people-view.js`, `tools/scenarios/story-people.mjs`, `tools/test-story-people.mjs`. No lock.

## Checks

1. `tools/test-story-people.mjs`: the five new ids load, with heights and paces in a person's range, and every task
   named above has a pose.
2. One comparison sheet (JPG, 500 KB at most) in `docs/board/looks/open-people/round-1.jpg`: each figure standing,
   walking and at each task, beside Rell for scale. Claude judges it.
3. `tools/test-blender-output.mjs` counts as a heavy job; take a turn as `docs/FACTORY.md` section 8 says.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition`
with a `--filter` for each suite named above, and `npm run build`. It merges when that is green. Claude drives it in
the merged batch.

## Sound cues

None.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), the sections this card names; it wins over this
card where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off
may change. A rule is a plain function that returns new data and reads no graphics. Every draw is a named draw from the
save's seed (`src/rng.js`, as `namedThrow` in `src/story/ledger.js`). Every position is written with `land.at` or
`land.between` (`src/world/scablands-names.js`). Content is rows in tables: adding a person, a building, a checkpoint, a
site or a thread must need no change to a rule. Every word a player reads is a whole plain sentence with no em dash.
Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to review)"
and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search `tools/` for
every older suite and scenario that names what this card changes, and run them. Checks use memory-only saves. Do not
clean up anything in Claude's scratchpad. A commit from the lane needs approval: rerun git and ask for it. Write
`docs/changes/OPEN-FIGURES.md` with a **Removed** line.

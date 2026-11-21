# OPEN-FIGURES-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics. Reviewed on 21 November 2026 when the Bowl
fix cards moved to Sol: this card stays with Astra, because all of it is new figures modelled by a Blender recipe,
their poses and a look sheet).
[STORY-OPEN-WORLD](STORY-OPEN-WORLD.md) cut this card from `docs/story/open-scablands.md`.

## What to build

Sections 16 and 21 ("What it needs made").

By the method that made the Walkers, each told apart at twenty metres, gritty and never toy-like:

- **Marigold:** sixty, wide, a sun hat made from a hubcap liner, earth to the elbows. Stands with her hands on her hips.
- **Finch:** twelve, thin, a satchel of bean pods, a driver's goggles too big for him.
- **Three growers,** who can hoe, carry a glass frame between two, sit and walk with hands tied in front.
- **Hetty and Bern** of Radio Hill: sisters in their fifties, one with headphones round her neck, one with a coil of wire.
- **Sump:** broad and cheerful, a coat sewn from seat covers, a ledger book under one arm.
- **Two Road Rats on foot:** one who carries a lamp on a pole, one who stands lookout.

Rows in `PROFILES` and the task poses named above.

## Files and locks

The same files as OPEN-FIGURES. Build after OPEN-FIGURES has merged, because both edit `PROFILES`. No lock.

## Checks

1. `tools/test-story-people.mjs`: the new ids load and every task named above has a pose.
2. One comparison sheet in `docs/board/looks/open-people/round-2.jpg`, beside Rell for scale. Claude judges it.
3. `tools/test-blender-output.mjs` counts as a heavy job.

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
`docs/changes/OPEN-FIGURES-2.md` with a **Removed** line.

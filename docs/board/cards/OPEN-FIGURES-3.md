# OPEN-FIGURES-3

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Astra** (Kyle, 20 November 2026: Astra builds graphics). Cut on 25 November 2026 from Claude's verdicts
on the first two rounds of the open Scablands' people.

## What to build

The second round of the fifteen figures of OPEN-FIGURES and OPEN-FIGURES-2, from the two verdicts:
[round 1](../looks/open-people/round-1-review.md) and [round 2](../looks/open-people/round-2-review.md). Read both
first; they say what passes and must stay, and what does not. Gritty, never toy-like, and each told apart at twenty
metres.

1. **Sump's coat, first.** It must not read as blocks strapped to a chest. A long coat with sleeves, sewn from large
   panels of worn seat vinyl and cloth in several dull colours, with piping and a split seam or two.
2. **Odessa:** a leather apron that hangs, creases at the waist and has a neck strap; welding gloves with cuffs and
   fingers; a cap that sits on a head.
3. **The sack** in every "haul" pose: soft, tied at the neck, sagging over the shoulder.
4. **The porter:** the tan shape round the shoulders becomes a carrying yoke with two ends and a load, or goes.
5. **The cook:** no dark ring round the hat.
6. **Moss:** the dark oval on the apron becomes a pocket with a rag, or goes.
7. **Sleep:** the sleeper lies on one side, or sits against something that is drawn. Nobody sleeps sitting in the air.
8. **Wear and colour:** Grower 2's green and Hetty's blue apron are dulled and worn. Hetty's headphones are large
   enough to see round her neck at the sheet's size.
9. **The Road Rats:** rust red stays their colour. The one repeated block pattern goes; vary what the red is on.

Do not change a figure's id, height, width or pace, a task's name, or a pose that the verdicts say reads.

## Files and locks

`tools/blender/open-figures.py`, `tools/blender/open-figures-2.py`, the two models they make
(`public/assets/models/wasteland/town/open-figures.glb`,
`public/assets/models/wasteland/scablands/open-figures-2.glb`), the sleep pose and the props in
`src/world/story-people-view.js`, `tools/art/story-people-poses.mjs`, `tools/test-story-people.mjs`. No lock.

## Checks

1. `tools/test-story-people.mjs`: every id still loads and every task still has its pose.
2. One comparison sheet, `docs/board/looks/open-people/round-3.jpg` (500 KB at most), beside Rell, with the
   twenty-metre crops, and with Sump from the front and the side. It replaces `round-1.jpg` and `round-2.jpg`, which
   are removed in the same change (one sheet a round). Claude judges it.
3. `tools/test-blender-output.mjs` counts as a heavy job.

Rule 23 (behind an off switch): the checks above, then
`node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-story-people`
and `npm run build`. It merges when that is green. Claude drives it in the merged batch.

## Sound cues

None.

## Rules for every open Scablands card

Design: [docs/story/open-scablands.md](../../story/open-scablands.md), sections 13, 16 and 21; it wins over this card
where they differ. Everything is behind `story-choices`, and nothing the released game does with that switch off may
change. Stay inside the files named here. If another file is needed, write the choice under "Codex decided (Claude to
review)" and carry on, unless it touches saves or a released course; then stop and say so. Before CARD DONE, search
`tools/` for every older suite and scenario that names what this card changes, and run them. Checks use memory-only
saves. Write `docs/changes/OPEN-FIGURES-3.md` with a **Removed** line.

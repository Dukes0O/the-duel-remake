# BOWL-SCREEN-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (words and panels on the Bowl's screen). Faults from Claude's batch drive of the merged game at
`57e478340` (20 November 2026; pictures in `.evidence/2026-11-20/batch-1/` of the integration folder). Design:
[BOWL-SHOW-2](BOWL-SHOW-2.md), sections 1, 3 and 5.

## What to build

1. **The pancake has no label.** Big Mo says it, but nothing appears over the truck. Show "PANCAKE x3" as a trick pop-up.
2. **Two totals in Car Crush.** The strip counts past its goal ("CRUSHED 15 OF 13") and the card says "of 31". Once the goal
   is met the strip reads "CRUSHED 15 OF 31 · GOAL MET".
3. **A driver who stops crushing gets no help.** Holding W with no steering crushes five in 5 seconds and then circles for
   55 seconds. After 8 seconds without a crush, Big Mo gives one line naming the nearest piece ("Steer for the Bus Pile!"),
   and an edge arrow points at it until the next crush.
4. **The old "JUMP PEAK / HEIGHT ABOVE GROUND" panel** still shows at the right in every Bowl event and covers a rival's
   label. Hide it in the Bowl.
5. **The gate arrow and its sign sit in the middle of the screen,** over the truck and the road ahead, large enough to
   hide a parked car. Put the sign and distance in the strip and keep only a small arrow at the screen's edge, or over the
   gate itself when the gate is in view.
6. **"NOT ENOUGH AIR"** pops up when the truck drives over a parked car outside. No jump messages outside the arena unless
   the truck really left the ground by a metre or more.
7. **"+150 NOTORIETY · FINISH TO KEEP",** a line from another mode, appears when a rival is thrown out of the Bowl. It must
   never show in the Bowl.

## Files and locks

`src/bowl/bowl-hud.js`, `src/bowl/bowl-screens.js`, `src/bowl/bowl-lines.js`, and the one condition where the
ordinary HUD draws the jump panel and the notoriety line (name the file in the change note), `tools/test-bowl-hud.mjs`.
Locks: `bowl-screens`.

## Checks

1. `tools/test-bowl-hud.mjs`: each of the seven, as a check on the real screen state.
2. Laptop only, Claude runs with the next batch drive.

## Sound cues

`bowl.crush.hint` (Big Mo's nudge after 8 seconds without a crush; stand-in `interface.radar`).

Behind `titan-bowl`. Tested and merged under AGENTS rule 23, recorded in `docs/changes/BOWL-SCREEN-FIX.md` with a Removed line.
Memory-only saves. No new dependency, network request or key.

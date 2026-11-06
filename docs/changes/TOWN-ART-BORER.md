# TOWN-ART-BORER round 2

Reworked the cutter face with eight forged spokes, separate round cutter discs
and housings, hollow scoop cheeks, a deeper rim, and larger flange bolts. The
head pivot is placed on the cutter axis and turned 12 degrees. Changed the
machine material sources to worn yellow steel and dark rusted steel, removing
the explicit blue paint source. Added the generated documentary photo reference
and its credit, and kept the reference crop beside the exported model on the
sheet.

The model is 37,304 triangles and 2,714,308 bytes. It remains below the card's
40,000 triangle and 4 MB limits. Blender exported and re-imported the GLB for
the round-2 render. `node tools/test-blender-output.mjs` passed 297 checks after
adding assertions that every borer primitive exposes only TEXCOORD_0 with a
non-degenerate UV range read from the exported binary. This is a stricter
acceptance check, not a loosened assertion. `node tools/test-repo-hygiene.mjs`
passed. No lane tier or build was run, as required for art cards.

**Claude should look at:** `docs/board/looks/town-art-borer/round-2.jpg` and
the exported GLB, especially the cutter visibility, pink face smear, and
disconnected gantry. The sheet does not include the requested side, overhead,
portal or tunnel-ring views. Self-review verdict: fail; this round is an
incomplete recovery and does not claim visual acceptance.

Changed assertions: added borer TEXCOORD_0 and UV range checks. No replay
fingerprints or race rules changed. Browser checks and game look checks were
not run because this card is not wired into the game.

## Removed

- Removed the round-1 look sheet and its review note.
- Replaced the borer's blue paint texture source with worn yellow steel.

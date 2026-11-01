# WATER-YARD-ART

Round 1 of three (card `docs/board/cards/WATER-YARD-ART.md`, packet
`docs/story/wasteland-water-road.md` sections 2 and 11). Claude (Director), 1 November 2026.
Not wired into the game: the card that shows the stages in the yard (WATER-SCREENS) comes
later. Nothing in `src/` changed.

## What changed

- New recipe `tools/blender/water-works.py`. It builds the camp's water works as one group,
  `public/assets/models/wasteland/scrapdome/water-works.glb`, from plain shapes and painted
  textures it makes itself (no stock art, no downloads). Every part of the group is its own
  named node so the game can show or hide each one by chapter.
- The group is about 29 m wide, 13 m deep and 11 m tall (the tower). Its front is the -Z
  side, so seen from the gate the well is on the left and the camp tap on the right.
- Suggested place in the yard (gate-local metres, same frame as `yard.glb`, heading 0):
  position (-4, 0, 31), no turn. That is the open ground between the gate and the first wreck
  banks (x -19 to 11, z 30 to 43), in view of the home camera, and clear of the barrier line at
  z 48. The wiring card checks it against the real ground.
- Nodes, by chapter (from packet section 2):

  | Node | Shown |
  | --- | --- |
  | `well`, `pump`, `pump-house`, `truck-bay`, `tower`, `camp-tap` | always |
  | `pipe-cut`, `valve-missing`, `boiler-cold` | chapter 0, until replaced |
  | `pipe-patched` | chapter 1 on (replaces `pipe-cut`) |
  | `pump-fuel` | chapter 2 on |
  | `valve` | chapter 3 on (replaces `valve-missing`) |
  | `pump-house-roof` | chapter 4 on |
  | `boiler-lit` | chapter 5 on (replaces `boiler-cold`) |
  | `water-truck` | chapter 6 on |
  | `tower-water-1` to `tower-water-8` | exactly one at a time: level n after chapter n for n 1 to 6, level 7 (painted top line) after chapter 7, level 8 (brim full) after chapter 8; none in chapter 0 |
  | `well-water`, `tap-running` | chapter 8 |

  The root empty is `water-works`. A node that replaces another (cut and patched pipe, missing
  and fitted valve, cold and lit boiler) holds its own full copy, so the game hides one and
  shows the other.
- Review sheet: `docs/board/looks/water-works/round-1.jpg` (nine chapters, same view), with
  `round-1.md` and `round-1-sheet.py` (puts the nine pictures together). The pictures come
  from `blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works`.
- `tools/test-blender-output.mjs` lists the new recipe like the other yard recipe.

## Checks

- `node tools/test-blender-output.mjs`: 144 checks, 0 failed (the new recipe plans its paths
  without Blender, keeps its editable file in ignored `art-build/`, and its GLB exists).
- `node tools/test-repo-hygiene.mjs`: passed (sizes are advisory).
- Recipe run in Blender 4.5 (`blender -b --python tools/blender/water-works.py -- --root .`):
  exports the GLB, 22,636 triangles for all nodes together (about 18,000 at the last chapter,
  because the cut pipe, missing valve, cold boiler and the lower water heights are hidden then).
  GLB 1,909,796 bytes, eleven small painted textures. Imported back into Blender: one root
  `water-works` with the 25 named children, vertex colours and the boiler glow survive.
- Nine chapter pictures rendered from the same scene and put on `round-1.jpg` (about 422 KB).
- Not run, on purpose: the full lane tier and build (no `src/` change, nothing wired in), and
  any frame check (the group is not in the game).

## Changed assertions

None. The only test edit is one new line in the list of recipes in
`tools/test-blender-output.mjs`.

## Removed

Nothing. No old model, test or tool is replaced.

## Open

- Round 1 of 3. Pictures go to Kyle with a pick; round 2 and 3 fix what he marks.
- No frame check yet: the group is not in the game. The wiring card does it.
- Smoke from the lit boiler is left out on purpose (a flat smoke shape would look cartoonish).

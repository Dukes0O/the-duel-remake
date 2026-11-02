# WATER-YARD-ART

Rounds 1, 2 and 3 of three (card `docs/board/cards/WATER-YARD-ART.md`, packet
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
  `round-1-review.md` and `round-1-sheet.py` (puts the nine pictures together). The pictures come
  from `blender -b --python tools/blender/water-works.py -- --root . --render .qa-dist/water-works`.
- `tools/test-blender-output.mjs` lists the new recipe like the other yard recipe.

## Round 2 (1 November 2026)

Claude judged round 1: the look is right, keep the layout and node names. Round 2 fixes, in order:

- Fire: `boiler-lit` has a deep orange firebox with a yellow core, glowing coals and grate, a soft
  orange glow on the ground and boiler front (stacked see-through planes), a soot-dark chimney cap
  and a thin dark smoke wisp.
- Water: dark blue-green water with a lighter surface ring. The tower window is now a narrow
  riveted slot with a red top line and a bright float marker that rises with each level; an open
  hatch at the top shows the surface at levels 7 and 8; level 8 has an overflow trickle and a
  puddle on the deck.
- Ending: `well-water` sits near the rim with a dripping full bucket; `tap-running` is a clear
  stream into a full trough with a ragged wet patch on the ground.
- Bigger changes: thick bright patch collar with clamps and a new post; six jerry cans and two
  hoses; larger bright red valve wheel; pale new galvanised roof with bright rivets; the truck
  now stands in front of the bay (east of the pump house) so its tank and cab show. This is the
  one layout change: the truck is no longer under the bay roof.
- Ground, in the pictures only: paler dirt, damp patches and tyre ruts.
- Recipe: `--closeups` renders seven close-ups, `--close-only NAME` and `--no-chapters` for quick
  looks. New `docs/board/looks/water-works/round-2-sheet.py`, `round-2.jpg` (3 by 3, 452 KB),
  `round-2-close.jpg` (close-ups, 491 KB) and `round-2-review.md`.
- GLB 1,979,172 bytes (under 2 MB); 23,974 triangles for all nodes together.

Round 2 checks: `node tools/test-blender-output.mjs` and `node tools/test-repo-hygiene.mjs` (see
Checks). Round 2 renders waited out the release full tier (hold in the inbox) and the two-heavy-job
limit.

## Round 3 (1 November 2026, final, round 2 picked)

Small polish only, as Claude asked:

- Patch collar on `pipe-patched`: dark steel grey, bright silver weld beads, darker clamps with
  silver bolts. New `steel` and `silver` materials; the shared `bare` material stays for the roof
  rivets and slot rivets.
- Smoke: the wisp is removed. Soft puffs were tried and looked like a chain of beads from the sheet
  camera, so the boiler has no smoke (stained cap and soot band stay).
- Coals: round flattened mounds, not boxes.
- Valve wheel: true deep red.
- Sheet `round-3.jpg` (451 KB), `round-3-review.md`, `round-3-sheet.py`. GLB 1,957,092 bytes, smaller than
  round 2 (1,979,172): texture quality 60 and fewer roof rivets paid for the new shapes.

## Checks

- `node tools/test-blender-output.mjs`: 144 checks, 0 failed (the new recipe plans its paths
  without Blender, keeps its editable file in ignored `art-build/`, and its GLB exists).
- `node tools/test-repo-hygiene.mjs`: passed (sizes are advisory).
- Recipe run in Blender 4.5 (`blender -b --python tools/blender/water-works.py -- --root .`):
  exports the GLB, 22,636 triangles for all nodes together (about 18,000 at the last chapter,
  because the cut pipe, missing valve, cold boiler and the lower water heights are hidden then).
  GLB 1,909,796 bytes, eleven small painted textures. Imported back into Blender: one root
  `water-works` with the 25 named children, vertex colours and the boiler glow survive.
- Round 1: nine chapter pictures on `round-1.jpg` (about 422 KB). GLB then 1,909,796 bytes, 22,636 triangles.
- Not run, on purpose: the full lane tier and build (no `src/` change, nothing wired in), and
  any frame check (the group is not in the game).

## Changed assertions

None loosened. Two small test-file edits: one new line in the list of recipes in
`tools/test-blender-output.mjs`, and `tools/test-repo-hygiene.mjs` now also accepts a look sheet
named `round-N-close.jpg` (the second, close-up sheet of a round), same folder and size rules.

## Removed

Nothing. No old model, test or tool is replaced.

## Open

- All three rounds are used (cap). Remaining weak points: no frame check yet (not wired in), the
  boiler fire is dim and has no smoke, chapter 8 water details show mainly in close-ups, the ruts and
  damp patches in the pictures are flat, and the GLB's vertex colours are checked only by a Blender
  re-import, not in three.js.
- No frame check yet: the group is not in the game. The wiring card does it.
- Smoke from the lit boiler is left out on purpose (a flat smoke shape would look cartoonish).

## Claude's verdict

Claude, 1 November 2026: round 3 picked (the three-round cap is used). The look is right:
rusted, welded scrap; each chapter's change reads from the yard. Round 2's close-up sheet
served its review and is not committed (one sheet per round), and the hygiene test is back
as it was. Kyle had the round-2 sheets with this pick. The water works are wired into the
yard by WATER-SCREENS; the frame check goes with the Water Road's release.

## Gate

Lane tier 48 passed, 0 failed, 0 not run (test-blender-output, test-repo-hygiene,
test-review-evidence after the review notes took their `round-N-review.md` names);
`npm run build` passes. No game code; no review needed beyond the art verdict.

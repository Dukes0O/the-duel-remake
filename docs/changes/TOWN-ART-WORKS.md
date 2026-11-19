# TOWN-ART-WORKS

**What changed.** `tools/blender/town-works.py` now builds the whole works family into `works.glb` (6.2 MB): the passed warehouse and kiln unchanged, the sawmill rebuilt to the card's round 3 sizes, and the salvage yard, Old Ground, test pit, trench (straight and corner), valve box, pipe stack, handcart, barrow, flatbed and the eight stockpiles, each carved or traced from photos. Thirty new reference photos (Codex image generation, credited in `textures/works-CREDITS.md`). `--only` builds a trial file for one piece; `--render name:round,...` renders several sheets in one job. Photos are shrunk to what each surface needs before export.

**Verdicts (Claude).** Every piece passes: sawmill round 3, salvage yard, Old Ground, small works and stockpiles round 1. Sheets and review notes under `docs/board/looks/town-art-works-{sawmill,salvage-yard,old-ground,small,heaps}/`.

**Checks.** See the merge commit for the commit each ran on: the works check of `tools/test-blender-output.mjs` passes (all 21 pieces, each within its budget, named parts, three lamps lit); `tools/test-repo-hygiene.mjs`; `tools/test-review-evidence.mjs`. No frame check (rule 9). Not wired into the game.

**Changed assertion.** The works check now names all 21 pieces and their budgets and parts instead of the warehouse, kiln and old sawmill; the sawmill's `log-stack-road`/`-far` became `log-stack-1` to `-3`. Nothing loosens (Claude's review is on the card).

**Lessons** added to `docs/ART_LINE.md`: open frames, roofs that hide machines, small carved sheds, heaps that read as paper, tree cut-outs, ground that cannot be dug, photo disagreements, arches under decks, photo size in a family file.

**Removed:** the old round-1 and round-2 family sheets' recipe paths, the sawmill's round 2 frame, roof and stacks, and three unused photos (`handcart-front`, `handcart-rear`, `old-ground-wall-top`). Sound cues: none added (no game events on this card).

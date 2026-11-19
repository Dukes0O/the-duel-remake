# MACHINE-ROADS: the machines and the worked ground, drawn (Claude, 19 November 2026)

View work only, behind `wasteland-town`. No rule in `src/machines/` changed and no fingerprint was re-recorded.

- **Machines.** The yard loads `machines-2.glb` and uses its photo-built roller and paver in place of two plain boxes. The dozer's blade lowers to cut, sits half way to spread and lifts to travel, with a heap of earth ahead of it; the roller's drum turns; the paver's screed lowers to lay, with steam off the new surface. Each has a driver's seat that shows its tool (`ROAD_MACHINE_SEATS`, one optional `seat` hook in `camera.js`).
- **Ground.** Worked ground is its own drawn surface over the edited ground (`createRoadWorkView`): scraped, loose fill, rolled firm, paved, and two kinds of bad work (paved on soft fill; paved too fast or off line). A finished road shows in the yard.
- **Model file.** One paver track wheel stood 22 m from the paver and the roller's root sat on the loader (the recipe used the name `roller` twice). Corrected in `machines-2.glb` in place (72 points and one root; no Blender export) and in `tools/blender/town-machines-2.py`. Three new entries in `docs/ART_LINE.md`.
- **New files:** `src/machines/earth-look.js` (heaps and grain, shared with the drill), `tools/machine-look-sheet.py` (builds the sheets from hand-play pictures).
- **Changed assertions (Claude's review is on the card):** `tools/test-machine-roads.mjs` reads the drawn surface instead of the yard floor's hidden colours, same claims plus two; `tools/test-machine-view.mjs` takes the drill from `machines-2.glb` and checks the three road machines' seats.
- **Sound cues:** no new game event. `dozer-blade`, `roller-ground` and `paver-surface` are unchanged.
- **Checks:** CHECKS-PLACEHOLDER
- **Hand play and look:** dozer, roller and paver driven with real keys in a visible window; sheets `docs/board/looks/machine-roads/round-1.jpg` and `round-2.jpg` with their review notes.
- **Not done:** the roller and the paver are not added to the Dig without the town's switch (DIG-YARD-TOY decides). The roller's yokes and the pale panel behind the paver's seat are faults in the models; no Blender round was started.

**Removed:** the stand-in box and drum drawn for the roller and the paver; the painting and reshaping of the yard floor by road work (never seen in the game, replaced by the drawn surface); the ball that stood for the blade's load.

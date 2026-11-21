# BOWL-REX-LOOK

- Model round 7 (`tools/blender/bowl-scrapasaurus.py`, one GLB replaced): photographed painted steel panels with bare edges, rust and dents; thick shins; no plinth or rails; boxes in strapped tubs; torn leads (`battery-leads-N`, `battery-spark-N-a/b`) parked at scale 0. The eye stays at 10.52 m. Parts 528 to 87, 2.40 MB, 27,364 triangles.
- View (`src/bowl/bowl-rex-view.js`, reads the fight, writes nothing): steam on the tired sag, a 60 m beam with halo and light, fire as a fireball stream and floor flames, slack and tight cable, lead sparks, a spark shower at a tear, a bouncing dragged box, and a fall with sway, lights out and dust. `REX_MOMENTS` holds the timings.
- `src/bowl/bowl-view.js`: one condition, so every flame jet fires while the beast is down (`allJetsFire`).
- Checks (rule 23): core, test-replays, test-combat-replays, test-world-composition, test-bowl-rex and test-blender-output passed on `900762877`; after the review fixes, the four guards and test-bowl-rex again and `npm run build` passed. A visible-Chrome drive with the scenario's child-pace driver played the whole Easy fight with no page errors. Sheet: `docs/board/looks/bowl-rex/round-7.jpg`. One independent review: no real fault; the teaser now relights the lamps and the flame gain is guarded.
- Changed assertions: none. `tools/test-blender-output.mjs` builds round 7.
- New cards: BOWL-REX-SOLIDS (Codex: bogie solid, fallen pose flat, yard leads) and BOWL-REX-3-LOOK (Claude: the eye beam and bombs drawn, moved from this card). Claude's Easy and Hard hand drives go to the batch drive of BOWL-SHOW-2.
- Sound cues: none new (BOWL-REX-2's cues).
- Removed: the plinth, rails and bogie, and the old wear textures in the recipe; the glowing fire sheets and the one-pixel cable line in the view.

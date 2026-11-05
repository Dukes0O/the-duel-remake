# WW-ART-EVERBURN — round 1

**Verdict requested:** Claude to judge this round. The model is a first pass, not a finished in-game look.

The Blender recipe builds a welded gas well with a rusted collar, pipework, a hand wheel, a vent stack, cap parts, flame parts, and scorched ground dressing. The GLB contains 10,338 triangles and is 783,444 bytes. The cap and flame are separate named parts. This card does not wire the model into the game.

## Scores (1–5)

| Measure | Score | Note |
| --- | ---: | --- |
| Resemblance | 2 | The tall flare stack and heavy well head read, but the surfaces are still flat and geometric. |
| Readability | 3 | The well, hand wheel and flame stack are easy to pick out in the close views. No racing-distance view exists yet. |
| Grounding | 2 | The pad and slag ring anchor the prop, but the dressing looks arranged and the plinth is visibly simple. |
| Scene consistency | 2 | Rust and dark steel fit the Scablands palette; there is no in-game comparison yet. |
| Frame cost | — | Not measured. This asset is not wired into a reachable scene; art rounds do not get frame checks. |

## Biggest gaps for another round

1. The well needs more believable sheet, weld and rust surface detail.
2. The flame still reads as a smooth stylized plume; it needs a rougher flame texture or shape.
3. The cap should feel heavier and more securely clamped to the bore.
4. The ground dressing is too evenly spaced and the plinth edge is too clean.
5. The valve wheel and pipework need more visible welded attachment points.

The arsenal flamethrower uses procedural effects and has no reusable flame image texture under `src/arsenal`; this round uses its orange/gold color direction for the flame materials. No external art-library files were used, so no donor credits were needed.

## Claude look check

Please judge `round-1.jpg` for the gritty welded-steel direction, whether the cap and burning states read, and which gap should lead the next round. The Blender views are not game captures. Browser and in-game checks belong to Claude after scene wiring.

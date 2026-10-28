# SIRENA-WRECK-ART — one art round

25 October 2026. Art ready for Claude's look review; not merged or installed.
Switch: `the-deep`; this change adds no selection logic or game event.

## Result

`tools/blender/sirena-wreck-source.mjs` exports the actual drivable car,
without its driver, hidden effects or runtime damage metadata. The Blender
recipe `tools/blender/sirena-wreck.py` adds fitted barnacle crowns, shells,
dried weed and embedded UV weather textures. It retains the original body
and all four wheel hierarchies. The complete variant is
`public/assets/models/sirena/sea-wreck.glb`. LAB-RESTORE-2 owns selecting it
and attaching the ordinary driver and animation references.

Sheet: `docs/board/looks/sirena-wreck/round-1.jpg` (344,088 bytes), five paired
views and the unchanged raised wreck reference. No race frame or timing:
the variant is not installed. The round note contains the rebuild commands.

37,692 source + 9,222 crust = **46,914 triangles**, a 24.47% addition.
Crust stays below 11,307 (30% of the actual source), and the total stays
below the 95,680 card cap. Runtime file: 5,574,032 bytes, five embedded JPEGs.
There are four named `steer-*` groups, each containing its own `spin-*` group;
the crust belongs only to the body. Axes remain glTF +Y up, +Z forward,
metres. No animation is baked into the file.

## Evidence

- Final Blender build/export assertions passed: exact instance triangle
  count, both budgets, four spin parents, five embedded images and exported
  glass alpha. The runtime GLB was re-imported to render the review views.
- Independent recipe review found an imported unlit sheen graph ignored an
  alpha edit. The graph is now replaced before the material guard. Reviewer
  confirmed the fix; final export assertions passed. No other code findings.
  Claude's art verdict is still pending.
- Production build passed (`npm.cmd run build`, 770 ms). The first attempt
  was sandbox-blocked at integration-linked Vite temp storage; the authorized
  retry passed. The existing large-chunk warning remains.
- Initial lane run: 5 passed, 1 failed, 32 not run. The failure is the
  Blender generator registry: the new recipe needs an entry in
  `tools/test-blender-output.mjs`. The recipe now supports the existing
  Blender-free `--root ... --paths-only` contract. Kyle was asked for that
  narrow supporting-file scope under AGENTS' file-ownership rule; the
  registry itself remains untouched pending his answer. No assertion was
  changed or loosened. The remaining batch completed 32/34 suites; two were
  sandbox-blocked at `pwsh`/`ffmpeg` process launch. Both passed their one
  authorized retry. Across the partitioned lane run, **39/40 selected suites
  pass**, with no unrun suite; only the registry failure remains. The five
  initially passing suites were not repeated. Existing replay, world,
  Sirena, placement and repository hygiene checks passed without changed pins.
- Cockpit board sync passed: zero task changes. Session status regenerated.

The pending registry entry is:

```js
{script: 'tools/blender/sirena-wreck.py', args: [], recipeOnly: true,
 glb: ['public/assets/models/sirena/sea-wreck.glb']},
```

No race code, save data, garage, loader, existing model, replay pin or world
signature changed. This is not a green merge packet until the registry
check passes. Sound: no new game event, so no cue added.

## Removed

No existing asset or code path replaced. Intermediate GLBs, texture files,
individual renders, logs and the local build are rebuildable scratch and
are recycled after their results are recorded. Only the recipe, runtime
variant, compressed sheet and short notes are retained.

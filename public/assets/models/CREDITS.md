# 3D model credits

## Detailed player car

`car-concept.glb` is **Car Concept**, created by **Eric Chadwick, Darmstadt Graphics Group GmbH (2024)**, provided by the [Khronos glTF Sample Assets project](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept).

Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). [Upstream license](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/LICENSE.md). The upstream license excludes Khronos logos and associated trademarks; there is no author or Khronos endorsement of this game. The source file includes the original copyright metadata and material variants.

Downloaded 19 September 2026 from `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb`.

Runtime adaptations in `src/hero-vehicle.js`: normalized to 4.8 metres, straightened front wheels, batched meshes, omitted emblem meshes, replaced license-plate artwork with a plain material, customized paint/glass/lights, added steering and wheel spin, deforming damage and a contact shadow. Falcone Heritage preserves the previous F42's sport version of this body; Aurora GTR uses its carbon GT trim and different handling. It is not an accurate model of a named real-world car. The current Falcone F42 and Stuttgart 959-S retain their separate original geometry.

The original source GLB is retained for editing in Blender. `npm run assets:export` does not overwrite it.

## Original procedural models

The six original playable cars are built in `src/classic-vehicles.js` and `src/unlock-vehicles.js`. Traffic and police sedans use `src/vehicles.js`. Current stations use the live environment mesh factories. The unused first-iteration Cinder coupe and station exports, and their obsolete builders, were removed; they remain recoverable in Git history. See `docs/ASSET_PIPELINE.md`.

## Original Blender course landmarks

`course-landmarks.blend` contains six original, editable scenery collections:
forest lodge, avalanche gallery, coastal pavilion, sandstone tower, harbor
gantry and mountain skydeck. They were authored with Blender 4.5.9 LTS using
`tools/build-course-landmarks.py`, then refined through three render passes.
The same evaluated meshes are exported to `src/generated/course-landmarks.json`
for the game; no third-party model or commercial game asset is included.

The generated art board at `public/assets/reference/course-expansion.png` was
created with the built-in image tool. It is a visual target, not a screenshot
of the game. The prompt brief, source/export contract and iteration notes are
in `docs/COURSE_EXPANSION.md`. Existing landscape materials and their credits
remain unchanged.

## Muddy Hollow rocks and logs

The garden rocks and ramp logs in `src/generated/muddy-hollow-props.json` come
from the **Ultimate Nature Pack** by **Quaternius**
([pack page](https://quaternius.com/packs/ultimatenature.html)), released under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Seven FBX
models were downloaded on 26 September 2026 and converted by
`tools/blender/muddy-hollow-props.py`, which recolours them to the High
Country palette. Source checksums are in `tools/art/catalog.json`.

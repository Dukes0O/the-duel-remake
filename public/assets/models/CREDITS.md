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

## Convoy tanker

`wasteland/convoy-tanker.glb` uses models by **Kenney**, released under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
[Car Kit](https://kenney.nl/assets/car-kit) for the rigid cab and battered
vehicle parts, [City Kit Industrial](https://kenney.nl/assets/city-kit-industrial)
for the tank and steel panels, and [Factory Kit](https://kenney.nl/assets/factory-kit)
for the three handwheel valves.

`tools/blender/convoy-tanker.py` fits these parts into one rigid armored truck,
adds the boarding plate and paired roof lamps, and supplies the approved wear
and hazard markings. The kept donor choices and checksums are in
`tools/art/tanker-fit.json` and `tools/art/catalog.json`.

## The Deep — source candidates, not runtime models

DEEP-ART-SRC round one keeps original downloaded donors in the external art
library; no Deep runtime GLB is promoted yet. Full source URLs, license URLs,
checksums, clips and unresolved fitting work are in `tools/art/catalog.json`
(the `deep-*` entries) and `docs/board/looks/deep-art/round-1-review.md`.

- **Quaternius**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  [Fish Mackerel](https://poly.pizza/m/uassUTYYae),
  [Manta ray](https://poly.pizza/m/yzD8b7ZHZm),
  [Shark](https://poly.pizza/m/AyHTK3zUSG),
  [Whale](https://poly.pizza/m/JGFwp6xWgk) and
  [Anchor](https://poly.pizza/m/ejWQny9Gcz).
- **Poly by Google**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):
  [Fish](https://poly.pizza/m/aEyLrUMMoUK),
  [Turtle](https://poly.pizza/m/fklSEvGm1Q8),
  [Sea lion](https://poly.pizza/m/45HRvXYpvUG),
  [River otter](https://poly.pizza/m/dJW3JeUWXQ-),
  [Crab](https://poly.pizza/m/2DgM36qZW2u),
  [Jellyfish](https://poly.pizza/m/dA5osnS0Rzj) and
  [Octopus](https://poly.pizza/m/9-b6-yqrwEe). Original bytes, no changes;
  the river otter is an unresolved donor, not a finished sea otter.
- **Steren Giannini**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):
  [Eagle ray](https://poly.pizza/m/675H-fzHW3-). Original bytes, no changes.
- **Kenney**, [Watercraft Kit 2.1](https://kenney.nl/assets/watercraft-kit),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  `ship-cargo-a.glb` and `boat-fishing-small.glb`, reused from the existing
  external pack. No breach, hold or sunken weathering has been fitted.
- **ffish.asia / floraZia.com**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  [Brutal Moray](https://sketchfab.com/3d-models/f7b2e7e06e454392bf7d7ab739658d57),
  [Hong Kong Grouper](https://sketchfab.com/3d-models/4ddbc1a350904a8e9ea2f4985e55edee) and
  [Tridacna crocea clam](https://sketchfab.com/3d-models/af688a0ed6044ab99d0ec20c57fd3b18).
  These are licensed leads only: public metadata and published previews
  checked; mesh downloads return HTTP 401 and are not in the game/cache.

# 3D model credits

## Detailed player car

`car-concept.glb` is **Car Concept**, created by **Eric Chadwick, Darmstadt Graphics Group GmbH (2024)**, provided by the [Khronos glTF Sample Assets project](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept).

Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). [Upstream license](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/LICENSE.md). The upstream license excludes Khronos logos and associated trademarks; there is no author or Khronos endorsement of this game. The source file includes the original copyright metadata and material variants.

Downloaded 19 September 2026 from `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb`.

Runtime adaptations in `src/hero-vehicle.js`: normalized to 4.8 metres, straightened front wheels, batched meshes, omitted emblem meshes, replaced license-plate artwork with a plain material, customized paint/glass/lights, added steering and wheel spin, deforming damage and a contact shadow. Falcone Heritage preserves the previous F42's sport version of this body; Aurora GTR uses its carbon GT trim and different handling. It is not an accurate model of a named real-world car. The current Falcone F42 and Stuttgart 959-S retain their separate original geometry.

The original source GLB is retained for editing in Blender. `npm run assets:export` does not overwrite it.

## Original procedural models

The six original playable cars are built in `src/classic-vehicles.js` and `src/unlock-vehicles.js`. Traffic and police sedans use `src/vehicles.js`. Current stations use the live environment mesh factories. The unused first-iteration Cinder coupe and station exports, and their obsolete builders, were removed; they remain recoverable in Git history. See `docs/ASSET_PIPELINE.md`.

# 3D model credits

## Detailed player car

`car-concept.glb` is **Car Concept**, created by **Eric Chadwick, Darmstadt Graphics Group GmbH (2024)**, provided by the [Khronos glTF Sample Assets project](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept).

Licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). [Upstream license](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/LICENSE.md). The upstream license excludes Khronos logos and associated trademarks; there is no author or Khronos endorsement of this game. The source file includes the original copyright metadata and material variants.

Downloaded 19 September 2026 from `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb`.

Runtime adaptations in `src/hero-vehicle.js`: normalized to 4.8 metres, straightened front wheels, batched meshes, omitted emblem meshes, replaced license-plate artwork with a plain material, customized paint/glass/lights, added steering and wheel spin, deforming damage and a contact shadow. Falcone Heritage preserves the previous F42's sport version of this body; Aurora GTR uses its carbon GT trim and different handling. It is not an accurate model of a named real-world car. The current Falcone F42 and Stuttgart 959-S retain their separate original geometry.

The original source GLB is retained for editing in Blender. `npm run assets:export` does not overwrite it.

## Original procedural models

The six original playable cars are built in `src/classic-vehicles.js` and `src/unlock-vehicles.js`. Traffic and police sedans use `src/vehicles.js`. Current stations use the live environment mesh factories. The unused first-iteration Cinder coupe and station exports, and their obsolete builders, were removed; they remain recoverable in Git history. See `docs/ASSET_PIPELINE.md`.

## The Falcone Sirena and its underwater models (SIRENA-ART)

All original, with no third-party source. The restored 1966 Sirena is built in
`src/sirena-vehicle.js` with the classic cars' helpers. `sirena/` holds eight
vertex-coloured GLBs written by `tools/art/sirena-props.mjs` from the same body:
the wreck half sunk in sand, the badge, steering wheel, wheel, bonnet and door,
the lift bag and the red abalone. Only public pictures of mid-1960s endurance
cars were looked at as a viewing reference; there is no downloaded model,
texture, badge or logo, and Falcone is the game's own fictional maker. Rebuild
byte for byte with `node tools/art/sirena-props.mjs`.

## The Lab hangar and its benches (LAB-ART)

All original, with no third-party source. `lab/` holds fourteen vertex-coloured
GLBs written by `tools/art/lab-props.mjs` (recipes in `lab-hangar.mjs`,
`lab-benches.mjs`, `lab-benches2.mjs`): the hangar beside the home helipad and
thirteen bench models, with a manifest of where each stands and each movable
part's pivot. Kestrel One, the cars and the fire and smoke effects are the
game's existing models and effects; they are not copied here. Rebuild byte for
byte with `node tools/art/lab-props.mjs`.

## The McMurtry Speirling and the Project Fan blueprint (LAB-FAN-ART)

All original, with no third-party source. The car is built in code in
`src/speirling-vehicle.js` with the shared car helpers, from what is publicly known
of the real car as a viewing reference only; there is no downloaded model, texture,
badge or maker graphic (the maker's name appears only in the config, as for the other
real cars). `speirling/project-fan.glb` is the pinned blueprint sheet, a vertex-coloured
model written by `tools/art/speirling-blueprint.mjs`; rebuild it byte for byte with
that command.

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

## The Deep — working art only

`deep/` contains thirteen creature models and four set pieces, for building
and testing behind `the-deep` dev only. Kyle has accepted none as finished
art; The Deep cannot go live with these models. The three-round cap ended
this source pass. DEEP-ART-FINAL follows the storyboard with Gratian. The exact
source URLs, authors, licenses, original checksums, fitting changes and
runtime hashes are in the `deep-*` rows of `tools/art/catalog.json` and the
runtime manifest. These exports are working sources, not a release,
placement, gameplay or frame pass. The held otter has no runtime export or
catalogue row; its original licensed donor remains in the external library.
Rebuild with `tools/blender/deep-art-fit.py` from the retained external
licensed originals. No raw donor, scan, Blend, render or source texture is
shipped in `public/`.

- **Quaternius**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  [Fish Mackerel](https://poly.pizza/m/uassUTYYae),
  [Manta ray](https://poly.pizza/m/yzD8b7ZHZm),
  [Shark](https://poly.pizza/m/AyHTK3zUSG),
  [Whale](https://poly.pizza/m/JGFwp6xWgk) and
  [Anchor](https://poly.pizza/m/ejWQny9Gcz).
  Metric fitting and muted paints; manta/whale Swim clips retained; shark
  has black fin tips; anchor has rusted metal.
- **Poly by Google**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):
  [Fish](https://poly.pizza/m/aEyLrUMMoUK) for reef-fish and its grouper refit,
  [Turtle](https://poly.pizza/m/fklSEvGm1Q8),
  [Sea lion](https://poly.pizza/m/45HRvXYpvUG),
  [Crab](https://poly.pizza/m/2DgM36qZW2u),
  [Jellyfish](https://poly.pizza/m/dA5osnS0Rzj) and
  [Octopus](https://poly.pizza/m/9-b6-yqrwEe).
  Donor metric fitting, recolouring and vertex pose/morph changes; grouper
  head/mouth fitted,
  crab scuttles, jellyfish pulses with restrained translucent pink, octopus
  arms curl. Original donor meshes are credited, not described as original.
- **Steren Giannini**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):
  [Eagle ray](https://poly.pizza/m/675H-fzHW3-), flattened to rest on sand
  and given muted dorsal/ventral paint.
- **Kenney**, [Watercraft Kit 2.1](https://kenney.nl/assets/watercraft-kit),
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  `ship-cargo-a.glb` and `boat-fishing-small.glb` shape donors. Containers
  removed; open cargo hold, hull/deck breaches, hold frames and broken rails
  fitted; bright source colours replaced by rust, steel and algae.
- **Original scripted geometry for The Duel:** moray and giant clam,
  expressly approved by Claude. No third-party scan mesh was downloaded or
  copied. Brown/olive reference colours and scallop direction come from
  **ffish.asia / floraZia.com**, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):
  [Brutal Moray preview](https://sketchfab.com/3d-models/f7b2e7e06e454392bf7d7ab739658d57) and
  [Tridacna crocea preview](https://sketchfab.com/3d-models/af688a0ed6044ab99d0ec20c57fd3b18).
  [Hong Kong Grouper preview](https://sketchfab.com/3d-models/4ddbc1a350904a8e9ea2f4985e55edee)
  is also a colour reference, not the grouper mesh donor. Those optional
  scan downloads remain unavailable (401). Kyle may supply better sources
  for DEEP-ART-FINAL; these authored/refitted assets remain working art.

## Original helicopter accessories (HELI-ART-SRC)

`public/assets/heli/cargo-hook.glb`, `helipad.glb` and `fuel-pump.glb` are
original geometry for The Duel, made from the rebuildable Blender recipe
`tools/blender/heli-accessories.py` and its parameters in
`tools/art/heli-accessories.json`. The forged hook, painted H pad and clean
aviation pump use scalar PBR materials and no external mesh or texture donor.
No helicopter donor is included in these three accessories. Their source and
export measurements are recorded in `tools/art/heli-source-candidates.json`;
actual accessory art acceptance is still pending.

`heli/fire-fx.png` (the H2 fire, smoke, steam and spray atlas) is coloured
and packed from sprites in the **Kenney** [Particle Pack](https://kenney.nl/assets/particle-pack),
CC0, by `tools/art/fire-fx.py`. The ember frame is drawn by the same script.

The six rescue people in `heli/people/` (rescuer, hiker, skier, stranded
driver, two paramedics) start from the **Quaternius** [Universal Base
Characters, Standard](https://quaternius.com), CC0. The recipe
`tools/blender/rescue-people.py` poses the rigged bodies, thins them, colours
them and adds original clothing and gear; no Quaternius texture is shipped.

## Ardennes original circuit landmarks

The stone stream bridge, forest footbridge and forest timing tower are original project geometry made for Ardennes Forest. They use no external models, textures or downloads. The editable recipe is `tools/blender/ardennes-landmarks.py`. The measured High/LOD provenance is recorded by that recipe in `tools/art/ardennes-landmarks.json`. Prior kit credits remain unchanged.


The Ardennes-only summer beech has an original trunk and limbs (authored in `tools/blender/ardennes-beech.py`) and a crown of crossed leaf cards. The leaves are real beech-leaf photographs from the **ambientCG** [Leaf Set 024](https://ambientcg.com/a/LeafSet024) (asset id `LeafSet024`, file `LeafSet024_1K-JPG.zip`), released under **CC0 1.0** (https://docs.ambientcg.com/license/). `tools/art/ardennes-leaf-sprite.py` cuts the nine leaves out of the set's colour and opacity maps and scatters them into one small spray tile; the Blender recipe puts that tile on the cards (alpha test, no blending) and embeds it in the two GLBs. Only the two small tiles ship, inside the GLBs; the downloaded set is not kept. High/LOD measurements, the set's file hashes and the tile hashes are written to `tools/art/ardennes-beech.json` by the export recipe.

## The pilot's map art (MAP-ART)

The five secret-course signs (`sign-*.glb`) and The Table (`table-mesa`, `table-lookout`,
`table-plane-wreck`, `table-logbook`) in `pilot-map/` are original project geometry
with flat colours. They use no external model, texture or photograph. The bush plane is a generic
high-wing aircraft of the 1950s style, not a model of a real type, and its tail number N4471K is
made up. The editable recipe is `tools/blender/pilot-map-props.py`; rebuild with
`blender -b --factory-startup --python tools/blender/pilot-map-props.py -- --root .`. The signs
carry empties (`flame_n`, `smoke_n`, `window_light`) where the game's existing fire and smoke
effects and its lighting go; the sprites for those are credited with the helicopter fire effects above.

MAP-ART-2: the mesa uses the game's own `red-sandstone.png` (original generated art, see
`docs/IMAGE_PROMPTS.md`), scaled to 1024 and embedded in `table-mesa.glb` by the recipe; the plane
wreck carries one picture baked from procedural dust, rust and edge wear (no outside image).

## The skiers and the ski course pieces (SKI-ART)

The skier, the guide and the four guests in `ski/` start from the **Quaternius** [Universal Base
Characters, Standard](https://quaternius.com), CC0, as the rescue people do (see above): the recipe
`tools/blender/ski.py` poses the rigged bodies with the same kit (`tools/blender/rescue-people.py`), thins
them and adds original one-piece suits, helmets, goggles, boots, gloves, skis and poles; no Quaternius
texture is shipped. The slalom poles, giant-slalom gates, timing arches, pad flags, kicker and safety
netting are original project geometry with flat colours; no outside model, texture or photograph.

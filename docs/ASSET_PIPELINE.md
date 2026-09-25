# Asset pipeline

The remake uses 3D vehicle and environment meshes. Its nine playable cars comprise two free starters, six credit purchases and one garage-completion reward. Falcone F42 and Stuttgart 959-S have separate original bodies in `src/classic-vehicles.js`. Dusthawk Rally, Banshee Muscle, Viper Prototype and Titan Monster use four original bodies in `src/unlock-vehicles.js`. Falcone Heritage preserves the previous F42's sport version of the licensed Car Concept GLB; Aurora GTR uses its GT version. Those eight cars have existing Blender-ready exports. Original cars have articulated wheels, drivers and damage hooks. The rival and personal-best ghost use the selected car's same model. Lightweight procedural sedans serve traffic and police. Image generation supplies modeling references and runtime surface textures.

The ninth model is authored directly in `src/koenigsegg-vehicle.js`, using the [manufacturer's Jesko Absolut reference](https://www.koenigsegg.com/model/jesko-absolut) for its long tail, twin vertical fins and rear aero discs. It is original editable geometry, not a downloaded commercial model, texture or logo. The browser review led to a second pass on its carbon roof, dark glazing, fitted light recesses and visible rear cover/diffuser. It measures about 2.11 × 4.97 × 1.25 metres, uses 73,559 triangles and 66 vehicle mesh draws, and supports steering, lighting, paint, impact damage and crushing. No duplicate GLB or temporary raster reference was created for this car; its code factory is the retained source.

The current earned-car source is `src/unlock-vehicles.js`. Run `npm run assets:unlocks` to rebuild `public/assets/models/unlocks/` and its manifest. See `docs/UNLOCK_VEHICLES.md` for dimensions, export checks and the driver/damage contract. The vehicle reference is `public/assets/reference/unlock-vehicles.png`; exact prompts for it and the asphalt, brick and gravel maps are in `docs/IMAGE_PROMPTS.md`.

## Asset catalog

| File | Purpose | Source |
| --- | --- | --- |
| `public/assets/reference/redline-horizons-art-direction.png` | Art direction: matching car views, service station, canyon | Built-in image generator; prompt below |
| `public/assets/textures/red-sandstone.png` | Runtime sandstone surface color | Built-in image generator; exact prompt in `docs/IMAGE_PROMPTS.md` |
| `src/classic-vehicles.js` | Separate Falcone and Stuttgart starter bodies | Original runtime factories and portable exports |
| `src/unlock-vehicles.js` | Distinct Rally, Muscle, Prototype and Monster bodies | Original runtime factories and portable exports |
| `src/vehicles.js` | Runtime traffic/police sedans and shared damage support | Original geometry, material batches and articulated wheels; no player fallback |
| `src/vehicle-assets.js` | Model selection and import state | Shared by menu, player, rival and ghost |
| `public/assets/models/car-concept.glb` | Shared Heritage/Aurora body with embedded surface maps and cabin | Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0; see `public/assets/models/CREDITS.md` |
| `src/hero-vehicle.js` | Heritage sport and Aurora GT adaptation, material batching, wheel pivots and damage | Shared source import when either car is selected |
| `public/assets/textures/ground-*.jpg` | Scanned ground color, normal and roughness | Poly Haven Gravelly Sand, CC0 |
| `public/assets/textures/sunset-lighting.hdr` | Natural reflection lighting | Poly Haven, CC0; see texture credits |
| `src/world.js`, `src/world-surfaces.js`, `src/world-props.js` and feature modules | Current terrain, roads, stations and scenery | Ordered composition and live environment mesh factories; see `docs/ARCHITECTURE.md` |
| `tools/export-classic-vehicles.mjs` and `tools/export-unlock-vehicles.mjs` | Portable current-model GLBs for Blender | Three.js GLTFExporter |

The image sheet guides the coupe's wide wedge body, dark glazing, rear louvers, side intakes, circular rear lamps and five-spoke wheels. Its cream stucco, oxidized red canopy and petroleum-blue windows guide the station materials. It is a concept reference; the small labels generated inside it are not game specifications.

The original cars use editable mesh geometry and generated paint detail. Car Concept includes authored material maps and a full cabin. The cars do not have full bespoke dirt/wear/damage texture sets. The reference sheet itself is not a 3D model.

## Rebuild the portable models

From the repository root:

```powershell
npm run assets:export
```

This runs both maintained car exporters, using the project's existing Three.js dependency and GLTFExporter. It replaces only the six original car exports and their manifests. The licensed Heritage/Aurora source stays unchanged. No account, API key, external exporter or additional package is needed.

The exporters strip live animation references from object metadata. Wheel and brake-light names remain in the models for later rigging. Exported axes use metres, +Y up and +Z forward. Each manifest records the exported model bounds. Ground clearance starts near zero at the tires.

The runtime factory returns wheel groups in `userData.wheels` for X-axis spin. Steering pivots are in `userData.wheelPivots`; front wheels carry `userData.front` and steer around Y. `brakeMaterial`, `brakeLights` and `boostFlames` support driving feedback. Shared materials and cached geometries carry `userData.sharedAsset` so switching vehicles does not dispose resources still used by other cars.

## Tire contact and model origins

`src/vehicle-grounding.js` measures the intact wheel geometry once per runtime car and caches its tire-base offset and rolling radii. The whole model moves together; body parts and wheels are not shifted independently. Paved, gravel and shortcut surfaces use their actual rendered heights, and road pitch/roll follow the car's heading. Preserve the wheel groups when replacing a GLB. A conservative whole-model bounding box can include empty space below rotated meshes and is not a reliable tire contact plane. Airborne motion and visual damage remain separate from this placement step.

## Work in Blender

Import a current car GLB through **File → Import → glTF 2.0**. The Heritage/Aurora loader is `src/hero-vehicle.js`; it loads `car-concept.glb`, recentres and scales to 4.8 m, straightens the source's posed wheels, omits badges, replaces the plate artwork, and creates independent steering/spin groups. Preserve wheel, driver and damage contracts when editing. Inspect the relevant car and its damage in `/tools/visual-check.html` or the eight-car showroom after exporting. Keep source credits with derived assets.

The car exporters above use Three.js. Wasteland crew, RPG, wrench, test-fighter, Rustwall, armor kits and Scrapdome yard assets have committed Blender 4.5.13 recipes under `tools/blender/`. Their source `.blend` files are regenerated in ignored `art-build/`, outside the public build. CLEAN-02 confirmed the recipes rebuild their sources, but repeated exports for crew, RPG, wrench and test-fighter can produce different GLB bytes. The reviewed runtime GLBs were kept while visual equivalence was checked. A byte difference from those rebuilds alone is not approval to replace a runtime model.

CLEAN-04 removed 59 external PNGs (61,868,771 bytes) from Wasteland runtime asset folders after verifying each was byte-identical to an image already embedded in the retained GLBs. The GLBs did not change. At that cleanup checkpoint the Wasteland model folder measured 73,978,288 bytes. After phase-2 yard and kit integration, it measured 78,345,188 bytes against the unchanged 60,000,000-byte advisory target. The P1 reviewed 512-square wall atlases reduced `rustwall/wall.glb` from 15,394,464 to 7,777,248 bytes; the wash was 3,898,584 bytes. P2's selected wall is now 8,421,064 bytes and wash 3,840,288 bytes. The new runtime yard adds 7,612,148 bytes and the nine fitted kit GLBs add 4,383,060 bytes. At the earlier yard/kit checkpoint `public/` totaled 255,108,495 bytes. These are runtime features, not duplicate sources. First-person assets still account for 38,443,308 bytes and await the winning crew technique. Keep the current targets as pressure for that replacement; reconsider the 60 MB family target only after the crew/hands pass measures its result. The largest runtime file remains the 14,295,108-byte Titan model. Further reduction requires a reviewed visual change.

### Selected Rustwall paint and recovery

The ten-round EGG-02-P2 development wall uses welded and simplified source-car silhouettes, recessed relief and weathered steel paint in three embedded 512-square atlas sets. The exported `wall.glb` has **55,834 triangles in 14 primitives**; the prior 56,122 figure counted pre-export source geometry. Six double-sided cloth banners account for the 288 duplicate reverse-face triangles omitted by export. The baseline exported wall had 58,626 triangles in 13 primitives. The wash keeps one 1024-square rock atlas and the original physical collision bank union. Wall and wash likeness remain three; EGG-02-P3 owns the target of four. The scoped quiet whole-render CPU/RAF check passed against both baselines with worst required ratio 1.0833 against the 1.10 limit. This is a development result, not a visual or GPU-time pass.

The selected paint came from a 1254-square generated original with three full-height steel variants. Retain the original at `C:\Users\kyleb\.codex\generated_images\01a0d53e-3baa-7c12-883d-38d2395c6099\exec-3e9ad6d1-13e3-49dd-90bc-5b59ba3eb5d6.png`, SHA-256 `817aedd97c42b69f57736e308e302c47ea8d5940512b0ad72e6519a8ea23c2ed`; ordinary janitor cleanup must not remove it. The three source thirds bake into embedded PNG rectangles x264..335, x344..415 and x424..495, y12..243 (72×232 pixels each), mapped at roughly 10×35 m on pylons and reused on selected outer plates. The generated PNG is never placed under `public/`. The exact image-generation prompt was:

```text
Create a production diffuse/albedo texture source for original gritty post-apocalyptic game steel gate towers. One SQUARE image, divided invisibly into THREE adjacent equal-width full-height vertical texture strips. Each strip depicts one different continuous column of battered overlapping reclaimed steel plates, approximately 9 metres wide by 35 metres tall in physical appearance. The three strips fill the image edge to edge; no gaps, borders, captions, numbers or labels. Each individual strip is narrow and tall, with correctly proportioned mostly round small rivet heads and bolt holes, broad staggered vertical steel panels, occasional horizontal overlapping seams, scraped paint, small impact dents, scaly rusty edges, rain runoff and abrasion. Ensure details are physically coherent within each narrow strip, not an image of an architectural tower. Palette: dusty weathered grey steel, warm muted brown rust and faded desaturated olive paint, readable midtones, not large flat black areas or bright orange. Roughly 5 to 8 broad plate courses vertically, asymmetrical seams, worn fasteners tracing plate edges. The three variants should be related materials but have different plate arrangements and wear. The left strip is grey iron with patchy brown rust, the middle strip faded olive with bare metal and rust, the right strip warmer brown iron with grey scraped edges. It must read as heavy scavenged plate construction after reduction to roughly 72 by 232 pixels per strip, so emphasize broad material variation and seam organization instead of microscopic noise. Perfect straight-on orthographic surface texture with no perspective, scene, sky, ground, shadows from other objects, scaffolding, cars or people. Flat neutral diffuse illumination: no baked directional highlights or directional cast shadows; the game supplies lighting. Fully opaque edge-to-edge texture, no watermark, logos or text.
```

To rebuild a painted candidate in an isolated checkout, place a verified copy of that original under ignored `art-build/rustwall-p2/steel-paint-source-1.png` and pass `--p2 --steel-paint art-build/rustwall-p2/steel-paint-source-1.png --steel-paint-sha256 817aedd97c42b69f57736e308e302c47ea8d5940512b0ad72e6519a8ea23c2ed` to `tools/blender/rustwall.py`. The generator validates the path and hash before writing. The no-input `--p2` route is a deterministic **procedural test fixture** and does **not** reproduce the selected paint. The committed runtime wall GLB embeds the selected paint; `git restore --source=d0e26a1 -- public/assets/models/wasteland/rustwall/wall.glb` restores that exact asset in an isolated checkout but does not regenerate it. EGG-02-P3 must implement a hashed embedded-atlas extraction/reapplication recipe or use the verified original before changing this paint. Runtime checks use the committed GLB's path/hash schema and geometry; exact source PNG hash and embedded atlas pixel equality are checked against each fresh isolated full-wall/probe build. The historical ignored render is not a clean-checkout dependency.

## Model loading and retired prototypes

The former renderer built the first-iteration procedural coupe immediately, then replaced it after the licensed GLB finished loading. That visible swap was an active fallback path, not a stale career save. The player, rival and ghost now share `src/vehicle-assets.js`. Six original models are immediately available; Heritage and Aurora share one source download, with separate sport and GT trim. While it loads, the previous car is hidden and the race clock waits for the selected model's first draw. Failure offers a retry, and the loader clears a failed import promise so retry can make a new request. Switching back to an original model works without the import. No vehicle-loading action clears browser storage, player profiles, records or paint ownership.

The following tracked first-iteration files were removed after checking all runtime references: `public/assets/models/cinder-gt.glb`, `public/assets/models/desert-service-station.glb`, `tools/export-assets.mjs` and `tools/blender/build_assets.py`. Neither GLB had a runtime consumer; current stations already come from the live environment mesh factories. Both removed scripts rebuilt only those retired prototypes. They remain recoverable through Git history. `assets:export` now rebuilds the current six original cars. The licensed Heritage/Aurora GLB, its license/credits, current original model exports and reference images are retained.

The unused sport/Stuttgart/high-detail branches were also removed from `src/vehicles.js`. Its traffic/police sedan retains exactly the same 39-node geometry, transforms and material values: the measured before/after SHA-256 was `c903126c66e6e52d2c537351be7173d51f5301c48d5c737f82168d5cae386145`. Shared damage helpers remain in place for all eight playable vehicles. `node tools/test-vehicle-assets.mjs` checks all model routes, coalesced loading, absent placeholders, failed-import retry and preservation of race clocks while waiting; render readiness and vehicle paint/grounding suites cover the shared contracts.

## Next asset production steps

1. Import the coupe into Blender and refine wheel wells, body panel transitions and interior.
2. Create UV layouts; bake high-detail normals and a packed roughness/metalness/occlusion texture.
3. Make simplified distant variants of cars and buildings, then add distance-based swaps.
4. Make damage, dust and tire wear material variants that respond to gameplay.
5. Add a small set of distinctive modular roadside props and landmark buildings.
6. Validate each exported asset in the game under sunset light, shadows, fog and motion.

Three.js and its existing glTF tools support the current browser game. Blender supplies modeling, baking and rendering. Unreal Engine is not a dependency of this remake; adopting it would be a separate engine migration and would change how the game is built and distributed.

## Meadow grass material

`public/assets/textures/meadow-grass.png` is the generated RGBA blade image used on three crossed cards per tuft. Keep its alpha channel when replacing it. `src/landscape-detail.js` reads its color as sRGB and uses an alpha cutoff of 0.5. The material has a muted green tint, slight root darkening and an 85% upward lighting bias. Both sides use the same lighting basis, which reduces the folded-sheet appearance while retaining real sunlight, shadows and wind. These settings do not change the card geometry, UVs, placement or collisions. Each biome view owns one texture shared by its cells and releases it when that world is disposed.

Run `node tools/test-meadow-material.mjs` to check the real PNG alpha, merged UVs, front/back lighting and texture lifetime. `node tools/test-landscape-cells.mjs` also checks that source geometry, instance transforms and culling bounds remain intact. Review close and distant grass in the browser after changing the image or shader; headless checks do not establish appearance.

## Pine foliage and bark

`pine-bough.png` remains the transparent crown asset. Its standard lit material uses a cooler evergreen tint, smooth outward/upward diffuse normals and lower-crown shading; the tree geometry, UVs, alpha cutoff and collision placement remain unchanged. `pine-bark.png` is a generated color texture with restrained luminance bump, one circumferential repeat and three vertical repeats per trunk. Each world owns one bark texture shared between color and bump; disposal releases it once. The crown and trunk material tests are in `tools/test-pine-material.mjs`. Exact artwork prompts and retained original paths are in `docs/IMAGE_PROMPTS.md`.

## Deterministic route presets

`src/generated-shortcut-presets.js` stores exact shortcut solutions for the selectable course/seed combinations. This avoids running the full geometric search when opening those routes. Saved paths retain all numeric offsets and metadata; they are not approximate replacements. Geometry, event definitions, tunnels, seeds and solver versions contribute to compatibility checks. An unknown or changed route falls back to the solver.

After changing route generation, rebuild and check the saved output from the repository root:

```powershell
npm run assets:routes
npm run assets:routes -- --check
node tools/test-shortcut-presets.mjs
```

Generation and `--check` both run the full solver and can take several minutes. The ordinary test checks saved paths, source freshness, invalidation and isolation quickly. For a full comparison of generated and cached course features, run:

```powershell
node tools/test-shortcut-presets.mjs --verify-solvers
```

Do not hand-edit the generated file. Increment the affected course's `layoutVersion` when geometry or race distance changes so older personal bests and ghosts remain separate.

## Reference image prompt

Mode: built-in image generation. Saved original: `public/assets/reference/redline-horizons-art-direction.png`.

```text
Use case: stylized-concept
Asset type: production art direction and 3D modeling reference sheet for an original retro-modern arcade racing game
Primary request: Create a polished wide game concept art reference sheet with three coherent subject areas: an original bright vermilion-red late-1980s wedge sports coupe, desert roadside service station architecture, and warm Mojave sandstone canyon landscape. These are references to build real-time 3D assets.
Composition: top two thirds primarily show a meticulously designed original red wedge supercar in large rear three-quarter perspective plus small clean matching front, side and rear orthographic reference views. Lower strip shows a weathered low flat-roof roadside fuel station with rusty metal canopy, two pumps, black glass doors, cream stucco walls, faded red trim; beside it a wide playable road carving through colossal layered sandstone cliffs, distant mesas, sparse scrub and cacti at sunset. Clean charcoal and warm ivory presentation board, generous margins, limited small tasteful labels only.
Car: low sculpted wide body, elongated low pointed nose, angular shoulders, black wraparound glazed cabin, subtle raised rear spoiler, rear horizontal black cooling louvers, quad circular red taillights, wide black tires and five-spoke metallic wheels, side cooling intakes. Convincing sophisticated industrial design. Entirely original car silhouette, no manufacturer logos, no existing named brand.
Style: premium automotive visualization and environment concept art, physically plausible materials, crisp industrial forms, restrained filmic grade, rich detail, readable modeling shapes. Warm copper sandstone, vermilion enamel, petroleum-blue shadows, pale evening sky. Landscape dramatic but clean and uncluttered. No people, no watermark.
```


### Expanded scene reference

`public/assets/reference/expanded-scenes.png` guides the coast lighthouse, station trim, harbor warehouses, driver and chickens. Generated `alpine-granite.png` and alpha `pine-bough.png` are used directly by the renderer. Import these images into Blender as material references; model in metres, +Y up and +Z forward for the current game adapter. Falcone Heritage retains the former F42 sport version of the licensed concept body. Aurora shares that source with original carbon aero and gold-wheel materials; neither is a separately scanned vehicle. The other six cars retain their separate original bodies and matching portable exports.

# Asset pipeline

The remake uses 3D vehicle and environment meshes. Its eight playable cars comprise two free starters and six earned vehicles. Falcone F42 and Stuttgart 959-S have separate original bodies in `src/classic-vehicles.js`. Dusthawk Rally, Banshee Muscle, Viper Prototype and Titan Monster use four original bodies in `src/unlock-vehicles.js`. Falcone Heritage preserves the previous F42's sport version of the licensed Car Concept GLB; Aurora GTR uses its GT version. Original cars have articulated wheels, drivers and damage hooks; Blender-ready GLBs are exported from the same factories. The rival and personal-best ghost use the selected car's same model. Lightweight procedural sedans serve traffic and police. Image generation supplies modeling references and runtime surface textures.

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
| `public/assets/models/car-concept.glb` | Aurora body with embedded surface maps and cabin | Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0; see `public/assets/models/CREDITS.md` |
| `src/hero-vehicle.js` | Aurora GLB adaptation, material batching, wheel pivots and damage | Loaded only when Aurora is selected |
| `public/assets/textures/ground-*.jpg` | Scanned ground color, normal and roughness | Poly Haven Gravelly Sand, CC0 |
| `public/assets/textures/sunset-lighting.hdr` | Natural reflection lighting | Poly Haven, CC0; see texture credits |
| `src/world.js` and `src/scenery-detail.js` | Current roadside stations and scenery | Live environment mesh factories |
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

Blender was not found on PATH or in the checked standard Windows install locations during earlier work. Current GLBs are built with Three.js and can be imported into Blender without a build script. No Blender rendering is claimed.

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

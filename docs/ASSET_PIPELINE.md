# Asset pipeline

The remake uses real 3D vehicle and environment meshes. The detailed player car and service station load from glTF binary (GLB), a portable format that Blender can import. Original procedural cars remain for traffic, the rival and loading fallback. Image generation supplies modeling reference and a sandstone surface texture.

## Asset catalog

| File | Purpose | Source |
| --- | --- | --- |
| `public/assets/reference/redline-horizons-art-direction.png` | Art direction: matching car views, service station, canyon | Built-in image generator; prompt below |
| `public/assets/textures/red-sandstone.png` | Runtime sandstone surface color | Built-in image generator; exact prompt in `docs/IMAGE_PROMPTS.md` |
| `src/vehicles.js` | Runtime original coupe and traffic geometry | Sculpted cross sections, material batches, articulated wheels |
| `public/assets/models/car-concept.glb` | Detailed player car with embedded surface maps and cabin | Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0; see `public/assets/models/CREDITS.md` |
| `src/hero-vehicle.js` | Runtime GLB adaptation, material batching, wheel pivots and damage | Both player paint variants share the concept body |
| `public/assets/textures/ground-*.jpg` | Scanned ground color, normal and roughness | Poly Haven Gravelly Sand, CC0 |
| `public/assets/textures/sunset-lighting.hdr` | Natural reflection lighting | Poly Haven, CC0; see texture credits |
| `public/assets/models/cinder-gt.glb` | Portable editable coupe for Blender | `node tools/export-assets.mjs` |
| `public/assets/models/desert-service-station.glb` | Runtime roadside station with canopy, pumps and hoses | `node tools/export-assets.mjs` |
| `tools/blender/build_assets.py` | Native Blender asset builder and optional studio render | Python; uses only Blender's built-in modules |

The image sheet guides the coupe's wide wedge body, dark glazing, rear louvers, side intakes, circular rear lamps and five-spoke wheels. Its cream stucco, oxidized red canopy and petroleum-blue windows guide the station materials. It is a concept reference; the small labels generated inside it are not game specifications.

The original exported coupe and station use solid material colors and editable geometry. Car Concept includes authored material maps and a full cabin. Neither has a full bespoke dirt/wear/damage texture set for this game. The reference sheet itself is not a 3D model.

## Rebuild the portable models

From the repository root:

```powershell
node tools/export-assets.mjs
```

This uses the project's existing Three.js dependency and its GLTFExporter. No account, API key, external exporter or additional package is needed. Files are deterministic and replace the two generated GLBs.

The exporter strips live animation references from object metadata. Wheel and brake-light names remain in the model for later rigging. Exported axes use metres, +Y up and +Z forward. The coupe is approximately 4.8 m long and 2.6 m wide including wheels. Its ground clearance starts near zero at the tires.

The runtime factory returns wheel groups in `userData.wheels` for X-axis spin. Steering pivots are in `userData.wheelPivots`; front wheels carry `userData.front` and steer around Y. `brakeMaterial`, `brakeLights` and `boostFlames` support driving feedback. Shared materials and cached geometries carry `userData.sharedAsset` so switching vehicles does not dispose resources still used by other cars.

## Work in Blender

Import any included GLB through **File → Import → glTF 2.0**. This works without running the native Blender script. The active player loader is `src/hero-vehicle.js`; it loads `car-concept.glb`, recentres and scales to 4.8 m, straightens the source's posed wheels, omits badges, replaces the plate artwork, and creates independent steering/spin groups. Preserve its node names when editing. Inspect both paint variants and damage in `/tools/visual-check.html` after exporting. Keep source credits with derived assets. The original coupe export command does not overwrite Car Concept.

The optional script creates equivalent native editable assets and saves a .blend authoring file:

```powershell
& 'C:\path\to\blender.exe' --background --python tools/blender/build_assets.py -- --output public/assets/blender-build --render
```

Outputs:

- `cinder-gt.glb`
- `desert-service-station.glb`
- `redline-assets.blend`
- `cinder-gt-preview.png` when `--render` is included

Keep this output directory separate from the runtime models while reviewing Blender work. The Python version adds small bevels and uses a Cycles studio render. It is an editable foundation for sculpting, UV layouts, texture baking and damage variants. It does not yet reproduce every procedural tread or trim detail.

Blender was not found on PATH or in the checked standard Windows install locations during this run. The script was checked for Python syntax but has not been run inside Blender. The included GLBs were built with Three.js and successfully reloaded through GLTFLoader.

## Next asset production steps

1. Import the coupe into Blender and refine wheel wells, body panel transitions and interior.
2. Create UV layouts; bake high-detail normals and a packed roughness/metalness/occlusion texture.
3. Make simplified distant variants of cars and buildings, then add distance-based swaps.
4. Make damage, dust and tire wear material variants that respond to gameplay.
5. Add a small set of distinctive modular roadside props and landmark buildings.
6. Validate each exported asset in the game under sunset light, shadows, fog and motion.

Three.js and its existing glTF tools support the current browser game. Blender supplies modeling, baking and rendering. Unreal Engine is not a dependency of this remake; adopting it would be a separate engine migration and would change how the game is built and distributed.

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

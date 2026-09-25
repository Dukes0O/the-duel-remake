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

CLEAN-04 removed 59 external PNGs (61,868,771 bytes) from Wasteland runtime asset folders after verifying each was byte-identical to an image already embedded in the retained GLBs. The GLBs did not change. At that cleanup checkpoint the Wasteland model folder measured 73,978,288 bytes. After phase-2 yard and kit integration, it measured 78,345,188 bytes against the unchanged 60,000,000-byte advisory target. The P1 reviewed 512-square wall atlases reduced `rustwall/wall.glb` from 15,394,464 to 7,777,248 bytes; the wash was 3,898,584 bytes. P2's selected wall is now 8,421,064 bytes and wash 3,840,288 bytes. The new runtime yard adds 7,612,148 bytes and the nine fitted kit GLBs add 4,383,060 bytes. At the earlier yard/kit checkpoint `public/` totaled 255,108,495 bytes. These are runtime features, not duplicate sources. First-person assets still account for 38,443,308 bytes. An independent Rook first-person hand proof can proceed while the body likeness work continues; converting all eight hands has its own proof gate. Keep the current targets as pressure for reviewed replacements, and reconsider the 60 MB family target only after crew and hand work measures its result. The largest runtime file remains the 14,295,108-byte Titan model. Further reduction requires a reviewed visual change.

### Selected Rustwall paint and recovery

The ten-round EGG-02-P2 development wall uses welded and simplified source-car silhouettes, recessed relief and weathered steel paint in three embedded 512-square atlas sets. The exported `wall.glb` has **55,834 triangles in 14 primitives**; the prior 56,122 figure counted pre-export source geometry. Six double-sided cloth banners account for the 288 duplicate reverse-face triangles omitted by export. The baseline exported wall had 58,626 triangles in 13 primitives. The wash keeps one 1024-square rock atlas and the original physical collision bank union. Wall and wash likeness remain three; EGG-02-P3 owns the target of four. The scoped quiet whole-render CPU/RAF check passed against both baselines with worst required ratio 1.0833 against the 1.10 limit. This is a development result, not a visual or GPU-time pass.

The selected paint came from a 1254-square generated original with three full-height steel variants. Retain the original at `C:\Users\kyleb\.codex\generated_images\01a0d53e-3baa-7c12-883d-38d2395c6099\exec-3e9ad6d1-13e3-49dd-90bc-5b59ba3eb5d6.png`, SHA-256 `817aedd97c42b69f57736e308e302c47ea8d5940512b0ad72e6519a8ea23c2ed`; ordinary janitor cleanup must not remove it. The three source thirds bake into embedded PNG rectangles x264..335, x344..415 and x424..495, y12..243 (72×232 pixels each), mapped at roughly 10×35 m on pylons and reused on selected outer plates. The generated PNG is never placed under `public/`. The exact image-generation prompt was:

```text
Create a production diffuse/albedo texture source for original gritty post-apocalyptic game steel gate towers. One SQUARE image, divided invisibly into THREE adjacent equal-width full-height vertical texture strips. Each strip depicts one different continuous column of battered overlapping reclaimed steel plates, approximately 9 metres wide by 35 metres tall in physical appearance. The three strips fill the image edge to edge; no gaps, borders, captions, numbers or labels. Each individual strip is narrow and tall, with correctly proportioned mostly round small rivet heads and bolt holes, broad staggered vertical steel panels, occasional horizontal overlapping seams, scraped paint, small impact dents, scaly rusty edges, rain runoff and abrasion. Ensure details are physically coherent within each narrow strip, not an image of an architectural tower. Palette: dusty weathered grey steel, warm muted brown rust and faded desaturated olive paint, readable midtones, not large flat black areas or bright orange. Roughly 5 to 8 broad plate courses vertically, asymmetrical seams, worn fasteners tracing plate edges. The three variants should be related materials but have different plate arrangements and wear. The left strip is grey iron with patchy brown rust, the middle strip faded olive with bare metal and rust, the right strip warmer brown iron with grey scraped edges. It must read as heavy scavenged plate construction after reduction to roughly 72 by 232 pixels per strip, so emphasize broad material variation and seam organization instead of microscopic noise. Perfect straight-on orthographic surface texture with no perspective, scene, sky, ground, shadows from other objects, scaffolding, cars or people. Flat neutral diffuse illumination: no baked directional highlights or directional cast shadows; the game supplies lighting. Fully opaque edge-to-edge texture, no watermark, logos or text.
```

To rebuild a painted candidate in an isolated checkout, place a verified copy of that original under ignored `art-build/rustwall-p2/steel-paint-source-1.png` and pass `--p2 --steel-paint art-build/rustwall-p2/steel-paint-source-1.png --steel-paint-sha256 817aedd97c42b69f57736e308e302c47ea8d5940512b0ad72e6519a8ea23c2ed` to `tools/blender/rustwall.py`. The generator validates the path and hash before writing. The no-input `--p2` route is a deterministic **procedural test fixture** and does **not** reproduce the selected paint. The committed runtime wall GLB embeds the selected paint; `git restore --source=d0e26a1 -- public/assets/models/wasteland/rustwall/wall.glb` restores that exact asset in an isolated checkout but does not regenerate it. EGG-02-P3 must implement a hashed embedded-atlas extraction/reapplication recipe or use the verified original before changing this paint. Runtime checks use the committed GLB's path/hash schema and geometry; exact source PNG hash and embedded atlas pixel equality are checked against each fresh isolated full-wall/probe build. The historical ignored render is not a clean-checkout dependency.

## Rook P2 research recipe — unpromoted

GFX-01-P2 tested explicit control meshes, fitted garment layers, a twelve-clip rig, authored UV charts and hash-verified image paint on Rook only. Its final ignored painted GLB is SHA-256 `32628d4c751b389eb573b3bb9e5f4559778ed3254dcdd85739015f4899883350`: **7,500 near / 1,833 far triangles**, one material family and three embedded 1024-square maps. The Director's and independent review of [round 10](board/looks/crew-p2/round-10-review.md) both scored likeness/readability/grounding/consistency **3/3/3/3**, frame cost unmeasured. The actual game still reads the hair as a cap and the cloth, hands and boots as simple forms. No trial GLB or texture was promoted. The reviewed runtime Rook, other seven crew GLBs and existing crew generator remain unchanged. GFX-01-P3 owns the Rook body likeness gate of at least four before any other crew body conversion. GFX-02-P1 can prove Rook first-person hands independently; all-eight hand conversion has its own gate.

The clean structural source is `tools/blender/rook-p2-source.json`, measured reference pixels are in `tools/blender/rook-p2-landmarks.json`, paint transforms are in `tools/blender/rook-p2-paint-calibration.json` and `tools/blender/rook-p2-garment-calibration.json`, and the exporter is `tools/blender/rook-p2.py`. The reference is `public/assets/reference/wasteland-crew-1.png`. In an isolated checkout, the following command rebuilds the **structural candidate with deterministic test paint**, not the reviewed painted trial:

```powershell
blender -b --python tools/blender/rook-p2.py -- --root . --stage candidate --output-dir art-build/crew/rook-p2
```

The two irreplaceable image-generator originals are retained outside the lane. Their paths and SHA-256 hashes were verified at closure:

| Input | Original path | SHA-256 |
| --- | --- | --- |
| Face/scalp source | `C:\Users\kyleb\.codex\generated_images\01a0d53e-3baa-7c12-883d-38d2395c6099\exec-3fd6831d-a83f-4bf2-b53b-db21b1aead96.png` | `cc48bbd07c6b436771537fcf416cf0c0d503e2afa5fab4c2b31b5582d46de358` |
| Four-swatch garment source | `C:\Users\kyleb\.codex\generated_images\01a0d53e-3baa-7c12-883d-38d2395c6099\exec-0173c246-b7d9-40fe-8d4a-d30a0872448f.png` | `793ee85733cd1ed0446b54d0cf5ef3746d5dba311aaf8b79d4fda6828e93e928` |

Place byte-identical copies at ignored `art-build/crew/rook-p2/face-paint-source-1.png` and `art-build/crew/rook-p2/garment-paint-source-1.png`. Both actual outputs are 1254×1254 despite 1024×1024 requested in the prompts. The RGB face output did not place its landmarks where prompted: measured source hairline/eyes/nose/mouth/chin are calibrated to the authored face chart by `rook-p2-paint-calibration.json`, rather than pasted in place. The garment output is RGBA with alpha 216–250; its RGB is treated as color data and baked into a fully opaque atlas. Its quadrant boundary is near pixel 627. The committed garment calibration uses inset source crops `[12,12,615,615]`, `[639,12,1242,615]`, `[12,639,615,1242]`, `[639,639,1242,1242]`. The exporter checks the source paths and hashes before writing. To reproduce the reviewed **painted trial**, run:

```powershell
blender -b --python tools/blender/rook-p2.py -- --root . --stage candidate --output-dir art-build/crew/rook-p2/paint-9 --face-paint art-build/crew/rook-p2/face-paint-source-1.png --face-paint-sha256 cc48bbd07c6b436771537fcf416cf0c0d503e2afa5fab4c2b31b5582d46de358 --hair-paint-from-face --garment-paint art-build/crew/rook-p2/garment-paint-source-1.png --garment-paint-sha256 793ee85733cd1ed0446b54d0cf5ef3746d5dba311aaf8b79d4fda6828e93e928 --garment-finish
```

The exact face prompt used the enlarged Rook UV guide and approved Rook triplet as image inputs. It produced usable eye, beard and skin color but did not obey the requested landmark positions:

```text
Use case: precise-object-edit. Asset type: opaque sRGB diffuse face texture for an original 3D game character.
Input 1 is the edit target and exact UV layout guide: a square enlarged crop of the Rook head texture island. Input 2 is the approved character reference; use ONLY the brown-haired bearded man in the leftmost front/side/back triplet, Rook.
Paint a professional hand-painted realistic game face texture matching that original man, directly over the layout in input 1. Output one 1024 by 1024 square raster texture. This is a flattened UV texture, not a rendered head, portrait, poster or turnaround. Preserve the layout and facial landmark placement; remove ALL white wireframe lines, yellow guides, black labels, text and borders from the final texture.
Coordinates in the 1024-square output: vertical facial centerline x512. Hairline y248, brows around y403, eyes centered around (330,495) and (694,495), nose tip (512,583), closed mouth centered (512,676), chin y776. Fit the visible face continuously through those landmarks. Side and rear head skin wraps toward the left/right edges; the narrow lower area is neck. The upper area is scalp beneath separate modeled hair. Keep this slightly expanded flat UV geometry rather than making an ordinary oval portrait.
Identity and materials: adult man from the left reference, weathered warm light skin, deep-set hazel-brown eyes, strong natural brows, straight sturdy nose, closed neutral mouth, short dark brown beard and moustache, brown sideburns/scalp roots. Match his reference likeness and restrained earthy colors. Fine skin variation and convincing beard strands; no invented scars, accessories, brands or symbols.
Diffuse/albedo only: even neutral illumination, no directional cast shadows, no dramatic ambient occlusion, no glossy highlights, no background scene, no perspective, no three-dimensional silhouette or detached head. Let the real game lighting create the shading. Fully opaque edge-to-edge skin/scalp color with extended bleed around the island; no transparency. No text or watermark.
```

The exact garment prompt produced the four-quadrant source; its alpha differed from the opaque request:

```text
Use case: stylized-concept
Asset type: one square opaque base-color material source atlas for a weathered wasteland survivor 3D character. This is a texture-making input, not a picture of clothing or a character.
Create a square 1024 by 1024 image with exactly four equal square quadrants meeting at the center, no border, gap, labels or text. Each quadrant is filled edge-to-edge with a flat, closely viewed material surface in the same realistic hand-painted game-art style.
Upper left: faded desaturated blue-green cotton work-shirt cloth, fine woven grain, irregular frayed seam and subtle vertical worn creases, muted dusty grey-green highlights, restrained earthy grime. The fabric is mostly blue-green, never bright teal.
Upper right: dusty light tan canvas for a sleeveless utility vest, scarf and pouches. Strong readable irregular stitched seams, woven threads, worn stitched edging, grime collected along folds, pale rubbed canvas. Keep the dominant midtone tan with earthy brown wear, no green or skin tone.
Lower left: brown-khaki cargo-trouser cloth, tough twill weave with vertical/diagonal gathered knee and cuff creases, worn knees suggested by uneven fading, a few frayed repaired stitch lines. Irregular organic fold rhythms; no repeated wallpaper ornament.
Lower right: dark brown worn boot-and-glove leather with small scuffs, rubbed warm-brown grain, crease breaks and a few close double-stitched leather seams. Keep useful readable brown midtones, not black voids.
All four are flat orthographic albedo swatches. Fine detail plus readable medium-scale seams and crease color variation that survives downsampling to 100 pixels wide. Broad neutral diffuse appearance, no directional lighting, cast shadows, specular highlights, reflections or photographic studio scene. No 3D garments, mannequin, body, face, hands, boots, pockets as separate objects, accessories, buckles, symbols, text, numbers, borders or watermark. The full square should consist only of these four material texture surfaces.
```

The committed tests create deterministic ignored paint fixtures and rebuild the structural GLB from source. Ordinary lane/full tests do not need either generated original, a painted trial GLB or raw browser captures. The ignored copied PNGs and paint-9 binary can be regenerated and consumed with the finished lane; preserve the external originals, this recipe, the candidate SHA and the immutable scored sheet/review pair.

## Rook first-person P1 recipe — unpromoted

GFX-02-P1 merged `4acf528` as a Rook-only construction proof. The final
[round 3 review](board/looks/first-person-p1/round-3-review.md) scores
**3/4/3/3/4** in both reviews; the frame score covers idle RPG CPU submission
and native RAF only. Runtime Rook, the other seven hands, RPG and wrench
remain unchanged. GFX-02-P2 carries broad sleeve volume, cloth scale, wraps,
glove/wrist shape and complete contact evidence before promotion or conversion.

### Inputs and rebuild

`tools/blender/first-person-gear.py --p1-rook` reads the committed
`tools/blender/first-person-p1-source.json`. The default generator remains the
runtime baseline recipe. P1 output must be a dedicated ignored subfolder under
`art-build/first-person-p1/`; realpath checks reject public/outside/junction
escapes before writes. Evidence overrides must resolve inside that candidate
subtree or a dedicated `.evidence/` subfolder, never its bare root.

The original selected image is preserved outside disposable lanes:
`C:/Users/kyleb/.codex/generated_images/01a0d53e-3baa-7c12-883d-38d2395c6099/exec-643b8830-8970-4809-a7a2-19004a01fa10.png`.
It is 1254×1254 RGB, SHA-256
`785c80bb03380c6454607e5fba687b633e47642cac0a1b58d7176afdf9a64b3b`.
The built-in image tool used this exact prompt:

```text
Use case: stylized-concept. Asset type: flat albedo material source for a gritty realtime 3D game, to paint first-person sleeves and fingerless gloves. Create one square opaque image divided exactly into THREE equal full-height vertical panels with straight boundaries, no gaps or labels. LEFT THIRD: faded desaturated dark teal heavyweight woven workwear canvas, coarse directional weave, broad irregular faded patches, subtle dusty abrasion, a few long gently diagonal stitch seams. MIDDLE THIRD: dark umber brown worn glove leather, supple fine grain, broad irregular wear zones, a few sparse curved stitched panel seams, rubbed edges slightly lighter but never orange. RIGHT THIRD: dusty beige woven bandage/wrist-wrap canvas laid flat, dense fibers, uneven horizontal overlapping strips and frayed edges with narrow soft dark overlap stains. Every panel fills its rectangle edge to edge. Material photographed/scanned perfectly straight-on under uniform neutral diffuse light, no directional cast shadows, no highlights, no perspective, no objects, no arms, no hands, no weapons, no logos, no text. Make material-scale details clear but not noisy; large wear fields visible when downsampled to 240 square pixels. Painted photorealistic game texture quality. No rendered cylinders or sculpted folds: actual fold volume is supplied by the 3D mesh. All three panels opaque.
```

Run from the isolated workspace root, using the installed Blender executable:

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' -b --python-exit-code 1 --python tools/blender/first-person-gear.py -- --root . --round 3 --p1-rook --output-dir art-build/first-person-p1/candidate --p1-paint C:/Users/kyleb/.codex/generated_images/01a0d53e-3baa-7c12-883d-38d2395c6099/exec-643b8830-8970-4809-a7a2-19004a01fa10.png --p1-paint-sha256 785c80bb03380c6454607e5fba687b633e47642cac0a1b58d7176afdf9a64b3b
```

This rebuilds the ignored GLB, three embedded 1024-square maps, blend and eight
Blender views. The selected source requires the explicit paired path/hash;
no-input procedural output and test-owned triptychs are construction fixtures,
not reproduction of selected artwork. The manifest records the actual input
hash/crops and `selectedArtwork`. No embedded-atlas extraction is implemented;
retain the original. The full prompt alone cannot reproduce identical pixels.

Native top-origin crops are cloth`[0,0,418,418]`,
leather`[418,90,836,508]` and wrap`[836,250,1254,668]`, with exclusive upper
bounds. Each 418-square crop uses fixed box filtering to240-square. Keep
encoded RGB channels; another transfer curve would darken them. Blender image
buffer rows 8..248 become PNG rows 776..1016. **Exported glTF V directly samples
the PNG top-origin row with GLTFLoader flipY=false**; the old 1-minus-V color
heuristic was wrong. Tests now require exact source-to-embedded pixels,
distinct-color direct-V garment-face correspondence and inverse-V rejection.
The P1 cloth/leather UV inset reaches 33.792..222.208 inside each256-pixel tile;
the declared safe range is 16..240, inside its padded240-pixel chart.

Skin is preserved in both PNG RGBA controls (bounds inclusive):

| Region | SHA-256 |
| --- | --- |
| x520..760,y8..248 | `7eea2ce1afd880c2514cc24ec964cb6172becc2e8a72ccd97c7bbd449b7e8c7d` |
| x520..760,y776..1016, actual material consumer | `d5d6619cd34a8c5b5fb96e0600f71980a8e97b2597520888624aeff9dc699b33` |

### Geometry and review controls

Authoring uses camera-local metres: X right, Y up, forward negative Z. Convert to
Blender once with`(x,-z,y)`. P1 joins palm/thumb/digits, rounds exposed tips,
adds layered wraps and localized sleeve folds while retaining bones, sockets
and clips. Topology guards weld at 0.1 mm; ten proximal clothing loops remain
intentional, while distal holes and edges with more than two faces fail.
The source stores the exact inferred fold paths. Their angles are physical
+X toward+Y, computed from exported positions rather than UVs. The unchanged
crest test needs at least four of nine stations above 2.5 mm per side; frozen
P1 predecessors measured 2/9 and 3/9 before correction. Source controls and these
geometry checks do not establish visual likeness.

The final candidate is 4260 hand triangles in one hand primitive, or 7536 with
the unchanged 3276-triangle RPG, below 8000/three active draws. At source
checkpoint`50663d7`, generator SHA is
`86219dd4da2e085f058fa84581601ac5245e2ebe969633ad6b507376309381bb`,
source JSON SHA is
`65efc6cbe282906a05a87a0ea8682cc4b1c4079ef34cb812bacb20f5ee1f2a95`,
and reviewed GLB SHA is
`8b985010d7a511503fa2fdeb37d7665bfad420f09b6751f87110d3ce55e30579`.
The reviewed capture's observation`26f55a0` was dirty; those exact source
hashes, not that commit alone, identify its build. Earlier 965a1347/3388b7
exports were diagnostic preflights, never the scored round 3.

Private memory-only QA uses`GFX_FIRST_PERSON_P1_ROUND` and optional
`GFX_FIRST_PERSON_P1_CANDIDATE` with
`node tools/browser-harness.mjs scenario first-person-polish --output-dir <new-ignored-review-folder>`.
It requires the sibling`candidate/evidence/blender-manifest.json`, actual
candidate hash, authored 1280×720 camera/FOV 72/near .15 and unchanged tool hashes.
Each High/Performance page swaps only its same-origin Rook URL once. The final
private 49797 run captured 16 matched views plus 12 real-input views: exit,
aim, successful shot/reload, repair and re-entry, with zero browser issues.
`DUEL_EVIDENCE_DIR` selects the review folder for
`node tools/fidelity-sheet.mjs --first-person-p1-round <unused-round>`.
Blender and capture round identities must agree. Existing round sheets are
immutable; the helper refuses to overwrite them. Source-module Blender
lighting differs from the game course and is labelled separately.

### Frame and contact limits

The separate`GFX_FIRST_PERSON_P1_FRAME_COST=1` mode compares actual public
Rook A1, candidate B and public Rook A2 on fresh pages for both qualities.
The final private 22072 pass used 30 warm plus 600 measured native frames per leg
and exactly one complete renderFrame per tick. Worst required CPU mean/p95 or
RAF p95 ratio was 1.0323 against the 1.10 limit. High CPU mean ratios were
1.0046/0.9799 and p95 ratios 1.0217/0.9592; Performance mean 1.0049/1.0190 and
p95 1.0323/1.0000. RAF p95 ratios were 1.0000/0.9945 and 1.0000/1.0000.
This is idle Rook/RPG CPU submission/native RAF evidence, not GPU or action cost.
High had 737 draws and Performance 423, with candidate triangle deltas +1208/+604.
Renderer texture allocations were 71/71/71 and 70/48/48, including cached
resources; they do not show active-gear savings. Both hand assets and RPG each
have three 1024-square maps. Approximate full-mip RGBA8 arithmetic is 16,777,218
bytes per three-map set; exact mip-chain arithmetic is 16,777,212. Neither is
measured GPU allocation. Selected hand PNG bytes total 3,853,951 versus baseline
3,567,627; the RPG's embedded maps total 3,402,673.

`tools/first-person-contact.mjs` and its five independent tests validate fixed
patch identity, per-tool bind, skinned samples, target closure and ordered
phases. The actual R2 diagnostic could not form six distinct positions in the
15 mm palm hint: the nearest connected part had four positions at 5.6 mm nearest
gap; a six-position part was 40.5 mm away. It stopped before a complete assessment.
This is insufficient local evidence, not a clearance pass or demonstrated
continuous-contact failure. Keep 15 mm primary/wrench grip,20 mm support/rocket
and 5 mm penetration limits; open targets report unsupported. Reload is sampled
at .999 because exact 1 is already idle; the existing later idle sample is not
adjacent boundary proof. P2 must finish real boundary/contact evidence and
record selected tool components before changing its sampling or tool geometry.

All 24 focused hand tests passed; final lane 268/268 and build passed on clean
`e6c3cf9`, with 162 unchanged replay fingerprints and 48/48 expansion drives.
Three immutable review sheets and tests remain. Raw captures, logs and ignored
candidates were consumed after the verdict; the original source remains above.

## Rook P2 sleeve and cloth research recipe — unpromoted

GFX-02-P2 is a separate opt-in Rook proof; the public Rook and other seven hands,
tools, sockets and save data remain unchanged. `--p2-rook` reads committed
`tools/blender/first-person-p2-source.json` and checks the exact parent P1 source
hash. Its first round replaced a narrow loft with one connected 20-vertex sewn
sleeve shell per arm: asymmetric elbow bulge, gathered waist and seam-angle
paths. The same P1 palm, digits, wrap, rig, clips and padded skin remain. The
final 4,260 hand triangles plus unchanged 3,276-triangle RPG total 7,536,
inside 8,000 and three active draws. Actual-export tests check both outer
azimuths, the inner/seam taper, one manifold cloth shell, exact frozen rings,
non-cloth geometry/UV/skin, rig/clips/sockets and production-byte isolation.

Two matched game rounds scored likeness/readability/grounding/consistency
**3/4/3/3**. Round 2 improved cloth scale but did not meet likeness four.
The wrists and rigid wrap/clothing transitions, sparse soft folds and generic
glove still need a different construction method. Continuous 14-pose contact
remains unsupported. A separate idle High/Performance A1/B/A2 frame check
passed its scoped 1.10 limit on the frozen round-2 GLB: 30 warm and 600 native
frames per leg, one complete renderFrame per sample, zero browser issues. High
CPU mean B/A1 and B/A2 were 1.0086 and 0.9481; Performance were 1.0509 and
1.0616. CPU p95 and RAF p95 ratios were at most 1.0056. Worst required ratio
was 1.0616. This does not measure GPU time or action scenes. Passing this
frame gate does not promote an asset whose likeness/contact gates remain open.
Do not convert the other hands from these research scores.

The selected P2 round-2 build reuses the P1 three-panel source above, then
replaces only the actual glTF-V cloth chart in the embedded 1024-square
color/surface/normal atlas. The second selected original is preserved at
`C:/Users/kyleb/.codex/generated_images/01a0d549-18ea-7f60-8b6c-cd0d3c382114/exec-f6024d6e-0813-45e4-afc0-41081de6e123.png`, 1254×1254 RGB,
SHA-256 `e4a286ebc7a4b07f0645c63f0eb0a66db93fd9bfcec0f213a0671f5e56bca3ac`.
It was generated with the built-in image tool using this exact prompt:

```text
Square seamless game texture swatch: worn dark teal tightly woven matte canvas, viewed straight on under neutral uniform lighting. Very fine dense threads and restrained subtle abrasion; low contrast. No folds, shadows, border, text, objects, stripes, embroidery, or large knit loops. One opaque square image.
```

From an isolated checkout, rebuild the ignored selected candidate with Blender:

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' -b --python-exit-code 1 --python tools/blender/first-person-gear.py -- --root . --round 2 --p2-rook --output-dir art-build/first-person-p2/candidate --p2-paint C:/Users/kyleb/.codex/generated_images/01a0d53e-3baa-7c12-883d-38d2395c6099/exec-643b8830-8970-4809-a7a2-19004a01fa10.png --p2-paint-sha256 785c80bb03380c6454607e5fba687b633e47642cac0a1b58d7176afdf9a64b3b --p2-cloth-paint C:/Users/kyleb/.codex/generated_images/01a0d549-18ea-7f60-8b6c-cd0d3c382114/exec-f6024d6e-0813-45e4-afc0-41081de6e123.png --p2-cloth-paint-sha256 e4a286ebc7a4b07f0645c63f0eb0a66db93fd9bfcec0f213a0671f5e56bca3ac
```

The cloth input must be a hash-verified square 1024–2048 PNG. The generator
box-filters its **whole native square** to 240×240. Blender buffer rows 8..247
become decoded PNG cloth x8..247,y776..1015; exported glTF V samples those
rows directly. Only that cloth rectangle changes. Roughness stays matte near
0.9; cloth normal height/slope is quartered before normalizing, rather than
scaling encoded RGB. The independent test uses a separate synthetic source,
checks actual cloth-face pixels, exact other-map bytes and geometry identity.
The manifest records both input paths/hashes separately with selected-artwork
flags. The reviewed round-2 GLB SHA-256 is
`d567b345bb780f20cca0c07f8e6bd56cb3414f8060c8f1fb6f9e62b15fe7e779`.
An omitted cloth flag reproduces the round-1 material recipe; a procedural
no-input build does **not** reproduce either selected generated image. Retain
both originals outside disposable lanes. P2's first two sheets and review
notes remain immutable; raw candidates may be consumed after final gates.

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

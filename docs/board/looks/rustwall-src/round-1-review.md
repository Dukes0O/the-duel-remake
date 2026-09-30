# Rustwall source sets : round 1

Recommend **Kenney Car Kit for salvage**, **Kenney City Kit Industrial for
metal structures**, and **the existing Quaternius Nature rocks for canyon
forms**. These three CC0 sets are complementary. They reuse developer-made
geometry, with no new sculpting or image generation. Kyle picks before any
fitting work; the Director will set `waiting_on: kyle` after catalog and merge
checks finish.

These are starting parts, not a finished Rustwall. Kenney supplies real loose
body panels, doors and bumpers, but its complete cars are intact. Quaternius
supplies useful lightweight rock forms, but no continuous canyon strata.
The review makes those gaps visible so the next card can fit existing parts
instead of promising a ready-made salvage wall.

| Candidate | Original parts inspected | Licence and format | Fitting work after a pick |
| --- | --- | --- | --- |
| A : [Car Kit 3.1](https://kenney.nl/assets/car-kit), Kenney | Sedan: 2,032 triangles. Door: 68. Plate A: 40. Bumper: 116. The supplied car includes separate wheel and body meshes; the parts include a 512 × 512 palette texture. | CC0 in the official page and downloaded `License.txt`. Original GLB, FBX and OBJ files are cached. The inspected parts have no armatures or action clips. | Keep the author’s existing shapes, fit their scale to the wall, prepare crushed/burned car-hulk variants and worn metal materials, then combine or instance repeated parts within the wall budget. |
| B : [City Kit Industrial 2.0](https://kenney.nl/assets/city-kit-industrial), Kenney | Water tower: 968 triangles. Shipping container A: 402. Large chimney: 218. Each inspected original GLB uses the supplied 512 × 512 palette. | CC0 in the official page and downloaded `License.txt`. Original GLB, FBX and OBJ files are cached. Static parts, no rigs or clips. | Reuse tower supports and container sheet metal; fit the existing wall’s scaffolds, gate supports and tower layout. Add restrained rust/wear and combine repeated materials. This pack supplies structures, not finished salvage towers. |
| C : [Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html), Quaternius | Rock 1: 70 triangles. Rock 2: 80. Rock 3: 72. Rock 5: 90. One native diffuse material each, no texture maps, rigs or clips. | CC0 in the official page and cached `License.txt`. These are the original FBX files already licensed and used for Muddy Hollow. | Reuse the source shapes for canyon outcrops; fit desert colours and layered strata to the existing bank layout. Keep the joined banks and collision envelope continuous; the small rocks alone are not a finished canyon wall. |

The Quaternius cache is already selected for EGG-03-P6. This review proposes
that same licensed source for a separate Rustwall use. It does not change the
existing source decision or claim that Kyle has approved the new canyon fit.
All inspected triangle counts come from the actual original mesh files in
Blender 4.5.13, rather than their promotional pages.

## Licence, cache and checksums

Primary pages and original licence files checked on 30 September 2026.
New Kenney ZIPs are cached outside Git under Kyle’s `art-library` folder;
the existing Quaternius files are reused there. No account or payment was
needed. No files were placed in `public/`.

| File relative to `C:\Users\kyleb\dev\art-library` | SHA-256 |
| --- | --- |
| `kenney-car-kit/source.zip` | `fac7dacac5c7874348cf19729af3ef205f3d366493edaf0a827d93f4fdf3d0c4` |
| `kenney-car-kit/unpacked/License.txt` | `c33b7f6453d134deae7b1b8493717d9ccfa754c25ab97f6de89b88f8fda19b00` |
| `kenney-car-kit/unpacked/Models/GLB format/sedan.glb` | `b532ea7d2c59f7f6b22b138cf1955218a2c1898f1cea932af4d3fd563c3959b7` |
| `kenney-car-kit/unpacked/Models/GLB format/debris-door.glb` | `c62ab01c07be9be5dfc0f940dbc933fa836019ea1bc8fd0baa2d0e52cd764ea2` |
| `kenney-car-kit/unpacked/Models/GLB format/debris-plate-a.glb` | `3ecb3242d9e984dadd149fcdd0ded5f43e803b6370b6ddf2b7ab24876aa361ae` |
| `kenney-car-kit/unpacked/Models/GLB format/debris-bumper.glb` | `dac8b9a01766f187c4f116eb7070e13485b642120f4d53ec611bf987100a1792` |
| `kenney-city-kit-industrial/source.zip` | `5b381164e5760f3830a2dbee43b972deee38b2a695d091b56e238ab2910c96d2` |
| `kenney-city-kit-industrial/unpacked/License.txt` | `60a8c5c31191256ec9779dc18745dea6d69c46f4b29703459ce064c1765a59ea` |
| `kenney-city-kit-industrial/unpacked/Models/GLB format/water-tower.glb` | `11ac7ae19f32ce889bfe7a9c8e78c8ce8c77b7a76b52fd4ffa439a022ea2ef40` |
| `kenney-city-kit-industrial/unpacked/Models/GLB format/shipping-container-a.glb` | `7b2d5ca874c8e659ee6cfd1614f0470b70410b2ddc7620ac83b8954dedeb861d` |
| `kenney-city-kit-industrial/unpacked/Models/GLB format/chimney-large.glb` | `fd88d6c971ffb27f5ee5b0df9f7c23ac82f9b6d32e85d3e2066f90a62f92f59f` |
| `quaternius-ultimate-nature-pack/License.txt` | `83d8959f9fc56353ed571fbe2dc52e4bcd64508e2399501cd45ac2ce3df0bf8c` |
| `quaternius-ultimate-nature-pack/fbx/Rock_1.fbx` | `8a6e150e2d71dd601daf48d7967e273e940347a4826c2004b71ed1a9fa99c962` |
| `quaternius-ultimate-nature-pack/fbx/Rock_2.fbx` | `5a06ef3ec0b90098666407792fd2ea03879a10d3d0b0fe09b47f0df3a04025a1` |
| `quaternius-ultimate-nature-pack/fbx/Rock_3.fbx` | `4144136bd6c313ac7c48a08548504d7d30b7d628f35ce9dcd290ebe84e10e734` |
| `quaternius-ultimate-nature-pack/fbx/Rock_5.fbx` | `a335cfa716e962010450026884f19c7474967682334635286ca315eef3490c94` |

## What the comparison proves

The left image is the current production Rustwall GLB, loaded through the
actual Hidden Road course renderer in a private memory-only browser. Its
SHA-256 is `f834469c33e2d6798f9c3a4393f535abb0ac0b488e72b265adfd87bc07bb7c58`.
The closed-gate front view uses the game renderer, the current model’s
materials, and copied scene lights against grey. It shows 10 draw calls and
54,858 triangles for the isolated wall. The image retains the current dark
material appearance; it is a source comparison, not a new lighting verdict.

The candidate panels show unchanged original source geometry and colours.
Kenney GLBs use their original supplied texture in Blender EEVEE. The legacy
Quaternius FBXs import with Principled shader alpha 0 despite native diffuse
alpha 1. Their source previews therefore use Blender’s native diffuse
Workbench view. **No material, geometry, source file or game asset is edited**
to correct that importer display issue. The blank draft was rejected before
review; all four rocks are visible in the final sheet.

Browser: private port 58491; one image; memory-only storage verified; zero
warnings and zero errors. No player profile is read or written by the scenario.
The comparison JPG is 182,867 bytes, below 500 KB. It was inspected visually:
current salvage/gate, both Kenney sets and all four original rocks are visible;
labels and source limitations are legible without clipping.

These source triangle counts are useful for planning, but no adapted wall’s
frame-cost claim is made. The later fitting card must keep the entire wall
and canyon scene within SPEC 0.3’s budget at both quality settings.

## Reproduce

Use an isolated lane and the original source cache, with script auto-execution
disabled. Only preview images and inspection JSON are written by this recipe.

1. `blender -b --disable-autoexec --python tools/art/rustwall-source-sheet.py -- --inspect --render --output <absolute evidence source directory>`
2. `node tools/browser-harness.mjs scenario art-source-rustwall --output-dir .evidence/2026-09-30/ART-SRC-RUSTWALL/current`
3. `python tools/art/rustwall-source-sheet.py --sheet --current <current-rustwall.png> --sources <source preview directory> --output docs/board/looks/rustwall-src/round-1.jpg`

The browser script draws the loaded production wall in a private stopped pose
and does not call profile persistence. The preview recipe never saves a
changed source model or exports a runtime asset. The Director deletes raw
review evidence after the verdict is committed; this sheet and note remain.

# Salt Flats source review: round 1

Date: 30 September 2026. Status: Kyle selected the CC0 salt photo and tiling
method. Its material proof is ready for independent review. Model groups and
the bus choice still wait for Kyle. No model adaptation or runtime export
has started.

## Recommendation and fit

Use the three groups together if Kyle accepts their simple shapes. They are
components, not three finished scrapyards. Recommend the plain Bus over the
SchoolBus: its simpler body needs less reshaping. All require worn materials
to match the gritty venue. These are existing developer-made assets.

| Group | Existing sources | Fits | Work still needed |
| --- | --- | --- | --- |
| A | Kenney Car Kit 3.1 | Sedan, loose door, drivetrain and tyre. Useful starting pieces for scrap cover and stacked tyre walls. | Assemble piles and walls; damage intact cars; add rust and scorch. No ready scrap-pile or derelict hulk was inspected. Medium fitting cost. |
| B | Kenney City Kit Industrial 2.0 plus Factory Kit 3.0 | Two containers, an existing pedestal jib crane and a separate magnet. | Set scale, arrange walls and crane, add wear and a lifting cable. The source is a small jib crane, not a tower or gantry crane. Medium fitting cost. |
| C | Quaternius Public Transport Pack | Bus and SchoolBus have complete readable silhouettes. | Make one derelict and match the other packs' scale and materials. Legacy import needs care. Medium fitting cost. |

The white 300 by 200 m bowl, two ramps, heat shimmer, cover layout and frame
budget remain ARENA-06 work. No tanker rig or trailer was inspected; ARENA-07
still needs that source work. These gaps are explicit, not finished placeholders.

## Primary licences and cache

All four model packs link [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The three Kenney archives also contain original `unpacked/License.txt`
files stating CC0. The Quaternius official pack page is its cached licence
evidence; the linked public folder supplies the original models.

| Author and pack | Primary source | Original download |
| --- | --- | --- |
| Kenney, Car Kit 3.1 | [Official pack](https://kenney.nl/assets/car-kit) | [Original ZIP](https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip) |
| Kenney, City Kit Industrial 2.0 | [Official pack](https://kenney.nl/assets/city-kit-industrial) | [Original ZIP](https://kenney.nl/media/pages/assets/city-kit-industrial/0ec35b139d-1788171848/kenney_city-kit-industrial_2.0.zip) |
| Kenney, Factory Kit 3.0 | [Official pack](https://kenney.nl/assets/factory-kit) | [Original ZIP](https://kenney.nl/media/pages/assets/factory-kit/edaac9d4f6-1777639602/kenney_factory-kit_3.0.zip) |
| Quaternius, Public Transport Pack | [Official pack](https://quaternius.com/packs/publictransport.html) | [Public source folder](https://drive.google.com/drive/folders/1GUIE138uPVNraiQEf33dIx9wENhttZ15?usp=sharing) |
| Marina Shemesh, Salt Crystals On Beach Textures | [Primary CC0 photo page](https://www.publicdomainpictures.net/en/view-image.php?image=391081&picture=salt-crystals-on-beach-textures) | [Free original JPEG](https://www.publicdomainpictures.net/pictures/400000/velka/salt-crystals-on-beach-textures.jpg) |

Cache root: `C:/Users/kyleb/dev/art-library/`. Pack folders are
`kenney-car-kit`, `kenney-city-kit-industrial`, `kenney-factory-kit` and
`quaternius-public-transport`. The chosen photo is in
`marina-salt-crystals-beach`. Car and Industrial reuse the existing caches.
Factory, the bus originals and the free photo were downloaded for this review.
Source files, licensed archives and licence evidence stay outside Git. No
premium download, account or API key was used. Future runtime credits should
name Kenney, Quaternius and Marina Shemesh with their source links.

The photo page states CC0 and offers the free 1920 by 1275 JPEG. Its dated
primary-page evidence is cached as `license-evidence.txt`, not HTML: the web
tool read the primary page successfully, while a shell page request met
Cloudflare. The free image link supplied the original JPEG. The material
derives from this CC0 photo by changing UV coordinates; it is not a separately
licensed scan or a claim that the original bitmap is seamless.

## Original-file inspection

Blender 4.5.13 imported or opened all ten originals with auto-execution
disabled. There are 19 mesh objects, 7,652 triangles across the ten separate
samples, no armatures and no action clips. Evaluated counts equal source
counts; no model has a mesh modifier that raises its count. This sum is an
inspection total, not an assembled venue or a measured frame budget.

| Original | Triangles | Mesh objects | Surface data |
| --- | ---: | ---: | --- |
| sedan.glb | 2,032 | 5 | Car Kit colour atlas |
| debris-door.glb | 68 | 1 | Car Kit colour atlas |
| debris-drivetrain.glb | 412 | 1 | Car Kit colour atlas |
| debris-tire.glb | 288 | 1 | Car Kit colour atlas |
| shipping-container-a.glb | 402 | 1 | Industrial colour atlas |
| shipping-container-b.glb | 402 | 1 | Industrial colour atlas |
| crane.glb | 564 | 2 | Factory colour atlas; separate arm |
| crane-magnet.glb | 172 | 1 | Factory colour atlas |
| Bus.blend | 1,530 | 3 | Native diffuse shader colours; no image texture |
| SchoolBus.blend | 1,782 | 3 | Native diffuse shader colours; no image texture |

Each Kenney atlas is 512 by 512 pixels. Original glTF materials were rendered
in EEVEE without recolouring. None supplies salt ground.

The bus FBX files were also inspected. They have the same triangle counts,
but lose the source colours in the current Blender importer. The native
`.blend` files retain those colours in their old Diffuse BSDF nodes. Their
legacy shader imports with zero `Weight`, so the sheet uses Workbench and
copies each literal source node `Color` into the in-memory display colour.
It does not alter the source node, invent a colour, save the source file or
export a model. `open_mainfile(use_scripts=False)` and `--disable-autoexec`
prevent supplied Blender scripts from running. Old Info-area warnings concern
the saved editor layout; mesh inspection and rendering completed successfully.

Every picture is a render of an original model. Separate cameras and neutral
lighting are review presentation only. Model transforms and geometry are not
changed. The sheet trims the flat bus-preview background while retaining
the complete roof and wheel silhouette.

## Salt ground: chosen photo and repeating material

Kyle chose "Use the CC0 salt photo and tile it (Recommended)" on 30 September
2026. The earlier bounded search found no verified ready CC0 salt material.
This chosen recipe supplies a repeating surface from the genuine photo
without editing its pixels. The alternative royalty-free scan was not chosen
and remains undownloaded.

The Blender shader maps each axis through `PingPong(U * 4, 1)` and
`PingPong(V * 4, 1)`. Each tile reflects the photo, so neighbouring tiles meet
at the same source edge. The complete repeat unit is two by two source photos.
The image uses sRGB, linear filtering and `EXTEND` to clamp the edge texels.
The bitmap itself is still non-tileable. This is continuous mirrored repetition,
with a direction reversal at each tile edge, not a seamless standalone JPEG.

The genuine proof is one uninterrupted two-triangle plane showing four by
four source-photo tiles. Tile numbers sit outside the plane; no grid hides
the joins. The original aspect ratio is preserved: a review tile is 3 by
1.9921875 m, making the plane 12 by 7.96875 m. Those dimensions are review
settings, not a measured physical scale from the photo.

| Evidence | What it shows |
| --- | --- |
| `salt-repeat-control.png` | Ordinary four by four repetition of the unchanged photo has visible joins. |
| `salt-mirrored-4x4.png` | The same plane with mirrored UVs has matched edges. An unlit shader makes the colour joins easy to inspect. |
| `salt-mirrored-angle.png` | An angled render with roughness 1 and metallic 0 shows the material under neutral light. It does not invent material maps. |

The source SHA-256 is equal before and after all three renders. The numerical
UV checks passed: maximum difference across mirrored joins was
`4.440892098500626e-16`; maximum difference after a two-tile period was
`2.220446049250313e-16`. These check coordinate continuity, not venue realism.
Visual inspection also found matched edges across the full sixteen tiles.

Mirrored motifs remain obvious. The photo includes baked light and wet glints;
there are no normal, height or roughness maps. It is not a ready full material
map set. Matching the white bowl, scale, repeat visibility, camera distance and
frame budget remains ARENA-06 work after source approval. No venue or runtime
asset has been replaced. The model decision remains `waiting_on: kyle`.

## SHA-256 provenance

Paths below are relative to their named pack cache. Kenney GLB files live
under `unpacked/Models/GLB format/`. Hashes identify unchanged source bytes.

| Pack | File | SHA-256 |
| --- | --- | --- |
| Car | source.zip | `fac7dacac5c7874348cf19729af3ef205f3d366493edaf0a827d93f4fdf3d0c4` |
| Car | unpacked/License.txt | `c33b7f6453d134deae7b1b8493717d9ccfa754c25ab97f6de89b88f8fda19b00` |
| Car | sedan.glb | `b532ea7d2c59f7f6b22b138cf1955218a2c1898f1cea932af4d3fd563c3959b7` |
| Car | debris-door.glb | `c62ab01c07be9be5dfc0f940dbc933fa836019ea1bc8fd0baa2d0e52cd764ea2` |
| Car | debris-drivetrain.glb | `4a93bba25d3004b028f8494105d1774a91797d116dcb136fde00b4882bfec652` |
| Car | debris-tire.glb | `7c3f5968244e2c617c698820e943493b8480c7bef8535fbab04d4a501b3489e9` |
| Car | Textures/colormap.png | `f3622a03a20c6696065cae9cbe391351be873508af190c2ebd1d420c055787a5` |
| Industrial | source.zip | `5b381164e5760f3830a2dbee43b972deee38b2a695d091b56e238ab2910c96d2` |
| Industrial | unpacked/License.txt | `60a8c5c31191256ec9779dc18745dea6d69c46f4b29703459ce064c1765a59ea` |
| Industrial | shipping-container-a.glb | `7b2d5ca874c8e659ee6cfd1614f0470b70410b2ddc7620ac83b8954dedeb861d` |
| Industrial | shipping-container-b.glb | `290b3808149f8a9456ee96ff682fcf6a99f76adeac8e3b7b38234be434ea455c` |
| Industrial | Textures/colormap.png | `950f4f891ebd05a2affac810e6eeb0fea1511bc39039b65a3cbf2e17d17bc6a2` |
| Factory | source.zip | `7e31fb2308e90304672bd15cd18fa9d9f02c03731a8cbc57a8e3e1c181dfb0a7` |
| Factory | unpacked/License.txt | `61e86565dd297e143ad631594980eda0a17fc81a4cd7c6d71acf2f5e0cad30b6` |
| Factory | crane.glb | `ceaf20fb976ce0415d2b3d40e723b6ad377845818fa4fa68b55434108b1a6880` |
| Factory | crane-magnet.glb | `9ed1d4690e03fd4cafcd30d182b2319cc6c743794a50108332cab9d76a083f6e` |
| Factory | Textures/colormap.png | `35d7bd6900dde0208429eeaec87fa17fbf024ed59f3f4eab54bc92802eba9dd7` |
| Public Transport | source-page.html | `fd72fcdefb37a8a848b36ccbb5489e986bf195a6bebd5bf933c74abbcc35ef16` |
| Public Transport | fbx/Bus.fbx | `c75cdf437172daa37ffa5a5745ce08bbc0501a80714b63c1f43c0ed0b68cb47d` |
| Public Transport | fbx/SchoolBus.fbx | `08f74525747edde923baa2f6a13567c87476800c38161b800afb5c54d059fe71` |
| Public Transport | blend/Bus.blend | `b6603f556b73b0e9f4aa92d02f11d2a197fc8d55139c960788f0db36a679bbd8` |
| Public Transport | blend/SchoolBus.blend | `c51a071f872f2234dfb5ee8d94087428b0be0df51e0564e22e005bef9b16e7b8` |
| Marina salt photo | salt-crystals-on-beach-textures.jpg | `91911006c31d862527b7b3b98719512e6074ea80e7bbe483393eb925b9237b79` |
| Marina salt photo | license-evidence.txt | `d2196ff0adeccb98306bc8be2c57c59299854fd87897e4fd9f1fe68c80981acd` |

## Verdict and evidence

Builder's source inspection: source identities, licences, hashes and labels
checked. The Director reviewed the original model checkpoint clean. The
new photo/material needs independent review. The updated round-1 sheet and
all three salt renders were opened visually: all ten complete model silhouettes
and labels are readable, and the ordinary-repeat and mirrored proofs show
their actual joins. The sheet is 2100 by 1650 pixels and 430,908 bytes, below
500 KB. Sheet SHA-256:
`17a618421f4cba0cc9f9d2955286ed4be2980f5d28cf701cc45d375158392a38`.
This replaces the current round-1 file, adding 181,194 working-file bytes.
History retains the old 249,714-byte blob and adds the new 430,908-byte blob
(680,622 logical bytes total). The new compressed loose blob is 384,051 bytes
on disk. No history rewrite was performed.
No runtime-fidelity score is claimed.

The recipe is `tools/art/salt-flats-source-sheet.py`. Raw images and detailed
mesh/material inspection are ignored evidence at
`C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS/`.
`source-inspection.json` holds the model details; `salt-material-inspection.json`
holds the unchanged-photo hashes, repeat checks and proof settings. The lane's
ignored `.evidence/catalog-candidates.json` contains five proposals: four
shortlisted model packs and the selected photo, with 24 hashed source files.
The shared catalog hook waits for Rustwall to merge. Lane tier and build must
pass before merge; both remain pending Director scheduling.
Delete used raw evidence after its verdict is committed. Preserve licensed
external originals and licence evidence.

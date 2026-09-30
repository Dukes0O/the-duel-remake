# Salt Flats source review: round 1

Date: 30 September 2026. Status: model comparison ready for independent
review and Kyle's source choice. The tileable salt requirement is unmet.
No adaptation or runtime export has started.

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

Cache root: `C:/Users/kyleb/dev/art-library/`. Pack folders are
`kenney-car-kit`, `kenney-city-kit-industrial`, `kenney-factory-kit` and
`quaternius-public-transport`. Car and Industrial reuse the existing caches.
Factory and the bus originals were downloaded for this review. Source files,
licensed archives and licence evidence stay outside Git. No account or API key
was created. Future runtime credits should name Kenney and Quaternius.

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

## Salt ground: stop-rule gap

A bounded search checked primary Poly Haven and ambientCG listings and metadata,
plus targeted searches for cgbookcase, ShareTextures, TextureCan, 3DTextures and
OpenGameArt. ambientCG's `q=salt` metadata query returned zero results. Poly
Haven's texture metadata returned salt-weathered wall and wood descriptions,
not a salt ground. Search results do not prove that no suitable asset exists;
they establish that this run has no verified ready CC0 tileable salt source.

Two concrete free alternatives are available for Kyle's direction:

| Choice | Primary evidence | Gap |
| --- | --- | --- |
| Keep CC0 and allow manual seam work | [Marina Shemesh: Salt Crystals On Beach Textures](https://www.publicdomainpictures.net/en/view-image.php?image=391081&picture=salt-crystals-on-beach-textures). The primary photo page states CC0 and offers a free 1920 by 1275 image. | Real salt photo, not tileable and no material-map set. It would need seam work and a tiling review after approval. No photo was downloaded or adapted. |
| Allow a free non-CC0 source after a full licence/access check | [cspykstra: Ground - Salt Flat Smooth](https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth). The primary page describes a seamless photoscan with 1024 and 3072 material maps. | It is labelled Royalty Free License (no AI), not CC0. Full terms and download access remain unchecked. No account or download was attempted. |

Question for Kyle: accept the model groups, choose Bus or SchoolBus, and
either allow manual tiling from the CC0 salt photo or permit checking the free
royalty-free scan. The current CC0 tileable-ground acceptance is not waived.
The project stop rule and SPEC 0.11 require this source choice before adaptation.

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

## Verdict and evidence

Builder's source inspection: model identities, licences, hashes and labels
checked. The final sheet was opened visually: all ten complete silhouettes and
labels are readable. It is 2100 by 1200 pixels and 249,714 bytes, below 500 KB.
Sheet SHA-256: `b71770c7dce2294887fe7bdc254fb12823147ea665e7945b3c3afc54c180568b`.
Independent review is pending. No runtime-fidelity score is claimed.

The recipe is `tools/art/salt-flats-source-sheet.py`. Raw images and detailed
mesh/material inspection are ignored evidence at
`C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS/`.
The lane's ignored `.evidence/catalog-candidates.json` contains six proposals:
four checked model packs with 22 hashed source files and two undownloaded
ground alternatives. The shared catalog hook waits for Rustwall to merge.
Delete used raw evidence after its verdict is committed. Preserve licensed
external originals and licence evidence.

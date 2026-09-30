# First-person hand sources — round 1

Recommend **A, WRAD ARMS by wriks**, as the starting hand rig. Its fingers and
skin texture give a stronger base than the very simple DevMops hands. Both
are existing developer-made assets under CC0. This is a source comparison;
no candidate has been fitted to the game and no runtime art has changed.

Kyle picks before adaptation. The Director will set `waiting_on: kyle` after
the source catalog and merge gates are complete.

| Candidate | Original geometry checked in Blender 4.5.13 | Rig and animation | Fitting work after a pick |
| --- | --- | --- | --- |
| A — [WRAD ARMS](https://wriks.itch.io/wrad-arms), wriks | 1,196 arm triangles in the supplied GLB; an extra 80-triangle helper sphere is also present. One 512 × 512 skin texture is embedded; the ZIP includes pale and dark alternatives. | The GLB imports with one bound skin and 50 bones. No animation actions are supplied. The pack also includes the author’s native Blender IK rig, FBX and OBJ. | Fit proportions, scale and camera placement; add the crew’s existing glove/sleeve treatment; bind RPG and wrench sockets; adapt the existing aim/fire/reload/repair motion to this rig. Remove the helper from the later game export. |
| B — [Low Poly Arms (Rigged)](https://opengameart.org/content/low-poly-arms-rigged), DevMops | 520 base triangles; the source mirror modifier produces 1,040 triangles for both arms. Original 128 × 128 flat skin texture. | The bound Rigify rig has 257 bones, of which 48 are marked for skin deformation. A separate 44-bone metarig is present. No animation actions are supplied. | Fit proportions and camera placement; improve the mitten-like fingers for both grips; add gloves/sleeves; bake the author’s rig to the skin bones and export; adapt action motion and sockets. |

## Licence and source checks

Checked on 30 September 2026. The primary WRAD page identifies wriks and CC0;
the downloaded `README.txt` states the same licence and its `LICENSE.txt`
contains the CC0 1.0 legal text. The primary OpenGameArt page identifies
DevMops and CC0. Its source ZIP contains no separate licence file, so the
original public source page is cached as the licence evidence. The models,
textures and source pages are kept outside Git in Kyle’s art library.

| File | SHA-256 |
| --- | --- |
| `wriks-wrad-arms/source.zip` | `d5f91fdc9bd6465dc59b54265ca2aefe2dc881c00b6c7a9c76bd0b80fa498093` |
| `wriks-wrad-arms/unpacked/arms.glb` | `580efbb0852bf0b41f82dd3e17eafec86b3d2a48f4a7acaa7e64d60e850f565d` |
| `wriks-wrad-arms/unpacked/LICENSE.txt` | `a19d58aaab15c4d0019e569d1c073d1b5286fdd37dbeee7a58a7d1ae76045ae1` |
| `devmops-low-poly-arms/source.zip` | `a685cd52d98f884565ae2d0b29d93cecebeff614c4ee7f57055502267a86887a` |
| `devmops-low-poly-arms/unpacked/arms_low_poly.blend` | `15170a28893613d3370915fd62b32de584734db34491d49daf7aca7f5a18f75d` |
| `devmops-low-poly-arms/unpacked/arms_low_poly.fbx` | `8f0bbb00f6253deb6ab474504b784b97df514aed8ab3f1da400f9c932d96ac1f` |
| `devmops-low-poly-arms/source-page.html` | `47a364bfd661c983ddb44a7fb841888ce52d9bc913cf44535b131d203d30fe9c` |

Cache roots: `C:\Users\kyleb\dev\art-library\wriks-wrad-arms` and
`C:\Users\kyleb\dev\art-library\devmops-low-poly-arms`.

## What the sheet proves

The left image is the current production Rook hand GLB holding the current
production RPG. It was drawn by the game’s own renderer and first-person
camera, isolated against grey. A disposable memory-only scenario creates a
labelled stationary, discovered Wasteland fixture and exits through the
production simulation. It makes no player-profile writes. The capture shows
three draw calls and 6,932 triangles for the hands and held RPG together.

The two candidate images render their unchanged source pose and original
textures. They are source previews, not claims that either candidate already
works in the game. Source rigs’ embedded scripts stay disabled. No generated
art or original sculpting was used. The original source hand geometry is
well below the existing 8,000-triangle held-model check, but the final combined
hands/tool frame cost and motion must be checked during adaptation.

Browser capture: private port 15762; one image; memory-only storage verified;
zero console warnings or errors. The JPG is 113,025 bytes, below 500 KB.
The sheet was inspected visually: both candidates and the current held RPG
are visible, and the text is legible without clipping.

## Reproduce

Run the recipe in an isolated lane. Pass an absolute output path to Blender.
Relative Blender render paths can resolve outside the lane, so the recipe
resolves its render target before rendering.

1. `blender -b --python tools/art/hands-source-sheet.py -- --probe --render --output <absolute evidence source directory>`
2. `node tools/browser-harness.mjs scenario art-source-hands --output-dir .evidence/2026-09-30/ART-SRC-HANDS/current`
3. `python tools/art/hands-source-sheet.py --sheet --current <current-rook-rpg.png> --sources <source preview directory> --output docs/board/looks/first-person-src/round-1.jpg`

The source files must be present in the two cache roots above. The recipe
only loads them, inspects them and renders previews; it never saves a changed
source model or exports a game asset. Raw captures and inspection JSON serve
this review and are removed by the Director once the verdict is committed.

# WW-ART-FAR

The short board entry controls current state, ownership, dependencies and locks.

The Far Side, from `docs/story/the-far-side.md`. Nothing in the game looks like this yet: green, dark and soaking wet, after dozens of hours of sand. Waits for TUNNEL-TRIAL's go.

**Files you own:** `tools/blender/far-side.py`, `public/assets/models/wasteland/far-side/far-side.glb`, `docs/board/looks/ww-art-far/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-FAR.md` with a Removed section.

**Recipe,** each a named part:
- `highwater-mill`: a stone mill with a real wooden water wheel, a mossy slate roof with patches on its patches, and a stream.
- `highwater-house` and `highwater-barn`: low stone and timber buildings, soaked, moss on the north side.
- `maud-cart`: a heavy two-wheeled wooden cart, stacked with wool bales under a tarpaulin, mud to the axles.
- `top-pond-bank`: an old grassy earth dam with a stone lip, and `top-pond-gate`, the new gate you build later, steel on old stone.
- `prudence`: a boring machine in the dark, far bigger than yours, every part neat and rust-streaked, with PRUDENCE painted on its side in careful white letters, and a small dented lunch tin on the seat. `prudence-gallery`, a kit of old hand-set tunnel rings.
- `tunnel-ring`, one steel ring with a light on it, and `tunnel-portal`, a raw portal with timber and sandbags. `spoil-heap`, a big dark heap of broken rock.
- `goat-fourteen`: a shaggy goat with a bell reading HIGHWATER 14, adapted from the game's existing goat or a wildlife donor. `sheep`, the same way.
- `conifer-tall`, `conifer-small`, `apple-tree`, `grass-clump`, `wet-rock`. Reuse the forest and wildlife recipes in `tools/blender/` first.
- `maud-tarn` and `wick`: an old woman and a child of about nine in long oilskins and boots. Reuse the town's walker rig.

Show each from car height at 15 m on one sheet, in flat grey light, and name each on the sheet.

Budget: 60,000 triangles, 3 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Earlier rounds failed for these reasons, so do not repeat them: ground standing as a wall (check your up axis first), dark sheets, subjects too small in the frame, one mottled colour. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`.

**Rounds:** at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers

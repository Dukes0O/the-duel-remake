# WW-ART-FOLK

## Round 2

Re-dressed seven people from the shipped Rook crew body and raider skeleton. Auntie Solder has a raised welding visor and a leather apron; Moss has a broader build and a gas filter; the Ash Men have long dark coats, goggles and soot scarves. Steel and oxide colors follow the Rustwall and Salt Flats recipes. The Blender recipe writes a single comparison sheet with the original round 1 sheet, a car-height lineup at 40 m, a three-quarter view and a close view. The Rook crew model stands beside the lineup.

The GLB readback is 1,845,272 bytes, 27,382 triangles and seven skins. It stays under the 2 MB file budget and 8,000 triangles per fighter. The comparison JPG is 56,766 bytes. No art-library donor files or credits were needed.

### Checks

- `node tools/test-blender-output.mjs` — passed, 192 checks.
- `node tools/test-repo-hygiene.mjs` — passed; size targets are advisory.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` — selected 48 suites. The runner did not return its final summary. Two suites failed during FFmpeg loudness analysis (`test-circuit-eifel`, `test-review-evidence`); `test-review-evidence` first also saw the old tracked round 1 JPG missing before the changed look files were staged. Its one retry after staging passed the updated JPG publication checks but still failed its audio subtest with `spawnSync ffmpeg EPERM`. The Eifel suite's one standalone retry also failed with `FFmpeg loudness measurement failed`. `test-track-kits` did not report completion in the lane run; its standalone run completed the geometry and all listed course placement validations without an error.
- `npm.cmd run build` — passed. PowerShell blocked `npm.ps1` under its execution policy; the `.cmd` entry point worked.
- Blender rendered the sheet and the three private evidence views. No frame check was run. No browser check was run here; Claude should judge the 40 m lineup, Rook scale comparison, Auntie and Moss silhouettes, Ash Men coats and goggles, material wear, grounding, and whether the remaining angular costume shapes still read as toy-like.

### Scores (self-review, 1–5)

- Resemblance to the written direction: **3**.
- Readability at car height in the render: **3**; in-game readability is not measured because the art is not wired in.
- Grounding: **4**.
- Fit with the Wasteland look: **3**.
- Frame cost: **not measured**; this is not wired into the game.

Remaining visual gaps: costume pieces are attached to each actor root and do not follow head or chest bones in animation; townsfolk still share the Rook outline; the apron and armor plates remain geometric; Moss's shoulder filter is prominent; Ash coats need softer ragged edges and more uneven wear. The game-speed view is still for Claude to judge after integration.

### Changed assertions

None. The Blender output entry now requests round 2.

### Race fingerprints

None changed. This card changes art only and is not wired into the game.

### Removed

Replaced the old round 1 JPG and note with the single round comparison JPG and round 2 review note. Removed the superseded procedural block-figure body generation from the recipe; the delivered characters now use the shipped crew body and raider skeleton. The duplicated far LOD is omitted from this static cast asset.

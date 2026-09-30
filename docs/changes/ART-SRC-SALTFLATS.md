# ART-SRC-SALTFLATS: original source comparison

Status: source checkpoint ready for review; catalog, gates and independent review pending.
Waiting on: Kyle before any adaptation.

## Design decision before code

Compare three complementary groups, not three competing complete venues:
Kenney Car Kit for salvage and tyres, Kenney Industrial plus Factory Kit for
container walls and a crane, and Quaternius Public Transport for a bus.
Each pack keeps its own licence and checksums. The sheet must show original
geometry and source colours, not a proposed finished scrapyard.

The bounded primary-library search did not find a ready CC0 tileable salt
material. Do not substitute mud, snow or an AI image and label it salt. Stop
at the model comparison and put the missing ground choice to Kyle, under
the project stop rule. This checkpoint does not meet the ground acceptance.

## Changed

Added an offline source-inspection recipe and one labelled source sheet.
Ten original models from four CC0 packs form three complementary groups.
Blender inspected 19 meshes and 7,652 triangles; no rig or animation clips.
Original source SHA-256 hashes and primary licences are in
`docs/board/looks/salt-flats-src/round-1-review.md`.

The final JPG is 249,714 bytes. It shows native source shapes and colours.
Kenney materials are unedited. The Quaternius native Blender files preserve
colours lost by the FBX importer; the recipe copies literal source shader
colours to the in-memory Workbench display field. Sources are never saved.
The review explains that compatibility step. No new geometry, replacement
art, runtime files or generated substitute surface was made.

Car Kit and Industrial reused existing external caches. Factory Kit and the
original bus files were cached under `C:/Users/kyleb/dev/art-library/` after
primary CC0 checks. Ignored `.evidence/catalog-candidates.json` supplies four
model proposals, 22 hashed source files and two undownloaded ground alternatives.
Do not overwrite existing Rustwall pack records. The shared catalog hook
remains pending ART-SRC-RUSTWALL's merge, as the card requires.

## Kyle's decision and stop-rule gap

The model sourcing is concrete. The required ready CC0 tileable salt ground
was not found in the bounded primary-library search. This is a partial source
checkpoint, not completed acceptance or a finished venue. SPEC 0.11 and the
project stop rule require Kyle's choice before adaptation.

Recommend groups A and B plus the plain Bus in C. Kyle can instead choose
SchoolBus. For ground, choose whether to keep CC0 and allow manual seam work
from [Marina Shemesh's real salt photo](https://www.publicdomainpictures.net/en/view-image.php?image=391081&picture=salt-crystals-on-beach-textures),
or permit a full licence/access check of [cspykstra's free seamless salt scan](https://www.cgtrader.com/free-3d-models/textures/natural-textures/ground-salt-flat-smooth).
The photo is not tileable and has no material maps. The scan is royalty-free,
not CC0. Neither was downloaded. No licence exception has been assumed.

The Director should record `waiting_on: kyle` and the missing-ground gap on
the board. ARENA-06 and ARENA-07 remain held until Kyle's source direction.

## Checks

- Original-file inspection and renders passed in Blender 4.5.13 with
  `--disable-autoexec` and native `.blend` opening with `use_scripts=False`.
- Final source sheet composed with the bundled Python/Pillow and opened
  visually. Complete silhouettes, source labels and ground gap are readable.
  One source comparison round; no adaptation round used.
- Bundled Python `ast.parse` syntax check: passed.
- `git diff --cached --check`: passed on the four staged owned files.
- Lane tier and build pending Director scheduling; the Director requested
  this source checkpoint while other heavy gates run. Required before merge.
- Independent review pending Director scheduling. No new wording tests.
- Race fingerprints not rerun. No simulation, renderer, HUD, switch, save,
  assertion or runtime asset changed. Browser/frame checks are not applicable
  to this source checkpoint; ARENA-06 must measure them after adaptation.

Rebuild evidence only, from the source lane:

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' --disable-autoexec --background --python tools/art/salt-flats-source-sheet.py -- --inspect --render --output 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS'
& 'C:/Users/kyleb/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/art/salt-flats-source-sheet.py --sheet --sources 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS' --output docs/board/looks/salt-flats-src/round-1.jpg
```

## Removed

Nothing replaced. No runtime model or texture added. Raw review evidence is
temporary and must be deleted after its verdict is recorded.

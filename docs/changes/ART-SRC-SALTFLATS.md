# ART-SRC-SALTFLATS: original source comparison

Status: selected salt-photo material ready for independent review; catalog and gates pending.
Waiting on: Kyle for model-group and bus choices. Only the photo choice is approved.

## Design decision before code

Compare three complementary groups, not three competing complete venues:
Kenney Car Kit for salvage and tyres, Kenney Industrial plus Factory Kit for
container walls and a crane, and Quaternius Public Transport for a bus.
Each pack keeps its own licence and checksums. The sheet must show original
geometry and source colours, not a proposed finished scrapyard.

Kyle chose "Use the CC0 salt photo and tile it (Recommended)" on 30 September
2026. The approved recipe uses the unchanged Marina Shemesh source photo
in a Blender material. UV coordinates mirror with a period of two tiles in
both directions. The bitmap itself remains non-tileable; the material is the
repeatable surface. A genuine 4 by 4 tile-plane proof and an ordinary-repeat
comparison show the joins and repetition. No bitmap editing, premium download,
new account, dependency or runtime replacement was used.

## Changed

Added an offline source-inspection recipe and one labelled source sheet.
Ten original models from four CC0 packs form three complementary groups.
Blender inspected 19 meshes and 7,652 triangles; no rig or animation clips.
Original source SHA-256 hashes and primary licences are in
`docs/board/looks/salt-flats-src/round-1-review.md`.

The current round-1 JPG is 430,908 bytes, 2100 by 1650 pixels. It shows native
source shapes and colours plus the original salt photo, ordinary repetition
and selected mirrored material. Its SHA-256 is
`17a618421f4cba0cc9f9d2955286ed4be2980f5d28cf701cc45d375158392a38`.
The working sheet grows by 181,194 bytes. Git retains the earlier 249,714-byte
sheet in the earlier checkpoint and adds the current 430,908-byte sheet blob:
680,622 bytes of logical sheet content across the two versions. The new
compressed loose Git blob is 384,051 bytes on disk. This records the binary
history growth; no history was rewritten.
Kenney materials are unedited. The Quaternius native Blender files preserve
colours lost by the FBX importer; the recipe copies literal source shader
colours to the in-memory Workbench display field. Sources are never saved.
The review explains that compatibility step. Model geometry and source
files remain unchanged. Review-only salt planes are not runtime assets.

Car Kit and Industrial reused existing external caches. Factory Kit and the
original bus files were cached under `C:/Users/kyleb/dev/art-library/` after
primary CC0 checks. Kyle's chosen free Marina Shemesh JPEG is now cached there
in `marina-salt-crystals-beach`, with dated primary-page licence evidence.
The source is 1920 by 1275 pixels and 1,055,708 bytes. Its SHA-256 before and
after rendering is `91911006c31d862527b7b3b98719512e6074ea80e7bbe483393eb925b9237b79`.
The evidence-text hash is
`d2196ff0adeccb98306bc8be2c57c59299854fd87897e4fd9f1fe68c80981acd`.
Ignored `.evidence/catalog-candidates.json` supplies four shortlisted model
packs and the selected photo, with 24 hashed source files.
Do not overwrite existing Rustwall pack records. The shared catalog hook
remains pending ART-SRC-RUSTWALL's merge, as the card requires.

## Selected salt surface and remaining decisions

[Marina Shemesh's primary photo page](https://www.publicdomainpictures.net/en/view-image.php?image=391081&picture=salt-crystals-on-beach-textures)
states CC0 and supplies the free original. The material derives from that CC0
photo; there is no new third-party scan licence. The original JPEG remains
non-tileable. Each UV axis folds with Blender's PingPong node, so mirrored
neighbours meet at the same source edge. Linear sampling uses `EXTEND` to
clamp the edge texels. A two by two source-photo block repeats continuously.
UV direction reverses at each tile edge.

Three genuine Blender renders show a full four by four plane: ordinary-repeat
control, mirrored unlit join proof and mirrored angled rough-material proof.
There are no lines covering the joins. The 12 by 7.96875 m review plane keeps
the photo's aspect ratio; physical source scale is unknown. The photo is not
edited, recoloured or synthesized. No material-map images were invented.

The chosen material has matched edges, but mirror patterns and photographed
wet glints are visible. There are no normal, height or roughness maps. These
limits and venue fit still need review; a finished venue or frame budget is
not claimed. The source stop-rule question was answered for the photo only.

Recommend model groups A and B plus the plain Bus in C. Kyle can choose
SchoolBus instead. Keep `waiting_on: kyle` for these model decisions; do not
adapt models or start ARENA-06/07 from this checkpoint. The royalty-free scan
was not chosen or downloaded, and its proposal was replaced by the selected
CC0 photo/material record. The current source comparison remains round 1.

## Checks

- Original-file inspection and renders passed in Blender 4.5.13 with
  `--disable-autoexec` and native `.blend` opening with `use_scripts=False`.
- Photo/material renders passed in Blender 4.5.13. Original JPEG hash is
  unchanged. Maximum UV join error: `4.440892098500626e-16`; maximum two-tile
  period error: `2.220446049250313e-16`. Both are below `1e-12`.
- Final source sheet composed with bundled Python/Pillow and opened visually,
  along with all three salt renders. Model silhouettes, source labels and
  actual ground joins are readable. The ordinary control has visible joins;
  mirrored material edges match. Visible mirror motifs remain documented.
  The authorized photo proof updates the same round-1 sheet; no model
  adaptation round used.
- Bundled Python `ast.parse` syntax check: passed.
- `git diff --cached --check`: passed on the four staged owned files.
- Final mandatory lane tier: 301/301 suites in 513.34 s (516.78 s wall),
  with no skipped suites. Build passed in 1.01 s. Exact clean start/end:
  747b8678907f1b3cb4a1f3a5fec42a4414236b8a.
- Independent source/model/photo/material review is clear, including all
  24 original hashes and actual 4×4 joins. No new wording tests.
- The final lane tier reran replay controls successfully. No simulation, renderer, HUD, switch, save,
  assertion or runtime asset changed. Browser/frame checks are not applicable
  to this source checkpoint; ARENA-06 must measure them after adaptation.

Rebuild evidence only, from the source lane:

```powershell
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' --disable-autoexec --background --python tools/art/salt-flats-source-sheet.py -- --inspect --render --output 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS'
& 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe' --disable-autoexec --background --python tools/art/salt-flats-source-sheet.py -- --ground --output 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS'
& 'C:/Users/kyleb/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' tools/art/salt-flats-source-sheet.py --sheet --sources 'C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-09-30/ART-SRC-SALTFLATS' --output docs/board/looks/salt-flats-src/round-1.jpg
```

## Removed

Replaced the missing-ground panel and stale gap verdict in the same round-1
sheet and notes. Removed the unchosen scan proposal from ignored candidates.
Only one current comparison file is kept; both committed versions remain in
Git history. No history rewrite was performed.
No runtime model or texture added or removed. Licensed external originals are
preserved. Raw review evidence is temporary and must be deleted after its
verdict is recorded.

## Shared catalog turn completed

Rustwall source artifacts merged before this lane touched tools/art/catalog.json. The Director synced integration and appended the five verified Salt source records, preserving every parsed prior record byte for byte. The Marina Shemesh photograph is selected by Kyle; the original raster remains unchanged and the mirrored material is tileable. Independent delta review at6696673 verifies all24 source hashes and actual4×4 joins, with documented mirrored motifs and baked glints. Model selection remains waiting_on: kyle. Final lane/build gates pass on exact clean747b867, as recorded above. Artifacts merged as3e0bc17; model selection still waits for Kyle. No history rewrite, runtime adoption or release. The replaced comparison adds about384KB compressed binary history; Kyle explicitly prohibited history rewriting, so the D8 push remains a normal push.

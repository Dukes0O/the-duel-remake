# ART-SRC-CREW-W

status: review
waiting_on: kyle

## Decision

Compare two actual CC0 sources for Nell, Odessa, Wren and future Vesper, plus the requested Modular Women pack clearly on hold. Recommend keeping current women until a source supplies suitable existing garments and actions. The source choice is pending Kyle; no fitting or runtime replacement occurred. Director relays the sheet and held pack's licence/access issue to Claude.

## Evidence

The single source comparison and detailed source/access findings are in docs/board/looks/crew-w-src/. The catalog appends three card-specific records and preserves every prior entry, including declined Kenney and selected Modular Men. It records embedded Standard/Kenney CC0 licences, file hashes, real geometry/rig/action inspection and the held pack's unknown licence. Originals remain in C:/Users/kyleb/dev/art-library. Paid source content is excluded.

Blender 4.5.13 inspected nine original FBXs. Standard: female body, eyes and brows total 15,060 triangles, 65 bones, no actions; four rigged hair parts range 830–3,284 triangles. Kenney: shared 1,604-triangle, 58-bone body; three separate idle/jump/run motions, each with a targeting-pose track. Modular Women's model and embedded licence were quota-blocked; advertised counts are not validated. Exact URLs and date 2026-09-30 are in the review note and catalog.

Private current captures use unchanged production GLBs and renderer: Nell 5,380 triangles, Odessa 4,876, Wren 5,560; one skinned draw each. Browser harness passed on private port 52526, three captures, zero warnings/errors, memory-only saves. The source render applies only Kenney's supplied female texture to its unchanged shared body. A missing factory world and Blender's relative render-path expansion were corrected in the new inspection recipe; the misplaced disposable PNG was removed. Re-run inspection succeeded.

No race/save source, replay assertions or gameplay feature changed. No new event or sound cue applies. No wording-only tests were added. Independent review and exact clean commit lane/build gates remain pending; the Director records actual results before any merge.

Comparison: 1,800 x 1,660 JPEG, 376,150 bytes (below 500 KB). All 19 new recorded source/evidence hashes match the actual cached files; all 17 existing catalog entries remain unchanged.

Unchanged current runtime GLB SHA-256 values (verified byte-for-byte against the lane base):

- Nell (1,984,312 bytes): `513b50796a4dca0f83eab5dd1570cae99d5605326cbfae11e8cc7c6b71720889`.
- Odessa (1,920,000 bytes): `364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca`.
- Wren (2,063,012 bytes): `5e98ef99656e8065ff1d7726791538c6bc84c2938e0509c0385b484add8a9216`.

## Removed

No existing runtime art or recipe was replaced. Invalid quota-error downloads were removed, preserving actual licensed originals. The source-specific rejected temporary render outside the lane was deleted after correcting the output path. No earlier catalog entry or source licence was changed. Raw comparison captures are consumed and deleted after the verdict; only one <=500 KB sheet, recipes and findings are retained. Runtime retirement belongs to ART-FIT-CREW-W after a source is picked and all figures pass.

# HELI-ART-SRC

## Helicopter source settled

Claude picked the original Kestrel One in tools/blender/kestrel-one.py and
public/assets/heli/kestrel-one.glb; its three rounds are closed. The donor
route is dropped: no retry, R22 download or fourth helicopter round. Retain
licensed originals and their provenance. Codex owns the accessories only.

## Accessory review design, settled before implementation

The separate --review-dir mode imports the three exact existing GLBs without
building or exporting geometry. It records SHA-256 before import and after all
renders and fails if an asset changes. Six named views show hook front and
oblique, pad top and edge, pump front and side. Camera positions and targets
are authored in game metres (+Y up, +Z front), converted once for Blender.
Views retain the original model origins; the manifest records bounds, origin,
camera, labels, source path/hash and PNG paths. No reference or native-game
appearance claim is made. Claude judges the accessory art separately from the
closed Kestrel rounds, in looks/heli-accessories/round-1.

Reuse Kestrel's CPU Cycles 48 samples, four threads, AgX, sky and sun pattern.
Review output is restricted to a resolved descendant of this lane's ignored
.qa-dist or .evidence folder. No .blend, public output, GLB mutation, dependency,
generic harness, runtime loader or new test. Keep default export and
--paths-only behavior exact. Root reviews the source freeze and schedules any
render, original lane gate and build; none is authorized by this source edit.

The separate --sheet mode uses bundled Pillow only to contain all six full PNG
frames in two columns and three rows, without crop or retouch. Its caption
states BLENDER IMPORTED GLB / NOT GAME and gives measured dimensions. It writes
one immutable JPEG, at most 500000 bytes, to the canonical accessory round-1
path. It neither renders nor changes any source or runtime asset.

Current integration merged normally at 77033b64. The only merge conflict was
two additive credit paragraphs; both accessory and Kenney fire-atlas credits
were retained. No runtime or Kestrel source was changed by the resolution.

## Original accessory source

Director 8c912a66 authorizes the original recipe Claude chose for the three
accessories. tools/blender/heli-accessories.py and tools/art/heli-accessories.json
prepare only cargo-hook.glb, helipad.glb and fuel-pump.glb at their settled
future public/assets/heli paths. They do not make a helicopter or cable model.
The existing Blender recipe style supplies metre geometry, scalar PBR surfaces,
geometric normals, named meshes and glTF Y-up export. No texture, library,
shared catalogue row, runtime consumer, dependency or new test machinery.

The hook has a forged curved body, attachment eye, swivel and safety latch,
uniformly fitted to 0.4 m below its top origin. The 14 m circular pad has a
0.12 m slab and a separate painted H at top y=0, with long strokes along +Z.
Its 1 mm paint separation avoids coplanar faces and stays below 0.15 m overall.
The clean aviation pump has a base-centre origin and front +Z, a meter window,
generic JET A label, hose and nozzle. No manufacturer or operator marks.
Declared mesh ceilings are 4,000/1,500/6,000 triangles; textures are absent.
These are source budgets, not measured exports or an art verdict.

The generator measures actual finished mesh bounds, triangles, names and
used textures before each export. It exports only the three selected prop
roots/meshes, never cameras, lights, animation, .blend files or raw renders.
Its source clamps Blender threads to four after every scene reset. The
original paths-only recipe mode declares outputs without importing Blender.

## Evidence and checks

Normal integration union d9748201 completed without conflicts and preserved
the original source packet before these edits. Workspace Catalog was fresh,
not stale; recipe inspection used only this authorized integration worktree.
All previous donor provenance and eight cache receipt rows remain intact.
The old accessory donor proposals are marked as superseded by the original
recipe, without deleting licensed originals or pretending those donors shipped.

Root reviewed fbe27f80 and granted one export. Actual Blender 4.5.13 LTS export
passed all unchanged contract guards, exit 0 in 1612.7317 ms, threads four.
The actual GLBs also loaded through the existing GLTFLoader: world bounds,
primitive triangle counts, named parts and scalar PBR materials agree. All
three have zero textures/images/animations. The hook is 2108 triangles and
41748 bytes, height .400000006 m below top y=0. The pad is 1346 triangles and
84492 bytes, size 14 × .120999999 × 14 m, top y=0; real H bars are .7 m wide
and 5.4 m long along +Z. The pump is 2133 triangles and 98140 bytes, size
1.2393764 × 1.8700000 × .9223534 m, base y=0 and meter/label facing +Z.
Hashes, actual node lists and bounds are in the owned candidate packet.

Raw export stdout/receipt and actual GLB inspection are in integration
.evidence/2026-10-14/HELI-ART-SRC/accessories-fbe27f80. No guard, threshold,
recipe geometry or source input changed; no repeated export. Only these three
runtime GLBs and their original-geometry credits paragraph are added after
Root's explicit GO. No shared catalogue row or helicopter asset is added.
At that export checkpoint, render, comparison sheet, formal art round, native
views, lane gate and build were UNRUN. The actual first accessory round follows below. Numeric/source compliance is not Claude's art acceptance, which
remains pending within the three-round cap. No release, push, live folder/port
or real save access. Changed assertions: none.

## Held source checkpoint before round 1

The second lead reviewed this source and corrected two camera framings and the
shared evidence-junction image path before freezing it. Existing GLBs remain
unchanged. The packet's old helicopter download plan is historical and is
superseded by Claude's original Kestrel pick. All recipe execution, renders,
sheet composition, lane tests and build remain UNRUN. The first lead holds
all six build slots and must release an ART slot before this lane resumes.
No gate or art acceptance follows from this source review.

## Actual imported-GLB accessory round 1

The standing render grant was used on clean db6f04d1 after the existing scheduler reported zero foreign jobs. Kyle's quota notice confirmed Claude source builders were paused until 17:40; the other retained Codex lanes stayed frozen. One CPU-four-thread render-only batch passed in 37643.3489 ms. Six genuine imported-GLB frames and the approved serial compositor produced the 156226-byte sheet under docs/board/looks/heli-accessories/round-1.jpg, SHA256 ac9f430bf139076117da400c4c025b16d7649a8ca0da905f0cbe03b2a0246e06.

Before/after SHA256 values match for all three GLBs; the existing measured origin, bounds, part, triangle and texture guards passed on import. The second lead viewed the whole sheet and original hook-oblique/pad-edge/pump-front images. Every object is fully framed and the intended parts are visible. This is a packet check, not an art verdict, native renderer pass or frame measurement. The recipe and runtime asset bytes remain unchanged after source review.

The separate round review requests Claude's verdict when quota returns. No second round, gate, build, source-code or runtime-loader change has run. The source packet cancels its obsolete donor retry plan, preserves original licences/provenance, and records the actual sheet/hashes. All first-round raw frames and receipts remain available for review; cleanup follows the recorded verdict.

## Original lane failure and bounded planner correction

The first canonical gate on 77cf4446 completed 26/28 suites, notRun 0, jobs 4, exit 1 in 251723.4866 ms (256681.7416 ms wall). Only test-blender-output and test-repo-hygiene failed. Replay, world signature, helicopter and kit guards passed. Build was not started. Original evidence remains in final-77cf4446.

The placement fault was an inherited root run-log.md. Its creator already folded that line into docs/board/run-log.md and removed the stray file on integration at c2c28be1; the lane merged current integration normally at f7c683ad without conflicts. No allow-list or placement assertion changes.

The new accessory recipe was missing from the existing strict generator roster. Root granted a single additive recipeOnly row, exact three GLB paths and exact empty Blend output for this recipe, whose accepted contract writes no .blend. All earlier generators retain their original positive Blend counts and path checks. Existing all-generator coverage, two-root reproducibility, no-output creation and runtime-existence checks remain. This explicitly extends the new recipe's contract; it does not disable an older case or change a tolerance.

The actual existing roster invokes --paths-only against an empty temporary root. The accessory planner therefore returns its existing constant path list before reading its config. Actual export, review and sheet modes still read and strictly validate the same config. No Blender/Pillow/config read or file output occurs during planning. No asset or render function changes, and no repeated export or art round is needed. Root reviews the new source freeze before the focused original suite and fresh canonical gate/build.

## Actual Claude decision and round 2 design before code

The successful single image-only Claude review returned CHANGES REQUIRED: hook shape/material/readability 3/2/2; helipad 5/4/5 accepted; pump 4/4/5 accepted. Only the 156226-byte JPEG and basic visual brief were transmitted, with tools disabled; the larger repository packet had been rejected before its process ran. The raw verdict is preserved in claude-image-only-round1-79769594. No art pass or invented game result is recorded.

Settle the hook correction from that actual art decision: replace the near-circular C/ring body with an asymmetric forged J profile and clearly tapered upturned tip. Use a grey steel flat flap, hinged visibly at the neck and seated against the tip. Keep the attachment eye, swivel and existing required node names; add a small latch_pivot if needed. Preserve exact 0.4 m height below the top attachment origin, no textures and the 4000-triangle ceiling. All geometry uses identity mesh transforms before the existing uniform fit. Do not alter the accepted pad/pump geometry, material or bytes. Remove the superseded orange rod/body and its unused orange material in the same change.

The bounded recipe support is a selected --asset export so only cargo-hook.glb is rebuilt, plus --round choices 1 to 3 (default 1) for the existing immutable review manifest/sheet. Default planning remains three exact paths and no config/Blender/Pillow read. Render and sheet modes reject an export selector. Round 1 is preserved; round 2 gets its own folder, JPEG and provenance. This is the same original-asset recipe and review workflow, not new test machinery, a runtime loader, a fourth Kestrel round or another task. Freeze for the lead's code review before any export/render/check.

The prior mechanical freeze 79769594 passed the focused original 63-check planner suite, canonical 28/28 lane with jobs 4/no skips (277152.1125 ms, 282266.2025 ms wall) and build (1201.6639 ms wall, Vite 696 ms). Those results do not certify the next changed hook. The generated build copy was recycled; raw round-one views and receipts remain until review use is complete.

The prepared round-two source passed an independent read-only review: no blockers. Reviewed SHA256 values: recipe 69714e14b16b4eefd7fe0bb9ebde025c70ae359003b2be5796cf09bce357f8df; config 78c15dba7ef526f7aca9c5377e802a834e2e5829a9f02dd3e300a04118ebdfb5. This confirms source correctness, not the next art verdict. Export, render, second sheet and fresh lane/build remain unrun at source freeze.

## Actual accepted accessory round 2

After Root's bounded GO and the explicit 05:38 UTC quiet-window cutoff, one
hook-only CPU-four export passed in 886.7909 ms. Actual hook: 1496 triangles,
50440 bytes, 0.221702360 x 0.400000006 x 0.070119821 m, attachment top y=0,
required parts including latch_pivot, no textures. SHA256 is
13ed385c3849d33e3885685435944fb3ff7c105f34cf1dae2a7e9eddfe0c1f6e.
Accepted pad and pump hashes stay exact before/after export and rendering.
The same six actual imported-GLB CPU-four views passed original guards in
44273.2477 ms. Serial composition passed in 600.0582 ms: round-2.jpg is
154597 bytes, SHA256 9fc6fd688098bd6826ad86e4e2ccc65a7ba48b8937f0f1da69435d59db18e70d.
Round 1 stays immutable. No alternate geometry, native flight or frame pass.

Actual single image-only Claude R2: ACCEPT, exit 0 in 22710.862 ms, no tools.
Hook shape/material/readability 4/4/4; pad 5/4/5; pump 4/4/4. The requested
J throat and grey hinged flat flap seated on the tip are accepted. A thick
pivot is optional and nonblocking, so no further round or polish. The full
verdict is summarized in looks/heli-accessories/round-2-review.md; raw actual
proof remains in .evidence/2026-10-14/HELI-ART-SRC/round2-971dbb74/, with the
minimal JPEG-and-brief-only transcript in claude-image-only/. No repository
instructions/documents/manifests were transmitted. Recipe/config geometry
remains the independently reviewed 971dbb74; only config status now records
this actual acceptance. Existing source-candidate packet's R1 hook metrics
are superseded by these actual R2 values; Root can fold that metadata at
integration without a new asset export or art round.

Current integration sync in the lane and one fresh nearby/jobs4/build follow
this art freeze. Root consumes the exact receipts and folds final results
into its integration merge; no status-only lane commit or autonomous merge.
Changed assertions: none. Replay/world guards are part of that fresh gate.

## Current integration sync before the fresh gate

The lane sync has one adjacent-row conflict in tools/test-blender-output.mjs.
Keep both the unchanged accessory recipeOnly row and integration's skin-gear
row. The incoming rescue-people row and every other integration addition stay.
No assertion, path expectation or old positive Blend contract changes. Root
confirms this bounded union before the fresh nearby/jobs4 gate. The accepted
asset and sheet bytes remain frozen; no rerender or review repeat follows.
Root's short final pit run takes the next slot before this gate.

## Removed

Replace the pending accessory donor question with Claude's original-recipe
decision. Preserve those unselected candidates' provenance and every original
licensed cache file. Earlier uppercase/skid-midpoint/cable-model suggestions
remain superseded by Claude's exact export contract. Round 2 replaces only the previous runtime hook bytes and removes the old
ring/orange-rod path and unused orange material. Accepted pad/pump bytes,
licensed originals, foreign folders and the retained lane remain intact.

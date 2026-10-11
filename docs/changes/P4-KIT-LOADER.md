# P4-KIT-LOADER

## Decision before code

Use only the 35 approved local High/LOD GLB pairs, unchanged. Circuit metadata
opts in with `kitPlacements` entries: `{id,s,lateral,heading=0,scale=1,lift=0}`.
Distances and lateral offsets are metres, heading is a radian offset from the
road tangent. Scale is positive scalar or `[x,y,z]`. Copy and freeze inputs;
never mutate course, race state or authored assets. No new switch is needed:
only the owning track feature switches expose these opt-in definitions.

`createTrackKits(course,{placements,extraPlacements,requiredIds,loadAsset})`
returns the world owner: group, ready, status, error, update and dispose.
The renderer prepares it before building the world. All required High and
LOD assets must load and validate before synchronous scene attachment,
lighting material discovery, ambient refresh and existing shader preparation.
Failure stays visible and holds readiness; never substitute geometry.

Cache each asset/version once per world owner. Batch static pieces as actual
InstancedMeshes; gantries and skinned pieces use owned clones. High uses near
models within 160 m; distant models and Performance use the approved LOD.
Gantry lamp-1 through lamp-5 have private materials and read genuine GP start
state. Non-GP/menu lights are off. No race writes or extra sound event.

Validate actual transformed low structure against the road: 0.5 m margin and
4.5 m headspace. Ground pivots anchor to actual Float32 near/far terrain triangles; anchors over
omitted or outside terrain fail visibly. Authored hairpins sample the upper
drawn near/far triangle by actual world position. Legacy default stays exact. Only plough-bank
may reference its actual deep-snow surface patch with canonical
`{kind,s0,s1,from,to}` bounds; its footprint must remain in that patch. Flat
snow-ground geometry at most 0.5 m tall alone may lie under the road. Other
pieces cannot opt out. This API also accepts Snow's immutable extra entries;
no Snow feature or existing-tree replacement belongs to this card. Optional
scenery tree bindings are copied; setPlacementPose(index,matrix) copies finite
presentation poses into both versions without changing inputs or race state.

Resources belong to the owner. Source/shared geometry, materials and textures
are released once; private lamps and skeletons are owned too. Disposal is
idempotent, and late loading cannot attach or revive a retired world.
Existing empty routes add no objects or asset request and stay exact.

Director reproduced 44 missing ground hits in 72 actual Panorama raycasts:
the 64 m ribbon ended before the 32 m far grid began. The paired surface
builder and sampler now use 16 m cells and the existing 40 m exclusion only
for terrainHalfWidth=64. Ordinary legacy branches and road physics stay exact.
## Checks

The initial headless fixture failed on the missing module before implementation.
Metadata, transform, clearance, lifetime, readiness and all 70 real GLBs now pass;
actual authored near/far terrain triangles and all 72 join points pass.
The 34 existing readiness UI and 33 exact legacy world checks also pass.
Director source/lifetime/terrain review clears 6f387678; native recipe fixes
freeze at ac1e053e. Memory-only native High/Performance and Panorama join pass
on private port 59154: 532 static batches, 10 skinned meshes, 248 decoded
textures per quality, all five real countdown lamps, source failure/recovery,
and unchanged race/profile; zero console errors or warnings. Three functional
screenshots inspected: separate grounded pieces and continuous authored join.
No frame measurement or performance claim while Claude ran headless balance.
The first native attempt exposed a frozen catalog fixture; fixed by copying
run-owned metadata before world build. No runtime/assertion waiver. Lane/build
remain queued. Director grants the narrow kit-loading/error status hook.
No fourth art round; all approved assets stay unchanged.

Synced integration5b6e325b canonical kit sheets/recipe registration. Seven owned
runtime files/assets stayed byte-exact to ac1e053e; Harbour/Tremblant intel
metadata retained. Native verdict above remains applicable; no new native/gate.

Claude check-in4 adds optional finite nonnegative lift in metres above the
rendered ground anchor, default0. Keep the existing actual High/LOD triangle
clearance test: elevated geometry must clear the road by4.5m at every checked
point. No blanket exemption or change to ground-level matrices. Harbour uses
this for lantern strings and raised signs; tests cover missing/invalid lift,
actual raised transforms, threshold clearance and low-detail clearance.
The raised lantern regression first fails road clearance, then passes with lift.
All70 real GLBs and72 actual terrain probes pass; prior default transforms
remain exact. No new native/frame run; current lane/build and review are queued.

## Snapshot sync decision before code

The reviewed d774 source passed lane380/380 in690.19s and build507ms.
Genuinely merged dcdab and current ababc9c5 kerb source/card/status;
snapshot APIs plus kit retry/disposal retained.
Snapshot drawing must wait for real kit readiness before world build, then
update High/LOD at the snapshot ground with menu-only presentation state.
QA debug forwards the existing snapshot API without new state/catalog writes.
Native regression will request a run-owned authored course, prove loading/error
never yields a snapshot or substitute, inspect actual approved placements,
and compare the complete race, profile and memory storage before/after.
No assets, timeout, clearance, assertions or rendering effects are weakened.
Native Red reproduced pending-asset world build. Green passes both actual
snapshot qualities, three approved placements, visible broken-source errors
and original timeout. Complete race/profile/memory-storage stays exact.
Five final native views inspected: actual High/LOD gallery spans the road,
separate pieces remain grounded, authored join continuous;0warnings/errors.
No frame/art-round claim. Fresh current-source lane/build remains queued.

## Removed

Removed the broken authored ribbon/far-grid join.
No assets/scenery replaced; Snow owns future tree replacement.

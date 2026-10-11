# P4-KIT-LOADER

## Decision before code

Use only the 35 approved local High/LOD GLB pairs, unchanged. Circuit metadata
opts in with `kitPlacements` entries: `{id,s,lateral,heading=0,scale=1}`.
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
4.5 m headspace. Ground-level pivots anchor to actual rendered Float32 terrain triangles.
Authored 64 m ribbons use the real far grid outside that strip; anchors over
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
The 34 existing readiness UI and 33 exact legacy world checks also pass. Real native High/Performance loading,
lane tier, build and one independent review remain required. Director grants
the narrow screen-readiness kit-loading/error status hook as well. No fourth art
round; all approved assets stay unchanged. Heavy checks wait for the Director.

## Removed

Removed the broken authored ribbon/far-grid join.
No asset or existing scenery is replaced. Track cards own placement metadata;
future Snow retains existing tree break behavior until a replacement proves it.

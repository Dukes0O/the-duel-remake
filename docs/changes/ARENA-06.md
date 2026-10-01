# ARENA-06: Salt Flats

Status: building; generated ground is ready for the next game comparison.

## Changed

Kyle’s 1 October decision replaces the repeating photograph with seeded
salt. A fixed seed builds one 1536 by 1024 colour atlas across the whole
300 by 200 metre bowl: broad tone drift, salt polygons about four metres
across, and a dustier driving band read from the actual Course frames.
A generated normal atlas gives the crust ridges relief. Fine grain uses
world coordinates close to the camera.

The unique atlas fades inside its edge. The four adjoining scenery strips
use generated world-coordinate salt without a stretched or repeated bowl
image. Both surfaces share the same seed and ground settings. Distant heat
remains view-only; no race state or seeded simulation randomness changes.

The accepted island contains four native salvage stacks behind its solid
wreck boundary. All 172 native meshes, 184,340 triangles, donor faces and
transforms, the Bus, crane, ramps and 168 Course colliders are preserved.
Only the ground material and its UV mapping change. The private generated
candidate is 21,832,992 bytes, about 0.88 MB above the photo-based island
candidate; it still uses 172 draws and two shared native materials.

The public venue entry still waits for Arsenal and the wreck-rate event
hook to be free. No visual approval or passing final merge gate is claimed.

## Tests and review

The independent author committed the generated-ground checks while the
config check was RED; both original control cases passed. Source then
implemented the generator and the explicitly approved photo-test migration.
The config and its two controls now pass. The complete native/source suite
has no new failure; its six held public switch, launcher and Fuel Run cases
remain explicit. All 16 registered Course geometry cases and 29 independent
native boundary/collision cases pass.

Repeated native exports preserve the actual generated colour and normal
image bytes. The old and new GLBs retain the same native position, normal
and index buffers; only ground UV/material data changes. Original donor,
driving, ramp, state, lifecycle and replay assertions are unchanged.

Changed assertions: the retired photo catalog binding, JPEG helper,
mandatory photo-input assertion and embedded photo/mirrored-repeat
assertion are removed from active ground tests under Kyle’s written change.
Their replacement checks cover seeded settings, genuine embedded generated
textures, absence of the old photo and mirrored samplers, and actual image
byte repeatability. No tolerance, gameplay assertion or replay pin changes.
Earlier pixel and compile-counter art diagnostics were removed under
Claude’s direction; looks are judged from actual pictures.

Next: refresh private renderer artifact pins and check loading, disposal,
race-state purity and matched High/Performance frame cost on this candidate.
Capture full and racing views, obtain critic and Claude verdicts, then finish
the held public hooks. The same Scrapdome plus 10% frame limit applies.

## Removed

Removed active photo configuration, loading, embedded image, mirrored
sampler rewrite and obsolete photo-only helpers/assertions. The external
CC0 photograph and its licence/catalog provenance remain untouched.
Removed no licensed donor, current game asset, physical rule or replay pin.

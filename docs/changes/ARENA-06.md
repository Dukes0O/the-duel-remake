# ARENA-06: Salt Flats

Status: building; generated ground is ready for the next game comparison.

## Changed

Kyleâ€™s 1 October decision replaces the repeating photograph with seeded
salt. A fixed seed builds one 1536 by 1024 colour atlas across the whole
300 by 200 metre bowl: broad tone drift, salt polygons about four metres
across, and a dustier driving band read from the actual Course frames.
A generated normal atlas gives the crust ridges relief. Fine grain uses
world coordinates close to the camera. Round two widens the ridge beyond
the native texel spacing, strengthens its relief and whole-bowl tone drift,
and makes the Course-derived band greyer with feathered edges and weaker
crust. Close grain is stronger and fades when the screen cannot resolve it.
The atlas remains the same size; no geometry or UV changes are needed.

The unique atlas fades inside its edge. The four adjoining scenery strips
use generated world-coordinate salt without a stretched or repeated bowl
image. Both surfaces share the same seed and ground settings. Distant heat
remains view-only; no race state or seeded simulation randomness changes.

The accepted island contains four native salvage stacks behind its solid
wreck boundary. All 172 native meshes, 184,340 triangles, donor faces and
transforms, the Bus, crane, ramps and 168 Course colliders are preserved.
The second round changes only material settings and generated images. Its
private candidate is 22,791,328 bytes, about 0.96 MB above the first generated
candidate because the stronger crust and tone use more PNG bytes. Atlas
dimensions, 172 draws and two shared native materials stay unchanged.

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

Repeated native exports preserve actual generated colour and normal image
bytes. Every round-two native attribute, index, transform and UV matches the
first generated browser artifact exactly. Existing native/source cases pass,
with all 16 Course geometry and 29 collision/boundary checks passing again.
Only the same six held public-entry failures remain. No assertion changes
in this material tuning; donor, driving, ramp, state, lifecycle and replay
checks remain unchanged.

The critic judged all actual round-one pictures: visible repeats are gone,
but near and racing views score 3, while full and heat views score 2. Crust,
grain, tone drift and the worn band were too faint. Those pictures do not
approve the look. The stronger round-two material awaits new pictures and
matched frame measurements.

Changed assertions: the retired photo catalog binding, JPEG helper,
mandatory photo-input assertion and embedded photo/mirrored-repeat
assertion are removed from active ground tests under Kyleâ€™s written change.
Their replacement checks cover seeded settings, genuine embedded generated
textures, absence of the old photo and mirrored samplers, and actual image
byte repeatability. No tolerance, gameplay assertion or replay pin changes.
Earlier pixel and compile-counter art diagnostics were removed under
Claudeâ€™s direction; looks are judged from actual pictures.

Next: refresh private renderer artifact pins and check loading, disposal,
race-state purity and matched High/Performance frame cost on this candidate.
Capture full and racing views, obtain critic and Claude verdicts, then finish
the held public hooks. The same Scrapdome plus 10% frame limit applies.

## Removed

Removed active photo configuration, loading, embedded image, mirrored
sampler rewrite and obsolete photo-only helpers/assertions. The external
CC0 photograph and its licence/catalog provenance remain untouched.
The second material round replaces its weaker generated images with the
current recipe settings; no new runtime asset is installed here. Removed no
licensed donor, current game asset, physical rule or replay pin.

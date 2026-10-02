# ARENA-06: Salt Flats

Status: final private art accepted. Public entry and final gates remain.

## Changed and accepted

Kyle's 1 October decision replaces the repeating photograph with seeded salt.
A fixed-seed 1536 by 1024 colour atlas covers the 300 by 200 metre bowl, with
broad tone drift, four-metre salt polygons and a dustier driving band read from
actual Course frames. A normal atlas supplies crust relief; world grain is
visible close to the camera.

Final round three keeps band colour and feathering while preserving 90% normal
relief independently. Warped coordinates and irregular sites remove the cell
lattice; wider site search and screen filtering prevent distant ridges from
aliasing. Anisotropic filtering preserves detail at oblique views. The unique
atlas fades into four matching world-coordinate strips outside its edges.
Distant heat is view-only; seeded simulation and race state stay unchanged.

The accepted island keeps four salvage stacks behind its solid wreck boundary.
All 172 native meshes, 184,340 triangles, donor faces and transforms, Bus, crane,
ramps and 168 Course colliders remain exact. The candidate is 23,283,392 bytes,
about 0.49 MB larger than round two due to the irregular generated PNGs.
Atlas sizes, native UVs, 172 draws and two shared materials stay unchanged.

The final comparison is accepted. This private verdict does not prove passing
public entry or final merge gates; no fourth art round is needed.

## Earlier private validation

Generated-ground config and both old controls pass all three checks.
All 16 registered Course geometry cases and 29 native boundary/collision cases
pass. Earlier build passes; the whole-card gates still await public hooks.
Repeated exports preserve actual colour and normal bytes. Native attributes,
indices, UVs, transforms, features and donor lineage match round two exactly.
No material-round tolerance or replay pin changed.

Round one scored 3 near/racing and 2 full/heat; round two improved band separation
to 4 and full art/materials to 3 while near/chase stayed 3. Final round three
passes all sixteen actual game views without errors or warnings. Independent
Source review found no defect. Headless renderer and effects pass eight cases
each; the critic scores all assessed items four in both qualities. Paired
180-frame Scrapdome/Salt captures show P95 16.8/16.8 ms in both qualities,
within ten percent. Motion and sound remain unassessed.

## Settled public scope and approved test migration

Claude answered at 00:30 on 2 October: merge Salt with Last Car Rolling and Fuel
Run playable. Bounty Hunt and Ambush Alley add Salt in their own cards.
The consumed four-mode dependency question is resolved and removed.

The Director's independent reviewer approved replacing the finite Fuel sudden
death assertion with exact published Fuel limits: 180 s and Infinity. Last Car
Rolling retains its finite-limit assertion. Fuel uses a separate 600 s test
observation watchdog; it never writes game limits, forces completion or changes
the next-delivery sudden-death rule. Actual arena_result, physical bounds,
event trace and seeded repeated results remain required.

Native fixtures explicitly enable the existing fuel-run dev flag. Salt-off
controls keep Fuel enabled. Additive actual App tests cover rank-nine launch,
rank-eight rejection, discovery and flags for both approved modes, unknown
Fuel venue rejection and normal Scrapdome availability below Salt rank.
No existing assertion was relaxed outside the independently approved Fuel
limit migration. No Source, geometry rule, tolerance or replay pin was edited.

## Tests-first handoff, 2 October

After an ordinary integration merge, syntax and git diff --check pass.
node tools/test-salt-flats.mjs --entry-only: 22 checks, 13 PASS, 9 genuine RED.
Failures are the missing Salt dev declaration; rank-eight and Salt-off entry
falling back to Scrapdome in both modes; successful entry selecting Scrapdome
in both modes; and unknown venue fallback in both modes.
Discovery/other flag rejection controls, legitimate Fuel flag and both normal
Scrapdome rank-eight launches pass. There is no missing-module or fake mode
failure. Public Source is still held for the builder to implement these gates.
The bounded selection excludes full rounds, scene/export, geometry and Blender.
The migrated Fuel completion check and earlier private art checks were not
rerun here; their downstream behavior is not passing evidence for this handoff.
No broad lane/full tier, build, browser or performance job ran. Final card gates
must pass after the public hooks. Blender coverage stays with Tanker until merge.

## Additive panel/native-gate tests first

Before panel/Game Source: --entry-only gives 32 checks, 26 PASS, 6 RED.
Both modes lack eligible venue buttons and selected Salt's entry label; native
Duel admits known Salt with its flag off. Four pure locked/off panel controls
pass. The worker's earlier App changes pass the original 22 entry checks.
Tests use actual arenaYardPanel/createProfile and Duel APIs, retain all earlier
assertions, and do not inject future helpers or modify worker Source.
This bounded follow-up ran no broad, build, browser, round or Blender job.

## Removed

Removed active photo configuration/loading, embedded photo, mirrored sampler,
JPEG helper and photo-only assertions under Kyle's written ground decision.
Removed the consumed mode-scope question and obsolete finite Fuel sudden-death
assertion under independent review. Licensed donor/photo provenance, current
game assets, physical rules and existing replay pins remain intact.

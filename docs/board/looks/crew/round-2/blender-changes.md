# Crew round 2: Blender changes

This is one fidelity round. Internal source-coordinate studies and rebuilds
are not additional rounds. Round 1 files remain unchanged.

- Replaced the broad body projection with separate head, torso, arm, leg and
  boot UV coordinate islands. Measured front and rear centers in the original
  reference sheets. Wren's three reference centers and Dune/Tusk face centers
  were substantially wrong in round 1. Original reference images are untouched.
- Corrected mesh winding for descending cross-sections. Arm and leg sections
  authored from shoulder/hip downward previously had inward normals, which
  also made the front/back UV selector put rear textures on front surfaces.
  Both ascending and descending sections now have outward normals before UVs
  are assigned. Side-reference photos are no longer stretched onto frontal
  facial polygons; this removes the reversed Tusk profile mapping.
- Built continuous arms and legs with blended elbow/knee weights, sloping
  shoulders, fuller thighs/calves, a wider stance and wider/longer boots.
  Added a fitted hair cap, smaller broken locks and layered angular Tusk plates.
- Added one 1024-square surface atlas to each existing color atlas. Cloth,
  leather and plate regions vary in roughness; Tusk's plate regions also vary
  in metallic response. The models still use one material each.
- Added support-knee and heel/toe changes, pelvis weight shift, staged get-up
  arm/leg action, repair torso follow-through and crouched car reach poses.
  Jump root height remains owned by the simulation.
- Reset Blender to an empty database between crew exports. Each source now
  contains one crew's data rather than accumulating previous packed textures.

The final per-crew JSON files record source crops, exact asset/image hashes,
camera settings, triangle counts and measured generation duration. The family
manifest records the generator hash. All neutral shots use idle at 0.25 seconds,
the same 432 by 576 camera, and front/side/back rotations as round 1.

This note is implementation evidence, not an independent visual score.
Jax's coat silhouette, Dune's hood, hair and facial proportions still need
independent review against the matched game captures.

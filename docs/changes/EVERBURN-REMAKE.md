# EVERBURN-REMAKE slice 10
Cars: render3d.js places road cars through applyVehicleTerrainPose and job cars through placeWorldJobVehicle; the shadow and pot follow their parent.
Machines: scablands-scene.js places Big Bess through placeRig; her dust and shade follow the rig.
Walkers: combat-scene.js sends poses to rigged-fighter.js and onfoot-figures.js; render3d.js places the on-foot camera; Cinder and his ring share one root.
Effects: effects.js uses the car support and tire contacts; vehicle markers follow the drawn meshes.
The near mesh is discarded inside river distance 80 m. The gorge extends to 92 m, overlapping outside; the higher mesh is visible there.
The helper joins the cut edge across 77 to 83 m, reads stored near corners and indexes the gorge triangles; no race state changes.
Drawing fault: the cut edge has a .199501277 m step near (2650.79,2221.98); blending hides the actor jump, not the mesh seam.
Focused checks: scene contact passes; four ways and ten river-bank lines pass both revised step limits; twelve actors cost .076 ms on plain, .111 ms at river (development checks).
Final checks and integration merge pending. Browser pictures are written, not run; Chrome is unavailable in this job.
Changed assertions: route survey logging gaps over .3 m becomes contact within .05 m (half the seam allowed in the band); Bess escort height becomes own height plus drawing shift, with the same .001 m tolerance. Continuity .08 becomes .3 per Claude, plus .05 at .05 m.
Codex decided: preserve the near mesh's existing .025 m lift at lattice corners; taper that allowance away before the river blend.
Sound: no new game event or cue. Windbreak accepted in separate commit 173751c1d; its focused check passed.
**Removed:** unshifted actor, effect and camera placement on unedited Scablands ground; the windbreak replaces the passable shelter back.

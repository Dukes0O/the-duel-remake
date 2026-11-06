# TOWN-ART-OUTPOSTS

## Result

Stopped before submitting an art round. A first Blender recipe and exported GLB were tested in an empty scene. The exported view did not show the diner at a useful scale: large pieces crossed the frame, the model read as a jumble, and several material pictures stretched into stripes. A second camera and light setup did not correct the model. This does not meet the card's visual bar, so no model or comparison sheet is included.

## Checks

- Blender recipe executed twice and exported `outposts.glb` both times.
- Imported the exported GLB into an empty Blender scene and rendered it twice. Both views failed visual inspection.
- Did not run `test-blender-output.mjs`, `test-repo-hygiene.mjs` or `test-review-evidence.mjs`; the recipe and GLB were removed instead of being submitted.
- No browser, frame, build or lane tier checks apply to this stopped art attempt.
- No race fingerprints or test assertions changed.
- Claude should review the failure description and decide whether the diner should be split into a smaller independently rendered/modelled round after the GLB transform and UV problem is understood.

## Removed

- Removed the trial recipe, exported GLB, render, and Blender log. No review sheet or runtime asset remains from this attempt.

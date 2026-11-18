# EVERBURN-REMAKE slice 10
Blocked: the card's continuity and ground-contact limits conflict on the river-bed way; no game code changed.
Cars: render3d.js uses placeGroundedVehicle/applyVehicleTerrainPose; job cars use placeWorldJobVehicle, and their shadow and pot are children.
Machines: scablands-scene.js uses placeRig for actor Big Bess and the furnace; their dust and fire follow the rig.
Walkers: combat-scene.js supplies fighter poses to rigged-fighter.js, which places each root at selected.pose; onfoot-camera.js supplies the view.
Loose effects and rings: effects.js uses groundHeight/course ground contacts; raider-markers.js uses warning positions, while vehicle markers use meshes.
Evidence: tools/test-scablands-drawn-feet.mjs surveys all four ways at .5 m steps using the scene's drawnGroundHeightAt and single-floor support.
River-bed endpoints: (2650.547495485339,2221.593683396706) and (2650.8155992893485,2222.015716385122).
Required corrections differ by .189526939 m; even allowing .05 m error at both ends leaves .089526939 m, above the .08 m step limit.
Claude must decide whether to change the ground answer or revise the correction/continuity requirements; smoothing alone cannot meet both tolerances.
Check on ba35c45ab plus this test: new feasibility suite fails the incompatible limits as intended; integration merge reports already up to date.
For Claude: resolve the limits first; renderer helper, coverage, timing, pictures, older suites, lane tier, replay guards and build remain unbuilt/unrun.
Changed assertions: none; this new check retains the card's stated limits. Sound cues: none; no game event added.
Codex decided: stop before changing the renderer, as the card's stop rule requires.
**Removed:** no runtime code replaced; temporary survey will be removed before handover.

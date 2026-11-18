# EVERBURN-REMAKE slice 10
Blocked under Claude's ruling: the 0.05 m continuity check fails at the 80 m river boundary; the height cure is not built.
Cars: render3d.js uses placeGroundedVehicle/applyVehicleTerrainPose; job cars use placeWorldJobVehicle; shadow and pot are children.
Machines: scablands-scene.js uses placeRig for Big Bess and the furnace; dust and fire follow the rig.
Walkers: combat-scene.js supplies poses to rigged-fighter.js; onfoot-camera.js supplies the view.
Effects and rings: effects.js uses groundHeight/course contacts; raider-markers.js uses warning positions; vehicle markers use meshes.
Largest changes at 0.5 m / 0.05 m steps, with fine-step endpoint (x,z):
East road: .036011144 / .035895112 m at (3163.270483,354.358530); plates: .148869267 / .026898702 m at (2944.660091,-245.644691).
Salt pan: .066489090 / .024953438 m at (1048.655434,-1688.627148); river bed: .189526939 / .199501277 m at (2650.792567,2221.979461).
River failure starts at (2650.765756,2221.937257): river distance 80.017237 becomes 79.974081 m, switching near ground to gorge mesh.
Even .05 m contact error at both ends leaves .099501277 m of change, exceeding .05 m. Claude must authorize joining the ground answers or revise the limits.
Separate commit 173751c1d adds the salt windbreak wall; focused test-scablands-solid windbreak check passes (1/1). Integration merge: already up to date.
Checks: revised drawn-feet survey fails as above on 173751c1d plus survey edits; no lane tier, replay checks or build after this required stop. For Claude: unblock the ground boundary, then complete checks and scenario pictures.
Changed assertions: compatibility bound .18 m at .5 m becomes exact correction limits .3 m at .5 m and .05 m at .05 m, per Claude's ruling. Codex decided: none. Sound: no new event.
**Removed:** no game drawing replaced while blocked; shelter's passable back is replaced by its solid wall.

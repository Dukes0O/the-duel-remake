# EVERBURN-REMAKE, slice 5

- Cinder hands over within 12 m; her brazier clears the exit. The full fence burns; key 4 is hinted within 40 m.
- Causes: Rook spoke on weapon start without checking danger; the gate opened only below 30 km/h; Easy rider contact used clipped movement and halved it.
- Rook waits for clear danger; the gate opens on approach; rams use closing speed, then riders retreat 40 m for eight seconds. Road riders start within 150 m of their fence or 120 m of themselves.
- The furnace horn follows more than eight seconds in sight. The widest sampled cover gap is 92 m, or 6.6 s at 50 km/h. Cues: `world.tintown.gate`, `world.ember.spark`, `world.furnace.horn`.
- Checks on e2d4235be plus these edits: job1 and scablands-hills passed; changed-file tier since a5ecbad64 45/46, size timing failed under load and passed alone 9/9; build passed. Prior combat balance timed out under load and passed alone 34/34.
- Replays passed: race 297, combat 12; world composition signature 63. Easy Hot Delivery passed 10/10: 63.561 fire, three rams each. Medium East Road: 40.998 fire, three rams.
- Medium bed before on 494f2b9e3: 35.597 fire, zero rams; after: 35.862 fire, zero rams. The yard helpers follow the gate centre line.
- Older matching short suites passed in the tier and separately: arena-settlement, arena-ui, arsenal-core, arsenal-wave2, ember-lines, ember-pot, ember-save, ember-screens, ember-side-jobs, everburn-line-audit, everburn-play-fixes-a, everburn-play-fixes-round4, everburn-play-start, everburn-screens-start, fight-voices, forge-hold-camera, gear-find, iron-line, madmax-solid, p4-audio, rail-steps, rear-view, scablands-job-map, scablands-map, scablands-scene, scablands-size, scablands-solid, ships-lines, town-links, town-world, tunnels, world-hud, world-job-mode and world-jobs.
- Left to night: field-battle, old-smoke, run-gas-medium and scablands-regions (long); blender-output is a Blender art audit. Run-gas passed in the tier. Browser scenarios cannot run here.
- Changed assertions for Claude: pickup 8.1/7.9 to 12.1/11.9 m; brazier offset 7 to 20 m and Cinder clearance under 3 to at least 6 m; gate speed and solid checks follow the rulings.
- Furnace assertions for Claude: job1 opening and shelter limit and horn tick 6 to 8 s; scablands-hills warning tick 6 to 8 s and post-cover tick 5 to 7 s. Claude ruled the eight seconds.
- Codex decided: none. For Claude: run the browser scenario and hand drive the plates; assess the 42 to 50 km/h cover crossing.
- **Removed:** old hand-over radius, brazier position, centre-point fence target, slow-only gate, clipped rider contact and six-second furnace limit.

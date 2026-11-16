# EVERBURN-REMAKE, slice 5

- Cinder takes the pot within 12 m; her brazier is clear of the gate. Fences burn along their drawn length, with a key 4 hint within 40 m.
- Wrong message cause: weapon start triggered Rook without checking danger. He now waits until fences and riders are clear.
- Gate cause: its solid door opened only below 30 km/h. It opens on approach at any speed; its existing gate cue sounds.
- Rider cause: Easy contact used clipped final movement and halved it. Rams now use closing speed; riders charge, then retreat 40 m for eight seconds. Existing cue: `world.ember.spark`.
- Yard helpers now approach Cinder and the gate on the gateway centre line. The job test passes the yard exit and the East Road arrives alive with 41.00 fire and three rams; the later river-bed route fails with zero fire and three rams.
- On bbfe1514e plus these helper changes: Easy Hot Delivery finishes 10/10; its existing check does not report final fire. Fourteen ember, Everburn, world-job and arsenal suites passed.
- Changed assertions for Claude: pickup 8.1/7.9 m to 12.1/11.9 m; brazier offset 7 to 20 m and distance from Cinder under 3 m to at least 6 m; gate opens above 30 km/h. Gate check strengthened from no door to no solid. These follow Claude's rulings.
- Codex decided: none. **Removed:** the old hand-over radius, brazier position, centre-point fence target, slow-only gate and clipped rider contact speed.
- On ed27fe6b8: lane 132/135; job1 failed on the river-bed, scablands-size expected the old brazier place, and combat balance timed out but passed alone (34/34). With this change scablands-size passes 9/9; its brazier offset assertion changes from 7 to 20 m under Claude's ruling.
- On ed27fe6b8: race replays 297, combat replays 12 and world composition 63 passed; build passed. Lane left convoy-tanker-art, everburn-easy, field-battle, first-person-polish, old-smoke and run-gas-medium to the night; Easy had already run as above.
- Still needed: resolve the river-bed failure and establish the Easy deliveries' final fire; the existing Easy check reports completion, not the fire or rams. Audit older named suites not accounted for by the lane. Integration is up to date.
- For Claude: run the browser scenario. No browser check has run here.

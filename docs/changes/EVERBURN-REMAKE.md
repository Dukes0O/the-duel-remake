# EVERBURN-REMAKE, slice 5

- Cinder takes the pot within 12 m; her brazier is clear of the gate. Fences burn along their drawn length, with a key 4 hint within 40 m.
- Wrong message cause: weapon start triggered Rook without checking danger. He now waits until fences and riders are clear.
- Gate cause: its solid door opened only below 30 km/h. It opens on approach at any speed; its existing gate cue sounds.
- Rider cause: Easy contact used clipped final movement and halved it. Rams now use closing speed; riders charge, then retreat 40 m for eight seconds. Existing cue: `world.ember.spark`.
- Yard helpers now approach Cinder and the gate on the gateway centre line. The job test passes the yard exit and the East Road arrives alive with 41.00 fire and three rams; the later river-bed route fails with zero fire and three rams.
- On bbfe1514e plus these helper changes: Easy Hot Delivery finishes 10/10; its existing check does not report final fire. Fourteen ember, Everburn, world-job and arsenal suites passed.
- Changed assertions for Claude: pickup 8.1/7.9 m to 12.1/11.9 m; brazier offset 7 to 20 m and distance from Cinder under 3 m to at least 6 m; gate opens above 30 km/h. Gate check strengthened from no door to no solid. These follow Claude's rulings.
- Codex decided: none. **Removed:** the old hand-over radius, brazier position, centre-point fence target, slow-only gate and clipped rider contact speed.
- Still needed: resolve the river-bed failure; establish the Easy deliveries' final fire without another scripted drive; finish older named suites, replay and world-signature suites, lane tier and build. Integration was already up to date.
- For Claude: run the browser scenario. No browser check has run here.

# EVERBURN-REMAKE, slice 5

- Cinder accepts the pot within 12 m; her brazier clears the exit. The full drawn fence can burn; key 4 is hinted within 40 m.
- Wrong message: a weapon start called Rook without checking danger. Gate: the solid door opened only below 30 km/h. Rider: Easy contact used clipped movement and halved it.
- Rook waits for danger to clear; the gate opens on approach; rams use closing speed and riders retreat 40 m for eight seconds. Existing cues: `world.tintown.gate`, `world.ember.spark`.
- Road riders start within 150 m of their fence or 120 m of themselves; the yard helpers follow the gate centre line.
- Furnace warning now follows more than eight seconds in view; existing cue: `world.furnace.horn`.
- BLOCKED: the proof cover line has a 92 m open gap at 1,282 to 1,372 m, sampled every 2 m. At 40 km/h it takes 8.29 s; the required limit is 7 s. Claude must decide how to meet that limit.
- This working change on a5ecbad64: scablands-hills 56/56; everburn-job1 stops at the new gap check. Changed-file tier and build not rerun after this change.
- On a5ecbad64: changed-file tier 47/48, job1 failed at the old six-second sight limit; race replays 297, combat replays 12, world composition 63 and build passed. Combat balance timed out under load and passed alone 34/34.
- Bed Medium before at 494f2b9e3: 35.597 fire, zero rams; after: 35.862, zero rams. East Road Medium: 40.998, three rams; Easy: 10/10, each 63.561 and three rams.
- Earlier ember-lines, ember-pot, everburn-line-audit, arsenal-core and world-jobs passed. Older-suite audit incomplete; field-battle, old-smoke and run-gas-medium are night-only.
- Changed assertions for Claude: pickup 8.1/7.9 to 12.1/11.9 m; brazier offset 7 to 20 m and Cinder clearance under 3 to at least 6 m; gate speed and solid checks follow the rulings.
- Furnace assertions: job1 opening and shelter limit 6 to 8 s and horn tick 6 to 8 s; scablands-hills warning tick 6 to 8 s and post-cover tick 5 to 7 s, per Claude's ruling.
- Codex decided: none. For Claude: decide the cover gap, then run the browser scenario; it cannot run in this lane.
- **Removed:** old hand-over radius, brazier position, centre-point fence target, slow-only gate, clipped rider contact and six-second furnace limit.

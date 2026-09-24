# CPU UFO pickup gap

Read-only audit at `ad3b7c7`. BUG-07's open CPU UFO note remains accurate.

The explorer ran eight headless, memory-only contact cases using production
pickup and weapon functions: Medium and Hard, flag off with one rival, and
flag on for each of three rivals. Each rival crossed a UFO crate at its lane
and height. The crate remained, UFO inventory stayed zero, enemy firing
returned false, and the actor did not move. Replacing the crate with Star
collected successfully in the same fixture.

- `combat-pickups.js` excludes UFO from CPU collection and charge setup.
- `combat-weapons.js` excludes CPU UFO inventory and rejects enemy UFO use.
  Its landing calculation currently reads player checkpoint and lap state.
- `combat-ai.js` schedules bombs, crossbows and shields, with no UFO policy.
- `test-cpu-pickups.mjs` asserts the exclusion. A behavior fix must explain
  and independently review that assertion change.

The fixture imported dependency-free production combat modules with a small
duel stand-in. It did not run a full race or measure balance. Integration's
missing installed dependencies were then restored with `npm ci --offline`.

After BAL-01, expand BUG-07 for physical Medium/Hard UFO pickup and one safe,
stock-distance jump after the first checkpoint, once per lap for each CPU.
Reject occupied or solid landings and gate/finish skips without consuming a
charge. Keep other actors and race histories unchanged. Easy still ignores
pickups. Require frame-rate repeatability and the existing balance targets.

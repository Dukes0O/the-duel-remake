---
task: CMB-04
status: red acceptance tests
kind: test-author
flag: wasteland2
---

# CMB-04 pickup acceptance tests

## Contract

`buildSeededPickupPlan(duel)` returns an ordered array of crates with stable
`id`, zero-based `lap`, absolute route `s`, road `lateral`, and `kind` set to
`armor` or `weapon`. Weapon crates also name one current weapon. There are
three crates per lap (one armor, two weapon) and six for the current two-lap
events. On-foot ammo stays unspawned until FOOT-01.

`sweptPickupFraction(actor, pickup)` returns a crossing fraction from zero to
one, or `null` for no contact. A diagonal center crossing returns exactly
one-half; reverse traversal misses. The Director confirmed both rules. They
retain the existing forward pickup direction rule and a clear stable tie.

The flagged `stepPickups` tests use real Wasteland2 combat state and three
opponents. They check earliest eligible actor, stable player/CPU tie order,
one-time collection, +25 armor capped at each car's maximum, full and wrecking
car ineligibility, player and later-CPU weapon ownership, the UFO lap gate,
Easy CPU exclusion, and one collection at 30/60/144 FPS. Legacy flag-off
crate shape and recharge are pinned in the new suite.

## Red and green evidence on `fc6cbc7`

- `node --check tools/test-combat-pickups2.mjs`: passed.
- `node tools/test-combat-pickups2.mjs`: 3/11 pass, 8 expected red. Missing plan and
  swept-contact exports fail the API tests; flagged armor crates still enter
  the legacy weapon-only path; a ready weapon is consumed. The flag-off
  legacy control, Easy CPU exclusion and UFO one-jump gate pass.
- `node tools/test-road-powerups.mjs`: passed.
- `node tools/test-cpu-pickups.mjs`: passed.

No production source, fixture fingerprint or existing assertion changed.
The test file and this note are the only intended commit contents. The lane
gate, build and browser scenario belong to the implementation handoff.

Auto-review rejected a proposed relaxation of the newly written exact
halfway fraction and reverse-miss assertions under the project rule against
weakening tests. Those assertions remain unchanged. The Director confirmed
their gameplay meaning and asked for the red suite to be handed off as is.

# CRASH-SWITCH-REMOVE: permanent released crash rules

Status: building. Focused checks pass; lane/build/browser gates and independent
review pending.

Both crash switches shipped on 27 September. This card keeps that released
physics, look and sound, while removing the switch registry entries and the
code that could restore the older contacts. No tuning or save changes.

## Tests first

The independent acceptance test at 6352786 ran before implementation:
17 checks, 16 failed for the intended missing retirement, 1 released replay
check passed. After source removal: 16 passed, with one test-double setup
failure (`createBiquadFilter` missing) once the previously muted sound executes.
Its sound assertion stays unchanged; the same filter stub used by the existing
crash audio suite fixes that setup. The acceptance suite then passed 17/17.

## Removed

The card's settled acceptance explicitly says: "Remove the switch-off contact
paths they guard ... and the tests that pin only those paths ... with unchanged
replay fingerprints for the released rules." Removing those obsolete assertions
is authorized by that acceptance; it does not lower a released-rule threshold.
All changed assertions and removed cases require independent review.

- `sim-contacts.js`: deleted the old scripted armored shove/launch, roadside
  burst/knock, flat traffic speed cost, and switch-off rear-ram motion. The
  rigid-body solver and delta-v (each car's change in speed) remain permanent.
- `destructibles.js`: deleted `startRoadsideTraffic`, `stepRoadsideTraffic`,
  `startTrafficWreck` and `stepTrafficWreck`; no runtime callers remain. The
  physical roadside marker used by `vehicle-knock.js` remains. Scenery speed
  costs and the still-tested classic traffic decision remain.
- `vehicle-impact.js`: deleted `rearRamResponse` and unused scripted motion
  fields from `combatRamResponse`. Keep its released event shove and recovery
  timing. No released event value changes.
- `wasteland-tuning.js`: delete 11 settings whose only consumers were the
  retired helpers: roadside `trafficKnockDistance`, `trafficKnockSeconds`,
  `trafficBurstSeconds`, `trafficVisibleSeconds`; ram `impulseShare`,
  `maximumImpulseMph`, `maximumPushMps`, `launchClosingMph`, `launchBaseMps`,
  `launchPerMph`, `maximumLaunchMps`. A repository search finds no remaining
  reads of these names. Keep all current solver values and ram cadence unchanged.
- Deleted both registry entries and runtime guards in driving, police, rivals,
  arena opponents, combat wrecks, rendering, sound events and sound-bank metadata.
- `src/test.js`: replace the flag-off `collisionArena` fixture with the plain
  `contactCourse` fixture. Keep bounds, coast, scenery, yield, damage, flock,
  lap and other policy assertions. Delete the single old sideswipe/recovery
  block (8 assertions) whose exact direct push, lateral displacement and
  steering recovery timing pinned only scripted crash-off motion. Released
  solver, knock integration and replay suites cover physical transfer/recovery.
- Delete the old-only cases: `test-combat-knockaway` scripted low/high traffic
  outcomes; `test-crash-slide` absence of physical wrecks with the switch off;
  `test-madmax-crash` scripted vanishing burst; `test-combat-ramming` old-only
  switch-off solid/wreck traffic test; `test-armored-vehicle-impact` pure
  `rearRamResponse` equal-speed checks; `test-roadside-destruction` the four
  assertions tied to the deleted start/step wreck helpers. Keep all separate
  wasteland2-off/classic traffic decision checks.
- `test-combat-ramming`: migrate three front-spike tests from false crash
  overrides and closing-speed numeric damage to paired, otherwise identical
  physical contacts with spikes on/off. Require the same 1.5 bonus only from
  the front, unchanged self damage, no rear/side bonus, the 80 cap, and unchanged
  ownership/closing-speed/position event checks. This preserves each test's
  meaningful bonus rule under the released delta-v damage.
- Keep both obsolete-false-override digest checks, but require them to equal
  the existing true-override digest. They now guard against old false overrides
  restoring retired contacts. Every released `crash:true` pin stays verbatim:
  `90ae4439...` (ordinary, wasteland2 off and on), `77e512ed...` (Wasteland with
  wasteland2 off). This also retains the separately pending wasteland2-off path.
- `src/test.js` setup only: the lap-seam fixture maps neighbouring lap positions
  to neighbouring world positions, as the real closed course does, so the
  unchanged crash assertion exercises an actual impulse. The post-finish brake
  fixture clears the knock from its preceding solid-contact check before
  manually setting the car to 80 mph; its braking/finish-time assertions stay.
- `test-crash-presentation`: delete the four checks that crash-effects was an
  on-state registry entry. The acceptance suite instead requires registry
  absence; all actual visual point, timing, pool, roll and read-only checks stay.
- `test-crash-hollow-audio`: sound-bank assertion changes to no flag with the
  same recorded buffer source. Its switch-off silent assertion becomes exactly
  one mandatory impact with all dev switches off. Loudness, placement and
  duplicate-crash suppression checks stay. Muddy Hollow's switch checks stay.
- `test-feature-flags`: registry count changes 8 to 6; crash entries must be
  absent rather than on; retired names must be unrecognized rather than enabled.
  All six other states and lifecycle behavior stay. `test-wasteland-beta`
  expects the same six-entry catalog.
- `test-combat-balance`: requesting the retired crash flag must throw instead
  of selecting it; only wasteland2 remains selectable. Both wasteland2-off and
  on checks remain. There are no target, sample, tuning or win-rate changes.
- `test-preview-launcher`: require only the three remaining dev requests.
  Source launch flags and private preview-storage/crash-presentation scenario
  queries drop the retired names. No live or Preview build/server is touched.
- Remove now-redundant true crash overrides from current fixtures, including
  `test-combat-replays`. Its reviewed JSON fingerprints are untouched.

## Evidence and review

Focused checks pass: acceptance 17/17, ramming 13/13, core 510/510. The core
run initially exposed only the two synthetic fixture setup issues described
above; no assertions changed for those fixes. Lane tier, build, private
memory-only crash browser scenario and independent review are pending.

The four reviewed combat replay hashes remain unchanged at all 30/60/144 FPS:

| Encounter | SHA-256 |
| --- | --- |
| three-opponent-bolt-order | `64b9997ad31345ca2cd5c8001b370b62216c3e58fda09bf8cb0772a7366622f2` |
| rear-ram-wreck-recovery | `f6c532d4d381f183267655f81cd2b0005e42d6f19da7ff4ecf290c22ba309cf0` |
| armor-and-weapon-crates | `411886f3bfe12c70a96e7a983b72e0a80b923965a374d7da906ca907be186aec` |
| staggered-cpu-attack-turns | `82ff15ef5af324a9ec51bc105e47e5b9e12131d7dbbc68de496e11cf8e612b71` |

Current single-contact pins also stay unchanged: ordinary races with wasteland2
both off and on `90ae44392f1e118f66f38b57677448c16d9f5db7e444585277c66cafc9e38ff5`;
Wasteland with wasteland2 off
`77e512edd147264c2da17858eca6ed4fb74f031500dba8ce95e891ea3676bb38`.
No expected-fingerprint file was edited or regenerated.

No generated assets, world signatures,
player saves or real browser storage have been read or changed.

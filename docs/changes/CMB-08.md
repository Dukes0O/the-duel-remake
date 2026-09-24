---
task: CMB-08
status: integrated
kind: feature
flag: roadside-destruction-or-wasteland2
player_facing: yes
---

# CMB-08: roadside knock-away

Movable traffic, cacti, signs, chevrons and small trees now respond to a
flagged Wasteland collision at half the striking car's current upgraded top
speed. A hit below that closing-speed boundary pushes the object clear of
the lane and slows the car. A hit at or above it starts a pooled debris burst
and removes the object from the rendered road. These contacts do not take
armor, a crash slot or a time penalty. Large fixed scenery and rival cars
keep their separate contact rules.

## Implementation

- `src/destructibles.js` has separate pure decisions for flagged scenery
  and traffic. The old `trafficDestruction()` helper and the direct
  `destructiblesEnabled` legacy path remain unchanged. The new traffic
  motion uses elapsed time from the impact, so the final position does not
  depend on the renderer's frame rate. Knocked traffic exits toward its
  nearest shoulder and stops beyond the paved road, including outside clips
  and aligned rear hits in the negative lane.
- `src/sim-contacts.js` consumes each movable object once and emits one
  `roadsideImpact` with its ID, kind, outcome, closing speed, threshold and
  finite hit position. A traffic event also carries the actor. Each hit
  applies one speed cost, capped at 25 mph. A bounded list of burst records
  gives the renderer stable input without allocating scene assets on impact.
  Player traffic contacts show `TRAFFIC SHOVED CLEAR` or
  `TRAFFIC OBLITERATED` in the live HUD. CPU hits do not claim a player hit.
- The existing sign, chevron, pine and cactus scene systems move the real
  group or instance for a low-tier hit. A high-tier instance or sign leaves
  the scene after a short visible interval. `src/roadside-debris.js` holds
  fixed shared geometry, materials and slots before hits occur. The
  renderer reads this state and keeps a knocked traffic car visible while
  hiding an obliterated one after the burst starts. A visual pass reduced
  the round flash and enlarged the same six contrasting fragments per slot;
  it added no objects, materials or collision-time allocations.
- `game.js` now reads `this.featureFlags` for the existing roadside switch.
  Either `roadside-destruction` or `wasteland2` enables the new path in
  Wasteland. The integration release preparation promotes
  `roadside-destruction` to on after Kyle's live play-test feedback;
  `wasteland2` remains development-only.

## Tests and review

- `node tools/test-combat-knockaway.mjs`: 23/23 focused cases pass,
  including 30/60/144 FPS contacts, one event per object, physical scene
  movement/removal, the shoulder direction, the direct disable override and
  fixed debris resources.
- The direct `test-roadside-destruction`, `test-contact-damage`,
  `test-roadside-visuals`, `test-cactus-fall`,
  `test-armored-vehicle-impact` and `test-combat-ramming` tests pass.
- `node --check` and `git diff --check` pass on changed files.
- The High/Performance private browser scenario waits for a completed
  renderer warmup and a frame with actual draw calls after each impact. It
  records the first debris render against a nearby baseline without a hard
  timing threshold. The final fixed-pool art pass measured 7.70/10.20 ms
  nearby/first-debris in High and 7.50/7.10 ms in Performance. All six
  race-view screenshots passed without browser warnings or errors under
  `.qa-dist/browser-output/combat-knockaway-2026-09-23T23-15-19-805Z`.
- The first exact lane gate passed 189/189 with no failures in 456.90 s.
  After the fixed-pool art pass, the exact lane gate passed 189/189 again in
  463.25 s. `npm run build` also passed on the final art and callout source;
  integration owns the full balance and frame-pacing checks. Per the user's
  lighter testing direction, the small callout/scenario change received
  focused and private browser checks instead of a third 189-suite lane run.
- After the callout change, focused `test-combat-knockaway` passed 23/23.
  The private `traffic-wreck-callout` browser scenario passed with 772/553
  actual draw calls around the high-tier contact, one screenshot, no browser
  warnings or errors, and unchanged player armor/crash/time state. Its
  screenshot and report are in
  `.qa-dist/browser-output/traffic-wreck-callout-2026-09-23T23-28-11-721Z`.

One test API assertion changed after review: the new 50% pure cases now
call `roadsideTrafficDecision()` instead of the legacy
`trafficDestruction()` helper. The exact boundary and outcome assertions
remain; the older direct-override assertions also pass. The reason is
recorded in `CMB-08-test-author.md`.

The old `traffic-wreck-callout` browser assertion required a wrecked traffic
actor, one player crash, a two-second penalty and `TRAFFIC WRECKED / IMPACT`.
That scenario runs with `roadside-destruction`, whose approved CMB-08 rule
replaces those outcomes. The updated scenario checks a single `roadsideImpact`
obliteration, visible pooled debris, the traffic car's removal, the new HUD
message, and unchanged player armor, crash count and time penalty. Under this
switch alone, armor is not initialized; the scenario checks that native armor
state stays unchanged rather than subtracting two undefined values.

During release preparation, the default-on switch exposed two older legacy
test fixtures that had disabled only `wasteland2`. Those fixtures now
explicitly disable `roadside-destruction` too when checking the old traffic
crush and wreck path. Their expected outcomes remain unchanged; the focused
armor and ramming suites pass 19/19 and 13/13.

The full release run then exposed three more old assumptions. The armored
impact and prior roadside tests now explicitly switch off the new rule when
checking their original behavior. The recorded 162 replay fingerprints also
stay pinned to that same flag-off baseline; CMB-08's 30/60/144 FPS tests cover
the released collisions. No replay hash was regenerated. The Experimental
browser scenario now expects roadside destruction to be on and absent from
the beta list, and verifies that turning Experimental off cannot disable it.

The combined integration lane then passed 189/189 suites. Its first combat
balance run found that the easier CPU rivals fell too far behind after roadside
contacts. Road races now give Easy and Medium rivals 12 and 8 mph more target
pace, and Medium CPU shots use 60% of their former aim spread. The arena is
excluded from both adjustments. The full balance check passes with 9/10,
6/10 and 2/10 player wins on Easy, Medium and Hard, with 1/3/7 CPU hits.
The focused arena, projectile, roadside and 162 pinned replay checks pass after
this small tuning change. Per Kyle's request to spend more time building, the
189-suite lane was not repeated for the tuning-only change.

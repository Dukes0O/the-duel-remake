---
task: CMB-08
status: building
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
- The existing sign, chevron, pine and cactus scene systems move the real
  group or instance for a low-tier hit. A high-tier instance or sign leaves
  the scene after a short visible interval. `src/roadside-debris.js` holds
  fixed shared geometry, materials and slots before hits occur. The
  renderer reads this state and keeps a knocked traffic car visible while
  hiding an obliterated one after the burst starts.
- `game.js` now reads `this.featureFlags` for the existing roadside switch.
  Either `roadside-destruction` or `wasteland2` enables the new path in
  Wasteland. This branch does not promote either switch to default-on.

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
  timing threshold. Its
  execution, the lane gate, build,
  pinned replay fingerprints and balance/frame checks are pending.

One test API assertion changed after review: the new 50% pure cases now
call `roadsideTrafficDecision()` instead of the legacy
`trafficDestruction()` helper. The exact boundary and outcome assertions
remain; the older direct-override assertions also pass. The reason is
recorded in `CMB-08-test-author.md`.

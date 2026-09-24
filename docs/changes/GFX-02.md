# GFX-02: first-person hands and gear

## Independent acceptance tests before implementation

Baseline: `b6b9677a4c0e4ad3cbc7b00cdef3acd01fd138ae`. The approved GFX-02
board card and SPEC 0.3 govern this work. Two new test files establish the
behavior and asset contract before either builder starts source edits.

### Agreed public contract

- `selectFirstPersonPresentation(entry, {time}, output)` reads existing
  `{fighter, input, weapons}` snapshots and returns the supplied reusable
  output when present. Fields are `crewId`, `weapon`, `aim`, `loaded`,
  `action`, `actionTime`, `actionProgress`, `locomotion` and `motionTime`.
  Weapon action and locomotion compose rather than replacing each other.
  Simulation time and successful weapon state determine presentation.
- `createFirstPersonGear({loadAsset})` returns `{group, update, dispose}`.
  `update(entry, {enabled, active, firstPerson, camera, time})` requires all
  three explicit booleans and draws only for the supplied camera. An injected
  loader receives `(kind, id)`, where kind is `hands`, `rpg` or `wrench`, and
  hands use the crew ID. No hidden-view model requests are allowed.
- Assets are under `public/assets/models/wasteland/first-person/`:
  `hands/<crew>.glb` for all eight crew, plus `rpg.glb` and `wrench.glb`, with
  matching retained `.blend` files and `tools/blender/first-person-gear.py`.
  Hands provide `rpg-mount` and `wrench-mount` sockets. Clips are `idle`,
  `aim`, `fire`, `reload`, `repair`, `wrench-idle`, `aim-fire` and `aim-reload`.
  Tool placement uses the shared grip origin. The RPG has a separately
  hideable `loaded-rocket` mesh.

The runtime and Blender builders agreed this contract before implementation.
Private data structures and loader status fields are not prescribed by tests.

### Coverage

`tools/test-first-person-presentation.mjs` has seven focused groups:

- Current crew, selected tool, aim and real loaded state.
- Recoil and aim composed with walking, sprinting and jumping.
- Reload follows the successful-shot deadline; rejected or stale input cannot
  create/restart recoil, and future events do not animate early.
- The last rocket recoils without loading nonexistent ammunition.
- Wrench motion follows actual repair work and stops when simulation repair
  stops; Odessa's faster work is represented by the same actual work fraction.
- Reusable output, immutable inputs, repeated paused samples and rewinds.

`tools/test-first-person-gear.mjs` has 25 groups covering retained source,
embedded 1024 PNG texture sets, actual loaded skins and weighted fingers,
meaningful bound-vertex motion, and the combined hands/tool limit of 8000
triangles and three material draws. Runtime groups cover explicit visibility,
camera filtering/restoration, crew/tool caches, prepared object reuse,
out-of-order crew resolution, independent bones, pause/rewind, empty launcher
visibility, failed-load playability, immutable snapshots and late disposal.

The tests use installed Three r171 geometry, material, skeleton and animation
semantics. A single material makes one draw even on a BoxGeometry with six
groups; material arrays use the actual groups. Node substitutes only image
decoding while parsing real GLB geometry and clips, and inspects embedded PNG
dimensions directly. BufferAttribute component access was checked against the
installed library before handoff.

### Red evidence and limits

Before production or asset edits:

- `node tools/test-first-person-presentation.mjs`: **7 groups, 0 passed,
  7 failed**, missing selector.
- `node tools/test-first-person-gear.mjs`: **25 groups, 0 passed, 25 failed**,
  missing renderer, Blender sources and exported assets.
- Both commands exit 1; combined bounded run took 0.20 s.

These are deliberate missing-feature failures. No existing test, source,
asset, fingerprint or gameplay field was edited. No broad gate was run.
The three fidelity rounds, true scene frame cost, grip alignment, camera
clipping, local body hiding and HUD clearance still require the prescribed
private browser interaction and independent visual review. Structural tests
alone cannot promote this family to beta.

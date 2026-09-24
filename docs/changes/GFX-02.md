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

## Initial runtime implementation

After independent red commit `07af83c`, the selector and cached view model were
implemented. Focused selector checks pass 7/7, and all seven injected runtime
groups pass. Eighteen actual-asset groups still fail because the Blender assets
are being authored; those are not reported as a passing asset gate.

The renderer creates the view model beside the combat scene and updates it
after the final camera pose, including any inspection override. Its reusable
entry/options objects read existing simulation fields. Main-camera first-person
selection is explicit, and hidden views make no asset requests. Camera-pass
filtering restores geometry draw ranges after each pass. Full-body local hiding,
cockpit hands and flying projectiles are unchanged.

Crew rigs have independent cloned bones and prepared actions. Shared tools attach
to authored grip sockets; aim-fire and aim-reload preserve aimed grips during
weapon actions. Simulation snapshots determine all pose times, action fractions
and movement sway. Repair follows actual work, including Odessa's faster rate.
The empty launcher stays visible after the last rocket, with no fabricated reload.
Failed requests are bounded, and disposed or stale loads cannot become visible.

No browser, fidelity, frame-cost or broad merge gate has run for this initial
runtime implementation. Those checks follow the first frozen asset round.

## Recoil correction and capture tooling

Independent regression commit `4105691` proved that a spent rocket remained
visible during recoil when reserve ammunition was available. The view model now
hides that mesh throughout fire. Its existing reload visibility gate and the
authored rocket insertion track control when the replacement appears. The pure
selector still reports available ammunition. The independent focused regression
passes 1/1 after the correction; selector checks remain 7/7. No assertion changed.

The private first-person scenario now prepares matched captures from each frozen
Blender manifest and validates the asset hashes before starting. It also exercises
actual input for exit, aim, successful fire, reload, repair and re-entry in both
qualities. The contact-sheet extension retains each source hash, matched camera,
pose time and selected tool. Crew references establish identity, not first-person
pose ground truth. Capture execution and independent visual scores remain pending.

Its frame comparison uses the same stopped course and pose updates with held
materials hidden or visible. That measures added held rendering cost, not the
total CPU cost of presentation updates. The recorded scope prevents treating a
refresh-limited frame result as a complete performance guarantee.

## Round 1 browser evidence

The frozen assets at `c92e8fc` were captured through runtime and tooling at
`fb27582`. Private port 36720 used memory-only storage. The completed harness
reports zero warnings and errors. Evidence contains 42 matched game images,
21 Blender images and 10 actual-input context images. The latter cover aim,
fire, reload, repair and completed re-entry in both qualities. All game images
and the browser report are retained under `docs/board/looks/first-person/round-1`.
The contact sheet and source hashes are retained beside that directory.

Visible snapshots use at most 4060 triangles and three material draws. For each
quality, 120 RAF intervals measured 18.1 ms baseline p95 and 18.2 ms held p95,
with no interval over 33 ms. This round measured Rook holding the wrench after
the input interaction, on a stopped course. It is not a worst-case RPG or total
presentation CPU measurement. Later rounds should include the larger RPG view.

Two fixture errors were fixed before the completed capture: a readiness check
returned the renderer object instead of a boolean, and the manually advanced
re-entry state needed an explicit render before checking visibility. Neither
failure required runtime, asset or acceptance changes. Independent visual review
and rounds 2 and 3 remain pending. This evidence does not establish beta status.

## Round 2 browser evidence

Frozen source and assets `7cc267b` passed the same private input interaction and
matched capture on port 47865, with zero browser warnings or errors. The retained
round contains 46 game pose images and 10 actual-input images. Two added samples
show reload at authored time 1.65 s and Odessa repair at 2.8 s. Exact time labels
keep them separate from the earlier samples. The contact sheet now also includes
canonical RPG and wrench shape and held-view references, clearly labelled as
different poses. The original round 1 sheet is unchanged; its tool comparisons
are a separate `round-1-tools.png` supplement.

Round 2 snapshots use at most 7340 triangles and three material draws. The frame
comparison selects the largest hands plus a loaded RPG; Rook ties six other crew
for the largest hands mesh. Both qualities measured 120 intervals per condition,
with baseline p95 18.1 ms and held p95 18.2 ms, and no interval over 33 ms. This
remains a stopped-course rendering comparison with pose updates active in both
conditions, not a complete presentation CPU or GPU benchmark. Independent round
2 review and the final fidelity round remain pending.

## Private HUD capture correction before round 3

Round 2 review found stale HUD labels in the actual-input screenshots. The private
scenario stops the app and calls `advance()`, which runs simulation without the
normal app frame callback. The renderer still showed the updated held tool, but
the HUD retained an earlier weapon and race time. This limits the HUD evidence in
rounds 1 and 2; those images remain unchanged. It is not evidence of a production
HUD defect.

Before every future actual-input screenshot, the fixture now calls the existing
`app.onFrame(state)` hook, which is assigned to `renderState` and updates the HUD,
then renders the view. It verifies the displayed race time, selected foot weapon
and active repair amount against that snapshot, and records the displayed labels
beside the image hash. No production, simulation or HUD source changed. This
correction will be exercised in the already planned round 3 scenario.

## Round 3 browser evidence

Frozen source and assets `14a51e3` passed the final planned private scenario on
port 62795 with zero browser warnings or errors. The round retains 46 matched
game images, 10 actual-input images, the browser report and a 27-row contact
sheet that includes crew and canonical weapon references. Earlier rounds remain
unchanged. The existing additional reload and repair phases are included.

The synchronized HUD checks pass in both qualities. The High aim image reads
00:01.22 with three rockets; the repair image reads 00:03.22, WRENCH and
REPAIRING 10 / 40. Re-entry at 00:06.87 hides the held view and foot HUD. Recorded
labels and exact simulation times accompany each actual-input image hash.

The largest visible combination is 6932 triangles and three material draws.
The largest hands plus loaded RPG comparison again measured 120 intervals per
condition in each quality: baseline p95 18.1 ms, held p95 18.2 ms, and no interval
over 33 ms. This measures added held rendering on the same stopped course with
pose updates in both conditions. It does not isolate total presentation CPU or
GPU cost. Independent final critique and required lane/build gates remain
pending. Completing three rounds alone does not establish beta fidelity.

## Final independent review and merge gate

The Director's `round-3-review.md` accepts the initial three-round card for
development integration. Resemblance, readability, contact and consistency
remain 3; frame cost is 4 only within the recorded scope. Keep the feature in
dev. Fingertip cap artifacts, glove anatomy, tailoring, tool detail and continuous
motion review remain explicit GFX-02-P1 work after the ordered initial cards.
The new hand texture sets also need a measured memory/reuse review before any
complete resource-budget claim. No beta approval is implied.

On exact clean `fead24a2425e3cd2ae7647f9f1c852bf0d4e0a74`:

- Required lane tier: **223 passed, zero failed, zero not run in 302.41 s**,
  including all eight campaign shards.
- Production build: passed in 517 ms with the existing large-chunk warning.
- HEAD and source remained unchanged throughout the commands.
- Logs: `.qa-dist/gfx02-final-lane.log` and `gfx02-final-build.log`.

No save, race rule or fingerprint changed. Runtime source remains the reviewed
implementation plus the independently tested spent-rocket visibility correction.
This final handoff update changes only the evidence note.

## Integration and cleanup

Merged as `f626618`; STATUS was refreshed immediately. The two final gate logs
were copied to `.lanes/evidence/gfx02/` and verified by SHA-256 before cleanup.
All three rounds and browser reports are committed under the fidelity folder.
Removed the clean merged worktree without force after detaching only its
verified dependency junction; integration dependencies remained intact. The
lane branch remains as a local history reference.

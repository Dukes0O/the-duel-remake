# EGG-02: Rustwall and wash scenery

## Round-three wash orientation: independent red proof

The Director authorized only a deterministic local-Y half-turn per existing
bank, choosing 0 or pi from its existing identity/index. Positions, scales,
collision geometry, prototype count, budgets and simulation RNG stay fixed.
The purpose is to show both asymmetric faces without adding another prototype.

Independent test commit **034430b** adds one focused scene group. It inspects
the actual instance matrices in each bank's local collision frame, permits
only the original or half-turned orientation, and requires both to occur.
Two preparations of the same course must produce identical matrix arrays.
Bank count, source geometry/material reuse, collision records and the course
RNG stream must remain unchanged. The existing all-vertex collision-envelope
test and all acceptance limits are retained without alteration.

Before the runtime edit, `node tools/test-rustwall-scene.mjs` reports
**18 checks, 17 passed, 1 failed**, exit 1, **1.23 s** tool wall time.
The only failure is the observed orientation set `[1]` instead of `[-1, 1]`:
every bank still shows its original face. All other new controls pass before
that final assertion. No render, broad gate, asset or production edit was
performed by the test author. The runtime builder received the red commit
before implementing this narrowly approved presentation change.

Runtime commit **34bfd6c** selects the half-turn with a stable integer mix of
the existing bank index and applies it only to the prepared Y rotation. An
independent source review found no defect: position, scale, geometry, material,
population, collision data and per-frame work are unchanged; no simulation RNG
is read. The same index also keeps multiple primitives of one bank aligned.
The builder reports **18/18 scene checks passing in 0.88 s** with the new
assertion unchanged. The reviewer did not repeat a broad or focused suite
during the integration full-tier window. Round-three visual evidence and the
planned final lane/build gate remain required.

Initial handoff: independent acceptance tests were red before runtime or asset work.
Baseline: **1420849**. The Director owns scope and board changes.

## Agreed scene contract

The test author, runtime builder and Blender author agreed this small API:

- `clampGateOpen(value)` is a pure finite 0–1 clamp; nonfinite values return 0.
- `createRustwallScene(course, {loadAsset})` returns `group`, `ready`,
  `setGateOpen` and `dispose`. The loader receives `wall` or `wash` and returns
  a GLTF-style record with `scene`. Default requests are local GLBs under
  `/assets/models/wasteland/rustwall/`. No hidden road means no requests.
- `ready` resolves to a boolean. Failed loads do not throw through race flow
  or retry every frame. A gate fraction set while loading is retained.
- The gate is placed at `hiddenRoad.poseAt(length)` with its local front
  facing -Z, toward the final 300 m approach. The aggregate group may remain
  at world identity. Only the `gate-panel` moves, raising 7.25 m at full open.
- The factory registers its retirement hook through `registerSceneSystem`.
  `disposeTree` owns ready graph resources. Retired scenes cannot resurrect;
  late unattached resources are released once, including shared identities.
- Wash meshes are prepared as one or two shared instance batches. Each
  existing `road.walls` entry supplies its position, heading and scale
  `(halfX, height, halfZ)`. No collision or race state is added by presentation.

The tests inspect actual world-space panel placement, gate clearance, fixed
detail positions, prepared object reuse and all wash vertices. A 2 mm bound
tolerance allows Float32 instance transforms at kilometre-scale coordinates.
It does not permit deliberate rock protrusion into the drivable corridor.

## Agreed asset contract

Retain `tools/blender/rustwall.py`, `wall.blend`, `wash.blend`, and matching
`wall.glb` / `wash.glb` under `public/assets/models/wasteland/rustwall/`.

- The measurable `wall-body` core stands 35 m high and spans at least 400 m;
  the author plans 420 m, centered on the gate. Towers may rise above it.
- The actual opening is X -4.5 to +4.5 m, Y 0 to 7 m. Tests raycast the
  opening, jambs, header and moving panel; a painted rectangle cannot pass.
- Guard nodes have actual adult-scale geometry, 1.6–2.0 m high. Torches are
  separate so the measurement does not confuse flame height with body height.
- Wall/gate assets stay within 60000 triangles and 24 material draws. Wash
  modules fit X/Z [-1,1], Y [0,1] with transforms baked. The complete rendered
  bank population stays within 30000 triangles and two instanced draws.
- At most three 1024-square base-color texture sets serve the wall, and one
  serves rocks. Every embedded image in each set is 1024 square. GLBs must
  contain their own resources.

Asset checks parse actual geometry and materials using the installed Three
GLTFLoader. Only browser image decoding is replaced in Node; embedded image
dimensions are checked directly. Triangle counts include instance count.
Material-array groups and transparent double-sided passes count as actual
draws. No self-reported manifest totals establish these budgets.

## Narrow grounding scope added by the Director

Before implementation, the Director identified that the existing 120 m
salt-flat half-width cannot support a 420 m wall. The runtime builder may
change only the final salt-flat expansion in `src/hidden-road.js` to 225 m
half-width. Centerline, height, entrance, wash, wash banks and ordinary roads
must remain unchanged. No other terrain source edit is authorized here.

The new scene suite checks actual ground support at the wall ends (±210 m)
and the 15 m margins (±225 m) on all three routes. Existing source fails at
the first outer-wall sample:

| Route | Ground at -210 m | Required wall footing |
| --- | --- | --- |
| A | 71.612652 m | 34.442260 m |
| B | 72.749979 m | 34.442260 m |
| C | 72.548200 m | 34.462293 m |

Three new pre-change hashes, captured from 1420849, preserve every hidden-road
centerline/height sample, entrance, length, wash bank and wash width. Ordinary
road, gate, map, shortcut and NPC geometry is checked against the existing
EGG-01 fixture without changing it. All three preservation checks pass before
the authorized widening. Existing driving replay gates remain applicable.

## Red evidence

- `node tools/test-rustwall-scene.mjs`: **17 checks, 3 passed, 14 failed**,
  exit 1, 0.43 s tool wall time. Three grounding failures and eleven missing
  runtime failures are expected; all three preservation controls pass.
- `node tools/test-rustwall-assets.mjs`: **8 checks, 0 passed, 8 failed**,
  exit 1, 0.16 s tool wall time. The script, Blender sources and GLBs are absent.

Tests cover the pure gate control, local/no-feature loading, all-route
placement, route/collision immutability, normalized bank fit, prepared reuse,
pending state, successful/failed/late cleanup, actual asset geometry and
budgets. No production implementation, assets, existing assertions, race
fingerprints or saves were changed for this handoff.

No broad gate or browser matrix was run. Three immutable matched fidelity
rounds and the actual ten-percent frame-cost limit remain separate required
browser and art checks. Structural tests alone do not grant beta or release.

## Initial runtime and supported wall footprint

After red commit `ca7234c`, the runtime loads only the two local GLBs when a
Hidden Road exists. The wall follows the final road pose with its front toward
the approach. The explicit gate control moves only the panel, including when
the requested fraction arrives before loading. Wash meshes are prepared as
shared instances inside the existing oriented collision boxes. The EGG-01
greybox banks remain available as a loading fallback and cost baseline.

The factory registers its retirement hook on its own scene group. Ready
geometry, materials and textures remain owned by `disposeTree`; late unattached
resources are released once, excluding identities already owned by the retired
graph. Gate updates reuse prepared objects and do not read or write race state.

An early read-only placement probe found that the original 120 m salt-flat
half-width buried the outer wall by 28 to 39 m. The Director authorized widening
only the final prepared flat to 225 m, leaving 15 m beyond each wall end. The
existing support and rendered terrain both derive from that width. A 5 m grid
over the added area on routes A, B and C found no protected-road overlap; its
nearest sampled road edge was over 697 m away. Entrance, centerline, height,
wash widths, collision banks and ordinary-road geometry remain unchanged.

The independent scene checks now pass **17/17**, including all-route grounding
and the original preservation controls. Syntax and whitespace checks pass.
Real asset checks, browser captures, independent source review and lane/build
gates remain pending. No existing assertion or fingerprint changed.

## Round 1 browser evidence and capture limitation

Source `6d16f8e` and frozen assets `bb31758` completed the private scenario on
port 63305 with zero browser warnings or errors. The round retains twelve
matched-view files, eight actual-course views, its browser report and contact
sheet. All six route/quality placement checks confirm the gate endpoint and
level support beneath both wall ends. The full-span game view shows that support.

The independent visual review found one invalid isolated image: Performance
wash-module is blank despite reporting one draw and 144 triangles. The original
image and sheet remain unchanged. Actual-course wash views remain available for
round 1 review. This is a capture limitation, not a proven runtime defect.

Before round 2, the isolated fixture now uses the production `renderMainView`
path in both qualities, explicitly updates scene/camera matrices, and verifies
non-background pixels rather than trusting draw counts. It restores cloned
instance bounds; the original references were mutated during bounds calculation.
The planned next round will verify this correction without repeating round 1.

Each cost condition retains its ordered 120 RAF intervals and 120 full-render
CPU submission times. RAF p95 stays at 18.2 ms in High and changes from
18.3 ms to 18.2/18.1 ms in Performance wash/approach. CPU p95 changes are
High wash 2.7 to 2.7 ms, High approach 2.5 to 2.6 ms, Performance wash
1.9 to 2.0 ms and Performance approach 1.7 to 1.7 ms. No interval exceeds
33 ms. The largest positive measured CPU p95 change is about 5.3 percent.

These paired views compare EGG-01 greybox scenery on the newly widened flat
with loaded scenery. They isolate model cost, not the entire EGG-02 change.
The separately derived prepared-ground patch grows from 9824 to 10656 triangles,
a delta of 832; this does not reconstruct an earlier whole world. Recorded
draws/triangles include render passes and shadow refresh, not fixed asset budgets.
Round 2 also retains their per-sample values and ranges. CPU submission timing
does not measure GPU time. Independent art review and later rounds remain open.

## Independent runtime and first-round asset review

The independent test author reviewed runtime source **d19c027** and the frozen
round-one Blender source/assets **bb31758**. No concrete contract defect was
found. The gate placement and pending/clamped presentation control, prepared
wash instances, default local loader and existing world disposal hook match
the agreed interface. No race, discovery, reward or save behavior was added.

The mixed ready/late resource path was inspected specifically: retirement
records resource identities already owned by the graph before `disposeTree`
frees them. A late asset skips those identities and releases its own unused
resources. Failed unattached records wait for both load outcomes, then skip
resources used by a successful attached asset. Thus one failed file can leave
the other usable without freeing shared resources prematurely.

Independently repeated focused checks:

- Scene: **17/17 passed**, 0.76 s tool wall time. This includes all-route
  endpoint support, exact pre-change wash/path and ordinary geometry controls,
  actual transformed bank containment, gate movement and asynchronous cleanup.
- Assets: **8/8 passed**, 0.34 s tool wall time, after the reserved round-one
  browser frame-capture window was released. Actual installed-Three geometry
  passes the 35 m core, >=400 m span, 9 by 7 m raycast opening, raised clearance,
  adult figure bounds, baked rock envelope, instance-adjusted triangle/draw
  limits and local 1024 texture-set checks.

The asset author records 57632 wall triangles / 13 draws and a 144-triangle
rock prototype; the independent checks establish the approved upper bounds
against the actual GLBs. No assertion, fingerprint or production file was
changed during this review. No broad gate was repeated. Remaining fidelity
rounds, measured frame cost and the planned final lane/build gate still apply;
this structural review grants no beta or release approval.

## Round 2 browser evidence and remaining cost gap

Corrected capture source `a4854e6` and frozen assets `522c39d` completed the
private memory-only scenario on port 50425. The retained report records zero
browser warnings or errors, twelve matched images and eight course images.
Both isolated wash views contain 2322 sampled non-background pixels; every
course image also passes the visible-pixel check. All six route/quality gate
placement checks pass. The contact sheet and ordered timing/count arrays are
retained under `docs/board/looks/rustwall/round-2/` and its adjacent sheet files.

The first round-two attempt failed the new Performance wash pixel assertion.
The fixture changed instance matrices immediately after a shadow render, while
Three's instance upload cache still marked that render frame as current. A
preparation render before the captured frame, and another after restoring the
instances and scene, correct this fixture timing. Course shots also prepare
the restored scene and check visible pixels. No production renderer changed.
The original round-one images and sheet remain untouched. Its route B/C course
images are also gray, so round one proves their placement mathematically but
does not establish their visual grounding. Round two supplies valid images.

The round-two frame measurements are:

| View | RAF p95, baseline to loaded | CPU median | CPU p95 |
| --- | --- | --- | --- |
| High wash | 18.1 to 18.1 ms | 2.1 to 2.3 ms | 2.5 to 2.8 ms |
| High approach | 18.1 to 18.1 ms | 2.1 to 2.1 ms | 2.6 to 2.6 ms |
| Performance wash | 18.2 to 18.3 ms | 1.5 to 1.5 ms | 1.9 to 2.0 ms |
| Performance approach | 18.2 to 18.2 ms | 1.3 to 1.3 ms | 1.7 to 1.7 ms |

High wash CPU p95 rises **12 percent**, beyond the 10 percent target. Its median
rises about 9.5 percent. Stable RAF timing does not erase that cost concern;
round two is not a complete performance pass. Each condition retains all 120
ordered RAF, CPU, draw and triangle samples, plus count ranges. The baseline
still uses the widened salt flat and isolates scenery cost. CPU submission
timing is not a GPU measurement. The artist reports 51020 wall triangles with
13 draws and 179 wash instances totaling 25776 triangles in one draw. Measured
per-frame counts include other scenery, extra passes and shadow refresh.

The independent round-two visual critique and final fidelity round are next.
No existing test assertion, race fingerprint or runtime behavior changed for
these capture corrections.

## Round 3 browser evidence

Frozen source and assets `8889a4a` completed the single planned private,
memory-only scenario on port 32153. It retained twelve matched images, eight
actual-course images, all six route/quality placement results, the browser
report and the adjacent round-three contact sheet. There were zero browser
warnings or errors. Both isolated wash images and all course images passed
the visible-pixel checks. Earlier rounds remain unchanged.

| View | RAF p95, baseline to loaded | CPU median | CPU p95 |
| --- | --- | --- | --- |
| High wash | 18.1 to 18.2 ms | 2.2 to 2.2 ms | 2.7 to 2.8 ms |
| High approach | 18.2 to 18.2 ms | 2.0 to 2.0 ms | 2.5 to 2.4 ms |
| Performance wash | 18.3 to 18.1 ms | 1.5 to 1.5 ms | 2.0 to 2.1 ms |
| Performance approach | 18.2 to 18.2 ms | 1.3 to 1.4 ms | 1.7 to 1.8 ms |

No measured RAF interval exceeds 33 ms. All paired round-three RAF p95, CPU
median and CPU p95 changes are within ten percent; the largest positive CPU
p95 change is about 5.9 percent. Ordered arrays of 120 samples per condition
and draw/triangle ranges remain in the capture manifest.

The round-two High wash CPU p95 increase of 12 percent remains part of the
evidence. Loaded High wash p95 is 2.8 ms in both rounds; the baseline changed
from 2.5 to 2.7 ms. Thus the improved paired ratio does not prove an equivalent
optimization. This remains a bounded scenery comparison on the widened flat,
not GPU timing or a replay of the complete previous integration scene.

The frozen model counts are 53634 wall triangles in 13 material draws and
25776 wash triangles across 179 instances in one draw. The independently tested
half-turn variation changes only prepared bank orientation and gives the
asymmetric rock profile two facing directions. Collision envelopes, positions,
scales and simulation RNG remain unchanged.

The three initial measured rounds are complete. Independent final visual
review and the required lane/build gate remain pending. This evidence does
not promote the feature to beta or approve a release.

## Final independent review before the lane gate

Reviewed final asset revision `8889a4a`, the retained third-round evidence
`59ee16a`, and Director critique `cb788e0`. The authoring diff preserves the
measured wall, gate and human-scale contracts. The latest actual GLB checks
pass **8/8** (0.32 seconds), covering real geometry, gate clearance, retained
Blender sources, embedded 1024 textures, draw counts and the instanced wash
budget. No assertion or acceptance limit changed for this review.

The production diff since the first asset freeze contains only the already
reviewed deterministic local half-turn hook `34bfd6c`. It changes prepared
bank orientation, with no new per-frame work, position, scale, collision or
simulation RNG change. The earlier all-route support and asynchronous resource
ownership review still applies. No new source defect was found.

This handoff accepts the initial three rounds for **development integration
only**, subject to the following lane tier and build. Director resemblance
scores remain wall 3 and wash 2. Repeated ledges, exposed ground wedges, dark
wall materials and insufficient salvage detail remain explicit polish debt.
Round 2's 12 percent High wash CPU p95 increase remains documented; the third
round does not establish a general optimization or a complete performance
claim. Keep `hidden-road` in dev. This is not beta or release approval.
## Final required gate and handoff

Both required gates passed on the exact clean commit
`84459137006538f0cc9aed43936071922b14af49`:

- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: **226 passed,
  0 failed, 0 not run**, 301.17 seconds (301.35 seconds including the wrapper).
- `npm run build`: **passed**, 1.00 second including the wrapper; Vite reports
  524 ms. The existing large-chunk warning remains informational.

Complete logs are retained locally in `.qa-dist/egg02-final-lane.log` and
`.qa-dist/egg02-final-build.log`. HEAD and the clean working tree were checked
before and after these gates. Source, Rustwall asset and tools tree identities
remain `299797aa4749341ada255a6cb33fb102d9328edc`,
`b0f2c8c70b033996d4ec5f987840621417a30556` and
`09eac1774d3a26c737eeb61bbe69732ad4862afb`, respectively.

This final addition records evidence only; it changes no tested source, asset,
test, acceptance limit or race fingerprint. The lane is ready for the Director
to integrate under the recorded development-only approval. The visual polish
debt and performance limits above remain open. No merge, board change or
release was performed by this reviewer.

## Integration and local evidence retention

Director merged the lane as `7f8d43f` and refreshed STATUS on that clean
integration commit. Both gate logs were copied with matching SHA-256 hashes
to `.lanes/evidence/egg02/` before the clean, fully merged worktree was
removed. The lane had its own dependency folder, with no junction. Its branch
and all committed fidelity evidence remain. Integration dependencies were
verified after removal. No live game or release was changed.

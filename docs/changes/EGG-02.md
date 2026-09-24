# EGG-02: Rustwall and wash scenery

Status: independent acceptance tests are red, before runtime or asset work.
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

# P4-DAYNIGHT - light that moves

Status: Claude round-one art HOLD. Round two is limited to the corrections
below. The accepted prior-source timing exception remains recorded; current
art and a scoped timing response are pending. Round-two native checks pass;
the standard frame watch fails High pair-two CPU/GPU. Lane/build remain held.

## Design decision (10 October 2026, before code)

- A course/event definition opts in with `lightPath: {axis, keyframes}`. `axis`
  is `distance` (metres along the road) or `race-progress` (0-1 across the race).
  Each keyframe is `{at, look}`; looks are `day`, `golden`, `dusk`, `night`.
  An event override belongs in its resolved course definition. The pure sampler uses the native desert fallback unless a theme is supplied. No state fields,
  storage fields, clock, random draw or race event are added.
- Distance paths wrap at each closed-circuit lap. Point-to-point distance clamps
  at the final road metre, never modulo-wraps. Race-progress paths use unwrapped
  `state.s / duel.raceLength`, so only that sunset continues across lap boundaries.
  Negative grid positions clamp to the first keyframe. Reversing retraces the light.
  Menu previews show the first keyframe. Pause freezes progress naturally.
- Keyframes must be finite, strictly increasing and use known looks. A single
  keyframe is a fixed look. Empty, malformed or missing paths return `null`
  and select the exact existing lighting branch. Never sort or edit input data.
- Interpolate with smoothstep inside each interval, including sun height,
  direct and hemisphere light, reflection intensity, sky/fog/ground/sun colour,
  cloud tint/cover, exposure, stars and moon. Colour interpolation uses linear
  RGB. Day and golden reuse the current biome palettes; dusk and night retain
  enough blue ambient light to read the road. Night does not switch HDR targets
  mid-transition. Tunnel overrides remain local and do not advance the path.
- `nightAmount` is 0 by day, 0.55 at dusk and 1 at night. Lamp strength blends
  in between light levels 0.45 and 0.25, avoiding a visible on/off pop. Every
  visible car gets its actual emissive lenses plus a bounded, tapered transparent
  beam. Existing two player spotlights are reused; NPCs add no real lights or
  shadow passes. Braking remains brighter than tail lamps. Ghosts get no lamps.
- The path-only sky adds fixed stars and a moon in the existing sky draw. No
  random generator or separate sky mesh is required. Road-edge reflectors use
  a capped instance pool near the car. Existing sign faces retain their text
  and gain only a directional, distance-faded reflective response. Existing
  harbor windows and landmark glazing become warm at dusk/night. Authored
  distant town-window points may be supplied as `course.def.nightWindows`
  (world positions), attached to real buildings by the track author; QA uses
  native harbor buildings and landmark windows, not unsupported placeholder art.
- Presentation resources belong to the scene/vehicle owner, not course data.
  Bind them only for a valid path. Course changes restore touched materials and
  remove path-only objects. The renderer supplies one reusable sample buffer,
  including RGB arrays and sun vectors. Repeated updates reuse geometry/materials; stop and
  dispose are safe twice. An old course after a path course must look unchanged.

## Switch decision

No global cosmetic switch is added. Each new track's existing/planned feature
switch gates the definition containing its path. This foundation ships dormant:
no existing course gets a path. Tests use explicit, memory-only course fixtures.
This avoids turning on a new look for the released day or city-night courses.

## Test-first checks and review

The original light-path test failed first with missing `src/light-path.js`;
world-decoration tests failed on their missing owner export. Reviewed fixture
corrections used explicit coastal palettes, native closed/open endpoints,
legacy material identity, braking and shared-lens ownership. Native city
parallax-window regressions failed before the clone preserved their emission
shader. A later zero-timer regression failed before positive-p95 validation.
Current recorded focused results are 479 light-path, 2666 unchanged lighting-
mood and 1078 unchanged scene-lighting checks. Existing assertions, tolerances,
world signatures and replay pins were not weakened or regenerated.

Renderer hooks use unwrapped distance and native race length. Car/world lamps
update after placement; ghosts and decoy drones stay outside the adapter.
Deferred resource retirement preserves the existing vehicle/world lifetime.
Independent runtime review cleared the sampler, shader, cleanup, legacy
restoration and read-only hooks, including the FIELD merge at `42b9b5f7`.

Native browser corrections use the actual rival and readiness callback. The
mirror fixture uses native time and requires a refreshed frame. The original
sheet in `docs/board/looks/p4-daynight/round-1.jpg`, prepared in `13a094a6`,
contains eight native captures from private port 11053, including both licensed
models. The current run below also verifies eight cars, four looks, both
qualities, exact material/sky restoration, and unchanged race/profile data.
Claude's art verdict and current lane/build gates remain required before merge.

## Diagnostic design and scope

The ordinary scenario keeps both OFF/ON orders. Kyle/Claude authorized one
bounded diagnostic pair, OFF then ON in High and Performance, using the same
stopped native scene and inspection camera. It measures a fixed night look,
not moving-camera or moving-blend cost. Enable it with
`P4_DAYNIGHT_MEASURE_FRAMES=1` and `P4_DAYNIGHT_DIAGNOSE_FRAMES=1`.

Keep 120 warm frames, 360 CPU, at least 359 delivered and 288 GPU samples,
positive timing guards, fixed resolution and exact eight-car poses. The
original 10% CPU/GPU/delivered p95 gate remains unchanged. CPU measures main
and mirror submission; GPU measures the main pipeline; delivered measures
RAF intervals.

The design recorded before instrumentation uses the existing native callback's
`updateMs` and `submitMs`. `rendererUpdate` includes lighting and all other
renderer preparation; it is not lighting-only time. `updateAndSubmit` sums each
frame before calculating p95. CPU/update/RAF samples stay chronological; GPU
samples retain the existing completion-observation order separately as
`gpuCompletionSamples`. Polling, values and original percentile rules remain
unchanged. Added array writes happen after the native measured phases but may
affect later frames or collection pauses; no estimated overhead is subtracted.
These diagnostics do not replace or extend the original acceptance gate.

The generic frame-pacing scenario has no absolute cutoff. Kyle/Claude set
20 ms delivered p95 only to classify this diagnostic: both OFF and ON above
it routes measurement diagnosis; only ON above it routes feature investigation.
That is a Director classification, not technical causal proof or a release
floor. Root reviewed the final scenario source, SHA256
`0d73b472ddea89e0da6fa524b05b6e9bc5331138e2a2b1dcd0d51516b19d2df1`.
Syntax and diff-whitespace checks passed; no implementation-mirroring test was
added for these additive samples.

## Latest native result and accepted exception

Reviewed source `f6b591f3` ran once on private port 15625 with memory-only
saves. Build/native work lasted 60.605 seconds, 00:07:36.568–00:08:37.173 UTC
on 11 October (10 October locally). Separate pre/mid/post process inventories
found no foreign workload. Eight captures completed with no browser errors
or warnings.

| Quality | CPU p95 off/on | GPU p95 off/on | Update p95 off/on | Update + submit p95 off/on | Delivered p95 off/on |
| --- | ---: | ---: | ---: | ---: | ---: |
| High | 9.7 / 11.3 ms | 11.102208 / 12.085248 ms | 0.8 / 0.8 ms | 10.4 / 12.0 ms | 16.8 / 16.8 ms |
| Performance | 8.4 / 7.2 ms | 8.119296 / 7.856128 ms | 0.9 / 0.8 ms | 9.0 / 7.9 ms | 16.8 / 16.8 ms |

Every leg retained 360 CPU/update/sum, 359 delivered and 359 GPU samples,
scale 1 and DPR 1. The **original 10% gate failed**, exit 1: High CPU rose
16.494845%, GPU 8.854455%; Performance CPU/GPU fell 14.285714%/3.241266%.
Neither OFF nor ON exceeds 20 ms in either preset. This is not the "both
fail" diagnostic case, and p95 does not establish that every frame met a
deadline. High update p95 stayed flat. No runtime fix or repeat followed.

At 00:20 UTC on 11 October, Kyle relayed Claude's explicit acceptance of this
scoped High CPU exception: 9.7 to 11.3 ms (+16.49%), GPU +8.85%, Performance
cheaper, delivered p95 16.8 ms throughout. **The failed test remains a failure;
the exception permits progress after the art verdict and lane/build gates.**
No more investigation is authorized. This is not a general lighting-budget
waiver. Panorama Night and Harbour Lights must each measure delivered p95
with eight cars at night in their own cards and trim lighting if it slips.

Raw arrays, screenshots, process inventories and reports are retained under
ignored `.evidence/2026-10-10/P4-DAYNIGHT/frames-field-diagnostic-f6b591f3/`.

## Earlier adverse evidence retained

All paths below are under ignored `.evidence/2026-10-10/P4-DAYNIGHT/`.
At `4834abde`, `frames-1` failed High pair 2 (CPU +53.61%, GPU +28.68%);
legacy GPU p95 shifted 24.94 to 11.54 ms across pairs. The unchanged quiet
`frames-2` repeat passed, worst CPU +4.40% and GPU +4.00%. That pass is
historical, not a pass for later source; no cause was proved.

At `42b9b5f7`, `frames-field-1` failed Performance pair 1 (CPU +19.39%, GPU
+14.11%). The numeric pass in `frames-field-2` overlapped Harbour gate PID
40912, so it is functional evidence only. Confirmed quiet `frames-field-3`
failed High pair 2 CPU +13.40% and Performance pair 1 CPU/GPU
+49.33%/+21.88%; delivered p95 stayed 16.8 ms. These failures are preserved,
not replaced by the accepted latest exception. QA-FRAME-SETTLING retains the
unproved timing-variation finding; no further investigation is authorized now.

## Removed

Repeated stale draft statuses and duplicate timing narratives were removed;
the durable design, failures, latest numbers and explicit decision remain here.
No runtime path was replaced. Owners remove path-only lamps, reflector objects
and cloned materials on disposal. The legacy lighting path remains necessary
for current courses. No runtime, test, assertion or limit changed to obtain
acceptance of the measured exception.
## Round two design — before code

Kyle relayed Claude's round-one HOLD: lighting 2, road readability 4, grounding
4 and scene consistency 2. Keep the same eight native views for one round-two
sheet. The DAY lane gate on `f6b591f3` was explicitly interrupted at dispatch
155/376; it has no pass/fail verdict. No build ran. Audio's gate was untouched.

- Direct sun and sky sun-disc strength reach zero at dusk and stay zero at
  night. They fade continuously from golden. Dusk remains warm but dim; night
  uses blue-grey ambient fill. Remove sunset-HDR contribution at night rather
  than retaining its directional hot side. Inspect actual native facade and
  skyline shader emission as well as the light values; scalar changes alone
  cannot prove the tall facade's pixels are correct. Released lookups stay exact.
- Path-only native city-room and skyline shader clones select a stable 40%
  subset of existing windows from their existing position-derived seeds, within
  Claude's 30–50% range. A selector uniform must gate the actual emitted
  radiance, with varied warm brightness, zero day emission and the same selected
  windows at dusk/night. Keep perspective interiors, geometry and source shader
  identity intact. Do not light every pane by multiplying one shared intensity.
- Preserve each native lens and its damage shader. Give all eight cars visible
  red rear-lamp glow at dusk/night in both qualities using bounded car-owned
  soft geometry; Performance must not depend on bloom. Reduce the present
  headlamp 4.2 emission floor, retain stronger braking, and make the existing
  cheap beam/road pool readable without a white patch. No added real car lights.
- Bind two bounded instance batches to existing city poles: warm emissive heads
  at their native lamp positions and soft road pools following native ground.
  Reuse these in both qualities; add no real street lights. For authored paths,
  keep the existing local street-light pool inactive and retain the existing
  player headlamps/police behavior. Legacy courses keep their original lighting.
- Keep the sky in its existing draw. Use a dark navy night palette, less cloud
  masking, visible anti-aliased stars and a lower fixed celestial moon position
  above the skyline. Do not move the QA camera, make the moon follow the camera,
  or create additional sky meshes. Native pixels in both presets decide success.
- Bind once and update reusable buffers/materials only. Restoring an old course
  returns exact materials, shaders and settings. Race state, profile, storage,
  random streams and existing course definitions remain unchanged.

Meaningful RED checks precede runtime edits: actual scene direct-light/env
state at dusk/night, native room/skyline compiled shader selection/emission,
car-owned red glow and bounded head emission without bloom, native-pole instance
batches with no new real lights, and celestial shader/uniform visibility bounds.
Existing legacy identity and disposal checks stay. Two old assertions describe
superseded design: strict `dusk.sun > night.sun > 0`, and an exact city shader
with only uniform emission scaling. Proposed replacements are stricter direct
zero-sun checks and native shader/geometry preservation plus selective emission;
they need the Director's review, and are not tolerance relaxations.

This design and the new RED checks go to the Director before runtime code.
No browser/build/heavy gate runs until granted. One round-two native eight-view
sheet follows source checks, with the existing frame watch retained. The earlier
High CPU exception is preserved as evidence for its measured source; it does
not establish cost or art approval for the changed round-two source.
The authorized headless RED run exited 1 in 2.84 seconds before runtime edits.
All original checks reached the new round-two section. Its 44 added checks
exposed 29 missing behaviors: direct sun/HDR, moon/star presentation, native
room/skyline emission selection, Performance-independent rear glow/head bounds,
and native streetlamp heads/pools. Raw failure and exact added-test diff are
in ignored `round-2/red-light-path.log` and `round-2/test-first.diff`.

Director-approved assertion replacements will be explicit: replace strict
four-stage sun decrease with day > golden > dusk and dusk = night = 0; replace
night's positive HDR contribution with positive ambient fill and exact zero
HDR at night; retain exact native vertex/room-box geometry while replacing the
old uniform-only emission string expectation with stable selected-window
emission. All simulation, legacy restoration, lifecycle, no-new-light and
finite-timing checks remain. These changes enforce the newly approved look;
no timing tolerance, sample count or replay signature is relaxed.

Round-two implementation: native dusk/night sun and disc are zero; night HDR
contribution is zero with blue ambient fill. Native room and skyline shaders
select a stable 40% of panes, vary warm emission and turn it off in day. Each
car owns soft red rear glow with native damage attenuation, bounded headlamp
emission and a softer beam. Two capped native-pole instance batches provide
warm heads and road pools in both qualities; authored paths disable the old
real street-light pool. The fixed moon is lower in world space and stars use
screen-space smoothing. Day/golden and exact legacy restore checks remain.
The focused headless check passes all 523 assertions after these changes.
The three reviewed assertion replacements are the only changed expectations.
Native eight-view art, current-source frame watch and lane/build remain pending.

Removed in round two: dusk/night direct sunlight, night sunset-HDR contribution,
the all-pane emission adapter, white-hot headlamp floor and subpixel star dots.
No native facade, window, pole, car geometry or legacy lighting path was removed.

Round-two QA instrumentation plan (before code): extend only the existing
native witness with the actual streetlamp head/pool instance counts, effective
visibility and material emission/opacity, and each car's actual visible soft
rear-glow mesh count. Dusk/night must show matching bounded street batches and
nonzero rear glow on all eight native cars in both presets. Keep every existing
assertion, view, seed, camera, timer, sample count and frame-cost limit unchanged.
No runtime change is needed. The eight-view capture already passed on 65d72ec1
at private port 51149 with zero warnings/errors and exact state/profile/material
restoration; frame measurement was off. The new witness awaits its own native
run in the separately granted quiet slot.

Round-two standard watch on frozen `0f3cf576` (runtime `65d72ec1`) failed the
unchanged 10% gate at private port 6341. High pair-two p95 off/on: CPU 9.6/18.7 ms
(+94.79%), GPU 11.132928/17.587200 ms (+57.97%), delivered 16.8/18.2 ms (+8.33%).
High pair one and both Performance pairs meet the 10% comparisons. All eight
runs completed at scale/ratio 1, each with 360 CPU and 359 delivered/GPU samples.
The round-two review note keeps every pair's numbers. No automatic retry,
timing investigation, threshold change or causal claim was made.

The new native witness passes both quality presets at dusk/night: two visible
streetlamp heads and matching soft pools; all eight actual cars each own two
visible nonzero soft rear-glow meshes. Existing state/profile/material restore
checks pass, with zero browser warnings/errors. The original sheet/captures
remain unchanged. Waiting for Claude's scoped timing/art response; lane/build
are held. This result is folded into the next real change, not committed alone.

## Final round three: before-code design and test plan

Kyle-relayed Claude direction: this is the final allowed art round. Correct
both-side supported lamps, cool road fill and 50 m marking readability while
preserving round-two facades, windows, moon and vehicle tails. One bounded
prewarm fix and one scheduled standard timing run are allowed. The round-two
High pair-two timing FAIL remains evidence; shader compilation is a possible
cause, not a proved cause or an inherited timing exception.

Inspection found that Three's native compile traverses invisible meshes. Merely
showing hidden glow groups is therefore not a fix. The existing QA fixture
warms the legacy Harbor definition and injects lightPath later. Real authored
paths already create several adapters before structural warmup, but there is
no explicit complete variant submission/readiness contract. Course environment
identity includes its full definition, so a real preauthored course causes the
existing structural rebuild. No preparation-key change is needed or proposed.

Planned rendering changes:

- Build a bounded near-road fixture pool on both sides, at regular 40 m course
  samples across city sections. Use native pole/arm proportions and matching
  supports at both edges; attach warm heads and soft grade-following tarmac
  pools. Reuse four small instance batches, with at most 32 lamps total (16
  paired stations), independently of quality. Avoid duplicating an existing
  native fixture at its anchor. No floating dots, real Lights or shadow passes.
- Raise only authored night cool ambient fill enough to read road boundaries.
  Keep the sun and sunset HDR contribution at zero. Leave round-two window
  shaders, facade response, fixed moon/stars and red tail geometry unchanged.
- Tag the existing main-road centre and edge strip meshes, then bind private
  path-only marking materials. Their existing geometry and source materials
  remain exact. Add a small cool ambient response plus headlight reflection
  extending beyond 50 m; tune existing cat's-eye glints on the same bounded
  road pool. Day and legacy restore exact original materials and strengths.

Planned readiness changes:

- At structural warmup, explicitly prepare the actual eligible native vehicle,
  road, window, sign, lamp/pool, reflector and sky materials for an authored
  path, including initial-day hidden effects. A reversible scene-lighting
  submission scope binds each real variant for compilation, then restores
  material identities, uniforms, visibility and active look synchronously.
- Extend the existing render-warmup compile adapter to submit those variants
  for the actual output modes (linear composer/mirror and canvas as needed).
  Await all submitted compiler promises, including when an earlier submission
  throws or rejects. Keep exact target/cube-face/mipmap restoration and existing
  timeout, stale-ticket and deferred resource disposal rules. No clear or draw
  is added during compilation. No per-frame compile or progress-key changes.
- The native fixture must use a true authored day-start definition before stage
  creation. In its isolated memory-only tab, temporarily add the fixture path
  to the native catalog definition before startCampaign, retain a private copy
  on the newly created Course, and restore the catalog definition immediately
  in finally. This needs no game/catalog source edit. Warmup must finish before
  readiness and before toggling the recorded comparison looks. Camera, seed,
  field, standard sample counts, pair order and 10% limits remain unchanged.
  Do not inflate waits to hide preparation. Record actual ready status and
  shader-program inventory before and after the first night transition.

Meaningful RED checks before runtime edits:

- An initial-day authored fixture exposes every actual night material to the
  warmup submitter, including all eight native car glow/beam materials and both
  road sides' supported fixture/head/pool/marking materials.
- A deferred second variant keeps readiness pending; rejection or synchronous
  failure cannot release another variant's resources early. Temporary bindings,
  visibility and render targets restore immediately on every exit. Repeated
  frames and lighting progress do not add objects or compiler submissions.
- Both-side matrices have supported poles/arms/heads and matching on-tarmac
  pools at bounded regular spacing. Existing materials are restored exactly;
  no new real Lights or race-state writes. Marking geometry stays identical,
  responds to the path and headlight beam at 50 m, and resets in day/legacy.
- Keep all existing scene, vehicle, shader, replay, resource lifetime, warmup
  key/controller and finite-frame assertions. Any necessary replacement must
  be listed and reviewed before it changes; no timing tolerance is relaxed.

Native final evidence: preserve the same eight full-frame views and camera.
The witness records actual left/right support/head/pool matrices and their
projected positions, plus native centre/edge marking locations at 50 m ahead
of the player and neighbouring tarmac pixels from the same captures. Review
those actual pixels for visibility and cat's-eye glint, not only object counts.
Record all native car glows and legacy/state/profile restoration again. One
round-three sheet follows source/native checks. One quiet standard two-pair,
both-order, both-quality run retains the existing counts and every 10% limit.
A real failure is preserved without automatic retry or a fourth art round.

Exact files: existing DAY owners/hooks in light-path.js, scene-lighting.js,
render3d.js, tests/scenario/art/notes; newly granted render-warmup.js and
tools/test-render-warmup.mjs. Request one additional narrow src/world.js hook:
label only the four existing main-road strip meshes at the current cream edge
and yellow centre construction (around lines 71-72); preserve their original
material objects, geometry, transforms and order. No world-props.js, course.js,
config.js, preparation-key change or additional test-file hook is requested.
Atmosphere and vehicles need no new visual changes in this round.

Removed by this plan: the sparse single-side path lamp batches, unprepared
late-injected QA definition, and any superseded private marking adapter. Keep
native legacy fixtures and all earlier timing failures. No runtime edits or
new tests have started; source review and the Director's grants come first.

Round-three source implementation: paired supported 40 m fixture stations,
path-only marking reflection/ambient response and cool night fill are in place.
Night binding preparation runs inside the existing structural job, sequentially
per output mode because Three polls each material's current program. The actual
production guard captures world/revision and checks disposal before every late
submission. Earlier rejection/throw cannot release a deliberately pending later
compile; day identities and actual glow/beam/world uniforms restore immediately.
The focused checks pass: lighting 544, warmup 304, unchanged pass parity 143,
and unchanged preparation-key behavior 39. The new stale-world entry point had
its own meaningful RED before repair. The protected native quality-dispatch
assertion remained unchanged and still verifies actual High/Performance routing.
The final native scenario starts the exact native catalog definition with its
path before stage creation, proves identity, then restores the original property
descriptor in finally. It records complete native shader-program inventories,
requires no new dusk/night programs after preparation, and records actual both-
side fixture matrices and native 50 m marking/tarmac pixel projections. The
existing sheet recipe can audit those same screenshot pixels without a new draw.
Runtime source review and all scheduled native/frame/art/gates remain pending.

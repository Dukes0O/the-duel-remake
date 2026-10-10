# P4-DAYNIGHT - light that moves

Status: owner modules and native renderer hooks implemented after P4-TRACK-SCRIPT sync.
Browser, frame, art review and lane/build evidence remain pending.

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

## Acceptance and review plan

- `tools/test-light-path.mjs` precedes runtime code: endpoint/intermediate looks,
  boundaries, invalid data, lap progress, frozen inputs, no RNG use, old-course
  settings, native scene light counts, vehicle lamp ownership and cleanup.
- Browser scenario: native course with an explicit test path, same view at day,
  golden, dusk and night; readable road, native lenses, reflected board text,
  moon/stars and real building/landmark windows. Capture High and Performance.
- Compare night on/off with eight visible native cars at the busiest test view,
  paired CPU/GPU/delivered p95 samples using the established frame metric rules.
  Keep the usual 10% cost limit; do not claim an unmeasured result.
- One compressed day/golden/dusk/night sheet for Claude, maximum three rounds.
  No art approval, browser pass or frame result is claimed yet.
- Lane tier and build run only in the Director's scheduled slot. Existing replay
  fingerprints and legacy lighting tests must remain exact.

## Test-first evidence

`node tools/test-light-path.mjs` exited 1 before implementation with
`ERR_MODULE_NOT_FOUND: src/light-path.js`, the expected missing feature.
The Director authorized this run, then reviewed the design/tests before code.
The world-decoration tests also failed first on their missing owner export.
Focused results: light-path 467; unchanged lighting-moods 2666; unchanged
scene-lighting 1078. Scenario/source syntax and diff whitespace checks pass.
No browser, frame comparison, build or lane gate has run for this card.
Reviewed draft-test corrections: explicit coast fixtures rather than changing
the native desert fallback; native closed/open endpoint witnesses; exact legacy
sky material/uniform identity; braking and shared lens ownership restoration.
Native witnesses cover all seven synchronous player models plus the traffic sedan,
including real damaged lens geometry, wear shaders, day/night and braking restore.
The browser draft uses eight different native cars, including both licensed GLB
variants. Those licensed materials still need their actual browser proof.
No existing assertion, tolerance, signature or pin was changed.

## Retained draft and remaining work

P4-TRACK-SCRIPT merged and the lane synced its native course support. The renderer
now passes unwrapped distance, native `duel.raceLength` and menu state to the
sampler, binds each native world, and updates native car lenses and world details
after placement. One reused world input holds position, heading, distance and
quality. Ghosts and decoy drones stay outside the adapter. Detached world/vehicle
resources are released only inside existing deferred retirement before disposal;
the reused convoy tanker keeps its existing lifetime. No race-state writes were
added. Focused checks pass unchanged after the hooks: 467 + 2666 + 1078.
Syntax and diff whitespace checks pass. This draft remains unready for merge.

Run the native browser scenario and resolve any actual
fixture or visual failures. Prove eight visible models, including the licensed
pair, four looks in both presets, legacy material restoration, and unchanged
race/profile data. In the Director's quiet slot, measure the matched night cost
against the unchanged 10% limit. Generate the first compressed comparison sheet,
obtain the required art verdict within the three-round cap, then run lane/build
and the independent review. No browser, frame, art or merge approval is implied
by this draft. The Director owns later full-tier and release scheduling.

## Native browser corrections

The first native checks exposed two fixture errors: the first opponent must
also be the native rival, and a stopped App needs its existing onFrame callback
to update the loading overlay after renderer preparation. The harness now uses
those native paths and keeps every readiness and eight-car assertion.

The next check reached the actual night view and found no window bindings.
Harbour buildings now use the native city parallax material rather than the
old fallback window boxes. That shader assigns emissive radiance directly.
The path-only clone preserves its perspective room shader and multiplies its
final emission by the night fade and warm colour. Leaving the path restores
the exact original material. Nine native city-material regressions failed
before this fix and now pass; the focused total is 476. The unchanged lighting
mood and scene suites remain 2666 and 1078. The browser selector recognises the
actual city shader; the night-window requirement is unchanged. No existing
assertion or tolerance changed. Native visual checks then passed all eight cars, four looks and both presets
on private port 32797 with memory-only saves and zero warnings/errors. Image
review caught a stale rear-view capture: the fixture supplied fixed presentation
time 40 seconds, ahead of the browser clock, so the mirror could not refresh.
The fixture now uses native time and requires an actual refreshed rear-view
frame after each look. No runtime mirror change or weakened assertion is needed.
The corrected capture and quiet frame comparison remain pending.

Corrected captures passed on private port 11053, again with eight native cars,
four looks, both presets, memory-only saves and zero warnings/errors. Native
image review confirms the mirror now follows each look. The first compressed
sheet and review request are under `docs/board/looks/p4-daynight/`. Frame cost,
Claude's art verdict, lane/build and merge remain pending.

## Independent source review

The independent review of 13a094a6 cleared the runtime sampler, native city
shader, resource lifetime, legacy restoration and read-only renderer hooks.
It found that zero timer batches could produce a NaN pair ratio and falsely
pass the frame budget. The new regression failed on the missing rejection.
The shared scenario summary now requires positive p95 before any division;
479 lighting acceptance checks pass. Existing sample counts, percentile recipe
and the 10% limit are unchanged. CPU measures native main/rear-view render
submission, GPU measures the main pipeline, and delivered frames measure RAF
pacing, as in the established convoy check. Measured cost and art verdict are
still pending.

## Quiet frame comparison, 10 October

At unchanged source 4834abde, the first quiet eight-car run failed High pair
2: render-submission CPU +53.61% and main-pipeline GPU +28.68%; delivered
pacing and both Performance pairs stayed within the unchanged 10% limit.
The High legacy GPU p95 shifted from 24.94 ms in pair 1 to 11.54 ms in pair 2.
No cause was proved and no runtime code, assertion or tolerance was changed.

One unchanged diagnostic repeat, still alone on the laptop, passed all four
pairs on private port 22672 with memory-only saves, eight native screenshots,
zero warnings and zero errors. Worst added CPU p95 was 4.40%, GPU p95 4.00%,
and delivered p95 did not increase. All batches retained 360 CPU, 359 delivered
and 359 valid GPU samples, fixed resolution and exact eight-car poses.
Both reports remain under integration `.evidence/2026-10-10/P4-DAYNIGHT/`
(`frames-1` and `frames-2`). A small deferred timing-diagnosis card keeps the
unexplained first-run instability visible. This records the successful repeat
and the failed first run; it does not establish the cause or an art/merge pass.
Claude's first art verdict and the lane/build gate remain pending.
## FIELD sync and current frame hold

The lane synced FIELD/GRIP at 42b9b5f7. The automatic renderer merge was
independently reviewed: FIELD paint/shadow handling and DAY resource ownership
remain intact. Focused checks pass 479 light-path, 1078 scene-lighting and 2666
lighting-mood assertions. Native views still pass all eight cars, all four looks
and both presets, with memory-only saves and zero warnings/errors.

The first quiet check on this source failed Performance pair 1: CPU +19.39%,
GPU +14.11%. Both High pairs and Performance pair 2 stayed within 10%; delivered
p95 was 16.8 ms throughout. An unchanged repeat numerically passed (worst CPU
+6.08%, GPU +5.94%), but Harbour lane gate PID 40912 started at 22:55:00 UTC
before the report completed at 22:55:55. That repeat is valid functional evidence
only and cannot qualify the quiet frame budget. Both reports remain in
`frames-field-1` and `frames-field-2` under the card's ignored evidence folder.

The first-run variation has no proved cause. Investigation reached its time cap;
QA-FRAME-SETTLING records the uncertainty, and other cards continue. Current frame
acceptance remains open pending a coordinated quiet slot. No runtime change,
assertion/tolerance relaxation, exception approval or final frame pass is claimed.
Claude's first art verdict and the lane/build gate are also pending.
## Removed

No obsolete runtime path was replaced. Path-only lamps, reflector objects and
cloned materials are removed by their owner on disposal. The original lighting
path remains necessary for every current course.

## Confirmed quiet FIELD measurement — 10 October

Kyle relayed Claude's confirmed quiet slot before this run. Claude stopped its
Harbour check and also interrupted our AUDIO and Telemetry lane runs; those
interruptions have no test verdict and are restarted after this measurement.
All three Codex builders held heavy work. Separate prelaunch and post-run
process inventories showed no competing gates, builds, browser harnesses,
balance runs or Blender jobs.

The unchanged source `42b9b5f7e9f9a0833ec52a58d7e97d371896ce09` ran on private
port 45114 with memory-only storage. All eight native visual captures completed.
The required frame gate **failed**, exit 1, with the original limits and samples:

| Quality / pair | Added CPU p95 | Added GPU p95 | Delivered p95 |
| --- | ---: | ---: | ---: |
| High / 1 | -7.27% | -2.65% | 16.8 ms |
| High / 2 | +13.40% | +6.58% | 16.8 ms |
| Performance / 1 | +49.33% | +21.88% | 16.8 ms |
| Performance / 2 | -1.37% | +1.00% | 16.8 ms |

This is a valid quiet failure, not a passing repeat or an overlap excuse.
The numeric pass from `frames-field-2` remains invalid for quiet timing.
Evidence is in ignored `frames-field-3`. No runtime code, sample count,
assertion, tolerance or adverse sample changed. The cause of variation remains
unproved. The investigation cap has been reached; no further same-source
repeat is scheduled. Keep DAYNIGHT held and continue the other cards while
Kyle decides when the existing QA-FRAME-SETTLING diagnosis should run.

## Bounded timing diagnosis design — before instrumentation

Kyle relayed one further 30-minute quiet slot: compare the same scene and
camera with one path-off then path-on pair in High and Performance. A scoped
diagnostic mode runs that one pair; the ordinary acceptance scenario retains
both orders. Keep all original sample counts, timing guards and the 10%
CPU/GPU/delivered p95 gate. No runtime optimization is justified yet.
The Director reviews this diagnostic source before the scheduled browser run.

Use the native `recordRendererFrame(now, updateMs, submitMs)` callback to retain
`rendererUpdate` and per-frame `updateAndSubmit` samples alongside the original
`cpu` submission samples. The update phase includes lighting, car placement,
world updates and other renderer preparation; it is not lighting-only time.
The lighting owner is private to the renderer, so this two-file QA change
cannot isolate its methods without adding a runtime hook. Sum each frame's
update and submission times before calculating percentiles; do not sum p95s.
Store CPU/update/RAF arrays in chronological order and diagnostic paired
deltas separately from the existing budget fields. GPU queries are collected
in completion-observation order by the existing reverse pending-query loop;
store those separately as `gpuCompletionSamples`, without claiming temporal
order or changing polling, timer values or p95. Do not add these diagnostics
to the acceptance gate.

These timings reuse the existing native clock reads. Array writes add observer
work after the native measured phases and may affect later RAF intervals or
collection pauses. Both branches use identical instrumentation. Do not subtract
estimated overhead or treat comparison with earlier uninstrumented runs as a
feature-cost result. The stopped App and fixed inspection camera measure a
fixed night look; they do not prove moving light-blend or moving-camera cost.
The generic frame-pacing scenario has no absolute pass cutoff. Kyle/Claude
therefore explicitly set 20 ms delivered p95 for this diagnostic routing
decision only. Record whether off and on exceed 20 ms. Both exceeding it
routes the case to measurement diagnosis by Director instruction, not proof
of technical cause. Only on exceeding it routes feature investigation; keep
off-only and neither-exceeds outcomes explicit. This is neither a new release
floor nor a replacement for any original 10% relative-cost gate.

Earlier reports, failed samples and others' pending review notes stay intact.
No new mirrored implementation test is needed for this additive QA capture.
Syntax/diff inspection and the Director's source review precede the one native
run. Heavy jobs remain held until Audio completes and the quiet slot is granted.

Draft syntax and diff-whitespace checks pass. The scoped run requires both
`P4_DAYNIGHT_MEASURE_FRAMES=1` and `P4_DAYNIGHT_DIAGNOSE_FRAMES=1`.
No browser or timing result is claimed for this instrumentation yet.

# P4-DAYNIGHT - light that moves

Status: Claude final art pass, 4/4/4/4 (11 October overnight inbox). Frozen
source frame watch passes unchanged limits, delivered p95 at most 18.2 ms.
Current lane/build and final handoff review remain required.

## Accepted design

- A course opts in with `lightPath: {axis, keyframes}`: distance in metres or
  race-progress 0-1; strictly increasing finite `{at, look}` entries use
  day/golden/dusk/night. Invalid or absent paths use the exact legacy branch.
- Closed-course distance wraps; point-to-point clamps. Race progress uses
  unwrapped `state.s / duel.raceLength`. Negative grid positions clamp; reverse
  retraces the path, pause freezes it, previews show its first look.
- Smoothstep blends linear-RGB colours, sun, ambient/reflection, sky/fog, clouds,
  exposure and celestial strength. Native day/golden stay exact. Dusk/night
  direct sun and night sunset HDR are zero. Cool fill preserves readability;
  tunnel overrides stay local. No mid-transition HDR target swaps.
- Track feature switches gate their definitions; no global switch or existing
  course path is added. This foundation ships dormant. No race, save, profile,
  storage, random-stream or event change; no new sound cue is required.
- Continuous native car lamps use bounded head emission/beam and damage-aware
  red rear glow; braking stays brighter. Ghosts get none. Reuse two player
  spots; NPCs add no real lights. Night amount is 0/0.55/1 for day/dusk/night.
- Native room/skyline shaders select a stable 40% warm window subset, zero in
  day, retaining perspective interiors/geometry. Reflective signs keep text.
  Authored distant window points must attach to real buildings.
- Fixed moon and smoothed stars share the sky draw. Both-side supported 40 m
  fixtures use four capped instance batches (32 lamps maximum), grade-following
  pools and no real lights. Legacy streetlights stay exact outside paths.
  Native centre/edge paint reflects beyond 50 m with bounded cat's-eye glints.
- Scene/vehicle owners reuse private materials/buffers, restore exact legacy
  identities/settings and dispose safely. Deferred retirement preserves native
  resource lifetimes; presentation never writes race state or native geometry.
- Structural warmup submits actual day/night variants sequentially for native
  output modes and awaits every promise after throw/rejection. Bindings,
  uniforms, visibility and target/face/mipmap restore immediately. World/revision
  and disposal are checked before late submits. No extra draw/clear, per-frame
  compile, timeout, quality-dispatch or preparation-key changes.

## Checks and reviewed assertion changes

Meaningful REDs preceded sampler, owner, shader, positive-timer and warmup fixes.
Director approved three superseded expectations: strict sun decrease becomes
day > golden > dusk = night = 0; positive night HDR becomes zero HDR with
positive ambient; uniform window emission becomes selected emission preserving
native vertex/room-box code. No other assertions, tolerances, sample counts,
world signatures or replay pins were weakened or regenerated.
Focused passes: lighting 544, warmup 304, unchanged pass parity 143 and keys 39.
Earlier build passed. Root cleared final source and viewed all native PNGs.
One native run (port 46547) passed with zero warnings/errors, memory-only saves,
exact restoration and unchanged race/profile. Authored-at-creation identity and
readiness passed. Both presets record 22 supported fixtures, eight complete
in-frustum stations per side, two rear glows on every car and clear 50 m lines.
Shader counts: High 148 after warmup / 151 after initial preparation (+3);
Performance 238 / 243 (+5); zero further additions at first dusk/night.
The [final art note](../board/looks/p4-daynight/round-3-review.md) keeps the pixel audit
and 447,115-byte sheet. Rounded Performance probes miss two subpixel lines;
raw values and 3x3 peaks are preserved. No fourth art round is allowed.

## Timing decisions and failures

The one standard run on `bd438f49` passed at private port 37420 with no browser
errors/warnings. All eight legs kept 360 CPU, 359 GPU/delivered samples, scale
and DPR 1. Two pairs and both orders/presets retained all original 10% limits.
Pre/post inventories found zero competing heavy jobs. p95 off/on milliseconds:

| Preset/pair | CPU | GPU | Delivered |
| --- | ---: | ---: | ---: |
| High/1 | 9.8/9.7 | 11.249664/11.486208 | 18.1/18.1 |
| High/2 | 9.2/9.7 | 11.150336/11.192320 | 18.1/18.1 |
| Performance/1 | 7.0/7.0 | 7.964672/8.034304 | 18.1/18.2 |
| Performance/2 | 6.8/7.0 | 7.879680/8.049664 | 18.1/18.1 |

CPU includes main/mirror submission; GPU is main only. Diagnostics never replace
this gate. The earlier 20 ms threshold was a scoped classification, not a release
limit. No cause, including shader compilation, is proved; no timing rerun occurred.

- `4834abde`: High CPU/GPU +53.61%/+28.68%; unchanged repeat passed, historical
  only. Legacy GPU varied 24.94/11.54 ms; no cause was established.
- `42b9b5f7`: Performance +19.39%/+14.11%; next numeric pass overlapped a gate
  and is functional only. Quiet repeat failed High CPU +13.40%, Performance
  CPU/GPU +49.33%/+21.88%; delivered remained 16.8 ms.
- `f6b591f3`: High CPU 9.7/11.3 ms (+16.49%), GPU +8.85%; Performance cheaper;
  delivered 16.8 ms. Kyle relayed Claude's source-specific exception at 00:20 UTC
  11 Oct; the test stays failed. [Round one](../board/looks/p4-daynight/round-1-review.md)
  records it. Panorama Night and Harbour Lights each need eight-car night
  delivered p95 checks and lighting trims if needed; no general waiver applies.
- `0f3cf576`: High CPU 9.6/18.7 ms (+94.79%), GPU 11.132928/17.587200 (+57.97%),
  delivered 16.8/18.2 (+8.33%); other pairs passed. [Round two](../board/looks/p4-daynight/round-2-review.md)
  retains all pairs. QA-FRAME-SETTLING retains the unproved variation finding.

## Removed

Removed all-pane emission, white-hot head floor, subpixel star dots, sparse
one-side fixtures and late-injected QA paths. Consolidated stale narratives;
Notes use required round-N-review.md names; old filenames are removed. No legacy path, native geometry,
save or licensed asset was removed. Raw evidence is disposable after verdict;
only one compressed sheet per round is committed.

# P4-DAYNIGHT - light that moves

Status: owner modules implemented; renderer hook held for P4-TRACK-SCRIPT sync.
Browser, frame, art review and lane/build evidence remain pending.

## Design decision (10 October 2026, before code)

- A course/event definition opts in with `lightPath: {axis, keyframes}`. `axis`
  is `distance` (metres along the road) or `race-progress` (0-1 across the race).
  Each keyframe is `{at, look}`; looks are `day`, `golden`, `dusk`, `night`.
  An event override belongs in its resolved course definition. The pure sampler uses the native desert fallback unless a theme is supplied. No state fields,
  storage fields, clock, random draw or race event are added.
- Distance paths wrap at each closed-circuit lap. Point-to-point distance clamps
  at the final road metre, never modulo-wraps. Race-progress paths use unwrapped
  `state.s / course.raceLength`, so only that sunset continues across lap boundaries.
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

The Director requested this real draft commit while P4-TRACK-SCRIPT owns the
shared renderer. It is not ready to merge. Keep this lane until that card lands,
sync it, then add the renderer hooks: pass unwrapped distance/race length/menu to
`lighting.apply`; bind the native world with `setWorld`; call `updateCar` for
visible native vehicles and `updateWorld` after placement; call `detachVehicle`
and `detachWorld` only inside deferred object retirement before native disposal.
Ghosts remain outside the car adapter. No renderer hook has been edited yet.

After that integration, run the native browser scenario and resolve any actual
fixture or visual failures. Prove eight visible models, including the licensed
pair, four looks in both presets, legacy material restoration, and unchanged
race/profile data. In the Director's quiet slot, measure the matched night cost
against the unchanged 10% limit. Generate the first compressed comparison sheet,
obtain the required art verdict within the three-round cap, then run lane/build
and the independent review. No browser, frame, art or merge approval is implied
by this draft. The Director owns later full-tier and release scheduling.

## Removed

No obsolete runtime path was replaced. Path-only lamps, reflector objects and
cloned materials are removed by their owner on disposal. The original lighting
path remains necessary for every current course.

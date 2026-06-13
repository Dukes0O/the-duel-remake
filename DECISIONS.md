# The Duel — decision log

Each entry: the call, the choice, the rationale. CANON = fixed by the build
brief; HOUSE = plausible arcade values invented to fill gaps, frozen in
`src/config.js`.

## Setup
- **Scaffolded vanilla-ts by accident**, then stripped to plain JS (removed
  `main.ts`/`counter.ts`, pointed index.html at `main.js`, dropped the
  `typescript` dep and the `tsc &&` build step). Pinned `three@0.171.0` +
  `vite@8.0.16` (same versions that installed cleanly for the Oregon build).
- **Port 5174, strictPort** in `vite.config.js`. No proxy, no external origins.

## Architecture
- **Kinematic spline controller, no sim physics** (a brief non-goal). The car
  has a distance `s` along the course centerline, a lateral offset (lane), and
  a speed; `game.js step(dt)` is pure logic so it runs identically headless
  (tests, `?autopilot`) and under rAF (rendering).
- **One spline-extrusion course generator** (`course.js`) builds every
  stage/theme from summed-sine curvature + elevation, seeded per stage. Themes
  are just parameters (palette, fog, scenery, tunnels) — all four themes
  (two core + two stretch) reuse the same generator. Strictly point-to-point: s=0 → s=lengthU,
  gas-station checkpoint at the end, **no laps**.
- **Views read state, never mutate it.** `render3d.js` (three.js chase cam) and
  `main.js` (DOM menu/HUD) both read `app.duel.state`. The renderer is
  lazy-imported with `@vite-ignore` so a WebGL failure leaves the HUD playable.
- **1 mph == 1 unit/sec** so a ~4,200-unit stage at ~140 mph runs ~30 s — a
  tight arcade stage length.

## Canon honored
- 5 lives; crash −1 + 30 s; clean stage +1; missed station −1 (LIVES in config,
  asserted in tests). "Missed station" = arriving at the end gas station off
  the paved road; otherwise the stage is clean.
- Two core cars **Falcone F42** (F40 homage) + **Stuttgart 959-S** (959 homage)
  — fictional names, original box silhouettes, no real trademarks (test greps
  for "ferrari"/"porsche" and fails if present).
- 2 themes × 2 stages core campaign (desert ×2, alpine ×2); start menu with
  car / difficulty / mode select.
- Two-way traffic; you pass in the oncoming lane; fog reduces spawn density
  ("fog-tuned spawns").
- Police: fixed radar trap per flagged stage, escalating detector beep within
  range, one pursuer; caught → ticket screen (offense/speed/penalty), outrun →
  escape.
- Manual gearbox + redline engine-blow on **Pro**; automatic on **Casual**.
- **Default stage 1 (Mojave Run I) deterministically has a radar trap AND the
  rival** (COURSE[0].hasRadar && hasRival; asserted in tests).
- Chase cam; HUD with speedo, tach/redline + gear, radar bar + cop lamps;
  localStorage best times.

## HOUSE values (invented, frozen)
- Car stat blocks (top speed / accel / grip / braking / gear ratios), difficulty
  rival skill + traffic density, radar detector range + catch model + fine,
  curvature/elevation amplitudes, traffic gap/speed/collision boxes, scoring.

## Dev hooks (milestone 1)
- `?seed=N` deterministic RNG; `?autopilot=1` scripted full-stage driver;
  `?car=`, `?diff=`. `window.__game` exposes stage / speed / gear / lives /
  penalties / police plus verbs (startCampaign, nextStage, setInput, advance,
  autopilotOn).
- `window.__render.renderFrame()` / `.sample()` — synchronous render + pixel
  readback for verification (see waivers).

## Verification (in-browser, headless preview)
- Autopilot run of stage 1 @ seed 1989: scripted off-road crash drops a life
  (5→4), radar trap triggers the pursuit, stage finishes clean at ~32 s, reaches
  the results screen. Driving the course with renderFrame shows gears
  auto-shifting 1→5, speed 24→201 mph, scene rendering 48–80 draw calls /
  ~4,800 triangles / 21 colors. Zero non-localhost requests.

## Post-build review pass
A multi-agent adversarial review (61 confirmed findings across both game repos)
drove a hardening pass. The behavior-affecting calls:

- **Pursuit dynamics were inverted and are now correct.** gapU is the player's
  lead; it previously *shrank* when the player was faster than the cruiser, so
  outrunning the cop earned the ticket and dawdling escaped — the opposite of
  canon. One-line sign fix, plus regression tests for both outcomes.
- **The Pro engine blow is reachable.** The throttle ceiling caps revs at
  ~1.04 × gearMax but the blow threshold was 1.06 — dead code. The threshold
  is now 1.02 (config `DRIVE.overRevFrac`): riding the limiter without
  upshifting blows the engine after the 1.6 s grace window, as advertised.
- **step() bails out once the status leaves 'racing'.** A final-life crash on
  the finish-crossing frame used to fall through to `_finishStage`, award the
  clean-stage life, and overwrite the gameover with a results screen.
- **Head-on collisions are swept.** At the clamped worst-case dt (50 ms) a
  201-mph pass closed more than the 12-unit hit window in one frame and
  tunneled through oncoming traffic; the test now also fires on a relative
  sign flip between frames.
- **HUD is live without rebuilds.** The rival gap, radar label, and radar
  warm/hot colors were frozen at their race-start values during normal racing,
  while pursuits rebuilt the whole overlay every frame. All gauges now update
  in place; full re-renders happen only on structural transitions.
- **Campaign restarts are clean** (penalties and crash banners cleared), the
  stage renderer keys on Course identity (restart-on-same-stage rebuilds), and
  surplus traffic-pool meshes are hidden between stages.
- **HOUSE constants hoisted to config** (ticket penalty seconds, redline/blow
  fractions, accel scale, pursuit gaps, crash recovery caps, fog spawn tuning,
  par speed); dead keys removed (`mphPerUnit`, per-car `redlineMph`).

## Waivers / gaps
- **CDP screenshots and rAF both throttle in the unfocused headless preview**
  on this machine. Game logic verified via the synchronous `advance()` path;
  rendering verified via `window.__render.renderFrame()` + `.sample()` pixel
  readback (rAF/`onFrame` don't fire reliably without focus, so the auto-attach
  of the renderer and live HUD updates were exercised by calling the same code
  paths directly). A focused real browser runs the rAF loop normally. No
  `screenshots/` PNGs captured.
- Milestones 3–5 (police+gearbox depth, duel-AI tuning, stretch roster/themes/
  audio): the mechanics exist (manual gearbox + engine-blow, rival AI, police
  pursuit, 2 stretch themes in config) — see README STATUS for what is wired
  end-to-end vs. stubbed.

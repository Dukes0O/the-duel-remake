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
  are just parameters (palette, fog, scenery, tunnels) — the four stretch
  themes reuse the same generator. Strictly point-to-point: s=0 → s=lengthU,
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
  pursuit, 4 stretch themes in config) — see README STATUS for what is wired
  end-to-end vs. stubbed.

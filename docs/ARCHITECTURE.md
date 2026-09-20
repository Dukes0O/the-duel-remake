# Game and scene architecture

Keep the current Three.js game and its deterministic simulation. Extend the scenery through small visual modules, not a second engine or a new entity framework. This refactor separates scene construction, animation, lighting and resource cleanup while preserving the current tracks and vehicle designs.

## Ownership

| Module | Owns | Boundary |
| --- | --- | --- |
| `config.js`, `course.js` | Event definitions, seeded routes, surfaces and physical features | One source for visible and collidable track geometry |
| `game.js`, `collision.js` | Driving, damage, race state and contacts | The renderer must not change simulation state |
| `npc-yielding.js` | Shared NPC stopping plan, contact envelope and responsibility | Traffic, rival and police callers preserve player-caused impacts and police catches |
| `progression.js`, `leaderboard.js` | Careers, rewards, records and local players | Scene changes must not change saves or settlement rules |
| `app.js` | Input, audio, fixed-step simulation and menus | Coordinates gameplay; does not build scenery |
| `keyboard-steering.js` | Brief-keypress shaping and held-direction history | Keyboard only; raw physics, gamepad and autopilot inputs bypass it |
| `world.js` | Ordered scene composition and graph disposal | Calls feature builders in a stable order |
| `world-surfaces.js` | Terrain, road and shoulder meshes and surface textures | Samples the existing course geometry |
| `world-props.js` | Road furniture, stations, harbor, coast structures and finish | Uses course features and existing mesh factories |
| `harbor-detail.js` | Batched crane frames, braces, hoists and cabins | Reuses existing decorative positions and bounds; no new colliders or lights |
| Feature modules such as `landscape-detail.js`, `coastal-water.js`, `checkpoint-gates.js` | One visual feature each | Own their meshes, uniforms and visual state |
| `scene-systems.js` | Per-world animation, simulation-state synchronization and cleanup hooks | Explicit callbacks instead of chained `userData` handlers |
| `scene-lighting.js` | Sky, environment maps, global/local lights and headlights | Owns asynchronous lighting loads and their GPU resources |
| `render3d.js` | Frame orchestration, vehicle views, cameras, post-processing and readiness | Reads state, calls visual systems, draws a frame |
| `scene-presentation.js`, `render-quality.js` | Direct Performance rendering and High's composed effects | Same scene/shadows; only High resizes and uses the effect targets |
| `adaptive-resolution.js` | Bounded, slow-changing Performance render scale | Learn from visible driving frames, never loading/paused intervals; no gameplay or save writes |
| `pacific-coast.js`, `coast-lighthouse.js` | Pacific-only shoreline rocks, surf and lighthouse shell | No route RNG, feature-list, collider or terrain changes |
| `frame-metrics.js` | Bounded frame-interval and CPU-render summaries | CPU submission time is not GPU time; keep load and hidden gaps separate |
| `render-warmup.js` | Structural shader preparation and safe retirement | Gate world/car/quality changes, never transient race activity; only presentation releases the clock |
| `phase-diagnostics.js`, QA profiling tools | Explicit, bounded CPU/GPU attribution | No normal-play capture, synchronous GPU waits or saved-player access |
| `build-version.js`, `build-update.js` | Immutable build identity and menu-only update checks | No player storage access; only an explicit, live-state-guarded reload |

## Add a track effect

1. Put the feature in a focused module. Build it from course data and attach its meshes to the world. Add the builder once in `buildEnvironment`, preserving the order of seeded random calls.
2. For animated features, register one system with `registerSceneSystem(world, {animate, sync, dispose})`. Only supply callbacks the feature needs.
   - `animate(seconds)` receives the ambient visual clock used by water, wind and glow effects.
   - `sync(state, dt)` reads the simulation clock and state. Use it for paused/resettable events such as cactus falls, crushes and passed gates.
   - `dispose()` releases private resources that are not owned by the scene graph. Hooks run once, in reverse registration order.
3. Keep shader time in shared uniform objects. Do not register a new callback inside `onBeforeCompile`: a material can compile more than once.
4. Let `disposeTree` release graph-owned geometry, materials and textures. Cached shared assets remain marked `userData.sharedAsset`. Do not give one resource two disposal owners.
5. For asynchronous work, stop accepting results when a scene is retired. Release late source results without creating new GPU resources. Keep actual renderer disposal deferred until pending shader preparation completes.
6. Test pause, reset, route switches and disposal. Check appearance and browser errors as well as headless data. If a feature changes physical terrain or course layout, update the shared course source and record compatibility; never disguise a physics change as decoration.

Static features need no registered system. The registry is a small lifecycle helper, not an entity/component framework. Component-local handlers may remain inside feature modules; the renderer uses only the shared world interface.

## Tests and safe visual checks

`npm test` runs the original suites in their established order, then discovers additional `tools/test-*.mjs` files. Missing original suites are an error. Use `node tools/run-tests.mjs --list` to see the plan and `node tools/run-tests.mjs --filter scene --filter world` for focused work. Direct calls also avoid PowerShell/npm argument forwarding differences. `--filter core` selects the simulation suite.

By default the core suite includes its expensive campaign matrix. For a quicker complete regression pass in PowerShell:

```powershell
$env:DUEL_SKIP_CAMPAIGNS='1'
npm test
Remove-Item Env:DUEL_SKIP_CAMPAIGNS
```

Always report that skip. Do not describe the result as a new full campaign-matrix run.

App-based QA pages install `tools/qa-storage.js` before importing the App. Their players, balances and settings live only in page memory and disappear on reload. The helper fails closed if it cannot isolate storage. It never reads or copies real careers. The vehicle-only showroom does not create an App or use saves.

Use `tools/menu-check.html` → **Start driving performance sample** → **Measure frame pacing** for actual production HUD and mirror costs. The scene-only visual page does not load production mirror-frame styling. Reports include the browser's exposed GPU, active pipeline, start/end resolution scale and mirror availability. Compare identical scene/view/quality settings, keep other heavy tests idle, and do not confuse GPU pass time with whole-frame delivery or startup time.

`test-world-composition.mjs` preserves pre-refactor geometry, material, texture, instance and object-order signatures for all nine events. These are change detectors, not values to regenerate blindly. An intentional art revision needs a reviewed visual difference and matching physical/clearance checks before changing its expected signatures.

## Current showcase and next graphics work

The first bounded pass uses these interfaces for Pacific Canyon's rocky shoreline, surf and lighthouse. It also adds repeatable frame samples and removes unused tire-plane sampling during clean driving. See [the showcase and measurement notes](COAST_SHOWCASE.md). The follow-up [performance pass](PERFORMANCE_PASS.md) prepares shaders, removes duplicate shadows and groups existing architectural detail into spatial batches. Per-instance equality tests guard the intentional grouping-signature changes; no further art revision is part of that pass.

The night-city follow-up refines existing harbor cranes with two instanced material draws per crane and repairs warehouse material selection after spatial batching. Wall cells are identified by their part metadata, not by matching the total building count; palette colours retain their original building order. Only the three city-event composition signatures change. Existing buildings still obscure some crane views; this is a detail pass, not a new harbor layout.

The architecture now has clear homes for richer scenes. Build the next improvements in bounded passes:

1. Measure draw calls, triangles, shader count, first-frame time and frame times on dense city, mountain and stadium views in both quality modes. Establish budgets before adding detail.
2. Enrich biome transitions, shoreline motion and trackside activity in feature modules. Keep collision-critical landmarks in course data; use spatial batches for repeated decorative meshes.
3. Prototype weather and visibility as a visual system coordinated with the lighting controller. Keep gameplay effects separate and explicit if they are later wanted.
4. Author memorable track sections using course feature data: set-piece structures, vista framing and lighting transitions. Test approach, passage and exit at driving speed, not only a static screenshot.

Future weather and set-piece work remains separate. Loading measurements improve, but a general frame-rate or hitch-free guarantee is not supported by the short samples. Vehicle designs, terrain shape, route versions, account data and save formats remain unchanged. The separate handling follow-up changes keyboard taps and NPC yielding, not these scene boundaries.

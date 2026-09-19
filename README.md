# The Duel — Desert Run

A playable remake foundation for a cinematic arcade road racer. Race through Mojave canyons and alpine roads, thread traffic, build near-miss combos, use boost, and escape police on the way to the next checkpoint.

This is a substantial browser-game remake, **not a finished AAA production**. The driving model remains an arcade controller following a road course. Cars and environments now use real 3D geometry; the generated reference art guides the vehicle design, and a generated sandstone texture is used directly on the canyon walls.

## Play

```sh
npm install
npm run dev
```

Open **http://localhost:5174/**. Node.js 22.12+ is recommended for the pinned Vite version. `start-game.bat` remains available on Windows. Everything used by the game is local; no runtime accounts, API keys, CDN, or remote sound services are needed.

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Throttle / brake | W / S or Up / Down | Right / left trigger |
| Steer | A / D or Left / Right | Left stick |
| Boost | Space | A / bottom face button |
| Shift down / up in Pro | Q / E | Left / right bumper |
| Camera | C | Y / top face button |
| Pause / resume | Escape or P | Start |
| Restart campaign | R | On-screen menu |
| Mute | M | On-screen sound control |

Click **Start engine** to begin. Audio starts after a click or key press. Leaving the window pauses the race. Casual shifts automatically; Pro uses manual gears and sustained over-revving can damage the engine. Keyboard or gamepad is required; the compact layout is not a touch driving mode.

## What changed

- A detailed licensed player car with a complete cockpit, sculpted bodywork, textured tires, machined rims and separate brake assemblies. Two paint/trim variants retain the existing handling choices. Clearcoat paint reflects natural sunset lighting. [Model credits](public/assets/models/CREDITS.md).
- Textured roads, double center lines, shoulders, guardrails, power lines, signs, roadside buildings, layered canyon scenery, alpine vegetation, atmospheric sky, real-time shadows, and reflective car paint.
- Live 3D garage view, new menu, responsive race HUD, route map, timing, rival gap, boost meter, pause menu, and stage results.
- Responsive directional steering and an arcade drift: the body rotates into a fast corner while the rear slips out. Releasing or counter-steering settles the slide. There is no automatic road following in manual play.
- Dirt reduces grip and speed, with bumps, dust and gravel. **Going off-road alone does not count as a crash or cost a life.** Roadside boulders have colliders matching their rendered positions; small gravel is decorative.
- **Five major crashes destroy the car.** Head-on collisions and rock impacts at 45 mph or greater closing speed count. Damage persists across checkpoints. The fourth hit warns that the next major crash is fatal. The fifth triggers a fireball, smoke, flying wheels, body debris, a crash camera and game over. Ordinary impacts retain recovery, penalties and the original run-reserve/lives rules.
- Recorded engine and tire loops respond to RPM, throttle, braking and drift. Original synthesis adds wind, gravel, shifts, boost, police, impacts, explosion and music. [Audio credits](public/assets/audio/CREDITS.md) includes sources and processing details; the menu has a public credits link.
- Scanned ground materials, rounded branching cacti, layered pine trees, denser grass, gravel, rock outcrops, roadside reflectors, contact shadows and bloom. Animated chickens wander, peck and scatter in small groups near the road and stations.
- The four-stage campaign, traffic, rival, police, lives, penalties, local best times, and deterministic course seeds remain.

The new driving model starts a fresh set of best times, saved separately for each car, difficulty, and race mode. Course distances and vehicle assets use metres; speed displays use mph.

## Assets and Blender

- `public/assets/reference/redline-horizons-art-direction.png` — generated car, building, and canyon reference sheet.
- `public/assets/textures/red-sandstone.png` — generated canyon surface used by the renderer.
- `src/vehicles.js` — original runtime geometry, also usable for model export.
- `public/assets/models/car-concept.glb` and `src/hero-vehicle.js` — detailed player car and runtime adaptation, ready to import into Blender.
- [Asset pipeline](docs/ASSET_PIPELINE.md) — editable model exports and Blender workflow.
- [Image prompts](docs/IMAGE_PROMPTS.md) — generation provenance and full texture prompt.
- [Review and production plan](docs/REMAKE_PLAN.md) — remaining work, libraries, and engine decision.
- [Verification](docs/VERIFICATION.md) — tests, browser checks, measured samples, and limits.

## Development

```sh
npm test          # simulation and lifecycle regression tests
npm run build    # production bundle
npm run preview  # serve the bundle on port 5174; stop dev first
npm run assets:export # rebuild editable GLB assets
npm run assets:audio  # rebuild processed recordings and original explosion WAV
```

`src/game.js` owns race rules. `src/app.js` owns input, fixed-step simulation, and audio. `src/render3d.js`, `src/world.js`, and `src/vehicles.js` draw the world. `src/main.js` and `src/style.css` own the interface.

`?autopilot=1` enables the test driver after starting a race; it visits the shoulder once and returns to the road. `?seed=N`, `?car=falcone_f42|stuttgart_959s`, and `?diff=casual|pro` support repeatable checks. The developer-only `/tools/visual-check.html` page exercises car detail, damage, explosion, Alpine scenery and chickens through visible controls. It is not included in the production build. `window.__game` and `window.__render` expose development diagnostics.

The historical decisions in `DECISIONS.md` describe the original prototype. The remake supersedes its visual, audio, steering, and presentation choices.

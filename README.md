# The Duel — Desert Run

A playable remake foundation for a cinematic arcade road racer. Race through Mojave canyons, alpine roads, the Pacific coast and a harbor after dark, thread traffic, build near-miss combos, use boost, and escape police on the way to the next checkpoint.

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

- A detailed licensed player car with a complete cockpit, sculpted bodywork, textured tires, machined rims and separate brake assemblies. Two included cars and an unlockable Aurora GTR use different tuning. The GTR adds gold rims and carbon aero to the shared licensed concept-car body. A helmeted driver and directional body damage are visible. Clearcoat paint reflects natural sunset lighting. [Model credits](public/assets/models/CREDITS.md).
- Textured roads, double center lines, shoulders, guardrails, power lines, signs, roadside buildings, layered canyon scenery, alpine vegetation, atmospheric sky, real-time shadows, and reflective car paint.
- Live 3D garage view, new menu, responsive race HUD, route map, timing, rival gap, boost meter, pause menu, and stage results.
- Responsive directional steering and an arcade drift: the body rotates into a fast corner while the rear slips out. Releasing or counter-steering settles the slide. There is no automatic road following in manual play.
- Dirt reduces grip and speed, with bumps, dust and gravel. **Going off-road alone does not count as a crash or cost a life.** Roadside boulders have colliders matching their rendered positions; small gravel is decorative.
- **Five major crashes destroy the car.** Head-on collisions and rock impacts at 45 mph or greater closing speed count. Damage persists across checkpoints. The fourth hit warns that the next major crash is fatal. The fifth triggers a fireball, smoke, flying wheels, body debris, a crash camera and game over. Ordinary impacts retain recovery, penalties and the original run-reserve/lives rules.
- Recorded engine and tire loops respond to RPM, throttle, braking and drift. Original synthesis adds wind, gravel, shifts, boost, police, impacts, explosion and music. [Audio credits](public/assets/audio/CREDITS.md) includes sources and processing details; the menu has a public credits link.
- Scanned ground materials, rounded branching cacti, layered pine trees, denser grass, gravel, rock outcrops, roadside reflectors, contact shadows and bloom. Animated chickens wander, peck and scatter in small groups near the road and stations.
- Six selectable stages across four settings. Roads cannot cross themselves. Shared terrain heights anchor scenery, and visible station walls, rocks, mountains, trunks and bend barriers have solid footprints.
- Physical rival contact lets you push the opponent off-road. The rival hits solid scenery too, brakes when you cut in ahead, and cannot damage you with a late rear contact. Going 78 metres from the centerline safely returns a car to the road without adding a major crash; a warning starts at 60 metres. Coastal water also triggers safe recovery before the car submerges.
- Around 200 chickens per course. Driving through a flock refills nitro to maximum once per flock per stage; the birds flap away.
- Win credits persist locally: 650 per course win, +100 for a clean finish, +150 on Pro. Upgrade the engine, nitro, handling and tires through three levels costing 350 / 600 / 950 credits. Unlock the Aurora GTR for 2,200 credits. A race uses the upgrades fitted when it starts.

The new driving model starts a fresh set of best times, saved separately for each car, difficulty, race mode and upgrade configuration. Course distances and vehicle assets use metres; speed displays use mph.

## Assets and Blender

- `public/assets/reference/redline-horizons-art-direction.png` — generated car, building, and canyon reference sheet.
- `public/assets/textures/red-sandstone.png` — generated canyon surface used by the renderer.
- `public/assets/reference/expanded-scenes.png` � generated reference for the new environments and driver.
- `public/assets/textures/alpine-granite.png` and `pine-bough.png` � generated granite and transparent pine needles used in 3D materials.
- `src/vehicles.js` — original runtime geometry, also usable for model export.
- `public/assets/models/car-concept.glb` and `src/hero-vehicle.js` — detailed player car and runtime adaptation, ready to import into Blender.
- [Asset pipeline](docs/ASSET_PIPELINE.md) — editable model exports and Blender workflow.
- [Image prompts](docs/IMAGE_PROMPTS.md) — generation provenance and full texture prompt.
- [Review and production plan](docs/REMAKE_PLAN.md) — remaining work, libraries, and engine decision.
- [Verification](docs/VERIFICATION.md) — tests, browser checks, measured samples, and limits.

## Development

```sh
npm test          # simulation, progression and lifecycle regression tests
npm run build    # production bundle
npm run preview  # serve the bundle on port 5174; stop dev first
npm run assets:export # rebuild editable GLB assets
npm run assets:audio  # rebuild processed recordings and original explosion WAV
```

`src/progression.js` owns credit rewards, purchases and profile persistence. `src/collision.js` provides swept collision queries. `src/game.js` owns race rules. `src/app.js` owns input, fixed-step simulation, and audio. `src/render3d.js`, `src/world.js`, and `src/vehicles.js` draw the world. `src/main.js` and `src/style.css` own the interface.

`?autopilot=1` enables the test driver after starting a race; it visits the shoulder once and returns to the road. `?seed=N`, `?car=falcone_f42|stuttgart_959s`, and `?diff=casual|pro` support repeatable checks. The developer-only `/tools/visual-check.html` page exercises car detail, damage, explosion, Alpine scenery and chickens through visible controls. It is not included in the production build. `window.__game` and `window.__render` expose development diagnostics.

The historical decisions in `DECISIONS.md` describe the original prototype. The remake supersedes its visual, audio, steering, and presentation choices.

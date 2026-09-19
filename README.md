# The Duel: Redline

A 3D browser arcade racer with two-lap circuits, gravel shortcuts, mountain climbs, traffic, police chases and a monster truck stadium. Win credits, build a garage and compete for local player records.

## Play

```sh
npm install
npm run dev
```

Open **http://localhost:5174/**. Use Node.js 22.12 or later. Runtime assets are local: no account, API key or remote audio service is required. The existing Windows launcher remains available.

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Throttle / brake | W / S or Up / Down | Right / left trigger |
| Reverse from a stop | Hold S or Down | Hold left trigger |
| Steer | A / D or Left / Right | Left stick |
| Boost | Space | Bottom face button |
| Shift down / up with manual transmission | Q / E | Left / right bumper |
| Camera | C | Top face button |
| Pause / resume | Escape or P | Start |
| Restart event | R | Pause menu |
| Mute | M | Sound control |

Audio starts after a click or key press. The game pauses when the window loses focus. Automatic and manual transmission are separate from Easy, Medium and Hard CPU difficulty. Keyboard or gamepad is required for driving.

Hold the brake for a quarter-second after stopping to select reverse in either transmission. The gear display shows **R** and reverse speed is capped at 22 mph. Press accelerate to brake while reversing, then move forward in first gear. Q/E shifts forward gears only. Nitro is unavailable in reverse.

## Events

| Event | Route | Entry |
| --- | --- | --- |
| Pacific Canyon Circuit | Mojave canyon and Pacific coast; 4 km per lap | Included |
| High Country Grand Tour | Canyon ascent, alpine summit and coastal descent; 4.8 km per lap | Included |
| Harbor & Highlands | Harbor, mountain pass and coast at night; 4.4 km per lap | Included |
| Titan Monster Arena | Stadium dirt oval, jump ramps and crushable cars; 1.12 km per lap | Own Titan Monster |
| Midnight Muscle Chase | City blocks, service cuts and police pursuit; 2.88 km per lap | Own Banshee Muscle |
| Ridge Rally | Dry creek and timberline gravel; 3.52 km per lap | Own Dusthawk Rally |
| Titan Stunt Trial | Two laps, four landings and four crushed cars before the timer expires | Own Titan Monster |
| Neon Drift Trial | Two city laps; bank controlled slides and beat the score target and deadline | Own Banshee Muscle |
| Timberline Checkpoint Rush | Canyon-to-summit gravel; pass all 12 timed gates over two 3.8 km laps | Own Dusthawk Rally |

Every event runs two complete laps. The three included circuits form the campaign; garage events run separately. Ordered route gates prevent skipping a lap. Gravel and paved branches offer measured shortcuts. The live course map shows the player, rival, patrol, branch choices and finish. Mountain roads have real elevation changes and illuminated tunnels. Passing lanes merge into the main road.

Pacific Canyon, High Country, Harbor & Highlands and Ridge Rally each offer **Route A, B and C**. These change the actual bends and shortcuts. Route selection saves for the next session, and each route keeps separate best times and ghosts. The city chase and stadium events use fixed layouts. Easy rivals stay on the road; Medium rivals can use a worthwhile shortcut on lap two, and Hard rivals can use one on either lap. They must steer through it and yield at a blocked entry or merge.

Steering is responsive and allows controlled drift. It does not follow the road automatically. Brakes are stronger, with a separate brake upgrade. Leaving the road slows the car and reduces grip but does not count as a crash. Far-boundary and coastal-water recovery return the car safely to the track.

Ordinary races end after five unrepaired major crashes. Head-on and solid scenery impacts count; harmless dirt driving does not. A stage win repairs up to two major impacts and restores two crash slots, capped at five. Damage otherwise persists. The CPU brakes when cut off, remains solid after finishing, and can be pushed off-road.

**Midnight Muscle Chase keeps the car driveable after crashes.** Impacts cost eight seconds; police catches cost twelve seconds and the pursuit resumes. Finish both laps before the difficulty-specific deadline: 205, 175 or 150 seconds. Arena ramps launch the truck, record landing distance and award a capped event bonus. Six stripped salvage cars can be crushed for a separate finish bonus. Rival crushes do not earn the player credits. The separate **Titan Stunt Trial** requires at least four landings and four player crushes within 95, 75 or 62 seconds, including both laps. It has no rival or traffic. See [trial rules](docs/STUNT_TRIAL.md).

Chicken flocks wander near ordinary routes. Contact refills nitro and scatters the birds. A flock can be collected once per event.

Getting caught by police adds a 150-credit fine against the current race's earnings, as well as the time penalty. It never takes credits from the saved balance. Each catch is counted once. At a finish, fines are capped at the race's positive payout; there is no debt.

**Neon Drift Trial** requires 3,500 / 5,000 / 6,000 banked points within 150 / 125 / 110 seconds on Easy / Medium / Hard. Straighten a controlled slide to bank it. Impacts, dirt and spins lose the live chain; crashes add eight seconds and the car keeps driving. Its local leaderboard ranks score first, then time.

**Timberline Checkpoint Rush** starts with 40 / 34 / 30 seconds. Each gate adds 10 / 8 / 7 seconds. Pass all six gates in order on both laps and finish before time expires. It uses a fixed gravel mountain route with real climbs, a tunnel and a shortcut. Missing gates cannot set a record. Ordinary five-crash damage rules apply.

## Players and garage

Named players on this computer have separate credits, cars, upgrades, history and last-used race setups. Switching players restores that player's event, car, challenge, CPU difficulty, transmission and route. They share a local leaderboard with circuit and car filters. The previous garage save migrates into Player 1.

Two cars are included. Six more can be earned: Falcone Heritage, Aurora GTR, Dusthawk Rally, Banshee Muscle, Viper Prototype and Titan Monster. Falcone Heritage costs 1,800 credits and preserves the previous F42 concept body, red finish and handling as a separate car; the redesigned F42 and 959 stay unchanged. The other earned cars offer different acceleration, speed, road grip, dirt performance, brakes, mass and dimensions. The monster truck costs 12,000 credits and opens both stadium events.

Seven upgrade categories each have three levels: engine, nitro, handling, tires, brakes, suspension and nitro tank. Difficulty sets the base win reward to 600, 1,000 or 1,500 credits. An actual race loss charges half that amount, stopping at zero. Clean finishes, improved car records, win streaks, police escapes, arena jumps and crushing can earn separate bonuses. Manual/Pro doubles driving points and recurring positive credit rewards; it does not double one-time milestones or loss charges. Quitting, restarting or reloading an unfinished race forfeits only that race's unbanked earnings. Saved credits and earnings from completed stages stay safe.

Near misses require less than 6.4 m of lateral separation, tightened from the earlier 7.2 m range, without changing collisions or the 65 MPH minimum. Escaping police earns points, including when crossing the finish line during a pursuit. A car's first finish establishes its record; each later improvement with the same route, car, race mode, CPU and transmission can earn the car-best bonus. Upgrades can help beat the existing record. Stage repairs do not turn a damaged run into a clean run.

Copper Metallic and Glacier Satin finishes cost 250 and 400 credits per car. Once purchased, switching between owned finishes or restoring the factory finish is free. Paint changes appearance only and does not affect records or performance.

Six one-time driving milestones add rewards for a clean win, an improved best, winning the three campaign circuits, and mastering the rally, pursuit and arena. The garage shows each goal. Time Trials can save a personal-best ghost to race on the next attempt.

See [progression rules](docs/PROGRESSION_V2.md) for prices, comparison rules, migration and save behavior. These are local browser saves, with separate data for each browser profile and port.

## Graphics, audio and assets

The game uses Three.js, original procedural 3D models, a licensed detailed concept-car body, generated material maps and recorded engine/tire sounds. Landscapes have blended ground materials, fractured granite, grass, cloud cover and animated coastal foam. City scenes have perspective room interiors, a distant skyline, weathered sidewalks, solid parked cars and local street lighting. Day routes offer Clear, Golden hour and Overcast lighting; night events keep their authored lighting. Drift smoke uses a generated transparent sprite. High quality includes contact shading and edge smoothing; Performance reduces those costs. It remains a browser arcade game; the city chase is a bounded driving event rather than a full open-world simulation.

- [Starter vehicles](docs/CLASSIC_VEHICLES.md): separate wedge-shaped Falcone and rounded Stuttgart bodies, with no old-model loading fallback.
- [Vehicle assets](docs/UNLOCK_VEHICLES.md): four distinct original earned-car models, damage hooks and Blender-ready GLBs.
- [Model credits](public/assets/models/CREDITS.md): licensed Heritage/Aurora body and the six original playable-car models.
- [Audio credits](public/assets/audio/CREDITS.md): source recordings, licenses and processing.
- [Image prompts](docs/IMAGE_PROMPTS.md): full prompts and how generated references and textures are used.
- [Asset workflow](docs/ASSET_PIPELINE.md): export and Blender guidance.
- [Verification](docs/VERIFICATION.md): tests and browser findings.

## Development

```sh
npm test
npm run build
npm run preview
npm run assets:unlocks
npm run assets:audio
npm run assets:routes -- --check
```

The normal preview uses port 5174; stop the development server first. For stable browser checks while source edits continue:

```sh
npm run qa:build
npm run qa:preview
```

The QA build runs on port 5175 and includes `/tools/visual-check.html`. Its visible controls inspect tunnels, car models, damage, arena jumps and scenery. It is excluded from the normal release build.

`src/course.js` is the shared route, surface and scenery source. `src/game.js` owns simulation and race validation; `src/collision.js` handles swept contacts. `src/progression.js` and `src/leaderboard.js` own local careers and records. `src/app.js` connects input, audio and fixed-step updates. The renderer reads simulation state without changing race rules.

`?warmup=1` opts into experimental asynchronous scene-shader preparation on supported browsers. It holds simulation until a frame is ready, but shadow/post-processing work can still delay the first frame. It is off by default.

`?autopilot=1` enables the test driver after starting a race. `?seed=N` supports repeatable layouts. Diagnostics remain exposed through `window.__game` and `window.__render` for development. Historical prototype decisions are superseded by the current circuit, progression and handling rules.

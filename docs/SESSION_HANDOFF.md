# Session handoff — 19 September 2026

Session wrapped at the user's requested **5% quota remaining**. New feature work stopped; the final tire-grounding correction, focused checks, browser review and production build are complete. No reset credit was used.

## Repository and saves

- Workspace: `C:\Users\kyleb\dev\the-duel-remake`; branch `master`.
- Requested baseline commit: `1b96949` — Expand racing scenes, garage progression, collisions and recorded audio.
- This iteration is committed as **Expand nine-event racing career, scenery and vehicle grounding**. Find its hash with `git log -1 --oneline`. The earlier baseline does not contain this update. No push was requested.
- Preserve pre-existing untracked `game-icon.ico` and `start-game.bat`.
- The user chose local players on this computer. Careers are browser-local and origin-specific; do not reset their port 5174 storage.
- Stable QA uses port 5175 with separate Player 1, Circuit QA and Garage QA fixtures. The funded-profile tool is restricted to that port.

## Playable update

Nine events run two complete laps:

| Event | Play | Entry |
| --- | --- | --- |
| Pacific Canyon Circuit | Canyon/coast circuit | Included |
| High Country Grand Tour | Canyon climb, alpine summit, coast | Included |
| Harbor & Highlands | Night harbor, mountain pass, coast | Included |
| Titan Monster Arena | Rival race, ramps, six crushable cars | Titan |
| Midnight Muscle Chase | Timed city pursuit, recoverable crashes | Banshee |
| Ridge Rally | Creek and timberline gravel | Dusthawk |
| Titan Stunt Trial | Timed laps, four landed jumps, four crushes | Titan |
| Neon Drift Trial | Timed laps and banked drift score | Banshee |
| Timberline Checkpoint Rush | Gravel mountain route, 12 ordered timed gates | Dusthawk |

- The three included circuits form the campaign. Each combines two or three environments. Four natural events offer Route A/B/C; the other five have fixed routes. Records and ghosts separate layout, route, car and settings.
- Routes have physical grades, lit tunnels, passing lanes and paved/gravel shortcuts. Exact cached presets speed up default construction without changing solver geometry. Custom layouts still use the original solver.
- Manual steering, controlled drift and stronger brakes remain. Dirt driving and far-boundary recovery do not count as major crashes. Ordinary races explode at five major impacts. Chase and Drift keep driving after crashes with an eight-second penalty; Chase catches cost twelve seconds.
- CPU cars brake when cut off, remain solid, can be pushed offroad, and can take useful shortcuts on Medium/Hard while yielding at entries and merges. Scenery, buildings, mountains, parked cars and police are physical.
- Chicken flocks scatter and refill nitro once per flock per event. Distance-based bird rendering retains all pickups and physical flock positions.
- Seven selectable cars: two included; Aurora 2,200 CR, Dusthawk 3,500, Banshee 5,000, Viper 7,500 and Titan 12,000. Four distinct earned-car bodies have exported GLBs, drivers, trim and visible damage. The starters and Aurora share the licensed base body with separate finishes/configurations.
- Seven upgrade systems each have three levels. Copper Metallic and Glacier Satin finishes cost 250/400 credits per car. Six one-time driving milestones add capped rewards.
- Named local players have separate wallets, garages and history. Shared local leaderboards include car/circuit filters. Base wins pay 600/1,000/1,500 on Easy/Medium/Hard; losses cost half, down to zero. Valid comparable personal bests, clean wins, streaks, jumps and crushes earn bonuses.
- Leaving/restarting after GO confirms the loss charge. Reloaded interrupted races settle once. Incomplete or failed challenge objectives cannot save best times or ghosts. Best Time Trial ghosts are visual only and never collide.

Exact challenge deadlines, progression caps, comparison rules and prices are in `README.md`, `PROGRESSION_V2.md`, `STUNT_TRIAL.md` and source catalogs.

## Graphics and audio

- Generated reference artwork informs original rally, muscle, prototype and monster models. Runtime generated materials include asphalt, rally gravel, fractured granite, brick, tunnel/sidewalk concrete, clouds, crowd cutouts and transparent tire smoke. Prompts, original outputs and credits are recorded.
- Landscapes include ground blends, grounded ridge networks, animated shoreline foam, spatially batched vegetation/chevrons, corrected grass and pine lighting, generated pine-bark detail and a shared visible-sun/light direction.
- City scenes include perspective room interiors, distant towers, road-level crosswalks, street-light pools, weathered raised sidewalks and solid roadside parking. Cosmetic city plants/debris avoid pavement corridors.
- Clear, Golden hour and Overcast are saved visual choices for day routes. Night scenes retain authored lighting. Choices do not change handling, rewards or records.
- High adds contact shading, edge smoothing and 2,048-pixel shadows; Performance reduces these costs. Equivalent menu/race scenes are reused. Terrain lookup and route-construction work were measured and optimized without changing positions.
- Tire smoke uses a true-alpha generated sprite. Continuous tire tracks join actual contacts, clear correctly on teleport, and do not bridge after grip returns.
- Real licensed engine/tire recordings and three CC0 ambience loops are local. Seven car voices use the shared engine sources; sirens, impacts and some other cues are synthesized. Browser audio decoding and automation/PCM checks pass.
- `?warmup=1` is an **off-by-default experiment** for asynchronous scene shader preparation. It preserves race time during preparation and protects resource disposal. Browser samples reduce blocking first-draw work, but it does not eliminate all loading work. Shadow/post-process variants and uploads remain. Do not enable by default without more controlled hardware testing.

## Verification and browser evidence

Current automated checkpoint: **481 core checks, 60 complete campaigns, 180/180 stage wins, plus all 64 remaining suites passed**. The latter log is `.qa-final-rest.log`. It includes geometry, collisions, progression, local profiles, challenge scoring, ghosts, CPU shortcuts, rendering resources, audio, loading presets and lighting. Fresh solver comparison also passes all 15 presets. `VERIFICATION.md` holds exact counts and earlier checkpoints.

QA browser evidence includes:

- Actual purchases, per-player separation, persisted paint and personal-best ghosts. Player 1 retained its 50 credits and level-one engine/tires.
- Hard Titan Stunt Trial: 49.68 seconds, six landed jumps, five crushes, 3,000-credit first-win payout.
- Pacific Route B Time Trial: 105.38 seconds, 660 credits, separate saved ghost and record.
- Hard Neon Drift Trial: 99.38 seconds, 6,319 points, best chain 798. Score-first leaderboard shows correct car, difficulty and stock upgrades.
- Hard Timberline Checkpoint Rush: 101.68 seconds, all 12 gates, no misses, 1,950 credits including existing streak. Garage QA wallet after this purchase/run was 28,360 credits.
- Lit tunnel clearance, crowd transparency, flattened salvage cars, car paint/damage, skyline, interiors, crosswalks, concrete curbs, golden/overcast moods, grass close-up, gray smoke and continuous marks were visually reviewed.
- Same menu→race→menu keeps the world build count unchanged. Point samples on this host are around 56–57 FPS; they are not controlled or broad hardware benchmarks.

Two shader-experiment Hard chases each finished in 99.68 seconds. The first paid 2,300 credits including the one-time Night Escape milestone; the second paid 1,950. Garage QA now holds 32,610 credits. Final navigation shows CITY ESCAPED, 2/2 laps, the precise time and settled reward. Parked windshields now follow the cabin surfaces and passed browser review. Generated bark and evergreen crown lighting were reviewed together. The tire-grounding correction passes 3,665 checks and browser review of Titan and Falcone on the steep Ridge Rally section. All four Titan tires now sit about 1 cm above the road there; the earlier rotation bug displaced them by roughly 40 cm in either direction. Tire marks share the same visible-surface sampler. Production and QA builds pass; the remaining Vite large-chunk warning is documented below.

Temporary QA tabs were closed and the 5175 QA preview server stopped. The user's game tab and development server on 5174 remain available. No current gameplay defect or half-integrated feature is known. The optional shader-warmup experiment remains disabled by default.

## Resume commands

```sh
npm install
npm run dev
npm test
npm run build
npm run qa:build
npm run qa:preview
npm run assets:routes -- --check
```

Development uses 5174. QA uses 5175 and includes `/tools/visual-check.html` with visible inspection controls; these are excluded from the release build. Do not use a new QA App fixture while another economic race is active on that same origin: an App constructor settles interrupted races.

Regenerate shortcut tables with `npm run assets:routes` only after route/solver changes, then run `node tools/test-shortcut-presets.mjs --verify-solvers`. Export the four original unlock models with `npm run assets:unlocks`. See `ASSET_PIPELINE.md` for Blender guidance and asset ownership. Use UTF-8 explicitly in Windows scripts.

## Unfinished work and next useful iteration

1. **Human driving and listening review.** Automated runs establish consistency, not fun or realistic sound. Try tight braking, deliberate side contact, offroad shortcuts, a damaged city chase, all CPU levels, and engine-load/shift/tire transitions on headphones and speakers.
2. **Blender art pass.** Refine exported vehicle meshes, authored terrain/buildings, UVs, normal/roughness maps and damage variants. Preserve collision bounds, driver and animation hooks. The user's Blender executable was not found in checked standard locations; configure its path before running it. No Blender render was performed.
3. **Controlled performance profiling.** Test representative hardware in both quality modes. Separate route CPU time, synchronous shader submission, asynchronous wait, first composer frame, geometry/texture upload and steady-state draws. Keep experimental warmup optional until proven. Additional model/texture detail needs measured LOD budgets. Vite still warns about the lazy renderer chunk (about 917 kB minified, 278 kB gzip). The shader-loading experiment does not remove all first-frame stalls.
4. **Distinct recorded engine sets.** Current seven voices share recordings. More realism needs appropriately licensed, measured RPM/load/coast recordings for each vehicle class and a listening-led mixing pass.
5. **Choose the next engine scope.** This remains an arcade browser racer with route coordinates, visual suspension and bounded damage. Free-roaming city/stadium play, independent wheel physics, soft-body destruction or a native GTA-scale world require a separate runtime/physics/content project. No Unreal migration or new runtime library is needed for the current implemented events.

Rigid visual chassis can still span sharp crests with roughly −4 to +6.5 cm tire variation; independent wheel suspension is future physics work. Roughness and impact motions deliberately animate the body.

No online accounts or sync are planned: local players are the accepted requirement. Existing concrete gameplay requests are implemented; the items above are quality/production work, not claims of finished AAA fidelity.

## Stop condition fulfilled

The usage tool reported 95% used, 5% remaining. The session stopped feature work and completed verification/handoff. Future work should start from this working tree and this document; do not repeat the full campaign matrix unless gameplay changes or a new failure justify it. Do not redeem a reset credit without the user's explicit confirmation.

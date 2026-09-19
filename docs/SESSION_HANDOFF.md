# Session handoff — 19 September 2026

Current work continues the earlier quota-limited checkpoint below. The user authorized more iteration: larger near misses, Manual rewards, police escapes, two-crash stage repairs, clearer car-best rewards, distinct starter models, retired-asset cleanup and more varied natural routes. No reset credit or saved-player reset was used.

## Latest working update

- Follow-up after `2a36b47`: keep all redesigned vehicles. The requested rollback was cancelled and fully reversed; the six original models, builders and exports still match that commit. The previous F42 body is now a separate 1,800 CR unlock, **Falcone Heritage**, with the F42's stock handling and engine voice. It uses the retained licensed concept model's sport trim; Aurora keeps its GT trim. Each has separate ownership, upgrades, paint, records and ghosts. Existing saves do not receive the new unlock automatically.
- Near misses now require less than 6.4 m lateral separation, tightened from 7.2 m. Collision dimensions and the 65 mph minimum are unchanged. Boundary checks pass at 6.39 m and reject 6.4 m or wider.
- The follow-up passes 443 non-campaign core checks, 95 Heritage driving checks (four complete races), 47 driving-reward checks and focused progression, model, grounding, audio, readiness, ghost and settings suites. Production and QA builds pass. The package now contains 73 commands; the entire chain was not rerun for this bounded follow-up. See `VERIFICATION.md`.
- The live production server now serves `index-COmGH8FU.js` at the unchanged `http://localhost:5174/` address. The existing tab was at the menu with Spikyferns, 0 CR and Viper selected before refresh. Its loaded script confirms the new build; the user then began a race, which was left untouched. No live purchase or account edit was made in this follow-up.
- Spikyferns' earlier requested account grant unlocked and fully upgraded the then-existing seven cars and their paints. The rejected billion-credit grant was removed, restoring the prior 0 CR balance. No further grant was made for Heritage.
- Final credit rule: quitting, restarting or reloading an unfinished race forfeits only its unbanked earnings. Saved credits and completed-stage earnings remain intact, including after Busted. Police fines accrue against the current race and reduce only its positive finish payout; they cannot create debt. Actual completed losses, timeouts and terminal crashes retain the existing half-base loss charge. This replaces the intermediate immediate-debit policy.
- Each player saves their own event, car, challenge, CPU difficulty, transmission, route, lighting and ghost choice. Menu changes save immediately; switching and reopening restore them. Graphics quality remains device-wide. Legacy browser preferences migrate once, and new players start with defaults.

- Active worktree: `C:\Users\kyleb\.codex\worktrees\4555\the-duel-remake`. The previous audio commit is `4ef6fbf`; this iteration is not pushed.
- Falcone and Stuttgart have separate original bodies. Six original cars build immediately; Heritage and Aurora share one licensed GLB import with distinct sport/GT trim. The old coupe fallback is gone from player, rival and ghost rendering.
- Retired `cinder-gt.glb`, `desert-service-station.glb`, `tools/export-assets.mjs` and `tools/blender/build_assets.py` were removed. They remain recoverable from Git. Live stations and Aurora's credited source remain.
- Near-miss lateral range is 6.4 m, with collision and minimum-speed limits unchanged. Pro doubles driving score and positive recurring credits, not milestone awards or loss charges. A police escape gives 500 base points and 10% of the CPU base in credits, up to three credit awards per valid finished stage.
- Winning repairs two major impacts and restores two lives, both bounded by actual damage and the five-life maximum. Pre-repair stage crash evidence controls the clean bonus.
- Each genuine comparable car-best improvement can pay. First finishes explicitly establish a CPU/transmission/car/route baseline. Failed stunt objectives no longer create records or associated rewards.
- Four natural routes use layout version 4, with new hills and saddles; three also have stronger bend variation. Existing older-layout records remain stored separately. Mountains are broader, terrain blends meadow/soil/rock, and cacti fit actual rendered triangles.
- Dev review: port 5176. Stable no-HMR review: port 5177. `/tools/vehicle-art-check.html` shows all eight cars without save effects. `/tools/reward-check.html` uses page-local memory only; it cannot alter a real wallet or record. Browser QA confirmed 2,000 CR before Busted and after quitting, plus round-trip restoration of two contrasting player setups. The Heritage purchase fixture confirmed 2,000 → 200 CR, the former F42 sport body and normal race startup. Test controls now collapse after selection so they do not cover garage actions.
- Live cutover is complete: `http://localhost:5174/` now serves this checkout's tested production build through a hidden Vite preview process. The existing three player names and selected-player balance were retained; the prior 959 menu selection was restored and survives reload. No live race or purchase was run. Keep the old checkout until human play-test acceptance. See `SERVER_CUTOVER.md`: the old folder owns the shared Git history and must not simply be deleted. Its launcher is unchanged; use the running play-test link.
- Before the Heritage follow-up, the complete 72-command test chain passed with only the expensive core campaign matrices skipped (`DUEL_SKIP_CAMPAIGNS=1`). Production/QA builds pass; the known large rendering-chunk warning remains. Work is on `codex/race-refinements-and-player-settings`; no push was requested.
- Current validation and limitations are recorded at the top of `docs/VERIFICATION.md`. Earlier sections below are historical context, not a claim that the original shared-body cars remain current.

## Earlier checkpoint — historical context

The remaining sections describe the preceding main-checkout release. The current rules and paths above take precedence.

### Repository and saves

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

## Audio continuation after quota override

The next task initially stopped at the saved 5% boundary. The user then explicitly said to continue. No reset credit was redeemed; the weekly window subsequently reset to 0% used during the work.

The continuation focuses on sound. Existing licensed engine recordings now have separate filtered exhaust-body and intake paths with car-specific balance. Gear changes smoothly unload and recover all recorded layers. Hood, chase and wide cameras change the vehicle perspective. Normal asphalt travel has a quiet rolling bed, recorded squeal fades in from meaningful slip without the former rapid pitch wobble, and the in-race synthesized sequencer is quieter. Loose-surface, airborne, tunnel, pause, mute and failure behavior is preserved. No audio asset, licence, runtime dependency, progression rule or save format changed.

Current validation: 248 audio/PCM checks and 301,448 finite commands; 70 App/progression assertions; 481 core checks, 60 campaigns and 180/180 stage wins; production and QA builds; clean browser decoding and runs for Pacific, Midnight Muscle Chase and Neon Drift Trial on isolated port 5176. The browser reported all samples and ambience ready and no warnings/errors. The QA page and port 5176 development server were left available for the user's listening review. This is not a claimed human listening pass.

Next sound priority is subjective tuning on headphones and speakers: acceleration transitions, shift weight, steady cruise, tire onset, gravel balance and the three camera perspectives. If shared source character still makes the cars feel too similar, the next material step is separately licensed RPM/load/coast recordings for each broad vehicle class. Do not redeem a reset credit without explicit confirmation.

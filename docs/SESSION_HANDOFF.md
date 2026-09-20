# Session handoff — 19 September 2026

Current work continues the earlier quota-limited checkpoint below. The user authorized more iteration: larger near misses, Manual rewards, police escapes, two-crash stage repairs, clearer car-best rewards, distinct starter models, retired-asset cleanup and more varied natural routes. No reset credit or saved-player reset was used.

## Latest working update

- Kyle requested softer keyboard taps and cars that stop when blocked, then chose night city/harbor for the scenery pass. Keyboard input starts at 78% and reaches full steering in 0.20 seconds. Real 50/100 ms tap tests show roughly 19–21% less sideways motion. Release, reversal and lifecycle changes clear input history. Gamepad, held steering and autopilot retain their previous authority.
- Traffic in either direction, rivals and police now share stopping-envelope planning. NPC-caused late contact cannot dent, push or break the player's drift. Rear cut-ins retreat along the lane; correction sweeps reject walls and unsafe fallback teleports. Driving or reversing into cars still damages both vehicles. Police catches and fines remain active. No save schema, ghost format or route version changes.
- Night city/harbor restores warehouse cladding/tints lost by the earlier count-based material lookup after batching. Existing cranes gain braces, hoists, cabins and amber detail within their previous bounds. Two instanced material draws replace six per crane. Only Harbor/Midnight/Neon art signatures change; six non-city scenes remain exact. Existing buildings still obscure some cranes; no new waterfront layout or placement change was attempted.
- Browser checks used the computer-use skill and isolated memory saves. Actual 80 mph approach fixtures stop traffic, oncoming traffic, rivals and police at 0 mph with 5.83–5.84 m centre gaps, no player movement or damage. Cleared traffic reaches 36 mph after 2 seconds; intentional player impacts still dent both cars. Harbor street/detail views and Midnight High/Performance views had no observed console warnings or errors. Reusable contact fixtures are now included in the QA build.
- All 100 suites have passing results: 99 non-core suites in one 409.70-second run, plus the corrected core's 450 passing checks. Only the expensive core campaign matrix was skipped. New focused checks include keyboard 94, NPC yielding 40,884 and harbor detail 52,788. Production and QA builds pass; the existing large rendering-chunk warning remains.
- The unchanged localhost:5174 server serves `index-_-3O2cGD.js`, renderer `render3d-C1l4au6Q.js` and build `20260920144459-f371a452d667` (footer `26.09.20 14:44 UTC · f371a4`). HTTP 200 and manifest equality were verified. No live account change, restart or browser refresh was forced. Refresh from the menu to load the update.
- Cleanup complete: temporary tab closed, port 5175 preview stopped and generated `.qa-dist` removed. No new scratch files or background helpers remain. Retained reusable tests, live `dist`, dependencies and the old checkout that owns shared Git metadata. Human acceptance is still required before its planned promotion/retirement. No push requested.

### Previous startup and High-quality checkpoint

- Kyle approved tackling startup stalls and High-quality frame drops. Supported browsers now prepare scene/fullscreen shaders before presentation. Start is disabled during lazy import, car loading and preparation; race clocks do not advance during loading. The key only changes for world rebuild, car or quality, never traffic/ghosts/explosions/lighting. `?warmup=0` retains the synchronous comparison path.
- Removed duplicate shadows in the contact-shading pass, reused studio/HDR prefilter resources, and spatially batched existing building detail in 256 m cells. Exact instance geometry/placement/materials and all gameplay/save data remain unchanged. Batching changes seven grouping signatures; both Titan signatures remain unchanged. The tests compare 326,479 original instances.
- All 97/97 suites pass in 277.65 seconds with the expensive core campaign matrix explicitly skipped. Both clock/safety and full existing feature regressions pass. Same-build Harbor build-to-picture improved 2470 → 1009 ms; submitted geometry fell about35%. Short settled frame p95 stayed about18ms, so do not claim a general FPS increase. See `PERFORMANCE_PASS.md` for measured costs, variance and remaining synchronous work.
- CPU phase and GPU pass profiling are explicit, bounded QA tools only. The production HUD can be checked at `/tools/update-check.html?manifest=current&profile=1` with isolated memory saves. No live accounts or race input were used. Keep the primary checkout: it owns shared Git metadata and still awaits human play-test acceptance before promotion/retirement.
- Production and QA builds pass. The unchanged live address serves `index-CGZjB_7O.js`, renderer `render3d-DFJA9nV3.js` and build `20260920060656-1aa5eee519bf` (footer `26.09.20 06:06 UTC · 1aa5ee`). HTTP200 and exact manifest equality were verified after cleanup. No live restart or browser refresh was forced.
- Cleanup complete: the only new review tab is closed, viewport restored, port5175 QA server stopped and generated `.qa-dist` removed. Rebuild with `npm run qa:build`. Reusable regression/profiling code remains; live `dist`, dependencies, primary Git owner and pre-existing live logs remain. No new scratch files or helper processes remain. No push requested.

### Previous Pacific showcase checkpoint

- Kyle approved the Pacific showcase, measured performance pass and build/update identity. Pacific now has three-times-reviewed asymmetric sea stacks, broken surf and a refined weathered lighthouse. Route A/B/C geometry and placement checks pass. Only Pacific's complete-world art signature changes; eight other event signatures remain exact. Vehicle designs, road heights/turns, colliders, economy and save formats are unchanged.
- Added fixed-memory frame/CPU metrics and reusable bounded QA samples. Clean paved tire effects skip ten unused terrain queries per frame, with 1,260 exact effect/RNG snapshots. This is a small measured CPU saving, not a general FPS claim. Startup stalls and variable High-quality pacing remain open; measured before/after data and limitations are in `COAST_SHOWCASE.md`.
- Added one immutable build ID per build, a visible menu footer and menu-only, throttled update checks. Offline/malformed responses stay quiet; live-state checks prevent a stale Reload click from interrupting a race. The 390×844 menu fix keeps sections at full height and scrolls instead of overlapping. QA uses isolated memory saves, never real careers.
- All 90 suites have passing results: 89 passed in the broad run before the intended Pacific scene-signature mismatch; the reviewed signature and four related suites then passed together. The late tunnel-texture readiness fix and all nine scene signatures also pass. The expensive core campaign matrix was skipped explicitly. See `VERIFICATION.md` for counts and timings, not a claim of a second full 90-suite run.
- Both builds pass. The same live server serves `index-D0oJcuFm.js`, build `20260920034918-d9ee120b4824`. The live Spikyferns chase was left untouched. Refresh from the menu to load the update. The original checkout and shared Git history still require human play-test acceptance before the documented promotion/retirement step.
- Cleanup complete: closed the temporary QA tabs, stopped port 5177 and removed generated `.qa-dist`. Rebuild it with `npm run qa:build`. Kept reusable review/test code, the live `dist`, installed dependencies and the two tiny files still held by the active preview. No one-off scratch files or helper processes remain. No push was requested.

### Previous architecture checkpoint

- Scene-architecture cleanup: `world.js` now composes surfaces, props and feature modules; `scene-lighting.js` owns sky, lights and environment resources; `scene-systems.js` provides ordered ambient/state/cleanup callbacks. `render3d.js` remains the frame coordinator. The pre-extraction complete-scene signatures for all nine events match exactly. Vehicle designs, physics, terrain, rewards, accounts and save formats are unchanged. Read `ARCHITECTURE.md` for ownership and the next graphics-work plan.
- Removed verified dead renderer hooks/imports and unreachable texture fallback code. Fixed grass callback retention after shader recompiles, the omitted GTAO material cleanup, and late/failed scene-system cleanup cases. Kept every current model/export/reference/license and historical save/layout path; no additional binary asset was obsolete.
- Replaced the long shell test chain with a discoverable, filterable fail-fast runner. All 85/85 suites pass in 325.10 seconds with `DUEL_SKIP_CAMPAIGNS=1`: 448 core checks plus all remaining suites; only the expensive core campaign matrices were skipped. Production/QA builds pass. Browser review covered coast, alpine, tunnel, night harbor, checkpoint, arena crush/reset and graphics switching without observed warnings/errors.
- All App-based QA fixtures now install shared memory-only storage before loading the game; the older visual-check page no longer accesses real career saves. The live server serves `index-B3qtBbvL.js` at the unchanged localhost:5174 address. Spikyferns' live menu showed 200 CR, Harbor & Highlands and Titan selected and was left untouched. Refresh from the menu to load the refactor. Keep the old checkout until human acceptance; it owns shared Git history.
- Requested housekeeping is complete: removed generated `.qa-dist` (rebuild with `npm run qa:build`), closed the temporary review tab and stopped the port 5177 QA server. All agent test/probe processes finished and no scratch files remain. Kept reusable tests/docs, installed dependencies and the live `dist`. The live preview still holds `.qa-playtest-5174.stdout.log` (75 bytes) and `.stderr.log` (empty); remove these after that server is stopped during a normal maintenance step, not by interrupting play.

### Earlier feature checkpoints

- Jump-height follow-up: the HUD shows real `airHeight` clearance in metres while airborne, plus the current jump peak. Landing keeps `JUMP PEAK` visible for two simulation seconds. Pause freezes it; stage/menu/restart/recovery resets clear it. Pure presentation helper `src/jump-height.js` does not change physics, rewards or saves. The isolated browser fixture verified 1.4 m rising, 2.9 m peak, landing hold, expiry and new-run reset without browser errors. Production/QA builds pass, and the live server now serves `index-BCAL93Ki.js`. Dukes00's open garage (200 CR) was left untouched; refresh from the menu to load the update.
- Height validation passes 95 helper and 98 production-HUD checks, plus focused stunt, reverse, bank-protection, lifecycle and completion suites. Actual input-driven jump trajectories match a no-helper baseline at 30/144 FPS; four full F42/Heritage replays are also unchanged. The package now has 80 test commands; only focused suites were rerun. The temporary height-review tab/server were closed after testing.
- Cactus/contact follow-up: desert cacti fall on the first player or NPC hit, remain down for the stage and reset on restart/menu. Their collider stops blocking immediately; a small speed scrub and light scratch replace the old major crash. No cactus points, nitro or event progress are awarded. Falling instances pivot at the root, settle onto the rendered terrain and use the paused simulation clock. Traffic, rivals and police now keep their own front/rear/side damage and show dents, wear and glass fractures. Cooldowns prevent overlapping contacts from adding damage every frame. Existing player major-crash/recovery protection and CPU rear-yield safety remain intact; a late CPU rear hit now leaves cosmetic damage on both cars. The six redesigned vehicle bodies are unchanged.
- This follow-up passes 448 non-campaign core checks, 207 new contact checks, 1,656 NPC damage checks and 55,727 cactus fall geometry checks, plus focused driving, progression, police, terrain, effects and audio suites. Four F42/Heritage input-only forward replays still match the exact previous signature. Production and QA builds pass; the live server now serves `index-0-v__HrJ.js`. The package registers 78 commands; the whole chain and expensive campaign matrix were not rerun for this bounded change. No real accounts were changed.
- Isolated browser fixtures confirmed the first-hit fallen cactus, two-car wear and clean resets without browser errors. The live tab was actively playing Spikyferns' Titan Stunt Trial, so no refresh or live action was performed. Ask the user to refresh from the menu to load the new bundle. The temporary QA server/tab were closed after testing; the production server remains running.
- One-click navigation follow-up: Main Menu / Exit and Restart now act immediately. The confirmation screen and its state/handlers were removed; keyboard R also restarts directly. Existing settlement still forfeits unfinished earnings once and protects the saved bank, including from Busted or pause. Memory-only browser QA confirmed a single exit from Busted kept 2,000 CR, and a single Restart from pause opened the fresh countdown without another dialog.
- Reverse follow-up: hold S / Down / LT for 0.25 seconds at rest to back up in Auto or Manual. Speed is signed internally, capped at 22 mph in reverse; the HUD shows absolute MPH and R. W / Up / RT brakes reverse motion to zero, then returns to first forward gear. Q/E still shift forward gears only; reverse cannot use nitro or blow the engine. Steering, rear contacts, wheel motion, sound, dirt spray and ghost recordings account for direction.
- Reverse verification: 446 non-campaign core checks, 241 reverse driving/input checks and 18 presentation checks pass, plus focused audio, effects, ghost, NPC, reward and challenge suites. Existing F42/Heritage input-only forward replays remain identical at 30/144 FPS. Production and QA builds pass; the server now serves `index-mwTQ9czz.js`. See the latest `VERIFICATION.md` section for scope. Test commands now total 75; no new full campaign matrix is claimed.
- Follow-up after `2a36b47`: keep all redesigned vehicles. The requested rollback was cancelled and fully reversed; the six original models, builders and exports still match that commit. The previous F42 body is now a separate 1,800 CR unlock, **Falcone Heritage**, with the F42's stock handling and engine voice. It uses the retained licensed concept model's sport trim; Aurora keeps its GT trim. Each has separate ownership, upgrades, paint, records and ghosts. Existing saves do not receive the new unlock automatically.
- Near misses now require less than 6.4 m lateral separation, tightened from 7.2 m. Collision dimensions and the 65 mph minimum are unchanged. Boundary checks pass at 6.39 m and reject 6.4 m or wider.
- The follow-up passes 443 non-campaign core checks, 95 Heritage driving checks (four complete races), 47 driving-reward checks and focused progression, model, grounding, audio, readiness, ghost and settings suites. Production and QA builds pass. The package now contains 73 commands; the entire chain was not rerun for this bounded follow-up. See `VERIFICATION.md`.
- The live production server now serves `index-COmGH8FU.js` at the unchanged `http://localhost:5174/` address. The existing tab was at the menu with Spikyferns, 0 CR and Viper selected before refresh. Its loaded script confirms the new build; the user then began a race, which was left untouched. No live purchase or account edit was made in this follow-up.
- Spikyferns' earlier requested account grant unlocked and fully upgraded the then-existing seven cars and their paints. The rejected billion-credit grant was removed, restoring the prior 0 CR balance. A subsequent explicit request also granted Heritage, all seven level-three upgrades and all three paints, without changing the 0 CR balance or other data. Its temporary maintenance page was removed; the pre-grant browser-local backup remains. The reverse follow-up makes no account edits.
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

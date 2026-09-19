# Remake verification

Checkpoint: 19 September 2026. The latest vehicle, reward and route iteration is described first. All later sections preserve earlier checkpoints; their counts and screenshots do not describe the latest geometry.

## Heritage unlock and tighter near misses — latest follow-up

All six redesigned original vehicles remain unchanged from `2a36b47`; the cancelled rollback was fully reversed. A read-only Git-filtered blob audit confirmed the builders, six exports, both manifests, exporters and licensed source still match. Falcone Heritage adds the earlier F42 sport body as an independent 1,800 CR unlock. It shares the existing licensed source import with Aurora but not its GT trim. No duplicate asset was added.

Focused verification passes:

- Core: 443 checks with expensive campaign matrices skipped.
- Heritage driving: 95 checks, including four complete input-only Medium Time Trial races at 30/144 FPS. Stock F42 and Heritage each finished in 105.67 seconds with zero crashes and identical full per-step motion/control/damage/timing signatures. Their bests, leaderboard rows, ghosts, ownership and saved setups remain separate.
- Driving rewards: 47 checks. Near misses score at 6.39 m but not at 6.4 m or wider; the unchanged 65 mph minimum and collision rejection still apply. Police fines: 225; Busted/quit flows: 249.
- Progression: 27 groups; App progression: 92; paint presets: 79; paint App flows: 35; saved settings: 42.
- Model routing: 107; paint: 1,906; grounding: 4,398, within −4.02 to +4.19 cm. Readiness: 63; ghosts: 76; ghost vehicle ownership/cleanup: 395; completion UI: 72.
- Audio: 310 checks and 348,686 finite automation commands across eight cars. F42/Heritage engine behavior matches for recorded and fallback sound across all three cameras. This is not a new human listening review.

Memory-only browser QA confirmed the real garage purchase reduced 2,000 CR to 200 CR, the old F42 body appeared as Heritage, and normal race startup worked without observed console errors. The fixture toolbar now collapses after choosing a test to avoid covering game buttons. Real career storage was not used for these tests.

Production and QA builds pass, with the existing approximately 937 kB rendering-chunk warning. The live server responds with `index-COmGH8FU.js`; the same bundle was confirmed in the existing Chrome tab after a menu-only refresh. The user subsequently began a race, which was left untouched. The package now registers 73 test commands. This follow-up used focused suites, not a complete rerun of all 73 commands; the preceding complete 72-command checkpoint is below.

## Bank protection and player settings — current rule

The user clarified that quitting must forfeit only current-race earnings. This replaces the intermediate police-fine/quit policy described in the historical subsection below. Quitting, restarting or reopening an unfinished race now settles it with zero payout and zero debit. Prior completed stages remain banked. Police fines accrue against positive net earnings from the current race and cannot create debt or take saved credits.

Each player now stores an independent last-used race setup, including event, mode, CPU, transmission, car and route. Graphics quality remains device-wide. The live server now serves the updated production build at `http://localhost:5174/`. The browser still shows the three existing player names and the same selected-player balance. The selected 959 persists across reload. Human play-test acceptance is required before retiring the duplicate checkout; see `SERVER_CUTOVER.md`.

One uninterrupted final `npm test` run passed all 72 commands with `DUEL_SKIP_CAMPAIGNS=1`: 443 core checks plus all 71 remaining suites. Only the expensive core campaign matrices were skipped in this final run; their earlier 60 campaigns / 180 stage wins are recorded below. The other suites still ran their full driving replays, physics and geometry checks.

Focused checks pass: 225 police-fine checks, 249 Busted/quit/App/UI checks and 42 player-settings checks. They cover quit, restart, reload, repeated tickets, stale finish events, retained completed-stage credits, real loss settlement, menu restoration, challenge ownership, legacy migration and unavailable storage. The package registers 72 test commands.

Memory-only browser QA confirmed Busted → Main menu → Leave race keeps the wallet at 2,000 CR throughout. Switching Alpine Manual → Harbor Auto → Alpine Manual restored distinct circuit, car, mode, CPU, transmission and route controls, including Golden hour on the day route. No browser errors were observed. These fixtures never access the user's real career storage.

The final production and QA builds pass. The existing rendering-chunk warning remains (about 937 kB minified, 284 kB compressed). A fresh read-only export audit confirms all six original GLBs and both manifests match their builders byte-for-byte. Retired asset names occur only in retirement notes, not live code or build scripts.

## Earlier Busted → quit diagnosis — policy superseded

The existing confirmed-quit loss charge passed diagnosis; the displayed 150 police fine was never debited. Catches now save that credit deduction immediately, independently of the later race-loss charge. Unique saved ticket identities prevent duplicate charges, including after reload and after a zero-balance catch. Deadline-causing catches settle the fine before the timeout loss.

Focused checks: 157 fine settlement checks, 163 actual App/UI flow checks, 25 progression groups, 92 progression App checks, 72 completion-screen checks and 44 driving-reward checks pass. The package now registers 71 test commands. Browser QA used only the memory-backed reward fixture: Medium wallet 2,000 → 1,850 on Busted → 1,350 after Main menu / Leave race. No console errors were observed. A read-only source check confirmed the user's `localhost:5174` server still serves code without this fix; its live race and saved careers were not changed.

The non-campaign core rerun passes 443 checks. Race integrity44, police route reset3 and layout archives65 also pass. Production and QA builds pass, with the existing rendering-chunk size warning; `git diff --check` is clean.

## Latest vehicle, reward and route iteration

Validation was completed in separate runs, not one uninterrupted green `npm test`. The long core run passed both campaign matrices, including 60 completed campaigns, 180/180 stage wins and frame-rate comparisons. Its one failure came from an old shoulder-recovery fixture colliding with real traffic on a new bend. That fixture now isolates recovery in Time Trial. The rerun with `DUEL_SKIP_CAMPAIGNS=1` passed all 443 non-campaign checks. The unchanged expensive matrices were not repeated.

- The package now registers 69 test commands. The remaining suites were run in batches; five old geometry/reward fixtures failed initially, were investigated and corrected, then passed on rerun. Collision clearance and rendered-ground checks remain strict.
- Driving rewards: 44 checks cover the larger near-miss zone, unchanged collision/speed limits, Manual multipliers, police escapes at ordinary and chase finishes, duplicate protection, two-crash repairs, clean-run evidence and losses.
- Progression: 25 groups and 92 App assertions cover comparable bests, first-run baselines, repeated stage improvements, police credit awards, Manual earnings and failed stunt objectives. Failed challenge objectives cannot set bests or receive finish-related bonuses.
- Layout archives: 65 checks prove layout-3 records and complete ghost samples survive load/save/merge after the move to layout 4. Current rankings, ghost selection and direct playback exclude old geometry. Drift leaderboard compatibility passes 33 checks; ghost material ownership and cleanup pass 395. Active ghosts retain the 12-record/1.25 MB limit; archives remain separate. If browser storage fills, saving reports failure without replacing prior stored data.
- Vehicle routing: 76 checks; separate classic bodies: 196; paint and surface decals: 1,637; actual vehicle grounding: 3,837. Grounding samples stayed within −4.02 to +4.19 cm across the measured crests. The isolated incline test still verifies yaw-first wheel fitting independently.
- Natural circuits: 44,409 checks, maximum road grade 14.9%. Route variations: 1,866,146 checks, including 1,738,521 clear Titan-width sweeps. Wide shortcuts: 93 branches across 63 layouts, 2,406,819 clear hull sweeps and at least 3.09% 3D distance saving. Twenty input-only branch replays saved 2.41–12.15% with no hits, resets or off-surface time.
- Terrain: 872,619 checks across nine events and four seeds; station foundation error 0.0000 m. Mountains: 148,233 checks, 18,048 clear road/branch rays, unchanged collision footprints. Exact presets: 222 checks including all 15 fresh solver comparisons. Terrain materials: 15,121 checks.
- Desert grounding: 441,087 checks across 1,140 cacti and 798 rock colliders. Cactus burial is now measured against the actual rendered triangles and remains 0.296–0.338 m. Landscape cells: 314,376 checks; exact polyline integration: 7,598 checks with independent full-scan equality retained.
- Audio retains the preceding recorded engine/tire mix: 248 checks and 301,448 finite automation commands passed. No new human listening review is claimed here.

Browser review used isolated ports 5176/5177. The vehicle showroom uses no career data. Its final pass confirmed distinct starter silhouettes in neutral paint, fitted 959 lamps and rear grille, unobstructed rally lamps and clean livery edges. Damage and wheel/driver hooks remain automated checks. These are original stylized models, not exact licensed replicas of the references.

The real App reward screen was tested through scripted finish fixtures backed only by page-local memory: a first Medium/Auto finish showed its baseline and 1,300 CR; the comparable improvement showed 1,550 CR; a clean Manual win showed 2,800 CR; a three-hit Manual win showed 3,000 CR, no clean bonus, and two repairs/two refilled slots. These are settlement fixtures, not claims of human-driven races. No real wallet or port 5174 storage was changed.

The latest mountain silhouette and slope-sensitive meadow/soil/rock shading were reviewed in the browser. A shader compile issue found during review was fixed; the final scene and car viewer reported no console errors. First-frame compilation can still pause for seconds, and point FPS samples are not a hardware performance guarantee.

Retired `cinder-gt.glb`, `desert-service-station.glb` and their unused exporter scripts were removed; they remain recoverable from Git. The licensed Aurora asset and live procedural stations remain.

Final `npm run build`, `npm run qa:build` and `git diff --check` pass. Vite still warns about the roughly 938 kB minified rendering chunk (284 kB compressed). A read-only asset audit found no live references to the retired files and verified all 332 meshes in the six original GLB exports against their current builders. The actual game menu selected Stuttgart from the synchronous classic source and rendered its new body without console errors.

## Complete checkpoint

- Gameplay:464 checks passed;60 completed three-stage campaigns,180/180 stage wins, no catastrophic outcomes in that deterministic matrix.
- Progression:20 groups; App persistence, ownership and interrupted-race integration:70 assertions.
- Terrain:622034 checks across seven events and four seeds. Station foundations had 0.0000 m maximum error. Actual rendered terrain kept mountain rims at least 3.98 m buried. The audit included 281725 far-triangle queries and 1859 near-strip hits for omitted far quads.
- Circuits:33921 checks, with a 14.9% maximum road grade. Shortcuts:59 branches across 45 layouts,1449561 clear Titan hull sweeps,3.03% minimum 3D distance saving.
- Prepared gravel:29 pace, nitro, upgrade, NPC and route-boundary checks. Driving effects:27 terrain, airborne, landing, crush and pool checks.
- Audio:209 checks and 162916 finite automation commands. Actual source/runtime PCM was decoded and measured. Worst six-second mixed-envelope variation was 5.99dB across the tested band transitions and seven car voices.
- Map:77 projection/branch/cache checks. Arena props:29 deformation/bounds/reset checks. Rally detail:22700 checks, visible rut clearance 9.7–13.0 mm, terrain at least 34.1 mm under the driving mesh.
- Mountain geometry:133388 checks and 12642 clear road/branch rays. Camera clearance:176 roof/portal/damping checks. Furniture:243037 assertions and 219294 clear Titan hull sweeps; tunnel rock has at least 1.87 m of cover around every collidable cell.
- Ghost recording:76 assertions; ghost vehicle material ownership/cleanup:332 checks. Terrain style:10228 continuity/vertex checks.
- Titan Stunt Trial:44 checks. Independent input-driven Hard trial replays matched at 30/144 FPS:50.45 s Auto and 50.44 s Manual, six landings and five crushes. App demo runs on Easy/Medium/Hard each finished in 49.68 s.
- Driving milestones:89 assertions covering one-time awards, player isolation, persistence and actual stunt finishes.

Separate later tunnel-detail tests passed 28620 checks, with overlay triangles no farther than 0.094 mm from the existing lining. Roof geometry remained unchanged. Their 176 camera checks also passed.

The input-only shortcut pace audit is separate from distance and collision clearance. Primary seeds 1989/42 across all five non-arena events produced 3.02–12.48% clean segment savings, with no crashes, resets or off-route time. Harbor seed 20 gave 2.73–2.93%; see `SHORTCUT_PACE_AUDIT.md`. These are driver-model measurements, not a guarantee for every human line.

## Browser evidence

Tests used the isolated local QA origin on port 5175. No purchase or race commands were sent to the user's port 5174 origin.

- Actual UI Pacific races completed older layout 1 in 1:42.05 and layout 2 in 1:47.10. Each earned 660 CR, and the local leaderboard recorded the appropriate layout. Those times are not comparable across route revisions.
- Circuit QA and Player 1 remained separate. Player 1 retained 50 CR and its level-one engine and tires.
- A later Time Trial recorded 1:46.21 and saved a ghost. The ghost survived reload and visibly pulled away from a stationary player. Abandoning that replay charged 300 CR once and preserved the saved ghost.
- A funded Garage QA fixture tested the real purchase flow:40000 CR minus the 12000 CR Titan price left 28000 CR and opened both arena events. The real-UI Hard stunt run finished in 49.68 s with six landings and five crushes. It earned 3000 CR:1500 base,150 clean,450 jumps,300 crushing,100 Clean debut and 500 Arena show. The wallet became 31000 CR.
- The wide tunnel camera stayed under the roof; generated concrete and flush service details rendered correctly. The arena physics preview flattened a salvage car without a major crash. Generated crowd cutouts and coastal waves rendered with no observed shader errors.
- The HUD map was readable at 1280×720 and did not cover the car or speedometer. Stunt objectives and bonus details fit the result screen.
- Point samples on this host were about 56–57 FPS. Dense city after batching and later route changes: about 6.80 M submitted triangles; coast 3.76 M; stadium crowd 0.82 M. Counts include shadow passes. These are snapshots, not a minimum frame-rate or hardware guarantee.
- All 11 runtime audio assets decoded and Web Audio reached the running state. No independent human listening review is claimed.

## Later integrations

- Paint catalog, renderer helper and App integration passed 76, 2,410 and 35 checks. The actual garage bought Copper Metallic for 250 credits, kept it through a reload, then bought Glacier Satin for 400 credits. Both visibly changed the detailed car. Factory restoration and race snapshots passed the automated checks.
- High graphics adds edge smoothing and 2,048-pixel shadows. Performance disables the extra shading and smoothing passes and uses 1,024-pixel shadows. City samples were 56 FPS in both modes, with about 6.80 million and 3.47 million submitted triangles respectively. These are point samples.
- CPU route strategy passed 17,018 checks. Four complete Medium/Hard races matched at 30 and 144 FPS. Useful branch replays saved 0.73–1.75 seconds through physical motion. The stale police target regression passed three checks after its fix.
- Recovery integrity passed 44 checks. The reproduced lap-line bug is fixed; repeated jumps do not duplicate rewards, and chase deadlines settle once.
- Route choices passed 1,768,977 geometry assertions, including 1,651,293 clear Titan-width sweeps across 12 natural layouts. The closest two shapes still differ by 11.82 m RMS after alignment. App integration passed 68 checks, including actual two-lap runs on all three choices and separate records, leaderboards and ghosts.
- Desert detail passed 340,471 checks. Across nine scenes, 874 cacti were grounded against rendered terrain and 608 rock transforms kept their original collision footprints. Visible cactus heights range from 0.94 to 4.25 m.
- Generated cloud density and granite cliff textures are integrated. The sky and scene light now share one sun direction. The cloud deck compiled and rendered in the coastal scene without observed errors.
- A real browser Time Trial on Pacific Route B finished in 1:45.38, awarded 660 credits and saved a separate ghost. Its best time and ghost appeared in the menu on return. Garage QA held 31,010 credits after this run and the two paint purchases.

The later combined checkpoint completed logically across `.qa-checkpoint.log` and `.qa-checkpoint-rest.log`. Its 60 campaigns passed. A coastal recovery fixture was corrected to mark gates before teleporting the player; the unchanged production fix then passed 622,058 terrain checks. The course-preview assertion was corrected for singular “shortcut” and passed all 93 checks. All intervening suites passed.

## Eighth event and latest graphics

- Neon Drift Trial: 435 focused gameplay, 152 trial, 46 scoring, 44 recovery, 38,437 circuit and 755,534 terrain checks passed across eight events. Actual App inputs finish the unmodified city route in 99.38 seconds with 6,319 banked points. Easy/Medium/Hard targets are 3,500/5,000/6,000; deadlines are 150/125/110 seconds. A real crash produces 110.13 seconds and 5,899 points: Easy and Medium win, Hard times out. Independent 30/144 FPS input runs match.
- Drift App integration passed 98 checks, including failed score goals, deadline losses, restart/reload settlement, player isolation and a 15% performance-bonus cap. Failed goals cannot set best times, leaderboard records or ghosts. Time records for normal completed race losses remain eligible.
- City interiors passed 548,422 checks; the shader adds perspective rooms without changing building footprints. A browser close-up showed shelves, counters and room surfaces with no observed errors.
- Vegetation grouping passed 35,713 checks for 3,791 exact part instances. Harbor building grouping and hidden-window removal passed 19,327 checks, including a legacy-window fallback fixture. These reduce submission without deleting visible scenery.
- Three new CC0 ambience loops passed 240 PCM/automation checks with 177,736 finite audio commands. The old engine envelope remains at 5.99 dB worst tested six-second variation. Engine samples and ambience both reached ready in the browser.
- City paint placement passed 5,772 checks and 2,880 ray samples. Crosswalks and stop bars now sit 22.6–27.4 mm above actual asphalt, instead of below it.
- Current coastal point sample at canonical seed 1989: 56 FPS, 627 draws, 3.05 million submitted triangles in High. This includes shadow and shading passes. It is a point sample, not a hardware performance guarantee.

Score-first drift board passed 30 checks; the updated App suite passed 101. A second real-UI Hard run finished in 99.38 seconds with 6,319 points and a 798-point best chain. The visible leaderboard showed 6,319 PTS, target 6,000, Hard/Auto and stock upgrades. Each QA Hard win earned 1,950 credits, including its existing win streak; Garage QA reached 29,910 credits after buying the Banshee and winning twice.

Road materials passed 71,948 checks. Browser QA caught bright night-time wheel bands; night roughness polish was removed and the corrected city asphalt was reviewed. The skyline passed 692,828 checks; 96 towers remain at least 117.27 m from driving surfaces and their foundations are at least 1.20 m below rendered ground. Local lamp pools and restored crosswalks rendered without observed shader errors. A city point sample held 57 FPS with 5.14 million submitted triangles in High.

Landscape cells passed 313,575 checks across 47,927 unchanged instances. Modeled total camera/AO/shadow submissions fell 61.9%, though draws increase and hardware timing still matters. Chevron cells passed 50,146 checks; the largest packed world-vertex difference was 0.061 mm, and sampled draws fell from 702 to 200.

Retained environment behavior passed 112 checks: keys, chicken/crush resets, effect cleanup and shared/private resource disposal. Actual menu→race retained world build count 2 instead of rebuilding the same scenery. The root renderer also disposes its sun shadow and clears its owned debug reference; App/HMR teardown subsequently passed eight checks.

Generated `tire-smoke.png` is 1254×1254 RGBA with real transparency (alpha 0–254). Existing effects regression passed 27 checks after adding separate gray rubber smoke. Later driving visual QA confirmed soft neutral wisps; see the final integration entry.

## Nine-event checkpoint

The combined nine-event run passed in two consecutive portions: `.qa-nine-event.log` through road furniture and `.qa-nine-event-rest.log` from prepared surfaces onward. The first run found an old synthetic rally fixture missing `def.offroad`; matching the real event definition corrected it. No driving rule was weakened. The resumed chain exited successfully. Later route-load presets and parked-city detail are separate follow-up work.

- Main simulation: 481 passed, zero failed; 60 completed campaigns and zero catastrophic outcomes in that matrix.
- Terrain: 869,098 checks over nine events/four seeds; circuit geometry: 44,321; shortcuts: 86 branches across 63 circuits with 2,172,162 clear obstacle sweeps. Maximum grade remains 14.9%.
- Timberline Checkpoint Rush: 457 trial checks and 80 App/reward checks. Twenty-four input replays match across frame rates: Auto 101.68 seconds, Manual 101.65, 12/12 gates, zero hits/resets. The Hard clock retains at least 8.49 seconds before each successful gate. A crash-delayed Easy run succeeds; tighter timers correctly fail it.
- Gate rendering: 19,943 checks and 1,656 actual road-triangle rays. Minimum banner underside clearance is 5.328 m; numbering faces approaching drivers, physical posts match the model, and two-lap signals update correctly.
- Actual QA UI: Dusthawk purchase cost 3,500 credits (29,910→26,410). The Hard checkpoint run finished in 1:41.68 with 12/12 gates and no misses, paid 1,950 credits, and the menu showed its car best and 28,360-credit wallet.
- Tire smoke: 74 checks, including 31 live particles after 0.75 seconds at each of 30/60/144 FPS, terrain/airborne suppression, reset, bounded pools, real sprite alpha and single texture disposal.
- Chicken pool: 35,660 checks. Across 28 populated course views, 17% of source birds were submitted on average, reducing chicken triangles by 83%. All physical flocks, colors, scatter and pickup/restart states remain present. Retained-environment checks now pass 119; App teardown passes eight.
- Exact polyline lookup: 59,133 helper checks and 69,715 Course checks, plus 7,571 terrain-integration checks. Full positions, geometry buffers, mountain transforms and skyline foundations match the original scans. Local query benchmarks improve roughly 1.6–4.7× depending on workload; these are CPU microbenchmarks.
- Weathered sidewalk: 37,676 checks cover 1,044 strips, 1,044 curb faces and 64 cell joins. Two-metre texture coordinates remain continuous; station and shortcut access stays open. City interior checks remain 548,422; changed sidewalk joint batching lowers total detail draws to 206 Harbor / 361 Chase without adding glass draws.

The city concrete/curbs were reviewed in the browser. First GPU frame timing varies substantially under parallel testing; world-build and first-frame times are now displayed in the QA fixture so future profiling can separate CPU geometry work from GPU compilation.

## Final route, lighting and detail integration

The fresh core run passes 481 checks with 60 complete campaigns, 180/180 stage wins and no catastrophic outcomes in that matrix. All 64 other current suites pass in `.qa-final-rest.log`: the first 58 finished in 238.7 seconds, followed by warmup, readiness, meadow-material, completion-screen, pine-material and vehicle-grounding checks. Later bark and parked-glass corrections reran their affected suites. No fixture or production fix was required in this final run.

- Exact shortcut presets: 222 checks with `--verify-solvers`, including all 15 solver comparisons. `npm run assets:routes -- --check` passes. The normal 177-check suite covers cloning, invalidation and custom-seed fallback. Cold default constructors sampled at 57–118 ms instead of 701–1,801 ms; unchanged physical geometry is checked independently.
- City parking: the final fitted-glass version passes 424,213 placement/geometry checks, with 179,952 transformed vertices inside colliders, 143,630 Titan clearance sweeps and 42 gameplay checks. The earlier 438,481-check version used more box vertices; replacing those with fitted glass quads reduces geometry. Harbor has 10 cars; Chase and Drift have 18. Player, rival and police all hit solid parked cars. Six actual App city runs finish with no unintended hits or resets.
- Cosmetic city relocation: 3,770,694 checks. Of 18,954 cosmetic instances, 4,706 moved away from sidewalks/driving corridors; none were removed. Non-city instances and physical transforms are unchanged.
- Daylight choices: 2,666 lighting checks and 135 App checks. Clear, Golden hour and Overcast produce identical 1,084-sample trajectories, rewards and ghosts in the same 105.38-second Time Trial. Night and tunnel constraints remain active. Browser menu selection, persistent Golden hour on reload, disabled Night event selection, golden coast and overcast pass were reviewed.
- Meadow material: 323 focused checks and 313,578 landscape checks. The original transparent grass image, geometry, placement and wind are retained. Cooler tint, soft root shading and mostly upward diffuse normals remove the glaring folded-card appearance. Front/back lighting is consistent; close-up browser review passed.
- Pine material: 1,725 focused checks and 47,441 vegetation checks across 4,984 unchanged instances. Smooth radial/upward crown normals retain depth with consistent front/back lighting; the generated bark map adds color and subtle bump to unchanged trunks. The browser crown close-up shows a darker evergreen canopy.
- Standalone completion: 72 checks. Garage events use their actual name, settled reward, precise time and objective metrics after final navigation. Campaign-only geography and lives no longer appear on a city escape or other standalone event. Three-stage campaign results are unchanged.
- Tire effects: 160 checks. Road contact now uses the same visible-surface sampler as the car, preventing raised marks where a shortcut approach flattens roadside relief. Tire marks connect actual ground contacts at 30/60/144 FPS and restart cleanly after release or reset. Neutral generated smoke and continuous tracks were reviewed in the city drift fixture.
- Experimental shader preparation: 132 controller, 63 readiness, eight App lifecycle and 119 retained-renderer checks pass. `?warmup=1` requires parallel shader compilation; default stays off. It restores the render target, prevents simulation advancement before the first drawn frame and defers resource disposal safely.

Browser timing samples from the same QA sequence are exploratory, not a controlled benchmark. With warmup off, first composer calls took 2,184 ms at menu, 1,248 ms in Alpine and 1,370 ms in City. With warmup on they took 592/131/223 ms, plus submission of 40/236/152 ms and asynchronous waits of 174/989/119 ms. Shader caches and driver scheduling affect these figures. Warmup does not cover every shadow, post-processing, texture upload or geometry upload cost; do not describe it as eliminating loading pauses.

Two actual browser Hard chases with optional shader warmup each finish in 99.68 seconds. The first earns 2,300 credits including the one-time Night Escape milestone; the repeat earns 1,950. The corrected final screen shows CITY ESCAPED, the exact time, 2/2 laps and settled credits. Returning to the menu shows 32,610 credits and the correct car best.

The final tire-grounding correction passes 3,665 checks using all seven actual vehicle models and rendered asphalt, gravel and shortcut triangles. Intact tire bases and rolling radii are measured once; the whole car moves together and road pitch/roll use yaw-first orientation. The steep Ridge Rally s=2168 Titan contacts improve from roughly −40 to +40 cm to 0.91–1.03 cm. Browser views of Titan and the imported Falcone confirm grounded tires and intact bodies. Other sampled crests retain −4.0 to +6.5 cm variation because this remains a rigid visual chassis. All actual model bodies remain over 5 cm above their tire plane. Paint 2,410 and effects 160 checks pass after integration; airborne displacement and damage reset remain intact.

Final `npm run build`, `npm run qa:build` and `git diff --check` pass. The release contains the new bark and packaged license; the QA controls are excluded. Vite reports its known renderer chunk-size warning (about 917 kB minified / 278 kB gzip). No new runtime dependencies were added. Latest inspected QA browser logs contained no warnings/errors after 10:00 UTC. Temporary QA tabs were closed at the 5% quota stop.

The packaged asset audit resolves all runtime URLs and confirms self-contained GLBs. It restored the unmodified upstream `LicenseRef-LegalMark-Khronos.txt` under `public/LICENSES/`, fixing two broken relative links in the model license. Original/source audio, generated textures and route presets are included in the normal build.

## Assets and limits

Seven garage vehicles and nine two-lap events are implemented. Generated modeling references and material maps support the scene work. Source licenses and generated prompts remain documented in the asset folders and `IMAGE_PROMPTS.md`.

The engine/tire files are real licensed recordings. Seven voices mix shared recordings; they are not seven independently recorded cars. Police wails, impacts, salvage-car crunches and several other cues are original synthesis.

No new runtime dependency was installed. The game uses Three.js, Web Audio and the browser Gamepad API. GLBs were exported and reloaded, but no Blender render was performed. Blender was not found on PATH, in the checked registered installations or as a running process. Native release, Unreal migration, mobile controls and broad hardware testing are not claimed. Driving remains arcade drift and bounded visual damage, not soft-body simulation or an open-world GTA game.

## Audio depth continuation

The post-checkpoint audio pass uses the existing licensed recordings and adds filtered exhaust-body and intake paths, car-specific balance, a smooth recorded-load gear-change envelope, camera-aware hood/chase/wide perspective, a normal-driving asphalt tire bed and a stable fade into the recorded squeal. It also lowers the in-race synthesized sequencer so vehicle cues remain dominant. No source asset, licence, runtime dependency, handling rule, event, reward or save format changed.

Validation passes 248 focused audio/PCM checks with 301,448 finite Web Audio automation commands, 70 App/progression integration assertions, and the unchanged 481-check core simulation with 60 complete campaigns and 180/180 stage wins. Production and QA builds pass with only the existing renderer chunk-size warning. Browser QA on isolated port 5176 reported `Audio running · samples ready · ambience ready` in Pacific Canyon Circuit, Midnight Muscle Chase and Neon Drift Trial; the inspected browser log had no warnings or errors. This is browser decoding and runtime evidence, not a substitute for human listening on headphones and speakers.

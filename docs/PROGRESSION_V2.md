# Local players, garage and race rewards

Each named player has a separate wallet, garage, upgrades, specialist drivers, courses, race history and personal bests. Players on this computer share a leaderboard. The menu selects the player, circuit, car, driver, CPU difficulty and transmission before a race starts.

## Each player's race setup

The last selected event, car, challenge mode, CPU difficulty, transmission, route, daylight mood and ghost preference are saved in that player's `raceSettings`. Switching players or reopening the game restores those choices. Menu changes save without requiring the player to start a race. Graphics quality stays browser-wide because it is a device performance setting.

Events are stored by stable ID. Loading checks course and car ownership and event rules, so locked selections fall back safely and objective events keep their required mode. Courses do not require a particular car. Existing profiles without individual settings adopt the earlier browser-wide route, lighting and ghost preferences once; settings that the old version never saved cannot be recovered. Newly created players start with the normal defaults, not the previous player's setup. These preferences do not change the wallet, upgrades, records or an active race's copied settings.

## Course entry

Every owned car can enter any unlocked course: fifteen races and the new Titan Freestyle Playground. Pacific Canyon is included. The other fifteen courses cost 900–2,200 earned credits; see [course prices and migration](COURSE_ACCESS.md). Buying unlocks without selecting, and selecting preserves the chosen car. Course entry grants no vehicles or rewards. The `requiredCar` metadata means a recommendation, not a restriction. These rules supersede compulsory-car entry and unrestricted free-course access in older documents.

Course purchases and selections are menu-only and saved per player in `profile.courses`. App start and next-stage checks enforce ownership, independently of the UI. A campaign may start on free Pacific, bank its completed reward, then stop before a locked next circuit. The result offers a menu link to buy that course; no purchase or paid-course entry occurs within the active run.

Existing saves keep evidence-backed access from completed history, personal bests, circuit wins and valid active races. Older Dusthawk, Banshee and Titan purchases also retain their previously included special events. A menu selection alone does not grant access, and neither the new circuit group nor practice is granted wholesale. This migration changes no wallet balance, vehicle ownership or records.

The original three circuits remain the campaign. The six earlier special events and six new circuits run separately. The new circuits are Eifel Crown, Alpine Serpent, Azure Riviera, Red Mesa Corkscrew, Neon Docks Circuit and Cloudbreak Skyway. They use `kind: 'circuit'`, with ordinary rival or Time Trial choices. See [the course expansion](COURSE_EXPANSION.md) for layouts and landmarks.

Special-event modes, deadlines and objective targets remain mandatory. Titan is recommended for arena and stunt events: lighter cars can enter but cannot crush wrecks under the existing mass rules. They therefore cannot meet the Stunt Trial's four-crush objective. The menu explains the target and warning before starting; it does not force a different car.

Titan Freestyle Playground costs 900 CR. After unlocking, it is untimed practice with no rival, laps, finish, credits, milestones, personal bests, leaderboard or ghosts. Driving, crash recovery, restart, exit and reload leave the career balance, history and win streak unchanged. Practice writes no active-race marker and cannot settle as a race result. The HUD says **Free practice**; its height, horizontal jump distance and airborne duration are measurements only.

## Police fines

Each catch adds the configured 150-credit fine against the current race's earnings. It does not debit the saved wallet. The Busted screen uses the same CR unit as the garage and explains that saved credits are protected. At a finish, the total fine is capped at the positive net race payout, so it cannot deepen a race loss or create debt.

Each catch has a saved `runId:stageIndex:ticketIndex` identity. A repeated event cannot add the same fine again. Separate catches in the city pursuit each carry a fine. CPU difficulty and Manual do not multiply fines. A catch that expires the pursuit clock records its fine before the ordinary loss is settled. Quitting, restarting or reloading forfeits the unfinished race's earnings and clears its pending fines, leaving saved credits untouched. Existing historical fine IDs remain saved but are not reconstructed into new charges or refunds.

`tools/test-police-fines.mjs` covers arithmetic, duplicates, serialization and migration. `tools/test-busted-quit.mjs` covers actual App, physical catch, quit/restart/reload, timeout, player-isolation and production-modal checks. If browser storage is unavailable, pending progress lasts for the current session and the Busted screen warns about it.

## Garage

| Car | Price | Recommended events |
| --- | ---: | --- |
| Falcone F42 | Free | — |
| Stuttgart 959-S | Free | — |
| Falcone Heritage | 1,800 CR | — |
| Aurora GTR | 2,200 CR | — |
| Dusthawk Rally | 3,500 CR | Ridge Rally, Timberline Checkpoint Rush |
| Banshee Muscle | 5,000 CR | Midnight Muscle Chase, Neon Drift Trial |
| Viper Prototype | 7,500 CR | — |
| Titan Monster | 12,000 CR | Titan Monster Arena, Titan Stunt Trial |

There are eight cars: two included starters and six earnable unlocks. Falcone Heritage brings back the previous F42 body as a separate 1,800-credit purchase; the redesigned F42 and Stuttgart remain unchanged. Heritage keeps the F42's driving statistics, five-speed gearbox and factory colors. It has its own upgrades, paint ownership and car records. Existing saves keep their credits, seven-car ownership, settings and records; Heritage starts locked until purchased, including for a previously maxed-out garage.

Each car has engine, nitro, handling, tires, brakes, suspension and nitro tank upgrades. Each upgrade has three levels, costing 350, 600 and 950 credits. Purchases apply to that car only. A race takes a copy of the selected car's upgrades, so its performance cannot change during the race.

The garage shows acceleration, road grip, braking and loose-surface pace for owned and locked cars. Ratings use one scale across the garage and include installed upgrades and the selected driver's matching skills. The menu keeps the selected car visible with a single car picker.

The garage also offers three paint finishes. **Factory** is free and restores that model's original material. **Copper Metallic** costs **250 CR** and **Glacier Satin** costs **400 CR**. Each purchase belongs to that local player and that car. Buying equips the finish immediately; switching between owned finishes is free. The car must be unlocked first. These finishes change body paint only, with no speed, handling, reward, leaderboard-key or personal-best-key changes. Existing trim, stripes, glass, wheels, lights and carbon parts keep their original appearance.

Paint is stored in `profile.cosmetics[car]` as known owned IDs and the selected ID. Old profiles default to Factory. Unknown cars and finish IDs are discarded during normalization, duplicates are removed, and an unowned selection returns to Factory. Purchase/apply actions are menu-only and refresh the saved wallet before charging. Repeating a purchase for an owned finish is a free apply, preventing duplicate charges from a stale button. If browser storage is blocked, ownership and selection remain available in the current session.

`app.getPaintPreset(carKey, {menu})` provides the renderer a stable appearance descriptor or null for Factory. The menu reads the current local player's equipped finish. Starting or restarting a race snapshots that finish; campaign stage changes keep the snapshot, and later profile/storage changes cannot repaint the active car. The renderer applies only the private player-body material and updates its damage-reset baseline so paint survives wear updates. Restoring Factory uses the vehicle's captured original finish rather than one shared approximation.

The menu's High / Performance selector controls ambient contact shading. High is the default. The choice saves as `duel_graphics_quality` for the browser, so changing local players keeps the same graphics preference.

Any course with `kind` is a standalone event. Recommended-event links are shortcuts, not vehicle locks. Chase mode forces the pursuit objective; it is not a time trial or a rival duel.

Titan Stunt Trial also forces its own objective mode, with no rival or Time Trial ghost. It requires both laps, four landed jumps and four player crushes within 95 seconds on Easy, 75 on Medium, or 62 on Hard. Setup states these targets before starting; the HUD shows progress and time left. Finishing the laps without the targets is a completed loss. Running out of time is a DNF. The result distinguishes those outcomes from a pursuit timeout. The demo driver targets uncrushed props through normal steering input and skips its ordinary deliberate shoulder excursion in this timed objective.

Stunt results must prove the configured jump and crush counts, a known car, complete laps, successful objective and deadline before saving a car best or leaderboard row. A faster two-lap run with missed stunt goals cannot earn car-best, police, Manual or milestone credits. New stunt leaderboard rows retain jump/crush evidence and validate it on reload. Earlier rows lack that evidence and are retained without inventing it; this change does not erase old careers or reclaim historical credits. Regression checks reproduce the failed Hard trial at 50 seconds and a faster failed attempt after a valid 55-second record.

## Specialist drivers

Club Driver is included and changes no stats. Six fictional specialists cost 1,200–2,200 earned credits. Each has a bounded, car-specific skill: 2–6% more acceleration, grip, braking or loose-surface grip. See [driver prices, matching cars and exact skills](DRIVERS.md).

Buying a specialist unlocks them without selecting them. Selecting an owned driver is free. Both actions are menu-only; repeating a purchase cannot charge twice. Ownership and selection are saved per player in `profile.drivers`. Existing profiles start with only Club Driver, retaining their credits, garage, settings and records. No specialists or credits are gifted during migration.

The race snapshots the selected owned driver and applies matching skills after car upgrades. Stages and restart keep that snapshot; returning to the menu restores the saved selection. Off-specialty pairings have no effect. Skills do not change mass, dimensions, top speed, gearing, boost, crash slots, scoring rules or CPU cars. A garage card says **Matches this car** for a suitable unselected driver; **Skill active** is reserved for the selected matching specialist.

Active skill values define a separate performance class for personal bests, leaderboard results and ghosts. The first finish with a new class sets a baseline rather than earning a bonus for beating an incompatible neutral time. Club Driver and off-specialty pairings share the existing neutral class. Full comparison and migration rules follow below.

## Rewards and losses

| CPU difficulty | Win base | Loss charge |
| --- | ---: | ---: |
| Easy | 600 CR | 300 CR |
| Medium | 1,000 CR | 500 CR |
| Hard | 1,500 CR | 750 CR |

Transmission is separate from CPU difficulty. Harder rivals and harder clock targets earn higher base rewards. Pro / Manual doubles style and race points and positive recurring credit earnings. Its win bases are 1,200 / 2,000 / 3,000 CR for Easy / Medium / Hard. The loss charges in the table stay unchanged.

- A valid win can earn a clean bonus of 10% of the base. This means no crashes during that circuit and no missed fuel stop. Going onto dirt does not remove this bonus by itself. The result captures actual stage crashes before repairs, so the win repair cannot turn a damaged run into a clean run.
- Beating an existing comparable car best earns 20% of the base. This can happen on a completed loss too. The first finish sets a baseline and earns no improvement bonus. Each genuine stage improvement pays, including several improved circuits in one campaign. Each stage still settles only once.
- The third consecutive win and every later win earn a flat 20% streak bonus. A loss resets the streak. The bonus does not grow beyond 20%.
- A completed arena win earns 10% per scored jump, capped at three jumps and 30% of the base. Landing points do not change the wallet during the race.
- A completed arena win also earns a separate **Crush Bonus** of 5% per junk car crushed by the player, capped at four cars and 20% of the base. Six junk cars are shared with the rival; a car can only be crushed once per race. Rival crushes, an unfinished event or a loss earn no crush credits. The HUD shows the player's count, and credits settle only with the result.
- Each police escape earns 10% of the base, capped at three escapes and 30% per stage. It requires a valid completed result, including a completed ordinary loss. A live pursuit escaped at a valid finish counts; a timeout, abandonment or missed challenge objective does not. This reward repeats in later races and is separate from the one-time Night escape milestone.
- The named **Pro / Manual Bonus** adds the positive base win reward plus the ordinary clean, car-best, streak, jump, crush, drift and police bonuses a second time. One-time milestone awards are excluded. A completed loss doubles only its eligible positive bonuses, after the unchanged loss charge floors at the wallet balance. For example, a clean first Medium Manual win earns 1,000 base + 100 clean + 1,100 Manual + 100 Clean debut = 2,300 CR. A Medium Manual loss with two police escapes and a car-best improvement earns 400 ordinary bonuses + 400 Manual after its loss charge, plus Faster again if newly earned.

A stage win restores up to two crash slots, capped at five, and repairs up to two major crashes. These are recovery rewards, not extra clean-run credit. A loss does not repair the car. Chase and Drift retain their recoverable-crash rules. The result states the actual number of repairs and slots restored.

A loss first deducts half the CPU base, stopping at zero credits. A valid car-best improvement bonus is then added separately. For example, an Easy loss from 100 credits deducts 100; a qualifying 120-credit best bonus leaves 120. If this is also the player's first improvement, the one-time 150-credit Faster Again milestone leaves 270 instead. The result shows the loss charge, ordinary bonuses, named milestone awards, and net wallet change.

All outcomes settle once per `runId:stageIndex`. Duplicate finish events, repeated result screens and repeated navigation cannot pay or charge twice. Unfinished races cannot earn a win, a personal best or a leaderboard time.

Leaving or restarting after GO forfeits the current race's unbanked earnings, without deducting pre-existing credits. Main Menu, Restart and the R key act immediately, without a confirmation. Restarting before GO is also free. GO writes an active-race marker: reopening after an interruption settles it as an abandoned race with zero payout and zero charge. Finished prior stages remain banked. Previously settled markers clear without a second settlement. Abandonment still ends the win streak and cannot create a best, ghost, milestone or leaderboard entry. Actual completed losses, timeouts and terminal crashes retain their existing race-loss rule.

## Driving milestones

Each local player can earn these six rewards once, for a total of 1,800 credits. The garage's expandable **Driving milestones** list shows earned rewards and circuit-tour progress. Result screens show each new award by name and amount.

| Milestone | Verified completed result required | Reward |
| --- | --- | ---: |
| Clean debut | First clean win: no crashes and no missed fuel stop | 100 CR |
| Faster again | First improvement of an existing comparable car best; a completed loss can qualify | 150 CR |
| Circuit tour | A win on each of the three normal campaign event IDs, across any number of runs | 400 CR |
| Trail winner | Ridge Rally win in any owned car | 300 CR |
| Night escape | Midnight Muscle Chase win in any owned car before the deadline | 350 CR |
| Arena show | A Titan arena win with at least three landed jumps or two player crushes; either arena event can qualify | 500 CR |

Milestone amounts do not scale with CPU difficulty. Different eligible milestones may pay together, but neither a new run nor a duplicate result can repeat an earned milestone. A baseline time does not count as an improvement. Circuit-tour progress counts distinct normal circuits and excludes all standalone events. Shared crushed-prop IDs do not earn player credit; Arena Show uses the result's player-only crush count or scored landing count. Non-finite or non-integer action counts do not qualify.

Only the completed result settlement can award or advance a milestone. Quitting, timeout, an incomplete lap count, invalid time, or a result for another active player cannot earn progress. The ordinary 50% loss base stays unchanged. Profile saving records milestone IDs, unique circuit wins, wallet changes and the settled race key together. Layout revisions retain the lifetime circuit-tour achievement; competitive times still use the current layout version.

Existing version-1 and version-2 saves retain their credits, cars and prior settlement keys and gain empty milestone fields. Old history is not reconstructed into rewards because it lacks all the required proof. New qualifying finishes can earn milestones from this point forward. Known earned IDs and circuit progress survive reload; unknown and duplicate IDs are removed during normalization. As with the rest of the garage, blocked storage keeps session-only progress.

## Comparable times

The simulation must validate both complete laps, including sequential route gates, before `completed: true` reaches progression. Race times include that race's crash and police penalties. A chase timeout is a DNF, even though the car survives.

The event identity includes course ID, `layoutVersion` (default 1), seed and lap count. **Increment the course's `layoutVersion` whenever its route geometry or distance changes.** Old layout times cannot establish a best or compete against the new route. Valid prior-layout leaderboard entries are retained in `archivedEntries` within the same version-1 store; current `entries` and every UI ranking contain only the active layout. Loading, saving and merging preserve historical keys and results separately. Personal-best keys already retain their layout, and career balances, ownership and rewards are unaffected.

Personal-best comparisons also include car, race mode, transmission, CPU difficulty and active driver skill values. Changing one of those creates a new baseline. Upgrades stay comparable so tuning a car can help beat its existing time. Driver signatures describe the actual versioned modifiers, not just the driver's name. A neutral or off-specialty driver has an empty signature, preserving existing keys exactly.

The setup screen states the selected CPU/transmission and driver next to its car best and shows the credit target. With no matching record, it says the first finish sets the baseline. Results distinguish a baseline, an actual improvement and a time that did not beat the matching record. The first Medium finish does not inherit an Easy baseline. The reported missing car-best credits also exposed a separate rule: the former once-per-campaign cap could save and announce a later circuit's improvement without paying it. That cap has been removed; existing `pbBonusRuns` save data is preserved but no longer suppresses a new stage's improvement. The `runId:stageIndex` settlement key still prevents repeat payouts. Removing that cap did not change record keys; the later driver system adds a signature only for active skills.

The shared leaderboard keeps one fastest valid time per local player, event, car and driver-performance class. It can mix CPU difficulties and transmissions within that class; each row shows those settings, the driver and the upgrade build. Circuit, car and driver filters narrow the comparison. The leaderboard and personal-best rewards deliberately answer different questions: the board shows each car/class's fastest run; rewards compare like race settings.

Time Trial ghosts require the same active driver modifiers as the current run, as well as the existing course, car and race-setting checks. Old neutral records remain usable with Club Driver or an off-specialty pairing. Saved signatures from older skill values are retained as historical records, not relabelled or played against current values. Leaderboard `archivedEntries` and ghost `archivedRecords` preserve those records; personal-best keys retain their original signatures. Loading or merging saves does not erase them or change career rewards.

## Saves and migration

- `the-duel-players-v2` stores the registry, active player and each player's profile, including driver unlocks, course ownership and saved selections.
- `the-duel-leaderboard-v1` stores shared records and their race/build metadata.
- If no valid registry exists, `the-duel-profile-v1` migrates to **Player 1**. Credits, owned cars, upgrade levels and prior award keys are retained. The old save remains available as a migration backup.

Names trim repeated spaces, reject empty and duplicate names, and stop at 24 characters. Names displayed in HTML are escaped. Saves normalize invalid cars, upgrade levels, balances and record metadata. If browser storage is unavailable, the current session remains playable and the garage explains that progress lasts for the session.

These saves belong to this browser profile and origin, not an online account. Different browsers or ports have separate saves. Local data can be edited by the computer's owner; this is a household leaderboard, not an authenticated competition. One active race per player is assumed. Opening the same player's game in another tab treats their existing active marker as an interrupted race. Other local players' latest profiles and records are merged when a race saves.

Adding or selecting a player first refreshes the registry, so a stale menu does not overwrite another player's newer wallet. Selecting a profile also settles any interrupted race once. A result belongs to the player who started the run; a delayed duplicate cannot pay a different player after a profile switch. If storage is denied, saving one session-only player preserves the other session-only players' wallets. The first recorded finish is labelled as a baseline to beat, rather than implying it earned a personal-best bonus.

## Validation

Run `node tools/test-progression.mjs` for reward arithmetic, bounds, unlocks, migration, profile isolation, best comparisons, layout revisions and record normalization. Run `node tools/test-progression-integration.mjs` for actual App/Duel settlement, upgrade snapshots, objective rules, interrupted-race recovery, duplicate protection and immediate leave/restart behavior.

The driver suites (`test-drivers.mjs`, `test-driver-ui.mjs` and `test-driver-driving.mjs` in `tools/`) cover purchases, persistence, menu-only selection, race snapshots, active-skill labels and separate records from real input-driven Time Trials. `tools/test-course-eligibility.mjs` checks all eight cars against all sixteen courses through App and the production menu, including locked-car protection and unchanged objective rules. These fixtures use in-memory saves, never real careers.

Progression tests simulate finish settlement with already validated two-lap fixtures; the simulation suite separately tests lap gates and collision behavior. Browser review and project-wide test results are recorded in [Verification](VERIFICATION.md). Counts in the historical integration notes below describe their earlier checkpoints, not a current whole-project pass.

`node tools/test-milestones.mjs` checks all six awards, reward limits, exact loss arithmetic, duplicate protection, invalid/incomplete results, player-only arena counts, migration, reload and player isolation, and actual App settlement. It also drives the real two-lap stunt trial on all three CPU settings through the App's input-only demo controller. At this checkpoint all three finished in 49.68 seconds with six scored landings and five player crushes; these are deterministic demo checks, not estimates of a new player's completion time.

`node tools/test-paint-presets.mjs` checks the immutable catalog, normalization, per-car purchases and free switching, and unchanged physics/record keys. `node tools/test-paint-integration.mjs` checks migration, App save/reload, player isolation, fresh-wallet affordability, duplicate purchases, menu-only changes, fixed race snapshots, campaign stage changes, restart and session-only storage. The renderer's separate vehicle-paint tests cover private material ownership, damage reset, factory restoration and imported/procedural model variants.

## Neon Drift Trial

Banshee Muscle is recommended for Midnight Muscle Chase and the standalone Neon Drift Trial; any owned car can enter either. The drift event uses its fixed city layout, two laps, no rival, traffic or pursuit, and a persistent vehicle. Major impacts cost 8 seconds and discard the live chain instead of destroying the car. Drift points are calculated by the physics scorer; the wallet only reads the final verified result.

| Difficulty | Banked points required | Deadline | Base win | Base loss |
| --- | ---: | ---: | ---: | ---: |
| Easy | 3,500 | 150 seconds | 600 CR | 300 CR |
| Medium | 5,000 | 125 seconds | 1,000 CR | 500 CR |
| Hard | 6,000 | 110 seconds | 1,500 CR | 750 CR |

The menu explains the target before entry. The HUD separates banked points from the live chain and its multiplier, with a score progress bar and deadline. Straightening banks a controlled slide; impacts, off-road driving and uncontrolled motion lose the unbanked chain. Brief notices explain banking or the reason a chain was lost. Pausing freezes the notice clock. Restarting clears all chain and notice state.

A valid drift win can earn a separate performance bonus: 5% of the base win reward at 125% of the score target, 10% at 150%, and 15% at 200% or higher. This settles once with the completed event; no credits are paid while drifting. Clean, streak and one-time milestone rules continue to apply.

A two-lap finish that misses the drift score target pays the normal loss charge and preserves its completed-laps history. It cannot set a personal best, pay a personal-best improvement bonus, enter the local leaderboard or save a competitive ghost. Record eligibility checks the configured difficulty target and deadline, not a result-supplied target value. Ordinary circuit losses still retain their valid car-best improvement bonus. Successful drift runs may set a time record, but the objective event always runs in its challenge mode and never records a Time Trial ghost.

Historical drift-integration checkpoint: `node tools/test-drift-integration.mjs` passed **98 checks**. Real App input runs completed all three difficulties in 99.38 seconds with 6,319 banked points and a best chain of 798, without a special drift autopilot. The suite covered score tiers/caps, duplicate results, failed goals, timeout, countdown retry, active-race restart, interrupted reloads and local-player isolation. The then-current 20 progression/leaderboard, 70 App progression, 76 ghost and 89 milestone checks also passed. Browser layout review remains separate from these headless checks.

### Drift score records

The local leaderboard keeps each player's best valid drift score for the event, car and driver-performance class. Higher banked points rank first; equal scores use faster finish time, including penalties. Each row retains its score target, best chain, drift distance, CPU target difficulty, driver skill signature and car upgrade metadata. Circuit, rally, chase and arena boards continue to rank by time. The drift menu shows the player's matching local car score best alongside the existing comparable car time best.

A higher score may replace a faster score record. A faster valid run with fewer points may still improve the separate time best and earn that stage's time bonus, while leaving the higher score record intact. Score-record updates themselves add no credits; the capped drift performance bonus is unchanged. Duplicate results, cross-tab merges and reloads cannot pay again.

Legacy time-only drift rows from development lack the evidence needed for score ranking, so they are ignored instead of inventing a score. They do not erase the separate saved car time best or wallet. Invalid score metadata, failed objectives and malformed records are rejected. Valid records from prior layouts are archived with their original target evidence, not ranked against the current route. A new successful trial creates a full score record.

Historical score-board integration checkpoint: **30 drift leaderboard checks**, **101 drift App/reward checks**, **20 general progression/leaderboard checks**, and the route-selection App integration checks passed. Actual App finishes stored the same 6,319 points and difficulty targets shown in results. The score-board tests cover score-first selection, time tie-breaks, original target metadata, local player/car filtering, save/reload, both cross-tab merge orders, layout compatibility and unchanged credit rewards.
## Timberline Checkpoint Rush

Dusthawk Rally is recommended for Ridge Rally and Timberline Checkpoint Rush; any owned car can enter either. The latter has a fixed canyon-to-alpine gravel route, two 3.8 km laps, six numbered gates per lap, a tunnel and one shortcut. It has no rival, traffic or police. Ordinary five-impact damage applies.

| Difficulty | Starting time | Time per passed gate | Base win | Base loss |
| --- | ---: | ---: | ---: | ---: |
| Easy | 40 seconds | 10 seconds | 600 CR | 300 CR |
| Medium | 34 seconds | 8 seconds | 1,000 CR | 500 CR |
| Hard | 30 seconds | 7 seconds | 1,500 CR | 750 CR |

All 12 gates must be crossed in order inside their marked width, and both laps must finish before the earned clock expires. A missed gate advances the target without adding time. Reversing, resetting or teleporting cannot collect extra gate time. Each numbered banner shows the next active gate; the map and HUD show its distance and the remaining clock. Gates have solid support posts and over 5.3 m of clearance above the road.

Failed gate objectives pay the normal half-win loss and cannot set personal bests or leaderboard records. Successful runs use the ordinary clean, streak and comparable time-improvement rewards. Leaderboard rows retain 12/12 gate evidence. A real-UI Hard run finished in 1:41.68 with all gates and zero misses; the existing QA win streak produced a 1,950-credit payout. These are automated driver results, not human difficulty estimates.

Historical checkpoint-integration validation: 457 trial checks, 80 App/reward checks and 19,943 gate-rendering checks passed. Twenty-four input replays covered both transmissions, three timer levels, two scenery seeds and two frame rates. Auto took 101.68 seconds and Manual 101.65, with no hits or resets. Ordinary crash recovery was survivable on Easy; the same delayed run correctly timed out on Medium and Hard.

## Related driving and audio changes

Shallow tunnel-wall and guardrail contacts below 35° to the wall face scrape and slow the car without taking a crash slot. Steeper contacts keep the ordinary impact-speed rule. The six new circuits also permit natural flight over fast road crests; those jumps cannot earn arena rewards or satisfy stunt targets. These changes do not alter credit formulas. See [wall scrapes and natural jumps](PHYSICS_EXPANSION.md) for boundaries and tests.

The [engine response update](AUDIO_EXPANSION.md) uses the existing credited recordings to distinguish revs, pedal load and gear changes. It changes no handling, scoring, rewards or save data.

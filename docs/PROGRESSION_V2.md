# Local players, garage and race rewards

Each named player has a separate wallet, garage, upgrades, race history and personal bests. Players on this computer share a leaderboard. The menu selects the player, circuit, car, CPU difficulty and transmission before a race starts.

## Garage

| Car | Price | Extra event |
| --- | ---: | --- |
| Falcone F42 | Free | — |
| Stuttgart 959-S | Free | — |
| Aurora GTR | 2,200 CR | — |
| Dusthawk Rally | 3,500 CR | Ridge Rally |
| Banshee Muscle | 5,000 CR | Midnight Muscle Chase |
| Viper Prototype | 7,500 CR | — |
| Titan Monster | 12,000 CR | Titan Monster Arena |

Each car has engine, nitro, handling, tires, brakes, suspension and nitro tank upgrades. Each upgrade has three levels, costing 350, 600 and 950 credits. Purchases apply to that car only. A race takes a copy of the selected car's upgrades, so its performance cannot change during the race.

The garage shows acceleration, road grip, braking and loose-surface pace for owned and locked cars. Ratings use one scale across the garage and include installed upgrades. The menu keeps the selected car visible with a single car picker.

The garage also offers three paint finishes. **Factory** is free and restores that model's original material. **Copper Metallic** costs **250 CR** and **Glacier Satin** costs **400 CR**. Each purchase belongs to that local player and that car. Buying equips the finish immediately; switching between owned finishes is free. The car must be unlocked first. These finishes change body paint only, with no speed, handling, reward, leaderboard-key or personal-best-key changes. Existing trim, stripes, glass, wheels, lights and carbon parts keep their original appearance.

Paint is stored in `profile.cosmetics[car]` as known owned IDs and the selected ID. Old profiles default to Factory. Unknown cars and finish IDs are discarded during normalization, duplicates are removed, and an unowned selection returns to Factory. Purchase/apply actions are menu-only and refresh the saved wallet before charging. Repeating a purchase for an owned finish is a free apply, preventing duplicate charges from a stale button. If browser storage is blocked, ownership and selection remain available in the current session.

`app.getPaintPreset(carKey, {menu})` provides the renderer a stable appearance descriptor or null for Factory. The menu reads the current local player's equipped finish. Starting or restarting a race snapshots that finish; campaign stage changes keep the snapshot, and later profile/storage changes cannot repaint the active car. The renderer applies only the private player-body material and updates its damage-reset baseline so paint survives wear updates. Restoring Factory uses the vehicle's captured original finish rather than one shared approximation.

The menu's High / Performance selector controls ambient contact shading. High is the default. The choice saves as `duel_graphics_quality` for the browser, so changing local players keeps the same graphics preference.

Regular campaigns cover the three mixed-scenery circuits. Any course with `kind` is a standalone event. A `requiredCar` course stays locked until that car is owned and uses that car when started. The garage links directly to the selected car's unlocked events. Chase mode forces the pursuit objective; it is not a time trial or a rival duel.

Titan Stunt Trial also forces its own objective mode, with no rival or Time Trial ghost. It requires both laps, four landed jumps and four player crushes within 95 seconds on Easy, 75 on Medium, or 62 on Hard. Setup states these targets before starting; the HUD shows progress and time left. Finishing the laps without the targets is a completed loss. Running out of time is a DNF. The result distinguishes those outcomes from a pursuit timeout. The demo driver targets uncrushed props through normal steering input and skips its ordinary deliberate shoulder excursion in this timed objective.

## Rewards and losses

| CPU difficulty | Win base | Loss charge |
| --- | ---: | ---: |
| Easy | 600 CR | 300 CR |
| Medium | 1,000 CR | 500 CR |
| Hard | 1,500 CR | 750 CR |

Transmission is separate from CPU difficulty. Harder rivals and harder clock targets earn higher rewards.

- A valid win can earn a clean bonus of 10% of the base. This means no new major crashes during that circuit and no missed fuel stop. Going onto dirt does not remove this bonus by itself.
- Beating an existing comparable car best earns 20% of the base. This can happen on a completed loss too. The first finish sets a baseline and earns no improvement bonus. The bonus pays at most once per campaign run, even if later circuits also improve.
- The third consecutive win and every later win earn a flat 20% streak bonus. A loss resets the streak. The bonus does not grow beyond 20%.
- A completed arena win earns 10% per scored jump, capped at three jumps and 30% of the base. Landing points do not change the wallet during the race.
- A completed arena win also earns a separate **Crush Bonus** of 5% per junk car crushed by the player, capped at four cars and 20% of the base. Six junk cars are shared with the rival; a car can only be crushed once per race. Rival crushes, an unfinished event or a loss earn no crush credits. The HUD shows the player's count, and credits settle only with the result.

A loss first deducts half the CPU base, stopping at zero credits. A valid car-best improvement bonus is then added separately. For example, an Easy loss from 100 credits deducts 100; a qualifying 120-credit best bonus leaves 120. If this is also the player's first improvement, the one-time 150-credit Faster Again milestone leaves 270 instead. The result shows the loss charge, ordinary bonuses, named milestone awards, and net wallet change.

All outcomes settle once per `runId:stageIndex`. Duplicate finish events, repeated result screens and repeated navigation cannot pay or charge twice. Unfinished races cannot earn a win, a personal best or a leaderboard time.

Leaving or restarting after GO counts as a loss. The game pauses and shows the exact charge before an in-game exit or restart. Keeping the race resumes without charging. Restarting before GO is free. GO also writes an active-race marker: reopening the game after an interrupted race settles that loss once. This prevents refreshing the page from avoiding the loss rule. Previously settled markers clear without a second charge.

## Driving milestones

Each local player can earn these six rewards once, for a total of 1,800 credits. The garage's expandable **Driving milestones** list shows earned rewards and circuit-tour progress. Result screens show each new award by name and amount.

| Milestone | Verified completed result required | Reward |
| --- | --- | ---: |
| Clean debut | First clean win: no new major crashes and no missed fuel stop | 100 CR |
| Faster again | First improvement of an existing comparable car best; a completed loss can qualify | 150 CR |
| Circuit tour | A win on each of the three normal campaign event IDs, across any number of runs | 400 CR |
| Trail winner | Ridge Rally win in its required Dusthawk | 300 CR |
| Night escape | Midnight Muscle Chase win in its required Banshee before the deadline | 350 CR |
| Arena show | A Titan arena win with at least three landed jumps or two player crushes; either arena event can qualify | 500 CR |

Milestone amounts do not scale with CPU difficulty. Different eligible milestones may pay together, but neither a new run nor a duplicate result can repeat an earned milestone. A baseline time does not count as an improvement. Circuit-tour progress counts distinct normal circuits and excludes all standalone events. Shared crushed-prop IDs do not earn player credit; Arena Show uses the result's player-only crush count or scored landing count. Non-finite or non-integer action counts do not qualify.

Only the completed result settlement can award or advance a milestone. Quitting, timeout, an incomplete lap count, invalid time, or a result for another active player cannot earn progress. The ordinary 50% loss base stays unchanged. Profile saving records milestone IDs, unique circuit wins, wallet changes and the settled race key together. Layout revisions retain the lifetime circuit-tour achievement; competitive times still use the current layout version.

Existing version-1 and version-2 saves retain their credits, cars and prior settlement keys and gain empty milestone fields. Old history is not reconstructed into rewards because it lacks all the required proof. New qualifying finishes can earn milestones from this point forward. Known earned IDs and circuit progress survive reload; unknown and duplicate IDs are removed during normalization. As with the rest of the garage, blocked storage keeps session-only progress.

## Comparable times

The simulation must validate both complete laps, including sequential route gates, before `completed: true` reaches progression. Race times include that race's crash and police penalties. A chase timeout is a DNF, even though the car survives.

The event identity includes course ID, `layoutVersion` (default 1), seed and lap count. **Increment the course's `layoutVersion` whenever its route geometry or distance changes.** Old layout times cannot establish a best or compete against the new route; incompatible leaderboard entries are discarded when loaded or saved.

Personal-best comparisons also include car, race mode, transmission and CPU difficulty. Changing one of those creates a new baseline. Upgrades stay comparable so tuning a car can help beat its existing time.

The shared leaderboard keeps one fastest valid time per local player, event and car. It can mix CPU difficulties and transmissions; each row shows those settings and the upgrade build. Circuit and car filters narrow the comparison. The leaderboard and personal-best rewards deliberately answer different questions: the board shows each car's fastest run; rewards compare like race settings.

## Saves and migration

- `the-duel-players-v2` stores the registry, active player and each player's profile.
- `the-duel-leaderboard-v1` stores shared records and their race/build metadata.
- If no valid registry exists, `the-duel-profile-v1` migrates to **Player 1**. Credits, owned cars, upgrade levels and prior award keys are retained. The old save remains available as a migration backup.

Names trim repeated spaces, reject empty and duplicate names, and stop at 24 characters. Names displayed in HTML are escaped. Saves normalize invalid cars, upgrade levels, balances and record metadata. If browser storage is unavailable, the current session remains playable and the garage explains that progress lasts for the session.

These saves belong to this browser profile and origin, not an online account. Different browsers or ports have separate saves. Local data can be edited by the computer's owner; this is a household leaderboard, not an authenticated competition. One active race per player is assumed. Opening the same player's game in another tab treats their existing active marker as an interrupted race. Other local players' latest profiles and records are merged when a race saves.

Adding or selecting a player first refreshes the registry, so a stale menu does not overwrite another player's newer wallet. Selecting a profile also settles any interrupted race once. A result belongs to the player who started the run; a delayed duplicate cannot pay a different player after a profile switch. If storage is denied, saving one session-only player preserves the other session-only players' wallets. The first recorded finish is labelled as a baseline to beat, rather than implying it earned a personal-best bonus.

## Validation

Run `node tools/test-progression.mjs` for reward arithmetic, bounds, unlocks, migration, profile isolation, best comparisons, layout revisions and record normalization. Run `node tools/test-progression-integration.mjs` for actual App/Duel settlement, upgrade snapshots, challenge gating, interrupted-race recovery, duplicate protection and leave/restart confirmation behavior.

The root task also reviews the menu and garage in the browser and runs the project-wide checks. Progression tests simulate finish settlement with already validated two-lap fixtures; the simulation suite separately tests lap gates and collision behavior.

`node tools/test-milestones.mjs` checks all six awards, reward limits, exact loss arithmetic, duplicate protection, invalid/incomplete results, player-only arena counts, migration, reload and player isolation, and actual App settlement. It also drives the real two-lap stunt trial on all three CPU settings through the App's input-only demo controller. At this checkpoint all three finished in 49.68 seconds with six scored landings and five player crushes; these are deterministic demo checks, not estimates of a new player's completion time.

`node tools/test-paint-presets.mjs` checks the immutable catalog, normalization, per-car purchases and free switching, and unchanged physics/record keys. `node tools/test-paint-integration.mjs` checks migration, App save/reload, player isolation, fresh-wallet affordability, duplicate purchases, menu-only changes, fixed race snapshots, campaign stage changes, restart and session-only storage. The renderer's separate vehicle-paint tests cover private material ownership, damage reset, factory restoration and imported/procedural model variants.

## Neon Drift Trial

The Banshee unlocks both Midnight Muscle Chase and the standalone Neon Drift Trial. The drift event uses its fixed city layout, two laps, no rival, traffic or pursuit, and a persistent vehicle. Major impacts cost 8 seconds and discard the live chain instead of destroying the car. Drift points are calculated by the physics scorer; the wallet only reads the final verified result.

| Difficulty | Banked points required | Deadline | Base win | Base loss |
| --- | ---: | ---: | ---: | ---: |
| Easy | 3,500 | 150 seconds | 600 CR | 300 CR |
| Medium | 5,000 | 125 seconds | 1,000 CR | 500 CR |
| Hard | 6,000 | 110 seconds | 1,500 CR | 750 CR |

The menu explains the target before entry. The HUD separates banked points from the live chain and its multiplier, with a score progress bar and deadline. Straightening banks a controlled slide; impacts, off-road driving and uncontrolled motion lose the unbanked chain. Brief notices explain banking or the reason a chain was lost. Pausing freezes the notice clock. Restarting clears all chain and notice state.

A valid drift win can earn a separate performance bonus: 5% of the base win reward at 125% of the score target, 10% at 150%, and 15% at 200% or higher. This settles once with the completed event; no credits are paid while drifting. Clean, streak and one-time milestone rules continue to apply.

A two-lap finish that misses the drift score target pays the normal loss charge and preserves its completed-laps history. It cannot set a personal best, pay a personal-best improvement bonus, enter the local leaderboard or save a competitive ghost. Record eligibility checks the configured difficulty target and deadline, not a result-supplied target value. Ordinary circuit losses still retain their valid car-best improvement bonus. Successful drift runs may set a time record, but the objective event always runs in its challenge mode and never records a Time Trial ghost.

Validation: `node tools/test-drift-integration.mjs` passes **98 checks**. Real App input runs complete all three difficulties in 99.38 seconds with 6,319 banked points and a best chain of 798, without a special drift autopilot. The suite covers score tiers/caps, duplicate results, failed goals, timeout, countdown retry, active-race restart, interrupted reloads and local-player isolation. The existing 20 progression/leaderboard, 70 App progression, 76 ghost and 89 milestone checks also pass after this integration. Browser layout review remains separate from these headless checks.

### Drift score records

The local leaderboard keeps each player's best valid drift score for the event and car. Higher banked points rank first; equal scores use faster finish time, including penalties. Each row retains its score target, best chain, drift distance, CPU target difficulty and car upgrade metadata. Circuit, rally, chase and arena boards continue to rank by time. The drift menu shows the player's local car score best alongside the existing comparable car time best.

A higher score may replace a faster score record. A faster valid run with fewer points may still improve the separate time best and earn the existing once-per-run time bonus, while leaving the higher score record intact. Score-record updates themselves add no credits; the capped drift performance bonus is unchanged. Duplicate results, cross-tab merges and reloads cannot pay again.

Legacy time-only drift rows from development lack the evidence needed for score ranking, so they are ignored instead of inventing a score. They do not erase the separate saved car time best or wallet. Invalid score metadata, failed objectives, incompatible layout revisions and malformed records are rejected. A new successful trial creates a full score record.

Validation after score-board integration: **30 drift leaderboard checks**, **101 drift App/reward checks**, **20 general progression/leaderboard checks**, and the route-selection App integration checks pass. Actual App finishes store the same 6,319 points and difficulty targets shown in results. The score-board tests cover score-first selection, time tie-breaks, original target metadata, local player/car filtering, save/reload, both cross-tab merge orders, layout compatibility and unchanged credit rewards.
## Timberline Checkpoint Rush

Owning the Dusthawk Rally opens both Ridge Rally and Timberline Checkpoint Rush. The latter has a fixed canyon-to-alpine gravel route, two 3.8 km laps, six numbered gates per lap, a tunnel and one shortcut. It has no rival, traffic or police. Ordinary five-impact damage applies.

| Difficulty | Starting time | Time per passed gate | Base win | Base loss |
| --- | ---: | ---: | ---: | ---: |
| Easy | 40 seconds | 10 seconds | 600 CR | 300 CR |
| Medium | 34 seconds | 8 seconds | 1,000 CR | 500 CR |
| Hard | 30 seconds | 7 seconds | 1,500 CR | 750 CR |

All 12 gates must be crossed in order inside their marked width, and both laps must finish before the earned clock expires. A missed gate advances the target without adding time. Reversing, resetting or teleporting cannot collect extra gate time. Each numbered banner shows the next active gate; the map and HUD show its distance and the remaining clock. Gates have solid support posts and over 5.3 m of clearance above the road.

Failed gate objectives pay the normal half-win loss and cannot set personal bests or leaderboard records. Successful runs use the ordinary clean, streak and comparable time-improvement rewards. Leaderboard rows retain 12/12 gate evidence. A real-UI Hard run finished in 1:41.68 with all gates and zero misses; the existing QA win streak produced a 1,950-credit payout. These are automated driver results, not human difficulty estimates.

Focused validation: 457 trial checks, 80 App/reward checks and 19,943 gate-rendering checks. Twenty-four input replays cover both transmissions, three timer levels, two scenery seeds and two frame rates. Auto takes 101.68 seconds and Manual 101.65, with no hits or resets. Ordinary crash recovery is survivable on Easy; the same delayed run correctly times out on Medium and Hard.

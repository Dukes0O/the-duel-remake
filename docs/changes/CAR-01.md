# CAR-01 — Wasteland career

## Design settled before code

### Economy

Scrap belongs to each named player's Wasteland career. It never converts to or from racing credits. After that player has discovered the gate, a completed Wasteland event awards 80 scrap for finishing, another 120 for winning, 15 per player-owned armor hit (at most 10), and 60 per player-caused wreck (at most 4). Before discovery, the existing Mad Max Duel keeps its current reward rules. A completed loss keeps its earned scrap. An abandoned event earns none. Each settled run key pays once, including after reload. Existing ledge salvage crates award 25 scrap each, capped at three in a completed event. The simulation records collection; scrap stays unbanked until event settlement. The settled-run identity prevents duplicate payment after reload, with no new pickup journal in the save. No difficulty or Pro multiplier changes scrap.

At full rockets and armor, the current ledge crate refuses collection. Once the player has discovered the gate with `wasteland2` enabled, collecting on foot and in reach may take the crate for scrap even when those resources are full. Keep the old resource-only rule before the gate and with the switch off. This is a small change to the existing pickup, not a new spawn or currency event.

The four starter weapons stay free. Levels bought with credits before migration keep their levels. A later upgrade costs 150, 300, or 600 scrap for levels 1, 2, or 3. A new weapon costs 400 scrap; crew costs 300 at its rank gate; each car's Scrapper, Raider, and Warlord armor kits cost 350, 950, and 2,500 scrap. Content without a working purchase or grant action remains unavailable rather than charging for a placeholder. The shop shows scrap and prices when `wasteland2` is enabled; the ordinary garage still shows credits. Post-gate Wasteland events add no racing credits or racing milestones. These prices let a player buy an early upgrade after one or two wins while keeping the top kit a long goal.

### Territory map

The eleven existing combat courses are assigned exactly once. Warlord order is the order in SPEC 3.9:

| Warlord | Courses or arena |
| --- | --- |
| Sawtooth Sal | Pacific Canyon, Red Mesa |
| The Dustmonger | High Country, Ridge Rally |
| Mother Mirage | Azure Riviera |
| Gearhead Gunn | Eifel Crown |
| Kettle Kingpin | Titan Monster Arena, Scrapdome events |
| The Twin Vultures | Alpine Serpent |
| The Tollkeeper | Neon Docks, Salt Flats Convoy Raid |
| Baron Blackiron | Harbor & Highlands, Cloudbreak Skyway |

The Scrapdome and Salt Flats entries are future event venues, not extra copies of a course. Only playable, completed Wasteland events after gate discovery can add hold. A win adds 25 hold to its territory, capped at 100; a loss adds none. Four wins, including repeats on an available course, fill it. This avoids locking progress behind racing garage purchases. Full hold opens that warlord's fight once its event exists. Beating that fight once claims the territory, adds the banner and grants its specified kit parts. Full hold does not itself grant the parts. A claimed territory cannot lose hold. Future venue and boss events must use stable event IDs and the same settlement rule.

The map is available after this named player discovers the gate. It shows the eight territories, assigned courses, hold out of 100, locked or available warlord fight, and claimed banner. It does not let a player start an unbuilt event.

### Save and migration

Keep `profile.wasteland.version` at 1 and add `scrap: 0` and `territories: {}` to the existing versioned object. Each territory value is `{hold: 0, claimed: false}`. Keep existing `discoveredGate` and every other established field. Normalize missing or damaged scrap and hold to bounded nonnegative integers; preserve unknown fields. For any future version, preserve the nested object without modification and block writes. Existing `profile.weapons.levels` moves to `profile.wasteland.weapons.levels` unchanged through the established backup-first migration. Additive defaults never erase levels, credits, cars, records, gate discovery, or other existing player data. Use the existing `settledResults` identity for race payouts including collected salvage. Later warlord grants must share their completed event identity. Each historical fixture must load through memory-only storage, with a verified pre-migration backup when a write is needed.

### Why and reversal

The event rates reward a finish and visible combat without making repeated hits unlimited income. Four wins make hold legible and reachable on the first free course. Reusing version 1 fits the existing additive normalization and backup gate. To reverse the tuning, change the pure economy catalog and tests; do not remove earned scrap or claimed territories from saves. To change territory allocation or hold thresholds after players have progress, write a migration that preserves each named player's earned hold and claims.

## Tests first

The Director assigned the named source and test files before test edits. `tools/test-wasteland-career.mjs` was written first. Its first run was red because `src/wasteland-career.js` did not exist (`ERR_MODULE_NOT_FOUND`). Later red runs caught credit spending in the new career and a false credit payout on the results screen. The salvage extension had two red tests before code: full-resource collection failed, and the per-race gate snapshot was absent. Focused tests now cover the eleven-course assignment, bounded scrap and four-win hold, duplicate settlement, post-gate credit isolation, no pre-gate, abandoned, or ordinary scrap payout, real salvage collection through `stepRaiders` and `combatResultSnapshot`, purchases, migration, named-player isolation and map access. Warlord fights are unbuilt: WAR-01 owns the data and ladder screen, WAR-02 owns warlords 1–5, WAR-03 owns warlords 6–8 after ARENA-07, and WAR-04 owns one-time claims and kit-part/story rewards. CAR-01 stores hold and claimed fields without granting unbuilt rewards.

## Checks

Focused checks: 30 of 30 new career, raider and combat-scoring groups passed after salvage, including a real pickup and settlement. Seven historical save shapes and 247 first-load/round-trip checks passed using memory storage. The first lane tier passed 241 of 241, but started before the salvage addition, so a final lane rerun is required. The post-salvage production build passed. The post-salvage private-port browser scenario passed with memory-only saves, zero warnings and zero errors: post-gate payout, scrap purchase, map hold, second-player isolation and flag-off credit presentation. The final lane tier is pending.

The exact changed assertion in `tools/test-wasteland-profile.mjs` adds `scrap` and `territories` to the version-1 default key list and checks their defaults. It preserves every prior expected key and assertion. This is the additive schema approved for CAR-01; independent Save Guardian review is required before merge.

## Removed

Post-gate Wasteland purchases no longer use racing credits. Pre-gate and flag-off credit purchases remain available. No asset or old save data was removed.

## Director migration review

The current-v1 regression failed before the fix: a missing scrap field did not request backup. The startup migration check now validates scrap and each known territory entry before normalization may write. Memory-only cases cover missing scrap, the territory object, and one territory entry; unavailable and unverified backups leave original bytes unchanged. Existing unchanged-format/no-backup assertions remain intact. Independent Save Guardian review is still required.

Actual results/map screenshots revealed misleading old car-best bonus and credit-loss wording despite the correct scrap metric. Two result regressions failed first; the copy now follows the settled reward currency. The territory introduction explicitly says boss fights are future work.
The later copy review also caught a racing streak bonus line on scrap wins and a credit-earnings message in the next-course action. Focused tests were red first; both lines now describe the correct career. Future venue labels are human-readable and marked coming later. The browser scenario waits for its QA-only control before hiding that control for clean results and map captures. Product HUD and errors remain visible.

The Director approved a narrow combat HUD presentation change after the actual result image showed weapon controls and a rival marker covering the scorecard and action. A new test failed first because `combatHudVisible` did not exist. The new predicate displays those controls only while racing, counting down or exploring, and never while paused. `combatHudEnabled` retains its prior eligibility rule so the router still suppresses the legacy HUD. No old assertion changed. The focused HUD suite passed 8 of 8, and a private-port memory-only browser recapture passed with three images, zero warnings and zero errors; the result scorecard and action are now clear. The prior Director lane tier passed 242 of 242, build passed, 162 replay fingerprints were unchanged, and 48 of 48 expansion driving checks passed. That gate preceded the final presentation change; the exact-source lane rerun is pending. Independent Save Guardian review cleared the save and reward changes with seven historical fixtures, 247 memory-only round trips and the 3.47 MB save budget model.
The Director inspected and approved the final result image at `.evidence/2026-09-24/car-01-hud-final/wasteland-career-results.png`; the scorecard and action are unobstructed.
The exact final source passed the lane tier: 242 passed, 0 failed in 539.69 seconds. Replay fingerprints remained 162 for 18 cases; expansion driving passed 48 of 48. The production build passed. The final memory-only browser scenario passed on private port 60931 with zero warnings and errors.

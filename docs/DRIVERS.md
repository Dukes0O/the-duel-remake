# Specialist drivers

Every local player starts with **Club Driver**, which changes nothing. Six fictional specialists can be unlocked with earned credits in the garage. A seventh specialist, **Axel Storm**, is earned automatically with the Koenigsegg. Selecting an unlocked driver is a separate, free action. Unlocks and selection belong to that player. Drivers cannot be bought or changed during a race.

| Driver | Cost | Matching cars | Passive skill |
| --- | ---: | --- | --- |
| Mara Vale | 1,200 CR | Falcone F42, Heritage | 5% more corner grip |
| Iko Ren | 1,400 CR | Stuttgart 959-S | 4% more grip and braking |
| Sana Marlow | 1,800 CR | Aurora GTR, Viper Prototype | 4% more grip, 3% more braking |
| Jules Reyes | 1,800 CR | Banshee Muscle | 5% more acceleration, 3% more braking |
| Nia Frost | 2,000 CR | Dusthawk Rally | 6% more loose-surface grip, 2% more corner grip |
| Boone Ward | 2,200 CR | Titan Monster | 6% more braking, 4% more loose-surface grip |
| Axel Storm | Free with car unlock | Koenigsegg Jesko Absolut | +30% handling, +20% suspension, +30% tires, +20% nitro |

Skills multiply the installed build after upgrades. They do not change collision dimensions, mass, base top speed, gearing, lives, crash penalties, reward rules or CPU cars. A specialist has no effect in other cars. No real-world drivers or likenesses are used.

Axel's handling raises corner grip by 30%. His tire skill raises braking and loose-surface traction by 30%, without counting the same corner-grip bonus twice. Suspension divides the installed roughness response by 1.2, giving 20% stronger damping. Nitro increases boost acceleration and duration by 20%; its speed ceiling stays unchanged. All bonuses apply on top of the Jesko's factory-maxed upgrades.

Maxing all other cars earns the Jesko and Axel together. Existing Jesko owners receive Axel on load, even if their older garage no longer matches a later completion roster. The grant costs no credits, cannot be purchased early and never auto-selects him. A saved Axel unlock without Jesko ownership is ignored.

The race snapshots its driver at startup and retains it across stages. Restart keeps that owned race driver. Returning to the menu restores the player's saved selection. Quitting or reloading keeps banked credits and earned drivers; unfinished earnings are forfeited normally. Old saves keep their existing drivers and receive no free money; Jesko ownership is the only automatic specialist grant.

Every owned car can enter every unlocked course, including the six special events. [Course purchases](COURSE_ACCESS.md) are separate from driver and vehicle purchases. The former `requiredCar` field now describes a recommendation only. Selecting a course does not replace the car or unlock a paid vehicle. Objective modes, targets and deadlines remain unchanged. Light cars cannot crush arena wrecks under the existing mass rules, so the menu warns that Titan is recommended before starting an arena or stunt event.

## Comparable records

Active skill values have a stable, versioned signature. Personal bests, leaderboard rows, simulation bests and ghosts keep enhanced performances separate from neutral ones. An enhanced driver's first finish sets a new baseline, not a bonus for beating an incompatible neutral record. Off-specialty drivers have the same performance as Club Driver and share that class. Upgrades retain their established comparison policy.

Neutral keys remain byte-for-byte compatible with existing records. Saved leaderboard and ghost modifier signatures are retained; older skill values are archived rather than relabelled as current performances. Default leaderboard queries show neutral results; driver-specific queries show matching skill values for each car. The garage and menu explain when a specialty is active.

The six purchasable drivers retain their original `v1` stat signatures. Axel uses a bounded `v2` category signature for handling, nitro, suspension and tires. His records and ghosts never replace neutral Jesko records.

`node tools/test-drivers.mjs` covers bounded arithmetic, immutable car data, legacy profiles, purchases, player isolation, menu-only actions, run snapshots, interruption, separate bests and ghosts, and record serialization. `test-driver-ui.mjs` executes the production menu/action code and checks accessible labels. `test-driver-driving.mjs` completes two real input-driven Time Trials and checks separate saved records and replay selection. `test-koenigsegg-driver.mjs` covers all 56 final-upgrade grants, migration, exact physical bonuses, records/replays and a complete input-driven Jesko/Axel race. `test-course-eligibility.mjs` checks catalog cars against all sixteen courses through the App and production menu, including ownership and the unchanged objective rules. All tests use in-memory saves.

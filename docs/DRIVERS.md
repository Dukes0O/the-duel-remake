# Specialist drivers

Every local player starts with **Club Driver**, which changes nothing. Six fictional specialists can be unlocked with earned credits in the garage. Buying unlocks a driver; selecting them is a separate, free action. Unlocks and selection belong to that player. Drivers cannot be bought or changed during a race.

| Driver | Cost | Matching cars | Passive skill |
| --- | ---: | --- | --- |
| Mara Vale | 1,200 CR | Falcone F42, Heritage | 5% more corner grip |
| Iko Ren | 1,400 CR | Stuttgart 959-S | 4% more grip and braking |
| Sana Marlow | 1,800 CR | Aurora GTR, Viper Prototype | 4% more grip, 3% more braking |
| Jules Reyes | 1,800 CR | Banshee Muscle | 5% more acceleration, 3% more braking |
| Nia Frost | 2,000 CR | Dusthawk Rally | 6% more loose-surface grip, 2% more corner grip |
| Boone Ward | 2,200 CR | Titan Monster | 6% more braking, 4% more loose-surface grip |

Skills multiply the installed build after upgrades. They do not change collision dimensions, mass, top speed, gearing, boost, lives, crash penalties, jumps, rewards or CPU cars. A specialist has no effect in other cars. No real-world drivers or likenesses are used.

The race snapshots its driver at startup and retains it across stages. Restart keeps that owned race driver. Returning to the menu restores the player's saved selection. Quitting or reloading keeps banked credits and purchased drivers; unfinished earnings are forfeited normally. Old saves receive only Club Driver, with no free money or specialists.

Every owned car can enter every course, including the six special events. The former `requiredCar` field now describes a recommendation only. Selecting a course does not replace the car or unlock a paid vehicle. Objective modes, targets and deadlines remain unchanged. Light cars cannot crush arena wrecks under the existing mass rules, so the menu warns that Titan is recommended before starting an arena or stunt event.

## Comparable records

Active skill values have a stable, versioned signature. Personal bests, leaderboard rows, simulation bests and ghosts keep enhanced performances separate from neutral ones. An enhanced driver's first finish sets a new baseline, not a bonus for beating an incompatible neutral record. Off-specialty drivers have the same performance as Club Driver and share that class. Upgrades retain their established comparison policy.

Neutral keys remain byte-for-byte compatible with existing records. Saved leaderboard and ghost modifier signatures are retained; older skill values are archived rather than relabelled as current performances. Default leaderboard queries show neutral results; driver-specific queries show matching skill values for each car. The garage and menu explain when a specialty is active.

`node tools/test-drivers.mjs` covers bounded arithmetic, immutable car data, legacy profiles, purchases, player isolation, menu-only actions, run snapshots, interruption, separate bests and ghosts, and record serialization. `test-driver-ui.mjs` executes the production menu/action code and checks accessible labels. `test-driver-driving.mjs` completes two real input-driven Time Trials and checks separate saved records and replay selection. `test-course-eligibility.mjs` checks all eight cars against all fifteen courses through the App and production menu, including ownership and the unchanged objective rules. All tests use in-memory saves.

# Course purchases and free practice

Pacific Canyon is included. Each local player buys other courses with earned credits from **COURSES ↗** beside the circuit selector. Buying unlocks a course without selecting it. Selecting an owned course is free and keeps the chosen vehicle. Any owned vehicle can enter any unlocked course; a recommended car is not compulsory.

| Course | Price |
| --- | ---: |
| Pacific Canyon Circuit | Included |
| High Country Grand Tour | 900 CR |
| Harbor & Highlands | 1,400 CR |
| Titan Monster Arena | 1,600 CR |
| Midnight Muscle Chase | 1,800 CR |
| Ridge Rally | 1,200 CR |
| Titan Stunt Trial | 2,000 CR |
| Neon Drift Trial | 1,800 CR |
| Timberline Checkpoint Rush | 1,600 CR |
| Eifel Crown | 1,400 CR |
| Alpine Serpent | 1,800 CR |
| Azure Riviera | 1,400 CR |
| Red Mesa Corkscrew | 1,600 CR |
| Neon Docks Circuit | 1,800 CR |
| Cloudbreak Skyway | 2,200 CR |
| Titan Freestyle Playground | 900 CR |

Prices are reachable from a few clean starter wins. Courses and vehicles are separate purchases. Unlocking a car does not unlock new courses under the current rules. Normal objective targets remain unchanged: light cars may enter the arena, but cannot crush wrecks or satisfy the Stunt Trial's four-crush target.

## Campaign and wallet protection

The campaign still uses the original three circuits. A new player can start Pacific without owning the others. Its completed reward is banked normally. If the next circuit is locked, the result offers **Unlock next course**, which returns to the menu and opens the course shop. It cannot advance into the locked circuit or purchase during the race. The player can buy and select that next circuit from the menu, or replay an owned course to earn more.

App start and next-stage checks enforce ownership independently of disabled menu options. Purchase and selection are menu-only. Purchases refresh the saved wallet; repeated or stale purchase actions cannot charge twice. Course ownership is stored per player as `profile.courses = {version: 1, unlocked: [stableCourseIds]}`. Browser-storage failures retain session-only progress under the existing save rules.

## Existing saves

The first load of a profile without course ownership preserves evidence-backed access:

- A completed history entry, a positive saved personal best, a recorded campaign circuit win, or a valid active-race marker preserves its course.
- Older Dusthawk purchases preserve Ridge Rally and Timberline Checkpoint Rush. Banshee preserves Midnight Muscle Chase and Neon Drift Trial. Titan preserves Monster Arena and Stunt Trial. Those purchases previously included the events.
- A saved menu selection alone grants nothing. New circuits are not granted as a group. Practice is never granted by migration.

The migration changes no credits, cars, upgrades, drivers, results or records. An unowned saved selection returns to Pacific. Once the course field exists, future car purchases or finish data do not silently grant course ownership. No live account was edited to implement this system.

## Titan Freestyle Playground

The 900-credit purchase opens an untimed practice area. “Free practice” means unrestricted practice after unlocking, not a free course purchase. There is no rival, lap target, finish line, leaderboard, personal best, ghost or credit reward. Practice cannot farm milestones or change a win streak. Crashes recover without a race penalty. Main Menu and Restart still act in one click, and practice creates no interrupted-race charge or career settlement.

The flight panel shows current height, peak height, horizontal jump distance and time in the air. It briefly retains the completed jump after landing. These are readouts only; they do not award points or credits.

## Focused checks

`node tools/test-course-access.mjs` checks prices, migration, serialization, player isolation, stale purchases, direct App entry and campaign gates, and actual practice driving/restart/exit without career changes. `test-course-access-ui.mjs` executes the production purchase/select actions and HUD against real App state. `test-course-eligibility.mjs` checks every owned vehicle/course pairing. Physics and distance measurements have separate suites; see [verification](VERIFICATION.md) for current project-wide results.

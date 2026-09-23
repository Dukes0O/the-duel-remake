# Spec: Mad Max Duel 2.0 – the Wasteland expansion

| | |
| --- | --- |
| Status | Approved for implementation by Kyle on 23 September 2026; BUG-04 UFO design remains open for review |
| Date | 22 September 2026 |
| Covers | A review of Mad Max Duel and of older code and habits that cause problems today; a way to build continuously with automatic checks instead of stopping between phases; an agent setup for Codex; and the plan for on-foot crews, a bigger arsenal, armor kits, an arena, a warlord ladder, unlocks and image creation |
| Starting point | Commit `1fd7116` on `master` |
| Companion | [`docs/CODEX_PLAYBOOK.md`](docs/CODEX_PLAYBOOK.md): roles, agent files, prompts and handoff rules |

### What changed from v1

- **New review findings.** The full test suite fails today (3 of 138 test files), agents' edits have been reloading the live game while people play, and an old "5 lives" rule still ends races behind a HUD that counts something else. See section 2.
- **No phase sign-offs.** Work flows through automatic gates, and unfinished features stay switched off until they pass. See section 4.
- **An agent team for Codex**, with independent testers and reviewers. See section 5 and the playbook.
- **Old-code fixes scheduled alongside the features**, with clear rules for what runs in parallel and what must wait. See section 12.
- **Design additions:** arena fights with up to 3 CPU cars from the start, a rewind photo mode, a daily bounty board, career backups, and an Experimental menu for trying features early.

## How to read this

1. Objective
2. Review
3. Design
4. How the work runs without pausing
5. Agent team
6–11. Working rules: stack, commands, structure, style, testing, boundaries
12. The plan
13. Success criteria
14. Risks
15. Decisions for Kyle
16. Out of scope

---

## 1. Objective

### What we are building and why

Mad Max Duel works, but it is thin. Weapons rarely hit, the CPU barely fights back, the UFO warp decides races on its own, nothing you do in combat is scored or rewarded, and the armor rig floats off the car when it slides. Underneath that, the project has habits that keep causing problems: agents edit the folder the live game runs from, a test failure stops the test run so later failures stay hidden, and a few old rules still run beside their replacements.

This spec fixes those first. Then it turns the mode into the biggest part of the game:

- **Crews that get out of the car.** Bail out mid-race to repair, set an RPG ambush, grab salvage your car cannot reach, or grapple onto the rival's roof. CPU crews do the same.
- **A real arsenal.** Sixteen car weapons and nine on-foot items, chosen as a loadout.
- **Armor you can see.** Scrap plating, bull bars, roof cages and saws on every car, which dent, burn and fall off.
- **Wrecks with stakes.** Every car has armor. At zero it wrecks, explodes and respawns.
- **A wasteland arena** with four battle modes, up to three CPU cars at once, and a convoy boss.
- **A warlord ladder** of eight named bosses.
- **Unlocks everywhere.** Notoriety ranks, challenges, a daily bounty board, crew members, kits, war paint stencils and trophy cards.
- **Image creation.** Generated art for characters, weapons and textures, plus player-made images: a war paint studio, a photo mode that can rewind ten seconds, automatic wanted posters, trophy cards and a gallery.

### Who plays

Kyle and the other named local players on this computer, through the desktop shortcut (the browser game at `http://localhost:5174`), with keyboard and mouse or a standard gamepad. Each player keeps a separate career.

### Feel targets

1. Something explodes about every ten seconds.
2. Getting out of the car is a gamble worth taking, never a chore.
3. Everything you unlock shows on your car, your crew or your wall.
4. You leave every event with a picture worth keeping.

### User stories

- I pick a car, a crew member and four weapons, and every one of them does something I can see and feel.
- I hit the rival with a crossbow bolt at racing speed often enough that aiming matters.
- I wreck the rival with a bomb storm, watch the car burn, and see "+150 NOTORIETY" on screen.
- I stop on a ridge, get out, lock on with the RPG as the rival rounds the bend, then sprint back and drive off.
- My car is exposed while I'm out, so the rival can ram it or bomb it.
- I climb 30 Notoriety ranks and unlock something at every rank.
- I paint flames and teeth on my Banshee, and the paint shows in every race.
- I pause right after a wreck, rewind five seconds, frame the explosion and save it to my gallery.
- I beat a warlord and get a wanted poster of my car with my bounty on it.
- I never lose progress, and a new build never interrupts a race I'm in the middle of.

### Assumptions

Confirmed by Kyle on 22 September 2026:

1. **Image creation means both** generated game art and in-game creation tools.
2. **On foot happens in races and in a new arena.** CPU crews get out too.
3. **Arrow keys drive.** The left hand handles camera, weapons and getting out. A stops steering. On foot, WASD walks and the mouse aims.
4. **No pausing between phases.** Work continues while quality is enforced by automatic checks (requested in the second pass).

Defaults, which Kyle can change by editing this spec:

5. **Cartoon arcade tone.** No blood or gore. Knocked-down fighters dust off and respawn. Wrecks explode and recover.
6. **Same stack.** Three.js 0.171 and Vite 8, plain JavaScript modules. No physics engine, no animation library, no new runtime dependency.
7. **Offline.** No network requests, accounts or API keys at runtime.
8. **Credits stay the only currency.** Notoriety rank decides what you may buy.
9. **The name.** "Mad Max Duel" stays as the menu label in this private build. The internal id stays `wasteland`. All characters, vehicles and art are original.
10. **Codex does the building.** The art lane generates images with Codex's built-in image tool, which made the existing textures (see `docs/IMAGE_PROMPTS.md`).
11. **Existing weapon levels carry over.** Rebalanced numbers apply to levels already bought.

---

## 2. Review

### 2.1 Test suite health

Evidence from a full run on 22 September 2026 at commit `1fd7116`:

| Finding | Evidence |
| --- | --- |
| **The suite is red: 3 of 138 test files fail.** All three failures come from commit `7564c7d` ("Ship custom rivals, directional cameras and freestyle upgrades in desktop game"), which is also the latest commit on GitHub | See the three rows below |
| `test-shortcut-presets` | The route code changed (a freestyle drag-strip rule in `course.js`) but the saved route data wasn't regenerated, so its freshness check fails |
| `test-world-composition` | The freestyle playground scene gained the drag strip (1 more mesh, geometry and material), but its reviewed scene signature wasn't updated |
| `test-course-eligibility` | The test cuts code out of `main.js` as text and runs it against a hand-made list of menu elements. The new custom-rival element isn't on the list |
| **One failure hides the rest.** The runner stops at the first failure. The sequential run stopped after 8 min 39 s with 86 files never run. The two later failures only showed up when I ran those files separately | `Stopped after 518.73s: 51 passed, 1 failed, 86 not run` |
| **Only focused tests ran after `7564c7d`.** The four Mad Max commits each ran a handful of suites, and `docs/VERIFICATION.md` says so. Nobody saw the suite go red | `docs/VERIFICATION.md` entries for 22 September |
| **The suite is slow and runs one file at a time.** The core file alone takes 5 min 12 s. Running the other 86 files ten at a time took 110 s instead of 6 min 24 s | This machine has 20 processor threads |
| **Twelve tests run slices of source code as text** (`new Function`), mostly from `main.js`. Any menu edit can break them for reasons unrelated to behavior. That's exactly how `test-course-eligibility` broke | `test-build-update`, `test-busted-quit`, `test-completion-screen`, `test-course-access-ui`, `test-course-eligibility`, `test-driver-ui`, `test-jump-height-hud`, `test-koenigsegg-ui`, `test-render-readiness-ui`, `test-reverse-presentation`, `test-speed-format`, `test-vehicle-assets` |
| **Tests were changed to protect a bug.** When D became the camera key, the steering tests were edited to assert that D does not steer, while A still steers left | `tools/test-keyboard-steering.mjs:13`, `tools/test-road-powerups.mjs:15` |

### 2.2 Mad Max Duel findings

Evidence marked **probe** comes from throwaway simulations with the real `Duel` and `App` classes (kept outside the repo). "Autopilot" is the built-in test driver.

**Confirmed bugs**

| ID | Problem | Evidence | Task |
| --- | --- | --- | --- |
| F1 | WASD drivers can only turn left. D resets the camera, but A still steers left. The README table still says "A / D" | `keyboard-steering.js:5`; probe: A = −1, D = 0; `README.md:18` | BUG-01 |
| F2 | A UFO swap erases both drivers' lap history and restarts their lap timers | `combat.js:26`; probe: `[55.2]` became `[]` | BUG-02 |
| F3 | A UFO swap can drop you onto the rival's gravel shortcut at full speed, pointed the wrong way | `combat.js:10`; probe on Hard: 64 m off the road at 304 km/h, crashed, finished 28 s slower than using no weapons | BUG-03 |
| F4 | A UFO swap fires even when the rival is 0.2 m ahead, wasting the weapon | probe | BUG-04 |
| F5 | Your own bomb storm cripples you at mid speed, because bombs don't carry the car's speed | `combat.js:43`; probe: at 97 km/h own bombs cut speed to 30 km/h | BUG-05 |
| F6 | The crossbow almost never hits in a real race | `combat.js:44`; probe: 1 hit from 26 shots in a full Medium race | BUG-06 |
| F7 | The CPU barely fights back: a fixed 8-second timer at every difficulty, no leading, no UFO, no pickups | `combat.js:87`; probe: 0 hits on the player in a full Medium race | BUG-07 |
| F8 | The armor rig and shield float off the car during slides, spins, tumbles and jumps, and are the same size on every car | `combat-scene.js:49–50` compared with `render3d.js:169` | BUG-08 |
| F9 | Every weapon hit dents the rear, whatever direction it came from | `combat.js:57` | BUG-09 |
| F10 | No gamepad weapon controls | `app.js:489` | BUG-10 |

**Balance**

| ID | Problem | Evidence | Task |
| --- | --- | --- | --- |
| B1 | The UFO warp wins races by itself: firing it whenever ready took 8.6 s off a race and turned a Hard loss into a win. Level 3 jumps 325 m every 9.9 s | probe; `combat.js:30` | BUG-04 |
| B2 | Combat hits are never scored or rewarded | `combat.js:5`; `game.js` `_finishStage` | CMB-03, SAVE-01 |
| B3 | The rival cannot be wrecked | `combat.js:51–60` | CMB-01 |

**Feel and tidy-up**

| ID | Problem | Task |
| --- | --- | --- |
| P1 | One synthesized tone per weapon | AUD-01 |
| P2 | Pickups are a colored box; you can't tell the weapon at a glance | CMB-04, ART-A |
| P3 | Plain shapes for projectiles and blasts, no fire, lingering smoke or camera shake | VIS-01 |
| P4 | The weapon bar rewrites its labels every frame | BUG-11 |
| P5 | To check: clicking a weapon button may let a later Space press fire it again (`app.js:590`) | BUG-11 |
| H1 | Blasts can "hit" removed traffic cars (no visible effect) | BUG-12 |
| H4 | Radar traps and police still run in Mad Max Duel on two courses | Q5 |
| H5 | Unverified: after a swap the rival's route planner may still think it's on its old shortcut | BUG-03 |

### 2.3 Older code and habits that cause problems today

| ID | Problem | Evidence | Why it matters | Task |
| --- | --- | --- | --- | --- |
| OLD-A | **Agents edit the folder the live game runs from.** The desktop shortcut runs a live-reloading development server on `C:\Users\kyleb\dev\the-duel-remake`, and recent work was done in that same folder | The server log shows 67 automatic page reloads on the afternoon of 22 September, one per saved edit. At 16:10 the live game briefly failed to load because two files didn't exist yet | A reload in the middle of a race forfeits that race's earnings, and a half-copied change can break the game for whoever is playing | FND-01 |
| OLD-B | **Two crash counters.** The original "5 lives" rule still ends ordinary races, while the HUD shows "0 / 5 MAJOR CRASHES", a count only of crashes above 72 km/h | probe: five 64 km/h rock hits → GAME OVER with 0 major crashes. `game.js` `_crash`, `config.js` `LIVES`, `DRIVE.majorImpactMph = 45` mph | The race ends with the HUD saying you had five crashes left | OLD-01, D6 |
| OLD-C | **An old best-time store that isn't separated by player.** `game.js` still writes every finish to `duel_redline_best_v4`, shared by all players on the computer. Its "personal best" flag isn't read anywhere else (checked by search). Real per-player bests live in `progression.js` | `game.js:1640–1684` | Wasted storage that grows forever, and a trap for the next agent who trusts that flag | OLD-02, D7 |
| OLD-D | **Stale handoff docs send agents to the wrong folder.** `docs/SESSION_HANDOFF.md` still says the active worktree is `C:\Users\kyleb\.codex\worktrees\4555`. `docs/DECISIONS.md` still describes point-to-point stages without laps | Those docs | Agents read docs first. Wrong docs mean work in the wrong place | FND-02 |
| OLD-E | **A leftover Codex working copy.** `.codex\worktrees\4555` sits at `fc83e41` with 22 uncommitted files. 20 are identical to what was committed in `7564c7d` (ignoring line endings). `main.js` has one line in a different order, and `VERIFICATION.md` lacks the later notes | Compared file by file | Nothing unique to save, but an agent could resume there on old code | FND-03, D5 |
| OLD-F | **Mixed line endings.** 12 tracked files have both Windows and Unix line endings in the working copy, including `game.js`, `combat.js`, `course.js` and `README.md` | `git ls-files --eol` | Parallel branches then conflict over invisible whitespace | FND-04 |
| OLD-G | **A few files everyone edits.** Of the last 30 commits: `docs/VERIFICATION.md` 25, `README.md` 24, `main.js` 20, `game.js` 17, `app.js` 17, `render3d.js` 17, `src/test.js` 14 | `git log` | Parallel work would conflict on these constantly | FND-05, RFX-01, RFX-02 |
| OLD-H | **Packed code.** `main.js` is 431 lines averaging 187 characters, with one line of 3,274 characters. `leaderboard.js`, `progression.js`, `combat*.js` and others are similarly packed | Line statistics | Hard to review, and it forces tests to slice text (2.1) | RFX-01, RFX-07 |
| OLD-I | **One opponent, hard-wired.** `state.rival` is a single object used throughout race code, collisions, route planning, HUD, map and results | `game.js` | The arena and later warlords need several CPU cars | RFX-03 |
| OLD-J | **All saves in one small store.** Players, records, ghosts (up to 1.25 MB) and settings share the browser's roughly 5 MB local storage. A failed save shows only as one line in the garage footer | `progression.js`, `ghost.js`, `leaderboard.js`, `main.js:283` | The expansion adds kits, war paint, challenges and cards. A full store would stop saving progress | FND-10, IMG-01 |
| OLD-K | **Unpushed work.** `master` is 4 commits ahead of GitHub (all the Mad Max work), and GitHub's newest commit is the one that turned the suite red | `git log origin/main..master` | This PC holds the only copy of the newest work | D4 |

---

## 3. Design

### 3.1 The loop

```
 Pick car + crew + loadout + war paint
              │
              ▼
 Mad Max Duel / Scrapdome / Warlord fight / Daily bounty
   (drive, shoot, bail out, ambush, board, wreck, get wrecked)
              │
              ▼
 Results: time, hits, wrecks, knockdowns, style ──► Wanted poster
              │
              ▼
 Credits (race rules, capped combat bonus) + Notoriety XP
              │
              ▼
 Rank up ─► unlocks: weapons, crew, kits, stencils, events ─► trophy cards
              │
              └──────────────► back to the top
```

### 3.2 Combat core 2.0

**Armor.** Every car in a combat event has armor. Ordinary races, time trials and objective events keep their current rules.

- Base 100, scaled by weight: `clamp(sqrt(mass / 1450), 0.8, 1.6)`. The Viper gets about 80, the Titan 160.
- Weapons, rams and major scenery crashes cost armor. The star shield blocks all of it.
- At zero the car **wrecks**: it explodes (reusing `explosion.js`), recovers at the crash site through existing recovery (up to 12 m clearance), and returns with 60% armor. A wreck costs about 3.5 seconds.
- Wrecks never end a combat event and never touch the crash limit of ordinary races.

**Damage at level 0** (upgrades add 15% per level):

| Source | Armor damage |
| --- | --- |
| Crossbow bolt | 12 |
| Bomb blast | up to 18, less with distance |
| Rocket pod rocket | 10 each |
| RPG | 35 direct, 20 splash |
| Ram above 40 km/h relative speed | relative km/h × 0.2, × 1.5 with a spiked bumper |
| Major scenery crash | 20 |

**Projectiles.** Every projectile starts with the thrower's velocity. Aimed weapons lead the target and get a small homing cone. Blasts have a 0.35 s arming delay near the thrower, and self-damage is at most 25% of normal. Hit checks follow the path between steps, so fast shots can't pass through a car between frames.

**Loadout.** Four car weapon slots. On foot, every crew member carries the RPG, the wrench and one signature item.

**Scoring.** Results gain hits landed, wrecks caused and taken, knockdowns, damage dealt and best combo. Combat style points feed the existing style score.

**Credits.** Same base reward as an ordinary race. Combat bonus: 10 per hit and 100 per wreck, capped at 25% of the base win reward. Manual/Pro doubling follows the existing rule for recurring bonuses. Saved credits are never taken by combat.

**Pickups 2.0.** Crates spawn at seeded positions across the road: weapon recharge, armor repair (+25) or on-foot ammo. CPU cars collect them too.

**One tuning file.** Every combat number lives in `src/wasteland-tuning.js`, so balance work edits one file.

### 3.3 The arsenal

Car-mounted weapons. Recharge times are level 0; each level takes 10–15% off.

| # | Weapon | What it does | Counter | Recharge | Unlock |
| --- | --- | --- | --- | --- | --- |
| 1 | UFO Warp *(reworked)* | Swap places with a car 15–400 m ahead, each keeping its lap history, or warp forward 80 m (+30 m per level). Never past the next checkpoint or inside the last 300 m | Star shield blocks being swapped | 24 s | Owned |
| 2 | Bomb Storm *(reworked)* | 8 bombs (+2 per level) thrown in a ring, carrying the car's speed | Distance, shield | 9 s | Owned |
| 3 | Crossbow *(reworked)* | Leading, lightly homing bolt | Smoke, decoy, shield | 4 s | Owned |
| 4 | Star Shield | Blocks all damage and swaps for 5 s | Wait it out, Tesla Coil | 16 s | Owned |
| 5 | Oil Slick | Rear pool for 6 s. Cars crossing it spin | Steer around | 10 s | Rank 2 |
| 6 | Harpoon | Tethers the target for 3 s, slows it and yanks it sideways | Shield, hard opposite steering | 12 s | Rank 3 |
| 7 | Caltrops | Rear scatter. Grip −25% for 4 s | Steer around | 9 s | Rank 5 |
| 8 | Smoke Screen | Rear cloud for 5 s. Breaks CPU aim and lock-ons | Go around | 14 s | Rank 6 |
| 9 | Rocket Pods | 4 unguided forward rockets | Shield, weaving | 8 s | Rank 7 |
| 10 | Flamethrower | Front or rear cone, 8 armor per second | Distance | 11 s | Rank 9 |
| 11 | Side Saws | 6 s of heavy sideswipe damage | Stay out of reach | 13 s | Rank 11 |
| 12 | Scrap Magnet | Pulls pickups and salvage within 40 m for 6 s | Tesla Coil | 15 s | Rank 13 |
| 13 | Mortar | High shell that lands on the leader's line | Change lanes at the marker | 14 s | Rank 14 |
| 14 | Tesla Coil | Disables weapons and boost of nearby cars for 3 s | Distance, shield | 18 s | Rank 17 |
| 15 | Decoy Drone | Pulls homing shots and lock-ons for 5 s | Tesla Coil | 16 s | Rank 19 |
| 16 | Nitro Ram | 3 s spike charge, +35% speed, triple ram damage | Dodge, oil | 20 s | Rank 21 |

On-foot gear:

| Item | Who carries it | What it does |
| --- | --- | --- |
| Longhorn RPG | Everyone | 3 rockets, 2.2 s reload, 55 m/s. Hold aim on a car for 0.8 s to lock on |
| Wrench | Everyone | Repairs your car by 40 armor over 4 s. A hit interrupts it |
| Sticky Bombs | Nell | Stick to cars, 3 s fuse |
| Grapple | Jax | 25 m line. Pulls you onto a car's roof or up a ledge |
| Hand Flamer | Cinder | Short cone, burn over time |
| Marksman Crossbow | Dune | Zoom, long range, bonus against fighters |
| Scrap Turret | Odessa | Deployable auto-turret, 20 s |
| Smoke Grenades | Wren | Blocks sight and lock-ons |
| Scrap Cannon | Tusk | Heavy blast that shoves cars |

### 3.4 On foot

**Getting out.** Below 40 km/h, hold **F** for 0.4 s to step out. Above 40 km/h, hold **F** for 1 s to **bail out**: you tumble and lose 25 health, and the car coasts and brakes itself. To get back in, stand within 3.5 m of your car and press **F** (0.6 s).

**While you're out.**

- The race clock keeps running. Lap and checkpoint progress belong to the car.
- Your parked car stays solid and can be rammed, bombed or burned. If it wrecks while parked, it respawns in place after 3 s.
- In races you can go up to 150 m from your car. Arenas have their own boundaries.
- Traffic slows for fighters in its lane. On Hard, the CPU tries to run you over.
- Time Trial, ordinary races and objective events have no on-foot play.

**Health and knockdowns.** 100 health. At 0, or when hit by a car above 30 km/h, a fighter is knocked down for 3 s and respawns beside their car.

**Movement.** Walk 4.5 m/s, sprint 7.5 m/s, jump 1.1 m, no slopes steeper than 40°, no swimming, scenery blocks. Movement runs in the fixed simulation step on the course's existing ground and obstacle lookups, repeatable from the same seed and inputs.

**Why get out.** Repair; ambush with the RPG; salvage crates on ledges cars can't reach; traps (sticky bombs, the turret); boarding (grapple onto a car under 90 km/h as Jax, or jump onto one under 50 km/h as anyone, then plant a charge and jump clear).

**CPU crews** get out on Medium and Hard to repair when armor is under 30% and nobody is close. On Hard they also ambush at marked spots.

**Roadside raiders.** Each combat course gets 2–4 ambush zones where 2–4 raiders fire at any passing car.

### 3.5 The crew

Eight original characters plus one secret. Your selected driver still applies driving skills to the car; the crew member is who gets out.

| Crew member | Role | Perk | Signature gear | Unlock |
| --- | --- | --- | --- | --- |
| Rook Calloway | Drifter, all-rounder | +10% on-foot health | RPG handling | Free |
| Nell "Fuse" Okafor | Demolitions | Blasts 20% wider | Sticky Bombs | Rank 4 |
| Jax Harrow | Harpooner | Boards cars up to 90 km/h | Grapple | Rank 8 |
| Odessa Gears | Mechanic | Repairs twice as fast | Scrap Turret | Rank 10 |
| Cinder Ruiz | Flame specialist | Immune to fire | Hand Flamer | Rank 12 |
| Dune Marek | Marksman | Longer lock-on range | Marksman Crossbow | Rank 16 |
| Wren Ashby | Scout | Sprints 20% faster, grabs crates from 4 m | Smoke Grenades | Rank 20 |
| Tusk Brannigan | Heavy | Can shove a parked car | Scrap Cannon | Rank 25 |
| *Secret* | Revealed by the final warlord | | | Warlord 8 |

Figures are built in code from simple shapes, like the cockpit driver in `driver.js`, and posed by code. All figures share one set of instanced limb meshes, so twelve figures cost about as many draw calls as one.

### 3.6 Armor kits

Every car gets **mounting points** (front, rear, roof, left, right, hood, door) from its model's size, with per-car adjustments. Rigs, shields, kits, war paint and the door fighters use all attach there, so everything moves with the car. This also fixes F8.

| Tier | Parts | Unlock |
| --- | --- | --- |
| Scrapper | Scrap plates, bull bar, exhaust stacks | Rank 3, credits per car |
| Raider | Roof cage, tire guards, saw housings, turret mount | Rank 12 |
| Warlord | Full plating, spike crown, each warlord's pieces | Beat that warlord |

Kits add +10 / +20 / +30 armor and otherwise change only looks. Plates break off as armor drops. Below 30% armor the car smokes; below 10% it burns.

### 3.7 Events

**Mad Max Duel** (reworked) on the 11 circuits with a rival, now with raiders and ambush zones.

**The Scrapdome** is a bounded arena: first in the Titan Monster Arena stadium, then on a new **Salt Flats Scrapyard** map. Inside, every car drives freely. Because the opponents list is built early (RFX-03), arena modes support **up to three CPU cars** from the start.

| Mode | Goal |
| --- | --- |
| Last Car Rolling | Wreck the others more times than they wreck you within the time limit |
| Fuel Run | Carry fuel canisters (by car or on foot) to your depot |
| Bounty Hunt | One car is marked. The bounty grows while it survives |
| Ambush Alley | On foot. Hold a scrap fort against raider waves |
| Convoy Raid | Attack an armored tanker rig and its escorts. Board it to finish it |

**Daily bounty board** *(new)*. Three contracts a day, chosen from the date on this computer (no network): for example "Win on Red Mesa with the Viper using only Oil Slick and Harpoon". Extra Notoriety, and a card for a seven-day streak.

### 3.8 Progression and unlocks

**Notoriety** is XP earned only in combat events, over 30 ranks. Rank *n* needs `400 + 150 × (n − 1)` XP, about 90 combat events to max out.

| Action | XP |
| --- | --- |
| Hit / wreck | 10 / 150 |
| On-foot knockdown | 60 |
| RPG direct hit | 40 |
| Ambush hit (from foot on a car) | 75 |
| Raider knockdown | 25 |
| Finish / win | 100 / 300 |
| Challenge / daily contract | 100–1,000 |

| Ranks | Highlights |
| --- | --- |
| 1–5 | Oil Slick, Harpoon, Caltrops, Scrapper kits, Nell, first stencils |
| 6–10 | Smoke Screen, Rocket Pods, Flamethrower, Jax, Odessa, Last Car Rolling |
| 11–15 | Side Saws, Scrap Magnet, Mortar, Raider kits, Cinder, Fuel Run, photo frames |
| 16–20 | Tesla Coil, Decoy Drone, Dune, Wren, Bounty Hunt, Salt Flats Scrapyard |
| 21–25 | Nitro Ram, Tusk, Ambush Alley, chrome stencils |
| 26–30 | Titles, gold card frames, Convoy Raid, final warlord access |

Rank decides what may be bought; credits pay (350–2,500 each). Rank, challenge and warlord rewards are free.

**Challenges.** 40 challenges in four tiers (Scrap, Iron, Chrome, Legend). Examples: wreck a rival with the RPG while on foot; win without the UFO; board a car above 70 km/h; repair from under 10% armor and still win; mortar an airborne car; knock down five raiders in one event; win on Hard with a stock loadout; finish a Fuel Run carrying three canisters on foot.

**Records.** Combat records keyed by event, car, crew member and **build tier**: *Stock*, *Tuned* (up to half the maximum upgrade levels, or a Scrapper kit) or *Maxed*. Existing combat rows stay, marked "legacy build" (Q2).

**Save data.** A versioned `profile.wasteland` object:

```js
wasteland: {
  version: 1,
  xp: 0, rank: 1,
  weapons: { unlocked: ['ufo', 'bomb', 'crossbow', 'star'], levels: { ufo: 0, bomb: 0, crossbow: 0, star: 0 } },
  loadout: ['ufo', 'bomb', 'crossbow', 'star'],
  crew: { unlocked: ['rook'], selected: 'rook' },
  kits: {},          // carId: { owned: ['scrapper'], equipped: 'scrapper' }
  warPaint: {},      // carId: { layers: [...] }
  challenges: {},    // id: { progress, done }
  bounties: { day: null, done: [], streak: 0 },
  warlords: { defeated: [] },
  cards: [],         // { id, kind, earnedAt }
  settledResults: [],
}
```

`profile.weapons.levels` moves into `wasteland.weapons.levels` unchanged. Loading an old save must never throw or lose anything. A backup is written before the move (3.14). Gallery images live in the browser's larger local database (IndexedDB), not in the profile.

### 3.9 The warlord ladder

| # | Warlord | War machine | Style | Reward |
| --- | --- | --- | --- | --- |
| 1 | Sawtooth Sal | Banshee Muscle with side saws | Rams and sideswipes | Side Saws early, Sal's kit |
| 2 | The Dustmonger | Dusthawk Rally | Smoke, oil, shortcuts | Smoke Screen early, dust storm weather |
| 3 | Mother Mirage | Aurora GTR | Warps and decoys | Decoy Drone early, mirror-chrome stencils |
| 4 | Gearhead Gunn | Stuttgart 959-S with a roof turret | Long-range shooting | Rocket Pods early, turret kit |
| 5 | Kettle Kingpin | Titan Monster | Arena crusher | Titan warlord kit, Tusk early |
| 6 | The Twin Vultures | Two raider buggies | Pincer attacks | Grapple range upgrade |
| 7 | The Tollkeeper | Armored tanker convoy | Convoy Raid boss | Convoy kit, Tollkeeper card |
| 8 | Baron Blackiron | Viper Prototype, full arsenal | Everything | Secret crew member, Chrome Crown kit, title |

Each win produces a story card and a wanted poster.

### 3.10 Image creation

#### A. Generated game art

Made by the art lane with Codex's built-in image tool, following `docs/IMAGE_PROMPTS.md`: full prompt recorded, what the image is used for, honest notes. A new `docs/WASTELAND_ART.md` holds the prompt pack. Rules: original characters and vehicles only; nothing from the Mad Max films; no real brands, logos or readable text; no gore; exact cell grids and transparent backgrounds for sheets of small images.

| # | File | Size | Transparent | Used for | Batch |
| --- | --- | --- | --- | --- | --- |
| 1 | `public/assets/reference/wasteland-art-direction.png` | wide | no | Reference board | A |
| 2 | `public/assets/textures/scrap-plating.png` | 1024² tileable | no | Kit plates | A |
| 3 | `public/assets/textures/salt-flat.png` | 1024² tileable | no | Salt Flats ground | D |
| 4 | `public/assets/textures/scrapyard-dirt.png` | 1024² tileable | no | Arena ground | A |
| 5 | `public/assets/textures/chain-link.png` | 512² | yes | Arena fences | D |
| 6 | `public/assets/textures/fire-flipbook.png` | 2048², 8×8 frames | yes | Burning cars, flames | A |
| 7 | `public/assets/textures/explosion-flipbook.png` | 2048², 8×8 frames | yes | Blasts, wrecks | A |
| 8 | `public/assets/textures/smoke-flipbook.png` | 2048², 8×8 frames | yes | Smoke | A |
| 9 | `public/assets/textures/muzzle-dust.png` | 1024², 2×2 | yes | Muzzle flash, dust | A |
| 10 | `public/assets/textures/war-paint-stencils.png` | 2048², 6×4 | yes | 24 stencils | B |
| 11 | `public/assets/reference/wasteland-crew-1.png`, `-2.png` | wide | no | Crew front/side/back sheets | C |
| 12 | `public/assets/ui/crew-portraits.png` | 8 cells of 512×640 | yes | Menus, cards, posters | B |
| 13 | `public/assets/reference/warlord-machines.png` | wide | no | Warlord kits | E |
| 14 | `public/assets/ui/warlord-portraits.png` | 8 cells of 512×640 | yes | Ladder, story cards | E |
| 15 | `public/assets/ui/weapon-art.png` | 4×4 cells of 256² | yes | Armory cards (HUD icons stay drawn in code) | B |
| 16 | `public/assets/ui/card-frames.png` | 4 frames | yes | Card rarity frames | B |
| 17 | `public/assets/ui/poster-paper.png` | 1024×1536 | no | Wanted poster background | B |
| 18 | `public/assets/ui/rank-emblems.png` | 6 cells | yes | Tier emblems | B |
| 19 | `public/assets/ui/wasteland-key-art.png` | 1920×1080 | no | Menu background | E |

`src/wasteland-art.js` lists each image with its size, transparency and a code-drawn stand-in, so a missing image never breaks the build or the tests. `tools/check-art-intake.mjs` checks size, transparency, file budget and recorded prompt for every image present.

#### B. Player-made images

**War Paint Studio** (garage). Up to 12 layers per car: stencil, color, panel, position, size, rotation, mirror. Projected onto the body with Three.js decal geometry, so it works on every car without new texture layouts. Saved as a small list of layers per player and car. A text **share code** exports and imports designs offline. Paint never changes performance or records.

**Photo Mode** (pause menu). Free camera within 30 m of your car, kept out of the ground. Field of view, tilt, looks (*Wasteland Sepia*, *Bleach*, *Night Vision*, *Comic Ink* on High), grain, vignette, frames. HUD hidden. Capture at 1× or 2×. Save to the gallery or download as PNG. Both quality settings get the full look, because the paused frame is rendered once with the extra effects.

**Rewind** *(new, stretch)*. The game keeps the last ten seconds of what the renderer needs (car poses, projectiles, blasts, fighters) at 10 samples per second. In photo mode you can scrub back to catch the explosion. The same buffer powers an optional wreck replay on the results screen. It's picture-only and never changes race state.

**Wanted Posters** on the results screen of combat events: a hero shot of your car, your crew portrait and your stats.

**Trophy Cards** for every unlock, shown on a Trophy Wall. Existing unlocks are backfilled.

**Gallery.** Per player, in IndexedDB, up to 60 images plus cards, 320 px thumbnails. Asks before removing anything. If the browser blocks storage, the gallery says so and downloads still work.

### 3.11 Audio

Sounds follow the existing process (`docs/AUDIO_EXPANSION.md`, `tools/prepare-audio.mjs`, credits): rocket launch and flight, three explosion variants, bolt release and metal impact, harpoon and chain, flamethrower, oil splash, footsteps on dirt and metal, car door, plate clang, turret. UFO warble and shield hum stay synthesized. Crew lines are text callouts (Q4).

### 3.12 Controls

**In the car (keyboard):** arrows drive (W/S also work as pedals), Space boost, Q/E shift, 1–4 weapons, **F** get out (tap below 40 km/h, hold above), D chase camera, C/B/V/X other cameras, Esc or P pause, R restart.

**On foot:** WASD move, mouse look and aim (the pointer locks on click; Esc releases it and pauses), left click fire, right click aim or zoom, Shift sprint, Space jump, 1–3 gear, F get in, board or pick up. Reloading is automatic, so R still means restart.

**Gamepad:** D-pad fires weapons or picks gear; X gets out and in; on foot the left stick moves, right stick aims, right trigger fires, left trigger aims, A jumps. Existing bindings stay.

**HUD.** Slot bar with cooldown rings, armor bars for every car in the fight, markers over opponents, hit markers and a damage-direction arrow. On foot: reticle, ammo, health, an arrow and distance to your car. HUD text changes only when its value changes.

### 3.13 CPU behavior

| | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Reaction time | 1.2 s | 0.8 s | 0.5 s |
| Aim error | 10° | 6° | 3° |
| Shields against an incoming shot | 30% | 50% | 70% |
| Uses pickups | no | yes | yes |
| Crew gets out | never | to repair | to repair and ambush |
| Runs over fighters | no | sometimes | on purpose |

Warlords add a personality on top.

### 3.14 Player safety features *(new)*

- **Career backup.** Players → Export career downloads a file; Import career restores it after a check. The game also keeps an automatic backup in IndexedDB before any save format change.
- **Experimental menu.** Menu → Experimental switches on features that are in `beta` (section 4.4) for this computer only.
- **Updates never interrupt a race.** The live game uses the existing menu-only "Reload" notice (FND-01).

---

## 4. How the work runs without pausing

### 4.1 Principles

1. **The live game is never a workspace.** Builders work in their own copies; only a finished, tested build reaches the live folder.
2. **Automatic checks decide when something is done.** Kyle's play-testing steers priorities but never blocks the flow.
3. **Unfinished features ship switched off.** Every feature sits behind a switch, so half-built work can merge safely.
4. **Small changes, merged often.** At most about five files and 400 changed lines per task, not counting tests and data.
5. **Independent checking.** Tests come from the spec before the code, and someone other than the author reviews.
6. **Pin behavior before moving code.** Recorded race replays prove that a restructuring changed nothing.
7. **Stop the line, not the work.** When the combined build is red, only fixes merge. Everyone else keeps building on their own branch.

### 4.2 Branches and folders

| Branch | Folder | Who changes it |
| --- | --- | --- |
| `master` | `C:\Users\kyleb\dev\the-duel-remake` (live game) | Release Manager only, under the standing release rule |
| `integration/wasteland` | `C:\Users\kyleb\dev\the-duel-integration` | Integrator, one merge at a time |
| `lane/<lane>/<task>` | Codex app worktrees under `C:\Users\kyleb\.codex\worktrees\` | That lane |
| `spike/<name>` | Its own worktree | Throwaway experiments; never merged directly |

Each lane uses its own port (see the playbook), so its browser saves can never touch the live game's saves on port 5174.

### 4.3 Test tiers and gates

| Tier | Command (after FND-06) | Contents | Target time |
| --- | --- | --- | --- |
| smoke | `node tools/run-tests.mjs --tier smoke` | Every module loads, plus about ten quick suites | 30 s |
| lane | `node tools/run-tests.mjs --tier lane --changed --jobs 8` | Smoke, every suite that imports a changed file (found by reading imports), replay fingerprints | 5 min |
| merge | `node tools/run-tests.mjs --tier merge --jobs 12` plus build and browser smoke | Every suite except the long campaign runs, all run to the end even after a failure | 10 min |
| full | `node tools/run-tests.mjs --tier full --jobs 12` | Everything, with the campaign runs split into parallel shards | 15 min |

| Gate | When | Must pass |
| --- | --- | --- |
| Lane gate | Before review | lane tier, production build |
| Merge gate | Before each merge into integration | merge tier, build, browser smoke with zero console errors, fingerprints unchanged unless the card says behavior changes |
| Full check | Before every release, and after every five merges into integration | full tier, balance targets, browser scenarios for every feature switch, frame pacing compared with the last release, art check, storage budget |
| Release gate | Before touching the live folder | full check green on that exact commit, change notes compiled, feature switch list reviewed |

There is no overnight schedule. The Integrator starts the full check itself, while you're working, and it takes about 15–45 minutes. It runs in its own folder, so the live game isn't touched. It uses at most half the computer's processor threads so a game being played stays smooth. The frame-rate part measures a scripted race in a hidden browser. If the computer is busy (for example, someone is playing), that part is marked "not measured" rather than failed, and runs again next time.

### 4.4 Feature switches and releases

`src/feature-flags.js` holds one switch per feature, in one of three states:

| State | Visible where | Moves on when |
| --- | --- | --- |
| `dev` | Test builds and `?flags=` | Its acceptance tests and browser scenario pass two full checks in a row → `beta` |
| `beta` | Player build, behind Menu → Experimental | Kyle plays it, or three days pass with no serious play-test note → `on` |
| `on` | Everyone | The switch is removed after one clean release |

A release (standing rule D3): full check green → Release Manager fast-forwards `master`, builds, keeps the previous build for rollback. The running game offers "Reload" from its menu. A plain-language "What's new to try" note goes into `docs/playtest-inbox.md`.

### 4.5 Stop the line and escalation

- Integration red → a fix card goes to the top. Only fixes merge until green.
- Three review rounds without a clean result → the card returns to the Director to be split.
- A change that needs a file outside its card → the lane stops and asks the Director.
- A question the spec can't answer → the Director decides, logs it and carries on (4.7). Kyle sees the decision log and can reverse anything.

### 4.6 Kyle's touchpoints

- Once: the standing decisions in section 15.
- Whenever: play, with Experimental on to try `beta` features. Notes go to the Director or `docs/playtest-inbox.md`.
- Weekly: a one-page plain-language summary from the Director.
- Anytime: "stop", "roll back" or "change priority".
- **Requests from other players** (including Kyle's son) go into `docs/playtest-inbox.md` or to the Director like any other note. New content can go straight onto the board. Anything that changes an existing rule, control or another player's save waits for Kyle's OK.

---

### 4.7 Running on its own

Goal: Codex works through every wave, one after another, with nobody at the keyboard. These rules make that possible.

**Pre-approved scope.** Everything this spec describes is approved, including new events, the Salt Flats map, ambush zones, save format changes with backups, releases under D3 and pushes under D4. Agents never stop to ask about anything written here.

**Decide, log, continue.** When the spec doesn't answer a question, the Director picks the option that best fits the spec's principles and feel targets. It records the choice in `docs/board/decisions.md` with its reasons and how to reverse it, and work continues. Kyle can reverse any logged decision later. Only four things park a card for Kyle, and a parked card never stops the run:

1. Anything on the "never" list.
2. A new dependency or network use.
3. A change to an existing rule, control or another player's save that the spec doesn't describe.
4. Deleting data the spec doesn't name.

**Never stuck.** A card that fails three review rounds is split once. If a piece fails again, or a wave misses its finish line three times, the work is parked with a written reason, and the run moves to the next ready card. The run only stops when no card is ready, the budget is spent, or Kyle says stop.

**One place to resume.** `docs/board/board.yaml`, `docs/board/run-log.md` and `docs/board/waves/` hold the whole state. A fresh Codex session can pick up exactly where the last one ended using the resume prompt in the playbook. Nothing important lives only in a conversation.

**Budget.** Kyle sets a budget when starting a run (for example, "until M2" or a share of Codex usage). Before starting each card the Director checks the budget. When about 10% is left, it finishes the cards in progress, runs a full check, writes a handoff in `run-log.md` and stops cleanly.

**Permissions checked up front.** Setup task FND-12 gives the run what it needs without mid-run approval prompts: writing inside the integration folder and its lane folders, writing to the live folder for releases, network access for `npm ci`, and starting Chrome. A dry run proves no step asks for approval.

**Parallel lanes in one session.** Codex's helper agents share one folder and may not be able to start helpers of their own. So in autonomous mode the Director creates a separate worktree for each lane inside the integration folder (`.lanes/<lane>`, excluded from Git). It points each lane's helpers at that folder and starts every helper itself: test_author, builder, test_runner, reviewer and critics, in order. See the playbook, section 14.

## 5. Agent team

Full details, agent files and prompts are in [`docs/CODEX_PLAYBOOK.md`](docs/CODEX_PLAYBOOK.md). In short:

```
 Kyle ──► Director (plans, never writes game code)
            │ task cards
            ▼
 Up to 4 builder lanes at once, each in its own worktree
   inside each lane, in order: test_author → builder → test_runner → reviewer
   plus save_guardian / browser_qa / balance_analyst when the card says so
            │ change note: ready-to-merge
            ▼
 Integrator (merge queue + merge gate, runs the full check)
            │
            ▼
 Release Manager (the only agent in the live folder)

 Alongside: Art lane (images and sounds) and Discovery (read-only bug hunting)
```

Why this shape gives the best result:

- **Codex's helper agents share their parent's folder**, so parallel coding uses separate threads in separate worktrees (Codex app "Worktree" mode). Helpers inside a thread write tests, run checks and review.
- **Nobody grades their own work.** Tests come before the code and from a different agent; review is done by a fresh agent with no stake in the change.
- **Files have owners**, and the busiest files have one owner at a time, so merges stay clean.
- **Decisions come from gates**, not from how confident an agent sounds.

Lanes: OPS, TOOL, SIM, CMB (combat and on foot), VIS (3D), UI (menus, HUD, input), SAVE (saves, rewards, records) and ART.

---

## 6. Tech stack

- JavaScript ES modules. No TypeScript, no framework.
- Three.js 0.171.0 (including `three/addons` for decals and post effects), Vite 8.0.16.
- Node.js 22.12 or later, which includes the built-in WebSocket used by the browser harness.
- Google Chrome (installed) driven headless by the harness through its DevTools protocol.
- Storage: `localStorage` for profiles, records and settings; IndexedDB for the gallery and backups.
- No new dependencies without asking.

## 7. Commands

```bash
npm ci
npm run dev                                   # lane folders only, never the live folder
node tools/run-tests.mjs --list
node tools/run-tests.mjs --tier lane --changed --jobs 8
node tools/run-tests.mjs --tier merge --jobs 12
node tools/run-tests.mjs --tier full --jobs 12
npm run build
npm run qa:build
node tools/browser-harness.mjs smoke
node tools/browser-harness.mjs scenario <name>
node tools/combat-balance.mjs --runs 12
node tools/check-art-intake.mjs
```

Until FND-06 lands, the existing commands apply (`npm test`, `--filter`, `DUEL_SKIP_CAMPAIGNS=1`). Always report skipped runs.

## 8. Project structure

The repo keeps its flat `src/` layout. New files use prefixes so they group together.

**Foundation (new):**

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Rules every Codex agent reads first |
| `.codex/agents/*.toml` | Helper agents (see playbook) |
| `.gitattributes` | LF line endings for text, binary markers for assets |
| `docs/OPERATIONS.md` | The one current guide to folders, ports, live server, release and rollback |
| `docs/board/board.yaml` | Task cards and status (Director only) |
| `docs/board/checks/` | Full check reports |
| `docs/changes/` | One change note per task |
| `docs/playtest-inbox.md` | Kyle's notes and "What's new to try" |
| `src/feature-flags.js` | Feature switches |
| `tools/test-campaigns.mjs` | The campaign runs, moved out of `src/test.js`, split into shards |
| `tools/replays/` | Recorded inputs and expected fingerprints |
| `tools/browser-harness.mjs`, `tools/scenarios/` | Headless browser checks without new dependencies |
| `tools/fixtures/saves/` | One save file per historical save shape |

**Restructured (behavior unchanged):**

| From | To |
| --- | --- |
| `src/main.js` | A small router plus `src/screen-*.js` modules (menu, garage, armory, courses, players, leaderboard, results, HUD) and matching CSS files |
| `src/game.js` | The `Duel` class plus `src/sim-drive.js`, `sim-contacts.js`, `sim-rival.js`, `sim-police.js`, `sim-laps.js`, `sim-crash.js`, `sim-results.js` |
| `src/combat.js` | `combat-weapons.js`, `combat-projectiles.js`, `combat-pickups.js`, `combat-ai.js`, and `wasteland-tuning.js` for numbers |
| `src/app.js` input code | `src/input-contexts.js` (car, foot, menu, photo) |
| `src/render3d.js` per-car extras | `src/vehicle-attachments.js` registry |

**New features:** as in v1: `combat-armor.js`, `combat-scoring.js`, `onfoot.js`, `raiders.js`, `scrapdome.js`, `wasteland-progress.js`, `crew.js`, `warlords.js`, `armor-kits.js`, `challenges.js`, `bounties.js`, `vehicle-sockets.js`, `armor-kit-meshes.js`, `combat-effects.js`, `fighter-figure.js`, `onfoot-camera.js`, `war-paint.js`, `photo-mode.js`, `rewind-buffer.js`, `poster-composer.js`, `gallery-store.js`, `career-backup.js`, `wasteland-art.js`, `combat-hud.js`, `wasteland-ui.js`, plus `tools/combat-balance.mjs`, `tools/check-art-intake.mjs`, `docs/WASTELAND_ART.md`.

## 9. Code style

New and restructured modules use the readable style of `game.js` and `drivers.js`, not the packed single-line style.

```js
import { clamp } from './config.js';
import { TUNING } from './wasteland-tuning.js';

// Car and on-foot weapons share one catalog. Values are level 0; upgrades
// scale them through weaponStats() and never edit the catalog itself.
export const WEAPONS = Object.freeze({
  crossbow: Object.freeze({ id: 'crossbow', name: 'CROSSBOW', mount: 'car', ...TUNING.crossbow }),
  rpg: Object.freeze({ id: 'rpg', name: 'LONGHORN RPG', mount: 'foot', ...TUNING.rpg }),
});

export function weaponStats(id, level = 0) {
  const base = WEAPONS[id];
  if (!base) return null;
  const lv = clamp(Math.floor(level), 0, 3);
  return { ...base, level: lv, cooldownSec: base.cooldownSec * (1 - .15 * lv), damage: base.damage * (1 + .15 * lv) };
}
```

- ES modules, named exports, two-space indent, semicolons, single quotes, LF line endings.
- Data catalogs are frozen. Ids are short lowercase or snake case, matching `falcone_f42`.
- Simulation systems are functions that take the `Duel` and change `duel.state`. Renderer, HUD and menus read state only.
- Simulation seconds for timers; the seeded generator in `rng.js` for random choices.
- Internal speeds stay in mph and distances in metres; everything shown is km/h.
- Comments explain rules and reasons.
- Fixed-size visual pools; no allocation per frame during a fight.
- Tests import real functions; no new tests that slice source code as text.
- Each test file prints one summary line with its check count.

## 10. Testing strategy

| Level | What | Where |
| --- | --- | --- |
| Rules | Weapons, armor, wrecks, pickups, knockdowns, getting in and out, boarding, migration, ranks, challenges, bounties, war paint model, gallery store, poster layout | `tools/test-*.mjs` |
| Behavior pinning | Recorded inputs replayed for every event and mode at 30, 60 and 144 FPS; fingerprints must match | `tools/replays/`, `tools/test-replays.mjs` |
| Balance | Autopilot races per difficulty and weapon policy against the targets in section 13 | `tools/combat-balance.mjs`, `tools/test-combat-balance.mjs` |
| Saves | Every historical save shape loads without loss; storage budget with maximum content | `tools/fixtures/saves/`, `tools/test-save-fixtures.mjs`, `tools/test-storage-budget.mjs` |
| Browser | Smoke plus one scenario per feature switch: menus, races in both quality settings, rigs and kits on all nine cars, figures, effects, HUD at 390×844, photo capture, war paint, gallery with storage blocked | `tools/browser-harness.mjs`, `tools/scenarios/` |
| Frame pacing | Combat race and arena fight compared with an ordinary race on the same route and settings | harness scenario plus `tools/menu-check.html` |
| Whole game | Every existing suite, including the campaign runs, in every full check | full tier |

Rules:

- A bug fix starts with a failing test that shows the bug.
- Never weaken an existing assertion to pass. Changing one needs reviewer approval and a reason in the change note.
- A restructuring task must leave every fingerprint unchanged. A behavior change and a restructuring never share a task.
- Scene signatures change only with a reviewed screenshot.
- QA tools never touch real player saves.

### 10.1 Refinement loops for look, sound and feel

Tests prove things work. These loops make them good. Every card that changes something seen or heard runs the matching loop before it can be merged. The polish waves (12.2) run all three again across whole features.

**First pass is never final.** Every loop runs at least two rounds, even when round one scores well, and at most five. If round five still falls short, the card merges with its remaining issues filed as cards for the next polish wave.

**Look loop (graphics)**

1. browser_qa captures the card's shot list: fixed camera setups, for example close-up, chase camera at speed, a night course, High and Performance quality, and 390×844 phone size for screens. Same shots every round, so rounds compare side by side.
2. The `art_critic` helper scores each shot from 1 to 5 against this rubric:
   - Matches the art direction board and the existing game's style.
   - Reads clearly at racing speed: you can tell what it is in half a second.
   - Grounded: no floating, clipping or parts detached from the car.
   - Materials and lighting consistent with the scene, day and night.
   - Motion and timing: effects grow, peak and fade believably.
   - Doesn't hide the road, the HUD or the rival.
   - Frame cost within the card's budget.
3. Pass when every item scores 4 or better and nothing is marked broken. The builder fixes the lowest scores first.
4. Before and after contact sheets go to `docs/board/looks/<card>/`, so Kyle can glance through them whenever he likes, without blocking anything.

**Sound loop**

Sound is judged against what's happening in the race, not only cue by cue.

1. **Record a real race.** The harness plays a scripted race in real time in headless Chrome and records the game's audio. It records the full mix and each part separately (engine, tires, weapons and impacts, ambience, UI), by tapping each part's volume control in `audio.js`. At the same moment it writes an event log with the simulation time of every explosion, hit, gear shift, landing, pickup and crash, plus engine revs, speed, throttle and the rival's position every frame.
2. **Measure against the event log** (`tools/audio-analysis.mjs`, no new dependencies):
   - **Sync:** each explosion, hit, gear shift and landing sound starts within 30 ms of its event. No event is missing its sound, and no sound plays without an event.
   - **Engine matches the revs:** the engine's pitch, tracked frame by frame, follows the revs (correlation of 0.9 or better, lag under 50 ms). Throttle changes change the engine's loudness and tone. Gear shifts show a visible drop in pitch.
   - **Loudness over the race:** loudness measured every 400 ms for the mix and each part. Weapons and impacts sit clearly above the engine when they fire (at least 6 dB over the engine in the same moment) without drowning it. The engine is never too soft to follow at full throttle. Ambience stays under both. No stretch of the race gets steadily louder or softer by accident.
   - **Clean signal:** no clipping (peaks at or below −1 dBFS), no clicks where sounds start, stop or loop, no gaps in engine or tire loops.
   - **Space:** sounds from the rival and from blasts are panned to the side they happen on and get quieter with distance.
   - **Variety:** a cue heard often (hits, footsteps, bolts) never repeats identically twice in a row.
   - **Stress:** six blasts plus engine, tires and a weapon all at once stay clean and keep the engine audible.
3. **Look at it.** The analysis also draws a spectrogram and loudness graph of the race as images, with event markers on top. The `audio_qa` helper examines them for problems the numbers can miss: a sound that starts before its explosion flash, an engine tone that flattens while the revs climb, a blast buried under tire noise, harsh frequency spikes.
4. **Pass** when every measurement meets its target and the helper finds no problems in the images. Kyle and Gratian still get "listen to" notes in each release; their notes feed the next polish wave's sound round, but nothing waits on them.

The same recording also checks the existing driving sounds (engine, tires, ambience) in the whole-game pass (REL-00), so older sound problems get caught too.

**Feel loop (gameplay)**

1. A "feel lab" script plays scripted races and records: time between explosions, time to first combat, hit rates, wrecks per race, lead changes, how often the trailing car catches up, race time compared with an ordinary race, how often CPU crews get out, and win rates by difficulty (targets: Easy 80–95%, Medium 45–65%, Hard 20–40% for the standard autopilot).
2. The balance_analyst changes numbers in `wasteland-tuning.js` one at a time toward the targets in 12.4 and section 13.
3. Pass when every feel target for the wave is met. Results and the before and after table go into the card's change note.

## 11. Boundaries

**Always:**

- Work in a lane worktree, never in the live folder (Release Manager excepted).
- Keep race rules inside `Duel.step`, repeatable and runnable without graphics.
- Put new features behind a switch.
- Carry old saves forward without loss, with a backup before any save format change.
- Record prompt and use for every generated image. Original art only.
- Write a change note per task, in plain language without em dashes.
- Run the lane gate before review and report any skipped runs.
- Leave ordinary races, time trials and objective events behaving exactly as now, unless a card says otherwise and Kyle approved it.

**Standing approvals once Kyle agrees (section 15):**

- Lanes commit on their own branches; the Integrator merges into `integration/wasteland` (D2).
- The Release Manager releases under the standing rule (D3) and pushes for backup (D4).
- Feature switches move `dev` → `beta` → `on` by the rules in 4.4.

**Ask Kyle first:**

- Adding a dependency, network use or CI service.
- Changing rewards, prices or rules of non-combat events.
- Changing how non-combat records are keyed.
- Deleting files, saves, records or gallery data beyond what a card states.
- Changing course geometry or feature lists beyond what this spec describes. Ambush zones, salvage ledges, the Scrapdome and the Salt Flats map are described here and pre-approved.
- Recorded voice lines, or renaming the mode.
- Anything on port 5174 or with real player saves.
- A change to an existing rule, control or another player's save requested by anyone other than Kyle.

**Never:**

- Edit, build or serve from the live folder outside a release.
- Network requests, accounts or API keys at runtime, including in-game AI image generation.
- Film likenesses, costumes or symbols, real logos, or gore.
- Take saved credits through combat, fines or forfeits.
- Skip or delete failing tests to get green.
- Regenerate scene signatures without a reviewed screenshot.
- Delete the shared `.git` folder or force-remove a worktree.

---

## 12. The plan

### 12.1 What runs in parallel and what must wait

**Must wait (one after another):**

- **FND-04 (line endings) before any branch is made.** Otherwise every branch conflicts over whitespace.
- **FIX-01..03 before the integration branch opens.** Gates can't work on a red suite.
- **FND-07 (replay fingerprints) before any restructuring.** Behavior has to be pinned before code moves.
- **One owner per busy file.** `game.js`: BUG hooks → OLD-01/02 → RFX-02 → RFX-03, then feature work in the new modules. `main.js`: BUG-01/10/11 → FIX-03 → RFX-01, then UI features.
- **Fix before restructure.** A bug in a file about to be split is fixed first, as a small behavior change, then the file is split with no behavior change.
- **Save format change after save fixtures and backups** (FND-10, FND-11 before PRG-01).
- **Combat core after the opponents list** (RFX-03 before CMB-01), so combat is written for several opponents from day one.

**Runs in parallel:**

- Lanes with separate files: SIM restructuring, UI restructuring, VIS attachments and SAVE fixtures all at once.
- The image creation track runs beside the combat track from Wave 4, because it barely touches combat code.
- Art, audio and discovery run all the time.
- Spikes run early on throwaway branches (FOOT-00 during Wave 2).

```
 FND-04 ─► FIX-01..03 ─► FND-05: integration opens
                          │
   ┌──────────────┬───────┴──────┬───────────────┬──────────────┐
   ▼              ▼              ▼               ▼              ▼
 TOOL           SAVE           UI              CMB            VIS
 FND-06..09     FND-10,11      BUG-01,10,11    BUG-02..07,     BUG-08
   │              │            OLD-01 (HUD)    09,12
   ▼              │              │               │              │
 SIM: OLD-02 ─► RFX-02 ─► RFX-03 ─────────────► RFX-04 ◄────────┤
                  │            UI: RFX-01,05    │         VIS: RFX-06
                  ▼              ▼              ▼              ▼
             Wave 3: combat core 2.0 (CMB, VIS, UI, SAVE, TOOL)
                  │                         ╲
                  ▼                          ╲─► Wave 4: unlocks + image creation
             Wave 5: on foot                       (parallel track)
                  ▼
             Wave 6: arsenal, crew, raiders ─► Wave 7: Scrapdome ─► Wave 8: warlords
                                                                     ▼
 Art, audio and discovery run alongside every wave                Wave 9: polish
```

**Critical path:** FND-04 → FIX-01..03 → FND-05 → FND-07 → RFX-02 → RFX-03 → RFX-04 → CMB-01 → FOOT-01..05 → CREW-03 → ARENA-01..07 → WAR-01..04.

**Lane load by wave** (at most four code lanes busy):

| Wave | TOOL | SIM | CMB | VIS | UI | SAVE | ART |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | runner, replays, harness, switches | FIX-01 | | FIX-02 | FIX-03 | fixtures | batch A prompts |
| 1 | balance tool | OLD-02 | BUG series | BUG-08 | BUG-01/10/11, OLD-01 | backups | batch A |
| 2 | | RFX-02, RFX-03 | RFX-04 | RFX-06 | RFX-01, RFX-05 | RFX-07 | |
| 3 | balance gates | | armor, AI, scoring | effects, kits | combat HUD | credit bonus | audio |
| 4 | | | | photo, war paint, rewind | Armory 2.0, studio | progress, gallery | batch B |
| 5 | | | on-foot rules | figures, camera | on-foot HUD, input | | batch C |
| 6 | | ambush zones | arsenal, crew, raiders | raider visuals | crew screens | crew data | audio 2 |
| 7 | | arena bounds | arena modes | Salt Flats | arena UI | arena records | batch D |
| 8 | | | warlord AI | warlord kits | ladder | rewards | batch E |

### 12.2 Tasks

Format: **ID Title** · lane · needs · size (S focused session, M two or three, L a week or more). Each task lists when it's done, how it's checked and which files it owns. Helpers default to test_author, test_runner and reviewer; extra helpers are named.

#### Wave 0 – Make parallel work safe

- [ ] **FND-01 Live game safety** · OPS · needs D1 · S
  - Done when: the desktop shortcut serves the built game (`vite preview`) on `localhost:5174` with the same saves, instead of the live-reloading dev server. The menu's "Reload" notice still appears after a release.
  - Check: launch from the shortcut, confirm players and balances, save a harmless edit in the live folder and confirm no page reload (then revert); the launcher log shows no "page reload" lines.
  - Files: `start-game.bat`, `docs/OPERATIONS.md`
- [ ] **FND-02 One current operations guide** · OPS · S
  - Done when: `docs/OPERATIONS.md` states folders, ports, live server, release and rollback. `SESSION_HANDOFF.md`, `SERVER_CUTOVER.md` and `DECISIONS.md` open with a "history only" banner that points to it.
  - Check: a debt_hunter reading the docs cold finds no instruction pointing at the old worktree.
  - Files: those four docs
- [ ] **FND-03 Retire the old Codex working copy** · OPS · needs D5 · S
  - Done when: its two non-identical files are recorded in the change note, it is removed with `git worktree remove` (never forced), and its branch is kept.
  - Check: `git worktree list`.
- [ ] **FND-04 Line endings** · OPS · S · first commit on the new base
  - Done when: `.gitattributes` sets LF for text and marks binaries; one renormalizing commit; zero files with mixed endings.
  - Check: `git ls-files --eol` shows no `w/mixed`; all tests give the same results as before.
- [ ] **FIX-01 Refresh the saved route data** · SIM · S
  - Done when: presets regenerated with `--verify-solvers`, every solved route identical to the saved one apart from the source fingerprint, `test-shortcut-presets` passes.
  - Files: `src/generated-shortcut-presets.js`
- [ ] **FIX-02 Freestyle scene signature** · VIS · S · helpers browser_qa
  - Done when: a screenshot of the drag strip is reviewed, the `titan-freestyle` signature is updated with the reason, the other 15 signatures are unchanged.
  - Files: `tools/test-world-composition.mjs`
- [ ] **FIX-03 Menu eligibility test** · UI · S
  - Done when: the test's element list includes the custom-rival elements and it passes. The note points to RFX-01, which replaces the text slicing.
  - Files: `tools/test-course-eligibility.mjs`
- [ ] **FND-05 Integration branch and agent setup** · OPS · needs D2, FND-04, FIX-01..03 · S
  - Done when: `integration/wasteland` is created from green `master`, and `AGENTS.md`, `.codex/agents/*.toml`, `docs/board/board.yaml` (seeded with this plan), `docs/changes/` and `docs/playtest-inbox.md` are installed as in the playbook.
  - Check: Codex summarizes the loaded instructions correctly; one dry-run card flows lane → integrator.
- [ ] **FND-06 Faster, complete test runs** · TOOL · needs FND-05 · M
  - Done when: `run-tests.mjs` gains `--jobs`, `--keep-going`, `--tier`, `--changed` (from imports) and `--json`. The campaign runs move from `src/test.js` into `tools/test-campaigns.mjs` with shards. The full tier finishes in under 15 minutes on this PC.
  - Check: on the same commit, the same set of files passes and fails as with the old runner; `test-test-runner.mjs` is extended.
  - Files: `tools/run-tests.mjs`, `src/test.js`, `tools/test-campaigns.mjs`, `tools/test-test-runner.mjs`, `package.json`
- [ ] **FND-07 Replay fingerprints** · TOOL · needs FND-05 · M
  - Done when: `tools/replays/` holds recorded inputs covering all 16 events and every mode (duel, time trial, Mad Max, chase, drift, checkpoint rush, stunt, practice), with fingerprints at 30, 60 and 144 FPS, checked by `test-replays.mjs`.
  - Check: fingerprints are stable across three runs; a deliberate one-line physics change makes them fail.
- [ ] **FND-08 Browser harness** · TOOL · needs FND-05 · M
  - Done when: `node tools/browser-harness.mjs smoke` builds the QA bundle, serves it on a free port, drives headless Chrome through its DevTools protocol using Node's built-in WebSocket (no new dependency) with a throwaway profile, reports console errors and saves screenshots. Scenarios live in `tools/scenarios/`. Smoke covers the menu and one race in each quality setting.
  - Check: a deliberate console error makes smoke fail.
- [ ] **FND-09 Feature switches** · TOOL · needs FND-05 · S
  - Done when: `src/feature-flags.js` supports `dev` / `beta` / `on`, `?flags=` in QA builds, a per-computer Experimental toggle, and switch overrides in tests.
- [ ] **FND-12 Autonomous run setup** · OPS · needs FND-05 · S
  - Done when: a Codex profile for the run allows writing in the integration folder, its `.lanes/` worktrees and the live folder, plus network for `npm ci` and launching Chrome. The `art_critic`, `audio_qa` and `feel` tools are installed. `docs/board/decisions.md`, `run-log.md` and `waves/` exist.
  - Check: a dry run takes one tiny card through the whole pipeline, including a release to a copy of the live folder, with zero approval prompts.
- [ ] **TOOL-02 Feel lab and audio checks** · TOOL · needs FND-08 · M
  - Done when: `tools/feel-lab.mjs` records the feel measurements in 10.1. The harness records a real-time scripted race's full audio mix and separate parts, with an aligned event log. `tools/audio-analysis.mjs` measures sync, engine-to-revs tracking, loudness over time, clipping, clicks, panning and variety, and draws spectrogram and loudness images with event markers.
  - Check: deliberately delaying the explosion sound by 100 ms, or freezing engine pitch, makes the analysis fail.
- [ ] **FND-10 Save fixtures and storage budget** · SAVE · needs FND-05 · M · helpers save_guardian
  - Done when: `tools/fixtures/saves/` has one fixture per historical save shape (single profile, player list, and each later addition: drivers, courses, race settings, weapons); all load without loss; a storage budget test with maximum content stays under 4 MB for the whole address.

#### Wave 1 – Fix what's broken

CMB tasks all touch `combat.js`, so one CMB lane does them in this order: BUG-12, BUG-09, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06, BUG-07.

- [ ] **BUG-01 Arrow-key driving layout** (F1) · UI · needs FND-06 · S
  - Done when: arrows steer; A and D never steer in the car; D resets the chase camera; W/S still work as pedals.
  - Check: corrected assertions in `test-keyboard-steering.mjs` and `test-road-powerups.mjs` fail before and pass after.
  - Files: `src/keyboard-steering.js`, those two tests
- [ ] **BUG-02 Swaps keep lap history** (F2) · CMB · S
  - Done when: both drivers keep their earlier lap times; a lap completed through a swap is flagged and never sets a best lap.
- [ ] **BUG-03 Safe swap landing** (F3, H5) · CMB · S · hook `src/npc-route.js`
  - Done when: swaps exchange position, heading and route context; both cars get 1.2 s without crash damage and a speed cap for the new spot; the rival's route planner resets.
  - Check: 100 seeded swaps across all 11 combat courses, including shortcut positions, cause zero crashes in the 2 s after landing.
- [ ] **BUG-04 UFO rebalance** (F4, B1) · CMB · S · helpers balance_analyst
  - Done when: swaps need a 15–400 m gap; warps go 80 m + 30 m per level, never past the next checkpoint or inside the last 300 m; recharge 24 s, −10% per level.
  - Check: firing the UFO whenever ready gains at most 4 s over two laps, at stock and at max level.
- [ ] **BUG-05 Bombs carry the car's speed** (F5) · CMB · S
  - Check: own blasts cut the thrower's speed by at most 15% at 48, 97, 193 and 320 km/h.
- [ ] **BUG-06 A crossbow that hits** (F6) · CMB · S · helpers balance_analyst
  - Check: 35–60% hits when the rival is within 120 m and in front.
- [ ] **BUG-07 A CPU that fights back** (F7) · CMB · S · helpers balance_analyst
  - Done when: fire interval 10 / 7 / 5 s by difficulty, leading shots with aim error by difficulty, bombs when the player is close, shield against a shot about to land.
  - Check: CPU hits on the autopilot player: 0–3 Easy, 2–6 Medium, 4–10 Hard.
- [ ] **BUG-08 Rigs attached to the car** (F8) · VIS · S · helpers browser_qa
  - Done when: bumper, crossbow and shield hang from per-car mounting points on the car model, for player and rival, on all nine cars.
  - Check: headless test that the rig's world position equals the car's position times its mounting point during a slide, crash spin, tumble and jump; screenshots.
  - Files: `src/vehicle-sockets.js`, `src/combat-scene.js`, `src/render3d.js`, `tools/test-vehicle-sockets.mjs`
- [ ] **BUG-09 Dents face the hit** (F9) · CMB · S
- [ ] **BUG-10 Gamepad weapons** (F10) · UI · S
  - Check: a fake-gamepad test; D-pad fires on press, not while held.
- [ ] **BUG-11 Weapon bar tidy-up** (P4, P5) · UI · S · helpers browser_qa
  - Check: count of page updates per frame; browser check of "click a weapon, then press Space".
- [ ] **BUG-12 Blast target check** (H1) · CMB · S
- [ ] **OLD-01 One crash counter on the HUD** (OLD-B) · UI, hook SIM · needs D6 · S
  - Done when: the HUD shows the counter that actually ends the race, following D6. Race rules change only if D6 says so.
  - Check: probe scenario (five 64 km/h hits) shows the correct count at every step.
- [ ] **OLD-02 Retire the shared best-time store** (OLD-C) · SIM · needs D7 · S · helpers save_guardian
  - Done when: `game.js` stops reading and writing `duel_redline_best_v4` and drops the unused flag; the stored key is removed once, as D7 decides; per-player records are untouched.
- [ ] **OLD-03 Tests that protect bugs** · Discovery · S
  - Done when: a debt_hunter has audited every test assertion changed in the last 15 commits and filed cards for any that protect a bug.
- [ ] **FND-11 Career backup** · SAVE, UI · needs FND-10 · M · helpers save_guardian
  - Done when: Players → Export and Import career work with validation; an automatic IndexedDB backup is written before any save format change.
- [ ] **TOOL-01 Balance report** · TOOL · needs FND-06 · M
  - Done when: `tools/combat-balance.mjs` prints win rate, time gain per weapon policy, hit rates and CPU hits per difficulty; `--check` compares with the targets in section 13. 12 runs take under two minutes.
- [ ] **DISC Discovery audits** · Discovery · continuous
  - One debt_hunter pass per system: crash rules, saves and migration, records, police, rival and traffic, HUD, input, audio, rendering lifecycle, storage. Proven findings become cards.

#### Wave 2 – Make room (no behavior changes; every fingerprint unchanged)

- [ ] **RFX-01 Split `main.js` into screens** · UI · needs BUG-01, BUG-10, BUG-11, FIX-03, FND-07, FND-08 · L · helpers browser_qa
  - Done when: `main.js` is a small router; menu, garage, armory, courses, players, leaderboard, results and HUD are `src/screen-*.js` modules with their own CSS files; the 12 text-slicing tests import real functions (OLD-H).
  - Check: every UI test, every fingerprint and browser smoke unchanged; screenshots of each screen match before and after.
- [ ] **RFX-02 Split `game.js` into systems** · SIM · needs FND-07, OLD-01, OLD-02, BUG-03 · L
  - Done when: driving, contacts, rival, police, laps, crash and results live in `src/sim-*.js`; `Duel` keeps its public methods.
  - Check: every fingerprint and the full tier unchanged.
- [ ] **RFX-03 Opponents list** (OLD-I) · SIM · needs RFX-02 · L
  - Done when: `state.opponents[]` holds every CPU car and `state.rival` stays as the first one; collisions, route planning, HUD, route map and results handle any number.
  - Check: with one opponent every fingerprint is unchanged; a scripted race with three opponents completes with valid results on every course.
- [ ] **RFX-04 Split the combat code** · CMB · needs Wave 1 CMB tasks, RFX-03 · M
  - Done when: combat is in `combat-weapons.js`, `combat-projectiles.js`, `combat-pickups.js` and `combat-ai.js`, with every number in `wasteland-tuning.js`, and it loops over all opponents.
  - Check: every combat test and fingerprint unchanged.
- [ ] **RFX-05 Input contexts** · UI · needs BUG-01, BUG-10 · M
  - Done when: one module maps keys and gamepad buttons for the car, foot, menu and photo contexts.
- [ ] **RFX-06 Car attachments registry** · VIS · needs BUG-08 · M
  - Done when: rigs, kits, paint and figures attach through `vehicle-attachments.js` instead of new code in `render3d.js`.
- [ ] **RFX-07 Unpack save code** (OLD-H) · SAVE · needs FND-10 · M
  - Done when: `progression.js` and `leaderboard.js` are in the readable style; every save fixture and record test is unchanged.
- [ ] **FOOT-00 Spike: on-foot movement** · CMB · needs FND-05 · M · throwaway branch
  - Done when: a fighter walks around Pacific Canyon on the course's ground and obstacle lookups, with pointer-lock aiming; a note records cost per step and a go / change-of-approach decision.

#### Wave 3 – Combat core 2.0 (milestone M1: Combat 2.0 reaches beta)

- [ ] **CMB-01 Armor, wrecks and respawn for every car** · CMB · needs RFX-04 · M
- [ ] **CMB-02 Ramming and spikes** · CMB · needs CMB-01 · S
- [ ] **CMB-03 Combat scoring and results** · CMB, hook UI · needs CMB-01 · M
- [ ] **CMB-04 Pickups 2.0** · CMB · needs RFX-04 · S
- [ ] **CMB-05 CPU combat brain** · CMB · needs CMB-01 · M · helpers balance_analyst
- [ ] **CMB-06 Combat replays** · TOOL · needs CMB-01 · S
  - Done when: combat races are in the replay set at 30, 60 and 144 FPS.
- [ ] **SAVE-01 Combat credit bonus** · SAVE · needs CMB-03 · S · helpers save_guardian
- [ ] **UI-01 Combat HUD** · UI · needs RFX-01, CMB-01 · M · helpers browser_qa
- [ ] **VIS-01 Effect sprites and pools** · VIS · needs RFX-06 · M
- [ ] **VIS-02 Armor kits and wreck visuals** · VIS · needs RFX-06, CMB-01 · M · helpers browser_qa
- [ ] **AUD-01 Weapon sounds** · ART, hook UI (`audio.js`) · S
- [ ] **ART-A Batch A** (images 1, 2, 4, 6–9) plus `docs/WASTELAND_ART.md` and `tools/check-art-intake.mjs` · ART, TOOL · M

For each: done when the matching design in section 3 is met behind the `wasteland2` switch; checked by its own test file, the balance targets, and a browser scenario.

#### Wave 4 – Unlocks and image creation (two parallel tracks; M2: Unlocks and Studio reach beta)

Unlocks track:

- [ ] **PRG-01 `profile.wasteland` and migration** · SAVE · needs FND-10, FND-11, RFX-07 · M · helpers save_guardian
- [ ] **PRG-02 Notoriety XP and ranks** · SAVE · needs PRG-01, CMB-03 · S
- [ ] **PRG-03 Armory 2.0 with loadouts** · UI · needs RFX-01, PRG-01 · M
- [ ] **PRG-04 Kit purchases and equipping** · SAVE, UI · needs PRG-01, VIS-02 · S
- [ ] **PRG-05 Challenges** · SAVE · needs PRG-02 · M
- [ ] **PRG-06 Combat records by build tier** · SAVE · needs PRG-01, Q2 · S · helpers save_guardian
- [ ] **PRG-07 Card records and backfill** · SAVE · needs PRG-01 · S
- [ ] **PRG-08 Daily bounty board** · SAVE, UI · needs PRG-02 · M

Image creation track:

- [ ] **IMG-01 Gallery store and screen** · SAVE, UI · needs FND-10, RFX-01 · M
- [ ] **IMG-02 Photo mode** · VIS, UI · needs RFX-05, RFX-06 · M · helpers browser_qa
- [ ] **IMG-03 War Paint Studio** · VIS, UI · needs RFX-06, PRG-01 · L · helpers browser_qa
- [ ] **IMG-04 Wanted posters** · VIS, UI · needs IMG-01, CMB-03 · M
- [ ] **IMG-05 Trophy cards and wall** · UI · needs IMG-01, PRG-07 · M
- [ ] **IMG-06 Rewind buffer and wreck replay** (stretch) · VIS · needs IMG-02 · M
  - Check: recording costs under 0.3 ms per frame; race state is identical with rewind on or off.
- [ ] **ART-B Batch B** (images 10, 12, 15–18) · ART · M

#### Wave 5 – On foot (M3: Get out of the car reaches beta)

- [ ] **FOOT-01 Fighter simulation** · CMB · needs FOOT-00, RFX-04 · L
- [ ] **FOOT-02 Getting out, bailing, getting back in, the parked car** · CMB, hook SIM · needs FOOT-01, CMB-01 · M
- [ ] **FOOT-03 On-foot controls and camera** · UI, VIS · needs RFX-05, FOOT-01 · M
- [ ] **FOOT-04 Figures** · VIS · needs RFX-06 · M · helpers browser_qa
  - Check: 12 figures add at most 16 draw calls.
- [ ] **FOOT-05 RPG and wrench** · CMB · needs FOOT-02 · M
- [ ] **FOOT-06 On-foot HUD** · UI · needs UI-01, FOOT-01 · S
- [ ] **FOOT-07 Race rules on foot** · CMB, hook SIM · needs FOOT-02 · S
- [ ] **FOOT-08 Worth getting out?** · TOOL · needs FOOT-05 · S · helpers balance_analyst
  - Check: an RPG ambush and a repair stop each recover roughly what they cost; neither beats clean driving on average.
- [ ] **ART-C Batch C** (image 11, crew sheets) · ART · M

#### Wave 6 – Arsenal, crew and raiders (M4)

- [ ] **ARS-01 Weapons wave 1**: Oil Slick, Caltrops, Smoke Screen, Harpoon · CMB, VIS · M
- [ ] **ARS-02 Weapons wave 2**: Rocket Pods, Flamethrower, Side Saws, Scrap Magnet · CMB, VIS · M
- [ ] **ARS-03 Weapons wave 3**: Mortar, Tesla Coil, Decoy Drone, Nitro Ram · CMB, VIS · M
- [ ] **CREW-01 Crew roster, perks and selection** · SAVE, UI, VIS · needs PRG-01, FOOT-04, ART-C · M
- [ ] **CREW-02 Signature gear** · CMB · needs FOOT-05 · L
- [ ] **CREW-03 Boarding** · CMB · needs FOOT-02 · M
- [ ] **CREW-04 CPU crews get out** · CMB · needs FOOT-07 · M
- [ ] **RAID-01 Ambush zones** · SIM · needs RFX-03 · M · helpers browser_qa · pre-approved course change (4.7)
- [ ] **RAID-02 Raiders and salvage crates** · CMB, VIS · needs RAID-01, FOOT-05 · M
- [ ] **AUD-02 On-foot and new weapon sounds** · ART · M

#### Wave 7 – The Scrapdome (M5)

- [ ] **ARENA-01 Arena framework** (event type, free driving inside bounds, spawns, rounds, results) · SIM, CMB · needs RFX-03, CMB-01 · L · pre-approved new event (4.7)
- [ ] **ARENA-02 Last Car Rolling** (up to three CPU cars) · CMB · M
- [ ] **ARENA-03 Fuel Run** · CMB · M
- [ ] **ARENA-04 Bounty Hunt** · CMB · S
- [ ] **ARENA-05 Ambush Alley** · CMB · M
- [ ] **ARENA-06 Salt Flats Scrapyard map** plus ART-D (images 3, 5) · SIM, VIS, ART · L
- [ ] **ARENA-07 Convoy Raid** · CMB, VIS · L

#### Wave 8 – Warlords (M6)

- [ ] **WAR-01 Warlord data, personalities and ladder screen** plus ART-E (images 13, 14) · CMB, UI, ART · M
- [ ] **WAR-02 Warlords 1–5** · CMB, VIS · L
- [ ] **WAR-03 Warlords 6–8** · CMB · needs ARENA-07 · L
- [ ] **WAR-04 Rewards, story cards, the secret crew member** · SAVE, UI · M

#### Polish waves

Polish waves are regular waves with their own cards. They start automatically when the wave before them meets its finish line (12.4). Each has three rounds, run in this order: **look**, **sound**, **feel**, using the refinement loops in 10.1. Each round takes the top issues from the critics' scores, the feel measurements and any play-test notes, and fixes as many as fit in about five cards. One round may not undo another; for example, a look fix that costs frame time must still meet the frame budget.

- [ ] **POL-3 Combat polish** after Wave 3: explosions, fire, smoke, kit damage, weapon sounds, hit feedback, CPU aggression, balance. 3 rounds
- [ ] **POL-4 Studio polish** after Wave 4: photo looks, war paint on every car, poster and card layouts, Armory screens. 3 rounds
- [ ] **POL-5 On-foot polish** after Wave 5: figure poses and movement, camera, RPG feel, getting in and out, footsteps. 3 rounds
- [ ] **POL-6 Arsenal polish** after Wave 6: each new weapon's look, sound, counters and CPU use; crew gear; raiders. 3 rounds
- [ ] **POL-7 Arena polish** after Wave 7: arena lighting and dust, crowd, mode pacing, the convoy fight. 3 rounds
- [ ] **POL-8 Warlord polish** after Wave 8: each warlord's machine, entrance, personality and difficulty. 3 rounds

That's 18 dedicated refinement rounds, on top of the look and sound rounds every visual or audio card gets on its own.

#### Wave 9 – Final polish and release

- [ ] **REL-00 Whole-game pass**: three more look, sound and feel rounds across every event, including the ordinary races, in both quality settings
- [ ] **REL-01 Performance pass** against the budgets in section 13
- [ ] **REL-02 Accessibility**: readable HUD sizes, color choices that don't rely on red and green, a reduced camera shake option
- [ ] **REL-03 Switch cleanup**: remove switches for features that have been `on` for a clean release
- [ ] **REL-04 Docs and key art** (image 19), `docs/ARCHITECTURE.md` ownership table updated

### 12.3 Milestones

Milestones are switch changes, not pauses. Each one moves a set of features to `beta` and tells Kyle what to try.

| Milestone | What reaches beta |
| --- | --- |
| M0 | Green suite, safe live game, all Mad Max bugs fixed (these ship as normal fixes) |
| M1 | Combat 2.0: armor, wrecks, scoring, smarter CPU, kits, effects, sounds |
| M2 | Unlocks and Studio: ranks, Armory 2.0, challenges, daily bounties, photo mode, war paint, posters, cards |
| M3 | Get out of the car: on foot, RPG, wrench, figures |
| M4 | Full arsenal, crew, boarding, raiders |
| M5 | The Scrapdome |
| M6 | The warlord ladder |

A milestone's switches move to `beta` when its wave and its polish wave both meet their finish lines.

### 12.4 Finish lines

**Card expansion.** Cards in Waves 3–8 are written as one line here. Before a card becomes `ready`, the Director expands it into full acceptance lines from section 3, section 13 and the wave's finish line below. It also adds a browser scenario and, for anything seen or heard, a shot list and a sound list. The test_author then confirms every line can be checked automatically. A line that can't be checked is rewritten until it can, or moved into a refinement loop with a rubric (10.1). A card can't start while any line is vague.

**A wave is finished when all of these are true**, recorded with evidence in `docs/board/waves/<wave>.md`:

1. Every card in the wave is merged.
2. A full check on the merge result is green.
3. Every item in the wave's own list below is met.
4. No card from an earlier wave is still open, except ones the Director has deliberately moved to a later wave with a written reason.

Later cards whose `needs` are met may start before a wave is finished. The finish line decides when its polish wave starts and when its milestone moves to `beta`.

| Wave | Also required |
| --- | --- |
| 0 | Full suite green on `integration/wasteland`. Live game served from a build. Zero files with mixed line endings. Agent files installed. Merge tier under 10 min, full tier under 15 min. Fingerprints cover all 16 events and every mode. Browser smoke passes. Every save fixture loads |
| 1 | Every "fix work" target in section 13 met. Balance report passes the Mad Max targets. The HUD crash counter matches the rule |
| 2 | Every fingerprint identical to the end of Wave 1. `main.js` under 150 lines. No test slices source as text. A three-opponent race completes on every course. Average frame time within 3% of the end of Wave 1 |
| 3 | Combat design in 3.2 met behind its switch. Balance and CPU targets met. Feel targets: median time between explosions 8–14 s in a scripted combat race; 2–6 lead changes per race; a combat race takes no more than 15% longer than an ordinary one. Combat frame budget met in both quality modes. Every combat sound in sync with its event within 30 ms, and weapons and impacts clearly above the engine. Every combat visual and sound card passed its refinement loop |
| 4 | Every save fixture migrates. A simulated career reaches rank 30 in 80–110 events. Every unlock is granted exactly once, even after restart and reload. Photo, war paint, poster, card and gallery scenarios pass in both quality modes. Storage budget passes with a full gallery |
| 5 | On-foot rules in 3.4 met. FOOT-08 balance met. 12 figures add at most 16 draw calls. The camera never enters the ground in a scripted walk on all 11 combat courses. On-foot sequences replay identically at 30, 60 and 144 FPS |
| 6 | Each of the 16 weapons has a passing counter test and is used by the CPU. No single weapon causes more than 25% of wrecks across the balance runs. Each crew perk shows a measurable effect. Raiders active on all 11 combat courses |
| 7 | Each arena mode completes in scripted runs at all three difficulties with up to three CPU cars. Salt Flats frame time within 10% of the Titan arena. Convoy Raid can be won both by car and by boarding |
| 8 | Each warlord is beaten by a strong scripted policy at the intended difficulty and not by a passive one. Rewards are granted exactly once |
| Polish waves | Each round's top five issues fixed or moved to a later polish wave with a reason. Every rubric item at 4 or better. No new console errors. Frame budget still met |
| 9 | Every success criterion in section 13 met |

---

## 13. Success criteria

**Fix work:**

- The full suite is green on `master` and `integration/wasteland`.
- No page reloads of the live game caused by agents after FND-01.
- Arrows steer; A and D never steer in the car.
- Swaps keep lap history and cause zero crashes in 100 seeded swaps across all 11 combat courses.
- UFO-whenever-ready gains at most 4 s over two laps (today 8.6 s).
- Own bombs cut the thrower's speed by at most 15% at any speed (today about 69% at 97 km/h).
- Crossbow hits 35–60% of shots at a rival within 120 m and in front (today about 4%).
- CPU hits per race: 0–3 Easy, 2–6 Medium, 4–10 Hard (today 0 on Medium).
- Rigs match the car's transform on all nine cars in slides, spins, tumbles and jumps.
- The HUD's crash counter matches the rule that ends the race.

**Delivery:**

- The full tier runs in under 15 minutes; the merge tier in under 10.
- Every merged task has a card, tests written first, a review record and a change note.
- At most one full check in five is red, and never two in a row.
- Median review rounds per task: two or fewer.
- Every historical save fixture loads without loss, and the storage budget test passes.

**Expansion:**

- Content: 16 car weapons, 9 on-foot items, 8 crew plus 1 secret, 3 kit tiers on all 9 cars, 5 arena modes, arena fights with up to 3 CPU cars, 8 warlords, 40 challenges, daily bounties, 30 ranks, at least 24 stencils.
- Ordinary races, time trials and objective events give identical results to today for the same seeds and inputs (fingerprints).
- Combat events replay identically at 30, 60 and 144 FPS.
- A combat race stays within 10% of an ordinary race's average frame time on the same route and settings, in both quality modes. Budgets: 64 projectiles, 48 blasts, 12 fighters, 6 pickups, 8 crates at once.
- Photo capture works in both quality settings; war paint survives reload; posters and cards appear in the gallery; downloads produce PNG files; blocked storage is explained.
- Every shipped image has a recorded prompt and passes the art check.

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| On foot in a racer built around the road | Spike first (FOOT-00); reuse course lookups; 150 m limit in races; bounded arenas |
| The opponents list touches most race code | Done early (RFX-03) while only one opponent exists, pinned by fingerprints, before features pile on |
| Frame rate | Instanced figures, merged kits, fixed pools, frame-rate budgets measured in every full check |
| Plan size | Waves overlap; every milestone ships something playable; stop at any point |
| Agents talking past each other | One board, one Director, change notes as the handoff, file ownership |
| Merge conflicts | Line endings first, busy files split early, change notes instead of shared docs, one owner per busy file |
| Flaky tests from parallel runs | The runner retries a failed file once and marks it "flaky" instead of green; flaky files become cards |
| Agents grading their own work | Tests from a different agent, independent review, gates as the final word |
| Generated art drifting in style | Reference board first, fewer cells per image, one prompt template, art check, stand-ins |
| Save migration mistakes | Fixtures for every past shape, backups before migration, save_guardian on every save change |
| Weapons making driving pointless | Balance targets enforced in every full check |
| Browser harness complexity | Uses Chrome's own protocol through Node's built-in WebSocket; falls back to the existing QA pages if Chrome changes |
| Token and time cost of many agents | At most four builder lanes; helpers use low effort for routine runs; spikes before big bets |

## 15. Decisions for Kyle

### Standing decisions (answer once)

Answers (23 September 2026): D1, D2, D3, D4, D5 and D7 agreed as recommended. D6: option (a), five accumulated crashes end the race and the HUD counts them. All standing decisions are settled.

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Serve the live game from the built release instead of the live-reloading dev server (same address, same saves) | Yes |
| D2 | Install the agent setup, and let lanes commit on their own branches and the Integrator merge into `integration/wasteland` without asking each time | Yes |
| D3 | Standing release rule: when the full check is green, the Release Manager updates `master` and the live build. New features arrive switched off or in Experimental. A feature becomes normal after you play it, or after three days with no serious notes | Yes. Alternative: a weekly release you approve |
| D4 | Push `master` to GitHub after each release as a backup (today 4 commits exist only on this PC) | Yes. No CI service for now |
| D5 | Remove the old Codex working copy at `.codex\worktrees\4555` (nothing unique in it) | Yes |
| D6 | Crash rule for ordinary races: (a) keep today's rule, where any crash of 45 km/h or more uses one of five slots, and make the HUD count that; or (b) change the rule so only major crashes (72 km/h or more) count, as the README describes | (a): fixes the confusion without changing race balance |
| D7 | Delete the unused shared best-time data (`duel_redline_best_v4`) from browser storage | Yes. Nothing reads it |

### Open questions (agents use the recommendation until you say otherwise)

| # | Question | Default |
| --- | --- | --- |
| Q2 | Combat records: exact weapon levels, or build tiers (Stock / Tuned / Maxed)? | Build tiers |
| Q3 | Credits only, or a separate combat currency? | Credits only, gated by rank |
| Q4 | Crew lines as text only, or recorded voice? | Text only |
| Q5 | Radar traps and police in Mad Max Duel? | Off in combat events; raiders replace them |
| Q6 | Keep the "Mad Max Duel" name? | Keep it in this private build |
| Q7 | Keep the four original weapons free for new players? | Yes |
| Q8 | Split-screen two-player mode someday? | Not in this plan |

## 16. Out of scope

- Online play, accounts, cloud saves or any network feature.
- In-game AI image generation (needs a network service).
- A physics engine, animation library or second game engine.
- Gore or blood.
- Changing ordinary race, time trial or objective event rules, except as D6 decides.
- Touch controls.

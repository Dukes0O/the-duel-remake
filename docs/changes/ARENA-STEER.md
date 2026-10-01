# ARENA-STEER

The player and arena computer cars now share a 3.4 steering factor in the real Scrapdome venue. Focused steering and browser checks pass. This checkpoint is **not merge-ready**: the App demo hook waits for WAR-PAY, and one existing crate fixture needs independent review before its setup changes. Kyle's Preview steering feel review remains pending.

## Settled rule and implementation

Kyle's 30 September rule requires at least 100 degrees/s at full lock from 15–50 mph, and 75 degrees/s at each car's floor top speed. The optional fifth argument to `steeringYawAuthority` is the actual course. Both `course.def.venue === true` and `course.def.arena === true` are required. Road courses, Muddy Hollow and the legacy Titan arena race aliases retain the released formula.

`DRIVE.arenaSteeringFactor = 3.4` multiplies both the steering and tyre limits. Player integration and the arena pilot pass their actual course. Their existing steering filters keep their response times. Sal's window still applies its separate 0.5 scale to that same authority. No pickup rule, brain rule, floor limit or car statistic changes.

The stock Falcone sets the lowest 15 mph measurement: 102.400 degrees/s with 0.95 floor traction, including the real step's drag. Its floor-top measurement is 145.241 degrees/s; the minimum computer floor-top measurement is 152.874 degrees/s. Every stock car, engine-only car and fully upgraded car with its matching driver meets both minima. Factory upgrades remain applied exactly once.

## Tests first and focused checks

Independent test-author commit `8fc29c9` added 179 checks: 112 intended failures and 67 passing controls. Before runtime code, commit `29d96f7` added 36 checks for actual engine-only and fully upgraded matching-driver specimens, including monotone release at the resulting grip. The combined suite was 215 checks, 130 failures and 85 passes. An intermediate incomplete caller edit remained red; both callers were completed before the green result.

Commands and final results:

- `node tools/test-arena-steering.mjs`: 215/215 checks. This includes the unchanged 179 independent checks, ten exact full-state road controls, true venue identity, reverse/standstill behavior, Sal's physical half-yaw window, and arena repeatability at 30/60/144 graphics fps.
- `node tools/test-sal-fight.mjs`: 25/25 subtests.
- Titan handling: 40/40 checks; Titan climb: 10/10.
- Muddy Hollow: 50/50; road replay fingerprints: 162/162; combat replay fingerprints: 12/12.
- Arena feel: 5/5 subtests; warlord format: 24/24; ramp sides: 42/42 checks.
- Arena event: 11/12 subtests. The spawn-delay fixture failure below remains unresolved in this checkpoint.
- `git diff --check`: pass. Mandatory lane and production build gates have not run; the Director schedules them after final source and review.

## Known crate fixture failure

`tools/test-arena-event.mjs` expects five crates still present at the first spawn delay plus 0.1 seconds. The tighter computer pilot legally reaches a weapon crate during that interval. Exact reproduction: seed 1989, Medium, Banshee player, Dusthawk/Aurora/Stuttgart field, skip countdown, then the original 3.1 seconds of real Duel steps. All five crates spawn (`arenaCrateSerial === 5`); Aurora, computer index 1, collects `ramp-1-1` at 3.008333 seconds. Four remain, and that spot has 11.908333 seconds left before respawning. Pickup behavior is correct and unchanged.

The Director reserved only the spawn-delay fixture hook in integration commit `398260b`. Proposed isolation uses the existing `stepArenaPickups` for the spawn-delay portion, preserving every original expected assertion and the real reverse collection and respawn Duel steps. Two automatic approval reviews rejected the edit, first as unowned and then because the board evidence did not count as explicit user authorization. Neither edit executed. The Director requested independent review before any further edit. This test and all its assertions remain untouched.

## Full arena balance

`node tools/arena-balance.mjs` completed all 108 rounds (36 per difficulty), using the same seeds, cars and plain scripted player as the Director's baseline. No extra tuning was applied.

| Measure | Easy before → after | Medium before → after | Hard before → after |
| --- | --- | --- | --- |
| Computer samples within 40 m of target | 0.48 → 0.53 | 0.45 → 0.53 | 0.44 → 0.57 |
| Hard computer wall hits per round | 1.1 → 0.1 | 1.8 → 0.1 | 1.6 → 0.1 |
| Wrecks per full-field round | 16.6 → 21.9 | 15.7 → 24.4 | 15.4 → 23.0 |
| Player wins out of 36 | 13 → 18 | 2 → 6 | 1 → 5 |
| Mean player place | 2.06 → 1.72 | 2.64 → 2.47 | 2.86 → 2.36 |
| Computer reversing share | 0.081 → 0.073 | 0.096 → 0.084 | 0.105 → 0.087 |

Fighting is closer and hard wall hits are rarer. Wreck frequency rises; this is a measured gameplay consequence for Kyle's Preview review. A scripted player's win count does not establish human difficulty or fun.

## Browser evidence

`node tools/browser-harness.mjs scenario arena-steering --output-dir .evidence/2026-09-30/ARENA-STEER/browser-3` passed on private port 59690: High and Performance, 14 captures, zero errors and zero warnings. The harness built only the isolated `.qa-dist` bundle and used a disposable profile with memory-only storage. No Preview, live folder, port 5174 or real saves were accessed.

The recipe uses production App entry and actual Duel input/fixed steps. Labelled fixtures supply discovery, car unlocks, Sal hold and initial clear-floor/alongside poses; one heading perturbation requests a real correction during the naturally reached Sal window. No simulation function, move state, timer, steering filter or art state is replaced. The production chase-camera mode, HUD and nameplates remain intact.

Actual one-second turning arcs at an initial 45 mph reached 204.867 degrees/s for the Falcone, 249.838 for the Titan and 299.806 for the factory-upgraded Jesko, identically in both qualities. After 0.3 seconds of real stick release, yaw was 0.748% of its settled value, monotonically decaying without a sign change. Sal's natural window measured 1.9737 rad/s of authority against 3.9474 normal, exactly half, while its callout and sparks remained present.

All 14 captures were inspected. Cars stay on the floor, render in both qualities and retain the HUD. The Sal window callout is clear in these shots. A fixed-step arc advanced without rendered frames between ticks can leave the chase camera easing through the new orientation in its capture; these images and numbers prove the physics, not continuous controller feel. The existing nameplate can cross the Titan's body in the shot. Kyle judges turning in the Preview; Claude's broader standard-camera Sal feel/overlap review remains separate and pending. Audio is muted; no audible feel claim is made.

Earlier private runs are retained honestly: browser-1 stopped before a capture because car IDs used underscores in a screenshot name; browser-2 passed the six High arc/release captures, then failed a recipe assumption that Sal stores its returned goal in `participant.goal`. It returns directly. The correction measures actual filtered yaw against half the shared authority, keeping the meaningful physical guard. Both failed runs had zero browser errors or warnings. No production code changed to satisfy either recipe correction.

## Fingerprints

Named arena full-state traces change as expected from the tighter turning. Recipe: the existing `arenaReplay` helper in the steering test, seed 1989, Falcone, 120 Hz, 12 seconds; hashes were measured without writing the protected control fixture.

| Trace | Before | After |
| --- | --- | --- |
| Last Car Rolling | `0232347a421e1538010224b6a9318fab706212f254838c085a6be1d3d865ed7b` | `0feda6d8da74c3d5686e0baccd76a0675a26e1332561fc036fcc91643184e6ae` |
| Sal | `98591aee36e0b8ee0087e40b7cd28b315aed0e46f8c908356043b45605137348` | `84fe3d35ad5b691fe89ca41d0ad1f33d31fc70511da4d574e3f3d657d703038c` |

All ten road full-state controls, all 162 released road replay checks and all 12 combat replay checks remain unchanged, including Titan arena aliases. No signature was regenerated or repinned. Raw lane evidence is under `.evidence/2026-09-30/ARENA-STEER/`; the baseline balance file is in the corresponding integration evidence folder.

## Changed assertions

None. All prior assertions and fingerprints remain unchanged. The 36 new upgrade/driver checks supplement the independent stock suite. The proposed crate fixture isolation still requires explicit independent review and has not been applied.

## Sound

No new game event is added. Existing tyre, engine, collision and Sal sound cues remain unchanged.

## Removed

No file or asset is replaced. The real arena's old ceiling is superseded inside the existing shared function; that function retains the released ceiling elsewhere. No duplicate driving path or runtime dependency is added.

## Consumed evidence cleanup

The independent crate-fixture technical review is clear, but automatic
approval still requires Kyle's explicit authorization. Neither rejected
edit ran. All old crate assertions remain intact. The proposed App demo
hook waits for Fuel Run, and the lane remains unmerged. Claude's later
150-degree-per-second ceiling is in an unmerged design branch; this lane
has not implemented it. A new source change needs fresh gates and reviews.

The browser and balance verdicts above retain the observed measurements,
reproduction recipes and unchanged road fingerprints. The janitor consumes
44 reviewed raw files,
28920464 bytes, including the integration
baseline report whose exact numbers are already in the balance table.
The lane branch, tests, recipes, verdict and current game assets stay.
No live folder, Preview, real save or source assertion is changed.

### Removed — consumed evidence

Only used regeneratable browser captures and reports. No unmerged source,
licensed original, Kyle decision, test or runtime asset is removed.

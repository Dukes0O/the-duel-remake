# BUG-07 CPU combat, first slice

Status: building. The mechanics are implemented, but the full-race hit bands
do not hold on every course.

The CPU now fires every 10 / 7 / 5 simulation seconds on Easy / Medium / Hard.
Its crossbow leads the player's expected road position and adds a small,
seeded aim error that shrinks with difficulty. It chooses bombs inside 35 m.
It raises a star shield when a player bolt is on a path to hit within 0.4 s,
then observes the shield's 16 s cooldown. Race rules remain deterministic from
the seed and fixed-step inputs.

`tools/test-cpu-combat.mjs` checks the three intervals, curve-aware leading,
seeded error cones, close-range bombs, an imminent-shot shield, shield cooldown,
and two full-race settings. Titan Arena is a contact-rich two-lap combat course;
with seed 1989, Casual autopilot and no player weapons, CPU hits are Easy 0,
Medium 6, Hard 8. These meet the task's 0–3 / 2–6 / 4–10 bands. Pacific Canyon
is retained in the same test as a diagnostic: Easy 1, Medium 7, Hard 1 after
acknowledging its ticket screen. Hard has only one firing opportunity before
the cars separate, so aiming cannot produce four hits there.

`node tools/measure-cpu-fights.mjs` repeats the memory-only policy on all 11
combat courses at all three CPU difficulties. All 33 races completed. Easy
meets its band on 11/11 courses, Medium on 6/11, Hard on 3/11. The spread is
large: Harbor Highlands and Cloudbreak Skyway give Medium zero hits; Ridge
Rally Hard gives 11; Alpine Serpent Hard gives 13. Curve-aware leading improved
Pacific Canyon Medium from zero to seven hits and High Country Hard from three
to seven, but cannot fix lack of firing windows or bomb-heavy contact races.
This card should remain building until the full-race target is defined for a
representative set of courses or the wider combat pacing changes.

The 10-second `pacific-canyon-mad-max` replay changed as intended. Previously,
the player's bolt fired at race time 2.992 s and hit the rival at 3.167 s.
Now the CPU raises its reactive shield at 3.000 s, the hit is blocked, and the
rival's later position changes. At the 10-second sample, the player's road
position is 186.83 m in both runs; the rival moves from 196.59 m in the old
run to 271.73 m with the shield. The replay fingerprint moved from
`3bd83970b113198294e35c9192c525a639ecf069d2ac2bd86842cb836ef2295c`
to `3dc3b1e6c2f21af1493770c76511e428f42cd40253594118c3918f8ddec85416`.
The new hash is identical at 30, 60 and 144 FPS. Re-recording all 18 cases
changed only this Wasteland entry; all ordinary race fingerprints stayed the
same. The old direct-arrow collision assertion in `tools/test-combat.mjs` is intact.
Its fixture now puts the rival in impact recovery so the new reactive shield
cannot intercept the bolt; the new CPU test separately checks that interception.
No old assertion was relaxed. The reviewed replay change is limited to the
shield interception described above.

Focused checks: `node tools/test-cpu-combat.mjs`, `node tools/test-combat.mjs`,
`node tools/test-bomb-momentum.mjs`, `node tools/test-weapon-upgrades.mjs`.
`npm run build` passes. The first lane gate ran 152 suites: 151 passed and the
replay fingerprint failed as expected. A structured rerun confirmed it was
the only failure. After reviewing and updating that single Wasteland hash,
`node tools/test-replays.mjs` passed all 162 checks and the final lane gate
passed **152/152 suites** in 399.33 s.

---
task: BUG-07
status: ready-for-review
kind: balance-fix
flag: none
player_facing: yes
behavior_change: yes
---

# BUG-07 Easy rival balance slice

The Pacific Canyon standard autopilot now wins 9 of ten no-weapon Wasteland races on Easy, within the approved 80–95% band. The rival wins seed 1995 by 72.4 m. This is a physical driving and aiming change, with no race-result adjustment or hidden player handicap.

## Change and limits

On Wasteland Easy only, the rival's cruise factor rises from 0.73 to 0.875 of its car's top speed, and its corner factor rises from 0.78 to 0.895. It still uses normal acceleration, braking, steering, road speed limits, traffic yielding, and the existing distance-based rubber band of at most 8 mph. It does not take the Medium/Hard shortcut route. Its observed peak speed in the ten Pacific races is 180.3–183.9 mph, below the Medium rival's 201 mph sampled peak and the Falcone F42's 201 mph top speed. Ordinary duels and other difficulties retain their existing pace.

Easy crossbow aim error is exactly 10° (`Math.PI / 18`), matching the specification's Easy value and remaining less accurate than Medium and Hard. The attack timer remains exactly ten seconds. Bombs still fire at close range. No combat event or race-state outcome is fabricated.

The original 1fd711f baseline gave the player 10/10 Easy wins, with the rival 649–2034 m behind at the finish, 154.7 mph sampled peak speed, and one CPU hit in the seed-1989 Pacific race. The final ten-seed trace gives 9/10 wins, gaps of 302.9, 1173.9, 1142.8, 859, 1117.2, 732.9, -72.4, 465.8, 1051.6 and 440.3 m, and one seed-1989 CPU hit. Medium and Hard ten-seed results stay at 6/10 and 2/10. The gain is sensitive to the chosen ten seeds, so wider feel sampling remains useful before calling all Easy play polished.

An intermediate 0.86/0.88 pace trial won 9/10 but caused seven Easy hits on seed 1989, beyond the 0–3 target. It was discarded. A 0.25-radian aim trial was also discarded because it exceeded the specified 10° error. The committed settings are 0.875/0.895 pace and exactly 10° aim.

## Checks on this branch

- `node tools/trace-cpu-combat.mjs --baseline`: 30/30 races complete; Easy/Medium/Hard player wins 9/6/2 out of ten; seed-1989 Easy/Medium/Hard CPU hits 1/1/10.
- `node tools/combat-balance.mjs --check`: completed 21 policy races and 30 baseline races. Win rates 90%/60%/20%, crossbow probe 13/26 hits (50%), own-bomb maximum speed loss 4.53%, and first 12 runs 24.39 s. It exits 1 for six UFO time-gain failures owned by BUG-04 and the existing Medium Pacific hit count of 1 versus 2–6. The same Medium failure reproduces on unmodified integration commit 1fd711f; a separate Q5 fix is pending integration ahead of this slice.
- `node tools/test-combat.mjs`: 67 checks pass.
- `node tools/test-cpu-combat.mjs`: Easy Pacific 1 and Titan Arena 1 hits pass, Hard Pacific 10 and Titan 10 pass. The run stops at the existing Medium Pacific 1-hit assertion. The unmodified integration worktree fails that same assertion.
- `npm run build`: passes, with the existing large rendering chunk warning.

- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 63 passed, one failed, 27 not run in 168.28 s. The sole failure is the same pre-existing Medium Pacific CPU-hit count (1 versus 2–6) in `tools/test-cpu-combat.mjs`; the runner stopped at that failure. Completed campaign shards, ordinary driving replays and crossbow tests passed.

The original Easy lane did not change test assertions or replay fingerprints.
It was ready for integration after Q5 fixed the Medium hit baseline.

## Exact Q5 integration and replay review

After Q5/BUG-14 removed legacy police from Wasteland, the combined balance
check completed all 21 policy and 30 baseline races. No-weapon wins are Easy
8/10, Medium 6/10 and Hard 2/10, all inside their target bands. CPU hits are
Easy 1, Medium 2 and Hard 10; controlled crossbow hits are 13/26 and maximum
own-bomb speed loss is 4.53%. Only the six BUG-04 UFO time-gain comparisons
remain red.

The Easy driving and aim change intentionally changes the recorded Pacific
Canyon Wasteland race. Recording the exact combined code changed only the
`pacific-canyon-mad-max` fingerprint, to the same new hash at 30, 60 and 144
FPS. The other 17 replay cases, including ordinary races, time trials and
objective events, are byte-for-byte unchanged. This is a behavior change
review, not a refactor baseline refresh.

An independent reviewer approved the fingerprint update for exact integration
`a26319a`: only this Wasteland row changed, all 17 other cases and fixture
inputs stayed byte-for-byte unchanged, and the reviewer independently passed
all 162 replay checks. The fixture covers one Wasteland race; it does not
establish behavior on every combat course.

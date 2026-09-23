# BUG-06 crossbow hit-rate diagnosis

Status: building. No gameplay code changed.

The reported Medium full-race result reproduces exactly: with seed 1989,
Pacific Canyon, Casual player difficulty, Medium CPU and stock Falcone F42,
the autopilot fires whenever the crossbow is ready. The race completes with
26 shots and 1 hit. The rival is **behind the player for all 26 shots**. There
are no shots with the rival in front and within 120 m, so this replay does not
measure the task card's hit-rate condition. `tools/test-crossbow-race.mjs`
records this geometry in memory-only storage. Its hit count is a diagnostic
output, not an assertion that would freeze the current behavior.

The new `tools/test-crossbow-aim.mjs` is the acceptance check. It spans all 11
combat courses and 26 seeded moving-rival cases. Every target starts 20–104 m
ahead, with varied lateral positions; player and rival move at 85 and 75 mph.
It asserts the specified 35–60% rate and currently passes at **12/26 = 46.2%**.
The assertion was not relaxed.

To check real-race opportunity bias, I also ran two-lap autopilot races on all
11 combat courses at Medium and Hard, firing only when the rival was in front
within 120 m. All 22 races completed. Medium produced 3 hits from 6 shots;
Hard produced 17 from 22, or **20/28 = 71.4%** combined. Of those 28 shots,
23 occurred at 0–26 m (most at 0–1 m) and produced all 20 hits. The other five
shots were at 82, 90, 111, 116 and 118 m; all missed. Most Medium races offered
no eligible shot at all. The full-race percentage is therefore dominated by
near-contact shots and is not a balanced 0–120 m sample. Lowering that number
to 60% by making point-blank shots miss would harm the game. We should revisit
this card when a race policy provides enough 30–120 m opportunities.

`node tools/test-crossbow-aim.mjs` and `node tools/test-crossbow-race.mjs` pass.
No old assertions changed. No race-rule or replay-fingerprint change occurred.

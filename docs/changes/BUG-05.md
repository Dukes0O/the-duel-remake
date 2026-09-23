# BUG-05 bombs inherit vehicle momentum

Bomb Storm now adds the thrower's forward and sideways vehicle velocity to each bomb in the ring. This applies to player and rival bombs. Blast strength against the thrower is one-quarter of normal, as required by the combat design; damage to rivals and traffic is unchanged.

The focused probe uses memory-only `Duel` state at exactly 48, 97, 193 and 320 km/h. Before the fix, bombs lacked vehicle velocity at every speed, and the 97 km/h case lost 68.37% of its speed. Inheriting velocity alone fixed that case but left an 18.11% self-blast speed loss near 320 km/h. With the one-quarter self-blast rule, the measured losses are 0%, 0%, 0% and 4.36%. The new test checks all eight player and rival bombs for inherited forward and sideways motion and checks the self-blast strength ratio.

`node tools/test-bomb-momentum.mjs`, `node tools/test-combat.mjs` (67 checks), `node tools/test-weapon-upgrades.mjs`, and `npm run build` pass. No old assertion was weakened. Race rules remain deterministic from seed and inputs; no saves or runtime dependencies changed.

The clean lane gate, `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`, passed all 79 suites in 250.56 s.

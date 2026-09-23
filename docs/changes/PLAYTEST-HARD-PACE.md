# Hard combat pace after armor impacts

Armored player collisions removed several old 28 mph crashes. The fixed-seed
Hard no-weapon win count rose from 2/10 before the armor change to 5/10.
Keep the requested armor protection. The Hard Wasteland rival now has a
14 mph cruise offset instead of 18 mph. Easy, Medium and ordinary races keep
their prior pace rules.

On the current combined code, `node tools/combat-balance.mjs --verbose`
measured no-weapon wins of 8/10 Easy, 6/10 Medium and 4/10 Hard. CPU hits
were 1, 2 and 9. The Hard targets are 2–4 wins and 4–10 hits. The earlier
18 mph offset measured 8/10, 6/10 and 5/10 wins, with 1, 2 and 6 hits.

`node tools/test-cpu-combat.mjs`, `node tools/test-replays.mjs` (162 replay
checks) and `node tools/test-combat.mjs` passed. The old UFO gain rule remains
over its limit; the separately approved tactical-jump change is in progress.
No assertion or balance target was changed.

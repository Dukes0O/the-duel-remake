Part A only; switches, save shape, pay, brands, opponents, speech and Part B flame code stay unchanged.
Lamp: two continuous seconds within 3.5 m while walking; rule-owned bar, precise row, brand-out line, one soft amber ground ring per dark lamp, disposed.
Cues: existing `world.brand.catch` on lighting; new bank-layer `world.lamp.lighting` rising hiss, stopped on leaving or ending.
Finding 1 measured: original `audio.js:1385` engine automation ignored walker distance; coast main .190739 and exhaust .012017 were equal at 0 / 30 m.
Engine now fades linearly from full at 5 m to zero at 30 m, across idle/load/coast/fallback, exhaust, intake and accents. In-car targets stay unchanged.
Finding 2 measured: `crew-gear/signature.js:278` requests only `crew.flamer.start`, the .3 s tone (`sound-bank.js:149`); the real audio probe confirmed it.
Hand Flamer now reads barrel flame state for `weapon.flame.start`, `.loop`, `.end`; only these three bypass arsenal in world jobs. Empty fuel ends once.
Finding 4 measured: `sim-driving.js:204` requests `world.ground.scab-plates`, which borrows `vehicle.crash.recorded` (`sound-bank.js:642`); `sim-scablands.js:38` also requests it.
At (5960,62), 15 m west of the gate, four real Duel steps crossing the road edge produced two such cues: armour 121 throughout, damage zones 0, impactTimer 0 s throughout.
Ground transitions/refusals now use existing suspension thump `vehicle.landing`; solid/car crash routing and every damage rule stay unchanged. Finding 3 is not reproduced; no exit-rule change.
Checks on merged e6d1f089a: lane 117/117 after 17 focused reruns (16 FFmpeg permission failures and size timing passed alone); Vite build completed in 2.60 s with existing warnings; 297 replay and 63 world checks unchanged. Old Smoke 4402 and audio/PCM 721 pass. Earlier all 23 searched suites and Easy job2 10/10 remain passed.
Changed assertions, for Claude to review: card lists lamp radius/walking/distance, new-hiss historical-bank exclusion, browser pictures 4 to 5, and retained Old Smoke catch checks updated to stop-and-collect (no furnace chase assertion changes).
For Claude to run: existing browser `everburn-job2` (page expressions parse in Node), then the job by hand with sound. Independent code review confirmed all fixes.
Codex decided: measured ground cue, three-cue flame admission and no exit-rule cure, on the card. Kept the rewritten Old Smoke real-Duel collection-to-ending fixture because job3 does not cover that full event path; Claude authorised its commit at 09:50.
Removed: `standingSpeed`, its speed gate and “Hold still to light the lamp.” CPU crews still use the old flamer tone, so its bank cue remains.

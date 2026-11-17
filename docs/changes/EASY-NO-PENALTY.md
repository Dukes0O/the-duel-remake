# EASY-NO-PENALTY

Before: Duel loss charges up to 300 Easy, 500 Medium, 750 Hard credits (integration/wasteland 494f2b9e3).
Before: Fire closed a course for 10 play days; buyback began at 10,000 credits, falling 1,000 per play day.
Easy Duel loss charges zero; fire closes a course for 3 play days, with buyback starting at 3,000. Visual timing is unchanged.
On 993aac185: progression, progression integration, combat credit, results rendering, course closures, heli save, heli fire session, fire close, arena bounty, busted quit, course access, Grand Prix career, heli mode and Wasteland results pass.
Grand Prix fingerprint: d051abb03c0979635e332caf490579bb980731c37018585ea9b1cf7006870f0b (both switch settings).
On merged 8611fb164: progression, integration, combat credit, results, closures, heli save/fire, fire close, milestones, drift and checkpoint pass; build passes.
Lane on 993aac185: replay and world guards pass; stopped before test-test-runner and test-track-kits finished (over 3 minutes). Three old credit tests failed then passed after correction.
For Claude: review credit assertions and run `node tools/browser-harness.mjs scenario easy-no-penalty` (Chrome unavailable); its page scripts parse in Node.
For Claude: rerun Eifel, P4 audio, Blackiron and Tollkeeper (FFmpeg EPERM), full-check (PowerShell EACCES), and the two unfinished lane suites. Grand Prix existing is nightly-only.
Changed assertions: closure 10 to 3 days; buyback 10,000 to 3,000; day 1/2 prices 9,000/8,000 to 2,000/1,000, for the shorter closure.
Changed assertions: menu 7 days/7,000/450 short to 2 days/2,000/450 short; day 2 price 8,000 to 1,000; reopening day 10 to 3, for the shorter closure.
Changed assertions: helicopter purchase 7,000/5,000 balance to 2,000/10,000; save purchase 10,000 to 3,000, for the lower buyback.
Changed assertions: Easy unfinished reward -300 to 0; losing best base -300 to 0, charge 100 to 0, balance 270 to 370, reward 170 to 270, because Easy losses are free.
Changed assertions: Easy timeout balance before minus 300 to unchanged (two checks); Easy combat-test charge 300 to 0, reward -300 to 0, balance 200 to 500, because Easy losses are free.
Changed assertions: milestone loss charge 100/base -300 to 0/balance 270 to 370; drift and checkpoint Easy loss reward/base -300 to 0 and balance before minus 300 to unchanged, because Easy losses are free.
Sound: no new event or cue.
Removed: the Easy Duel loss charge, the ten-day closure and their old screen and documentation wording.

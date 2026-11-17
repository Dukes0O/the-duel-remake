# EASY-NO-PENALTY

Before: Duel loss charges up to 300 Easy, 500 Medium, 750 Hard credits (integration/wasteland 494f2b9e3).
Before: A burnt course closed for 10 play days; buyback began at 10,000 credits, falling 1,000 per play day.
Closure now lasts 3 play days; buyback begins at 3,000. The visual stages still use their old timing.
Checks on working tree based on 494f2b9e3: test-course-closures (10 groups), test-heli-save (44 groups), test-heli-fire-session (80 checks) pass.
Changed assertions: closure 10 to 3 days; starting buyback 10,000 to 3,000; daily prices 9,000/8,000 to 2,000/1,000, to match the new rule.
Changed assertions: menu 7 days/7,000/450 short to 2 days/2,000/450 short; saved fixture day 2 price 8,000 to 1,000; reopening day 10 to 3.
Changed assertions: helicopter purchase 7,000/5,000 balance to 2,000/10,000; save purchase 10,000 to 3,000, to match the new rule.
Easy Duel losses now charge zero; Medium and Hard keep their existing charges.
Checks on working tree based on b22de1a8a: progression, progression integration, combat credit, results rendering and course closures pass.
Changed assertions: Easy unfinished reward -300 to 0; losing best base -300 to 0, charge 100 to 0, balance 270 to 370, reward 170 to 270.
Changed assertions: Easy timeout balance before minus 300 to unchanged (two checks); Easy combat-test charge 300 to 0, reward -300 to 0, balance 200 to 500.
Sound: no new event or cue.
Removed: the ten-day closure and old buyback numbers. The Easy Duel loss charge and its old screen wording.
Changed assertions: fire menu 7 to 2 days, 7,000 to 2,000 credits, reopen day 10 to 3; fixtures follow the shorter closure.

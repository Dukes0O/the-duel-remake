# EASY-NO-PENALTY

Before: Duel loss charges up to 300 Easy, 500 Medium, 750 Hard credits (integration/wasteland 494f2b9e3).
Before: A burnt course closed for 10 play days; buyback began at 10,000 credits, falling 1,000 per play day.
Closure now lasts 3 play days; buyback begins at 3,000. The visual stages still use their old timing.
Checks on working tree based on 494f2b9e3: test-course-closures (10 groups), test-heli-save (44 groups), test-heli-fire-session (80 checks) pass.
Changed assertions: closure 10 to 3 days; starting buyback 10,000 to 3,000; daily prices 9,000/8,000 to 2,000/1,000, to match the new rule.
Changed assertions: menu 7 days/7,000/450 short to 2 days/2,000/450 short; saved fixture day 2 price 8,000 to 1,000; reopening day 10 to 3.
Changed assertions: helicopter purchase 7,000/5,000 balance to 2,000/10,000; save purchase 10,000 to 3,000, to match the new rule.
Sound: no new event or cue.
Removed: the ten-day closure and old buyback numbers. Easy loss charge still needs removal.

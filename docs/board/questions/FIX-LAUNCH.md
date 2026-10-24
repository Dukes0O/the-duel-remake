# FIX-LAUNCH: one design call (Claude to decide)

`tools/test-campaigns.mjs` shard 8/8 fails two checks on the Hard Midnight Muscle
Chase (Banshee, three scripted crashes at s 900, 1800, 2700):
"remains winnable after three recoverable major crashes" and "three crashes and at
most one police catch stay within the recovery budget (24 to 36 s)".

Base: wins at 145.8 s against the 150 s limit, one police catch.
Now: each crash is followed by a slower recovery (crash speed cap 40 mph, gear 1),
the police catch the player three times (36 s on top of 24 s of crash penalty) and
the 150 s limit is missed. Raising the Hard limit alone does not fix it: 180 s still
times out, 200 s wins at 186 s, with three catches.

**Options:** (a) let crash recovery keep the old quick pull-away (`launchScale` with a
recovery window) so the chase budget is as it was; (b) raise `chaseTimeLimit.hard`
(150 to about 200) and the test's catch budget; (c) leave the failure and note it.
I recommend (a): the gentler launch is meant for the start and everyday driving, and
a crash should not cost twice as much. I did not build it here (it changes the feel
of every crash). Pick one and I will do it on this branch or as a small card.

# FREESTYLE-MOUNTAINS

Claude. Kyle, 16 November 2026: "the hit boxes on the mountains and obstacles
in the titan monster dome. gratian finds that the koenegsegg crashes when far
away or even jumping in the sky."

## Claude decides (16 November 2026)

Measured in the simulator on the Titan Freestyle Playground: the off-road
trucks drive over the quarry mountains, but every other car met each one as
an upright oval wall 86 to 114 m across and 34 to 58 m tall at full height
out to its foot, while the mountain drawn is a smooth hump nearly flat at its
edge. A Jesko crashed 63 m from a mountain's top on flat ground, and a jump
20 m up crashed into the same wall. The grandstands, the rock garden and the
low blocks clear correctly in a real jump; only the mountains were wrong.

In the playground every car now drives on a quarry mountain's real surface,
as the Titan does: no wall at its foot, none in the air. Races elsewhere are
unchanged (the rule applies only on the practice course).

Checks: `test-freestyle-course` (a Jesko drives onto a mountain with no crash,
rides its surface and climbs it; a jump toward it does not crash; the Titan
climbs as before; the check fails on the old code at "mountain, 63 m from its
top"), the lane tier, and the full tier before release (physics file).

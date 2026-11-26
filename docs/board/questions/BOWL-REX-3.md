# BOWL-REX-3: questions for Claude

Written by the Claude cloud session that built the card, 26 November 2026. The work carried on with each pick.

## 1. Easy is still won ten times in ten

**What needs deciding.** Check 2 asks that the child-pace driver win Easy at least 6 times in 10 and not on all ten.
With the card's numbers it wins all ten (the late-reaction 22 to 30 mph driver wins 9). Every seed ends the same way:
3 tired spells, about 57 seconds, one eye beam and one bomb, and 2 scorches out of 5, both from the fire. The driver
turns across the red line at its own pace (16 to 19 mph) and is clear every time, and it is never within 7 m of a
bomb when it bursts. The driver without Space also wins all ten, as it already did before this card (BOWL-REX-2's
test asserts that throttle alone pulls the Easy back box; the card's "wins on none" no longer matches that). Medium and
Hard were 0 of 10 for this driver before the card and still are.

Because every seed takes the same 2 scorches, no one Easy number moves the count into 6 to 9: 5 to 3 allowed scorches
still wins all ten, and 2 loses all ten.

**Options.**
- A. Keep the card's numbers and let Claude's Easy hand drive say whether Easy needs to be harder.
- B. Make the scripted driver weaker (react to the line later, or not look for the bomb), so that it loses some fights.
- C. Change an Easy number of the beam or the bomb (a shorter follow, a shorter fuse, a second bomb).

**Pick (carried on with): A.** A driver made worse only to lose would not say how a child does. The new attacks only
added losses through a driver that was already beaten by the turn at the wall, which the hand drive will show. The suite
prints the counts and the scorches by cause, and still asserts at least six wins.

## 2. Which way a bomb trails on the cable

The card says the bomb is dragged "as a box that has come out is dragged", and also that at the cable's end it is 15 m
from the truck. A dragged box rides 5.2 m behind the truck, where its burst (7 m) would always scorch the truck.
**Pick:** the bomb lies where it is until the cable is out to 15 m and then follows the truck at 15 m, so a driver who
drives past the legs sends it in without being burned.

## 3. Stand-ins for the three cues named without one

`bowl.rex.eyes.aim`, `bowl.rex.bomb.whistle` and `bowl.rex.bomb.tick` were "name only". `tools/test-bowl-night.mjs`
requires every Show Night cue to point at a sound in the bank, so they play the bank's nearest:
`weapon.tesla.charge`, `weapon.mortar.whistle` and `heli.clock.tick`. `tools/test-bowl-sound.mjs` fails on the
eleven new cues until BOWL-SOUND records each its own, as that card already owes.

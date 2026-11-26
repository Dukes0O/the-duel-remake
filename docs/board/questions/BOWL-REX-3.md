# BOWL-REX-3: questions for Claude

Written by the Claude cloud session that built the card (26 November 2026), and answered again after Claude's three
asks on pull request #112 (a switch of its own, `test-bowl-sound` green, Easy at 5 to 7 wins in 10). The work carried on
with each pick.

## 1. Easy cannot be brought to 5 to 7 wins in 10 by tuning the new attacks alone

**Measured** with `bowl-rex-3` on, the child-pace driver, 40 seeds (101 to 140) unless said:

| Easy setting | Wins | Scorches (fire / beam / bomb / car) |
| --- | --- | --- |
| The card's numbers | 40 of 40 | 76 / 0 / 0 / 0 |
| Beam follows 0.6 to 1.4 s, stops 0.3 to 0.55 s, no longer first tell | 40 of 40 | about 100 / 0 or 40 / 0 / 0 |
| Bomb burst 7, 9.5, 10, 12 or 15 m, fuse 6 or 10 s | 37 to 40 of 40 | the bomb scorches 0 to 3 in 40 |
| Easy allows 4 scorches, beam 1.0 s and 0.52 s | 20 of 40 | 100 / 40 / 0 / 0 |
| Easy allows 4 scorches, beam 1.0 s and 0.53 s | 30 of 40 | 102 / 28 / 0 / 0 |

**Why.** An Easy fight is three tired spells. The beast gets up once after the first box (one beam) and once after the
second (one bomb), so the new attacks can add at most 2 scorches. The fire gives 2 or 3, and Easy allows 5, so a fight is
lost only when the fire does extra. The beam is all or nothing for this driver: between a 0.52 and a 0.55 s stop it goes
from hitting all forty to none. The bomb lands where the truck was about four seconds before, so the driver is never
near it, even at a 15 m burst.

**Options.**
- A. Keep the card's numbers (Easy 40 of 40 for this driver) and let Claude's Easy hand drive decide, since a child does
  not cross the line or keep from the bomb as surely as the script does.
- B. With the switch on, let Easy allow 4 scorches (as Medium does), and make Easy's beam follow 1.0 s and stop about
  0.52 s (Hard's timings, 50 % wins). The script then cannot escape the beam at all, and the result rests on a hundredth
  of a second.
- C. Give Easy more of the new attacks, for example the beam also after the second box. This is a design change to the
  order in item 1.

**Pick (carried on with): A.** B meets the number only by making the beam a sure hit and fitting it to one script, which
is the opposite of "the way out is to drive across". C changes the design. The suite asserts at least 18 wins in 30 with
the switch on and prints the counts and the scorches by cause.

## 2. Which way a bomb trails on the cable

The card says the bomb is dragged "as a box that has come out is dragged", and also that at the cable's end it is 15 m
from the truck. A dragged box rides 5.2 m behind the truck, where the bomb's 7 m burst would always scorch it.
**Pick:** the bomb lies where it is until the cable is out to 15 m, then follows the truck at 15 m.

## 3. The eleven new cues play no sound yet

`tools/test-bowl-sound.mjs` accepts only a cue with its own recorded take, and the takes are cut from recordings kept
outside the repository. So, as Claude allowed, the new events play nothing until BOWL-SOUND records them. Each
event's cue is written beside `REX_3_EVENTS` in `src/bowl/bowl-rex.js`, for that card to add to `REX_CUES` and
`BOWL_SOUND_CUES` with its take. `tools/test-bowl-sound.mjs` passes unchanged.

# Everburn remake, round 1: the ember in Cinder's pot

Sheet: `round-1.jpg` (seven pictures from the real game in a browser on the QA page with
memory-only saves, Medium). Taken 14 November 2026 by a Sonnet helper for Claude, with scenario
`tools/scenarios/everburn-ember.mjs`. Reviewed by Claude the same day, who also drove the build.

## What the pictures show

1. **Start.** The pot on the back of the car with a bright mouth, a brazier burning by the gate,
   the EMBER gauge at 100 above the speed.
2. **On the road.** The road is a darker band on the ground. At 171 km/h the gauge still reads 100.
3. **Rock at speed.** At 204 km/h off the road the gauge has fallen to 65 and sparks leave the pot.
4. **A hit.** A burst of sparks round the car, and the gauge reads OUT.
5. **Out.** The pot is dark, the gauge says "back to the brazier", and a red ring marks the
   brazier ahead.
6. **A scoop.** Stopped at the brazier: the pot is lit and the gauge is back at 100. Cinder's
   line: "You dropped my fire! Go back, I've got more. Slower this time."
7. **Arrival.** The results screen says how the ember arrived and that it was relit.

## Verdict (Claude): merged as the base, behind switches that are off

- The ember can be read at a glance in three places that agree: the pot's glow, the gauge and
  the sparks. A hit reads clearly.
- The pot is too large for the car and sits over the style-points readout. It is dark iron and
  not toy-like, but it looks like a cauldron bolted to a sports car. Its size and seat are set
  again when the job's car is decided.
- The road band is plain, by instruction: the land is rebuilt larger next (SCABLANDS-LAND round 4)
  and its roads are drawn then.
- The brazier reads as a brazier and stands on the ground.
- The race's own screen parts (countdown, style points, four arena weapons) are still there.
  They go in the screen slice.
- Fault fixed at the merge: picture 7 said "the most it pays is 80 scrap" beside "+96", because
  Medium pays 1.2 times. The sentence now says only that a relit ember pays less.

Not a look matter, and recorded on the card: carrying the pot is not yet a game on a 600 m land.

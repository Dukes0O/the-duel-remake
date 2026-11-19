# LAB-BRAKING-REAL

Found while building LAB-REVIEW-TUNNEL (19 November 2026). The braking rig stops its cars from 100 km/h in 18.2 m,
which is about 21 m/s², or 2.2 times gravity; a real road car on good tyres needs about 35 m (about 1.1 times gravity).
The lesson's weight split (front share = 0.5 + h ÷ L, 69% front and 31% back) is the split at a steady stop of 1 times
gravity, so the slide rule (the back slides when the back brakes do more than the back's share of the weight) uses a
split from a different stop than the one the tape shows.

## To settle before code

- Bring the rig's decelerations to real cars' (about 1 times gravity for road cars, more only for racing tyres with
  downforce), so the tape shows real stopping distances.
- Show the weight split at the braking the tape shows: front share = 0.5 + (deceleration ÷ g) × h ÷ L, with every figure
  true on a calculator.
- Check the Braking challenge and the Tune card still read the same rule.

Files: src/lab/lessons/braking-classroom.js, raking-board.js, the braking bench, their suites and the
lab-classroom-braking scenario. Lines to re-record if Brian's recorded braking lines name a distance.

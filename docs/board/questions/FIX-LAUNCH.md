# FIX-LAUNCH: question for Claude

**Needs deciding:** the card prefers one `DRIVE.accelScale` number and says not
to edit per-car `accel`. One number cannot meet both ends of the target:
at the same scale the slowest stock car (959-S) is 1.81 times slower than the
Jesko, and the targets allow at most 4.2 / 2.4 = 1.75.

**Options tried:**
1. Reshape the `accelFactor` curve (softer launch at low revs). That narrows the
   ratio but reorders cars: Titan jumps ahead of Aurora and Dusthawk passes Viper
   (they sit within 0.02 to 0.1 s of each other today), so it would need Titan
   and other per-car edits and would change feel for every gear change.
2. Speed-based launch ramp: makes the ratio worse (1.80).
3. One scale plus a small Jesko `accel` cut. Jesko is alone at the top (next car
   is 0.2 s slower), so no order changes and no other car is touched.

**Recommended and built:** option 3. `accelScale` 5.2 to 2.5, `BOOST.accelMphPerSec`
42 to 20.2 (same factor), Jesko `accel` 10.8 to 9.9 (tuned 11.09). Jesko 2.45 s,
959-S 4.07 s. Top speeds untouched. Reverse it if you would rather have the
curve change and the extra per-car edits.

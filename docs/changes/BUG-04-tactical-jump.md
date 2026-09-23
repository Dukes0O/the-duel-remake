# BUG-04: Short tactical UFO jump

Kyle chose a short, predictable jump after playtesting the large rival swap.
The former swap and long warp saved too much race time and left the arrival
unclear. This change moves only the player. The weapon bar previews the exact
forward distance and route metre; the callout confirms both after firing.

The candidate jump is 12 m at stock level and adds 4 m per upgrade level. It
charges at the first checkpoint each lap and can fire once that lap. A weapon
pickup cannot grant another jump on a used lap. It cannot cross the next
checkpoint or finish line. If the destination is occupied, it checks a clear
road lane and then shorter distances; if none is safe, the charge remains
available. The player keeps checkpoint, lap, and timer history. The rival does
not move. The landing has 0.35 s of impact protection.

The old BUG-02/BUG-03 swap assertions were replaced because the user changed
the weapon rule. The new tests check history preservation, assisted laps,
the per-lap budget, exact preview versus actual landing, checkpoint blocking,
safe lanes, shortcut context, and protection expiry. The seeded landing test
still covers 100 uses across all 11 combat courses, including shortcuts, and
drives for two seconds after each landing to check crashes and resets.

The release balance target is unchanged: firing whenever ready must save at
most 4 seconds over two laps at stock and maximum level on each difficulty.
Each successful use must advance the player by a positive distance. The
candidate remains subject to that gate and the private browser review.

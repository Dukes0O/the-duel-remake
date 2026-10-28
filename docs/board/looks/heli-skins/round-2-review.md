# SKIN-ART-GEAR, rounds 1 and 2 (14 October 2026)

Sheet: `round-2.jpg`: drop sight (fire service), heat-camera ball turret with
a thermal and a day window (search and rescue), long-lens zoom camera
(wildlife), stabilised TV camera ball with a red tally light (Barely News), the
cargo net under a heavy hook (supply), and the quieter main rotor with swept,
thinned tips (wildlife). Recipe `tools/blender/skin-gear.py`; one GLB each in
`public/assets/heli/gear/`, 252 to 1,540 triangles.

- Round 1: all read right; the cargo net's lifting legs ended in the air
  outside the bag.
- Round 2: the legs end on the bag's shoulders.

Verdict (Claude): **pick.** Each origin is its mount point on Kestrel One:
mount_nose (0, 1.08, 2.30), mount_belly (0, 0.74, 1.50), mount_side_right
(-0.60, 1.55, 0.45) in glTF metres (moved onto the body surface in part 2;
the first numbers, 0.85, 0.76 and -0.78, hung in the air); the cargo net's origin is the top of its
hook; the rotor shares main_rotor's pivot and spin axis.

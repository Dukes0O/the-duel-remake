# Crew round 3: Blender changes

Round 1 and round 2 evidence remains unchanged. Temporary pose studies and
rebuilds are internal work within this third round, not additional rounds.

## Support and recovery

The round 2 prone boots held the torso above the floor. Ankle extension now
allows the pelvis and torso to settle. Rook's final prone sample measures
pelvis 0 cm, chest 0.8 cm and hands 0.2/0.9 cm above the floor.

Recovery has separate prone, palm-supported push, kneel and rise keys. The
earlier sitting-in-air middle pose was replaced with a folded support knee and
a planted foot. Rook at the 0.583-second key measures the left shin/knee region
0.7 cm above the floor and the right foot at 0 cm. The early 0.292-second key
has both hands about 0.7 cm above the support plane.

The exporter solves shoulder pitch and ankle pitch while authoring the keys.
The shoulder search approaches the support plane within available reach;
the ankle search levels the downward-facing sole. These results are baked
into the exported animation. No runtime height or camera offset causes them.
Jump air height remains simulation-owned.

Each crew manifest records six support samples as minimum world heights of
deformed vertices whose region weight exceeds 0.65. These are measurements,
not a claim that every intermediate pose has perfect contact. Rook also has
four additional side support renders, with their own recorded cameras.

## Heads, cloth and UVs

- Nell, Odessa, Cinder and Wren have wider, shorter face geometry; Tusk's head
  is larger. Texture coordinates retain the original logical face mapping.
- Boot and glove UVs use narrow interior reference islands to avoid sampling
  the surrounding grey at their silhouettes.
- Jax has an open coat with thickness, cloth folds and blended pelvis/thigh
  weights instead of two solid leg-shaped coat slabs.
- Dune has a thin open cloth hood with a shaped edge instead of a padded shell.
- Tusk's plates curve over the deltoids. His matched side view now uses
  negative pi/2 yaw, matching the left-facing reference profile. Other crew
  side views retain positive pi/2 yaw.

The author inspected the support sequence, all generated asset checks, and
Jax/Dune/Nell front and Tusk profile renders. The matched game capture and
independent critic determine the visual result. Remaining projection bands
on profile surfaces, some pale wrist details, hair and fine facial likeness
remain visible and should be recorded for the next polish wave. This document
does not approve beta or claim a score of four.

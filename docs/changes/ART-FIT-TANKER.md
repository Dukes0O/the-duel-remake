# ART-FIT-TANKER

Kyle picked the Kenney delivery-flat cab and industrial tank. Claude settled
one rigid armored truck with three genuine factory valves, salvaged armor
and a roof boarding plate. Original CC0 sources and rights records remain.

## Changed

Round three fits the complete native rig to 11 m long, 3.5 m tall and 3 m wide.
The seated red handwheels face outward and measure about 0.6 m. Red tank bands,
capped ports, a striped rear bumper and a darker weathered cab improve targets
and scale. The lower windscreen uses a genuine salvaged steel sheet.

Claude picked round three on 1 October evening. These two corrections finish
its existing directions; there is no fourth round:

- The original roof donor faces use a separate continuous texture: plain dark
  steel in the middle, diagonal black and yellow warning paint at the border.
- Off beacon glass is dull dark amber. Lit glass uses saturated amber emission
  at 1.2 instead of six to prevent cream clipping. The posts keep their black
  emission mask. The three-valve health rule and recovery are unchanged.

The existing game scenario adds close roof views with lamps off and on.
Claude must see these before merge. Distant readability stays below the art
bar; Kyle has the final look when Convoy Raid is playable in the Preview.

## Tests

Tests first: two new evening native/presentation checks fail against the old
exported roof mapping and lit intensity. They cover the actual full-height
UV/texture binding, amber emission and recovery, not screenshot pixels.
The existing output-plan assertion now includes the new embedded roof image.
The scenario's explicit lit intensity changes from six to 1.2 for the approved
amber correction; all valve combinations and state checks are kept.

Before these corrections, all 59 native checks passed: source/lifecycle,
contacts, dimensions and final wheel/beacon geometry. One earlier Float32
lineage boundary was repaired with a one-micrometre tangential fit correction;
the original affine donor mapping and contact tolerances are unchanged.

The previous native export had 6,788 triangles and 34 draws. The corrections
retain the same donor topology and fit. No replay, world signature, physics,
save or health-policy assertion changes.

## Frame evidence

The existing opt-in chase recipe uses the actual production chase view at
both qualities, with the private rig 30 m ahead: hidden, visible, hidden.
Each branch retains 30 warm frames and every one of 600 RAF and render CPU
samples at 1280 by 800, DPR one. The simulation hash and rig pose stay equal.
This stationary view does not measure moving Convoy Raid or GPU time.

The previous run's real RAF p95 is 16.8 ms in all branches and both qualities,
with no interval over 33 ms. Its stricter advisory CPU check does not clear:
High median rises 10.7%; Performance rises 17.6% with 11.8% baseline drift.
Performance's FOV settles from 54.999969 to 55 degrees. These are explicit
diagnostic limits separate from the unchanged real frame-time budget.
All 3,600 samples stay in ignored evidence; the committed verdict is retained.

All twenty previous actual-game views passed with no errors or failed requests
and two inherited duplicate-Three warnings. New roof/native/whole-card gate
results will be recorded after the serialized check window.

## Removed

Removed the former shared-atlas roof warning mapping and clipping cream lamp
setting in the evening correction. No native donor geometry is replaced.
The long consumed testing transcript is folded into this note; Git keeps its
text history. Original licensed donor records and all three compact comparison
rounds remain. Review evidence is removed only after its verdict is recorded.

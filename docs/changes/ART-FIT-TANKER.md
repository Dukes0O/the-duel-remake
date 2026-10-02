# ART-FIT-TANKER

status: ready-to-merge after the fresh lane/build gate

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
Claude approved the paired roof views at 00:30 on 2 October. Distant readability stays below the art
bar; Kyle has the final look when Convoy Raid is playable in the Preview.

## Tests

Tests first: two new evening native/presentation checks fail against the old
exported roof mapping and lit intensity. They cover the actual full-height
UV/texture binding, amber emission and recovery, not screenshot pixels.
The existing output-plan assertion now includes the new embedded roof image.
The scenario's explicit lit intensity changes from six to 1.2 for the approved
amber correction; all valve combinations and state checks are kept.

All 61 current native checks pass: the original 42 source/lifecycle checks,
12 contacts, two dimensions and five final wheel/beacon/material checks. One earlier Float32
lineage boundary was repaired with a one-micrometre tangential fit correction;
the original affine donor mapping and contact tolerances are unchanged.

The corrected native export keeps 6,788 triangles and 34 draws, with the same
donor topology and fit. Its separate roof texture adds about 0.40 MB; the
complete self-contained model is 2.29 MB, below the advisory 8 MB target. No replay, world signature, physics,
save or health-policy assertion changes.

## Frame evidence

The existing opt-in chase recipe uses the actual production chase view at
both qualities, with the private rig 30 m ahead: hidden, visible, hidden.
Each branch retains 30 warm frames and every one of 600 RAF and render CPU
samples at 1280 by 800, DPR one. The simulation hash and rig pose stay equal.
This stationary view does not measure moving Convoy Raid or GPU time.

The corrected quiet run at synchronized d64c45f retains all 3,600 samples.
RAF p50 is 16.7 ms and p95 is 16.8 ms in every branch at both qualities.
Visible-rig maxima are 17.1 ms High and 17.0 ms Performance, with no interval
above 33 ms. Performance's first hidden control alone has two intervals above
33 ms, including 50 ms. RAF mean/p50/p95 ratios stay within the SPEC 10% limit.
Every simulation hash, rig transform, canvas and graphics setting stays equal.
This is the measured stopped chase fixture, not moving Convoy Raid clearance.

The unchanged combined diagnostic still does not clear. High and Performance
CPU control means drift 15.68% and 35.76%. Visible-rig CPU medians against the
two controls change +7.69%/−1.18% High and −14.71%/+11.54% Performance.
Performance FOV settles from 54.9999943423 to 55 degrees, exceeding the strict
one-millionth-degree pose diagnostic. No samples or assertions are changed.
These CPU and pose limits remain separate from real RAF frame-time evidence.

All 22 corrected actual-game views pass on a private memory-only port, with
no errors or failed requests and two inherited Three warnings. The browser
and private server close normally. Native loading and exact-once disposal
checks pass separately. The existing single ignored roof close-up pairs lamps
off and on; Claude approved both states at 00:30 on 2 October. The verified GLB
and generated provenance manifest remain private until Convoy Raid supplies
its runtime caller; the manifest has no game consumer. Claude approved this installation order: merge recipe, presenter and tests
now, and ARENA-07 installs the regenerated runtime GLB when Convoy Raid loads it.
Fresh lane/build gates run on this synchronized candidate before merge.

## Removed

Removed the former shared-atlas roof warning mapping and clipping cream lamp
setting in the evening correction. No native donor geometry is replaced.
The long consumed testing transcript is folded into this note; Git keeps its
text history. Original licensed donor records and all three compact comparison
rounds remain. Review evidence is removed only after its verdict is recorded.

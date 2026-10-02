# ART-FIT-TANKER

Kyle picked the Kenney delivery-flat cab and industrial tank. Claude settled
one rigid armored truck: no trailer, hitch or opening hatch. Original CC0
sources and licence records stay in the catalog and external art library.

## Final round three

- Rotate each complete native valve so its original red handwheel faces outward
  and measures about 0.6 m. Real pipe flanges still contact the native tank skin.
- Cap both pipe ports with approved container roof salvage painted tank colour.
  Three red bands around the lighter tank mark the valve targets.
- Use a thin dark steel boarding plate with diagonal warning paint only at its
  border. Two amber glass beacons stand on short dark posts at the front corners.
  The glass is about 0.4 m high; only it emits when all three valves are broken.
- Stripe the full rear bumper. Add stronger cab rust, low grime and an actual
  salvaged steel sheet across the lower windscreen.
- Keep the rigid model at 11 m long and 3.5 m tall. No race or save rule changes.

The corrected visual-readiness fixture completes all twenty actual game views
in High and Performance, including the normal chase view 30 m behind a car.
There are no errors or failed requests and two inherited duplicate-Three
warnings. The independent critic prefers round three, but its art match remains
below four. The roof center still reads as a striped grille; distant valves,
boarding readability and local wear remain weak. Claude picked round three on 1 October evening and cleared installation with
two corrections to its existing directions. There is no fourth round.

## Evening corrections

- The same native salvage roof now uses a separate continuous texture: plain
  dark steel in the middle, with diagonal warning stripes only around its border.
- Off glass is dull dark amber. Lit glass uses saturated amber emission at 1.2
  instead of six so it stays amber under the game tone mapping. The black post
  emission mask, health combinations and recovery policy are unchanged.
- The existing scenario now takes close roof views with the lamps off and on.
  Those close-ups go to Claude before merge; the three comparison rounds stay.

## Tests

Tests first: two new evening checks fail against the old native roof mapping
and loaded lamp intensity. They check actual UV/texture binding and amber
emission plus recovery, not screenshot pixels. The original 56 native checks passed; three new checks failed on
actual wheel size/orientation and beacon size/corner positions. Native acceptance
first passed 58 of 59, including all three new checks. The remaining exact
lineage failure was a Float32 vertex crossing a decimal rounding boundary.
A one-micrometre tangential fit correction preserves the original affine donor
mapping and contact precision. The corrected native rerun passes all 59 checks:
42 source/lifecycle checks, 12 contact checks, two dimensions and three final
wheel/beacon checks. Tests and contact tolerances are unchanged.

The candidate adds 460 triangles and eight draws over round two: native port
caps, the salvaged windscreen sheet and beacon posts. The corrected export is
6,788 triangles, 34 draws and 1.89 MB, below the advisory 8 MB file target.
The actual complete native assembly remains 3 m wide, 3.5 m tall and 11 m long.
Model, manifest and unchanged native logs are retained in private lane evidence.
The opt-in final-round frame recipe measures the actual stopped production
chase view at both qualities. Native counts are not a frame or look verdict.

Earlier source and output-planning gates passed without changing the approved
source bytes. The existing two duplicate-Three QA warnings remain unchanged.
No replay, signature, physics, lamp-health policy or save assertion changes.

## Frame measurement

`TANKER_ART_FRAME_QA=1` keeps the native final-round candidate and uses the
existing production chase view with the rig 30 m ahead. Each quality records
A1 hidden / B visible / A2 hidden: 30 warm frames and all 600 ordered RAF and
full `renderFrame` CPU samples per branch, at 1280 by 800, DPR and render ratio
one. Only the private rig is hidden in world submissions, including mirrors;
visibility is restored after each submission and both hooks restore in finally.
The state hash and rig pose stay equal. High's camera stays equal; Performance's
FOV finishes settling from 54.999969 to 55 degrees, so its strict camera control
reports unequal. This stationary presentation does not measure moving Convoy
Raid or GPU time.

Real RAF p95 is 16.8 ms in every branch at both qualities, with no interval over
33 ms. CPU mean / median / p95 / max, in milliseconds:

| Quality | A1 | B | A2 |
| --- | --- | --- | --- |
| High | 3.040 / 3.0 / 3.7 / 5.2 | 3.136 / 3.1 / 3.8 / 4.6 | 2.878 / 2.8 / 3.5 / 4.7 |
| Performance | 1.962 / 1.9 / 2.6 / 3.2 | 2.096 / 2.0 / 2.8 / 4.5 | 1.868 / 1.7 / 2.5 / 3.0 |

The new advisory CPU/control check does not clear: High's median is 10.7%
above A2; Performance's median is 17.6% above A2 and its baseline medians drift
11.8%. This diagnostic does not show that SPEC's actual frame budget failed.
These limits remain separate from the unchanged real RAF pacing. Claude
has picked round three using this limited frame evidence. Whole-card gates
still apply, and the repaired roof close-up needs his review before merge.
All 3,600 samples, draw and triangle counts, mirror refreshes and snapshots are
retained in private `frame-qa/tanker-comparison.json`. Actual QA repeats all
twenty captures: zero errors or failed requests and the same two warnings.
The existing comparison sheets and below-bar distant readability stay explicit.

## Removed

Reworked the small sideways wheels, dark pipe openings, roof plate, lamps,
cab wear and rear warning markings. Removed the former shared-atlas roof warning mapping and clipping cream lamp
setting in the evening correction. No native donor geometry is replaced.
The long consumed testing transcript is folded into this note; its text history
remains. Original donor files, licensed records and both comparison rounds stay.

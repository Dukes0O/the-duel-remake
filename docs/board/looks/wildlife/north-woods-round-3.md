# North woods round 3 of 3

## Claude's round 2 verdict

White-tailed deer, black bear, beaver and eastern wolf: PASS. Do not change them.
Moose: FAIL again. Antlers still look like a plate with spikes on the head;
the body looks like a box on thin stilts.

## Round 3 design, before code

Rebuild the moose from the licensed Quaternius deer donor mesh and rig.
Retain the donor's walk and idle clips, bone hierarchy and animation curves.
Use a parent frame to fit about 1.9 m at the shoulder. Deform the donor body
into a longer, deeper barrel with a tall rounded shoulder hump, thick upper
legs, pale grey-brown lower legs, heavy drooping muzzle and throat dewlap.
Use two separate broad palmate antler lobes, rooted at the skull sides,
sweeping sideways and curving up, with short points on their outer rims.
Use a dark brown-black coat. The other four runtime files remain byte exact.

Use existing GLB review views and motion samples, the existing Blender-output
suite, lane gate with --jobs 2 --keep-going, and production build. No frame
measurement. This is the final North woods art round; stop after submission.

## Claude's written catalog review, rule 18

Approved in the round 3 brief: exclude the four new wildlife provenance rows
from the P4 kits and tanker source protected-row hashes by wildlife card or
id, following the audio pins' treatment of new cars. Keep both expected hash
values exactly. These checks still protect every old catalog row.

## Final submission

The final sheet is north-woods-round-3.jpg, 337,145 bytes. The requested
scratchpad copy is codex-wild-north-woods-3.jpg. Both copies have SHA256
a47627a005ee88c7080a773aa15cbccaa7e603e606213bd98e6e9ec5d7d983fb.
The round 2 JPG was recycled. All five images come from actual GLB imports,
with the same fixed 14 m, 55 mm review cameras and existing references.
The four passed runtime GLBs are byte exact from the start of this round.

| Animal | Triangles | GLB bytes | Lowest Idle / Walk sample, mm |
| --- | ---: | ---: | ---: |
| White-tailed deer | 4,371 | 1,710,932 | +1.08 / -4.38 |
| Moose | 3,939 | 1,662,384 | +1.35 / -5.48 |
| Black bear | 3,000 | 769,312 | -1.53 / +3.95 |
| Beaver | 2,600 | 782,268 | -14.04 / -12.18 |
| Eastern wolf | 4,100 | 1,766,804 | +0.48 / -8.80 |

The moose shoulder deformation blends the donor weights to avoid hard
creases. Its 26 exported animation tracks match the deer export exactly;
all required donor clips remain. Each Idle and Walk clip was sampled at six
phases. Bounds stayed finite, and motion views showed no detached parts.
The beaver keeps the existing 20 mm tail allowance. This is a model review,
not course placement, frame timing or an in-game grounding verdict.

## Round 3 verdict

Submitted to Claude. The final moose has a rounded barrel and shoulder hump,
separate lateral palms, pale lower legs, heavy muzzle and visible throat bell.
It remains stylised beside the photographic reference. Claude decides whether
it passes. No fourth round will start. Lane/build results are in the change note.

## Checks

Lane coverage GREEN: 69 suites passed on the first 86-suite run; 17 tool-access
failures passed on their single rerun with existing FFmpeg and PowerShell
accessible, --jobs 2 --keep-going throughout. No passing suite was repeated.
Blender-output: 141 checks passed. Both original catalog pins passed unchanged.
Production build: PASS, 599 modules, 1.03 s. Full details are in the change note.

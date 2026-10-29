# North woods round 2 of 3

## Claude's round 1 verdict

- Black bear: PASS. Add a little coat roughness to remove the smooth plastic look.
- White-tailed deer: close. Darker grey-brown back and flanks; white only on a smaller throat patch, belly, inside legs and tail underside. Raise the tail a little so the white flag reads. Darker antler bases.
- Moose: FAIL. Rebuild to the reference proportions: brown-black body, long legs with thicker tops and lighter grey-brown below the knee, tall shoulder hump, long drooping muzzle and throat bell. Two broad palmate antlers must grow from the skull sides, with short rim points, rather than float above the head.
- Beaver: too orange and tail hard to see. Dark chestnut coat, clearly visible broad grey-black scaly paddle, slightly hunched pose. Keep the real size, about 1 m including tail.
- Eastern wolf: too white and fox-like. Grizzled grey-brown coat, darker saddle, tawny legs and ears; pale only on chest and belly. Heavier neck/chest and longer legs.

## Round 2 plan, before code

Keep the licensed donors and their rigs and clips. Repaint anatomical regions
in donor space. Raise the deer tail around its existing attachment. Broaden
the wolf neck and chest without moving its joints. Retain the beaver's 1.10 m
nose-to-tail extent while broadening its paddle and lifting its back slightly.
Rebuild the original moose's body, legs, head and connected antler palms from
the existing reference. Bear shape stays unchanged; only its coat changes.

Use the existing exported-GLB review recipe at 14 m and 55 mm, with the same
lighting. Inspect Idle and Walk at six phases. No frame timing or game
placement. Existing Blender-output checks prove budgets, skin and clips;
lane tier and build follow. Stop after this sheet for Claude's verdict.

## Round 2 submission

All five round 2 exports are now present. The moose is the export from
30474271; this continuation rebuilt the other four animals from that commit's
recipes. No additional art round or source revision was made.

The sheet is north-woods-round-2.jpg, 337,151 bytes. Its exact copy is
codex-wild-north-woods-2.jpg in the scratchpad named in the brief. Both have
SHA256 2bd6bcfacb8b14b75508068992671e8240b94fb098fa7f7e1d6df43fa38da36c.
Side and three-quarter images use the imported runtime GLBs, the existing
species references and the same fixed 14 m camera. The beaver remains small
at this genuine scale; its exported nose-to-tail extent is 1.099 m.

| Animal | Triangles | GLB bytes | Lowest Idle / Walk sample, mm |
| --- | ---: | ---: | ---: |
| White-tailed deer | 4,371 | 1,710,932 | +1.08 / -4.39 |
| Moose | 3,170 | 891,992 | -2.39 / +2.09 |
| Black bear | 3,000 | 769,312 | -1.53 / +3.95 |
| Beaver | 2,600 | 782,268 | -14.04 / -12.18 |
| Eastern wolf | 4,100 | 1,766,804 | +0.48 / -8.80 |

Both clips were sampled at six phases per animal. All bounds were finite.
Side, three-quarter and four motion pictures per animal were inspected;
no detached parts or exploded limbs were seen. The beaver's low tail remains
within Claude's existing 20 mm grass allowance. These are technical checks,
not an art pass or an in-game grounding check.

## Verdict

Submitted to Claude for round 2 judgment. No round 3 work started. Shapes
remain visibly stylised beside the references, particularly the moose's
segmented upper legs and flat antler palms. The deer flag and the beaver's
paddle are small from this fixed camera. Claude decides whether the requested
colour, roughness and anatomy changes are sufficient.

The lane gate and build results are recorded in docs/changes/WILD-ART-SRC.md.
Catalog pins remain unchanged pending Claude's written review there.

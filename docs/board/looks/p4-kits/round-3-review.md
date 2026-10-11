# P4-KITS final round 3

Claude final verdict: Paddock 3.5, Snow 3.5, Yeti 3.5, all pass.
This is the third and final formal art round. No fourth round.
Source/runtime candidate: `61dab66b`. Manifest SHA-256:
`36c8ce04de78d12d262cc9b8232d60f880ebd987ba30c85fb096800c3ca1e72f`.

Claude's written round-two fixes are applied to four held pieces only:
gantry span/five wheel-sized lamps/banner; garage open dark bay/half-raised
door/team stripe/wear; gallery thick roof/heavy pillars/uphill wall/open
valley/snow heaps; Yeti continuous grey face/brow/eyes/nose/mouth/uneven shag.
All other 31 records and 62 GLBs remain exact. No fourth round is planned.

| Sheet | Bytes |
| --- | ---: |
| [Paddock](../p4-kits-paddock/round-3.jpg) | 303,844 |
| [Snow](../p4-kits-snow/round-3.jpg) | 309,477 |
| [Characters](../p4-kits-characters/round-3.jpg) | 482,776 |

Sheets match original-source and adapted Blender panels to actual High and
Performance renderer frames. Full frames, no pixel edits. Night character
frames show the actual 2.8 m Yeti at 30 m, including roar and departure.
Day comparisons normalize props to 4 m; track cards own actual placement.

The unchanged focused 35-pair check passes, including clearance, skins,
clips, provenance and lamps. All four original Yeti clip tracks remain
exact in both qualities. Yeti distant geometry is 1,886 triangles.
Native functional capture passes on private port 21788: memory-only saves,
40 frames, zero issues, four expected duplicate-Three warnings. Race and
profile state remain preserved. No frame measurement or full tier ran.

## Retained earlier verdicts and limits

Claude round two: Safety 4, Harbour 3.5, Forest 3.5 and Snowman 4 pass;
other snow pieces pass. Judge harbour lantern glow on its track at night.
Round-one passed records/38 GLBs and the catalog/tanker pin stayed exact;
round three retains all 31 round-two passed records/62 GLBs unchanged.
The original forest source FBX importer set shader Alpha 0 while diffuse
Alpha remained 1. The guarded render-only repair restored that diffuse Alpha
for three original tree copies; geometry, RGB, camera and lights stayed exact.

Original four animation tracks, weights and joints stay exact. The authored
10.0333 s departure clip travels 2.40000035 m and ends facing away. Fixed
stance intervals exclude one 30 Hz frame at each swing boundary; terrain
does not select the intervals. Maximum fixed toe planar motion is
0.000941/0.000936 m High/Performance, heel motion 0.014848/0.008347 m;
departure heel motion stays below 0.009 m. Flat-ground weighted-anchor
height error is at most 0.000189 m, whole-sole minimum -0.013261 m.
Native terrain whole-sole minimum remains -0.039495/-0.038204 m across
ground ranges 0.041014/0.040094 m. No sample has both soles over 3 cm high.
Strict signatures still fail from exporter rounding: POSITION 2.3841858e-7 m,
inverse bind 1.1920929e-7, rest-node translation 1.19209293e-7 at most.
The Director accepted those measured deltas for native art review. No test
assertion or tolerance was weakened. This face correction does not repair
native contact or strict signatures; no overall movement pass is claimed.

Raw Blender panels: `.evidence/2026-10-10/P4-KITS/round-3/`.
Native packet: `.evidence/2026-10-11/P4-KITS/round-3/native/`.
The source recipe uses the host date for raw render paths. This packet is
for the user's 11 October overnight run. Director source review is clear. Lane/build remain before merge.
Reviewed lighting/capture source a89e562c is synced; all kit assets, recipes
and sheets retain their reviewed bytes; canonical paths change only. The native packet predates that sync.

## Removed

Four held runtime pairs are replaced in place. Removed closed rear-door and
black face adaptations; temporary attached facial blocks were removed before
formal review. Passed assets stay exact. Delete raw captures after verdict.
Consumed round-one/two sheets and the superseded round-two review are
removed after retaining their needed verdicts and limits here. Final three
sheets move byte-for-byte into direct p4-kits-* family homes.

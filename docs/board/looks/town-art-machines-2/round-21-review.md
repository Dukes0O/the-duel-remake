# TOWN-ART-MACHINES-2 — round 21: roller

## Result

Second roller round of six. The round 20 photos were reused. The recipe now prints the target dimensions and scales the side carve from the 1.30 m rear tyre: 108 px radius gives 0.006019 m/px. That scale makes the full side silhouette 3.491 m long, below the card's rough 4.50 m estimate. The carved body bounds are 3.227 m long, 1.68 m wide and 2.00 m high. The separate canopy reaches 2.90 m. The side photo's tyre radius implies a 1.348 m diameter. The front drum is 1.50 m diameter by 1.80 m wide and its bounds touch the ground at 0.00 m.

A flat roof and four posts use pixels from the worn yellow roller photo; the prior olive canopy material is no longer used. The six comparison views now include the full projected machine and pose. They still show a fragmented photo carve and assembly gaps. This round is **not a pass**; Claude should judge the sheet and decide whether the source photos or carve need another approach. No mixer, crane or pipe truck recipe code was changed.

## Checks

- Blender 4.5.13 completed the family export (5,857,096 bytes) and rendered side, front, rear, overhead, rest and work views from the exported GLB.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed.** The export check covers the per-machine triangle ceiling of 15,000 and the family size limit of 8 MB.
- No lane tier, build, browser scenario or look test was run. Claude should inspect body continuity and seams, the dimension mismatch, drum seating in both yoke arms, canopy wear, and whether the three unchanged trucks remain identical.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

- Removed the roller canopy's old faded olive material use; replaced it with photo-derived worn yellow.

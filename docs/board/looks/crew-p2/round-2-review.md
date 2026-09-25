# Rook P2 round 2 review

## Verdict

Director: resemblance 2, readability 3, grounding 2, scene consistency 3. Frame cost unmeasured. Keep this candidate isolated. The painted face is visibly better, but severe clothing deformation prevents acceptance or other crew conversion.

## Evidence

- Candidate: `art-build/crew/rook-p2/paint-1/rook-p2-candidate.glb`, SHA-256 `9d7a2cd624aca63771b14b4ef27bf7838b28752039f57d48b31c7edc2067d3f6`.
- Runtime Rook remains the round-3 baseline. Private memory-only browser port 10712 captured 44 views in High and Performance with zero warnings or errors and a positive candidate substitution in both qualities.
- Matched immutable reference/Blender/game sheet: `round-2.jpg`, 85,737 bytes. Canonical idle time 0.25 seconds, front/side/back, 432 by 576, vertical field of view 28 degrees.
- Source face image is calibrated from its measured landmarks. Palette now uses blue-green shirt, tan vest/scarf and khaki trousers. This is a face-paint trial; the clothing remains provisional.

## Five differences to fix

1. Actual aim and mid-get-up captures show long tan clothing panels stretching toward the knees. The previous jacket-seam test passes but does not cover this visible defect. Identify affected triangles and their real chart/weights before assigning blame to a garment.
2. The scalp has an exposed tan crown patch and separate angular hair ribbons, unlike the reference's layered hair.
3. Broad plain vest and shirt faces lack seams, pockets, folds and worn fabric detail.
4. Trousers remain straight and plain, missing knee shaping and the reference's belts and asymmetric equipment.
5. The scarf and rear pack read as simple rounded blocks; material values in the game are darker than Blender.

The face has coherent features at this distance. This improvement does not establish a likeness-four full character. The next change must correct the real exported rig deformation before more paint or a crowd frame test.

# Rook P2 round 6 review

## Verdict

Director: resemblance 3, readability 3, grounding 3, scene consistency 3. Frame cost unmeasured. Painted cloth makes the figure closer to the reference, but the exposed tan crown, cap-like hair, simple scarf and straight sleeve forms keep it below the required four. Runtime crew remain unchanged.

## Evidence

- Candidate `art-build/crew/rook-p2/paint-5/rook-p2-candidate.glb`, SHA-256 `b226110a496145feb1ff56ffbdc9f1b2c6ba208358d8900afb1668078199cdaa`.
- Private memory-only browser port 5808: 44 High/Performance captures, zero warnings/errors. Immutable matched sheet `round-6.jpg`: 90,574 bytes. Fixed camera, reference and pose settings remain unchanged.
- Near 7,986 and far 1,849 triangles. Two broad padded trouser UV panels replace fragmented islands. Four generated cloth swatches are mapped through explicit hashed calibration; the original 1254-square source remains ignored and unchanged.
- Source cloth SHA-256 `793ee85733cd1ed0446b54d0cf5ef3746d5dba311aaf8b79d4fda6828e93e928`. Although requested opaque, its alpha is 216-250. The reviewed RGB-only transfer writes into an opaque atlas; the independent final-alpha-255 and face/hair isolation checks pass. The exact generation prompt and measured source crops are retained in the recipe.
- Grouped garment checks pass 4/4. Existing source/exported hair sample guards pass, but they do not cover the entire visible scalp. The actual side/back crown still has tan patches. The prior waist hole stays closed in the bent get-up pose.
- Seven measured trouser width bands already match reference contours within about one to two native pixels. No arbitrary broad narrowing was made. Any further silhouette edit needs actual reference evidence.

## Next approach

Use a dark authored scalp/hair base above the measured hairline and shape the existing clumps around it, preserving the painted eyes and beard. Investigate portrait-background color on the upper/back head UVs before changing geometry. Improve the scarf's layered wrap and rolled sleeve construction as a grouped pass. Keep the waist, motion guards and budgets; score another actual game round. This wave has four rounds left. No other crew conversion or likeness-four claim is authorized by this result.

## Independent review

Crew review: resemblance 3, readability 3, grounding 3, scene consistency 3; frame cost unmeasured. The cloth colors and broad trouser panels improve the game figure. The aim and get-up views keep the trouser panels attached and the waist covered. The side and back views show a broad tan scalp area through the crown; it appears in Blender and both game qualities, so the sparse hair-ray checks do not establish visible scalp coverage. The trousers match the seven measured width endpoints but still interpolate as straight tubes. Preserve those endpoints and use only measured intermediate fold changes.

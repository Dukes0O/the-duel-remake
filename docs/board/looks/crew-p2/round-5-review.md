# Rook P2 round 5 review

## Verdict

Director: resemblance 2, readability 3, grounding 3, scene consistency 3. Frame cost unmeasured. The actual mid-get-up side view now has continuous waist coverage in High and Performance. The candidate remains below the likeness target and is not accepted for runtime.

Independent Crew review: resemblance 2, readability 3, grounding 3, scene consistency 3; frame cost unmeasured. The round-4 grey waist opening is closed in the actual round-5 get-up side view. A narrow waist still reads as simple garment fit. The matched front/back sheet still shows exposed scalp at crown and temples, flat vest panels, and straight trouser and boot forms; closing the waist did not raise likeness.

## Evidence

- Candidate `art-build/crew/rook-p2/paint-4/rook-p2-candidate.glb`, SHA-256 `41d54088ea846ce435fe1dc3c17e2004dbc715da137a4eb02daf3f4984d8d2ac`.
- Private memory-only browser port 15256: 44 captures, zero warnings/errors. Immutable matched sheet `round-5.jpg`: 85,726 bytes; fixed camera, idle time and reference unchanged.
- The existing sixteen bottom core vertices move from z1.040 to z0.985. No geometry was added. Independent source and actual exported triangle rays cover the waist at two heights in five directions; armhole, cuff motion and waist-point guards remain green.
- Director inspected actual get-up side and aim front in both quality settings. The prior grey opening is closed. A narrow dark core remains visible between the jacket and trousers in aim; garment fit still needs polish, but absent body coverage is corrected.
- Near mesh 7,986 triangles; far mesh 1,850. Runtime crew remain unchanged. The pending hair-coverage regression is not a passing gate; no frame measurement was made under concurrent test load.

## Next approach

Reshape the existing hair cap and clumps to cover the actual scalp, then improve sewn garment panels, folds, glove and trouser shapes. Preserve the now-continuous waist, corrected trouser bindings and calibrated face paint. Use a distinct candidate path and a new actual game round. Do not convert the other seven crew until Rook reaches the required scores.

# QA-HARBOUR-ROAD-CLEARANCE

Claude's answered course correction opens only the Lantern Hairpin from radius 9 to 10 m. Its 175-degree turn, widths, layoutVersion 2, field/grid and all other authored values remain exact. The failed midpoint-heading experiment is removed: tools/test-circuits.mjs is restored exactly from integration 8da6c8a8, including its original start-heading sweep and every contact assertion, probe, seed, dimension, allowance and tolerance.

## Changed assertions

The one explicit radius assertion found in the existing tests, tools/test-circuit-layouts.mjs, changes 9 to 10 to match Claude's design number. The same file also has an explanatory 9 m comment, but that is not a second radius pin. No second explicit pin was found in the existing test sources, so none is invented. The flying-lap speed assertion remains exactly greater than 12 and less than 35 mph; all wall, clearance, crash and handling assertions stay unchanged. Local Harbour comments describe the new radius. No reference or world-signature output is regenerated at this source freeze.

## Checks and retained failure

Root reviewed the earlier operand-only midpoint change 0c6542e7. Its original focused suite still failed wall-right-1105 at s 2056/lateral -3.5, exit 1 in 3676.1392 ms. The wall is at s 2064.532654749/lateral -8. Original start-heading contact fraction was .384209; midpoint was .301798. Read-only smaller midpoint steps of 2, 1, .5 and .25 m also retained contact; the .25 m calculation first hit near s 2057.25. These were diagnostic calculations, not an accepted test or proof of a driven arc. Evidence remains in .evidence/2026-10-14/QA-HARBOUR-ROAD-CLEARANCE/final-0c6542e7. No lane gate or build followed that failure.

Current integration merged normally without conflict before this correction. Source-only preparation has run no checks, reference rebuild, capture, gate or build. Root reviews before the original focused geometry check. If radius 10 still contacts the hairpin wall, stop with the actual contact numbers and return to Claude; no further geometry guess is authorized. Only Harbour's own reference and world fixture may follow a geometry pass under the separate measured-output grant. No other course output or assertion changes.

## Removed

Removed only this lane's failed midpoint-heading sweep override, restoring the integration test exactly. Replaced the authored 9 m Lantern Hairpin radius and its one explicit design expectation with Claude's 10 m decision. No wall policy, tolerance, body dimension, driver or other course is removed or changed.


## Radius 10 geometry and approved scene capture

Root's independent source review is clear. The original focused test-circuits.mjs passed on 4a2c1c9e: 116894 checks across 20 events and four seeds, exit 0, wall 64227.7844 ms under concurrent foreign gates. Every original assertion and probe remains intact. The existing world-composition --capture completed with immutable features, exit 0, wall 37578.8062 ms. All 19 other captured scene rows match their existing fixtures exactly. Only Claude's pre-approved Harbour fixture changes, to hash 0ec4194da979120d71138537d38a0f34ab87abf9dbe0a02c41f2b6b2adab4d9c (1134 nodes, 1117 meshes, 223085 instances; geometry/material/texture counts unchanged). This is a measured radius change, not blind signature regeneration or new visual acceptance. Outputs are in this lane's ignored .qa-dist/harbour-radius10-* logs and receipts. The reference rebuild, canonical nearby tier and build remain UNRUN pending the shared check slot.


## Complete native reference rebuilt

The existing single-event build-reference-laps tool completed unchanged on 634573f5, exit 0, wall 6888.8496 ms. It validated its required three native laps and published only Harbour's complete fixed record: 77613 ms, 204 samples, track-v1-f64d259d. Car, Club driver, Medium, seed 1989 and fixture version 1 retain the tool's ordinary policy. The previous record was 77700 ms, track-v1-0873f8fe. No partial/probe record, fitted time, other course output or driver setting changes. Source, own measured reference and approved scene fixture are now ready for the canonical nearby gate and build; neither has run yet. No merge, frame or release pass is claimed.


The original existing Lantern Hairpin test also passed on792ca6b9, one selected test with no skips/failures, wall6495.316ms (native test duration5340.3815ms). Its12..35mph flying-lap limit, zero crashes and every clean-lap assertion remain exact. Source review is clear; current integration, including the accepted Panorama town helper, is merged normally before the canonical Harbour gate. Own radius, test expectation, measured reference and approved Harbour fixture remain unchanged. No gate or build has yet run on this final union.


The radius10 gate38/40 exposed the already carded closing-strip/lining fault. FIX-ROAD-SEAM is reviewed and merged into the joint acceptance lane; the failed midpoint stays removed and every contact/12..35mph/1.5m/triangle guard stays exact. Joint b1fc8b1f native passes8High/Performance views with temporary saves and zero issues/warnings. Capture keeps19other scenes exact; measured combined Harbour hash feb4256c74d44e99a8deebc6be850a77f587ee6d2856312725bf68f27df8cb46 replaces this card's earlier0ec radius-only hash. Reference77613ms/f64d259d remains exact. Both cards merge atomically only after the corrected canonical/jobs4/build; no intermediate broken-source merge or release.

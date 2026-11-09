# TOWN-ART-MACHINES-2 — round 27

## Changed

Updated the loader photo carve and measured tyre locations from the side ground line and tyre centres. Replaced the open star-pattern tyres with solid dusty rubber and individual worn hubs. Moved the arm joint to the photographed frame pin and the bucket joint to the arm tip, with the bucket set at floor height at rest. Regenerated the rear reference as one centered rear view. Rebuilt the family GLB and made the round 27 comparison sheet.

Claude should inspect the remaining dark round artifact by the hood, the arm and bucket connection in both poses, the incomplete front frame, and the rear/overhead projections. The four passed machines were not intentionally changed.

## Checks

- `node tools/test-blender-output.mjs`: **389 checks, 0 failed** (run to completion after the final rebuild).
- Blender family export: completed; GLB is 5,589,964 bytes, under the 8 MB family cap.
- Loader triangle and part budgets: included in the passing Blender output checks.
- Browser/look checks: not run here; Claude should judge the round 27 sheet and the assembled poses.
- Changed assertions: none.
- Race fingerprints: not applicable to this art card.

## Removed

Removed the old multi-view rear reference, the previous open/star-pattern loader wheel geometry, and the stray small pin loop from the loader arm trace. No other machine recipe sections were intentionally changed.

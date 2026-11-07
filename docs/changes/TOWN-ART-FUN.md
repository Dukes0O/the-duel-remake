# TOWN-ART-FUN round 3

## Changed

- Re-exported `fun.glb` (2,608,832 bytes). The named `big-wheel:wheel` pivot is visibly turned 18 degrees around its axle.
- Fixed individual review framing to compute bounds from each imported child mesh's world matrix. This prevents cameras from framing unrelated local bounds.
- Added `round-3.jpg` (218,521 bytes) and the review note. The sheet compares the available fountain, tavern and wheel photos with exported driver and mayor views.

## Checks

- Blender export and imported-model render — completed.
- `node tools/test-blender-output.mjs` — passed, 305 checks, 0 failed.
- `node tools/test-repo-hygiene.mjs` — passed; size targets remain advisory.
- Browser and in-game look checks — not run; Claude owns them. Claude should inspect photo/model fidelity for fountain, tavern, wheel, and the turned pivot.
- No assertions changed. Race fingerprints: not applicable; art only.
- **Acceptance gaps:** this round did not rebuild the fountain or tavern from multi-view photo masks, did not trace the wheel from a dead-on photo, and did not create measured grid overlays or the requested additional views. The only tavern photo is a front view, the wheel source is oblique, and the fountain set lacks rear. The sheet records the mismatch. Review note marks the result as failed so it is not mistaken for completion.

## Removed

- Removed the superseded `round-2.jpg` and `round-2-review.md` after writing round 3 evidence.
- No runtime code or test behavior was removed.

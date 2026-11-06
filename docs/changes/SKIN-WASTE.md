# SKIN-WASTE

## Changed

- Kept the exported `PAINT_PRESETS` catalog at its original 11 entries. The
  eight Wasteland finishes live in a separate internal catalog and appear only
  when `wasteland-town` is enabled and the player has found the gate.
- Passed the switch through garage display, purchase and every race appearance
  path. This follow-up fixes four race setup calls that omitted the town switch.
  The garage now checks the filtered catalog before looking up a finish label.
- Wasteland purchases use scrap, and the garage shows the scrap price and
  balance. All eight finishes cost 250 scrap.
- Added `tools/blender/skin-waste-sheet.py` and the Blender-rendered comparison
  at `docs/board/looks/skin-waste/round-1.jpg`.

## Checks

- `node tools/test-paint-presets.mjs`: passed, 170 checks. The existing
  11-entry catalog assertion is unchanged.
- `node tools/test-paint-integration.mjs`: passed, 35 checks.
- Follow-up regression: `node tools/test-paint-integration.mjs` passes, 39
  checks. It buys Rust Patina for 250 scrap, confirms it reaches a race with
  the town switch on, and confirms the saved finish remains while an off-switch
  race uses factory paint.
- A direct paint API probe passed: off hides all eight entries and the label
  lookup; on exposes them and a purchase debits exactly 250 scrap.
- `npm.cmd run build`: passed. Vite reported large-chunk and
  ineffective dynamic-import warnings.
- Blender 4.5.13 rendered the Titan, Dusthawk Rally and Bugatti Bolide in all
  eight finishes. The comparison sheet is 369,724 bytes, below 500 KB.
- No lane tier was run for this follow-up; Claude runs it. No browser check was
  run in this lane. Claude should check the
  garage with `wasteland-town` off and on, confirm the hidden catalog stays
  unchanged while off, verify the 250-scrap purchase, and review every finish
  on all three cars in the comparison sheet.

## Changed assertions

- None. Existing paint test files and assertions are unchanged.

## Race fingerprints

- No race rules, replay paths or course data changed. Fingerprints are not
  applicable.

## Removed

- Removed the obsolete statement that an active full-tier hold blocked the
  paint tests and build. The first inbox entry is a RELEASED line.

Claude removed `tools/blender/skin-waste-sheet.py` from the merge. It did not meet the checks for a review helper, and round 1 does not pass. Round 2 of this open card brings its recipe back.

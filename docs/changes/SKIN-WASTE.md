# SKIN-WASTE

## Changed

- Kept the exported `PAINT_PRESETS` catalog at its original 11 entries. The
  eight Wasteland finishes live in a separate internal catalog and appear only
  when `wasteland-town` is enabled and the player has found the gate.
- Passed the switch through garage display, purchase and race appearance paths.
  The garage now checks the filtered catalog before looking up a finish label.
- Wasteland purchases use scrap, and the garage shows the scrap price and
  balance. All eight finishes cost 250 scrap.
- Added `tools/blender/skin-waste-sheet.py` and the Blender-rendered comparison
  at `docs/board/looks/skin-waste/round-1.jpg`.

## Checks

- `node tools/test-paint-presets.mjs`: passed, 170 checks. The existing
  11-entry catalog assertion is unchanged.
- `node tools/test-paint-integration.mjs`: passed, 35 checks.
- A direct paint API probe passed: off hides all eight entries and the label
  lookup; on exposes them and a purchase debits exactly 250 scrap.
- `npm.cmd run build`: passed. Vite reported large-chunk and
  ineffective dynamic-import warnings.
- Blender 4.5.13 rendered the Titan, Dusthawk Rally and Bugatti Bolide in all
  eight finishes. The comparison sheet is 369,724 bytes, below 500 KB.
- No lane tier or browser check was run in this lane. Claude should check the
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

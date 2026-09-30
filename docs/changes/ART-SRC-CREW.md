# ART-SRC-CREW

status: review
source_choice: Quaternius Modular Men (B)

## Decision

Offer two free CC0 starting packs, inspect the cached original models and compare their source previews beside current in-game Rook. Kyle authorized choosing existing assets on 30 September; the Director selects Quaternius B before later adaptation. This completes the sourcing step only. Candidate limits are recorded in the sheet and review note.

## Evidence

Official pages and downloaded licences say CC0. Source, author, licence and checksum records are in `tools/art/catalog.json`. Blender 4.5 inspection: Kenney body 1,604 triangles, 58 bones, no embedded actions, three separate idle/jump/run animation files; Quaternius Punk 5,500 triangles, shared rig 79 bones, 24 actions.

Current Rook uses the unchanged production GLB and renderer in a private memory-only pose and camera fixture. The production exit transition creates the fighter. The final scenario verifies loaded idle Rook, exclusive `rook-near` draw and memory isolation. A visibility bug in the capture recipe assigned undefined instead of false; it is fixed. Visual inspection rejected the car image and confirms the finished sheet shows the full current fighter. No runtime source or assets changed.

Browser: final art-source-current recipe passed on private port 10701; memory-only saves, zero warnings, zero errors. Comparison sheet: 147453 bytes; below 500 KB. No race source, save code or replay assertions changed. Race fingerprints are unaffected because only source records, comparison tooling and review documents changed. No game event was added, so no sound cue applies. No new wording-only tests; the sourcing card uses independent document/visual review and the required lane/build gate.

Independent source review at 0b0a611 is clean: all nine checksums, official CC0 pages and cached licences, original Blender geometry/rig/action counts, actual current Rook image and source-only scope verified. The reviewer accepts Quaternius B under Kyle's new direction. No existing assertion changed. Mandatory lane/build gate on this final selection commit is pending; the integration run log records its actual result before merge.

## Removed

No game art replaced. Downloaded sources stay in `C:/Users/kyleb/dev/art-library/`, not shipped or committed. Consumed raw captures and logs are deleted after the verdict; retain only the compact sheet, recipe and source licence records. Earlier misframed screenshots are excluded from the comparison.

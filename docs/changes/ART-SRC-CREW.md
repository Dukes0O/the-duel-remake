# ART-SRC-CREW

status: building
waiting_on: kyle

## Decision

Offer two free CC0 starting packs, inspect the cached original models and compare their source previews beside current in-game Rook. Kyle chooses before adaptation. This completes the sourcing step only. Candidate limits are recorded in the sheet and review note.

## Evidence

Official pages and downloaded licences say CC0. Source, author, licence and checksum records are in `tools/art/catalog.json`. Blender 4.5 inspection: Kenney body 1,604 triangles, 58 bones, no embedded actions, three separate idle/jump/run animation files; Quaternius Punk 5,500 triangles, shared rig 79 bones, 24 actions.

Current Rook uses the unchanged production GLB and renderer in a private memory-only pose and camera fixture. The production exit transition creates the fighter. The final scenario verifies loaded idle Rook, exclusive `rook-near` draw and memory isolation. A visibility bug in the capture recipe assigned undefined instead of false; it is fixed. Visual inspection rejected the car image and confirms the finished sheet shows the full current fighter. No runtime source or assets changed.

Browser: final art-source-current recipe passed on private port 10701; memory-only saves, zero warnings, zero errors. Comparison sheet: 147453 bytes; below 500 KB. No race source, save code or replay assertions changed. Race fingerprints are unaffected because only source records, comparison tooling and review documents changed. No game event was added, so no sound cue applies. No new wording-only tests; the sourcing card uses independent document/visual review and the required lane/build gate.

Lane/build gate and independent review pending.

## Removed

No game art replaced. Downloaded sources stay in `C:/Users/kyleb/dev/art-library/`, not shipped or committed. Consumed raw captures and logs are deleted after the verdict; retain only the compact sheet, recipe and source licence records. Earlier misframed screenshots are excluded from the comparison.

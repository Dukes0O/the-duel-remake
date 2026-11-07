# TOWN-ART-OUTPOSTS

Status: deck-town model and round-11 review sheet committed for Claude's review.

## Changed

Added a 4 by 4 stranded-ship-deck outpost to `outposts.glb`: shallow deck plate, rails, hatch plates, bollards, four varied copies of one tin-home construction, plank walkways, ladders, washing, and `deck-town:bell`. Added per-piece bounds output and a footprint check. The model is code-built rather than photo-carved because the requested source photographs were not retained; the round-11 sheet makes that limitation explicit. The family file is 4,818,712 bytes. Its triangle allowance rose from 30,000 to 44,000, with 14,000 allocated to deck-town.

Added the texture fault to `docs/ART_LINE.md`: the shared `corrugated-tin.jpg` contains diner imagery, so it should not be tiled across broad tin walls. The new home panels use the standalone corrugated-tin texture. Dot's Diner and the plane school were not changed.

## Checks and review

- Blender export and model renders passed; bounds were printed for every deck-town piece and the complete town stayed in the 4 by 4 footprint.
- `node tools/test-blender-output.mjs`: 335 checks passed.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8 passed; 1 failed because its fixture could not start `ffmpeg` (`EPERM`).
- No lane tier or build was run, as directed. Browser and game look checks are for Claude.
- Claude should inspect deck side/front/rear/above, road/far/mayor renders, bounds and connections, and the sheet. Photo-to-model comparisons still need the requested generated reference photos.
- Race fingerprints: not applicable. Assertions were only extended with deck-town presence and its named bell, direct-child and budget checks.

## Removed

Nothing removed. `round-4.jpg`, `round-9.jpg` and `round-10.jpg` remain.

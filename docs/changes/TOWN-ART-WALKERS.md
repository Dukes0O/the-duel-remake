# TOWN-ART-WALKERS round 5

## Changed

- Replaced all four source views for `walker-h` with a green work outfit, natural skin and brown boots; replaced all four for `walker-e` with a blue apron, natural skin and brown boots.
- Replaced the trader's four views with a consistent loaded pack visible above the shoulders from front, side, back and overhead. The original pack accessory remains in the GLB because the output contract checks for its named node; Claude should check whether the photo-carved pack and accessory overlap.
- Spread the 40-person mayor view to 4 m row and column spacing and set its camera to 60 m. The source family remains visible in the center of the crowd render, so that view shows the source lineup in addition to the 40 placed copies.
- Rebuilt the family GLB: 765,924 bytes, 13 figures. The Blender recipe enforces the 450-triangle cap per figure; the output check reads the exported UV and material data.
- Added `round-5.jpg` (121,960 bytes), showing the mayor view, each new person's source and export, and flood masks for the trader's four source views.

Generated-image prompt set: four-view orthographic studio turnaround, same person in front/profile/back/overhead views, full body with separated feet on even pale grey, flat neutral lighting. Walker H: woman in deep green workwear, natural face and hands, brown boots. Walker E: man in a deep blue work apron, natural face and hands, brown boots. Trader: man in a worn rust-brown coat, large loaded canvas pack projecting above the shoulders, same four views. Built-in image generation; panel crops are the committed JPEG source photos.

## Checks

- `tools/test-blender-output.mjs`: passed, 308 checks, 0 failed.
- `tools/test-repo-hygiene.mjs`: passed. Existing advisory size reports are unchanged.
- Blender recipe: exited successfully; exported GLB 765,924 bytes.
- No browser, lane tier, build, frame check, or race fingerprint was run. The models are not wired into gameplay in this lane. Claude should inspect the 60 m crowd spacing, the two replacement figures, trader pack visibility and overlap, all four trader masks, pale patches between legs/under hems, and head shards on both children and trader.
- No test assertions changed.

## Removed

- Replaced the old `walker-e` and `walker-h` front, side, back and top source photos, and the old trader's four source photos. No game code or prior review sheet was removed.
- Temporary render images and check logs in `.qa-dist` are removed before handoff.

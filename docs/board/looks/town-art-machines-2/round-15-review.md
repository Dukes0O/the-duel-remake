# TOWN-ART-MACHINES-2 — round 15: crane truck

## Result

Does not pass yet. This is the crane truck's fourth round on the photo-carved method. The cab back wall now marks the split between front and rear end views, the separate rear counterweight block is gone, and the outrigger boxes carry worn photo paint. The mixer truck was left unchanged.

The rear view still has severe projection streaks across the cab and hoist area, and the side view shows a broad grey deck surface and a tall boom-pivot silhouette. The outriggers now read as painted steel, though the small crop looks soft when stretched across the beams. Claude should judge whether the deck and pivot read as intended and how much more rear cleanup is needed.

## Scores

- Resemblance: 2/5
- Readability: 3/5
- Grounding: 4/5
- Scene consistency: 3/5
- Frame cost: 4/5 by asset budget only; no frame check is allowed for an art round.

## Review

- `ends_split` is set at z=-1.208 m, measured at side-photo x=320, the cab's back wall. The rear mask removes pixels above y=210 so its end view shapes the deck behind the cab. The recipe prints the split and photo assignment.
- The rear counterweight box and its flat-photo face were removed. The rear photo now contributes to the carved body behind the cab.
- Outrigger boxes sample worn paint crops from the front photo on every face; silver jacks and feet remain.
- The sheet compares side, front, rear, overhead and both articulated poses from the imported GLB.

## Checks

- Blender 5.2.1 exported and rendered the imported family GLB.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run). Every machine remains under 15,000 triangles.
- Family GLB: 5,363,768 bytes. `round-15.jpg`: 260,720 bytes (500 KB limit).
- `node tools/test-repo-hygiene.mjs`: passed.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed; its one rerun failed the same way because Windows blocked the audio-analysis `ffmpeg` subprocess (`spawnSync ffmpeg EPERM`). The review JPG publication check passed both times.
- No browser check, lane tier or build was run. Claude should inspect all six panels, with focus on rear cab/deck projection, the side-view pivot, outrigger paint and both work poses.
- No assertions changed. No gameplay changes; race fingerprints do not apply.

## Removed

- Removed the standalone rear-counterweight block and its separate rear-face mapping. No other machine's model or recipe changed.

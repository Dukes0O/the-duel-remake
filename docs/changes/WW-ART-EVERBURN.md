# WW-ART-EVERBURN

Round 2 updates the gas well and publishes `docs/board/looks/ww-art-everburn/round-2.jpg` (26,081 bytes), a single comparison sheet under 500 KB. The recipe adds the taller guyed stack, ladder, weld and rust detail, clamp-held cap, layered flame, ragged ground scar and uneven salvage. The scale worker appears only in renders. The GLB is 954,064 bytes and 13,044 triangles.

## Checks

- `node tools/test-blender-output.mjs`: passed, 193 checks; the final GLB has the required named parts and meets both budgets.
- Lane tier: 72 passed, 2 failed. `tools/test-circuit-eifel.mjs` failed its FFmpeg loudness measurement. `tools/test-review-evidence.mjs` failed to spawn FFmpeg (`EPERM`). Each suite failed again on its one rerun; both failures are in audio tooling and outside this art change. No test assertions changed.
- Replay guard: passed, 297 checks across 33 cases, 31 events, 9 categories and three frame rates. No race code or fingerprints were changed.
- `npm.cmd run build`: passed. `npm` itself is blocked by this shell's PowerShell execution policy, so the Windows command shim ran the same build script.
- `tools/test-repo-hygiene.mjs`: passed in the lane tier.
- Blender round-2 views rendered: 40 m car-height, three-quarter, close detail and capped three-quarter. No frame checks were run.
- Browser and in-game look checks: Claude runs. The asset is not wired into a reachable scene here.

## Removed

Removed the square slab, evenly spaced slag ring and single flame plume. Replaced the round-1 sheet and note with the round-1/round-2 comparison sheet and this score note. No donor files or credits were needed.

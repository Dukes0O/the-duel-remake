# TOWN-ART-FUN drive-in - round 11

**Candidate for Claude's verdict; not a self-pass.** The billboard keeps the traced frame, legs and braces. Its front-only screen shows an original faded desert film still with emissive strength 0.24. Its back uses the complete rear photograph, including the patched panels. Ten traced side-photo cars form two shallow arcs facing the screen: five scrapyard cars in red, brown and blue, and five uncrushed rusty sedans. A small projector hut stands behind the second row on short legs.

The round-11 sheet pairs the four billboard references with imported-GLB renders, shows three-quarter and mayor views, and includes all four car side-photo sources. It is 397,709 bytes. Blender printed bounds for all 24 drive-in mesh pieces. Every piece keeps at least 0.5 m of clearance inside the 4x3 plot (x +/-15.5 m, z +/-11.5 m); all ten cars rest at y=0. The projector-hut roof ends at z=10.9 m. The drive-in has 4,758 triangles. The full family GLB is 3,510,540 bytes.

## Review and checks

- `node tools/test-blender-output.mjs`: **377 checks, 0 failures**.
- `node tools/test-repo-hygiene.mjs`: **passed**. Size targets are advisory.
- `node tools/test-review-evidence.mjs`: **7 passed, 2 failed**. One existing outposts sheet has no matching round-15 note. The audio-analysis case could not spawn `ffmpeg` (`EPERM`). The 449 evidence checks completed; the failures are outside this card's files.
- Browser and look checks: not run by Codex. Claude should judge the film still's brightness at dusk, confirm it is absent from the rear view, and review the rear patchwork, the mix of crushed and roofed cars, both curved rows, grounding, and the hut's position behind the cars.
- Changed assertions: none. Race fingerprints: not applicable to this art change.

## Removed

Removed the flat orange screen material and the repeated blue-wreck placement. Removed the round-10 sheet and note as requested; rounds 6 and 9 remain. No other building or source was removed.

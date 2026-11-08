# TOWN-ART-MACHINES-2 — stopped at round limit

## Changed

- The lane contains an in-progress mixer-truck photo-model attempt and a rebuilt family GLB. The round-7 renders are diagnostic evidence only; they are not a submitted look sheet or an accepted result.
- The current GLB is 3,883,496 bytes. The card caps the family at 3 MB. Restored the test entry to that 3 MB limit.
- Round 6 is the last submitted sheet. Its review records that the family still uses procedural machine geometry instead of the required photo modeling. The card allows six rounds per vehicle, so this lane cannot submit another round without a new decision.
- The shared texture `CREDITS.md` still names the removed combined mixer image. Updating that shared file is outside this card's owned files; the Director must assign that edit before any merge.

## Checks

- Inspected the round-7 imported-GLB views. They show obvious seams and detached-looking pieces, so the candidate is not ready for a look verdict.
- `node tools/test-review-evidence.mjs`: 8 passed, 1 failed. The audio-analysis check could not start `ffmpeg` (`spawnSync ffmpeg EPERM`).
- `node tools/test-blender-output.mjs`, `node tools/test-repo-hygiene.mjs`, lane tier and build were not run. The work is stopped at the card's round limit and the current candidate exceeds its stated file budget.
- No browser, game, or frame check applies to this art-only card.

## Claude review / decision needed

Round 6 does not pass. Please decide whether to close this card as not accepted or issue a revised card with a new round budget and explicit asset budget. Do not merge or use the current candidate as finished art.

## Changed assertions

- Restored the GLB size assertion from 8 MB to the card's 3 MB limit. No assertion was loosened.

## Race fingerprints

Unchanged; no race or simulation files were edited.

## Removed

- Removed the combined `machines2-mixer-truck-views.jpg` source from the working tree and replaced the mixer truck's top reference image with a standalone top view. The standalone references and their credit note remain in the texture folder.
- The prior family GLB is replaced in the working tree by the current diagnostic candidate; it has not been approved for integration.

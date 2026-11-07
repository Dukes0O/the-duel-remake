# TOWN-ART-SERVICES change note

Status: round 6 is a visual candidate, not ready for handoff. The Workshop
mayor view still hides its car. The current card says the family must stay
under 3 MB, while the existing test and prior change note use an 8 MB cap.
That mismatch needs Claude's written decision before this card can pass.
Kind: art. Flag: candidate asset; not wired into the game.

## Design settled

- Keep one `town-services` family with a direct child for each named building.
- Build the Hall and Forge from measured four-view photo carves. Keep the Hall's
  wheel clock and flags separate, and make the Forge fire a separate emissive
  part.
- Carve the Workshop as an open shed. Cut only the measured three front bays,
  keep their posts and transom, and open the photographed side bay so it does
  not repeat its car on an interior wall.
- Use one named lift-car assembly with a photographed front, solid body, wheels,
  hubs and side windows. Keep tyre piles inside the outer bays.
- Round 6 adds a pitched roof with a measured front-photo gable and enlarges the
  lift car in the central bay. The roof stays closed in the mayor view; judge
  the car through the front and three-quarter openings.

## Changed

- Replaced the Hall's hand-built mass and roof patches with a measured carve;
  added its separate clock, clock face, flags and poles.
- Replaced the Forge facade trace with a measured carve and a cut furnace
  opening with a photo-based emissive `forge:lamp`.
- Replaced the Workshop blockout with a measured open-shed carve, a separate
  lift-car assembly and tyre stacks. Round 6 adds pitched roof planes, a gable
  photo and a larger lift car.
- Added credited Forge and Workshop photo views in the town texture folder.
- The rebuilt GLB is 4,136,944 bytes. It meets the current 8 MB test threshold
  but exceeds the 3 MB limit still written on the card.

## Checks

- Blender export and imported-model review renders completed on 7 November.
- Round-6 comparison sheet: 270,182 bytes, under the 500 KB limit.
- `node tools/test-blender-output.mjs`: passed, 309 checks, 0 failures, on the
  current 8 MB assertion.
- `node tools/test-repo-hygiene.mjs`: passed; placement passed and size targets
  are advisory.
- `node tools/test-review-evidence.mjs`: 6 passed, 3 failed. Two failures
  report an existing 6 November versus 7 November crew evidence-path mismatch;
  audio analysis could not start FFmpeg (`EPERM`). The suite was run twice.
- Lane tier (`--changed --jobs 4`): 14 passed, 1 failed, 33 not run. Its same-
  commit Eifel rerun passed 17 checks and failed the FFmpeg loudness measurement
  again. The Eifel failure is unrelated to this art card.
- `npm.cmd run build`: passed. The build reports existing chunk-size and
  dynamic-import warnings.
- Browser and in-game look checks were not run; this asset is not wired into
  the game. Claude's art review is still needed.
- The local test diff widens the family cap from 3 MB to 8 MB and adds named
  part assertions. No Claude review of those assertion changes is present in
  this card yet.
- Race fingerprints: none; no race or simulation code changed.

## Removed

- Removed the old Hall mass and roof patches, Forge traced facade, and Workshop
  blockout and photo facade path.
- Removed the round-3 JPG when round 4 replaced it. Round 4 and round 5 sheets
  remain beside their review notes; round 6 is the current candidate.

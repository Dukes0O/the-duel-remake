---
task: CLEAN-09
status: merged
kind: tooling
flag: none
player_facing: no
---

# Shrink unpushed development history

## What changed

Kyle approved rewriting the unpushed `integration/wasteland` history on
24 September 2026 so the GitHub backup (5 GB) never holds Blender files or
review evidence. `master` was not changed. See `docs/board/run-log.md` and
`docs/history/history-rewrite-2026-09-24-map.txt`.

## Removed

- Every committed `.blend` file in `master..integration/wasteland` history
  (about 502 MB across all versions), except `course-landmarks.blend`, which
  predates this work, already exists on GitHub in `master`, and was restored.
- Every non-`.md`/`.json` file under `docs/board/looks/` (about 417 MB):
  screenshots, contact sheets, videos and audio analysis images.
- Copies of the latest versions and a full `git bundle --all` backup are in
  `C:\Users\kyleb\dev\duel-backups\2026-09-24-before-history-rewrite\`.

## Evidence

- The rewritten tip differs from the old tip only by the 827 removed files.
- All 351 old and new commits pair up by message in the commit map.
- Production build succeeds, contains no `.blend`, and is 303 MB (was 487 MB).
- Full tier: see the run-log entry for this change.

## Behavior and test changes

No game code, asset loaded by the game, or replay fingerprint changed. Four
tests asserted the old rule that Blender files and raw evidence stay in Git:

- `test-crew-fighters`, `test-first-person-gear`, `test-rustwall-assets`,
  `test-rigged-fighter`: each check that required a `.blend` file under
  `public/` now requires that no `.blend` file is there (SPEC 0.7). Every
  check that the `tools/blender/` script exists and is not empty is kept.
- `test-rigged-fighter`: the contact-sheet check keeps the provenance file,
  asset hash and commit checks, and validates the PNG only when a local copy
  exists. The relocation check keeps every path rule for every recorded path
  and copies and validates only images that exist locally.
- CLEAN-02 must change the Blender scripts to write `.blend` output to
  `art-build/` or `.evidence/`; the updated tests fail if a rebuild writes
  one under `public/` again.

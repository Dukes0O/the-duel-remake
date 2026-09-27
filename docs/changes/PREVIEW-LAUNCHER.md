# PREVIEW-LAUNCHER

## Decision

The desktop preview builds the QA entry from the integration checkout and
serves it on `127.0.0.1:5195` with a strict port check. It uses the established
tab-scoped storage facade before production startup. A fresh tab receives one
temporary player with the gate found, Sal's hold at 100 percent and the Titan
unlocked. Reloading keeps temporary progress; closing the tab discards it.

The launcher uses only the locked local dependencies. It needs no account,
paid tool, network request, administrator access or change to port 5174.

## Changed

- Added the preview launcher and the current-user desktop shortcut installer.
- Added the QA preview page, visible PREVIEW badge and temporary player recipe.
- Added the preview page to the QA build and documented its use.
- Allowed the two card-owned root scripts in the repository placement check.

## Tests

- `node tools/test-preview-launcher.mjs`: 20 checks; the 19 lane-owned checks
  pass. The one remaining failure is the Director-owned `waiting_on: kyle`
  board update required after merge.
- `npm run qa:build`: passed; `.qa-dist/tools/preview.html` was produced.
- Private browser smoke check on `127.0.0.1:5195`: the production menu loaded
  with the PREVIEW badge, WASTELAND entry and unlocked Titan; opening WASTELAND
  reached the seeded gate sequence. The tab and server were then closed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: stopped after the
  existing `tools/test-audio.mjs` assertion `all eleven runtime recordings
  loaded` failed. Eight suites passed and 279 did not run. The Director is
  merging the audio work separately before the integration gate.
- `npm run build`: passed with the existing large-chunk warnings.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `git diff --check`: passed.

Browser launch is waiting for Kyle after the lane merges and the shortcut is
installed from the durable integration checkout.

## Changed assertions

None. The acceptance test was committed red before implementation.

## Race fingerprints

Not changed. This card adds a separate QA entry and does not change simulation.

## Removed

Nothing. This adds the first dedicated playtest preview launcher.

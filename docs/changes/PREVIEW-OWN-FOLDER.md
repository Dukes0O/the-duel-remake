---
task: PREVIEW-OWN-FOLDER
status: ready-to-merge
kind: fix
flag: none
player_facing: no
---

# One Preview, always current, never in the way of tests (27 September 2026)

Kyle clicked the Preview icon after CRASH-04 and CRASH-05 merged and saw no
change: the Preview started at 7:52 that morning was still running, and a
click only reopened it. Separately, the Preview served `.qa-dist`, which every
browser check and full tier rebuilds. Kyle's rule: exactly two places to play,
the live game and one Preview, with a clean-up routine after acceptance.

## Changes

- `start-preview.bat`: builds into `.preview-dist` with `--emptyOutDir` and
  serves that folder; records the integration commit; a click reopens a
  current Preview, and replaces one built from older work (closes the window
  titled "The Duel Preview - close...", waits for the port, rebuilds).
- `tools/launcher-port.mjs`: `--expect-commit`; a Preview whose
  `preview-build.json` does not match is `stale` (exit 11).
- `tools/preview-stamp.mjs` (new): writes `preview-build.json`.
- `tools/preview.js`: the PREVIEW badge shows when the build was made.
- `.gitignore` and `tools/test-repo-hygiene.mjs`: `.preview-dist`.
- `docs/OPERATIONS.md`: "Two places to play" and the acceptance, release and
  clean-up routine; the release now purges older builds from the live `dist`
  and deletes `dist-next`.

## Tests

- `tools/test-preview-launcher.mjs`: own folder, emptied on build, never
  `.qa-dist`; rebuild on newer work; closes only the Preview window; stamp and
  badge (22 checks pass).
- `tools/test-launcher-port.mjs`: a Preview without a matching stamp is
  `stale`.

## Changed assertions

- `tools/test-preview-launcher.mjs`: "launcher builds the QA bundle" required
  `.qa-dist`; it now requires `.preview-dist` and forbids `.qa-dist`.

## Removed

- The Preview's use of `.qa-dist`. Kyle's stale 7:52 Preview was stopped by
  Claude before this change.

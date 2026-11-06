# TOWN-PEOPLE-SUPPORT

## Status

Implementation and card checks are complete. The lane tier stopped on an
unrelated missing-tool error. Claude's pacing-number review and browser check
are still pending.

## Changed

- Tuned `arrivalMoodBase` to 3 and `arrivalYearScale` to 4. The numbers keep
  first-winter and Year 2 growth within the milestones in
  `docs/WASTELAND_TOWN.md`, section 2, while preserving later generations.
- Updated the 30-year soak player to deliver food, paint home plots, dig test
  pits, and build wells through town commands. It no longer writes support
  conditions directly.
- The soak now checks continued population growth and confirms that completed
  player-built homes and working wells keep water available. It does not set a
  population floor that the card does not require.

## Checks

- `node tools/test-town-pace.mjs`: 364 checks passed across 10 seeds. First
  winter: 36 to 40 people; Year 1: 42 to 48; Year 2: 101 to 131.
- `node tools/test-town-people-support.mjs`: 30 checks passed. The warmed
  10,000-person/5,000-plot home-ground day took 9.36 ms.
- `node tools/test-town-people.mjs`: 36 checks passed. The 30-year run ended
  with 3,757 residents and 3,724 Old Ground entries; a 10,000-person day took
  20.10 ms, within the 30 ms target.
- `node tools/soak-town.mjs`: 72 checks passed across 10 seeds and 30 years.
  Year 30 population ranged from 3,936 to 5,069. Every seed built 1,500 plots,
  kept water above 15 L per person per day, and passed the save-size and
  per-person timing trend checks. The 10,000-person day took 29.78 ms, within
  the 30 ms target.
- `npm.cmd run build`: passed. Vite reported the existing `src/game.js`
  static/dynamic import warning and large-chunk warnings.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: stopped after 24
  passes at `tools/test-review-evidence.mjs`; its audio-analysis test could
  not start `ffmpeg` (`EPERM`). The one same-commit rerun failed the same way.
  `ffmpeg` is not installed in this environment (`where.exe ffmpeg` found no
  executable), so 22 later lane suites did not run. No game code changed to
  address this unrelated tool dependency.
- Browser check: Claude to run. Please check that NEXT remains useful when
  ignored and that real home and well work changes population support.
- Race fingerprints: not applicable; this changes only town simulation.

## Changed assertions

- No existing assertions changed. The soak's new population check requires
  growth from Year 1 and verifies completed homes, wells, and measured water.
  An earlier draft used a 6,000-person minimum; the first seed reached 3,936
  with 6,012 places, so that unsupported floor was replaced with the checks
  above. The card asks for a 30-year soak and support evidence, not that
  population minimum.
- The first pace candidate (`arrivalMoodBase: 2`, `arrivalYearScale: 6`)
  missed the 30-year generation assertion. The final values pass both the
  pace targets and the population suite.

## Removed

- Removed the soak's direct fixture well and hand-tiered plots. The soak now
  uses player commands to create its support.
- No files removed.

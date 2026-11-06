# MULE-RAILS

## Changed

- Added shared, smoothed Iron Line sampling, including the main line, both Deck
  Town loop arcs and the rail gate spur.
- Added `board` and `drivetrain` job steps, train movement data, roof plates,
  loaned crew handling, step captions, and the corrected `stepReach` marker.
- W and S now control the train only during a `drivetrain` step. The player
  follows the cab position; other modes keep their existing input path.
- The gate setback keeps 16 m/s of rolling speed. From rest, 150 m is too
  short for the empty train to rebuild 20 m/s. This decision is also on the
  card for Claude to review.

## Checks

- `node tools/test-iron-line.mjs` — passed. Covers a standing-start gate break,
  a low-speed bounce and retry, roof fall recovery, guard behavior, buffer stop,
  full-train stopping distance, loan isolation, caption skips and repeatability.
- `node tools/test-everburn-easy.mjs` — passed; all six jobs finished 10/10.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going` — all
  69 selected suites ran. The only failure was
  `tools/test-warlord-tollkeeper.mjs`: its recorded-klaxon check could not
  launch `ffmpeg` (`ENOENT`). A same-code rerun of that suite produced the same
  missing-executable failure; its other 27 checks passed. The PowerShell lane
  session did not exit after printing the final suite results, so I stopped
  that wrapper after confirming `[69/69]`; all individual suite results are
  recorded. No suite assertions changed.
- `npm run build` — passed. Vite reported its existing dynamic-import and
  large-chunk warnings.
- Replay checks passed: 297 checks across 33 cases; no replay fixtures or
  fingerprints changed.
- Browser and visual checks were not run here. Claude should play the coupling
  step (board, fall, reboard, walk, plant, clear) and On Time (loop, gate retry,
  full-train braking and arrival), then check that the actor and route markers
  follow the rails. The train uses a temporary existing-car stand-in until
  WW-ART-MULE lands.

## Changed assertions

None.

## Race fingerprints

Unchanged. The replay guard passed; no replay baseline was regenerated.

## Removed

Replaced `stepReach`'s id-only marker request with the place object. No other
files or assets were removed.

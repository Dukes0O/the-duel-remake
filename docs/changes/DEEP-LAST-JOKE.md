# DEEP-LAST-JOKE

**Status:** implementation is in progress. The save-preservation hook is outside
this card's named files and needs a Director re-slice. Five test suites still
need the expectation changes recorded on the card, and browser QA did not
complete. Claude still owns the look and sound verdict and release.

## Settled design

Built the scoped Part 1 fixes and the `deep-vasca` mission: the seventh find is
separate from the six Sirena finds, Ana's lines and the squeak cue are wired,
the original Vasca model is code-built, and the car/reward paths use the
existing save fields. No new save field or dependency was added.

## Checks

- `npm.cmd run build`: passed (650 modules, 5.70 s). Existing large-chunk and
  mixed static/dynamic import warnings remain.
- `npm.cmd run build`: passed (650 modules, 5.70 s). Existing large-chunk and
  mixed static/dynamic import warnings remain; runtime code is unchanged since.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 5 passed, 1 failed,
  233 not run. `tools/test-audio.mjs` failed because only 10 of 11 runtime
  recordings loaded. `src/test.js` passed 799 checks.
- All 18 `tools/test-deep-*.mjs` suites were run by hand. Thirteen passed.
  Five remain red: audio cannot measure loudness because configured FFmpeg is
  unavailable; explorer expects 16 rather than 17 protected goal points; look
  rejects the required new test's imports; save treats the additive Vasca
  fixture as a legacy fixture; phone expects 0.4 stability while the new otter
  catalog entry records 0.45. The four expectation updates need Claude's
  written review, as the card records. No assertion or tolerance was changed.
- `test-deep-vasca` passes all seven tests, including all 30 route/seed child
  pace dives, 10 assisted Easy wins and 10 child pace finishes. Its test driver
  now steers toward the sonar bearing and releases the brake before reverse can
  engage at a stop. `audit-armor-kit-fit.mjs` exited successfully.
- `test-sirena-car.mjs`: 8 passed, 1 failed. The helicopter placement assertion
  expects only the Sirena; the Vasca is also correctly assigned to Pacific
  Canyon. `test-progression.mjs` passed in the lane tier.
- Board check passed (641); repository placement passed. `build-status.mjs`
  refreshed STATUS and reports that the full-tier record is stale for this
  lane commit.
- Browser scenario `deep-vasca` failed twice (headless and headed) with
  `Chrome DevTools connection closed`; both runs used memory-only storage, made
  no screenshots, and did not finish the garage/race checks. No art sheet or
  art/sound verdict exists yet.
- Replay fingerprints were not run because the lane gate stopped at its first
  failure. No signatures were regenerated.

## Review notes

- The independent code review's line-order concern is covered by the new
  headless story test, which asserts each line at its event time. The cue uses
  one rising and one falling tone layer; the test checks both end frequencies.
- The save review confirmed that `raiseJoke` leaves credits unchanged and
  awards the car once. It also found that `normalizeProfile` can discard the
  owned car while `deep-vasca` is off. `src/progression.js` is outside this
  card's named files; the card asks the Director to re-slice before the save
  review can pass.
- The `deep-vasca` browser scenario previously failed twice with `Chrome
  DevTools connection closed`; both runs used memory-only storage and produced
  no screenshots. It did not verify the garage or race. No art sheet or
  Claude's art/sound verdict exists yet.

## Changed assertions

Claude approved the card-listed changes: the phone-line count is 27, Pearl
White uses the Kelp Coast's three pearls, the removed `bubbles` hint is no
longer asserted, and the Surface path checks the Norseman line. The card also
requests Claude's review for the additional expectation updates listed above.
No assertion or tolerance was weakened.

## Removed

Removed `deepHints().bubbles`, its old second garage tip and the nine-pearl
unlock rule. No other code path, art or runtime asset was removed.

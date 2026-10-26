# DRIVE-LESSON-ANY-COURSE

Driving lessons use any listed course without buying it. Both lesson 1 corners
are selectable. Lesson order, car access, player identity, engine switch,
air-only/fire guards and racing course access stay unchanged. The existing
lesson reward can improve brakes; lessons still pay no race earnings and write
no course records. `driving-lessons` stays dev.

## Checks

- New unowned-corner regression: failed before the fix, then passed for both
  corners, including selection callbacks. Four other changed pure checks pass.
- Private memory-only browser `drive-lesson-run`: passed, port 14872,
  headless, zero warnings/errors. Both unowned corner clicks respond.
- Pictures: new-player board, original-player board, running lesson panel and
  native failed-attempt result captured. Reviewed: both corners enabled with
  no purchase wording; later rows dimmed, no pointer and explicit reasons.
  Panel and result remain readable. Raw evidence recycled after review.
- Independent code review found no runtime fault. It caught the companion
  helipad notes expectation below; corrected as recommended.
- Required lane command: `node tools/run-tests.mjs --tier lane --changed
  --jobs 4` selected 34 suites. First run: 14 passed, one failed (obsolete
  helipad ownership assertion), 19 not run, 647.63 s. After the test-only
  correction, the same lane command with `--keep-going` and path filters for
  that failed suite plus the 19 unrun suites passed 20/20, zero not run,
  356.27 s. Passing suites were not repeated. Combined coverage: 34/34 green.
- Native lesson suite: 24 tests passed, including full completion on both
  unowned courses. Helipad: 108 checks. Later lesson view: 14 tests.
- Race fingerprints: 225 replay checks across 25 cases, 23 events, nine
  categories, three frame rates and three runs; 12 combat replay checks;
  47 exact scene checks across 20 events. No pins or signatures changed.
- `npm run build`: passed (558 modules, 1.76 s). Existing large-chunk and
  mixed static/dynamic import warnings remain. PowerShell gates had System32
  first on PATH. Browser/build needed sandbox access to Vite's temporary
  config through integration's shared dependency link; no live folder used.
- Heavy-job admission: integration inbox read before each run, no active
  hold; starts admitted below three roots, one-minute counts stayed at or
  below three. No frame measurement. Independent review clear after its
  helipad-note fix; no findings remain.
- End-of-session status regenerated. Cockpit task T-058 created with this
  card in its notes; board sync sets its status (no missing card link).

## Changed assertions

Every existing changed expectation follows Claude's ownership decision:

- `test-drive-lesson-run`: native acceptance runs the full existing attempt,
  three-win, once-only brakes, player isolation and no-pay/record checks for
  each of Panorama and Woods, without funding or purchasing a course. The
  purchase-success check becomes an explicit unowned-course check. The second
  player's ownership refusal becomes rejection of Pacific Canyon, which has
  no lesson. The unopened-board refusal is retained.
- Its board course-list check now checks IDs, removing obsolete ownership
  metadata. The Woods choice is explicit with no owned courses. The unavailable
  course case uses an empty lesson table instead of no ownership, and expects
  the no-course reason instead of purchase wording. Car, player, difficulty
  and save-version refusals remain.
- Its binding test replaces missing ownership with missing player as the stale
  start refusal, and uses an unknown course as the forged selection refusal.
  Successful start/selection counts and detach checks remain.
- `test-drive-lessons-view-2`: the two purchase reasons become successful
  unowned line/snow course requests. The default gearbox course becomes the
  first catalog row (Panorama) rather than the first owned row (Woods).
  Explicit choices, lesson order, car/settings/version and engine checks remain.
- `test-drive-lesson-helipad`: a fresh player's home-course lesson row is open
  instead of closed. Notes match the menu reason as `[reason]` only when there
  is a reason, otherwise `[]`; availability no longer invents an empty note.
- Browser scenario: the new player's Start is present instead of absent; it
  now checks both enabled choices, no ownership/purchase wording, three locked
  later rows with reasons and no pointing cursor, then clicks both corners.
  Existing native launch, result and profile-isolation checks remain.

New assertions also check both unowned corner models, markup and selection
callbacks. No driving success condition, tolerance, reward, record or replay
pin is loosened. Claude's written assertion review is still needed before merge.

## Removed

Lesson-only ownership predicates, ownership metadata and purchase wording.
No old asset or alternative code path retained. QA bundle and raw captures
are recycled once their verdict is recorded.

## Claude review (26 October 2026)

Approved and merged: each changed expectation follows the ownership decision on the card; no-pay, no-record, once-only brakes and the other refusals are kept.

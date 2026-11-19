# QA-EVIDENCE-DATE-BOUNDARY (closes QA-EVIDENCE-MIDNIGHT and QA-REVIEW-EVIDENCE-MIDNIGHT)

One function, `evidenceDate` in `tools/evidence-date.mjs`, names the day of every `.evidence/<date>/` folder by the laptop's
local calendar date (comment beside it says so). Only the browser runner's per-run folder (`evidenceOutputDir`) still took
the UTC date, which runs ahead of local time from 17:00; that was the 23:56 against 00:11 fault in all three cards. The
other tools already read the local date, each with its own copy of the code, so they now call the shared function.

**Now using it:** `browser-harness.mjs` (both folder plans), `fidelity-sheet.mjs`, `full-check.mjs`, `track-review.mjs`
(`localDay`), `build-status.mjs` (age of the last night check, compared with its local date),
`test-audio-crash-peak.mjs` (was UTC). `DUEL_EVIDENCE_NOW` (a local time) fixes the clock for a child process in tests.

**Searched `tools/` for `toISOString().slice(0, 10)` and date-naming code, left as is:** `hand-drive.mjs` (one fixed
`.evidence/hand-drive` folder, no date); `integrate-lane.mjs` (the date on a run-log line, not a folder);
`audio/freesound.mjs`, `audio/elevenlabs.mjs` (UTC `fetched`/`generated` fields in catalog data); `ski-finish.mjs` and four
heli scenarios (a save-file play day inside the game); `full-check.mjs:65` (checks that a `--date` argument is a real day);
Blender recipes (`crew-fighters.py` and six others: Python `date.today()` is already the local date, and
`tools/test-vesper-art.mjs` pins `crew-fighters.py` by hash, so none was edited).

**Checks** (branch commit `4858fc5e6`): `node tools/test-review-evidence.mjs` passes with the new case (23:56 and 23:59 on
the 18th, 00:01 on the 19th, local; browser run and round folders, and the round planner started as a child process, all name
the same day, and 00:01 moves to the next). Lane tier
(`--tier lane --changed --jobs 4`, run on `4858fc5e6`): 21 passed, 1 failed, 6 not run (long suites left to the night:
arena-shove, audio-crash-peak, first-person-cloth, first-person-polish and two more). The one failure, `test-full-check`
"real temporary Git copy ... unlinks its Junction", ran while I ran the same suite at the same time in other time zones; its
rerun alone passed (rule 3). Later edits (reviewer's fixes, below) ran only the suites for those files:
`test-review-evidence`, `test-browser-harness`, `test-full-check` (also in UTC, Los Angeles and Tokyo time) all pass.
`npm run build`: passed. One independent review (a subagent that had not seen my reasoning) found no fault in the date logic;
it found a vacuous assertion in my profile test (fixed) and no test of `nights` in `build-status.mjs` (added two assertions
to `test-full-check.mjs`, new lines only).

**Changed assertions:** none. **Removed:** the five copies of local-date code in the tools above, the UTC date in the
browser runner and in `test-audio-crash-peak.mjs`.

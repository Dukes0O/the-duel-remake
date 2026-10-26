# SAVE-RECORDS-IDB

## Design
Keep the primary snapshot and version-1 journal format. Commit ghost and lap
telemetry replacements directly to the primary IndexedDB snapshot, serially
with journal flushes. Record callers await verification before reporting saved.
Ordinary writes during a record commit remain recoverable in the journal.
Legacy physical keys and old journals replay through the existing verified
migration; no backup key is deleted or reclassified. Remove the 3.6 MB reserve.
Space refusals list the largest physical keys and their UTF-16 byte counts.
Item 2 is unnecessary once the reserve is gone; foreign backups retain the
same full origin allowance as other foreign keys.

Checks: career-budget, save-fixtures, lane tier (jobs 4), production build.
No visual or frame change. QA uses synthetic storage only.

## Removed
The record reserve and its ordinary-data accounting.

## Changed assertions
- `test-career-budget`: maximum ghost footprint is now under 2 KB instead of
  merely under 4 MB, and its full payload must already be in IndexedDB.
  The former 800,000-character foreign and ordinary rejection cases now prove
  success because the reserve is removed. Actual-cap rejection uses a full
  4 MB foreign key and requires that key's name in the error.
- `test-career-budget-recovery`: explicit pre-change journal fixtures keep
  every legacy replay, escaping, interrupted flush and consumed-journal
  invariant. New record writes are awaited. The reserve boundary is replaced
  by successful record/ordinary writes and unchanged-data refusal at the full
  physical cap. Valid, malformed and future telemetry must be byte-exact in
  IndexedDB, absent from the physical journal, and survive export/import/reload.
- Added synthetic pre-change and 12-ghost/1,800-sample fixtures, failed first
  migration, foreign backup preservation, legacy record journal replay,
  rejected record commit, record/ordinary overlap and queued telemetry checks.
  A held import backup proves that both late ordinary and record writes are
  refused and that writes resume afterward.

## Independent save review
Separate save guardian reviewed migration, recovery, callers and assertions.
It found an import/record overlap that could overwrite an import. Fixed by
holding the facade exclusively from import flush through commit or rollback;
new writes fail visibly during that interval. Reviewer confirmed the fix.
It also requested explicit legacy fixtures to preserve pending-record and
Unicode journal coverage; retained those cases. Final verdict: approved, no
remaining required findings. The reviewer independently
migrated and reloaded all 23 historical fixtures byte-for-byte, with verified
backup before the primary snapshot. No real player save was accessed.

## Checks
- Save fixtures: 23 historical shapes, one forged shape, 1,029 checks passed.
- Career budget: passed, including both new migration fixtures and import race.
- Career recovery/writer: 19 passed after updating direct-write expectations;
  legacy crash recovery checks remain intact.
- Production build: passed (`npm.cmd run build`; sandbox retry needed for
  Vite's shared dependency temp folder). Existing chunk-size warnings remain.
- Initial lane attempt stopped on the recovery suite's obsolete synchronous
  journal expectations: 13 passed, one failed, 51 not run. Corrected the suite
  as listed above; resumed only unrun suites, retaining passing checks.
  Drive-through initially hit Git tar treating the Windows drive as a remote
  host; its unchanged seven cases passed with System32 tar first on PATH.
  Full-check tool tests passed all 46 cases with Windows permissions enabled.

## Limits
No live install, merge or push. Storage fix uses the existing career path;
no gameplay flag, new dependency or sound cue is needed. Player backup keys
remain untouched. Pending recordings are session data until IDB verifies;
failed writes preserve prior durable recordings.

Race evidence: no simulation changes. Core: 632 passed. Heritage F42/Heritage
30/144 FPS trajectories stayed `e32c1af5773d3812`; lighting variants retained
`e580d66a4f10f2ee6d519154afd362b65192ef6486df60fac3bcdb842db3f51f`.
Combat replay fingerprints passed all 12 checks across four encounters.
End-of-session Cockpit sync ran through its protected runner; T-049 is In
Progress. Unrelated SKI-PICKUP has no mapped task and was left for its owner.

Final lane verdict: all 67 selected suites passed across the original run,
corrected save suites, tool retries and the 34-suite resume (34 passed,
zero failed or unrun). The final test-runner suite took 223 s. The recovery
assertion changes and import guard were checked before the final build.
Generated lane `dist` was recycled; `.qa-dist` is empty. Status refreshed.

## Claude review (26 October 2026)

Approved: cases that used to be refused by the 3.6 MB reserve now succeed by design; the ghost footprint check is far stricter (under 2 KB); legacy journals, backups and telemetry are proven to survive. Independent save review clear.

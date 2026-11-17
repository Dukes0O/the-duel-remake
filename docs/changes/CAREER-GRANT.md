# CAREER-GRANT: Spikey Ferns to notoriety rank 9 and 20,000 more scrap

Kyle, 16 November 2026, for Gratian. Design on the card.

**Changed.** New `src/career-grant-2026-11-16.js` and a start-up block in
`src/main.js` (after the 28 October restore, same guard: release builds run
it, test builds only with `?grant-career`). It backs up the career, raises
Spikey Ferns' notoriety to 7,400 (rank 9) if lower, adds 20,000 scrap, marks
itself done and shows a notice. No save shape change.

**Tests.** `tools/test-career-grant.mjs`, 4 tests, memory storage.

**Removed.** Nothing yet; CAREER-GRANT-REMOVE removes the grant once it has run.

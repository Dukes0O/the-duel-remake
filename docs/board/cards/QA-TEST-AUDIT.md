# QA-TEST-AUDIT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 24 October 2026, from Kyle: too many tests run too often, and they are
not designed for the task at hand. The new gate rules are in AGENTS.md
"Gates". This card gives them the right tools and trims the suite.

1. **Measure.** From git history of `docs/changes/`, `docs/board/run-log.md`
   and the full-tier ledger (`docs/board/checks/`), list for every suite in
   `tools/test-*.mjs`: run time, how often it failed in the last 30 days, and
   whether each failure was a real fault or a pinned number moving on purpose.
   Write the table to `docs/board/checks/test-audit.md` (plain words).
2. **Lane selection.** Fix how `--tier lane --changed` picks suites so a
   change to one area does not pull in hundreds of unrelated suites (today a
   lesson-screen change ran 300). Base it on which source files each suite
   actually imports, not on broad "busy file" fan-out. Target: a typical card's
   lane run under 10 minutes on the laptop. Show before and after counts for
   the last ten merges.
3. **Nightly-only suites.** Move suites that are slow and have not caught a
   real fault in 30 days (the track-kit and opponents suites are candidates)
   to the full tier only. List each with its numbers.
4. **Fewer pins.** Where many suites pin the same race result (replays, lap
   times, car counts), keep one reference per area and turn the others into
   behaviour checks (ordering, ranges, "finishes", "no reset"). List each
   change; no check may stop testing the behaviour it exists for.
5. **Retire.** Propose suites that test removed behaviour or only test other
   test tools; remove them in this card where the evidence is clear, card the
   rest.

Acceptance: the audit table; lane selection with before/after counts; the
full tier still passes; every removed or loosened check listed with its
reason for Claude's review in the pull request. No game code changes.

## Claude answers

Claude (design lead), 24 October 2026, to the cloud session's questions:

1. Keep it: a card that touches only a shared file runs the small lane; its
   named checks and the night full tier cover the rest.
2. Done: AGENTS.md rules 11 and 12 now say "never through a hub ... never for
   importing a shared file" and match the gates.
3. Keep the test-tool suites (`test-test-runner`, `test-browser-harness`,
   `test-browser-scenarios`, `test-full-check`, `test-build-status`,
   `test-board`, `test-repo-hygiene(-rules)`).
4. Do these three in this card if each is small: the `test-heli-mode` import
   allow-list as a rule, `test-shortcut-presets` hashing only the functions
   the solver uses, and `test-circuit-layouts` derived from the manifests. If
   any grows large, list it in the pull request instead of a new card. Leave
   the Rook and Rustwall P2 suites in the full tier: their art cards are
   deferred, not dropped.

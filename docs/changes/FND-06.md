---
task: FND-06
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

- Added bounded parallel test jobs, continue-after-failure mode, lane/merge/full tiers, import-based changed-file selection, and one JSON result object.
- Moved the 85 long campaign runs into `tools/test-campaigns.mjs`. Eight shards cover 60 core runs, 24 expansion runs, and one Hard chase run.
- Added direct package scripts for each tier. The scripts do not rely on npm forwarding arguments after `--`.

## Evidence

- `npm ci --offline`: passed with the locked 16 packages.
- `node tools/test-test-runner.mjs`: 124 runner checks passed, including fake failing children, bounded jobs, Git changes, import mapping, shard plans, and parseable JSON output. Review regressions confirm that a computed-path source still selects its QA suite when another source maps normally, and that a missing integration merge base fails clearly.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going`: 146 jobs passed, none failed or skipped, in 271.62 seconds. This lane changed `package.json`, so changed-file selection conservatively chose every suite.
- `node tools/run-tests.mjs --tier full --jobs 10 --keep-going`: 146 jobs passed, none failed or skipped, in 241.64 seconds. This is below the 15-minute target.
- `npm run build`: passed. Vite reported the existing large rendering chunk warning.
- `git diff --check`: passed. Edited text files use LF.
- On integration commit `c434200`, `npm run test:merge` passed 141 suites
  in 174.19 seconds; `npm run build` passed; private High/Performance browser
  smoke reached active races with four screenshots and zero warnings/errors.

## Coverage and changed assertions

The 80 pinned suites retain their exact order and hash. The other 58 earlier suite files remain discovered. The new campaign suite is discovered automatically, and the full plan runs its eight shards. The short core still reports 509 passing checks.

The campaign assertions were moved without changing their physics inputs or expected results. Each shard checks the status, finite state, and frame-rate agreement of its assigned runs. The old global 'some complete' assertion now runs on shard 1; it is stricter because one fixed subset must complete. Shard 1 passed. No failing assertion was removed to make the suite green.

## Limits

`--changed` deliberately selects every suite when package metadata, CSS, or public assets change, or when any changed code file has no resolvable test import. That can make a lane run longer. It fails if the integration merge base is unavailable rather than silently checking only HEAD. FND-07 replay fingerprints and FND-08 browser smoke are separate cards; this change note reports the Node suite and production build only.

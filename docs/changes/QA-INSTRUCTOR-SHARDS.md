# QA-INSTRUCTOR-SHARDS

## Changed

`tools/test-lesson-instructor-any-car.mjs` takes `--shard=K/N` the way `tools/test-campaigns.mjs` does:
a shard keeps the runs whose index modulo N is its own. `tools/run-tests.mjs` gives full, merge,
default and focused plans four shards (`INSTRUCTOR_SUITE`, `INSTRUCTOR_SHARDS`) that start side by side;
lane and changed-only plans keep the single `--sample` run. No game code changed.

## Checks and timing

Before: the release full tier on c31e8e5a (1 November) ran the suite alone on one core for about an
hour after every other suite had finished.

After: `node tools/run-tests.mjs --filter lesson-instructor-any-car --jobs 4` passed all four shards in
1061 s (17.7 minutes), with other sessions' heavy jobs running alongside.

Shard cover: listing each shard's run names gave 90 per shard, 360 unique, the same set as the
unsharded file; `--sample` still lists 24; `--shard=5/4` is refused.

Lane tier (`--tier lane --changed --jobs 4 --keep-going`, 531 suites since the runner is a shared
file): 530 passed; `tools/test-test-runner.mjs` failed on the merge plan count, fixed, then passed alone
(210 checks). Nothing else changed after that run. Build passed. Independent review: no findings.

## Changed assertions

Three runner-plan checks in `tools/test-test-runner.mjs` now expect the four instructor shards in place
of one task. Claude's review, on the card `docs/board/cards/QA-INSTRUCTOR-SHARDS.md`, explains why each
is at least as strict. No instructor assertion changed.

## Removed

Nothing replaced; the single unsharded full-plan task for the instructor suite is gone with this change.

# GATE-DIAGNOSTICS

## Change

Encoded native audio tracks now retain each already collected chunk frame
index. A failed temporary Git fixture command now reports metadata presence
and type for `.git`, `HEAD` and `config`, the Git version, and redirect
environment variable names only. It does not print environment values.

## Baseline

The full checkpoint at `30d3e336` passed 347 suites and failed two. The audio
report recorded a non-contiguous mix but did not retain chunk frame indexes.
The compaction fixture failed while setting `user.email`, before compaction,
without metadata or Git environment details. Those reports do not prove a
cause; the additions preserve the missing evidence for the next run.

## Verification

Source review: collection, PCM encoding, continuity assertion, fixture
commands, assertions, thresholds, cleanup and runtime code are unchanged.
Both changed scripts pass `node --check`; `git diff --check` also passes.
Native capture, lane/build and the full checkpoint remain pending with the
Director. No dependency link was needed, and no heavy checks were run.

## Removed

None. This adds failure evidence to the existing tools only.

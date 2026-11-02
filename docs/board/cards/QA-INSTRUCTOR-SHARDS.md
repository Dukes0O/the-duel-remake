# QA-INSTRUCTOR-SHARDS: the any-car instructor suite runs as four parallel shards

The release full tier on c31e8e5a (1 November 2026) finished 547 of 548 suites by 13:24, then sat for
about an hour on `tools/test-lesson-instructor-any-car.mjs` alone: 360 lesson runs (12 lesson roads,
15 cars, both difficulties), each built twice, on one core while the other three jobs stood idle.
The Kogane hairpin row added that day made it longer.

Acceptance: full, merge, default and focused plans split the suite into four shards the runner starts
side by side, together covering every run exactly once; lane and changed-only plans keep the one
`--sample` run; no instructor assertion changes.

## Claude answers

Review of the changed runner assertions (rule 18), 1 November 2026. In `tools/test-test-runner.mjs`:

- "full, merge, default and focused plans retain every instructor car" expected one task with no
  arguments; it now expects the four `--shard=K/4` tasks. The suite still runs every car in those
  plans; only the split changes. A shard runs the runs whose index modulo four is its own, so the four
  together hold all 360 with none repeated (checked by listing each shard's run names: 90 each, 360
  unique, the same set as the unsharded file).
- "full tier preserves every suite and expands only campaigns" counted `actual.length-1+CAMPAIGN_SHARDS`;
  it now counts `actual.length-2+CAMPAIGN_SHARDS+INSTRUCTOR_SHARDS` and adds a check that the full tier
  holds all four instructor shards. It is exactly as strict: one more suite expands, by its own count.
- "JSON plan lists the merge suite set" counted `actual.length-1` labels; it now counts
  `actual.length-2+INSTRUCTOR_SHARDS` and requires each of the four shard labels by name. Stricter
  than before, since it now names the expanded entries.

Nothing is loosened: the per-run assertions in the instructor suite are untouched, and the lane
sample check is unchanged.

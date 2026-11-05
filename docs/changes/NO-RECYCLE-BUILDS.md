# NO-RECYCLE-BUILDS

Claude, 5 November 2026. Kyle: "I thought we'd addressed this where things would be deleted directly and not sent to the recycling
bin." C: filled to 0 GB on 5 November, with the Recycle Bin holding about 40 GB. The 28 October rule reached only people and helpers
through their briefs. The tools kept doing it: every browser run sent its roughly 400 MB QA bundle to the bin.

## What changed

- `tools/browser-harness.mjs`: `removeQaBundle` deletes the bundle outright. It keeps the same guards: only the exact owned leaf under
  `.qa-dist`, and a redirected target is refused.
- `test-board`, `test-course-kit`, `test-drive-through`, `test-earned-cars-ui` and `test-medals` delete their own temporary fixtures
  outright, after the same check that the folder is their own.

## Left as it is

`tools/full-check.mjs` recycles one small night-draft text file. `tools/integrate-lane.mjs --recycle-owned` still recycles a merged lane's
checkout, which holds source files rather than build output, and the manual route is `git worktree remove`.

## Removed

`recycleQaBundle` and the five fixtures' PowerShell recycling.

## Changed assertions (Claude's review, rule 18)

`tools/test-browser-harness.mjs`: the check that the script says SendToRecycleBin becomes its opposite, as Kyle decided. The guards on the
owned leaf and redirected targets are unchanged. The five fixtures' Windows-only asserts go with the recycling they served.

## Checks

The suites above, and one browser scenario to confirm that a bundle leaves no folder behind and adds nothing to the bin.

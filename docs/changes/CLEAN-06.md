# CLEAN-06: Proven dead code only

Status: merged as `e5b7013`; janitor pending.

## Changed

- The audit now reads tool imports and references when checking source modules,
  exports and removed-feature tests. Its runtime-asset check still uses runtime
  references only. Two apparent unused modules were active: `phase-diagnostics`
  is imported by the performance tool, and `src/test.js` is the test runner's
  named core entry. The module candidate count fell from two to zero. Export
  candidates fell from 110 to 15 after tool references were counted and the
  three proven dead declarations below were removed. All remaining candidates
  need direct proof; the 52 asset candidates include dynamic paths and credits.
- A direct switch-removal probe changed the frozen Pacific Canyon Mad Max
  physics fingerprint at 30 FPS from `93e12639a9032c7d` to `b94764c10a8bec45`.
  The final change puts the old simulation controls in
  `tools/legacy-roadside-duel.mjs`, a test-only subclass excluded from the
  production build. It preserves all 162 historical replay hashes and focused
  pre-knock-away assertions without retaining a player-facing flag or
  production `destructiblesEnabled` override. Current Wasteland still has
  roadside destruction and knock-away in all races, whether `wasteland2` is
  on or off. Ordinary races keep their mode guard.
- The box-figure fallback still renders while a rigged GLB loads or fails,
  so it was retained.

## Removed

- Deleted `vegetationGeometry`, a 47-line retired geometry builder with no
  reference in source, tools, tests or page entries. Current vegetation uses
  the cell and procedural crown builders in the same module.
- Deleted the unused `CAR_SLOT_KEYS` constant and `awardCourseWin` alias.
  Current car loadout uses numeric slot indices; progression calls
  `settleRace` directly.
- Removed the released `roadside-destruction` switch from the catalog and
  removed the production instance override and its flag-off Wasteland path.
  Updated private QA scenarios to check current behavior without an obsolete
  URL flag. Retired-flag assertions now require the switch to be absent;
  historical off assertions run through the tools-only adapter, while current
  30/60/144 FPS knock-away assertions still run against production `Duel`.
- No test, shipped asset, save field or uncertain audit candidate was removed.

## Checks

- Focused `node tools/test-replays.mjs`: 162 checks, all original fingerprints
  unchanged after the probe was restored and the dead declarations removed.
- Focused repository hygiene passed; the revised audit reports zero module
  candidates, 15 export candidates, 52 asset candidates and zero removed-test
  candidates. `git diff --check` passed.
- Changed feature-flag assertions reflect removal of the released switch;
  older off-path assertions moved to the test-only adapter and remain intact.
  No expected replay fingerprint was changed. Lane tier passed 237/237 in
  308.12 seconds, including 162 replay checks and 48/48 expansion drives.
  Production build passed at 254,802,461 bytes, 360 bytes below CLEAN-05.
  Private memory-only browser scenarios `experimental`, `roadside-destruction`
  and `traffic-wreck-callout` passed with no console warnings or errors.
  Independent review found no actionable defects.
- Integration merge tier passed 229/229 in 205.91 seconds, including all 162
  unchanged replay fingerprints and 48/48 expansion drives. Integration build
  passed. Private memory-only smoke passed on port 53770 with four screenshots,
  zero warnings and zero errors.

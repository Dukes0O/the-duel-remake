# QA-STALE-COLLISION

## Decision before code

Kyle authorized a separate agent to continue reusable QA repairs in parallel
on 10 October 2026, provided they do not interfere with the accepted release.
The release candidate is immutable; this branch owns only the two collision
browser scenarios and this note. Formal board entry follows installation.
No tests, builds or browser jobs run while the release full tier is active.

Keep both scenarios. For traffic, derive touching swept-contact geometry from
native car dimensions and road headings, following the existing native test.
Keep the stationary 140.7-mph and separate 130/60-mph oncoming speeds. Assert
clean motion and meaningful contact geometry before the real solver. Preserve
identity, mesh reuse, physical wreck, movement, smoke, no premature blast,
exact delayed smash/obliterate sequence and zero player costs. The prior deep
overlap selected a different rigid-body contact axis; speed alone was not a
valid witness for the intended impact. Do not change solver or thresholds.

For ramming, keep the original 24-tick hit as an early airborne displacement
case: its native endpoint is still inside the widened road. Preserve positive
outward velocity, damage, identity, height and zero crash cost. Add a separate
shoulder case derived from native road width and body clearance, retaining
real impulse and strict off-road plus airborne checks. Do not teleport the
post-impact result or search parameters until green. Preserve the five-armor
actual loss, one wreck event, 60-percent recovery and spike visibility checks.
Explain and independently review each changed assertion before any merge.

## Changes and assertions

- Traffic now starts at the native bodies' touching distance. The player's
  longitudinal extent uses the two road headings and its collision box.
  A 0.05 m face overlap and 1.1 m swept approach replace the old deeply
  overlapping positions. Before contact, the native box-contact calculation
  must identify the intended face (normal alignment above 0.95), with overlap
  between -0.3 and 0.3 m. This checks fixture geometry; it does not predict or
  substitute for the real collision's outcome. The unchanged clean-motion
  checks still guard both actors. All smash, wreck, blast and cost assertions
  remain unchanged. The scenario carries the unchanged dependency-free native
  geometry module into the disposable page as a data URL because the built
  preview does not serve source-module URLs. It adds no game export or request.
- The original ram keeps its 24 steps, speeds, lateral displacement, launch,
  damage and crash checks. Its obsolete requirement to have crossed the road
  edge at that early frame is replaced by positive native outward velocity.
  Surface diagnostics remain in the report.
- A separate hit uses the third CPU and starts its whole body 0.1 m inside
  the native shoulder. The pair first separates through the native contact
  path to clear any old incident. The same 130/20 mph contact and 24 native
  steps must move it off the main road while airborne and moving outward.
  Additional checks require exactly one correctly indexed spiked hit, actual
  armor loss matching the event, stable actor identity, a presented frame,
  a racing state and no ordinary crash slots. A screenshot records this new
  case in both qualities. The existing five-armor wreck, single wreck event,
  60-percent recovery and visible-spike checks remain unchanged.
  The shoulder setup also refreshes current and previous ground height from
  its native terrain pose. The first run exposed a cached player height from
  the preceding recovery, 4.11 m below the new position; the native vertical
  contact guard correctly rejected that inconsistent fixture. Grounded setup
  now agrees with its selected position. Miss diagnostics retain those heights
  and all native contact-exclusion flags.

## Checks

Browser checks ran sequentially after the release was installed:

- `combat-knockaway`: High and Performance pass, eight screenshots, zero
  warnings/errors, private port 5708, memory-only storage confirmed. Physical
  wreck and delayed-blast screenshots were inspected. The low hit displaced
  traffic 6.8 m; the high hit retained its physical wreck; the oncoming hit
  kept the exact delayed smash/obliterate sequence and zero player costs.
- `combat-ramming`: High and Performance pass, eight screenshots, zero
  warnings/errors, private port 30649, memory-only storage confirmed. Original
  early ram: lateral 7.110145 m, road half-width 7.699509 m, height 1.84 m,
  outward speed 7.673468 m/s. New shoulder ram: lateral 11.821485 m, road
  half-width 7.697560 m, height 1.84 m, outward speed 7.685479 m/s, 80 armor
  removed from the third CPU. Both qualities match. Five-armor overkill,
  exactly one wreck and recovery to 96/160 armor all pass with zero crash
  slots. The new shoulder screenshot visibly shows the lifted car and its
  80/160 armor label. The first failed run and diagnostic rerun exposed only
  the stale fixture height described above; no acceptance was weakened.
- `git diff --check` passes. No runtime or save code changed, and no replay
  fingerprints were regenerated. The Director cleared the source proposal
  and final source at `c84d33ab`, including the native geometry import and
  demonstrated ground-height correction.
- After rebasing cleanly onto integration `409ed04e`,
  `node tools/run-tests.mjs --tier lane --changed --jobs 8` passed all 371
  selected suites: zero failures, zero not run, 1352.32 s. `npm run build`
  passed afterward: 296 modules, 1.00 s; only the existing large-chunk warning.
  Both ran on clean `c84d33ab`. Only this result note was amended afterward;
  the reviewed and tested scenario source is unchanged. No repeated gate or
  full-tier claim is made for this QA-only lane.

Evidence: integration `.evidence/2026-10-10/QA-STALE-COLLISION/knockaway/`
and `ramming-grounded/`. An ignored lane `.evidence` junction keeps the
harness paths inside its permitted root while storing evidence in integration.
The same evidence folder contains `gate-summary.json` with exact commands,
candidate identity and final results; it is a verdict summary, not a raw log.

## Removed

Removed the deep-overlap traffic setup and the assumption that a rival must
cross a widened road within 0.4 seconds. Their intended coverage remains in
the touching-face traffic checks and separate shoulder contact. No runtime
behavior, asset or scenario was removed.

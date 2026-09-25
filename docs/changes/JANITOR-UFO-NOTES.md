# JANITOR-UFO-NOTES

status: ready-to-merge after final unchanged lane/build gate

## Design

The two CPU UFO preparation notes describe exclusions and pending work that
were superseded by merged BUG-07. Fold the still-needed implemented contract,
source/test pointers and changed-assertion reason into ARCHITECTURE. Preserve
the existing defensive-policy decision and historical balance verdicts. This
is documentation cleanup only; no source, thresholds, assets or saves change.

## Removed

Delete checks/2026-09-24-cpu-ufo-gap.md and cpu-ufo-scope.md, plus the one stale
run-log pointer after the current contract is documented. Git text history
retains the original investigation. No binary or generated source is removed.

## Verification

Independent review found and corrected one omitted fact: successful CPU jumps
grant the jumping rival alone the normal short UFO protection and contact
cooldown. Source and the independent CPU UFO test prove that behavior.
Reviewer cleared corrected1405399. That checkpoint passed lane6/6 in37.05s
(518 core checks) and build222modules387ms. Integration metadata was then
synced; the final unchanged checkpoint must pass lane/build again before merge.
The Director records that exact gate verdict in the integration run log.

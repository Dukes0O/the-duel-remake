# DEEP-SAVE

THE_DEEP 10.1 is authoritative. Deep fields remain optional. Untouched legacy
saves gain no Deep object, and no history is inferred. Completed Pacific Canyon
Duel and Time Trial races count independently of Wasteland, capped at ten, with
existing settlement duplicate protection. Hints at five and ten stop after
discovery. The first garage hint exposes one 150-credit kit shared by all cars.
The switch gates progress, hints and buying; stored Deep data survives loading
while off. This card adds no sound cue.

## Checks

Frozen source: d83c38b6899f6d6df2d6def1f07652222a29fa40. The corrected canonical
`node tools/run-tests.mjs --tier lane --changed --jobs 4 --json --keep-going`
passed all 324 suites, zero failures and zero unrun, exit 0, in 979.026 seconds.
One `npm run build` passed on the same clean source, exit 0, in 1,347.9813 ms.
The build reports the existing large-chunk warning; there is no build error.

Meaningful acceptance: test-deep-save passes 17 memory-only groups, including
actual App Duel/TT settlements, reload and duplicate protection, named players,
and denied-write kit rollback. All eight historical fixtures match the actual
874bc0e3 normalizer byte for byte. The fixture suite passes nine shapes and 286
first-load/round-trip checks. Progression 27 and App integration 146 pass. The
storage model passes at 3.52 MB under 4 MB. The final canonical also passes the
arena settlement, career backup, direct replay and Titan climb suites.

Only three existing fixture-roster assertions change from eight to nine, under
the Director's committed grants: test-save-fixtures, test-arena-settlement and
test-career-backup. All wallet, award, export-byte, import-byte, recovery,
migration and legacy assertions remain exact and now also exercise 09-deep.json.
App wiring uses the narrow 61a3c9c9 grant. There is no new main or TT callback.
The kit uses existing failed-save rollback, preserving both credits and kit.

The same independent source reviewer and save guardian cleared the complete
runtime/App/Panorama union, then confirmed the exact two count repairs on the
final source. Root separately cleared the exact copied import guard and count
delta. No runtime or save code changed during the bounded repair.

## Reconciliation and retained failure evidence

Exact Panorama c56238e970e4ffb0ef87ca90f1a907ba3cdf51ff was adopted without
conflicts at 733a09da8258f9cff46ea7df86ca3919e6828e59. Its pit-transit hooks
remain exact. Both independent reviews confirmed that union.

The first 733a lane attempt was canceled after the Director's stale prototype
import-guard hold arrived. Only the owned gate and descendants were stopped.
There was no result JSON; no pass or failure count is claimed.

Under the Director's copy grant, this lane adopts only test-deep-look.mjs blob
d30bc9080776d2ddc811dcadedcda0c1531a8b3a from Audio d6a76d3a. Its eight approved
importer/specifier pairs permit the two Audio and six Save adapter imports.
Every other import remains rejected. Development-switch and look/numeric
assertions remain exact. No Audio runtime or asset is adopted here.

The earlier b486aaf0 canonical passed 321 of 324 suites, with three failures,
zero unrun, exit 1, in 2,104.171 seconds. Two failures were the fixture counts
repaired under c02fee6c. Titan climb's nested replay returned null with no output
under the unchanged 180,000 ms timeout; direct replay passed in that same run.
One separate unchanged-source Titan rerun passed all eight checks, exit 0.
Original failure and rerun logs remain separate from the green final result.
Root tracks that unreliable nested check in QA-TITAN-REPLAY-TIMEOUT.

## Removed

No runtime or asset was replaced. The obsolete zero-import prototype assumption
was replaced by the exact reviewed import-pair guard. No unnecessary scratch
remains. Gate, build and review evidence is retained for integration acceptance;
Root owns cleanup of this newly created lane after its accepted merge.

## Deferred

Actual browser, frames, balance and full checks belong to the night shift. No
live save, live checkout, release or push was used or claimed. Final result facts
are folded into this note by Root during the real source merge, preserving the
clean frozen lane rather than creating a results-only commit.

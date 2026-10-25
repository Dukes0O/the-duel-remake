# QA-YARD-HOME-AIR-ONLY

Claude approved this scope on the card at 07:20 on 15 October: keep the eight
historical road-car yard views and test Jesko's real air-only refusal separately.
The Director named only the existing scenario and this note as owned files.

## Design and changed assertions

- Pin F42, 959, Heritage, Aurora, Dusthawk, Banshee, Viper and Titan in their
  original configuration order. Replace the obsolete total-of-nine configuration
  assertion with explicit existence checks for these eight cars and Jesko.
  Hidden earned cars and later additions do not silently expand this agreed scope.
- Unlock those eight cars and Jesko in the disposable QA profile. Do not change
  helicopter placement or flags. Require helicopter enabled and Jesko unlocked
  and untransported before calling the production `visitWasteland` method.
- Require Jesko refusal and the exact production air-only message. Require the
  same player, state, course, run, profile, helicopter data and memory storage
  after refusal, with no visit or journey started. Record this refusal separately
  from the eight positive framing results.
- Change only the framing failure denominator from nine to eight. Keep the whole
  original `framedCar` function, its viewport and panel thresholds, and every
  later yard UI, wallet, journey and save-isolation assertion unchanged.

## Independent review correction

The first refusal check compared race-state object identity only. An in-place
change such as incrementing the score would keep that identity and evade the
check. Require equal serialized race-state contents as well as the same object.
Also compare the course's serialized feature data while keeping course identity;
snapshot only `course.features`, not the complete course with methods and internal
references. Serialization fails normally if unexpected circular data appears;
there is no fallback that drops this guard. These are extra refusal checks; the
original eight framing checks and all later yard assertions remain unchanged.
Reviewer confirmation is CLEAR. Genuine private-browser execution remains pending.

## Verification

Source preparation only during the Ardennes release hold. No browser scenario,
focused suite, lane gate or build has run for this change. The original failed
full-check packet and eight pictures remain evidence of that attempt; remaining
checks from that attempt are not passed. `node --check tools/scenarios/yard-home.mjs` and `git diff --check` passed.
A static comparison against HEAD confirmed the entire original `framedCar`
function and all later assertions are unchanged. The first comparison script
used a mismatched section boundary and failed; the corrected exact-section
comparison passed without any source change. Independent review and real-fault confirmation are CLEAR. The card's real
private scenario, nearby checks, lane/jobs4 and build remain required before merge.

## Removed

Removed the obsolete assumption that every configured car can enter the yard
without transport and that the configuration must contain exactly nine cars.
No runtime code, framing guard, later assertion or original evidence removed.

## Landed on current integration (Claude, 25 October 2026)

The branch of 15 October was merged with today's `integration/wasteland` (the generated
status page took integration's version). Not superseded: integration's yard-home still
frames `Object.keys(CARS)` and demands nine cars, and the roster is now thirteen.

One more fixture assumption had gone stale: the Jesko refusal check read
`app.duel.course.features`, but the menu now has no course loaded yet there, so the
scenario threw before anything was tested. It reads `app.duel.course?.features`
(undefined before and after, so "same course, same features" still holds). Same owned
file; no other assertion changed.

Ran: `test-yard-home`, `test-browser-harness`, `test-browser-scenarios` (pass), and the
real `yard-home` scenario headless on a private memory-only game: passed, zero issues,
zero warnings (eight road-car framings, the Jesko production refusal, and every later
yard UI, wallet, journey and save-isolation check). Lane tier and build below.

## Lane tier and build

(Filled in below.)

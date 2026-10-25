---
task: DEEP-ACHIEVEMENTS
status: building
flag: the-deep
---

# DEEP-ACHIEVEMENTS

## Design settled before code

Read-only shelf beside the cup case, gated by the-deep. With Lab off only
Raised from the Deep appears; with Lab on all six appear. Raised comes from
the raised car; running from Sirena ownership; Restored from the owned finish
(including the old single-restore compatibility view). These facts have no
stored dates: say "Date not recorded", never invent one or write on load.
Only Wreck racer and the two Coast Cup wins use an optional achievements list,
with first-earned UTC timestamps. Use the race-start paint snapshot, never a
later garage selection. Record after valid settlement, with both switches on.
Coast Cup trophies require a win at Pacific Canyon in the named finish; the
existing once-only Coast Cup finish payment stays as designed. No new reward
or sound event; the shelf reads progress and existing finish cues still play.
Wreck racer includes combat, Summit Time Attack and Grand Prix with career
pay off. The last of these records achievements without turning on payouts.

Checks: new headless achievement/save/settlement checks, lane tier --changed
with four jobs, production build; memory-only shelf scenario and compact JPG.
One independent save-code review. No frame check: no scene code changes.

## Changed assertions

None. Six new tests cover read-only derived progress and legacy restoration,
optional save round trips and first-earned dates, duplicate settlement,
invalid and disabled results, combat/Summit/Grand Prix paths, historical
fixtures, and the real App's race-start paint through a no-pay GP finish.
Existing assertions, tolerances and race/world fingerprints are unchanged.

## Independent save review

Save guardian: clear after fixes. Review found skipped Wreck racer paths in
combat, Summit Time Attack and GP with career pay off; all fixed and confirmed.
The real App earns both wreck trophies through a trusted GP finish, persists
them, keeps the wallet unchanged and makes duplicate settlement a no-op.
All 23 historical plus one forged fixture pass 1,029 preservation checks.
Damaged profiles pass 86 tests / 3,654 checks. Combat credits, fines, quitting,
reload, backup/migration and recovery checks pass. Storage model: 3.60 / 4 MB;
the three optional entries add at most 322 bytes per player. Old profiles
gain no achievements field when loaded; save failure notices remain intact.

## Checks and picture

New achievement suite: six tests pass. Lane, build and browser checks pending.
Cockpit sync: zero tasks changed. No live checkout or real player save accessed.

## Removed

None. No replaced asset or save migration.

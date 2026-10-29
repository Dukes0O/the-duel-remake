# KOGANE-PASS-C3: Kogane Pass, C3 pace

Owner: codex. Lane: SIM.

## Prerequisites and graph

Claude must complete and approve [the packet](../../courses/kogane-pass.md) before this stage starts.

Needs: KOGANE-PASS-C2.
Next: KOGANE-PASS-C6.

See [FACTORY section 3](../../FACTORY.md#3-the-production-lines).

## Done when

Field pace and the reference lap file; computer drivers finish without crashes on every difficulty

Judge: Tests.

## Files, locks and checks

Before building, copy owned files, contracts, locks and one to three checks from the approved packet.
Record any browser, look or frame checks needed. Follow the current lane and release gates.
New events must name their sound cue.

## C3 build contract

- Own the Kogane pace row in `src/race-field.js`, its replay fixture,
  pace and driver fields only in `src/circuits/kogane-pass.js`, and the
  course-specific pace assertions in `tools/test-circuit-kogane.mjs`.
- Locks: `circuit-registry`, `replay-fixtures`. Do not edit scenery rows.
- Keep six cars, Stuttgart 959-S, club driver, skill .95 and one open run.
  No reference lap file applies. Use Summit's line and following settings
  as the starting point. No new event or sound cue.
- Checks: course test, plus its `--pace` mode for 30 seeded races per
  difficulty; manual drive-through; manual circuit suite with the switch on.
  Lane gate jobs 2 and production build. No browser or frame measurement.
- The pace mode uses the existing field-balance driver at explicit skill .95,
  five opponents plus the player, and the existing seed list. Keep its
  finish, pile-up, passing and win-rate targets. Also require zero computer
  crashes and the Medium seed-index 0 reference run within 98 to 106 seconds. Solo line-driver
  times are diagnostic only and cannot stand in for the six-car target.

## C3 pace handoff question

The packet's .95 racing-line driver and the stock field-balance driver use
separate speed plans. The native line driver has no following speed cap;
its full-field probes crash. The field-balance driver follows traffic but
misses the time and win targets in the tested course-only recipes.
A solo native-line time is not full-field acceptance.

Recommended next slice: name one full-field controller explicitly, keep the
six cars and .95 skill, and allow its course-specific driver hook if needed.
Keep the packet's safety, time, passing and win-rate targets. The current
`--pace` check chooses the existing field-balance controller at .95 so this
failure is reproducible. No shared driver change is made here. Claude can
instead settle that the time target is solo only, but that alone does not
resolve the field crashes or win-rate failures. This is not proof that a
course-only recipe is impossible.

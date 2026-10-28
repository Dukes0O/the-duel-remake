# GP-CAREER-LIVE

The short board entry controls current state, ownership, dependencies and locks.

Kyle, 26 October 2026: a Grand Prix race at Summit paid no credits. The
Grand Prix career (pay by position, records and ghosts per event, variant
unlocks, cups and the trophy case: P4-CAREER, P4-CUPS) is built and merged,
but its switch `grand-prix-career` is still `dev`, so the menu says "No pay
or records yet". Claude decides it goes live (rule 18).

Switch `grand-prix-career` on. Check, as a player on a memory-only career:
a Grand Prix pays by finishing position at Easy, Medium and Hard (numbers in
the change note, against a Duel win on the same course so neither mode is
the obvious farm); a completed Grand Prix has no loss charge; Pro doubles;
the cups run and pay once; old saves load unchanged. Update any test that
pins the switch's state (list each changed assertion; nothing loosened).
Lane tier, build, combat balance check. This adds saved records, so it gets
the independent save review. Live.

# QA-RACE-FIELD

Found on 19 November 2026 by four sessions independently: `tools/test-race-field.mjs` fails "racecraft off preserves the original
state and RNG, seed 1989" with hash `18445baa...` against `f29bc060...`, on `integration/wasteland` itself (checked at `a9d18cabc`,
`80d6ab9` and `d3bac9278`), so a change merged on 19 November moved it and no lane tier that day ran this suite. Find the merge that
moved it (bisect between the last night that passed, `a7b2f60c1`, and `a9d18cabc`) and decide: a real change to racecraft-off state
(a fault, cure it) or a deliberate change whose pin must be re-recorded with its reason. Rule 13: tonight's full night reports it too.

# ARENA-WRECK-RATE

Status: tests written; native run waiting for the Director's quiet window.

## Changes

Added two acceptance checks. The first plays the same 12 Medium full-field
rounds used by the balance report: four seeds and three player cars. Their
mean must be 10 to 14 wrecks. The second preserves the warlord armor
multiplier of 1.5. No production code changed in this tests-first slice.

## Tests

JavaScript syntax passes. The native test has not run yet; no failure or
simulation pass is claimed. Source tuning waits for the actual failing
result. The Director will add a direct-execution guard to the balance tool
before this test imports it. The separate all-difficulty report remains
required card evidence.

## Design question

The existing warlord-format test requires Sal's actual armor to equal the
same car's ordinary arena armor times 1.5. Raising ordinary armor therefore
raises Sal's absolute armor. If "Sal unchanged" means preserving absolute
armor too, that conflicts with the existing assertion. Claude must settle
this before tuning; no existing assertion is changed here.

## Replays

Existing steering checks and replay fingerprints are unchanged. This test
does not add a steering rule.

## Removed

Nothing. No existing tests or production code were replaced.

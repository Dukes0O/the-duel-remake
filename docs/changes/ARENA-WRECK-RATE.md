# ARENA-WRECK-RATE

Status: native acceptance is red; tuning waits for the Claude armor answer.

## Changes

Added two acceptance checks. The first plays the same 12 Medium full-field
rounds used by the balance report: four seeds and three player cars. Their
mean must be 10 to 14 wrecks. The second preserves the warlord armor
multiplier of 1.5. No production code changed in this tests-first slice.

## Tests

The real twelve-round test fails as intended: Medium averages 20.75 wrecks,
above the settled 10 to 14 target. The unchanged 1.5 warlord multiplier passes.
The balance tool now uses a normal direct-execution guard so tests can import
its native playRound without running the whole report. Syntax passes; the CLI
report body is unchanged. The all-difficulty report remains required after tuning.

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

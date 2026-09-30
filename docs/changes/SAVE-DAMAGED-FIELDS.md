---
task: SAVE-DAMAGED-FIELDS
status: review
---

# Damaged profile numeric fields

Save Guardian reproduced JSON-safe `credits` and `winStreak` objects with an
own non-callable `toString`. Number conversion throws, then `loadPlayers`
falls back to a zero-credit default Player 1. The valid named career should
survive; only the unusable numeric field should use its existing zero fallback.

The new tests cover both supported profile schemas (1 and 2), each damaged
field independently, and own string, null, number, boolean, array and object
`toString` values. Every damaged case passes through JSON serialization first.
Direct normalization must preserve valid historical progress and the raw
input. Actual registry loading uses only a fabricated in-memory store and must
preserve both named players, their banks, the owner's upgrades, records,
receipts, race choices, pending race, earned driver/course, Wasteland progress
and additive fields. Loading must leave stored bytes alone; an explicit memory
save and reload must preserve the recovered career.

Baseline controls cover valid schema 1/2 progress and existing supported scalar
conversions: numeric strings, flooring, negatives, separate upper limits,
empty/nonnumeric strings, null/absent values, booleans, Infinity and NaN.
The scope does not forbid every object callback or claim that unrelated
malformed fields can never throw. No schema, storage key or ID rule changes.

## Test evidence

Untouched source commit: `abeddc4072eb66c71e654f67b82bb94cd4abd430`.
Command: `node --test --test-reporter=tap tools/test-profile-damaged-fields.mjs`.
Result: **86 tests, 38 pass, 48 fail, 0 skipped, 366 checks reached; exit 1**.

Each of these 24 combinations has two distinct intended failures:

| Supported schema | Damaged field | Own non-callable `toString` variants |
| --- | --- | --- |
| 1 | credits | string, null, number, boolean, array, object |
| 1 | winStreak | string, null, number, boolean, array, object |
| 2 | credits | string, null, number, boolean, array, object |
| 2 | winStreak | string, null, number, boolean, array, object |

For every combination, the exact direct-normalization failure is
`Got unwanted exception: schema <schema> damaged <field>/<variant> must normalize without throwing`,
with actual exception **`Cannot convert object to primitive value`**.
For every matching registry combination, the exact failure is
`schema <schema> damaged <field>/<variant> must not replace the named owner with default Player 1`:
actual active ID **`player-1`**, expected **`synthetic-owner`**.
For example, schema 2 damaged credits/string reports both failures above with
`<schema>=2`, `<field>=credits`, `<variant>=string`. The same independently
reported failures cover all rows and variants; none is a skipped/setup test.

All **38 baseline controls** pass: valid historical progress in both schemas,
plus 18 literal scalar/boundary cases in each schema. The existing command
`node tools/test-save-fixtures.mjs` passes **7 historical shapes and 247
first-load/round-trip checks** unchanged. Syntax and diff checks pass.

The Director owns the source fix and later lane/build gates. Migration/backup
suites and race pins are untouched; this tests-only commit does not claim the
later migration/backup/storage, lane, build or full-tier gates.

## Implementation and focused verification

The shared integer helper now catches a failed number conversion and applies
its existing zero fallback to that field. Successful conversion still follows
the original flooring, nonnegative clamp and separate upper limits. It keeps
supported numeric strings, booleans, Infinity clamping and all valid progress.
No profile schema, storage key, ID rule, receipt or race behavior changes.

The unchanged authored suite now passes **86/86 tests and 3,654 checks**.
Historical fixtures still pass **7 shapes and 247 checks**. Existing career
backup, storage budget, Wasteland profile and memory-only QA guards pass.
Independent review, Save Guardian and the mandatory lane/build gate remain
pending; this focused verification does not substitute for them.

## Removed

Replaced the packed integer conversion helper with its readable, guarded
version. No assets, saves, existing tests, assertions or fingerprints removed.

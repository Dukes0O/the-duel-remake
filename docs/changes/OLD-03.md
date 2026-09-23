---
task: OLD-03
status: review
kind: test-debt-audit
flag: none
player_facing: no
---

## Scope and method

Audited every added, removed, or rewritten test assertion in the 15 integration
commits from `5fbf24f` through `b9e40c5` (inclusive), against parent
`de7dba1`. The audited tip was `b9e40c5`. I read each relevant commit diff,
the assertion's fixture and production path, and nearby tests that might cover
the same behavior. This was a read-only behavior audit: no runtime, save, or
test source was changed. The five integration-record commits `53c9f0e`,
`584daf6`, `dad7b13`, `61e512c`, and `dc70026` changed no test assertions.

| Commit | Changed assertions or test support | Audit result |
| --- | --- | --- |
| `b9e40c5`, `b9a1c7e` | Vehicle socket ownership, replacement, retirement, and all-car rig checks in `tools/test-vehicle-sockets.mjs`. | Observe registry and model state across player/rival roles; useful checks. |
| `660119a` | Four momentum cases and self-damage ratio in `tools/test-bomb-momentum.mjs`. | Check player/rival launch velocity and trajectory against thrower motion; useful checks. |
| `fbe4389` | Shared-best retirement and rewrites in `src/test.js`, `tools/test-old-best.mjs`, and the route, physics, checkpoint, and drift suites. | Two assertions became vacuous; see TST-01 and TST-02. The other changed checks exercise settlement, import, retirement, finish validity, or distinct record keys. |
| `4222720` | Tab-specific IndexedDB namespace in `tools/test-qa-storage.mjs` and `tools/scenarios/career-tab-isolation.mjs`; `tools/qa-storage.js` is support. | Unit and browser checks observe distinct tab storage; useful checks. |
| `37efad7`, `ba1ad0a` | Archive, recovery journal, backup ordering, budget, missing-origin, and missing-archive scenarios and suites. `tools/menu-check.js` and `tools/qa-storage.js` provide test support. | Check persisted and recovered data, rollback, quota boundaries, and failure paths; useful checks. |
| `6fc9133` | Crash-slot browser scenario; course-access harness gains the LIVES source slice, without changing an assertion. | Scenario reads the five HUD bars and labels through ordinary and recoverable Wasteland transitions; useful checks. |
| `5cf591e`, `5fbf24f` | Combat-balance report and `--check` probes in `tools/combat-balance.mjs`. | Count hits on the player, UFO stock and self-bomb ratios by difficulty, and completion; useful checks against section 13 targets. |

## TST-01: Restore the route record through progression

`tools/test-race-integrity.mjs:134` now compares
`bestKey({...result}) === ordinaryKey`, where `ordinaryKey` is
`bestKey(result)` and `bestKey` is deterministic. It will pass even if record
storage and retrieval stop working. The replaced assertion wrote a 60-second
record, changed route identity, then returned to the first route and retrieved
60. The current key-separation assertions around this line are useful; only
the return-to-record assertion is vacuous.

**Debt card:** Settle a valid result into a profile, check its saved best,
compare another route and lap count, then return to the original setup and
assert that the previous best is still 60 through the real progression path.
Give each settlement a distinct run ID so duplicate-result protection does
not obscure the check. A record read regression must make this test fail.

## TST-02: Check named-player best isolation

`src/test.js:423` checks that a fresh `createProfile()` has no best for a
key. `createProfile()` always initializes `personalBests` to `{}` in
`src/progression.js:40`, so the assertion can pass even if switching players
or reloading incorrectly exposes a first player's best. The preceding
`settleRace` checks prove that one profile records a finish, but the next
assertion does not create or select a second player. Existing named-player
tests check other profile fields, not this best-time boundary.

**Debt card:** Create two named players in the registry. Settle a valid finish
for the first, switch to the second and assert no matching best, save/reload
the registry, repeat the second-player check, then switch back and assert the
first player's best remains. A cross-player best leak must make this test
fail.

These are gaps in the tests, not evidence that the current game leaks or
loses best times. The audit did not weaken an assertion or change production
behavior.

## Verification

The inclusive 15-commit range and changed test paths were enumerated with
`git log -15 integration/wasteland` and `git diff HEAD~15 HEAD -- src/test.js
tools`. The two vacuous assertions were compared with their `fbe4389` parent
versions and the current `bestKey`, `createProfile`, and `settleRace`
implementations. `git diff --check` passed. No suite was rerun for this
documentation-only audit; the exact integration state had already passed its
merge gate before this branch was made.

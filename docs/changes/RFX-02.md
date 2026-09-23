---
task: RFX-02
status: integrated
kind: simulation-refactor
flag: none
player_facing: no
---

## Acceptance and boundaries

This card splits the existing `Duel` simulation without changing race rules.
`src/game.js` remains the public `Duel` class, holds lifecycle and fixed-step
orchestration, and keeps its existing public methods and getters. The class also
keeps compatibility wrappers for internal methods used by existing tests.
Each extracted system receives the same `Duel` instance as `this`; the call
order, state mutations, seeded random calls, event emissions and return values
must remain the same.

| Module | Owns |
| --- | --- |
| `sim-driving.js` | road surfaces, player driving, drift ticks, terrain pose and jumps |
| `sim-contacts.js` | vehicle dimensions, obstacle and ground-support queries, static and vehicle contacts, dents and crushed props |
| `sim-rival.js` | rival and traffic movement, CPU yield decisions |
| `sim-police.js` | pursuit movement, ticket, escape and acknowledgement rules |
| `sim-laps.js` | lap gates, checkpoint rush gates and flock bonuses |
| `sim-crash.js` | impact, tumble, rollover, boundary and safe-reset recovery |
| `sim-results.js` | objective/deadline checks, par time, stage result and next stage |

Done means:

1. Those seven systems live in readable `src/sim-*.js` modules. `Duel` keeps
   its public signatures (`startCampaign`, `step`, `fireWeapon`, `ackTicket`,
   `nextStage`, `setInput`, listeners and getters) and existing state shape.
2. Every existing replay fingerprint is byte-for-byte unchanged at 30, 60 and
   144 FPS across all 16 events and listed modes. No baseline is regenerated.
3. Focused simulation checks pass after each extraction. The full lane and
   production build pass on the final source. The full test tier and private
   browser smoke pass before a merge is proposed.
4. No render, HUD, save, course, tuning or combat source is edited. No live
   save or live game is opened. This branch stays separate from integration
   until the evidence is reviewed.

## Work log

Source base for this forward port: integration `b34decd2a8ebe30439f836a00c784cac756d9872`.
The first extraction was verified on `731a0754ca8532e78462737b1f4ea6a189ec27e3`.
This port moved the later armor, scenery, traffic, checkpoint, police, and
Wasteland pace/recovery rules into their matching system modules. No rule,
assertion, or fingerprint was changed for RFX-02.

## Implementation

The seven systems above now contain the existing method bodies, with no race
rules or tuning changed. `sim-common.js` holds the unchanged clamp, damage-zone
factory and boundary constants used in more than one system. `game.js` retains
the `Duel` constructor, state shape, getters, listeners, campaign setup, combat
entry point and fixed-step call order. Its compatibility methods delegate to
the system functions with the same `Duel` instance as `this`. Public
`ackTicket()` and `nextStage()` keep their original signatures.

The module extractions were checked in sequence: driving; contacts; rival and
traffic; police; laps; crash and recovery; results. After each extraction, the
focused tests for that system passed. This included driving, off-road, contact
damage, NPC routing and yielding, police fines and reset, checkpoint and lap
gates, crash recovery, and result/reward tests. The replay gate passed after
the first three systems and again after all seven.

## Verification on the forward-port branch

| Check | Result |
| --- | --- |
| `node tools/test-replays.mjs` | 162 checks passed across 18 cases, 16 events, eight categories, 30/60/144 FPS and three runs; baseline files unchanged |
| `node tools/run-tests.mjs --tier lane --changed --jobs 8` | 86 suites passed, 0 failed, 0 not run in 323.05 s |
| `node tools/run-tests.mjs --tier full --jobs 10 --json` | 172 suites passed, 0 failed, 0 not run in 356.46 s |
| Focused armor, roadside destruction, checkpoint recovery, police, and CPU combat tests | Passed |
| `npm run build` | Passed; Vite transformed 155 modules. Existing large-chunk advisory remains. |
| `node tools/browser-harness.mjs smoke` | Passed on private port 27818: High and Performance menu/race, four screenshots, 0 warnings, 0 errors |
| `git diff --check` | Passed |

Private smoke report: `.qa-dist/browser-output/smoke-2026-09-23T17-14-39-332Z/report.json`.
The QA harness used its throwaway Chrome profile and memory-only save storage;
it did not connect to the live game or port 5174. The integration and live
checkouts were untouched.

Independent review found all 47 extracted method bodies and signatures unchanged
and no import cycle. On integration commit `d6c19a1`, the combined merge tier
passed 165/165 suites in 252.89 seconds, including 162 unchanged replay
fingerprints. The production build passed. Private High and Performance browser
smoke reached active races with four screenshots and zero warnings or errors.
This structural change is integrated but has not been released.

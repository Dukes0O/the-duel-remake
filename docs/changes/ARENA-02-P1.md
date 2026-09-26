---
task: ARENA-02
status: ready-to-merge
kind: balance
flag: scrapdome
player_facing: no
---

# Scrapdome crates, jousting, junk sense and balance (26 September 2026)

## Design

Settled in `docs/SCRAPDOME.md` sections 3, 4 and 8 before code. Part 1 of
ARENA-02; settlement (scrap and hold) remains for ARENA-02-PAY.

## What changed

- `src/arena/arena-pickups.js` (new): five fixed crate spots (weapons on ramp
  tops, repairs by the Heap), respawn after 12 s, collection from any direction,
  easy computer cars leave crates alone; `combat-pickups.js` uses it in arena
  events.
- `src/arena/arena-brains.js`: jousting rammers (back off, retreat, charge);
  wounded Medium and Hard cars break off for repair crates.
- `src/arena/arena-pilot.js`: junk sense and immediate back-out when pinned;
  longer reverse.
- `src/arena/venues.js`: junk in three rows between spawn slots; spawn slots
  keep 14 m from junk (`junkSpawnClearance`).
- `src/arena/arena-event.js`, `src/game.js`: arena armor is half of race armor
  (`ARENA_RULES.armorScale`).
- `tools/arena-balance.mjs` (new): repeatable balance report.

## Behavior and test changes

No existing assertion changed. `tools/test-arena-event.mjs` adds crate,
spawn-clearance and jousting tests (12 tests).

## Evidence

- Arena tests 12/12, arena UI tests 6/6.
- `node tools/arena-balance.mjs`: results in `docs/SCRAPDOME.md` section 8.
  Before these changes, Medium computer cars averaged 12 to 29 mph and reversed
  13 to 17 % of the time (scrums and junk); now 40 mph and 8 %.
- Full tier and build: recorded in the merge commit.

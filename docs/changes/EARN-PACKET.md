# EARN-PACKET

- Task: Cockpit T-013, "Earned cars: medal sheets (wins, difficulty levels,
  Duel and Grand Prix)".
- Status: complete (design only). Kind: design packet and board cards.
- Switch: `earned-cars` (installed by EARN-MEDALS, dev).

## Settled design

`docs/EARNED_CARS.md`:

- A medal sheet per car and named player: Duel and Grand Prix rows, Easy,
  Medium and Hard columns (bronze, silver, gold), with win counts. A win
  counts once inside `settleRace` after its existing checks; Time Trial,
  practice, qualifying, losses and repeats never count.
- Three earned cars, never bought, arriving fully tuned like the Jesko: at 6
  medals, 15 medals, and 24 medals with 6 gold. Claude's standing pick is the
  Ferrari Enzo, McLaren F1 and Bugatti Bolide; Kyle may swap them.
- Every earned car travels only by air, so each weighs 1,500 kg or less.
- The Jesko keeps its rule: the eight bought cars fully tuned. Earned cars
  never join that list.
- Save: one optional `medals` field, written on the first counted win.
  Sheets start empty for everyone; old history is not turned into medals.
  No car, credit or record changes. A one-release rollback loses nothing for
  good (packet 6.4).
- Cards: EARN-MEDALS (save, `save-shape`, save checker), EARN-SCREEN (screens,
  `busy-game-files`), EARN-CAR-1 to 3 (one car each, `sound-bank`),
  EARN-FINISH (Claude).
- `docs/HELICOPTER.md` section 5: the special-car line points to the packet.
  Nothing else in that file changed.

## Evidence

- One independent review of the packet against the code (14 October 2026):
  facts confirmed (Jesko list, win and Grand Prix rules, top speeds, lift
  limit, field of copies, starter pacing). Three errors fixed: a rollback
  would have dropped an earned car's paint, records, ghosts and helicopter
  spot (fixed by shipping the cars switched off one release first, 6.4); the
  first fixture could not hold an earned car before one exists; "byte for
  byte" was wrong because loading always rebuilds a save. Risks folded in:
  tests that pin the car list, the garage bar scale, `unlockCar` for a medal
  car, pacing without the Grand Prix career, the helicopter mass source, a
  rival setting left on a hidden car.

- Lane tier (`--changed --jobs 4`): 14 suites passed, 0 failed, 553 s. Build passed. Run again after the review fixes.
- No code, test or save changed. No assertion changed.

## Removed

Nothing. The Jesko's unlock code stays; EARN-MEDALS narrows its car list to
bought cars, which leaves today's list of eight unchanged.

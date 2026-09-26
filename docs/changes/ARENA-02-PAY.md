---
task: ARENA-02-PAY
status: in-progress
kind: feature
flag: scrapdome
player_facing: yes
---

# Last Car Rolling settlement (26 September 2026)

## Design

The exact formula is settled before code in `docs/board/decisions.md`: 80 scrap
for finishing, 40 per computer car placed behind the player and 60 per
credited wreck, capped at four. Multiply the subtotal by computer difficulty
(1.0, 1.2 or 1.4) and round once. A win against at least two computer cars
adds 25 Kettle Kingpin hold. A one-car win pays scrap only.

Settlement belongs to the named player who started the event. It runs once on
`arenaResult`, records `arena:<runId>` in the version-1 Wasteland career and
reverts the whole profile if storage rejects the save. Leaving before a result
does not settle anything.

## Tests first

Pending.

## What changed

Pending.

## Evidence

Pending.

## Removed

Nothing. This card adds the first Scrapdome settlement path.

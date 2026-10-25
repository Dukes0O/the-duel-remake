---
task: SIRENA-KIT
status: done
flag: the-deep
player_facing: no
---

# SIRENA-KIT: the Falcone Sirena's three Wasteland armor tiers

Claude (Sonnet 5.5 side session), 25 October 2026. Card `docs/board/cards/SIRENA-KIT.md`.
Nothing is exposed meanwhile: nobody can own the Sirena before the Lab restores it.

## Changed

- `public/assets/models/wasteland/kits/falcone_sirena.glb` (new, 433 KB, 3,574
  triangles, 38 nodes): built by `tools/blender/armor-kits.py` (`--cars
  falcone_sirena`; the other twelve kits are untouched). Same node names
  (`kit-scrapper`, `kit-raider`, `kit-warlord` and every part under them), the
  painted UVs and tier parts as the other kits; the Warlord shell comes from the
  Sirena's own `Lacquered body` faces (the runtime body export, like the Enzo's and
  the F1's, since the car is built in code, `src/sirena-vehicle.js`).
- `tools/blender/armor-kits.py`: `falcone_sirena` last in `SIZES` (1.96 x 4.45 x
  1.06, the model's own size; its place in the list shapes its plates, so the other
  cars stay where they were) and a small `CAR_RULES` table for the places where the
  general placement would put a plate on a wheel. The Sirena's wheels stand proud of
  its flanks: its quarter plates ride the fender crowns (and the front one stops where
  the hood drops away), its exhaust stacks stand behind the rear wheels and its Raider
  door sheets stop short of the wheels. Other cars have no rule, so their output is
  unchanged by construction.
- `tools/audit-armor-kit-fit.mjs`: the body export also matches `Lacquered body`
  (nothing else the export returns today uses that name), and the Sirena's fit row
  gains a `fenderGrid` (the side sampled just above its wheels). No other car's row
  changes. (These two are hooks outside the card's owned list, the same two the
  earlier cars' kits touched.)
- `tools/test-armor-kit-assets.mjs`: the `LAPTOP_KITS` wait and its comment are
  gone; every car in the roster is checked, and the test now also asserts every car
  has its kit file (the roster floor is 13).
- `docs/board/looks/sirena-kit/round-1.jpg` and `round-1-review.md`: the kit sheet
  (385 KB) and its fit verdict.

## Fit check

Measured with vertex tests against the Sirena's real wheel discs and glass (scratch
script, not kept): Scrapper and Raider have no vertex in a wheel disc and none within
12 mm of the glass (the turret ring touches the windscreen frame at 3 mm); the Warlord shell shares the bare body's own wheel-arch relation.
Looked at in the game, High quality, three angles per tier: sheet and verdict in the
review note. One round of two used. The first build had plates lying in the tyres
(58 vertices up to 290 mm deep, the stacks 52 mm); the `CAR_RULES` above fixed it.

## Removed

The `LAPTOP_KITS` wait in `tools/test-armor-kit-assets.mjs` (the list, the filter and
the comment explaining it).

## Checks

- `node tools/test-armor-kit-assets.mjs` passes with the wait gone; also
  `test-armor-kit-authored`, `test-armor-kit-fit`, `test-armor-kits`,
  `test-vehicle-sockets`, `test-sirena-vehicle`, `test-sirena-car` and
  `test-combat-armor`.
- Lane tier and build: below.

## Lane tier and build

(Filled in at the end of the card.)

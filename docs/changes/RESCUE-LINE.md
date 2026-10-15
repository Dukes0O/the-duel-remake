# RESCUE-LINE

Claude, 14 October 2026. The rescue line: the rescuer on the cable, the
set-down and hold, bumps, the handover and the supply crates
(`docs/HELI_RESCUE.md` sections 4 and 5.4). Nothing in the game imports it
yet; RESCUE-HOOKS wires it in behind the `rescue` switch.

Needs: FIRE-MISSIONS and FIRE-BUCKET merged.

## What changed

- `src/heli/heli-rescue.js` (new): the rescuer as an H1 cable load, built the
  way the bucket is. It is already on the hook, rests on the ground at the pad
  (clip point 1.3 m up) and is flagged `rescue: true`, with `who` as
  `'rescuer'` (90 kg) or `'pair'` (170 kg). `heli-cable.js` is unchanged. It
  imports only `./heli-flight.js` and `./heli-cable.js`, uses no clock and no
  randomness, and never touches credits.
  - `createRescueLine({x, z, heading, ground})`, `setLineWho`, `peopleOnLine`,
    `holdFraction` (for the dig bar).
  - `stepRescue(line, heli, {target, kind, zones}, dt)` runs before
    `stepCable` and returns `{events}`: `rescueFast`, `holdStarted`,
    `holdReset` (with a reason: `lifted`, `dragged` or `away`), `holdDone`,
    `clipped` and `handover`.
  - `rescueHit(line, cargoHitEvent)` returns `{bump, cut, bumps, event}`;
    `rescuePay(basePay, bumps)` applies the cuts and never goes below 0.
  - `hNothing(loadOrLoads)`: true while people are on the line, so the
    session can make H do nothing. `canFitLine(loads)`: one fitting at a
    time (car, bucket or line), with a reason when it says no.
  - `SUPPLY_CRATES` (the numbers table), `createSupplyCrate`, `crateResult`,
    `cratePay`, `supplyPay`, and `SUPPLY_PAY`.
- `tools/test-heli-rescue.mjs` (new, found by the runner by its name).

## Numbers

- Weights: rescuer with gear 90 kg, casualty 80 kg, pair 170 kg.
- Speed: limit 20 m/s with people on the line (exported for the autopilot);
  Roger warns over 25 m/s, once per crossing. The warning is given again only
  after the helicopter has slowed to 24 m/s or less, so a speed wobbling
  around 25 does not repeat it.
- Bumps: any cargo hit over 4 m/s with people on the line costs 300 credits;
  pay never goes below 0. The hit class (light, heavy, wreck) does not change
  the 300.
- Set-down and hold: the rescuer at rest on the ground within 3 m of the
  target, the helicopter's ground speed and the rescuer's sliding both at 1.5
  m/s or less. Hoist 8 s, avalanche 12 s. Dragged faster, lifted off or slid
  out of the ring resets the hold; `holdReset` is sent only if a hold was
  running. At the end: `holdDone`, then `clipped`, and the load becomes 170 kg.
- Handover: the pair on the ground, sliding at 1 m/s or less, with the
  helicopter at 1 m/s or less, inside any listed circle (12 m if a circle has
  no radius). It happens once and the line is then `done`.
- Supply crates: Summit Run food 300, medicine 200, fuel drums 820 kg;
  Tremblant Snow fallback 400, 500, 900 kg. Pay 300 a crate, 150 less when
  released from higher than 1 m, 100 more when all three are down in time
  (1,000 for three clean ones). The hut yard is a 10 m circle.

## Tests

- `node tools/test-heli-rescue.mjs`: 191 checks pass. The weights read by the
  real cable (90 then 170 kg), the speed warning and its limits, bumps and
  pay (including a real slide into a tree), the hold at each edge (3 m,
  1.5 m/s, 8 s and 12 s), resets from dragging, lifting and drifting, a real
  cable hold and a real cable drag, the handover at the circle edge and at
  1 m/s, a pair lowered onto the ground on the real cable, H doing nothing,
  one fitting at a time, the crate table, crate pay with the drop rule and the
  all-three bonus (clean and dropped real crates), the line steady on the
  cable under a moving helicopter for 60 s (rescuer and pair: the cable never
  stretches 20 cm, no hits, no swing into the helicopter), and the same
  fingerprint every run.
- `node tools/test-heli-mode.mjs`: 150 checks pass, including the import
  guard and the no page, clock, storage or randomness rule for the new file.
- `node tools/test-repo-hygiene.mjs`: placement passes.
- Lane tier and build: run by the lead.

## Changed assertions

None.

## For the cards that wire it in

- The session's `handle` charges a repair for every `cargoHit`. For the
  rescue line, RESCUE-HOOKS must call `rescueHit` instead and skip the repair
  (the pay cut is the cost), and must apply `hNothing` before `pressHook`.
- A supply crate that was ever released from more than 1 m keeps its drop
  height (H1 only resets it on the next high release), so picking it up again
  does not clean its pay. Delivery counts when the crate is unhooked, at rest
  and inside the yard circle (`crateResult`).
- The crate masses are starting values; RESCUE-SITES tunes them to the hut's
  real height (`createSupplyCrate` takes a `massKg` override).

## Removed

Nothing.

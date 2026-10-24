# LAB-HELI

The Lab's upgrades take effect in the helicopter (docs/LAB.md 4.1 and 4.2). Switch `lab` (dev), read by the session as `labEnabled`. With the switch off, or nothing bought, every helicopter result is exactly what it was.

## What changed

- `heli-flight.js`: the flight state can carry `upgrades` (`thrustFactor`, `emptyMassKg`, `altitudeScaleM`), set only when something is bought; a plain helicopter gets no field. `heliMass`, `availableThrust`, `heliReadout` and `airFactor(altitude, scale)` read it, so Engine 1 and 2 scale the thrust (1.05, 1.10), Light frame takes 80 kg off the empty mass and Altitude tune makes thrust fall with a 10,000 m scale (0.751 of sea level at Summit, against 0.714 stock).
- `heli-cable.js`: `liftCheck(carId, hookLimitKg)` takes the Heavy hook's 2,000 kg (the hook itself already read `hookLimitKg` from the gear). The chosen 25 m line goes through the existing `lineLength` option.
- `heli-bucket.js`: `createBucket({litres})` (800 with Bigger bucket) and `bucketHolds` scale by it; the weight follows the water. A bucket can carry retardant (`contents: 'retardant'`): 600 litres, filled only by the pad action, not refilled by a lake, a water bucket again once emptied; its parcels and patches say `retardant: true`, and its `pourStart`/`pourStop` events too.
- `heli-fire.js`: `applyWater` hands retardant patches to `applyRetardant`: each patch's litres are shared among the cells it covers, 150 litres treat a cell, a treated cell cannot catch fire (`spreadStep` skips it, after drawing its roll, so the seeded sequence is unchanged), a burning cell is never lowered and takes none, and nothing is put out. `treatedCells(fire)` and `RETARDANT` are new exports.
- `heli-save.js`: the saved fire record keeps an optional `retardant: [[cell, litres]]` (see Decisions).
- `heli-autopilot.js`: its hover ceiling reads the upgrades (one line).
- `heli-session.js`: option `labEnabled`; reads the upgrades from the save (through `src/lab/lab-heli.js` only: `heliUpgradesOf`, `ownedLabUpgrades`, `chooseLabLine` are new there), passes them to the flight state, the hook (limit and line) and the bucket (litres, line), draws the aim ring from the saved tier, and adds `session.loadBucket('water'|'retardant')`, `session.chooseLine(15|25)` and `session.lab` for the pad menu. A helicopter on the ground takes bought upgrades at once; one in the air keeps its own.

## Decisions (approved by Claude, 24 October; see "Claude answers" on the card)

1. The saved fire record gains an optional `retardant` list; without it the treated cells would be forgotten at the next save.
2. `heli-autopilot.js` reads the upgrades (outside the five named files).
3. Left to LAB-VIEW and LAB-RADIO: drawing the pad menu, passing `labEnabled` from `src/app.js`, the fire view's litre bar (fixed 600), and the `heli.retardant` sound.
4. Engine 1 alone only just holds the Banshee's weight at the home pad (0.2% to spare at 250 m, 20 m up): the card's "only with Engine 2" holds for a climb, which the test asks of 4%.

## Tests

`tools/test-lab-heli.mjs` (12 tests, headless). With an empty Lab: the state, mass, thrust, readout, fingerprint, bucket and hook limit are what they were, and a whole session (job, hook, climb) gives the same snapshot hash as the same session on untouched `integration/wasteland` (`7999074...`), with `labEnabled` off, on with no Lab, and on with an empty Lab; upgrades in the save do nothing with the switch off. With upgrades: the Dusthawk (1,280 kg) lifts with a full tank and nothing bought; the Banshee (1,810 kg) is refused by the stock hook, the Heavy hook lets the hook take it, only Engine 2 gives the rotor 4% to spare, and the hook alone or Engine 1 alone does not lift it; the 25 m line swings in 10.1 s and the 15 m in 7.8 s (within 5% of 10 and 7.8) and a car really hangs 25.05 m below the helicopter; summit thrust with the tune is 0.751 of sea level; the 800-litre bucket holds and weighs for it; retardant stops spread across a line of treated cells while the untreated fire burns past it, puts nothing out, does not lower a burning cell, is kept in the saved fire record, and a lake does not refill it; the aim ring follows the saved tier.

Run once on the branch after merging current `origin/integration/wasteland`: every existing `tools/test-heli-*.mjs` suite passes unchanged except `test-heli-mode`, whose import rule gained the one Lab file the session may read (`../lab/lab-heli.js`). Lane tier and build, and the independent review, are recorded below.

## Removed

Nothing.

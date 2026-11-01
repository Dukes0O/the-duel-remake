import test from 'node:test';
import assert from 'node:assert/strict';
// The weighing pad the Lift classroom lesson reads (tools/test-lab-classroom-lift.mjs has the lesson).
import {PAD, padForces} from '../src/lab/benches/lift-pad.js';
import {KESTREL, GRAVITY, HELI_STEP, createHeliState, heliMass, availableThrust, stepHeli} from '../src/heli/heli-flight.js';

test('every offered pad load reads the helicopter rules, including ground effect', () => {
  let checked = 0;
  for (let cans = 0; cans <= 4; cans++) for (let crates = 0; crates <= PAD.maxCrates; crates++) for (const car of [0, 1]) {
    const fuel = cans * PAD.canKg;
    for (const collective of [0, .25, .5, .75, 1]) {
      const input = {fuel, crates, car, collective};
      const cargo = crates * PAD.crateKg + car * PAD.carKg;
      const s = createHeliState({fuelKg: fuel, mode: 'real'});
      const f = padForces(input);
      assert.equal(f.massKg, heliMass(s) + cargo);
      assert.equal(f.liftN, collective * (s.engine ? availableThrust(s, 0) : 0));
      assert.equal(f.weightN, (heliMass(s) + cargo) * GRAVITY);
      s.collective = collective;
      const expected = Math.max(0, (f.liftN - f.weightN) / heliMass(s) * HELI_STEP);
      stepHeli(s, {}, {external: {y: -cargo * GRAVITY}}, HELI_STEP);
      assert.ok(Math.abs(s.vy - expected) < 1e-10);
      const hs = createHeliState({fuelKg: fuel, y: PAD.hoverHeight});
      assert.equal(padForces(input, PAD.hoverHeight).maximumN, hs.engine ? availableThrust(hs, PAD.hoverHeight) : 0);
      const h = padForces(input, PAD.hoverHeight);
      if (h.hoverCollective <= 1) {
        hs.mode = 'real'; hs.collective = h.hoverCollective;
        stepHeli(hs, {}, {external: {y: -cargo * GRAVITY}}, HELI_STEP);
        assert.ok(Math.abs(hs.vy) < 1e-10, 'each liftable load can really balance in the low hover');
      }
      checked++;
    }
  }
  assert.equal(checked, 250);
  assert.equal(PAD.canKg * 4, KESTREL.tankKg);
});

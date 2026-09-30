import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';

// ARENA-RAMP-SIDE (Kyle, 30 September 2026): driving up the side of a
// Scrapdome jump threw cars 600 to 2,200 m into the air. A ramp's full height
// starts abruptly 15 m either side of its centre line, and that one-step rise
// was read as a vertical ground speed of about 290 m/s. The ground may only
// give a car the vertical speed the ramp's authored slope gives at its speed.
const FLAGS = { wasteland2: true, 'hidden-road': true, scrapdome: true };
const DT = 1 / 120;
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };

function fly(car, { ds, lateral, heading, mph }) {
  const d = new Duel({ seed: 1989, featureFlags: FLAGS });
  assert.equal(d.startArenaEvent({ car, cpuDifficulty: 'easy', seed: 1989, opponents: [{ car: 'aurora_gt' }] }), true);
  const s = d.state;
  for (let guard = 0; s.status !== 'racing' && guard < 3000; guard++) d.step(DT);
  const ramp = d.course.features.ramps[1];
  for (const other of s.opponents) { other.s = ramp.start + 300; other.prevS = other.s; }
  Object.assign(s, { s: ramp.start + ds, prevS: ramp.start + ds, lateral, prevLateral: lateral, headingError: heading, speedMph: mph });
  let peak = 0, landed = null;
  d.onChange((_state, event) => { if (event.jumpLanded) landed = event.jumpLanded.distance; });
  for (let i = 0; i < 600; i++) { d.setInput({ throttle: 1, steer: 0 }); d.step(DT); peak = Math.max(peak, s.airHeight || 0); }
  return { peak, landed };
}

// The approaches that launched cars highest in the review sweep (up to 1,152 m).
for (const car of ['banshee_muscle', 'titan_monster'])
  for (const [lateral, heading] of [[20, -.4], [24, -.4], [20, -.6], [-20, .6], [-24, .6], [-20, .4]])
    for (const ds of [0, 10]) {
      const { peak } = fly(car, { ds, lateral, heading, mph: 60 });
      check(peak < 4, `${car} onto the ramp side from ${lateral} m at ${heading} rad: ${peak.toFixed(1)} m of air, below a normal jump's 4 m`);
    }

// Straight jumps keep their exact flight (recorded before the change).
const straight = [
  ['banshee_muscle', 45, 2.6101, 28.9], ['banshee_muscle', 70, 2.8181, 31.1], ['banshee_muscle', 100, 3.2181, 36.1],
  ['titan_monster', 45, 2.0691, 24.3], ['titan_monster', 70, 2.2514, 25.6], ['titan_monster', 100, 2.6823, 29.1],
  ['viper_proto', 45, 2.6051, 29.3], ['viper_proto', 70, 2.8526, 31.6], ['viper_proto', 100, 3.0504, 35],
];
for (const [car, mph, peak, landed] of straight) {
  const flight = fly(car, { ds: -20, lateral: 0, heading: 0, mph });
  check(Math.abs(flight.peak - peak) < 5e-5, `${car} at ${mph} mph keeps its jump height (${flight.peak.toFixed(4)} m, was ${peak} m)`);
  check(flight.landed === landed, `${car} at ${mph} mph keeps its jump length (${flight.landed} m, was ${landed} m)`);
}

console.log(`Arena ramp sides: ${checks} checks passed; no side launch, straight jumps unchanged.`);

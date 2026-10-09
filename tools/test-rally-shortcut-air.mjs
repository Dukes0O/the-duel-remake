import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';

// DUSTHAWK-AIR (Kyle, 9 October 2026): with the rally car, taking a shortcut
// drops the car from the air while it believes it is on the road. The rally
// car only runs its jump and terrain rules off the prepared road. On the
// shortcut it kept the height it had when it last left the road, so when the
// shortcut dipped (or the car brushed the dirt beside it) it appeared 10 m up
// and fell. Ordinary cars never run those rules and are unchanged.
const index = COURSE.findIndex(course => course.id === 'pacific-canyon');
const dt = 1 / 120;

function start(car, seed) {
  const duel = new Duel({seed});
  duel.startCampaign({startStage: index, car, seed, difficulty: 'casual', mode: 'duel'});
  Object.assign(duel.state, {status: 'racing', countdown: 0, traffic: [], opponents: [], rival: null});
  return duel;
}

// Follow the real shortcut line from just before its entrance to just after
// its exit and report the highest the car's body gets above the ground.
function driveShortcut(car, seed) {
  const duel = start(car, seed), s = duel.state, cut = duel.course.features.shortcuts[0];
  const from = cut.start - 40;
  s.nextLapGate = duel._lapGates.filter(gate => gate < from).length;
  Object.assign(s, {s: from, prevS: from, lateral: 0, prevLateral: 0, speedMph: 90, headingError: 0});
  let highest = 0;
  for (let i = 0; i < 120 * 80 && s.s < cut.end + 60 && s.status === 'racing'; i++) {
    const phase = duel.course.phase(s.s);
    const target = phase >= cut.start && phase <= cut.end ? duel.course.shortcutOffset(cut, phase) : 0;
    const want = -Math.max(-.6, Math.min(.6, .06 * (s.lateral - target)));
    duel.setInput({throttle: s.speedMph > 100 ? .3 : 1, brake: 0,
      steer: Math.max(-1, Math.min(1, (s.headingError - want) * 3))});
    duel.step(dt);
    highest = Math.max(highest, s.airHeight || 0);
  }
  return {highest, reached: s.s >= cut.end + 60};
}

test('the rally car stays on the ground along a descending shortcut', () => {
  const {highest, reached} = driveShortcut('dusthawk_rally', 17);
  assert.ok(reached, 'the drive covers the whole shortcut');
  assert.ok(highest < .5, `the car never leaves the ground (highest ${highest.toFixed(2)} m)`);
});

test('the Falcone F42 is measured on the same drive', () => {
  assert.ok(driveShortcut('falcone_f42', 17).highest < .5);
});

test('height from an earlier dirt stretch is forgotten once the car is on the road', () => {
  const duel = start('dusthawk_rally', 17), s = duel.state, cut = duel.course.features.shortcuts[0];
  const mid = (cut.start + cut.end) / 2, lateral = duel.course.shortcutOffset(cut, mid);
  assert.ok(duel._surface(mid, lateral).road, 'the fixture sits on the shortcut');
  Object.assign(s, {s: mid, prevS: mid, lateral, prevLateral: lateral, speedMph: 60, headingError: 0,
    airborne: false, airHeight: 0, _jumpY: duel.course.groundAt(mid, lateral).y + 10, _verticalSpeed: -5});
  duel.setInput({throttle: 1, steer: 0});
  duel.step(dt);
  assert.equal(s._jumpY, null, 'a car standing on the road keeps no stale height');
  assert.equal(s.airborne, false);
});

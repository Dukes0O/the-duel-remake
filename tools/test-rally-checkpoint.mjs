import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {OFFROAD_CHECKPOINT_CORRIDOR} from '../src/sim-laps.js';

// RALLY-CHECKPOINT (Kyle and Gratian, 26 September 2026): with the rally car
// on Pacific Canyon near the shortcut, the game kept putting the car back on
// the track. A rally car may leave the road (it has no course boundary), so a
// lap checkpoint crossed out on the dirt must count for it; only a crossing
// far from the road or any shortcut is a miss. Ordinary cars are unchanged.
const SECOND_GATE = 2772;

function crossing({car, lateral, prevLateral = lateral}) {
  const duel = new Duel({seed: 1989});
  duel.startCampaign({mode: 'wasteland', startStage: 0, car, seed: 1989, difficulty: 'casual'});
  const s = duel.state;
  Object.assign(s, {status: 'racing', countdown: 0, traffic: [], opponents: [], rival: null,
    nextLapGate: 1, completedLaps: 0, speedMph: 50, invulnerableSec: 0,
    prevS: SECOND_GATE - 4, s: SECOND_GATE + 4, prevLateral, lateral});
  const events = [];
  duel.onChange((_state, event) => events.push(event));
  duel._advanceLaps(s, 1 / 60);
  return {duel, s, events};
}

test('a rally car crossing a checkpoint out on the dirt keeps going', () => {
  for (const lateral of [-25, -60, -90, 40]) {
    const {duel, s, events} = crossing({car: 'dusthawk_rally', lateral});
    assert.equal(duel._lapGates[1], SECOND_GATE, 'the fixture crosses the second checkpoint');
    assert.equal(s.nextLapGate, 2, `the checkpoint counts at ${lateral} m`);
    assert.ok(!events.some(event => event.checkpointReset), `no snap back to the road at ${lateral} m`);
    assert.equal(s.lateral, lateral, 'the car stays where it was driving');
  }
});

test('a checkpoint far from the road and every shortcut is still a miss', () => {
  const lateral = -(OFFROAD_CHECKPOINT_CORRIDOR + 30);
  const {s, events} = crossing({car: 'dusthawk_rally', lateral});
  assert.equal(s.nextLapGate, 1);
  assert.ok(events.some(event => event.checkpointReset), 'a real corner cut is still caught');
});

test('the Titan gets the same corridor', () => {
  const {s} = crossing({car: 'titan_monster', lateral: -60});
  assert.equal(s.nextLapGate, 2);
});

test('ordinary cars keep the road-and-shoulder checkpoint rule', () => {
  const {s, events} = crossing({car: 'falcone_f42', lateral: -25});
  assert.equal(s.nextLapGate, 1);
  assert.ok(events.some(event => event.checkpointReset));
});

test('a boulder too big to climb says so, instead of CLIMB LIMIT', () => {
  const duel = new Duel({seed: 1989});
  duel.startCampaign({mode: 'duel', startStage: 0, car: 'dusthawk_rally', seed: 1989, difficulty: 'casual'});
  Object.assign(duel.state, {status: 'racing', countdown: 0, speedMph: 30});
  duel._startTumble('oversized_rock');
  assert.equal(duel.state.callout, 'ROCK TOO BIG  /  BACKING OFF');
  const climb = new Duel({seed: 1989});
  climb.startCampaign({mode: 'duel', startStage: 0, car: 'dusthawk_rally', seed: 1989, difficulty: 'casual'});
  Object.assign(climb.state, {status: 'racing', countdown: 0, speedMph: 30});
  climb._startTumble('climb_limit');
  assert.equal(climb.state.callout, 'CLIMB LIMIT  /  ROLLING BACK');
});

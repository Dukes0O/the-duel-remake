import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';

function makeRace(wasteland2) {
  const duel = new Duel({seed: 1989, car: 'titan_monster', featureFlags: {wasteland2}});
  duel.startCampaign({mode: 'wasteland', car: 'titan_monster', opponentCount: 3});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.s = state.prevS = 500;
  state.lateral = state.prevLateral = 0;
  state.invulnerableSec = 0;
  state.combat.shield = 0;
  return {duel, state};
}

test('repeated tips against one steep face cost one armor incident', () => {
  const {duel, state} = makeRace(true);
  const full = state.armor;
  state._climbGain = 5;
  state.speedMph = 55;
  duel._startTumble('climb_limit');
  assert.equal(state.armor, full - 20);
  assert.equal(state.speedMph, 0);
  assert.equal(state._climbGain, 0);
  for (let frame = 0; frame < 120; frame++) {
    state.speedMph = 55;
    duel._startTumble('climb_limit');
  }
  assert.equal(state.armor, full - 20);
  assert.equal(state.stageCrashes, 0);
  state.stageTimeSec += 1;
  state.speedMph = 55;
  duel._startTumble('climb_limit');
  assert.equal(state.armor, full - 40,
    'a new impact at the same point after clearing the contact costs armor');
  state.s += 12;
  state.speedMph = 55;
  duel._startTumble('climb_limit');
  assert.equal(state.armor, full - 60);
});

test('flag-off terrain tips still enter the existing tumble path', () => {
  const {duel, state} = makeRace(false);
  state.speedMph = 55;
  duel._startTumble('climb_limit');
  assert.ok(state.tumble);
  assert.equal(state.stageCrashes, 1);
  assert.equal(state.armor, undefined);
});

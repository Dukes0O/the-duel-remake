import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {stepCombat} from '../src/combat.js';

function field(wasteland2) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode: 'wasteland', startStage: 0,
    cpuDifficulty: 'hard', opponentCount: 3});
  const state = duel.state;
  state.status = 'racing';
  state.s = state.prevS = 400;
  state.lateral = state.prevLateral = 0;
  state.speedMph = 0;
  state.traffic = [];
  state.combat.pickupTimer = Infinity;
  state.combat.aiTimer = 0;
  state.opponents.forEach((actor, index) => {
    actor.s = actor.prevS = 300 + index * 5;
    actor.lateral = actor.prevLateral = 0;
    actor.speedMph = 0;
    actor.impactTimer = 0;
  });
  return {duel, state};
}

test('flagged CPU cars take separate, repeatable attack turns', () => {
  const {duel, state} = field(true);
  const shots = [];
  for (let turn = 0; turn < 6; turn++) {
    state.combat.aiTimer = 0;
    state.combat.projectiles = [];
    stepCombat(duel, .01);
    const fired = state.combat.projectiles.filter(projectile => projectile.enemy);
    assert.equal(fired.length, 1, 'only one opponent fires on a decision');
    shots.push(fired[0].sourceIndex ?? 0);
    assert.equal(state.combat.aiTimer, 5 / 3);
  }
  assert.deepEqual(shots, [0, 1, 2, 0, 1, 2]);
});

test('a finished opponent loses its turn without stopping later cars', () => {
  const {duel, state} = field(true);
  state.opponents[0].finished = true;
  stepCombat(duel, .01);
  const shot = state.combat.projectiles.find(projectile => projectile.enemy);
  assert.equal(shot?.sourceIndex, 1);
  assert.equal(state.combat.aiTurn, 2);
  assert.equal(state.combat.aiTimer, 5 / 2,
    'the two remaining cars share the original total attack rate');
});

test('flag-off three-car attacks keep their former shared timer and volley', () => {
  const {duel, state} = field(false);
  stepCombat(duel, .01);
  assert.equal(state.combat.projectiles.filter(projectile => projectile.enemy).length, 3);
  assert.equal(state.combat.aiTimer, 5);
  assert.equal(state.combat.aiTurn, undefined);
});

test('an infinite scripted timer still suppresses the flagged CPU', () => {
  const {duel, state} = field(true);
  state.combat.aiTimer = Infinity;
  stepCombat(duel, .01);
  assert.equal(state.combat.projectiles.length, 0);
});

test('a flagged Hard rival lines up a rear ram while the old rival yields', () => {
  const sample = wasteland2 => {
    const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
    duel.startCampaign({mode: 'wasteland', startStage: 0,
      cpuDifficulty: 'hard'});
    const state = duel.state;
    const rival = state.rival;
    state.status = 'racing';
    state.s = state.prevS = 500;
    state.lateral = state.prevLateral = 1;
    state.speedMph = 80;
    state.traffic = [];
    rival.s = rival.prevS = 480;
    rival.lateral = rival.prevLateral = 0;
    rival.speedMph = 80;
    rival.impactTimer = 0;
    duel._rival(.1);
    return rival;
  };
  const old = sample(false);
  const modern = sample(true);
  assert.equal(old.yieldingToPlayer, true);
  assert.ok(old.lateral < 0, 'old rival steers clear');
  assert.equal(modern.yieldingToPlayer, false);
  assert.ok(modern.lateral > 0, 'flagged rival steers toward the player');
});

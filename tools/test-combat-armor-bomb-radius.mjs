import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {stepCombat} from '../src/combat.js';

test('an upgraded bomb waits to arm across its full blast radius', () => {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', opponentCount: 3});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  state.s = state.prevS = 500;
  state.lateral = state.prevLateral = 0;
  state.invulnerableSec = 0;
  state.combat.shield = 0;
  state.combat.aiTimer = Infinity;
  state.combat.pickupTimer = Infinity;
  state.opponents.forEach((actor, index) => {
    actor.s = actor.prevS = 100 + index * 80;
  });
  const at = duel.course.groundAt(state.s, state.lateral);
  state.combat.projectiles.push({kind: 'bomb', enemy: false, level: 3,
    x: at.x + 24, y: at.y + .2, z: at.z,
    vx: 0, vy: 0, vz: 0, age: 0});
  const original = state.armor;
  stepCombat(duel, .34);
  assert.equal(state.combat.projectiles.length, 1);
  assert.equal(state.armor, original);
  stepCombat(duel, .02);
  assert.equal(state.combat.projectiles.length, 0);
  assert.ok(state.armor < original);
});

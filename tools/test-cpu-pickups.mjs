import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { stepCombat } from '../src/combat.js';

function race(cpuDifficulty) {
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ mode: 'wasteland', cpuDifficulty, seed: 1989 });
  const state = duel.state;
  state.status = 'racing';
  state.combat.pickupTimer = Infinity;
  state.combat.aiTimer = 100;
  state.s = state.prevS = 100;
  state.lateral = state.prevLateral = 0;
  state.rival.s = state.rival.prevS = 150;
  state.rival.lateral = state.rival.prevLateral = -6;
  state.traffic = [];
  return duel;
}

function crossRival(state, pickup, lateral) {
  state.rival.prevS = pickup.s - 6;
  state.rival.s = pickup.s + 6;
  state.rival.prevLateral = state.rival.lateral = lateral;
}

for (const difficulty of ['medium', 'hard']) {
  const duel = race(difficulty), state = duel.state, combat = state.combat;
  combat.pickups.push({ s: 200, weapon: 'star', age: 0 });
  crossRival(state, combat.pickups[0], 6);
  stepCombat(duel, .05);
  assert.equal(combat.pickups.length, 1, `${difficulty} cannot collect from another lane`);
  crossRival(state, combat.pickups[0], 0);
  stepCombat(duel, .05);
  assert.equal(combat.pickups.length, 0, `${difficulty} collects along its swept path`);
  assert.ok(combat.rivalShield > 4.9, `${difficulty} uses the collected shield`);

  combat.pickups.push({ s: 260, weapon: 'bomb', age: 0 });
  crossRival(state, combat.pickups[0], 0);
  stepCombat(duel, .05);
  assert.equal(combat.cpuPickupCharges.bomb, 1, 'bomb waits until the player is close');
  assert.equal(combat.projectiles.length, 0, 'a distant pickup does not invent a hit');
  state.s = state.prevS = state.rival.s - 45;
  combat.aiTimer = .01;
  stepCombat(duel, .05);
  assert.equal(combat.cpuPickupCharges.bomb, 0, 'a mid-range target spends the collected bomb');
  assert.ok(combat.projectiles.some(projectile => projectile.enemy && projectile.kind === 'bomb'),
    'the pickup selects a physical bomb instead of the usual mid-range crossbow');
  assert.equal(combat.aiTimer, difficulty === 'medium' ? 7 : 5, 'pickup use keeps the scheduled attack interval');

  combat.projectiles = [];
  combat.pickups.push({ s: 320, weapon: 'crossbow', age: 0 });
  crossRival(state, combat.pickups[0], 0);
  stepCombat(duel, .05);
  assert.equal(combat.cpuPickupCharges.crossbow, 1, 'the rival holds a collected crossbow charge');
  state.s = state.prevS = state.rival.s - 10;
  combat.aiTimer = .01;
  stepCombat(duel, .05);
  assert.equal(combat.cpuPickupCharges.crossbow, 1, 'a close-range bomb attack does not waste crossbow ammo');
  state.s = state.prevS = state.rival.s - 50;
  combat.aiTimer = .01;
  stepCombat(duel, .05);
  assert.equal(combat.cpuPickupCharges.crossbow, 0, 'a scheduled ranged attack spends crossbow ammo');
  assert.ok(combat.projectiles.some(projectile => projectile.enemy && projectile.kind === 'crossbow'),
    'the collected crossbow fires a physical projectile');

  combat.pickups.push({ s: 380, weapon: 'ufo', age: 0 });
  crossRival(state, combat.pickups[0], 0);
  stepCombat(duel, .05);
  assert.equal(combat.pickups.length, 1, 'unsupported CPU UFO pickup stays visible for the player');
}

const easy = race('easy'), state = easy.state, combat = state.combat;
combat.pickups.push({ s: 200, weapon: 'crossbow', age: 0 });
crossRival(state, combat.pickups[0], 0);
stepCombat(easy, .05);
assert.equal(combat.pickups.length, 1, 'Easy never collects a pickup it crosses');
assert.equal(combat.cpuPickupCharges.crossbow, 0, 'Easy receives no bonus weapon');

console.log('CPU pickups: Easy ignores; Medium/Hard require swept contact, use real shields and scheduled projectiles, and leave unsupported UFOs.');

import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {DRIVE} from '../src/config.js';
import {stepCombat, ufoDestination} from '../src/combat.js';

function field() {
  const duel = new Duel({seed: 1989});
  duel.startCampaign({mode: 'wasteland', startStage: 0, cpuDifficulty: 'hard', opponentCount: 3});
  const state = duel.state;
  assert.equal(state.opponents.length, 3, 'fixture needs the RFX-03 three-car field');
  assert.equal(state.rival, state.opponents[0], 'first opponent retains the rival alias');
  state.status = 'racing';
  state.s = state.prevS = 500;
  state.lateral = state.prevLateral = 0;
  state.invulnerableSec = 0;
  state.traffic = [];
  state.police.pursuit = null;
  state.combat.aiTimer = Infinity;
  state.combat.pickupTimer = Infinity;
  for (const opponent of state.opponents) {
    opponent.finished = false;
    opponent.crushed = false;
    opponent.impactTimer = 0;
    opponent.bombImpactCooldown = 0;
  }
  return {duel, state, combat: state.combat};
}

function place(actor, s, lateral = 0) {
  actor.s = actor.prevS = s;
  actor.lateral = actor.prevLateral = lateral;
  actor.speedMph = 80;
}

function bombAt(duel, actor) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  duel.state.combat.projectiles.push({kind: 'bomb', enemy: false, level: 0,
    x: at.x, y: at.y + 3, z: at.z, vx: 0, vy: 0, vz: 0, age: 1.5});
}

test('UFO landing checks the whole opponent field', () => {
  const {duel, state} = field();
  state.s = state.prevS = 1100;
  state.nextLapGate = 1;
  const lanes = [-DRIVE.laneOffset, 0, DRIVE.laneOffset];
  state.opponents.forEach((opponent, index) => place(opponent, 1112, lanes[index]));
  const destination = ufoDestination(duel);
  assert.equal(destination.kind, 'blocked', 'all landing lanes are occupied by opponents');
});

test('a player bomb damages a later opponent and counts the hit', () => {
  const {duel, state, combat} = field();
  place(state.opponents[0], 600);
  place(state.opponents[1], 100);
  place(state.opponents[2], 180);
  bombAt(duel, state.opponents[1]);
  stepCombat(duel, .01);
  assert.ok(state.opponents[1].speedMph < 80, 'blast shoves the second opponent');
  assert.ok(Object.values(state.opponents[1].damageZones).some(value => value > 0),
    'blast dents the second opponent');
  assert.equal(combat.hits, 1, 'HUD hit count includes any opponent');
  assert.equal(state.opponents[0].speedMph, 80, 'distant first rival is untouched');
});

test('a player bolt can strike an opponent beyond the first', () => {
  const {duel, state, combat} = field();
  place(state.opponents[0], 600);
  place(state.opponents[1], 120);
  place(state.opponents[2], 200);
  const target = state.opponents[1];
  const at = duel.course.groundAt(target.s, target.lateral);
  combat.projectiles.push({kind: 'crossbow', enemy: false, level: 0,
    x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
  stepCombat(duel, .01);
  assert.ok(target.speedMph < 80, 'swept bolt shoves the second opponent');
  assert.equal(combat.hits, 1, 'bolt hit counts against the full field');
  assert.equal(state.opponents[0].speedMph, 80, 'distant first rival is untouched');
});

test('a live later opponent can fight after the first rival finishes', () => {
  const {duel, state, combat} = field();
  state.s = state.prevS = 100;
  place(state.opponents[0], 130);
  state.opponents[0].finished = true;
  place(state.opponents[1], 120);
  place(state.opponents[2], 160);
  combat.aiTimer = 0;
  stepCombat(duel, .01);
  assert.ok(combat.projectiles.some(projectile => projectile.enemy),
    'combat AI does not stop when the first opponent finishes');
});

test('later opponents can collect a road weapon', () => {
  const {duel, state, combat} = field();
  state.s = state.prevS = 180;
  place(state.opponents[0], 600);
  place(state.opponents[1], 202);
  state.opponents[1].prevS = 198;
  place(state.opponents[2], 650);
  combat.pickups.push({s: 200, weapon: 'bomb', age: 0});
  const collected = [];
  duel.onChange((_, event) => { if (event.powerupCollected) collected.push(event); });
  stepCombat(duel, .01);
  assert.equal(combat.pickups.length, 0, 'second opponent takes the pickup it crossed');
  assert.equal(collected.length, 1, 'pickup raises one collection event');
  assert.equal(collected[0].powerupCollected, 'bomb');
  assert.notEqual(collected[0].collector, 'player');
});

test('bomb impact cooldown ticks on every opponent', () => {
  const {duel, state} = field();
  state.opponents[1].bombImpactCooldown = .3;
  stepCombat(duel, .31);
  assert.equal(state.opponents[1].bombImpactCooldown, 0,
    'a later opponent can be struck by a later bomb ring');
});

test('the first rival shield does not protect another opponent', () => {
  const {duel, state, combat} = field();
  place(state.opponents[0], 600);
  place(state.opponents[1], 100);
  place(state.opponents[2], 180);
  combat.rivalShield = 2;
  bombAt(duel, state.opponents[1]);
  stepCombat(duel, .01);
  assert.ok(state.opponents[1].speedMph < 80,
    'first rival shield cannot make the rest of the field invulnerable');
});

test('the first rival keeps its existing shield behavior', () => {
  const {duel, state, combat} = field();
  place(state.opponents[0], 100);
  place(state.opponents[1], 180);
  place(state.opponents[2], 220);
  combat.rivalShield = 2;
  bombAt(duel, state.rival);
  stepCombat(duel, .01);
  assert.equal(state.rival.speedMph, 80);
  assert.ok(Object.values(state.rival.damageZones).every(value => value === 0));
});

import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {stepCombat} from '../src/combat.js';

const duel = new Duel({seed: 1989});
duel.startCampaign({mode: 'wasteland', opponentCount: 3});
const state = duel.state;
state.status = 'racing';
state.traffic = [];
state.combat.aiTimer = Infinity;
state.combat.pickupTimer = Infinity;
state.s = state.prevS = 500;

const [far, near, third] = state.opponents;
for (const [actor, distance] of [[far, 120], [near, 110], [third, 240]]) {
  actor.s = actor.prevS = distance;
  actor.lateral = actor.prevLateral = 0;
  actor.speedMph = 80;
  actor.bombImpactCooldown = 0;
}
const start = duel.course.groundAt(100, 0);
const finish = duel.course.groundAt(far.s, 0);
const nearPoint = duel.course.groundAt(near.s, 0);
const dt = .2;
state.combat.projectiles.push({
  kind: 'crossbow', enemy: false, level: 0,
  x: start.x, y: nearPoint.y + 3, z: start.z,
  vx: (finish.x - start.x) / dt, vy: 0, vz: (finish.z - start.z) / dt,
  age: 0,
});
stepCombat(duel, dt);
assert.ok(near.speedMph < 80, 'the nearer second CPU car receives the swept bolt');
assert.equal(far.speedMph, 80, 'the farther first rival cannot intercept it by list order');
assert.equal(state.combat.hits, 1, 'the first physical contact counts once');

console.log('Combat projectile order: earliest physical sweep wins over opponent list order.');

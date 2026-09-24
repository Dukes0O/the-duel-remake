import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {stepCombat} from '../src/combat.js';

function fixture(wasteland2) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode: 'wasteland', startStage: 0});
  const state = duel.state;
  state.status = 'racing';
  state.s = 500;
  state.rival.s = 550;
  state.combat.rivalShield = 5;
  const traffic = {s: 100, lateral: 0, airHeight: 0, speedMph: 80,
    alive: true, crushed: false, finished: false, pushVelocity: 0,
    headingError: 0, damageCooldown: 0,
    damageZones: {front: 0, rear: 0, left: 0, right: 0}};
  state.traffic = [traffic];
  return {duel, state, traffic};
}

function bombTraffic({duel, state, traffic}) {
  const at = duel.course.groundAt(traffic.s, traffic.lateral);
  const events = [];
  duel.onChange((_, event) => { if (event.combatHit) events.push(event); });
  state.combat.projectiles.push({kind: 'bomb', enemy: false, level: 0,
    x: at.x, y: at.y + 3, z: at.z, vx: 0, vy: 0, vz: 0, age: 1.5});
  stepCombat(duel, .01);
  return events;
}

test('Wasteland 2 rival shield does not protect traffic from blast or impact', () => {
  const setup = fixture(true);
  const hits = bombTraffic(setup);
  assert.ok(setup.traffic.speedMph < 80);
  assert.equal(hits.filter(event => event.victim === 'traffic').length, 1);
  setup.traffic.damageZones.front = 0;
  setup.traffic.damageCooldown = 0;
  setup.duel._dentVehicle(setup.traffic, 'front', 40);
  assert.ok(setup.traffic.damageZones.front > 0);

  setup.state.rival.damageZones.front = 0;
  setup.state.rival.damageCooldown = 0;
  setup.duel._dentVehicle(setup.state.rival, 'front', 40);
  assert.equal(setup.state.rival.damageZones.front, 0);
});

test('flag-off Wasteland keeps its existing one-rival traffic shield rule', () => {
  const setup = fixture(false);
  assert.equal(bombTraffic(setup).filter(event => event.victim === 'traffic').length, 0);
  assert.equal(setup.traffic.speedMph, 80);
  setup.duel._dentVehicle(setup.traffic, 'front', 40);
  assert.equal(setup.traffic.damageZones.front, 0);
});

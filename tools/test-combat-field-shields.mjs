import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {createCombatScene} from '../src/combat-scene.js';
import {stepCombat} from '../src/combat.js';

const zones = () => ({front: 0, rear: 0, left: 0, right: 0});
const damaged = actor => Object.values(actor.damageZones).some(value => value > 0);

const duel = new Duel({seed: 1989});
duel.startCampaign({mode: 'wasteland', opponentCount: 3});
const state = duel.state;
state.status = 'racing';
const [first, second, third] = state.opponents;

const physical = new Duel({seed: 1990});
physical.startCampaign({mode: 'wasteland', opponentCount: 3});
physical.state.status = 'racing';
physical.state.combat.rivalShield = 2;
const [shieldedCar, struckCar, clearCar] = physical.state.opponents;
Object.assign(shieldedCar, {s: 100, prevS: 98, lateral: 0, prevLateral: 0,
  speedMph: 80, damageZones: zones(), damageCooldown: 0});
Object.assign(struckCar, {s: 102, prevS: 102, lateral: 0, prevLateral: 0,
  speedMph: 20, damageZones: zones(), damageCooldown: 0});
clearCar.s = clearCar.prevS = 400;
assert.equal(physical._vehicleContact(shieldedCar, struckCar, 'rival'), true,
  'two CPU cars make a real swept vehicle contact');
assert.equal(damaged(shieldedCar), false,
  'first-rival star protects the first car in physical contact');
assert.ok(damaged(struckCar),
  'first-rival star does not transfer to the second car in physical contact');

state.combat.rivalShield = 2;
second.damageZones = zones();
duel._dentVehicle(second, 'front', 80);
assert.ok(damaged(second), 'first-rival star cannot prevent physical dents on CPU 2');
second.damageZones = zones();
second.damageCooldown = 0;
second.combatShield = 2;
duel._dentVehicle(second, 'front', 80);
assert.equal(damaged(second), false, 'CPU 2 star prevents its own physical dents');
duel._crushVehicle(second, 'rival', 80);
assert.notEqual(second.crushed, true, 'CPU 2 star prevents a physical crush');
second.combatShield = 0;
duel._crushVehicle(second, 'rival', 80);
assert.equal(second.crushed, true, 'CPU 2 can be crushed once its own star ends');

const legacy = new Duel({seed: 1989});
legacy.startCampaign({mode: 'wasteland'});
legacy.state.combat.rivalShield = 2;
const traffic = legacy.state.traffic[0];
assert.ok(traffic, 'legacy traffic fixture exists');
traffic.damageZones = zones();
legacy._dentVehicle(traffic, 'front', 80);
assert.equal(damaged(traffic), false,
  'one-opponent rival shield keeps the original traffic-contact behavior');
legacy._crushVehicle(traffic, 'traffic', 80);
assert.notEqual(traffic.crushed, true,
  'one-opponent rival shield keeps the original traffic-crush behavior');
legacy.state.status = 'racing';
legacy.state.s = legacy.state.prevS = 500;
legacy.state.rival.s = legacy.state.rival.prevS = 300;
traffic.alive = true;
traffic.s = traffic.prevS = 100;
traffic.lateral = traffic.prevLateral = 0;
traffic.speedMph = 80;
legacy.state.combat.aiTimer = Infinity;
legacy.state.combat.pickupTimer = Infinity;
const blast = legacy.course.groundAt(traffic.s, traffic.lateral);
legacy.state.combat.projectiles.push({kind: 'bomb', enemy: false, level: 0,
  x: blast.x, y: blast.y + 3, z: blast.z, vx: 0, vy: 0, vz: 0, age: 1.5});
stepCombat(legacy, .01);
assert.equal(traffic.speedMph, 80,
  'one-opponent rival shield retains its original traffic bomb protection');

function vehicle() {
  const mesh = new THREE.Group();
  mesh.userData.vehicleKey = 'falcone_f42';
  mesh.userData.size = {width: 2, length: 4, height: 1.3};
  return mesh;
}
const scene = createCombatScene();
const [playerMesh, firstMesh, secondMesh, thirdMesh] = Array.from({length: 4}, vehicle);
const visuals = {player: playerMesh, rival: firstMesh,
  extraOpponents: [{mesh: secondMesh}, {mesh: thirdMesh}]};
second.crushed = false;
second.combatShield = 0;
scene.update(duel, visuals);
assert.equal(firstMesh.getObjectByName('combat-shield-1')?.visible, true,
  'first rival keeps its visible shield');
assert.equal(secondMesh.getObjectByName('combat-shield-2')?.visible, false,
  'CPU 2 has no shell while unshielded');
state.combat.rivalShield = 0;
second.combatShield = 2;
scene.update(duel, visuals);
assert.equal(firstMesh.getObjectByName('combat-shield-1')?.visible, false,
  'first rival shell clears independently');
assert.equal(secondMesh.getObjectByName('combat-shield-2')?.visible, true,
  'CPU 2 shell follows its own shield');
assert.equal(thirdMesh.getObjectByName('combat-shield-3')?.visible, false,
  'CPU 3 remains unshielded');
scene.detachVehicle(secondMesh);
assert.equal(secondMesh.getObjectByName('combat-shield-2'), undefined,
  'CPU 2 shell detaches with the retired vehicle');
scene.update(duel, {...visuals, extraOpponents: [null, {mesh: thirdMesh}]});
assert.equal(scene.group.getObjectByName('combat-shield-2')?.visible, false,
  'the unused second CPU slot remains hidden');
scene.dispose();

console.log('Combat field shields: independent physical protection, legacy traffic parity, four-car visual binding and retirement passed.');

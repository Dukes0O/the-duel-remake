import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVehicleAttachmentRegistry} from '../src/vehicle-attachments.js';
import {createArmorKitMeshes} from '../src/armor-kit-meshes.js';
import {createCombatEffects} from '../src/combat-effects.js';

function vehicle(key = 'falcone_f42') {
  const mesh = new THREE.Group();
  mesh.userData.vehicleKey = key;
  mesh.userData.size = {width: 2.6, length: 4.8, height: 1.55};
  return mesh;
}

const course = {groundAt(s, lateral) {
  return {x: s, y: 0, z: lateral};
}};

function fixture() {
  const actors = Array.from({length: 4}, () => ({
    s: 100, lateral: 0, armor: 100, maxArmor: 100, crushed: false,
  }));
  const vehicles = Array.from({length: 4}, () => vehicle());
  const state = {...actors[0], mode: 'wasteland', status: 'racing',
    stageTimeSec: 1, opponents: actors.slice(1),
    combat: {bursts: [], projectiles: [], pickups: []}};
  const duel = {state, course, featureFlags: {enabled: name => name === 'wasteland2'}};
  const meshes = {player: vehicles[0], rival: vehicles[1],
    extraOpponents: vehicles.slice(2).map(mesh => ({mesh}))};
  return {actors, vehicles, duel, meshes};
}

test('four socket-mounted kits lose plates and show tiers without changing armor', () => {
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry);
  const {actors, vehicles, duel, meshes} = fixture();
  try {
    duel.state.combatArmorKit = 'scrapper';
    kits.update(duel, meshes, true);
    assert.equal(registry.size, 20);
    vehicles.forEach((car, index) => {
      assert.ok(car.getObjectByName(`armor-kit-${index}-bull-bar`));
      assert.ok(car.getObjectByName(`armor-kit-${index}-plate-0-0`)?.visible);
    });
    assert.equal(duel.state.armor, 100);
    actors[0].armor = 70;
    duel.state.armor = 70;
    kits.update(duel, meshes, true);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-plate-0-0').visible, false);
    assert.equal(kits.group.getObjectByName('armor-kit-0-loose-0').visible, true);
    assert.equal(duel.state.armor, 70);
    actors[1].combatArmorKit = 'raider';
    actors[2].combatArmorKit = 'warlord';
    kits.update(duel, meshes, true);
    assert.ok(vehicles[1].getObjectByName('armor-kit-1-cage-0').visible);
    assert.ok(vehicles[2].getObjectByName('armor-kit-2-crown-0').visible);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-crown-0').visible, false);
    duel.state.stageTimeSec = 3;
    kits.update(duel, meshes, true);
    assert.equal(kits.group.getObjectByName('armor-kit-0-loose-0').visible, false);
  } finally {
    kits.dispose();
  }
  assert.equal(registry.size, 0);
});

test('stock player has no kit plates while CPU cars keep their authored Scrapper look', () => {
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry);
  const {vehicles, duel, meshes} = fixture();
  try {
    kits.update(duel, meshes, true);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-front').visible, false);
    assert.equal(vehicles[1].getObjectByName('armor-kit-1-front').visible, true);
    duel.state.combatArmorKit = 'raider';
    kits.update(duel, meshes, true);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-front').visible, true);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-cage-0').visible, true);
  } finally {
    kits.dispose();
  }
});

test('flag-off and ordinary races leave kits unmounted', () => {
  const registry = createVehicleAttachmentRegistry();
  const kits = createArmorKitMeshes(registry);
  const {vehicles, duel, meshes} = fixture();
  try {
    duel.featureFlags.enabled = () => false;
    kits.update(duel, meshes, false);
    assert.equal(registry.size, 0);
    assert.equal(vehicles[0].getObjectByName('armor-kit-0-bull-bar'), undefined);
    duel.featureFlags.enabled = () => true;
    duel.state.mode = 'duel';
    kits.update(duel, meshes, false);
    assert.equal(registry.size, 0);
  } finally {
    kits.dispose();
  }
});

test('shared damage sheets show smoke below 30% and fire below 10% on any car', () => {
  const effects = createCombatEffects({loadTexture: () => new THREE.Texture()});
  const {duel} = fixture();
  try {
    const smoke = effects.group.getObjectByName('combat-vfx-damage-3-smoke');
    const fire = effects.group.getObjectByName('combat-vfx-damage-3-fire');
    const firstGeometry = smoke.geometry;
    const actor = duel.state.opponents[2];
    actor.armor = 25;
    effects.update({state: duel.state, course, dt: 1 / 60});
    assert.equal(smoke.visible, true);
    assert.equal(fire.visible, false);
    actor.armor = 8;
    effects.update({state: duel.state, course, dt: 1 / 60});
    assert.equal(smoke.visible, true);
    assert.equal(fire.visible, true);
    actor.combatWrecking = true;
    effects.update({state: duel.state, course, dt: 0});
    assert.equal(smoke.visible, false);
    assert.equal(fire.visible, false);
    actor.combatWrecking = false;
    actor.armor = 60;
    effects.update({state: duel.state, course, dt: 0});
    assert.equal(smoke.visible, false);
    assert.equal(smoke.geometry, firstGeometry);
  } finally {
    effects.dispose();
  }
});

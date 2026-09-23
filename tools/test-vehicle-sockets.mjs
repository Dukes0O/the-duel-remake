import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CARS } from '../src/config.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createCombatScene } from '../src/combat-scene.js';
import { ensureVehicleSockets, VEHICLE_SOCKET_KEYS, vehicleSocketLayout } from '../src/vehicle-sockets.js';
import { models } from './audit-vehicle-grounding.mjs';

const expectedKeys = Object.keys(CARS).sort();
assert.deepEqual([...VEHICLE_SOCKET_KEYS].sort(), expectedKeys, 'all nine cars have a socket adjustment');
let checks = 1;

function vehicleFor(key) {
  const vehicle = models.find(model => model.key === key)?.vehicle;
  assert.ok(vehicle, `${key}: actual runtime model is available`);
  return vehicle;
}

const duel = {
  state: {
    status: 'racing',
    crushed: false,
    rival: { crushed: false },
    combat: { shield: 4, rivalShield: 4, pickups: [], projectiles: [], bursts: [] },
    stageTimeSec: 2,
  },
};
const scene = createCombatScene();
const poses = [
  { name: 'slide', position: [12, 1.2, -8], rotation: [0.07, 0.63, -0.13] },
  { name: 'crash spin', position: [-4, 0.9, 21], rotation: [-0.18, 2.4, 0.31] },
  { name: 'tumble', position: [35, 2.7, 19], rotation: [0.64, -1.1, 2.12] },
  { name: 'jump', position: [-18, 7.6, -11], rotation: [-0.25, 1.4, 0.09] },
];

for (const key of expectedKeys) {
  const vehicle = vehicleFor(key);
  const layout = vehicleSocketLayout(key, vehicle.userData.size);
  const sockets = ensureVehicleSockets(vehicle);
  assert.equal(ensureVehicleSockets(vehicle), sockets, `${key}: sockets reused`);
  checks++;
  for (const name of ['front', 'rear', 'roof', 'hood', 'left', 'right', 'door', 'shield']) {
    assert.deepEqual(sockets[name].position.toArray(), layout[name], `${key}: ${name} model-local position`);
    checks++;
  }
  for (const [role, index] of [['player', 0], ['rival', 1]]) {
    scene.update(duel, { [role]: vehicle });
    const mounts = [
      ['front', `combat-bumper-${index}`],
      ['roof', `combat-bow-${index}`],
      ['shield', `combat-shield-${index}`],
    ];
    for (const pose of poses) {
      vehicle.position.fromArray(pose.position);
      vehicle.rotation.set(...pose.rotation, 'YXZ');
      vehicle.updateMatrixWorld(true);
      scene.update(duel, { [role]: vehicle });
      for (const [socketName, meshName] of mounts) {
        const mesh = vehicle.getObjectByName(meshName);
        assert.ok(mesh?.visible, `${key} ${role} ${pose.name}: ${meshName} visible`);
        assert.equal(mesh.parent, sockets[socketName], `${key} ${role} ${pose.name}: parent socket`);
        const expected = new THREE.Vector3(...layout[socketName]).applyMatrix4(vehicle.matrixWorld);
        const actual = mesh.getWorldPosition(new THREE.Vector3());
        assert.ok(actual.distanceTo(expected) < 1e-9,
          `${key} ${role} ${pose.name}: ${meshName} stays on the model (${actual.distanceTo(expected)})`);
        checks += 3;
      }
    }
    scene.detachVehicle(vehicle);
    for (const name of ['bumper', 'bow', 'shield']) {
      assert.equal(vehicle.getObjectByName(`combat-${name}-${index}`), undefined,
        `${key} ${role}: retiring the model removes its ${name} rig`);
      checks++;
    }
  }
}

const replacement = createClassicVehicle({
  key: 'falcone_f42',
  color: CARS.falcone_f42.color,
  accent: CARS.falcone_f42.accent,
});
replacement.userData.vehicleKey = 'falcone_f42';
scene.update(duel, { player: replacement });
assert.ok(replacement.getObjectByName('combat-bumper-0'), 'rig can attach to a replacement model');
checks++;
const rivalReplacement = vehicleFor('titan_monster');
scene.update(duel, { player: replacement, rival: rivalReplacement });
for (const name of ['bumper', 'bow', 'shield']) {
  assert.ok(replacement.getObjectByName(`combat-${name}-0`), `player owns its ${name}`);
  assert.equal(replacement.getObjectByName(`combat-${name}-1`), undefined, `player does not own rival ${name}`);
  assert.ok(rivalReplacement.getObjectByName(`combat-${name}-1`), `rival owns its ${name}`);
  assert.equal(rivalReplacement.getObjectByName(`combat-${name}-0`), undefined, `rival does not own player ${name}`);
  checks += 4;
}
assert.ok(replacement.getObjectByName('combat-shield-0').visible, 'player shield visible while both roles are active');
assert.ok(rivalReplacement.getObjectByName('combat-shield-1').visible, 'rival shield visible while both roles are active');
checks += 2;
scene.detachVehicle(replacement);
for (const name of ['bumper', 'bow', 'shield']) {
  assert.equal(replacement.getObjectByName(`combat-${name}-0`), undefined, `retired player releases ${name}`);
  assert.ok(rivalReplacement.getObjectByName(`combat-${name}-1`), `rival keeps ${name} after player retirement`);
  checks += 2;
}
duel.state.status = 'menu';
scene.update(duel, { player: replacement });
assert.ok(!replacement.getObjectByName('combat-bumper-0').visible, 'rig hides in the menu');
checks++;
duel.state.status = 'racing';
duel.state.combat.shield = 0;
scene.update(duel, { player: replacement });
assert.ok(!replacement.getObjectByName('combat-shield-0').visible, 'shield follows combat timer');
checks++;
duel.state.combat.shield = 4;
scene.update(duel, { player: replacement, rival: rivalReplacement });
scene.dispose();
for (const name of ['bumper', 'bow', 'shield']) {
  assert.equal(replacement.getObjectByName(`combat-${name}-0`), undefined, `scene disposal releases player ${name}`);
  assert.equal(rivalReplacement.getObjectByName(`combat-${name}-1`), undefined, `scene disposal releases rival ${name}`);
  checks += 2;
}
console.log(`Vehicle sockets: ${checks} per-car, role, maneuver, visibility and replacement checks passed.`);

import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CARS } from '../src/config.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createCombatScene } from '../src/combat-scene.js';
import { ensureVehicleSockets, VEHICLE_SOCKET_KEYS, vehicleSocketLayout } from '../src/vehicle-sockets.js';
import { createVehicleAttachmentRegistry } from '../src/vehicle-attachments.js';
import { createRoofBow, seatRoofBow, ROOF_BOW } from '../src/combat-roof-bow.js';
import { detachRetiredVehicleVisuals } from '../src/render3d.js';
import { models } from './audit-vehicle-grounding.mjs';

const expectedKeys = Object.keys(CARS).sort();
assert.deepEqual([...VEHICLE_SOCKET_KEYS].sort(), expectedKeys, 'all ten cars have a socket adjustment');
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
const registry = createVehicleAttachmentRegistry();
const fallback = new THREE.Group();
const first = vehicleFor('falcone_f42'), second = vehicleFor('titan_monster');
const kit = new THREE.Group(), decal = new THREE.Group(), figure = new THREE.Group();
registry.attach({ owner: 'kit', vehicle: first, socket: 'front', object: kit, fallback });
registry.attach({ owner: 'decal', vehicle: first, socket: 'hood', object: decal, fallback });
registry.attach({ owner: 'figure', vehicle: second, socket: 'roof', object: figure, fallback });
assert.equal(registry.size, 3);
assert.equal(kit.parent, ensureVehicleSockets(first).front);
assert.equal(decal.parent, ensureVehicleSockets(first).hood);
assert.equal(figure.parent, ensureVehicleSockets(second).roof);
checks += 4;
assert.throws(() => registry.attach({ owner: 'duplicate-kit', vehicle: second, socket: 'rear', object: kit, fallback }),
  /already belongs to kit/, 'one object cannot have two registry owners');
assert.throws(() => registry.attach({ owner: 'decal', vehicle: second, socket: 'rear', object: kit, fallback }),
  /already belongs to kit/, 'a failed owner replacement preserves the previous decal');
assert.equal(registry.size, 3);
assert.equal(kit.parent, ensureVehicleSockets(first).front);
assert.equal(decal.parent, ensureVehicleSockets(first).hood);
checks += 5;
registry.attach({ owner: 'kit', vehicle: first, socket: 'front', object: kit, fallback });
assert.equal(registry.size, 3, 'repeated mount does not create another binding');
assert.throws(() => registry.attach({ owner: 'kit', vehicle: second, socket: 'missing', object: kit, fallback }), /Unknown vehicle attachment socket/);
assert.equal(kit.parent, ensureVehicleSockets(first).front, 'invalid replacement keeps the previous mount');
checks += 3;
registry.attach({ owner: 'kit', vehicle: second, socket: 'front', object: kit, fallback });
assert.equal(kit.parent, ensureVehicleSockets(second).front, 'an owner follows its new car');
assert.equal(first.getObjectById(kit.id), undefined, 'old car no longer owns the kit');
checks += 2;
assert.equal(registry.detachVehicle(first), 1, 'retiring a car detaches only its attachments');
assert.equal(decal.parent, fallback);
assert.equal(kit.parent, ensureVehicleSockets(second).front);
checks += 3;
registry.clear();
assert.equal(registry.size, 0);
assert.equal(kit.parent, fallback);
assert.equal(figure.parent, fallback);
checks += 3;
assert.equal(registry.applyPaint(first, { id: 'registry-probe', name: 'Registry probe', color: '#aa3311' }), true);
assert.equal(first.userData.paintAppearance.id, 'registry-probe');
assert.equal(registry.applyPaint(first, { id: 'factory' }), true);
assert.equal(first.userData.paintAppearance.id, 'factory');
checks += 4;
registry.attach({ owner: 'future-kit', vehicle: second, socket: 'rear', object: kit, fallback });
const sharedScene = createCombatScene(registry);
sharedScene.update(duel, { player: first });
sharedScene.dispose();
assert.equal(kit.parent, ensureVehicleSockets(second).rear,
  'disposing combat rigs does not detach a kit owned by another visual system');
assert.equal(registry.size, 1);
registry.clear();
checks += 2;
const retirementRegistry = createVehicleAttachmentRegistry();
const retirementScene = createCombatScene(retirementRegistry);
const retiredPlayer = vehicleFor('aurora_gt');
const activeRival = vehicleFor('banshee_muscle');
const retiredKit = new THREE.Group(), activeFigure = new THREE.Group();
const retirementFallback = new THREE.Group();
retirementScene.update(duel, { player: retiredPlayer, rival: activeRival });
retirementRegistry.attach({ owner: 'retired-kit', vehicle: retiredPlayer, socket: 'hood', object: retiredKit, fallback: retirementFallback });
retirementRegistry.attach({ owner: 'active-figure', vehicle: activeRival, socket: 'roof', object: activeFigure, fallback: retirementFallback });
assert.equal(retirementRegistry.size, 8, 'combat rigs and external attachments share one registry');
detachRetiredVehicleVisuals(retiredPlayer, retirementScene, retirementRegistry);
assert.equal(retiredKit.parent, retirementFallback, 'retiring a car releases its non-combat kit');
assert.equal(retiredPlayer.getObjectByName('combat-bumper-0'), undefined, 'retiring a car releases its combat rig');
assert.equal(activeFigure.parent, ensureVehicleSockets(activeRival).roof, 'rival figure remains mounted');
assert.ok(activeRival.getObjectByName('combat-bumper-1'), 'rival combat rig remains mounted');
assert.equal(retirementRegistry.size, 4, 'no retired-car binding remains');
checks += 6;
retirementScene.dispose();
retirementRegistry.clear();

// COMBAT-ROOF-BOW-LOOK: on every car the roof crossbow stands on the roof's own skin (each foot's pad, measured by a ray that
// ignores the bow), its point stays behind the windscreen's top edge, and it is sized to the car.
const down = new THREE.Vector3(0, -1, 0), probe = new THREE.Raycaster();
for (const key of expectedKeys) {
  const vehicle = vehicleFor(key), socket = ensureVehicleSockets(vehicle).roof, bow = createRoofBow(`roof-bow-check-${key}`);
  // The pose checks above leave each car tilted; measure it standing level so a box in the world's axes is one in the car's.
  vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0);
  socket.add(bow.group);
  const seat = seatRoofBow(bow, vehicle, socket);
  vehicle.updateMatrixWorld(true);
  const own = new Set();
  bow.group.traverse(node => own.add(node));
  const skin = [];
  vehicle.traverse(node => { if (node.isMesh && !own.has(node)) skin.push(node); });
  assert.ok(seat.found, `${key}: the bow finds the roof under its turntable`);
  seat.bars.forEach((z, bar) => [-1, 1].forEach((side, foot) => {
    const pad = bow.body.localToWorld(new THREE.Vector3(side * seat.rack[bar], ROOF_BOW.rackY - seat.legs[bar * 2 + foot] - .008, z));
    probe.set(pad.clone().addScaledVector(down, -1), down);
    const hit = probe.intersectObjects(skin, false)[0];
    assert.ok(hit && Math.abs(pad.y - hit.point.y) < .025,
      `${key}: rack foot ${bar * 2 + foot} stands on the roof (${hit ? (pad.y - hit.point.y).toFixed(3) : 'no skin'} m)`);
  }));
  const bounds = new THREE.Box3().setFromObject(bow.mesh), front = vehicle.worldToLocal(bounds.max.clone()).z;
  assert.ok(front <= socket.position.z + seat.front - ROOF_BOW.screenGap + 1e-6,
    `${key}: the bolt's point (${front.toFixed(2)}) stays behind the windscreen's top edge (${(socket.position.z + seat.front).toFixed(2)})`);
  const span = (bounds.max.x - bounds.min.x) / vehicle.userData.size.width;
  assert.ok(span > .5 && span < .75, `${key}: the prod spans ${span.toFixed(2)} of the car's width`);
  socket.remove(bow.group);
  bow.mesh.geometry.dispose(); bow.material.dispose();
  checks += 7;
}
console.log(`Vehicle sockets: ${checks} per-car, role, maneuver, visibility, replacement and roof-bow checks passed.`);

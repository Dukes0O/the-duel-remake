// The Bugatti Bolide (EARN-CAR-3): the settled numbers, the vehicle contract
// (driver, steering, wheels, lights, paint, damage, crush, exact reset), the
// size budget, and how it is wired into the game. Headless; no storage.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBolideVehicle, BOLIDE_VEHICLE_DIMENSIONS } from '../src/bolide-vehicle.js';
import { createEnzoVehicle } from '../src/enzo-vehicle.js';
import { createKoenigseggVehicle } from '../src/koenigsegg-vehicle.js';
import { createUnlockedVehicle } from '../src/unlock-vehicles.js';
import { createClassicVehicle } from '../src/classic-vehicles.js';
import { createVehicleAssets } from '../src/vehicle-assets.js';
import { vehicleSocketLayout, VEHICLE_SOCKET_KEYS } from '../src/vehicle-sockets.js';
import { CAR_VOICES } from '../src/sound-bank.js';
import { CARS } from '../src/config.js';
import { upgradedCar, CAR_PRICES, UPGRADE_TYPES } from '../src/progression.js';
import { medalRequirement, MEDAL_CARS } from '../src/medals.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

const MAX_TRIANGLES = 73600, MAX_DRAWS = 66; // the Jesko's size (docs/EARNED_CARS.md section 4.2)
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const near = (a, b, tolerance, label) => ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`);

// 1. The settled numbers (docs/board/cards/EARN-CAR-3.md, "Claude answers (15 October): numbers approved").
const spec = CARS.bugatti_bolide;
equal(spec.name, 'Bugatti Bolide', 'The real car\'s name');
// FIX-LAUNCH: accel 10.5 to 9.5 so the fastest car's 0 to 60 stays in 2.4 to 2.8 s (Claude approved, card FIX-LAUNCH).
equal([spec.topSpeed, spec.accel, spec.grip, spec.braking], [278, 9.5, 1.15, 1.45], 'Settled speed, acceleration, grip and braking');
equal(spec.gears, [67, 110, 154, 191, 225, 255, 278], 'Seven-speed gearbox');
equal([spec.offRoadGrip, spec.offRoadSpeed, spec.offRoadScrub], [0.58, 50, 0.64], 'A track car, poor off the road');
equal([spec.mass, spec.height, spec.kind, spec.gearbox], [1450, 1.05, 'hypercar', 'manual'], 'Mass, body height and kind');
equal(spec.collision, { halfWidth: 1.05, halfLength: 2.5 }, 'Collision footprint');
equal([spec.boostCapacity, spec.nitroAcceleration, spec.nitroSpeedBonus], [1.35, 1.35, 0.025], 'Boost figures');
equal(spec.unlockRequirement, { kind: 'medals', medals: 24, gold: 6 }, 'Earned at 24 medals, 6 of them gold');
equal(medalRequirement('bugatti_bolide'), { kind: 'medals', medals: 24, gold: 6 }, 'The medal code reads that rule');
ok(MEDAL_CARS.includes('bugatti_bolide'), 'It is a medal car');
equal(spec.factoryMaxed, true, 'Arrives fully tuned');
ok(!Object.hasOwn(CAR_PRICES, 'bugatti_bolide') && !Object.hasOwn(spec, 'price'), 'No price, no Buy button');
equal(Object.keys(CARS).at(-1), 'bugatti_bolide', 'Appended after the cars already there, last of the medal cars');
const full = Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, 3]));
const tuned = upgradedCar(spec, full), jesko = upgradedCar(CARS.koenigsegg_jesko, full);
near(tuned.topSpeed, 307.19, 0.01, 'Fully tuned top speed is about 307 mph');
ok(tuned.topSpeed > upgradedCar(CARS.viper_proto, full).topSpeed && tuned.topSpeed < jesko.topSpeed, 'Between a tuned Viper and the Jesko');
ok(spec.boostCapacity < CARS.koenigsegg_jesko.boostCapacity && spec.nitroAcceleration < CARS.koenigsegg_jesko.nitroAcceleration &&
  spec.nitroSpeedBonus <= CARS.koenigsegg_jesko.nitroSpeedBonus, 'Every boost figure at most the Jesko\'s');
ok(spec.accel <= 10.8 && spec.braking <= 1.5, 'Garage rating bars keep their scale (acceleration and braking at most the Jesko\'s)');
ok(spec.mass <= 1500, 'Light enough for Kestrel One (the lift itself is checked in test-heli-cable)');
ok(Object.hasOwn(CAR_VOICES, 'bugatti_bolide') && CAR_VOICES.bugatti_bolide.pitch > 0 && CAR_VOICES.bugatti_bolide.gain > 0, 'It has its own engine voice');
ok(VEHICLE_SOCKET_KEYS.includes('bugatti_bolide'), 'It has roof and front sockets');
const sockets = vehicleSocketLayout('bugatti_bolide', BOLIDE_VEHICLE_DIMENSIONS.bugatti_bolide);
ok(sockets.front[2] > BOLIDE_VEHICLE_DIMENSIONS.bugatti_bolide.length / 2 - .1, 'Front socket at the nose');

// 2. The contract.
const vehicle = createBolideVehicle(), d = vehicle.userData;
equal(createBolideVehicle({ key: 'ferrari_enzo' }), null, 'Unsupported keys do not substitute the new car');
equal(createBolideVehicle({ key: '__proto__' }), null, 'Prototype keys cannot select a car');
equal(vehicle.name, 'bugatti_bolide', 'Stable semantic mesh key');
equal(d.size, BOLIDE_VEHICLE_DIMENSIONS.bugatti_bolide, 'Metadata matches the physical model contract');
equal(d.designFeatures, ['horseshoe-intake', 'cockpit-bubble', 'roof-scoop', 'spine-fin', 'swan-neck-wing', 'x-lamps', 'carbon-lower-body', 'open-diffuser'], 'Distinct silhouette features');
equal(d.wheels.length, 4, 'Four animated wheels');
equal(d.wheelPivots.filter(p => p.userData.front).length, 2, 'Only the front axle steers');
ok(d.driver && d.steeringPivot && d.brakeLights.length && d.boostFlames.length === 4, 'Production driver, brake and boost hooks (four exhausts)');
const routed = createVehicleAssets().create('bugatti_bolide');
equal([routed.userData.vehicleKey, routed.userData.vehicleSource, routed.userData.designFeatures?.[0]], ['bugatti_bolide', 'earned', 'horseshoe-intake'], 'The vehicle router builds the Bolide from its own source');
equal(createVehicleAssets().status('bugatti_bolide'), 'ready', 'No asynchronous import needed');
disposeTree(routed);

// 3. Bounds and the size budget.
const bounds = new THREE.Box3(); let triangles = 0, draws = 0;
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh) return;
  const g = mesh.geometry;
  ok(g.attributes.position.array.every(Number.isFinite), `${mesh.name}: finite vertices`);
  ok(g.attributes.normal?.array.every(Number.isFinite), `${mesh.name}: finite normals`);
  bounds.union(new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(mesh.matrixWorld));
  triangles += (g.index?.count ?? g.attributes.position.count) / 3; draws++;
});
const size = bounds.getSize(new THREE.Vector3());
near(size.x, d.size.width, .025, 'Trim stays within 2.5cm of collision width');
near(size.z, d.size.length, .025, 'Trim stays within 2.5cm of collision length');
near(size.y, d.size.height, .025, 'Declared height is the whole car, wing included');
ok(size.x / 2 <= spec.collision.halfWidth + .025 && size.z / 2 <= spec.collision.halfLength + .025, 'The model fits inside the physics footprint');
ok(triangles <= MAX_TRIANGLES && draws <= MAX_DRAWS, `Size budget: ${triangles} triangles (at most ${MAX_TRIANGLES}) and ${draws} draws (at most ${MAX_DRAWS})`);

// 4. Tires and the ground.
const meta = prepareVehicleGrounding(vehicle);
near(meta.contactY, 0, .001, 'Tires define the local ground plane');
equal(meta.wheels.length, 4, 'Grounding includes all four tires');
for (const wheel of meta.wheels) near(wheel.radius, .36, .001, 'Actual wheel radius');
const wheelNodes = new Set(); for (const wheel of d.wheels) wheel.traverse(node => wheelNodes.add(node));
let bodyFloor = Infinity; const vertex = new THREE.Vector3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || wheelNodes.has(mesh) || mesh === d.contactShadow) return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) bodyFloor = Math.min(bodyFloor, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y);
});
ok(bodyFloor > .10, 'Body and splitter stay above the tire plane');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + meta.contactY, 5 + TIRE_CLEARANCE, .0001, 'Flat-surface grounding');
for (const wheel of d.wheels) near(wheel.rotation.x, 1 / .36, .001, 'Travel-based wheel animation');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0); for (const wheel of d.wheels) wheel.rotation.set(0, 0, 0); vehicle.updateMatrixWorld(true);

// 5. Its own shape: glass all round, a seated driver, and the Bolide's silhouette.
const skins = d.damageMeshes.filter(item => item.mesh.material === d.paint).map(item => item.mesh);
const glass = d.damageMeshes.filter(item => /glass/i.test(item.mesh.material.name)).map(item => item.mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const heightAt = (meshes, x, z) => { ray.set(new THREE.Vector3(x, 3, z), down); return ray.intersectObjects(meshes, false)[0]?.point.y; };
ray.set(new THREE.Vector3(d.driver.position.x, .92, -.18), down);
const torsoDeck = ray.intersectObjects(skins, false)[0];
ok(!torsoDeck || torsoDeck.point.y < .55, 'Painted deck does not cross the seated driver');
const helmet = new THREE.Box3(); d.driver.traverse(node => { if (node.isMesh) helmet.union(new THREE.Box3().setFromBufferAttribute(node.geometry.attributes.position).applyMatrix4(node.matrixWorld)); });
ok(helmet.max.y < heightAt(glass, d.driver.position.x, -.12) - .01, 'The helmet stays inside the canopy glass');
for (const z of [-.6, -.3, 0, .3, .6]) ok(glass.some(mesh => { ray.set(new THREE.Vector3(.16, 2, z), down); return ray.intersectObject(mesh, false).length > 0; }), `Continuous glazing at ${z}`);
ok(d.fractures.length === 4 && d.fractures.every(f => f.rest.length >= 60), 'Four glazing damage zones, all lying on real glass');
for (const steer of [-1, -.5, 0, .5, 1]) { updateDriver(d.driver, steer, .14); for (const arm of d.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Finite driver steering pose'); }
updateDriver(d.driver, 0);
const fender = Math.max(heightAt(skins, .8, 1.42) ?? 0, heightAt(skins, -.8, 1.42) ?? 0), channel = heightAt(skins, 0, 1.42) ?? 0;
ok(fender > channel + .2, 'The front fenders stand well above the central channel');
ok((heightAt(skins, 0, -1.5) ?? 0) > .7, 'A high rear deck behind the cockpit');
ok(bounds.max.y > (heightAt(skins, 0, -1.5) ?? 9) + .25, 'The wing stands well above the deck');
ok(bounds.max.y - size.y < .001 && spec.height < size.y, 'The body height in the config is under the wing');
ok((heightAt(skins, 0, -.2) ?? 0) > (heightAt(skins, 0, 2.2) ?? 9) + .25, 'The roof is far above the nose');
const carbon = d.damageMeshes.filter(item => /carbon/i.test(item.mesh.material.name));
ok(carbon.length > 0, 'Bare carbon panels on the body');
for (const other of [createKoenigseggVehicle({ color: 0x1f4fa8 }), createEnzoVehicle({ color: 0x1f4fa8 }), createUnlockedVehicle({ key: 'viper_proto', color: 0x1f4fa8 }), createClassicVehicle({ key: 'falcone_f42', color: 0x1f4fa8 })]) {
  const otherSkin = other.userData.damageMeshes.filter(item => item.mesh.material === other.userData.paint).map(item => item.mesh);
  let samples = 0, squared = 0, maximum = 0;
  for (let z = -2.2; z < 2.3; z += .17) for (const x of [-.82, -.55, -.25, 0, .25, .55, .82]) {
    const a = heightAt(skins, x, z), b = heightAt(otherSkin, x, z); if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const delta = Math.abs(a - b); samples++; squared += delta * delta; maximum = Math.max(maximum, delta);
  }
  ok(samples > 80 && Math.sqrt(squared / samples) > .05 && maximum > .15, `${other.name}: materially different same-paint silhouette`); disposeTree(other);
}

// 6. Directional damage, crush and exact reset.
const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createBolideVehicle({ color: 0x5544cc, accent: 0xffcc22 });
const siblingVertices = sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array.slice());
const inventory = []; vehicle.traverse(mesh => inventory.push([mesh, mesh.geometry, mesh.material]));
for (const zone of ['front', 'rear', 'left', 'right']) {
  updateVehicleDamage(vehicle, 2, false, 0, { ...clean, [zone]: 2 }); let moved = 0, wear = 0;
  for (const item of d.damageMeshes) {
    const p = item.mesh.geometry.attributes.position.array; ok(p.every(Number.isFinite), `${zone}: finite damaged vertices`);
    for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - item.rest[i]) > .004) moved++;
    for (const amount of item.mesh.geometry.attributes.panelWear.array) wear = Math.max(wear, amount);
  }
  ok(moved > 100 && wear > .4, `${zone}: visible localized deformation and wear`);
  ok(d.fractures.find(f => f.zone === zone).mesh.visible, `${zone}: correct fracture visible`);
}
updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }); let roofDrop = 0;
for (const { mesh, rest } of d.damageMeshes) for (let i = 1; i < rest.length; i += 3) roofDrop = Math.max(roofDrop, rest[i] - mesh.geometry.attributes.position.array[i]);
ok(roofDrop > .3, 'Monster truck visibly collapses the car');
ok(!d.driver.visible && !d.steeringPivot.visible, 'Intact cabin accessories do not protrude through the crushed roof');
const versions = d.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version);
for (let i = 0; i < 120; i++) ok(!updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }), 'Stable wreck skips buffer rewrites');
equal(d.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version), versions, 'No repeated crushed-geometry uploads');
updateVehicleDamage(vehicle, 4, true, 2, { front: 2, rear: 1, left: 1, right: 2 }, .8); updateNpcVehicleDamage(vehicle, null);
for (const { mesh, rest, normals } of d.damageMeshes) {
  equal(mesh.geometry.attributes.position.array, rest, 'Body geometry resets exactly'); equal(mesh.geometry.attributes.normal.array, normals, 'Smooth normals reset exactly');
  ok(mesh.geometry.attributes.panelWear.array.every(n => n === 0), 'Wear resets exactly');
}
for (const pivot of d.wheelPivots) {
  equal(pivot.position.toArray(), pivot.userData.restPosition.toArray(), 'Wheel position resets'); equal(pivot.scale.toArray(), [1, 1, 1], 'Wheel dimensions reset'); ok(pivot.visible && pivot.rotation.z === 0, 'Detached wheels restored');
}
equal(d.paint.color.getHex(), d.originalColor.getHex(), 'Factory paint restored');
ok(d.driver.visible && d.steeringPivot.visible && d.fractures.every(f => !f.mesh.visible), 'Cabin visibility restored');
const after = []; vehicle.traverse(mesh => after.push([mesh, mesh.geometry, mesh.material])); equal(after, inventory, 'Damage leaves no extra assets');
equal(sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array), siblingVertices, 'Damage cannot leak to sibling instance');
equal(sibling.userData.paint.color.getHex(), 0x5544cc, 'Sibling paint remains unchanged'); ok(sibling.userData.paint !== d.paint, 'Materials are private');

// 7. Tumbling keeps the actual body above the support.
for (const pitch of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  placeGroundedVehicle(vehicle, { x: 0, y: 10, z: 0, heading: .6 });
  applyVehicleTerrainPose(vehicle, { groundAt: () => ({ y: 10 }) }, { s: 0, lateral: 0, groundHeight: 10, terrainPitch: pitch, terrainRoll: .2, tumble: true }); vehicle.updateMatrixWorld(true); let minY = Infinity;
  vehicle.traverseVisible(mesh => { if (!mesh.isMesh || mesh === d.contactShadow) return; const p = mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) minY = Math.min(minY, vertex.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld).y); });
  ok(minY >= 10 - .000001, 'Tumble keeps actual body above physical support');
}
disposeTree(vehicle); disposeTree(sibling);
console.log(`Bolide: ${checks} checks; ${triangles.toLocaleString()} triangles (limit ${MAX_TRIANGLES.toLocaleString()}) / ${draws} draws (limit ${MAX_DRAWS}); settled numbers, contract, tire grounding, directional damage, crush and exact private-instance resets.`);

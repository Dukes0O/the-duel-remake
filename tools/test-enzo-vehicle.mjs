// The Ferrari Enzo (EARN-CAR-1): the settled numbers, the vehicle contract
// (driver, steering, wheels, lights, paint, damage, crush, exact reset), the
// size budget, and how it is wired into the game. Headless; no storage.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEnzoVehicle, ENZO_VEHICLE_DIMENSIONS } from '../src/enzo-vehicle.js';
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

// 1. The settled numbers (docs/board/cards/EARN-CAR-1.md, "Claude answers (15 October)").
const spec = CARS.ferrari_enzo;
equal(spec.name, 'Ferrari Enzo', 'The real car\'s name');
equal([spec.topSpeed, spec.accel, spec.grip, spec.braking], [197, 9.4, 1.08, 1.18], 'Settled speed, acceleration, grip and braking');
equal(spec.gears, [58, 100, 138, 168, 186, 197], 'Six-speed gearbox');
equal([spec.offRoadGrip, spec.offRoadSpeed, spec.offRoadScrub], [0.62, 58, 0.56], 'A low supercar, poor off the road');
equal([spec.mass, spec.height, spec.kind, spec.gearbox], [1365, 1.15, 'hypercar', 'manual'], 'Mass, height and kind');
equal(spec.collision, { halfWidth: 1.02, halfLength: 2.35 }, 'Collision footprint');
equal([spec.color, spec.accent], [0xb3121a, 0x16181b], 'Deep Rosso with black trim');
equal(spec.unlockRequirement, { kind: 'medals', medals: 6 }, 'Earned at six medals');
equal(medalRequirement('ferrari_enzo'), { kind: 'medals', medals: 6 }, 'The medal code reads that rule');
ok(MEDAL_CARS.includes('ferrari_enzo'), 'It is a medal car');
equal(spec.factoryMaxed, true, 'Arrives fully tuned');
ok(!Object.hasOwn(CAR_PRICES, 'ferrari_enzo') && !Object.hasOwn(spec, 'price'), 'No price, no Buy button');
equal(Object.keys(CARS).slice(0, 10), ['falcone_f42', 'stuttgart_959s', 'falcone_heritage', 'aurora_gt', 'dusthawk_rally', 'banshee_muscle', 'viper_proto', 'titan_monster', 'koenigsegg_jesko', 'ferrari_enzo'], 'The Enzo stays appended after the original nine cars as later medal cars join');
const full = Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, 3]));
const tuned = upgradedCar(spec, full);
near(tuned.topSpeed, 218, 0.5, 'Fully tuned top speed is about 218 mph');
ok(tuned.topSpeed > upgradedCar(CARS.falcone_f42, full).topSpeed - 20 && tuned.topSpeed < upgradedCar(CARS.aurora_gt, full).topSpeed, 'Between a tuned F42 band and a tuned Aurora');
ok(tuned.topSpeed < upgradedCar(CARS.koenigsegg_jesko, full).topSpeed, 'The Jesko stays the fastest car');
ok(spec.accel <= 10.8 && spec.braking <= 1.5, 'Garage rating bars keep their scale (acceleration and braking at most the Jesko\'s)');
ok(spec.mass <= 1500, 'Light enough for Kestrel One (the lift itself is checked in test-heli-cable)');
ok(Object.hasOwn(CAR_VOICES, 'ferrari_enzo') && CAR_VOICES.ferrari_enzo.pitch > 0 && CAR_VOICES.ferrari_enzo.gain > 0, 'It has its own engine voice');
ok(VEHICLE_SOCKET_KEYS.includes('ferrari_enzo'), 'It has roof and front sockets');
const sockets = vehicleSocketLayout('ferrari_enzo', ENZO_VEHICLE_DIMENSIONS.ferrari_enzo);
ok(sockets.roof[1] > ENZO_VEHICLE_DIMENSIONS.ferrari_enzo.height && sockets.front[2] > ENZO_VEHICLE_DIMENSIONS.ferrari_enzo.length / 2, 'Roof socket above the roof, front socket past the nose');

// 2. The contract.
const vehicle = createEnzoVehicle(), d = vehicle.userData;
equal(createEnzoVehicle({ key: 'falcone_f42' }), null, 'Unsupported keys do not substitute the new car');
equal(createEnzoVehicle({ key: '__proto__' }), null, 'Prototype keys cannot select a car');
equal(vehicle.name, 'ferrari_enzo', 'Stable semantic mesh key');
equal(d.size, ENZO_VEHICLE_DIMENSIONS.ferrari_enzo, 'Metadata matches the physical model contract');
equal(d.designFeatures, ['beak-nose', 'raised-front-fenders', 'teardrop-canopy', 'side-scoops', 'glass-engine-cover', 'quad-round-tail-lamps'], 'Distinct silhouette features');
equal(d.wheels.length, 4, 'Four animated wheels');
equal(d.wheelPivots.filter(p => p.userData.front).length, 2, 'Only the front axle steers');
ok(d.driver && d.steeringPivot && d.brakeLights.length && d.boostFlames.length === 2, 'Production driver, brake and boost hooks');
const routed = createVehicleAssets().create('ferrari_enzo');
equal([routed.userData.vehicleKey, routed.userData.vehicleSource], ['ferrari_enzo', 'earned'], 'The vehicle router builds the Enzo from its own source');
equal(createVehicleAssets().status('ferrari_enzo'), 'ready', 'No asynchronous import needed');
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
near(size.y, d.size.height, .025, 'Low greenhouse matches declared height');
ok(size.x / 2 <= spec.collision.halfWidth + .025 && size.z / 2 <= spec.collision.halfLength + .025, 'The model fits inside the physics footprint');
ok(triangles <= MAX_TRIANGLES && draws <= MAX_DRAWS, `Size budget: ${triangles} triangles (at most ${MAX_TRIANGLES}) and ${draws} draws (at most ${MAX_DRAWS})`);

// 4. Tires and the ground.
const meta = prepareVehicleGrounding(vehicle);
near(meta.contactY, 0, .001, 'Tires define the local ground plane');
equal(meta.wheels.length, 4, 'Grounding includes all four tires');
for (const wheel of meta.wheels) near(wheel.radius, .35, .001, 'Actual wheel radius');
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
for (const wheel of d.wheels) near(wheel.rotation.x, 1 / .35, .001, 'Travel-based wheel animation');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0); for (const wheel of d.wheels) wheel.rotation.set(0, 0, 0); vehicle.updateMatrixWorld(true);

// 5. Its own shape: glass all round, a seated driver, and the Enzo's silhouette.
const skins = d.damageMeshes.filter(item => item.mesh.material === d.paint).map(item => item.mesh);
const glass = d.damageMeshes.filter(item => /glass/i.test(item.mesh.material.name)).map(item => item.mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const heightAt = (meshes, x, z) => { ray.set(new THREE.Vector3(x, 3, z), down); return ray.intersectObjects(meshes, false)[0]?.point.y; };
ray.set(new THREE.Vector3(d.driver.position.x, .92, -.18), down);
const torsoDeck = ray.intersectObjects(skins, false)[0];
ok(!torsoDeck || torsoDeck.point.y < .55, 'Painted deck does not cross the seated driver');
const helmet = new THREE.Box3(); d.driver.traverse(node => { if (node.isMesh) helmet.union(new THREE.Box3().setFromBufferAttribute(node.geometry.attributes.position).applyMatrix4(node.matrixWorld)); });
ok(helmet.max.y < heightAt(glass, d.driver.position.x, -.12) - .01, 'The helmet stays inside the canopy glass');
for (const z of [-.8, -.4, 0, .4, .8]) ok(glass.some(mesh => { ray.set(new THREE.Vector3(.16, 2, z), down); return ray.intersectObject(mesh, false).length > 0; }), `Continuous glazing at ${z}`);
ok(d.fractures.length === 4 && d.fractures.every(f => f.rest.length >= 60), 'Four glazing damage zones, all lying on real glass');
for (const steer of [-1, -.5, 0, .5, 1]) { updateDriver(d.driver, steer, .14); for (const arm of d.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Finite driver steering pose'); }
updateDriver(d.driver, 0);
const fender = Math.max(heightAt(skins, .66, 1.9) ?? 0, heightAt(skins, -.66, 1.9) ?? 0), beak = heightAt(skins, 0, 2.05) ?? 0;
ok(fender > beak + .08, 'The front fenders stand above the central beak');
ok((heightAt(skins, 0, -1.5) ?? 0) > .55, 'A high rear deck carries the engine cover');
ok((heightAt(skins, 0, .0) ?? 0) > (heightAt(skins, 0, 2.2) ?? 9) + .25, 'The roof is far above the nose: a low wedge');
for (const other of [createKoenigseggVehicle({ color: 0xb3121a }), createUnlockedVehicle({ key: 'viper_proto', color: 0xb3121a }), createClassicVehicle({ key: 'falcone_f42', color: 0xb3121a })]) {
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
const sibling = createEnzoVehicle({ color: 0x5544cc, accent: 0xffcc22 });
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
console.log(`Enzo: ${checks} checks; ${triangles.toLocaleString()} triangles (limit ${MAX_TRIANGLES.toLocaleString()}) / ${draws} draws (limit ${MAX_DRAWS}); settled numbers, contract, tire grounding, directional damage, crush and exact private-instance resets.`);

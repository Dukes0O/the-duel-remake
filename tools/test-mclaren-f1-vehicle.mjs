// Original F1 geometry and the production animation/damage/grounding contract.
// Headless and private: no player storage, browser or rendering context.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMclarenF1Vehicle, MCLAREN_F1_VEHICLE_DIMENSIONS } from '../src/mclaren-f1-vehicle.js';
import { updateVehicleDamage, updateNpcVehicleDamage } from '../src/vehicles.js';
import { updateDriver } from '../src/driver.js';
import { prepareVehicleGrounding, placeGroundedVehicle, applyVehicleTerrainPose, TIRE_CLEARANCE } from '../src/vehicle-grounding.js';
import { disposeTree } from '../src/world.js';

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, epsilon, label) => ok(Math.abs(actual - expected) <= epsilon, `${label}: ${actual} vs ${expected}`);
const vehicle = createMclarenF1Vehicle(), data = vehicle.userData;
equal(createMclarenF1Vehicle({ key: 'ferrari_enzo' }), null, 'Other cars never substitute the F1');
equal(createMclarenF1Vehicle({ key: '__proto__' }), null, 'Inherited names cannot select the F1');
equal(vehicle.name, 'mclaren_f1', 'Stable model key');
equal(data.size, MCLAREN_F1_VEHICLE_DIMENSIONS.mclaren_f1, 'Model dimensions agree with the contract');
equal(data.paint.color.getHex(), 0xb8bdc2, 'Default silver paint');
equal(data.wheels.length, 4, 'Four animated wheels');
equal(data.wheelPivots.filter(p => p.userData.front).length, 2, 'Only two front steering pivots');
ok(data.driver && data.steeringPivot && data.brakeLights.length > 0 && data.boostFlames.length === 2, 'Driver, steering, brake and boost hooks exist');
near(data.driver.position.x, 0, 1e-12, 'The driver sits at the centre');
near(data.steeringPivot.position.x, 0, 1e-12, 'The steering wheel is central');

let triangles = 0, draws = 0;
const bounds = new THREE.Box3();
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh) return;
  const geometry = mesh.geometry;
  ok(geometry.attributes.position.array.every(Number.isFinite), `${mesh.name}: finite vertices`);
  ok(geometry.attributes.normal.array.every(Number.isFinite), `${mesh.name}: finite normals`);
  bounds.union(new THREE.Box3().setFromBufferAttribute(geometry.attributes.position).applyMatrix4(mesh.matrixWorld));
  triangles += (geometry.index?.count ?? geometry.attributes.position.count) / 3; draws++;
});
const size = bounds.getSize(new THREE.Vector3());
near(size.x, 2.00, .025, 'Model width matches its collision footprint');
near(size.z, 4.28, .025, 'Model length matches its collision footprint');
near(size.y, 1.14, .025, 'Low roof and air scoop match declared height');
ok(triangles <= 73600 && draws <= 66, `Budget: ${triangles} triangles / ${draws} draws`);

const paint = data.damageMeshes.filter(({ mesh }) => mesh.material === data.paint).map(({ mesh }) => mesh);
const glass = data.damageMeshes.filter(({ mesh }) => mesh.material.name === 'Glass').map(({ mesh }) => mesh);
const trim = data.damageMeshes.filter(({ mesh }) => mesh.material.name === 'Carbon and trim').map(({ mesh }) => mesh);
const seats = data.damageMeshes.filter(({ mesh }) => mesh.material.name === 'Cabin fabric').map(({ mesh }) => mesh);
const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
const heightAt = (meshes, x, z, from = 3) => {
  ray.set(new THREE.Vector3(x, from, z), down);
  return ray.intersectObjects(meshes, false)[0]?.point.y;
};
// Test the physical shape rather than feature labels stored beside the model.
ok(heightAt(paint, 0, 1.80) > .48, 'The short rounded nose remains broad at its centre');
ok(heightAt(paint, 0, 1.80) > heightAt(paint, .66, 1.80) - .15, 'The nose has no low Formula One beak');
ok(heightAt(paint, 0, -.15) > 1.08, 'A broad central cabin rises over the low bonnet');
ok(heightAt(paint, 0, -.34) > 1.125, 'The air scoop rises above the roof');
ok(heightAt(paint, .50, -1.60) > .65, 'The engine deck is short and smooth');
ok(heightAt(paint, 0, -1.85) < .80, 'No high racing wing crosses the tail');
for (const x of [-.40, 0, .40]) {
  const z = x === 0 ? .05 : -.38;
  ok(heightAt(seats, x, z, .65) > .36, `Seat cushion at ${x}, ${z}`);
  const deck = heightAt(paint, x, z, .82);
  ok(deck === undefined || deck < .32, `No painted deck cuts through seat ${x}`);
}
const driverBounds = new THREE.Box3().setFromObject(data.driver);
// Claude's round2 replaces the bubble top with a solid roof. Preserve the
// helmet's original 1 cm clearance against that real roof, below the snorkel.
ok(driverBounds.max.y < heightAt(paint, 0, .04, 1.09) - .01, 'Driver helmet fits below the actual solid roof');
// The old centreline glazing rays described the removed bubble. Test each real
// windscreen/rear/side pane instead, with the same finite-intersection guarantee.
for (const [x, z] of [[.18, -.80], [-.65, -.4], [.65, -.4], [-.65, 0], [.65, 0], [.18, .4], [.18, .78]])
  ok(Number.isFinite(heightAt(glass, x, z)), `Bounded cabin glazing at ${x}, ${z}`);
for (const x of [-.40, 0, .40]) for (const z of [-.30, 0, .20]) {
  ok(heightAt(paint, x, z) > .98, `Broad solid painted roof at ${x}, ${z}`);
  equal(heightAt(glass, x, z), undefined, `Obsolete bubble glass is removed below roof at ${x}, ${z}`);
}
ok(data.paint.opacity === 1 && !data.paint.transparent, 'The body-colour roof is physically opaque');
ok(glass.every(mesh => mesh.material.opacity >= .75 && mesh.material.color.getHSL({}).l < .20), 'Dark tinted panes show the driver as a shape');
for (const side of [-1, 1]) {
  ray.set(new THREE.Vector3(side * .59, .79, 1.2), new THREE.Vector3(0, 0, -1));
  const frame = ray.intersectObjects(paint, false)[0];
  ok(frame && frame.point.z > .45 && frame.point.z < .75, `Painted swept windscreen frame at side ${side}`);
}
ray.set(new THREE.Vector3(0, 1.106, .60), new THREE.Vector3(0, 0, -1));
const intakeMouth = ray.intersectObjects([...paint, ...trim], false)[0];
ok(intakeMouth && trim.includes(intakeMouth.object) && intakeMouth.point.z > .12 && intakeMouth.point.z < .15, 'The central roof snorkel has an exposed forward intake mouth');
// A side ray through each side window reaches the actual driver, while the
// painted shell stays below that ray: the centre seat is visible through glass.
const driverMeshes = []; data.driver.traverse(node => { if (node.isMesh) driverMeshes.push(node); });
for (const side of [-1, 1]) {
  ray.set(new THREE.Vector3(side * 3, .91, .04), new THREE.Vector3(-side, 0, 0));
  ok(ray.intersectObjects(driverMeshes, false).length > 0, `Driver visible from side ${side}`);
  ok(ray.intersectObjects(paint, false).length === 0, `No painted panel blocks the driver from side ${side}`);
  ray.set(new THREE.Vector3(side * 3, .43, -.73), new THREE.Vector3(-side, 0, 0));
  ok(ray.intersectObjects(trim, false).some(hit => Math.abs(hit.point.x) > .85), `Lower triangular side intake at side ${side}`);
}
const lamps = data.damageMeshes.filter(({ mesh }) => mesh.material.name === 'Headlamp lenses').map(({ mesh }) => mesh);
for (const side of [-1, 1]) for (const [x, z] of [[.52, 1.78], [.72, 1.73]]) {
  const target = new THREE.Vector3(side * x, heightAt(lamps, side * x, z), z), origin = target.clone().add(new THREE.Vector3(0, 1, 2));
  ray.set(origin, target.clone().sub(origin).normalize());
  const hits = ray.intersectObjects([...paint, ...lamps], false);
  ok(hits.length > 0 && lamps.includes(hits[0].object), `Real front lens at ${side * x}, ${z} is exposed`);
  const lensBounds = new THREE.Box3(), point = new THREE.Vector3();
  for (const lamp of lamps) {
    const positions = lamp.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(lamp.matrixWorld);
      if (Math.abs(point.x - side * x) < .08 && Math.abs(point.z - z) < .08) lensBounds.expandByPoint(point);
    }
  }
  const lensSize = lensBounds.getSize(new THREE.Vector3());
  ok(!lensBounds.isEmpty() && lensSize.x < .065 && lensSize.y < .065 && lensSize.z < .065, `Small corner optic at ${side * x}, ${z}, not a large exposed white disk`);
}
for (const lamp of lamps) ok(lamp.material.emissiveIntensity < .5, 'Tinted corner lenses avoid the old bright white circles');
for (const side of [-1, 1]) {
  const mirrorBounds = new THREE.Box3(), point = new THREE.Vector3();
  for (const skin of paint) {
    const positions = skin.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(skin.matrixWorld);
      if (point.x * side > .70 && point.x * side < .85 && point.y > .735 && point.y < .82 && point.z > .58 && point.z < .77) mirrorBounds.expandByPoint(point);
    }
  }
  const mirrorSize = mirrorBounds.getSize(new THREE.Vector3());
  ok(!mirrorBounds.isEmpty() && mirrorSize.x < .14 && mirrorSize.y < .06 && mirrorSize.z < .14, `Small mirror at the windscreen base, side ${side}`);
}
for (const side of [-1, 1]) for (const x of [.48, .70]) {
  ray.set(new THREE.Vector3(side * x, .525, -4), new THREE.Vector3(0, 0, 1));
  const hits = ray.intersectObjects([...paint, ...data.brakeLights], false);
  ok(hits.length > 0 && data.brakeLights.includes(hits[0].object), `Round rear brake lamp at ${side * x} is exposed`);
}
ok(data.fractures.length === 4 && data.fractures.every(f => f.rest.length >= 60), 'Four actual glazing fracture zones');
console.log('F1 glazing fracture floats: '+JSON.stringify(Object.fromEntries(data.fractures.map(f=>[f.zone,f.rest.length]))));
for (const steering of [-1, 0, 1]) {
  updateDriver(data.driver, steering, .13);
  for (const arm of data.driver.userData.arms) ok(arm.hand.position.toArray().every(Number.isFinite), 'Driver steering animation stays finite');
}
updateDriver(data.driver, 0);

const grounding = prepareVehicleGrounding(vehicle);
near(grounding.contactY, 0, .001, 'All tires touch local y=0');
equal(grounding.wheels.length, 4, 'All four wheels support grounding');
for (const wheel of grounding.wheels) near(wheel.radius, .335, .001, 'Actual tire radius');
placeGroundedVehicle(vehicle, { x: 2, y: 5, z: 7, heading: 1.2 }, 0, 1);
near(vehicle.position.y + grounding.contactY, 5 + TIRE_CLEARANCE, .0001, 'World grounding adds only tire clearance');
for (const wheel of data.wheels) near(wheel.rotation.x, 1 / .335, .001, 'Wheel travel uses actual radius');
vehicle.position.set(0, 0, 0); vehicle.rotation.set(0, 0, 0);
for (const wheel of data.wheels) wheel.rotation.set(0, 0, 0);
vehicle.updateMatrixWorld(true);

const clean = { front: 0, rear: 0, left: 0, right: 0 };
const sibling = createMclarenF1Vehicle({ color: 0x3155aa, accent: 0xc1a427 });
const siblingVertices = sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array.slice());
const inventory = []; vehicle.traverse(node => inventory.push([node, node.geometry, node.material]));
for (const zone of Object.keys(clean)) {
  updateVehicleDamage(vehicle, 2, false, 0, { ...clean, [zone]: 2 });
  let moved = 0, wear = 0;
  for (const { mesh, rest } of data.damageMeshes) {
    const positions = mesh.geometry.attributes.position.array;
    ok(positions.every(Number.isFinite), `${zone}: damaged vertices remain finite`);
    for (let i = 0; i < rest.length; i++) if (Math.abs(positions[i] - rest[i]) > .004) moved++;
    for (const amount of mesh.geometry.attributes.panelWear.array) wear = Math.max(wear, amount);
  }
  ok(moved > 100 && wear > .4, `${zone}: visible localized dents and wear`);
  ok(data.fractures.find(f => f.zone === zone).mesh.visible, `${zone}: matching glass fracture visible`);
}
updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 });
let roofDrop = 0;
for (const { mesh, rest } of data.damageMeshes) for (let i = 1; i < rest.length; i += 3) roofDrop = Math.max(roofDrop, rest[i] - mesh.geometry.attributes.position.array[i]);
ok(roofDrop > .30, 'Crush visibly lowers the roof');
ok(!data.driver.visible && !data.steeringPivot.visible, 'Crushed cabin hides intact animated parts');
const versions = data.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version);
for (let i = 0; i < 30; i++) ok(!updateNpcVehicleDamage(vehicle, { damageZones: clean, crushDamage: .8 }), 'Unchanged wreck skips buffer rewrites');
equal(data.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.version), versions, 'Stable wreck does not upload its mesh repeatedly');
updateVehicleDamage(vehicle, 4, true, 2, { front: 2, rear: 1, left: 1, right: 2 }, .8);
updateNpcVehicleDamage(vehicle, null);
for (const { mesh, rest, normals } of data.damageMeshes) {
  equal(mesh.geometry.attributes.position.array, rest, 'Exact body vertex reset');
  equal(mesh.geometry.attributes.normal.array, normals, 'Exact smooth-normal reset');
  ok(mesh.geometry.attributes.panelWear.array.every(value => value === 0), 'Exact wear reset');
}
for (const pivot of data.wheelPivots) {
  equal(pivot.position.toArray(), pivot.userData.restPosition.toArray(), 'Wheel location resets');
  equal(pivot.scale.toArray(), [1, 1, 1], 'Wheel scale resets');
  ok(pivot.visible && pivot.rotation.z === 0, 'Detached wheel reappears upright');
}
equal(data.paint.color.getHex(), data.originalColor.getHex(), 'Factory paint restored');
ok(data.driver.visible && data.steeringPivot.visible && data.fractures.every(f => !f.mesh.visible), 'Cabin visibility resets');
const after = []; vehicle.traverse(node => after.push([node, node.geometry, node.material]));
equal(after, inventory, 'Damage and reset create no leaked assets');
equal(sibling.userData.damageMeshes.map(({ mesh }) => mesh.geometry.attributes.position.array), siblingVertices, 'Damage cannot alter a sibling car');
equal(sibling.userData.paint.color.getHex(), 0x3155aa, 'Sibling keeps selected paint');
ok(sibling.userData.paint !== data.paint, 'Instances have private paint materials');
const vertex = new THREE.Vector3();
for (const pitch of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
  placeGroundedVehicle(vehicle, { x: 0, y: 10, z: 0, heading: .6 });
  applyVehicleTerrainPose(vehicle, { groundAt: () => ({ y: 10 }) }, { s: 0, lateral: 0, groundHeight: 10, terrainPitch: pitch, terrainRoll: .2, tumble: true });
  vehicle.updateMatrixWorld(true); let minimumY = Infinity;
  vehicle.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh === data.contactShadow) return;
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) minimumY = Math.min(minimumY, vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).y);
  });
  ok(minimumY >= 10 - .000001, 'Tumble keeps physical body above support');
}
disposeTree(vehicle); disposeTree(sibling);
console.log(`McLaren F1: ${checks} checks; ${triangles.toLocaleString()} triangles / ${draws} draws (limits 73,600 / 66); original three-seat body, exposed lamps, animation, grounding, directional damage, crush and exact private-instance reset.`);

// The card's Panorama field check uses the existing native sampler. These are
// headless recipe checks; no frame timing or browser verdict is inferred.
const {earnCar2FrameSelection, assertEarnCar2FrameContext, validateEarnCar2FramePacket,
  prepareEarnCar2FramePlayer} = await import('./scenarios/frame-pacing.mjs');
const frameChecksBefore = checks;
equal(earnCar2FrameSelection({}), null, 'F1 timing is an explicit opt-in');
equal(earnCar2FrameSelection({EARN_CAR_2_FRAMES_ONLY: '0'}), null, 'A disabled selector keeps existing frame scenarios');
equal(earnCar2FrameSelection({EARN_CAR_2_FRAMES_ONLY: '1'}), {
  courseId: 'panorama-ridge', car: 'mclaren_f1', flags: 'panorama-ridge,earned-cars,grand-prix',
}, 'The F1 selector enables the real course, car and Grand Prix');
const frameContext = {headed: true, launchMode: 'headed'};
const frameEnv = {EARN_CAR_2_FRAMES_ONLY: '1', DUEL_FRAME_IDLE_AWAKE: '1'};
assertEarnCar2FrameContext(frameContext, frameEnv, []); checks++;
for (const [context, env, busy] of [
  [{headed: false, launchMode: 'headless'}, frameEnv, []],
  [{headed: true, launchMode: 'headless'}, frameEnv, []],
  [frameContext, {EARN_CAR_2_FRAMES_ONLY: '1'}, []],
  [frameContext, {DUEL_FRAME_IDLE_AWAKE: '1'}, []],
  [frameContext, frameEnv, [{kind: 'build'}]],
]) {assert.throws(() => assertEarnCar2FrameContext(context, env, busy)); checks++;}
const frameRow = quality => ({quality, course: 'panorama-ridge', sourceCar: 'mclaren_f1',
  roster: Array(8).fill('mclaren_f1'), cars: 8, frames: 120, headed: true, visible: true,
  memoryOnlySaves: true, appRunning: true, rearView: 'ready', countdownBefore: .1,
  countdownAfter: 2.1, p95: 18.5, worldBuildMs: 999.9, constructionMs: 5000});
const framePacket = () => ({schema: 1, mode: 'earn-car-2-simple',
  reports: [frameRow('High'), frameRow('Performance')]});
const validFrames = framePacket();
equal(validateEarnCar2FramePacket(validFrames), validFrames, 'Both real F1 qualities retain the exact existing limits');
for (const change of [
  {course: 'harbour-lights'}, {sourceCar: 'falcone_f42'}, {roster: Array(8).fill('falcone_f42')},
  {roster: ['ferrari_enzo', ...Array(7).fill('mclaren_f1')]}, {roster: Array(7).fill('mclaren_f1')},
  {cars: 7}, {frames: 119}, {headed: false}, {visible: false}, {memoryOnlySaves: false},
  {appRunning: false}, {rearView: 'pending'}, {countdownAfter: .1}, {p95: 18.501},
  {p95: NaN}, {worldBuildMs: 1000}, {worldBuildMs: NaN}, {constructionMs: NaN},
]) {
  const packet = framePacket(); Object.assign(packet.reports[0], change);
  assert.throws(() => validateEarnCar2FramePacket(packet)); checks++;
}
const slowLoad = framePacket(), loadWarnings = [];
slowLoad.reports[0].constructionMs = 5001;
equal(validateEarnCar2FramePacket(slowLoad, {warn: message => loadWarnings.push(message)}), slowLoad,
  'A slow first-race load warns without weakening frame or world-build limits');
equal(loadWarnings.length, 1, 'Only the slow quality emits a first-load warning');

const {App} = await import('../src/app.js');
const {CARS, COURSE} = await import('../src/config.js');
const {ALL_CIRCUITS} = await import('../src/circuits/index.js');
const {UPGRADE_TYPES, isCarUnlocked, getUpgradeLevels} = await import('../src/progression.js');
const {isCourseUnlocked} = await import('../src/course-access.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const frameGlobalNames = ['localStorage', '__DUEL_QA__', 'cancelAnimationFrame'];
const frameGlobals = new Map(frameGlobalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
const frameMemory = new Map(), frameCourseCount = COURSE.length;
let frameApp;
try {
  globalThis.localStorage = {getItem: key => frameMemory.get(key) ?? null,
    setItem: (key, value) => frameMemory.set(key, String(value)), removeItem: key => frameMemory.delete(key)};
  globalThis.__DUEL_QA__ = true; globalThis.cancelAnimationFrame = () => {};
  if (!COURSE.some(course => course.id === 'panorama-ridge'))
    COURSE.push(ALL_CIRCUITS.find(course => course.id === 'panorama-ridge'));
  frameApp = new App();
  frameApp.duel.featureFlags = createFeatureFlags({qa: true, search: '?flags=panorama-ridge,earned-cars,grand-prix'});
  prepareEarnCar2FramePlayer(frameApp, 'high', UPGRADE_TYPES);
  const firstPlayer = frameApp.player.id;
  ok(isCarUnlocked(frameApp.profile, 'mclaren_f1'), 'Native private F1 player owns the actual car');
  ok(isCourseUnlocked(frameApp.profile, 'panorama-ridge'), 'Native private player purchases Panorama');
  equal(getUpgradeLevels(frameApp.profile, 'mclaren_f1'), Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type => [type, 3])),
    'The private F1 receives all seven factory upgrades');
  equal(frameApp.profile.heli.carsAt.mclaren_f1, 'panorama-ridge', 'The saved private F1 is delivered to Panorama');
  ok(CARS.mclaren_f1.factoryMaxed, 'Timing selects the production factory-maxed car');
  const stage = COURSE.findIndex(course => course.id === 'panorama-ridge');
  ok(frameApp.startCampaign({startStage: stage, car: 'mclaren_f1', mode: 'grandprix',
    seed: 1989, fieldSeed: 12, fieldSize: 7, difficulty: 'casual', cpuDifficulty: 'medium'}),
    'Real App entry accepts the private earned and air-delivered F1');
  equal([frameApp.duel.state.car, ...frameApp.duel.state.opponents.map(actor => actor.car)], Array(8).fill('mclaren_f1'),
    'The actual native Grand Prix field is eight F1 copies');
  frameApp.returnToMenu();
  const firstProfile = JSON.stringify(frameApp.profile);
  prepareEarnCar2FramePlayer(frameApp, 'performance', UPGRADE_TYPES);
  ok(frameApp.player.id !== firstPlayer, 'The other quality uses a distinct native temporary player');
  equal(JSON.stringify(frameApp.players.players.find(player => player.id === firstPlayer).profile), firstProfile,
    'Preparing the other quality preserves the first private player');
  equal(frameApp.duel.state.status, 'menu', 'Player preparation leaves the native menu ready to start');
} finally {
  try {frameApp?.dispose();} finally {
    COURSE.splice(frameCourseCount);
    for (const [name, descriptor] of frameGlobals)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
}
console.log(`F1 frame recipe: ${checks - frameChecksBefore} headless selector, context, packet and native private eight-car field checks; actual timing remains separate.`);

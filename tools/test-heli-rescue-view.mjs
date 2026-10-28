// Drawing H4 Rescue (docs/HELI_RESCUE.md sections 5, 7 and 13): the people and
// props from the files in public/, the flare and the snow blocks, the paramedics
// at a handover, the mission line, the beacon bar and the dusk on the panel,
// and the switch off meaning H2 exactly. Headless: the real models are parsed
// from public/, the fire atlas is a stand-in texture. Memory storage only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {JOB_CARS} from '../src/heli/heli-jobs.js';
import {createVehicleAssets} from '../src/vehicle-assets.js';
import {createRescueView, RESCUE_MODEL_URLS, RESCUE_LIMITS, HANDOVER, PEOPLE_SCALE, CRATE_SCALE} from '../src/heli/heli-rescue-view.js';
import {createHeliView} from '../src/heli/heli-scene.js';
import {rescueLineMarkup, instrumentsMarkup, fireLineMarkup, noticeText, duskShare, controlsMarkup} from '../src/heli/heli-ui.js';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {setMissions, createMissions} from '../src/heli/heli-save.js';
import {createProfile, normalizeProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const near = (a, b, tolerance, label) => { assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} is not within ${tolerance} of ${b}`); checks++; };
const wait = async test => { for (let i = 0; i < 80 && !test(); i++) await new Promise(resolve => setTimeout(resolve, 25)); };
const parseFile = path => {
  const bytes = readFileSync(new URL('../public' + path, import.meta.url));
  return new Promise((resolve, reject) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', gltf => resolve(gltf.scene), reject));
};
const table = JSON.parse(readFileSync(new URL('../public/assets/heli/fire-fx.json', import.meta.url), 'utf8'));
const loaded = [];
const load = {model: url => { loaded.push(url); return parseFile(url); }, texture: () => Promise.resolve(new THREE.Texture()), table: () => Promise.resolve(table)};

// ---- The files: the contract the drawing relies on -------------------------------------------
for (const [key, url] of Object.entries(RESCUE_MODEL_URLS)) {
  const root = await parseFile(url);
  ok(root.children.length > 0, `${key}: the file has something in it`);
  if (/^(rescuer|pair|hiker|skier|driver|paramedic)/.test(key) || key === 'stretcher') ok(root.getObjectByName('harness'), `${key}: has its harness empty`);
  const box = new THREE.Box3().setFromObject(root);
  if (key.startsWith('crate-')) ok(box.min.y < 0 && box.min.y > -1.1, `${key}: hangs from its origin (${box.min.y.toFixed(2)})`);
}

// ---- A world and a view to draw -------------------------------------------------------------
const hill = (x, z) => 20 + Math.sin(x / 40) * 3 + Math.cos(z / 55) * 2;
const heli = {x: 0, y: 70, z: 0, heading: .4, onGround: false};
const slide = {x: 100, z: 200, y: 22, down: {x: 0, z: -1}, slope: 20};
const beacon = {x: 108, z: 190, y: hill(108, 190)};
const active = (kind, extra = {}, sites = null) => ({kind, id: `${kind}-1`, courseId: 'tremblant-snow', courseName: 'Tremblant Snow', stage: 'fly', condition: 0, conditionName: 'unhurt',
  here: true, clockSeconds: 100, limit: 720, left: 620, orange: false, dusk: 0, crates: [0, 0, 0], cratesDown: 0, target: {x: 100, z: 200, distance: 600, bearing: 120},
  signal: null, sites, ...extra});
const lineAt = (x, z, extra = {}) => ({who: 'rescuer', condition: 'unhurt', holding: false, hold: 0, done: false, onGround: false, x, y: 40, z, ...extra});
const viewOf = (rescue, extra = {}) => ({heli, courseId: 'tremblant-snow', rescue: {line: null, crates: [], call: null, active: null, ground: hill, ...rescue}, ...extra});
const names = state => state.actors.map(item => item.name).sort();
async function ready(view, make, keys, frames = 3) {
  const v = make();
  view.update(v);
  await wait(() => keys.every(key => view.modelStatus(key) === 'ready') && view.artStatus === 'ready');
  for (let i = 0; i < frames; i++) view.update(v, {dt: 1 / 60});
  return v;
}

// ---- The switch off: nothing is made, loaded or drawn ----------------------------------------
{
  const scene = new THREE.Scene();
  const loadsBefore = loaded.length;
  const heliView = createHeliView({THREE, scene, vehicleAssets: {status: () => 'error', load: () => Promise.resolve(false), create: () => null},
    load: () => new Promise(() => {}), fireLoad: load, rescueLoad: load});
  const afterMake = scene.children.length;
  for (let i = 0; i < 5; i++) heliView.update({heli, courseId: 'tremblant-snow', loads: [], zone: null}, {dt: 1 / 60});
  eq(heliView.rescue, null, 'no rescue view without a rescue view in the session');
  eq(scene.children.length, afterMake, 'nothing added to the scene');
  eq(loaded.length, loadsBefore, 'nothing downloaded');
  eq(rescueLineMarkup({heli, fire: null}), '', 'no mission line');
  ok(!instrumentsMarkup({heli: {}, readout: {altitudeFt: 1, altitudeM: 1, heightFt: 1, heightM: 1, airspeedKts: 1, climbFpm: 0, climbMs: 0, rotorPct: 100, fuelKg: 100, weightKg: 1000, maxLiftKg: 1500, headingDeg: 0, pitchDeg: 0, rollDeg: 0, engine: true}}).includes('heli-rescue'),
    'the instruments have no rescue part');
  eq(duskShare({heli}), 0, 'no dusk');
  // A rescue view appears: only then is the rescue drawing made.
  heliView.update({heli, courseId: 'tremblant-snow', loads: [], zone: null, rescue: viewOf({}).rescue}, {dt: 1 / 60});
  ok(heliView.rescue && scene.children.length === afterMake + 1, 'the rescue view is made when the session gives a rescue view');
  heliView.update({heli, courseId: 'tremblant-snow', loads: [], zone: null}, {dt: 1 / 60});
  eq(heliView.rescue.visible, false, 'and hides again when it goes');
  heliView.dispose();
}

// ---- The rescuer on the line, and the pair --------------------------------------------------
{
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  const make = (line, extra = {}) => viewOf({line, ...extra});
  let v = await ready(view, () => make(lineAt(5, 6)), ['rescuer']);
  eq(view.state.actors, [{name: 'line', key: 'rescuer'}], 'the rescuer hangs on the line');
  const actor = view.object('line');
  ok(actor, 'the model is in the scene');
  near(actor.position.y, 40 - 1.36 * PEOPLE_SCALE, .01, 'his clip point sits at the line load');
  near(actor.scale.x, PEOPLE_SCALE, 1e-9, 'a little larger than life, so he reads from the cameras');
  const helmets = [];
  actor.traverse(object => { if (object.isMesh && object.material.name === 'helmet_black') helmets.push(object.material.color); });
  ok(helmets.length > 0 && helmets.every(color => color.r > .7 && color.g > .7), 'a white helmet on the red suit');
  near(actor.rotation.y, .4, 1e-9, 'facing the way the helicopter points');
  const end = view.cableEnd(v);
  // The cable ends at the top of the file's model: since RESCUE-FINISH that is the hook above his head (it was his raised hand).
  const fileRoot = await parseFile(RESCUE_MODEL_URLS.rescuer), file = new THREE.Box3().setFromObject(fileRoot), clip = fileRoot.getObjectByName('harness').position.y;
  near(end.y, 40 + (file.max.y - clip) * PEOPLE_SCALE, .05, 'the cable ends at the hook above his head');
  ok(file.max.y - clip > 1, `the hook hangs well above the chest ring (${(file.max.y - clip).toFixed(2)} m)`);
  v = await ready(view, () => make(lineAt(5, 6, {who: 'pair'})), ['pair']);
  eq(view.state.actors, [{name: 'line', key: 'pair'}], 'clipped together: the pair model');
  // Set down: he stays as he was set down while the helicopter turns.
  view.update(make(lineAt(5, 6, {onGround: true, y: hill(5, 6) + 1.3})), {dt: 1 / 60});
  const standing = view.object('line').rotation.y;
  view.update({...make(lineAt(5, 6, {onGround: true, y: hill(5, 6) + 1.3})), heli: {...heli, heading: 2}}, {dt: 1 / 60});
  near(view.object('line').rotation.y, standing, 1e-9, 'on the ground he does not spin with the helicopter');
  view.update(viewOf({line: null}), {dt: 1 / 60});
  eq(view.state.actors, [], 'no line, nobody');
  eq(view.cableEnd(viewOf({line: null})), null, 'no line, no cable end');
  view.dispose();
}

// ---- The lost hiker: ring, flare, walk, wave --------------------------------------------------
{
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  const clearing = {x: 40, z: 60, y: hill(40, 60), radius: 12}, lastSeen = {x: 90, z: 20};
  const make = (hiker, flareLeft, extra = {}) => viewOf({active: active('hiker', {target: {x: 90, z: 20, distance: 300, bearing: 80, radius: 300}, ...extra},
    {lastSeen, clearing, hiker, flareLeft, aboard: false})});
  let v = await ready(view, () => make(null, 0), []);
  let state = view.state;
  ok(state.searchRing && !state.clearingRing, 'before the flare: the search ring, not the clearing');
  eq(state.sprites, 0, 'no flare yet');
  eq(names(state), [], 'and nobody to see');
  const ringPoints = view.group.children.find(child => child.isLineLoop).geometry.attributes.position;
  near(ringPoints.getY(0), hill(ringPoints.getX(0), ringPoints.getZ(0)) + 1.5, .01, 'the ring follows the ground');
  near(Math.hypot(ringPoints.getX(0) - 90, ringPoints.getZ(0) - 20), 300, .01, 'and is 300 m across');
  // Spotted: the hiker walks, a flare burns and its smoke climbs.
  v = await ready(view, () => make({x: 70, z: 40, arrived: false}, 50), ['hiker-walking']);
  state = view.state;
  eq(names(state), ['hiker'], 'the hiker is seen');
  eq(state.actors[0].key, 'hiker-walking', 'walking to the clearing');
  ok(!state.searchRing && state.clearingRing, 'the clearing is ringed, the search ring gone');
  ok(state.sprites > 10 && state.glowSprites >= 2, `the flare burns with its smoke (${state.sprites} sprites)`);
  ok(state.sprites <= RESCUE_LIMITS.high.sprites * 2, 'within the sprite cap');
  const hikerObject = view.object('hiker');
  near(hikerObject.position.y, hill(70, 40), .06, 'standing on the ground');
  near(hikerObject.rotation.y, Math.atan2(40 - 70, 60 - 40), 1e-9, 'facing the way he walks');
  const smoke = [...view.group.children.find(child => child.isPoints && child.renderOrder === 2).geometry.attributes.position.array.slice(0, 3)];
  ok(smoke[1] > hill(70, 40), 'the smoke rises from his hand');
  v = await ready(view, () => make({x: 40, z: 60, arrived: true}, 20), ['hiker-standing']);
  eq(view.state.actors[0].key, 'hiker-standing', 'arrived: he stands and waves');
  near(view.object('hiker').rotation.y, Math.atan2(0 - 40, 0 - 60), 1e-9, 'facing the helicopter');
  v = await ready(view, () => make({x: 40, z: 60, arrived: true}, 0), ['hiker-standing']);
  eq(view.state.glowSprites, 0, 'the flare burns out after its 60 seconds');
  v = await ready(view, () => viewOf({active: active('hiker', {stage: 'carry'}, {lastSeen, clearing, hiker: {x: 40, z: 60, arrived: true}, flareLeft: 0, aboard: true})}), []);
  eq(names(view.state), [], 'aboard: nobody on the ground');
  // Without a ground sampler the clearing's height serves.
  const bare = viewOf({active: active('hiker', {}, {lastSeen, clearing, hiker: {x: 40, z: 60, arrived: true}, flareLeft: 0, aboard: false})});
  delete bare.rescue.ground; bare.rescue.ground = null;
  view.update(bare, {dt: 1 / 60});
  near(view.object('hiker').position.y, clearing.y, 1e-9, 'with no sampler he stands at the clearing height');
  view.dispose();
}

// ---- The slide, the dig and the skier -------------------------------------------------------
{
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  const sites = {slide, beacon};
  const make = (line, extra = {}) => viewOf({line, active: active('avalanche', {signal: {heard: false, bar: 0, interval: null, pitch: null}, ...extra}, sites)});
  await ready(view, () => make(null), []);
  let state = view.state;
  eq(state.debris, RESCUE_LIMITS.high.debris, 'the whole slide is strewn with chunks');
  const meshes = view.group.children.filter(child => child.isInstancedMesh);
  eq(meshes.length, 4, 'four lump shapes, four draws');
  eq(meshes.reduce((sum, mesh) => sum + mesh.count, 0), RESCUE_LIMITS.high.debris, 'every chunk is placed');
  // Rounded lumps, not tiles: as tall as a good share of their width, with a smooth surface, white above and blue-grey below.
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox, wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), high = box.max.y - box.min.y;
    ok(high / wide > .3 && high / wide < 1.2, `a lump is not a flat tile (${(high / wide).toFixed(2)})`);
    const c = mesh.geometry.attributes.color;
    let top = 0, side = 0;
    for (let i = 0; i < c.count; i++) { top = Math.max(top, c.getX(i)); side = Math.min(side || 9, c.getX(i)); }
    ok(top > .9 && side < .7 && c.getZ(0) >= c.getX(0), 'white on top, blue-grey in the shade');
  }
  // Inside the 80 by 200 m debris area, sunk in the ground, from half a metre to three metres across, thicker toward the foot.
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let inside = 0, buried = 0, total = 0, small = 0, upper = 0, lower = 0, widest = 0;
  for (const mesh of meshes) for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m); m.decompose(p, q, s); total++;
    const across = (p.x - slide.x) * 1 + (p.z - slide.z) * 0, down = -(p.z - slide.z);
    if (Math.abs(across) <= 100 && Math.abs(down) <= 41) inside++;
    if (p.y < hill(p.x, p.z) && p.y > hill(p.x, p.z) - .6) buried++;
    const wide = mesh.geometry.boundingBox.max.x * 2 * Math.max(s.x, s.z);
    widest = Math.max(widest, wide); if (wide < 1.5) small++;
    if (down < 0) upper++; else lower++;
  }
  ok(inside >= total * .8, `most chunks are inside the debris area (${inside} of ${total})`);
  eq(buried, total, 'and every chunk is half sunk in the ground');
  ok(widest <= 3.4 && small > total * .4, `mostly small, none over 3 m or so (widest ${widest.toFixed(2)} m, ${small} small)`);
  ok(lower > upper * 1.3, `thickest down the slope (${lower} below the middle, ${upper} above)`);
  eq(names(state), [], 'the skier is buried: nobody to see');
  // The dig: the skier comes up as the hold fills; the beacon shows; snow flies.
  await ready(view, () => make(lineAt(108, 190, {holding: true, hold: .25, onGround: true, y: hill(108, 190) + 1.3})), ['skier-sitting', 'beacon', 'rescuer']);
  const skier = view.object('skier');
  const low = skier.position.y;
  ok(low < hill(108, 190) - .5, 'a quarter dug: he is still mostly under the snow');
  ok(view.state.sprites > 5, 'snow flies from the dig');
  view.update(make(lineAt(108, 190, {holding: true, hold: 1, onGround: true, y: hill(108, 190) + 1.3})), {dt: 1 / 60});
  near(skier.position.y, hill(108, 190), .01, 'fully dug: he sits on the snow');
  ok(names(view.state).includes('beacon'), 'the beacon lies by him');
  view.update(make(lineAt(108, 190, {who: 'pair', onGround: false}), {stage: 'carry'}), {dt: 1 / 60});
  ok(!names(view.state).includes('skier'), 'clipped on: he is on the line, not on the slope');
  view.update(viewOf({active: active('avalanche', {here: false}, null)}), {dt: 1 / 60});
  eq(view.state.debris, 0, 'on another course the slide is not drawn');
  view.dispose();
}

// ---- The hoist, the supply run, the yard -----------------------------------------------------
{
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  const driver = {x: 30, z: 40, y: hill(30, 40)};
  const make = (line, extra = {}) => viewOf({line, active: active('hoist', extra, {driver, car: {x: 34, z: 41, y: 0, heading: 1}})});
  await ready(view, () => make(null), ['driver-standing']);
  eq(view.state.actors, [{name: 'driver', key: 'driver-standing'}], 'the driver stands on the slope');
  near(view.object('driver').position.y, hill(30, 40), 1e-9, 'on the ground');
  view.update(make(lineAt(30, 40, {who: 'pair'}), {stage: 'carry'}), {dt: 1 / 60});
  ok(!names(view.state).includes('driver'), 'clipped on: gone from the slope');
  // Supply: three crates, the yard ring, the cable end on a hooked crate.
  const yard = {x: 80, z: 90, y: hill(80, 90), radius: 10};
  const crates = ['food', 'medicine', 'fuel'].map((id, i) => ({id, x: 10 + i * 6, y: hill(10 + i * 6, 5) + .7, z: 5, heading: 0, hooked: false, onGround: true}));
  const supply = (list, extra = {}) => viewOf({crates: list, active: active('supply', {crates: [0, 0, 0], ...extra}, {yard})});
  await ready(view, () => supply(crates), ['crate-food', 'crate-medicine', 'crate-fuel']);
  eq(names(view.state), ['crate-food', 'crate-fuel', 'crate-medicine'], 'three crates');
  ok(view.state.yardRing, 'the yard is ringed');
  for (const crate of crates) {
    const box = new THREE.Box3().setFromObject(view.object(`crate-${crate.id}`));
    near(box.min.y, hill(crate.x, 5), .12, `${crate.id} rests on the ground (its dark rim a little below)`);
    near(view.object(`crate-${crate.id}`).scale.x, CRATE_SCALE, 1e-9, `${crate.id} is one and a half times larger`);
    let rims = 0;
    view.object(`crate-${crate.id}`).traverse(object => { if (object.isMesh && object.material.side === THREE.BackSide) rims++; });
    ok(rims >= 2, `${crate.id} has its dark rim (${rims} parts)`);
  }
  const hooked = crates.map((crate, i) => i === 1 ? {...crate, hooked: true, onGround: false, y: crate.y + 20} : crate);
  const end = view.cableEnd(supply(hooked));
  ok(end && end.y > hill(16, 5) + 20 && end.y < hill(16, 5) + 24, `the cable ends at the hooked crate (${end?.y.toFixed(2)})`);
  eq(view.cableEnd(supply(crates)), null, 'nothing hooked, no cable end');
  view.dispose();
}

// ---- The rescuer's pose and the pair, from the files (RESCUE-FINISH) -------------------------
{
  // The line's hook is over the middle of each file (the cable's end), well above the helmet; he reaches out ahead of his chest.
  for (const [key, who] of [['rescuer', 'alone'], ['pair', 'with the casualty']]) {
    const root = await parseFile(RESCUE_MODEL_URLS[key]), box = new THREE.Box3().setFromObject(root);
    const top = [];
    root.updateMatrixWorld(true);
    root.traverse(object => {
      if (!object.isMesh) return;
      const p = object.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld); if (v.y > box.max.y - .06) top.push(v); }
    });
    const mid = top.reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(top.length);
    near(Math.hypot(mid.x, mid.z), 0, .06, `${who}: the hook is over the middle of the file (${mid.x.toFixed(2)}, ${mid.z.toFixed(2)})`);
    near(box.min.y, 0, .05, `${who}: his boots hang just clear of the file's floor`);
  }
  const lone = await parseFile(RESCUE_MODEL_URLS.rescuer), ring = lone.getObjectByName('harness').position;
  const reach = new THREE.Box3().setFromObject(lone).max.z - ring.z;
  ok(reach > .35, `alone, his arms reach out ahead of the chest ring (${reach.toFixed(2)} m)`);
  const pair = await parseFile(RESCUE_MODEL_URLS.pair), parts = Object.fromEntries(['rescuer', 'casualty'].map(name => [name, new THREE.Box3().setFromObject(pair.getObjectByName(name))]));
  const gap = (parts.casualty.min.z + parts.casualty.max.z) / 2 - (parts.rescuer.min.z + parts.rescuer.max.z) / 2;
  ok(gap > .15 && gap < .6, `the casualty hangs in front of him, face to face (${gap.toFixed(2)} m ahead)`);
  ok(Math.abs(parts.casualty.max.y - parts.rescuer.max.y) < .35, 'both clipped to one hook, the heads near one another');
}

// ---- The stranded driver's car, and crates left in the yard (RESCUE-FINISH) --------------------
{
  const calls = {create: []};
  const stub = {status: () => 'ready', load: () => Promise.resolve(true), create: id => { calls.create.push(id); const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial()); mesh.userData.id = id; return mesh; }};
  const driver = {x: 30, z: 40, y: hill(30, 40)};
  const site = (extra = {}) => ({driver, car: {x: 34, z: 41, y: hill(34, 41), heading: 1, ...extra}});
  const hoist = (sites, extra = {}, line = null) => viewOf({line, active: active('hoist', extra, sites)});
  // The session names the car: that one is drawn, beside the driver, lying on the slope.
  const view = createRescueView({THREE, scene: new THREE.Scene(), load, vehicleAssets: stub});
  const named = hoist(site({carId: JOB_CARS[1]}));
  await ready(view, () => named, ['driver-standing']);
  eq(view.state.car, JOB_CARS[1], 'the car the session names is drawn');
  const car = view.object('car');
  near(Math.hypot(car.position.x - driver.x, car.position.z - driver.z), Math.hypot(4, 1), 1e-9, 'beside the driver');
  near(car.position.y, hill(34, 41), 1e-9, 'on the ground');
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(car.quaternion);
  ok(up.y > .85 && up.y < 1, `it lies along the slope, not flat and not on its side (up.y ${up.y.toFixed(3)})`);
  near(new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion).dot(new THREE.Vector3(Math.sin(1), 0, Math.cos(1))), 1, .1, 'it points the way the site says (the slope only leans it)');
  ok(view.group.children.includes(car), 'it is in the scene');
  // With the driver clipped on the car stays; it goes when the rescue is over or is another kind.
  view.update(hoist(site({carId: JOB_CARS[1]}), {stage: 'carry'}, lineAt(30, 40, {who: 'pair'})), {dt: 1 / 60});
  eq(view.state.car, JOB_CARS[1], 'the car stays on the slope while the driver is carried away');
  view.update(viewOf({}), {dt: 1 / 60});
  eq(view.state.car, null, 'rescue over: the car is not drawn');
  view.update(viewOf({active: active('hiker', {}, {lastSeen: {x: 90, z: 20}, clearing: {x: 40, z: 60, y: 20, radius: 12}, hiker: null, flareLeft: 0, aboard: false})}), {dt: 1 / 60});
  eq(view.state.car, null, 'another kind of rescue: no car');
  view.dispose();
  // No car named: a seeded pick from the customer cars Kestrel One can lift, the same for the same site.
  const pick = async sites => {
    const v2 = createRescueView({THREE, scene: new THREE.Scene(), load, vehicleAssets: stub});
    await ready(v2, () => hoist(sites), ['driver-standing']);
    const id = v2.state.car;
    v2.dispose();
    return id;
  };
  const first = await pick(site()), again = await pick(site());
  ok(JOB_CARS.includes(first), `a liftable customer car (${first})`);
  eq(again, first, 'the same site always shows the same car');
  const spread = new Set();
  for (let i = 0; i < 24; i++) spread.add(await pick(site({x: 34 + i * 13, z: 41 + i * 7})));
  ok(spread.size >= 3 && [...spread].every(id => JOB_CARS.includes(id)), `different sites show different cars (${spread.size} of ${JOB_CARS.length})`);
  // The game's own car models draw too (the ones that are ready at once).
  const real = createVehicleAssets(), readyId = JOB_CARS.find(id => real.status(id) === 'ready');
  const v3 = createRescueView({THREE, scene: new THREE.Scene(), load, vehicleAssets: real});
  await ready(v3, () => hoist(site({carId: readyId})), ['driver-standing']);
  let meshes = 0;
  v3.object('car')?.traverse(object => { if (object.isMesh) meshes++; });
  ok(readyId && meshes > 5, `the real model of ${readyId} is in the scene (${meshes} parts)`);
  v3.dispose();
  // Nothing about cars is made or asked for unless a hoist rescue is shown.
  const asked = {made: 0};
  const lazy = createRescueView({THREE, scene: new THREE.Scene(), load, vehicleAssets: {status: () => { asked.made++; return 'ready'; }, load: () => Promise.resolve(true), create: () => { asked.made++; return null; }}});
  await ready(lazy, () => viewOf({active: active('avalanche', {}, {slide, beacon})}), []);
  await ready(lazy, () => viewOf({}), []);
  eq(asked.made, 0, 'a slide or no rescue never asks for a car');
  lazy.dispose();

  // A crate set down in the yard stays where it was set down.
  const yard = {x: 80, z: 90, y: hill(80, 90), radius: 10};
  const rest = (id, i) => ({id, x: 78 + i * 4, y: hill(78 + i * 4, 92) + .7, z: 92, heading: .3 * i, hooked: false, onGround: true});
  const run = (crates, states, {id = 'supply-1', courseId = 'tremblant-snow', kind = 'supply'} = {}) =>
    ({...viewOf({crates, active: kind ? {...active(kind, {crates: states}, {yard}), id} : null}), courseId});
  const sv = createRescueView({THREE, scene: new THREE.Scene(), load});
  const food = rest('food', 0), medicine = rest('medicine', 1);
  await ready(sv, () => run([food], [2, 0, 0]), ['crate-food']);
  const placed = sv.object('crate-food').position.clone();
  eq(names(sv.state), ['crate-food'], 'the crate set down is drawn');
  // The session lets go of it (the course changed and came back, or the run ended): it still lies there.
  sv.update(run([], [2, 0, 0]), {dt: 1 / 60});
  eq(names(sv.state), ['crate-food'], 'gone from the session, still lying in the yard');
  eq(sv.object('crate-food').position.toArray(), placed.toArray(), 'exactly where it was set down');
  await ready(sv, () => run([medicine], [2, 2, 0]), ['crate-medicine']);
  eq(names(sv.state), ['crate-food', 'crate-medicine'], 'the second crate joins the first');
  sv.update(run([], [2, 2, 0], {courseId: 'tremblant-woods'}), {dt: 1 / 60});
  eq(names(sv.state), [], 'over the home pad the yard is not drawn');
  sv.update(run([], [2, 2, 0]), {dt: 1 / 60});
  eq(names(sv.state), ['crate-food', 'crate-medicine'], 'back over the yard they are there');
  sv.update(run([], [2, 2, 2], {kind: null}), {dt: 1 / 60});
  eq(names(sv.state), ['crate-food', 'crate-medicine'], 'after the run ends they stay while this course is flown');
  sv.update(run([], [0, 0, 0], {id: 'supply-2'}), {dt: 1 / 60});
  eq(names(sv.state), [], 'a new rescue starts with an empty yard');
  sv.update(run([], [2, 0, 0], {id: 'supply-2'}), {dt: 1 / 60});
  eq(names(sv.state), [], 'nothing is remembered that was not seen at rest');
  await ready(sv, () => run([food], [2, 0, 0], {id: 'supply-3'}), ['crate-food']);
  sv.update({heli, courseId: 'tremblant-snow'}, {dt: 1 / 60});
  sv.update(run([], [2, 0, 0], {id: 'supply-3'}), {dt: 1 / 60});
  eq(names(sv.state), [], 'leaving the helicopter view forgets them');
  // A crate still on the line is not "set down".
  await ready(sv, () => run([{...food, hooked: true, onGround: false}], [1, 0, 0], {id: 'supply-4'}), ['crate-food']);
  sv.update(run([], [1, 0, 0], {id: 'supply-4'}), {dt: 1 / 60});
  eq(names(sv.state), [], 'a crate on the line is not left behind');
  sv.dispose();
}

// ---- The handover: the paramedics come for a person set down ---------------------------------
for (const [condition, look] of [[0, 'walk'], [1, 'limp'], [2, 'stretcher']]) {
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  const sites = {slide, beacon};
  const carrying = () => viewOf({line: lineAt(120, 150, {who: 'pair', onGround: false, y: hill(120, 150) + 10}), active: active('avalanche', {stage: 'carry', condition}, sites)});
  const set = () => viewOf({line: lineAt(120, 150, {who: 'rescuer', done: true, onGround: true, y: hill(120, 150) + 1.3})});
  await ready(view, carrying, ['pair']);
  eq(view.state.handover, null, `${look}: nothing yet while they hang`);
  view.update(set(), {dt: 1 / 60});
  eq(view.state.handover?.look, look, `${look}: the handover begins when the rescue is over`);
  await wait(() => view.modelStatus('paramedic-1') === 'ready' && view.modelStatus('paramedic-2') === 'ready' && view.modelStatus(stretcherOr(look)) === 'ready');
  view.update(set(), {dt: 1 / 60});
  ok(['medic-1', 'medic-2', 'casualty'].every(name => names(view.state).includes(name)), `${look}: two paramedics and the casualty`);
  eq(names(view.state).includes('stretcher'), look === 'stretcher', `${look}: ${look === 'stretcher' ? 'on a stretcher' : 'on foot'}`);
  const casualty = view.state.actors.find(item => item.name === 'casualty').key;
  eq(casualty, look === 'stretcher' ? 'driver-lying' : 'skier-standing', `${look}: the right person model`);
  // They arrive from 13 m away, walking.
  const first = view.object('medic-1');
  const far = Math.hypot(first.position.x - 120, first.position.z - 150);
  view.update(set(), {dt: HANDOVER.approach});
  const close = Math.hypot(view.object('medic-1').position.x - 120, view.object('medic-1').position.z - 150);
  ok(far > 10 && close < 5, `${look}: they walk in (${far.toFixed(1)} m, then ${close.toFixed(1)} m)`);
  view.update(set(), {dt: HANDOVER.leave + .5});
  eq(view.state.handover, null, `${look}: and take the person away`);
  eq(names(view.state).filter(name => name !== 'line'), [], `${look}: leaving only the rescuer`);
  view.dispose();
}
function stretcherOr(look) { return look === 'stretcher' ? 'stretcher' : 'paramedic-1'; }
{
  // Failing in the air (or any end with the pair off the ground) brings no paramedics.
  const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  await ready(view, () => viewOf({line: lineAt(1, 1, {who: 'pair'}), active: active('hoist', {stage: 'carry'}, {driver: {x: 3, z: 3, y: 1}, car: {x: 1, z: 1, y: 1, heading: 0}})}), ['pair']);
  view.update(viewOf({line: lineAt(1, 1, {who: 'rescuer', done: true, onGround: false})}), {dt: 1 / 60});
  eq(view.state.handover, null, 'a pair lost in the air: no handover');
  view.dispose();
}

// ---- The same view and the same frames draw the same ------------------------------------------
{
  const run = async () => {
    const scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
    const make = () => viewOf({active: active('hiker', {}, {lastSeen: {x: 90, z: 20}, clearing: {x: 40, z: 60, y: hill(40, 60), radius: 12}, hiker: {x: 55, z: 50, arrived: false}, flareLeft: 40, aboard: false})});
    await ready(view, make, ['hiker-walking'], 1);
    for (let i = 0; i < 90; i++) view.update(make(), {dt: 1 / 30});
    const points = view.group.children.find(child => child.isPoints && child.renderOrder === 2).geometry.attributes.position.array.slice(0, 48);
    const h = view.object('hiker');
    const out = [Array.from(points), h.position.toArray(), h.rotation.toArray().slice(0, 3)];
    view.dispose();
    return out;
  };
  const a = await run(), b = await run();
  eq(a.map(part => part.map(n => typeof n === 'number' ? Math.round(n * 1e4) / 1e4 : n)), b.map(part => part.map(n => typeof n === 'number' ? Math.round(n * 1e4) / 1e4 : n)), 'two runs, the same frame');
}

// ---- The instruments --------------------------------------------------------------------------
{
  const waiting = {rescue: {call: {kind: 'avalanche', courseId: 'tremblant-snow', courseName: 'Tremblant Snow', answerLeft: 12.2}, active: null, line: null, crates: []}};
  ok(rescueLineMarkup(waiting).includes('RESCUE CALL</b> Avalanche at Tremblant Snow · <kbd>R</kbd> answer now · 13 s'), 'R: answer now, with the seconds left');
  ok(rescueLineMarkup({rescue: {...waiting.rescue, call: {...waiting.rescue.call, answerLeft: 0}}}).includes('RESCUE CALL WAITING'), 'then waiting');
  // A rescue call rings through the fire engine: the fire line must not call it a fire.
  const ringing = {heli: {}, fire: {call: {kind: 'avalanche', id: 'avalanche-1', courseId: 'tremblant-snow', answered: false}, answerLeft: 12, courseName: 'Tremblant Snow'}};
  eq(fireLineMarkup(ringing), '', 'a rescue call is not a FIRE CALL');
  eq(fireLineMarkup({heli: {}, fire: {...ringing.fire, call: {...ringing.fire.call, answered: true}}}), '', 'nor an answered fire');
  ok(fireLineMarkup({heli: {}, fire: {call: {kind: 'fire', id: 'f', courseId: 'x', answered: false}, answerLeft: 9}}).includes('FIRE CALL'), 'a real fire call still rings');
  const mission = (extra = {}, rescue = {}) => ({rescue: {call: null, crates: [], line: null, active: active('hoist', extra), ...rescue}});
  const line = rescueLineMarkup(mission({left: 580}));
  ok(line.includes('RESCUE 120° 0.6 km · 9:40'), `the mission line: ${line}`);
  ok(!line.includes(' late'), 'white until the last minute');
  ok(rescueLineMarkup(mission({left: 59.5, orange: true})).includes('heli-rescue-line late'), 'orange in the last minute');
  ok(rescueLineMarkup(mission({left: 59.5, orange: true})).includes('1:00'), 'rounded up to the whole second');
  ok(rescueLineMarkup(mission({here: false, target: null, left: 400})).includes('RESCUE AT TREMBLANT SNOW · 6:40'), 'elsewhere: where the rescue is');
  // The beacon: a bar that shrinks with the square of the distance, "no signal" out of range, no number.
  const beaconView = (signal, stage = 'fly') => rescueLineMarkup({rescue: {call: null, crates: [], line: null, active: active('avalanche', {signal, stage})}});
  ok(beaconView({heard: true, bar: .25, interval: 1, pitch: 1000}).includes('width:25%'), 'a quarter of the bar at 30 m');
  ok(beaconView({heard: true, bar: 1, interval: .15, pitch: 1400}).includes('width:100%'), 'full on top of it');
  ok(beaconView({heard: false, bar: 0, interval: null, pitch: null}).includes('NO SIGNAL'), 'out of range: no signal');
  ok(!/[0-9] m\b/.test(beaconView({heard: true, bar: .4, interval: 1, pitch: 1000}).replace(/RESCUE[^<]*/, '')), 'no distance number');
  ok(!beaconView({heard: false, bar: 0, interval: null, pitch: null}, 'carry').includes('BEACON'), 'carrying the skier: no beacon');
  // Hold bar, crates, condition.
  ok(rescueLineMarkup(mission({}, {line: lineAt(0, 0, {holding: true, hold: .5})})).includes('HOLD STEADY</em><b><i style="width:50%"'), 'the hoist hold');
  ok(rescueLineMarkup({rescue: {call: null, crates: [], line: lineAt(0, 0, {holding: true, hold: .25}), active: active('avalanche', {signal: null})}}).includes('DIGGING'), 'the avalanche dig');
  ok(rescueLineMarkup({rescue: {call: null, crates: [], line: null, active: active('supply', {cratesDown: 1, crates: [2, 0, 0]})}}).includes('CRATES 1/3'), 'crates delivered');
  ok(rescueLineMarkup(mission({condition: 1})).includes('HURT') && rescueLineMarkup(mission({condition: 2})).includes('BADLY HURT'), 'the casualty\'s condition');
  ok(!rescueLineMarkup(mission({condition: 0})).includes('HURT'), 'unhurt says nothing');
  ok(instrumentsMarkup({heli: {}, readout: {altitudeFt: 1, altitudeM: 1, heightFt: 1, heightM: 1, airspeedKts: 1, climbFpm: 0, climbMs: 0, rotorPct: 100, fuelKg: 100, weightKg: 1000, maxLiftKg: 1500, headingDeg: 0, pitchDeg: 0, rollDeg: 0, engine: true},
    ...mission({left: 580})}).includes('RESCUE 120°'), 'the instruments carry the mission line');
  eq([duskShare(mission({dusk: 0})), duskShare(mission({dusk: .4})), duskShare(mission({dusk: 3}))], [0, .4, 1], 'dusk from 0 to 1');
  // Notices.
  eq(noticeText({type: 'rescueCall', kind: 'hiker', courseId: 'tremblant-woods'}), 'Lost hiker reported at Tremblant Woods', 'call notice');
    eq(noticeText({type: 'rescueDone', paid: 1200, firstBadge: true}), 'Rescue done: 1,200 credits and the rescue badge', 'done notice');
  // HELI-PAY-CONTINUE: with the balance the result line also says what the player has now.
  eq(noticeText({type: 'rescueDone', paid: 3500, firstBadge: false, balance: 9000}), 'Rescue done: 3,500 credits. You now have 9,000.', 'done notice with the balance');
  eq(noticeText({type: 'rescueFailed', reason: 'time', charged: 400}), 'Rescue failed, out of time: 400 credits', 'failed notice');
  eq(noticeText({type: 'crateDown', pay: 300}), 'Crate down: 300 credits', 'crate notice');
  eq(noticeText({type: 'hikerSpotted'}), 'Flare sighted', 'flare notice');
}

// ---- Performance has half the chunks and sprites; the cameras frame the rescuer like a car on the hook ----
{
  const slideView = () => viewOf({line: null, active: active('avalanche', {signal: null}, {slide, beacon})});
  const hikerView = () => viewOf({active: active('hiker', {}, {lastSeen: {x: 90, z: 20}, clearing: {x: 40, z: 60, y: hill(40, 60), radius: 12}, hiker: {x: 55, z: 50, arrived: true}, flareLeft: 40, aboard: false})});
  const run = async (quality, make, keys = []) => {
    const view = createRescueView({THREE, scene: new THREE.Scene(), load, quality});
    await ready(view, make, keys, 2);
    const state = view.state;
    view.dispose();
    return state;
  };
  const high = await run('high', slideView), low = await run('performance', slideView);
  eq([high.debris, low.debris], [RESCUE_LIMITS.high.debris, RESCUE_LIMITS.performance.debris], 'Performance: half the chunks');
  const flareHigh = await run('high', hikerView, ['hiker-standing']), flareLow = await run('performance', hikerView, ['hiker-standing']);
  ok(flareLow.sprites <= RESCUE_LIMITS.performance.sprites * 2 && flareLow.sprites < flareHigh.sprites, `Performance: fewer sprites (${flareLow.sprites} against ${flareHigh.sprites})`);
  const switching = createRescueView({THREE, scene: new THREE.Scene(), load});
  await ready(switching, slideView, []);
  switching.setQuality('performance'); switching.update(slideView(), {dt: 1 / 60});
  eq(switching.state.debris, RESCUE_LIMITS.performance.debris, 'the quality can change while flying');
  switching.dispose();

  const scene = new THREE.Scene();
  const heliView = createHeliView({THREE, scene, vehicleAssets: {status: () => 'error', load: () => Promise.resolve(false), create: () => null},
    load: () => new Promise(() => {}), fireLoad: load, rescueLoad: load});
  const flying = extra => ({heli: {x: 0, y: 70, z: 0, heading: 0, pitch: 0, roll: 0, vx: 0, vy: 0, vz: 0, rotor: 1, onGround: false}, courseId: 'tremblant-snow', loads: [], zone: null, ...extra});
  const back = pose => Math.hypot(pose.camera.position.x, pose.camera.position.z);
  const bare = back(heliView.update(flying({}))), withLine = back(heliView.update(flying({rescue: viewOf({line: lineAt(0, 15)}).rescue})));
  ok(withLine > bare + 10, `the behind camera stands further back for a rescuer on the line (${bare.toFixed(0)} m, then ${withLine.toFixed(0)} m)`);
  heliView.fire.setQuality('performance');
  eq(heliView.rescue.quality, 'performance', 'the rescue drawing follows the quality the game sets');
  heliView.dispose();
}

// ---- The destination buttons: the session's list when it gives one (Summit Run on), else the usual three ----
{
  const flying = extra => ({heli: {onGround: false, x: 0, z: 0, fuelKg: 300}, courseId: 'tremblant-woods', zone: null, destination: null, ...extra});
  const buttons = markup => [...markup.matchAll(/data-heli-destination="([a-z-]+)"/g)].map(m => m[1]);
  eq(buttons(controlsMarkup(flying({}))), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'no list: the usual three buttons');
  eq(buttons(controlsMarkup(flying({destinations: undefined}))), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'an absent list: the usual three');
  const four = controlsMarkup(flying({destinations: ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run']}));
  eq(buttons(four), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'], 'with Summit Run on: a fourth button');
  ok(four.includes('Summit Run'), 'named Summit Run');
  ok(controlsMarkup(flying({destinations: ['tremblant-woods', 'summit-run', 'nowhere'], destination: 'summit-run', cruiseOffered: true})).includes('cruise to Summit Run'), 'the cruise prompt names it');
  eq(noticeText({type: 'entered', courseId: 'summit-run', arrived: true}), 'Summit Run: the landing zone is ahead', 'and the notice');
}

// ---- The real session: its rescue view draws, and Later is said once -------------------------
{
  const worlds = new Map();
  const loadCourse = id => {
    if (!worlds.has(id)) { const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989); worlds.set(id, {course, ground: groundFromCourse(course)}); }
    return worlds.get(id);
  };
  const on = {enabled: true};
  const profile = normalizeProfile({...createProfile(), credits: 2000, courses: {version: 1, unlocked: ['tremblant-woods']},
    heli: {version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}, refuels: 3, playDay: {last: '2026-10-20', count: 30}}});
  const armed = armMissions(createMissions(), {date: '2026-10-14', playerName: 'View QA'});
  const call = {kind: 'hiker', id: `hiker-${armed.draws}`, courseId: 'tremblant-woods', day: 30, answered: false};
  const saved = setMissions(profile, {...armed, count: armed.need, call}, on).profile;
  const make = (rescueEnabled = true) => createHeliSession({profile: saved, enabled: true, loadCourse, loadFireCourse: loadCourse, fireEnabled: true, rescueEnabled,
    playerName: 'View QA', today: '2026-10-20', carId: 'falcone_f42', mode: 'assisted'});
  const session = make();
  session.start();
  const before = session.view();
  ok(typeof before.rescue.ground === 'function' && Math.abs(before.rescue.ground(before.zone.x, before.zone.z) - before.zone.y) < .5, 'the session hands the drawing the course\'s ground');
  eq(before.rescue.call.kind, 'hiker', 'the call is waiting');
  const lines = events => events.filter(event => event.type === 'radio' && event.line === 'heli.radio.rescue.later').length;
  const said = [];
  said.push(session.declineCall()); said.push(...[session.declineCall(), session.declineCall()]);
  eq(said, [true, false, false], 'Later says so the first time and then nothing is left to put off');
  eq(lines(session.takeEvents()), 1, 'Roger says it once for the call');
  ok(session.pressRadio(), 'R still answers it');
  // Fit the line and draw the real view.
  session.fitRescueLine(); session.takeEvents();
  for (let i = 0; i < 240; i++) session.step({lift: .2});
  const v = session.view(), scene = new THREE.Scene(), view = createRescueView({THREE, scene, load});
  await ready(view, () => session.view(), ['rescuer']);
  eq(view.state.actors.map(item => item.key), ['rescuer'], 'the real view draws the rescuer on the line');
  ok(v.rescue.active.sites.lastSeen && view.state.searchRing, 'and the hiker\'s search ring');
  // The switch off: no rescue part in the view at all.
  const off = make(false);
  off.start();
  ok(!('rescue' in off.view()), 'with the switch off the session gives no rescue view');
  view.dispose();
}

console.log(`test-rescue-view: ${checks} checks passed`);

for (const [reason, words] of [['lifted', 'lifted off'], ['dragged', 'moving too fast'], ['away', 'too far away']]) {
  const message = noticeText({type: 'holdReset', reason});
  ok(message.includes(words) && message.length > 40, `hold reset explains ${reason} and how to retry`);
}

{
  const base = {courseId: 'summit-run', heli: {onGround: true, fuelKg: 170}, rescue: {active: {sites: {atTruck: true}}}};
  const html = controlsMarkup(base, {credits: 1000, refuels: 3});
  ok(html.includes('data-heli-fuel="fill"') && html.includes('data-heli-fuel="target"'), 'Summit truck offers fill and target buttons');
  ok(!controlsMarkup(base, {credits: 1000, refuels: 0}).includes('FREE FIRST TANK'), 'the truck never advertises a free first tank');
  for (const kg of [190, 230, 330, 360, 400]) ok(html.includes(`value="${kg}"`), `truck target includes ${kg} kg`);
  ok(!controlsMarkup({...base, heli: {...base.heli, onGround: false}}).includes('data-heli-fuel'), 'no truck refuelling in the air');
  ok(!controlsMarkup({...base, rescue: {active: {sites: {atTruck: false}}}}).includes('data-heli-fuel'), 'no truck refuelling away from its circle');
}

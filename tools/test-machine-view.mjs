import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {createMachineState} from '../src/machines/machine.js';
import {createMachineView, MACHINE_SOUND_CUES} from '../src/machines/view.js';
import {MACHINE_CAMERA_MODES, updateMachineCamera} from '../src/machines/camera.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createDrillView} from '../src/machines/drill-view.js';
import {ROAD_MACHINE_SEATS, roadMachineModel, machinePart} from '../src/machines/roads-view.js';
import {updateBorerCamera} from '../src/machines/dig-game.js';

const definition = machineDefinition('excavator');
const model = new THREE.Group();
// GLTFLoader removes ':' from names, as a loaded model has them.
for (const name of ['excavatorcab', 'excavatorboom', 'excavatorarm', 'excavatorbucket']) {
  const node = new THREE.Group(); node.name = name; model.add(node);
}
const soundEvents = [];
const scene = new THREE.Scene();
const view = createMachineView({model, definition, parent:scene, onSound:(cue, detail) => soundEvents.push({cue, detail})});
const state = createMachineState(definition, {x:4, z:8, heading:Math.PI / 2});
const before = structuredClone(state);
state.jointAngles.house = 0.5;
state.speedMps = 1;
state.load.gravel = 0.3;
state.jointSpeeds.boom = 0.4;
const frame = view.update(state, 1 / 60, [{type:'dirt-plume', x:4, z:8}]);
assert.equal(view.root.position.x, 4);
assert.equal(view.root.position.z, 8);
assert.equal(-view.body.getObjectByName('excavatorcab').quaternion.y, Math.sin(0.25));
assert.equal(view.root.rotation.y, Math.PI / 2, 'model heading follows the simulation forward axis');
assert.ok(frame.toolPositions.bucket);
assert.equal(view.root.getObjectByName('machine-load').visible, true);
assert.ok(view.root.getObjectByName('machine-exhaust').visible);
assert.ok(soundEvents.some(item => item.cue === MACHINE_SOUND_CUES.dig));
assert.ok(soundEvents.some(item => item.cue === MACHINE_SOUND_CUES.engine));
assert.ok(soundEvents.some(item => item.cue === MACHINE_SOUND_CUES.hydraulic), 'a moving joint is heard');
for (const cue of Object.values(MACHINE_SOUND_CUES)) {
  assert.ok(SOUND_BANK[cue], `${cue} exists in the sound bank, so playing it cannot stop the game`);
  assert.equal(SOUND_BANK[cue].flag, 'the-dig', `${cue} is available when the Dig is enabled without the town`);
}
state.x += 0.5;
view.update(state, 1 / 60);
assert.ok(scene.getObjectByName('machine-track-marks').children.some(mark => mark.visible), 'moving tracks leave marks on the ground');
assert.deepEqual(MACHINE_SOUND_CUES, {engine:'machine.engine', hydraulic:'machine.hydraulic', dig:'machine.dig', tip:'machine.tip'});
assert.deepEqual(before.jointAngles, createMachineState(definition, {x:4, z:8, heading:Math.PI / 2}).jointAngles, 'view reads state and never writes simulation state');

const camera = new THREE.PerspectiveCamera();
for (const mode of MACHINE_CAMERA_MODES) {
  const result = updateMachineCamera(camera, definition, state, mode);
  assert.equal(result.mode, mode);
  assert.ok(Number.isFinite(camera.position.x) && Number.isFinite(camera.position.y) && Number.isFinite(camera.position.z));
}
const obstruction = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 10), new THREE.MeshBasicMaterial());
obstruction.position.set(state.x, 4, state.z); obstruction.updateMatrixWorld(true);
updateMachineCamera(camera, definition, state, 'cab', {body:obstruction});
const ray = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()), 0, 3);
assert.equal(ray.intersectObject(obstruction).length, 0, 'cab view clears the posed machine');
assert.ok(camera.position.y > 8, 'cab eye rises above the model');
const straight = new THREE.PerspectiveCamera();
updateMachineCamera(straight, definition, state, 'chase');
updateMachineCamera(camera, definition, state, 'chase', {chaseOrbit:35 * Math.PI / 180});
assert.ok(camera.position.distanceTo(straight.position) > 1, 'excavator chase view moves to one side');
assert.equal(updateMachineCamera(camera, definition, state, 'unknown').mode, 'chase');
assert.equal(state.x, before.x + 0.5, 'camera and view leave machine position unchanged');

async function asset(name) {
  const bytes = readFileSync(new URL(`../public/assets/models/wasteland/town/${name}.glb`, import.meta.url));
  const loader = new GLTFLoader();
  loader.register(() => ({name:'HEADLESS_TEXTURE', loadTexture:() => Promise.resolve(new THREE.Texture())}));
  return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
const family = await asset('machines-1'), secondFamily = await asset('machines-2'), borer = await asset('borer');
for (const id of ['excavator', 'dumpTruck', 'trencher', 'drill', 'dozer', 'borer']) {
  const def = machineDefinition(id);
  // The drill rig is the truck with a lattice mast in the second family of machines.
  const source = (id === 'borer' ? borer : id === 'drill' ? secondFamily : family).getObjectByName(id === 'dumpTruck' ? 'dump-truck' : id === 'drill' ? 'drill-rig' : id);
  assert.ok(source, `${id} model exists`);
  let model = source.clone(true); model.position.set(0, 0, 0);
  if (id === 'borer') {
    model.scale.setScalar(.6); model.rotation.y = Math.PI; model.position.z = -15.45 * .6;
    const wrapper = new THREE.Group(); wrapper.add(model); model = wrapper;
  } else if (id === 'drill') model = createDrillView(model).root;
  const machine = createMachineView({model, definition:def, parent:scene});
  const posed = createMachineState(def, {x:4, z:8, heading:0.7});
  machine.update(posed, 0); scene.updateMatrixWorld(true);
  if (id === 'borer') updateBorerCamera(camera, posed, 1, {}, 0, true, machine.body);
  else updateMachineCamera(camera, def, posed, 'cab', {body:machine.body});
  const bounds = new THREE.Box3().setFromObject(machine.body);
  assert.ok(camera.position.y > bounds.max.y, `${id} eye is above its model`);
  const ahead = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()), 0, 3);
  assert.equal(ahead.intersectObject(machine.body, true).length, 0, `${id} cab view clears its model`);
  machine.dispose();
}
// The road machines say where their driver sits, so that the tool the driver works is in the picture.
const gameCamera = new THREE.PerspectiveCamera(55, 16 / 9, .1, 900);
for (const [id, tool] of [['dozer', 'dozer:blade'], ['roller', 'roller:drum'], ['paver', 'paver rigid assembly']]) {
  const def = machineDefinition(id);
  const source = (id === 'dozer' ? family : secondFamily).getObjectByName(id);
  assert.ok(source, `${id} model exists`);
  let model = source.clone(true); model.position.set(0, 0, 0);
  if (id !== 'dozer') model = roadMachineModel(model);
  const machine = createMachineView({model, definition:def, parent:scene});
  const posed = createMachineState(def, {x:4, z:8, heading:0.7});
  machine.update(posed, 0); scene.updateMatrixWorld(true);
  updateMachineCamera(gameCamera, def, posed, 'cab', {body:machine.body, seat:ROAD_MACHINE_SEATS[id]});
  gameCamera.updateMatrixWorld(true);
  const eye = new THREE.Raycaster(gameCamera.position, gameCamera.getWorldDirection(new THREE.Vector3()), 0, 1);
  assert.equal(eye.intersectObject(machine.body, true).length, 0, `${id} seat is clear of its model`);
  // Somewhere in the lower half of the picture, the tool is the first thing the eye meets.
  const part = machinePart(machine.body, tool), look = new THREE.Raycaster();
  const seen = [-.6, -.3, 0, .3, .6].flatMap(x => [-.9, -.7, -.5, -.3, -.1].map(y => new THREE.Vector2(x, y))).some(point => {
    look.setFromCamera(point, gameCamera);
    let node = look.intersectObject(machine.body, true)[0]?.object;
    while (node && node !== part) node = node.parent;
    return node === part;
  });
  assert.ok(seen, `${id} driver can see the ${tool}`);
  machine.dispose();
}
view.dispose();
assert.equal(view.root.parent, null);
console.log('Machine view passed: named joints, load, effects, sound cues, read-only state and cab/chase/work cameras.');

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {machineDefinition} from '../src/machines/content/machines.js';
import {createMachineState} from '../src/machines/machine.js';
import {createMachineView, MACHINE_SOUND_CUES} from '../src/machines/view.js';
import {MACHINE_CAMERA_MODES, updateMachineCamera} from '../src/machines/camera.js';

const definition = machineDefinition('excavator');
const model = new THREE.Group();
for (const name of ['House', 'Boom', 'Arm', 'Bucket']) {
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
const frame = view.update(state, 1 / 60, [{type:'dirt-plume', x:4, z:8}]);
assert.equal(view.root.position.x, 4);
assert.equal(view.root.position.z, 8);
assert.equal(view.body.getObjectByName('House').quaternion.y, Math.sin(0.25));
assert.equal(view.root.rotation.y, Math.PI / 2, 'model heading follows the simulation forward axis');
assert.ok(frame.toolPositions.bucket);
assert.equal(view.root.getObjectByName('machine-load').visible, true);
assert.ok(view.root.getObjectByName('machine-exhaust').visible);
assert.ok(soundEvents.some(item => item.cue === MACHINE_SOUND_CUES.dig));
assert.ok(soundEvents.some(item => item.cue === MACHINE_SOUND_CUES.engine));
state.x += 0.5;
view.update(state, 1 / 60);
assert.ok(scene.getObjectByName('machine-track-marks').children.some(mark => mark.visible), 'moving tracks leave marks on the ground');
assert.deepEqual(MACHINE_SOUND_CUES, {engine:'machine.engine', hydraulic:'machine.hydraulic', dig:'machine.dig', tip:'machine.tip'});
assert.deepEqual(before.jointAngles, Object.fromEntries(Object.keys(before.jointAngles).map(key => [key, 0])), 'view reads state and never writes simulation state');

const camera = new THREE.PerspectiveCamera();
for (const mode of MACHINE_CAMERA_MODES) {
  const result = updateMachineCamera(camera, definition, state, mode);
  assert.equal(result.mode, mode);
  assert.ok(Number.isFinite(camera.position.x) && Number.isFinite(camera.position.y) && Number.isFinite(camera.position.z));
}
assert.equal(updateMachineCamera(camera, definition, state, 'unknown').mode, 'chase');
assert.equal(state.x, before.x + 0.5, 'camera and view leave machine position unchanged');
view.dispose();
assert.equal(view.root.parent, null);
console.log('Machine view passed: named joints, load, effects, sound cues, read-only state and cab/chase/work cameras.');

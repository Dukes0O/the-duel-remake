import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRoadLook} from '../src/world/scablands-ground-look.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {TIN_TOWN_GATE as gate} from '../src/world/tin-town-gate.js';
import {gatePageSource} from './scenarios/tin-town-gate-road.mjs';
import {pageSource as job2} from './scenarios/everburn-job2.mjs';

function compile(options) {
  const material = createRoadLook(options).apply(new THREE.MeshStandardMaterial());
  const shader = {...THREE.ShaderLib.standard, uniforms: {}};
  material.onBeforeCompile(shader);
  return {material, shader, key: material.customProgramCacheKey()};
}

const plain = compile({});
const dryGate = compile({gate});
assert.equal(dryGate.key, plain.key);
assert.equal(dryGate.shader.vertexShader, plain.shader.vertexShader);
assert.equal(dryGate.shader.fragmentShader, plain.shader.fragmentShader);
assert.ok(!('uRoadGate' in dryGate.shader.uniforms), 'the gate requires the photo-road preview');

const photo = {map: new THREE.Texture(), normal: new THREE.Texture(), mean: new THREE.Vector3(.32, .23, .15), size: 2};
const control = compile({photo});
const trial = compile({photo, gate});
assert.ok(!('uRoadGate' in control.shader.uniforms), 'an ordinary photo road still has its own program');
assert.notEqual(trial.key, control.key);
assert.equal(trial.shader.vertexShader, control.shader.vertexShader);
assert.notEqual(trial.shader.fragmentShader, control.shader.fragmentShader);
assert.deepEqual(trial.shader.uniforms.uRoadGate.value.toArray(), [gate.x, gate.z, gate.through.x, gate.through.z]);
for (const name of Object.keys(control.shader.uniforms)) {
  const original = control.shader.uniforms[name].value;
  const candidate = trial.shader.uniforms[name].value;
  if (original.isColor) assert.ok(candidate.equals(original));
  else assert.equal(candidate, original, 'shared road input ' + name);
}
assert.deepEqual(Object.keys(trial.shader.uniforms).sort(), [...Object.keys(control.shader.uniforms), 'uRoadGate'].sort());
assert.equal(trial.material.transparent, true);
assert.equal(trial.material.depthWrite, false, 'the ribbon keeps its soft shoulder');

// Rotating or moving the gate uses the same compiled program, with a new world-space transform.
const rotated = compile({photo, gate: {x: 61, z: -38, through: {x: .6, z: .8}}});
assert.equal(rotated.key, trial.key);
assert.equal(rotated.shader.fragmentShader, trial.shader.fragmentShader);
assert.deepEqual(rotated.shader.uniforms.uRoadGate.value.toArray(), [61, -38, .6, .8]);

// The ribbon being shaded is the road Bess actually uses up to the threshold.
for (const metres of [0, 5, 20, 42, 48]) {
  const here = ROAD_NET.nearest(gate.x - metres * gate.through.x, gate.z - metres * gate.through.z);
  assert.equal(here?.road.id, 'east-road', 'the gate approach lies on East Road at ' + metres + ' m');
  assert.ok(here.distance < .05, 'the wheel impressions follow its centre');
}
for (const expression of [...['ready', 'prepare', 'yard', 'start', 'loaded'].map(name => job2(name)),
  gatePageSource('place', 48), gatePageSource('drive')]) {
  assert.doesNotThrow(() => new Function('return ' + expression));
}
console.log('Tin Town road material controls, gate transforms and East Road approach passed.');

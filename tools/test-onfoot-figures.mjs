import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOnFootFigures, MAX_FIGHTER_FIGURES} from '../src/onfoot-figures.js';
import {createCombatScene} from '../src/combat-scene.js';

const figures = createOnFootFigures();
const meshes = Object.values(figures.meshes);
const fighter = (index = 0) => ({x: index * 3, y: 2, z: 20,
  yaw: 0, steps: 0, airHeight: 0, knockedDown: false});
const local = fighter(11);
const roster = [...Array.from({length: 11}, (_, index) => ({fighter: fighter(index)})),
  {fighter: local, local: true}];
const position = (mesh, index) => {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  mesh.getMatrixAt(index, matrix);
  return point.setFromMatrixPosition(matrix);
};

assert.equal(MAX_FIGHTER_FIGURES, 12);
assert.equal(figures.update(roster, {active: true}), 12);
assert.equal(figures.drawCallBudget, 4);
assert.ok(meshes.every(mesh => mesh.isInstancedMesh && mesh.count <= mesh.instanceMatrix.count));
assert.ok(meshes.length <= 16, 'twelve fighters stay below the draw-call ceiling');
assert.ok(Math.abs(position(figures.meshes.joints, 11 * 5).y - 3.56) < .01,
  'standing head follows the fighter ground position');

const nearEye = new THREE.PerspectiveCamera();
nearEye.position.set(local.x, local.y + 1.62, local.z);
for (const mesh of meshes) {
  mesh.onBeforeRender(null, null, nearEye);
  assert.equal(mesh.count, 11 * (mesh.instanceMatrix.count / 12),
    'first-person camera omits only the local fighter');
}
nearEye.position.set(local.x + 4, local.y + 1.62, local.z);
for (const mesh of meshes) {
  mesh.onBeforeRender(null, null, nearEye);
  assert.equal(mesh.count, mesh.instanceMatrix.count,
    'distant mirror or photo camera retains all twelve figures');
}

local.y += 1.1; local.airHeight = 1.1;
figures.update(roster, {active: true});
assert.ok(Math.abs(position(figures.meshes.joints, 11 * 5).y - 4.66) < .01,
  'jump moves the complete figure with the fighter');
local.y = 2; local.airHeight = 0; local.yaw = Math.PI / 2;
figures.update(roster, {active: true});
assert.ok(position(figures.meshes.plates, 11 * 12 + 4).x < local.x - .2,
  'backpack turns with fighter yaw');
local.knockedDown = true;
figures.update(roster, {active: true});
assert.ok(position(figures.meshes.joints, 11 * 5).y < local.y + .7,
  'knockdown lays the helmet close to the ground');

figures.update(roster, {active: false});
assert.equal(figures.group.visible, false);
assert.ok(meshes.every(mesh => mesh.count === 0), 'flag-off and ordinary races draw no figures');
figures.dispose();
const scene=createCombatScene();
const duel={state:{status:'racing',mode:'wasteland',onFoot:true,fighter:local,
  combat:{pickups:[],projectiles:[],bursts:[]},opponents:[]},
  featureFlags:{enabled:()=>false}};
scene.update(duel);
assert.equal(scene.onFootFigures.group.visible,false,
  'the scene hook keeps the local figure hidden with the feature switch off');
duel.state.mode='duel';scene.update(duel);
assert.equal(scene.onFootFigures.group.visible,false,
  'ordinary race mode never shows a fighter figure');
scene.dispose();
console.log('On-foot figures: twelve pooled poses, jump, yaw, knockdown, first-person hide and four draw calls pass.');

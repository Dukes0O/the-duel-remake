import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSmokeCloud, smokeVisualOpacity, smokeHazeOpacity} from '../src/combat-effects.js';

const cloud = {kind:'smoke', x:0, y:0, z:0, radius:6, age:0, lifetime:5, opacity:1};
assert.equal(smokeVisualOpacity(cloud), 1);
assert.equal(smokeVisualOpacity({...cloud, age:4}), 1);
assert.equal(smokeVisualOpacity({...cloud, age:4.5}), .5);
assert.equal(smokeVisualOpacity({...cloud, age:5}), 0);
assert.equal(smokeVisualOpacity({...cloud, age:1, opacity:.2}), 1, 'visual fade is independent of gameplay opacity');
assert.ok(smokeHazeOpacity([cloud], {x:0,y:2,z:0}) >= .9, 'camera inside gets heavy haze');
assert.equal(smokeHazeOpacity([cloud], {x:7,y:2,z:0}), 0);
assert.equal(smokeHazeOpacity([cloud], {x:0,y:5,z:0}), 0);
assert.equal(smokeHazeOpacity([{...cloud,age:5}], {x:0,y:2,z:0}), 0);
const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 3, 15); camera.lookAt(0, 2, 0);
const view = createSmokeCloud();
const before = JSON.stringify(cloud);
view.update(cloud, camera);
assert.equal(JSON.stringify(cloud), before, 'presentation does not edit hazard rules');
assert.ok(view.mesh.isInstancedMesh && view.mesh.count <= 32, 'one bounded draw per smoke cloud');
assert.ok(view.mesh.material.isMeshStandardMaterial, 'puffs use scene lighting');
assert.equal(view.mesh.material.depthWrite, false);
view.update({...cloud,radius:2.5}, camera);
view.mesh.computeBoundingBox();
assert.ok(view.mesh.boundingBox.max.x <= 2.6 && view.mesh.boundingBox.min.x >= -2.6, 'Wren follows its native 2.5 metre radius');
assert.ok(view.mesh.boundingBox.max.y <= 4.2 && view.mesh.boundingBox.min.y >= -.2, 'cloud fills about four metres vertically');
const still = [...view.mesh.instanceMatrix.array];
const later = {...cloud,radius:2.5,age:1};
const laterBefore = JSON.stringify(later);
view.update(later,camera);
assert.notDeepEqual([...view.mesh.instanceMatrix.array],still,'puffs churn as native age advances');
assert.equal(JSON.stringify(later),laterBefore,'visual churn preserves hazard state');
for(const z of [15,-15]) {
  camera.position.set(0,3,z);camera.lookAt(0,2,0);view.faceCamera(camera);
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
  let prior = Infinity;
  for(let slot=0;slot<view.mesh.count;slot++) {
    view.mesh.getMatrixAt(slot,matrix);position.setFromMatrixPosition(matrix);
    const depth = position.dot(direction);
    assert.ok(depth<=prior+1e-6,'transparent puffs sort far-to-near for each camera');
    prior=depth;
  }
}
view.update({...cloud,age:5}, camera);assert.equal(view.mesh.visible,false);
const disposed = [];
for(const [label,resource] of [['instances',view.mesh],['geometry',view.mesh.geometry],['material',view.mesh.material]])
  resource.addEventListener('dispose',()=>disposed.push(label));
view.dispose();
assert.deepEqual(disposed.sort(),['geometry','instances','material'],'teardown releases every owned GPU resource');
console.log('Smoke polish: fade, haze, bounded shared puffs, Wren scale and state purity passed.');

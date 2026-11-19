import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {createGroundView} from '../src/world/ground-view.js';
import {createDigFx} from '../src/world/dig-fx.js';
import {createDigNearGround, staticYard} from '../src/machines/dig-game.js';
import {scablandsNaturalHeightAt} from '../src/world/scablands-ground.js';

const edits = createGroundEdit({region: {id: 'test', editable: true}, naturalHeight: () => 10});
const group = new THREE.Group(), view = createGroundView({group, groundEdit: edits});
assert.equal(view.update(), 0, 'an untouched ground makes no overlay chunks');
assert.equal(edits.cut({x: 3, z: 4, radius: 2}, 7).ok, true, 'editable ground accepts a cut');
assert.equal(view.update(), 1, 'a changed chunk gets a fine mesh');
const mesh = group.children[0];
assert.equal(mesh.name, 'Scablands edited ground 0,0');
assert.equal(mesh.geometry.attributes.position.count, 33 * 33 + 2 * 32 * 4, 'the mesh has its fine grid and skirt vertices');
assert.ok(mesh.geometry.attributes.color, 'fresh cut mesh uses material colours');
assert.ok(mesh.geometry.attributes.normal, 'the chunk has computed vertex normals');
const geometry = mesh.geometry;
assert.equal(view.update(), 0, 'unchanged chunks keep their geometry');
assert.equal(mesh.geometry, geometry);
edits.fill({x: 3, z: 4, radius: 1}, 'gravel', 10);
assert.equal(view.update(), 1, 'a changed chunk is refreshed');
assert.notEqual(mesh.geometry, geometry);
const effects = createDigFx({group, seed: 42});
assert.equal(effects.burst({x: 0, y: 3, z: 0, direction: {x: 1, z: 0}, strength: 2, material: 'gravel'}), 12);
assert.equal(effects.particleCount, 12);
effects.update(2);
assert.equal(effects.particleCount, 0, 'the effect releases particles after their short flight');
effects.dispose(); view.dispose();
assert.equal(group.children.length, 0, 'disposing the view and effects removes their meshes');
console.log('Ground view: sparse fine meshes, material colour, seam skirts, incremental refresh and seeded dig effects pass.');

// Use the same three meshes as the Dig, including an edit after they exist.
{
  const ground=createGroundEdit({region:{id:'yard',editable:true},naturalHeight:scablandsNaturalHeightAt});
  const scene=new THREE.Scene(), material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const floor=staticYard(scene,material,ground), near=createDigNearGround(material,ground);
  scene.add(near.mesh); near.follow(0,0);
  const overlay=new THREE.Group(); scene.add(overlay);
  const drawn=createGroundView({group:overlay,groundEdit:ground,material});
  ground.fill({x:31,z:5,radius:3},'topsoil',80);
  drawn.update();
  ground.fill({x:32,z:5,radius:2},'topsoil',40);
  ground.cut({x:-5,z:-5,radius:3},scablandsNaturalHeightAt(-5,-5)-2);
  drawn.update();
  for(const b of drawn.changedBounds) {
    const expanded={minX:b.minX-2,maxX:b.maxX+2,minZ:b.minZ-2,maxZ:b.maxZ+2};
    near.refreshBounds(expanded);
    const corners=floor.userData.refreshGround(expanded);
    assert.ok(corners<5000, `A local edit updates ${corners} floor normals.`);
  }
  const left=overlay.children.find(mesh=>mesh.userData.chunk.x===0 && mesh.userData.chunk.z===0);
  const right=overlay.children.find(mesh=>mesh.userData.chunk.x===1 && mesh.userData.chunk.z===0);
  assert.ok(left && right, 'The heap crosses a chunk border.');
  for(let z=0;z<=32;z++) assert.equal(left.geometry.attributes.position.getY(z*33+32),
    right.geometry.attributes.position.getY(z*33), `Shared edge height at ${z}.`);
  scene.updateMatrixWorld(true);
  let checked=0;
  for(const row of ground.toSave().chunks) for(let z=0;z<32;z++) for(let x=0;x<32;x++) {
    if(Math.abs(row.delta[z*32+x])<=.08) continue;
    for (const [dx,dz] of [[.5,.5],[0,0],[1,0],[0,1],[1,1]]) {
      const wx=row.x*32+x+dx,wz=row.z*32+z+dz;
      const ray=new THREE.Raycaster(new THREE.Vector3(wx,100,wz),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObjects([floor,near.mesh,overlay],true)[0];
      assert.ok(hit?.object.name.startsWith('Scablands edited ground'),`edited ground is visible at ${wx}, ${wz}`);
      checked++;
    }
  }
  assert.ok(checked>50,'heap and cut both provide more than ten changed cells, five rays each');
  drawn.dispose(); near.dispose(); floor.geometry.dispose(); material.dispose();
}

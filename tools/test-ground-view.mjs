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
// A heap is drawn as made ground where it stands, not at its mirror across the chunk's diagonal (DIG-YARD-TOY's pale ring:
// with the two swapped, a heap was drawn as bare rock with pale scree round its foot, and its spoil lay on the flat beside it).
{
  const heaped = createGroundEdit({region: {id: 'test', editable: true}, naturalHeight: () => 10});
  const heapGroup = new THREE.Group(), heapView = createGroundView({group: heapGroup, groundEdit: heaped});
  heaped.fill({x: 6, z: 24, radius: 2}, 'topsoil', 20);
  heapView.update();
  const made = heapGroup.children[0].geometry.attributes.aMade, colour = heapGroup.children[0].geometry.attributes.color;
  const corner = (x, z) => z * 33 + x;
  assert.ok(heaped.heightAt(6, 24) > 10.3, 'the fill makes a heap');
  assert.ok(made.getX(corner(6, 24)) > .3, 'the heap\'s own corner carries its fill');
  assert.equal(made.getX(corner(24, 6)), 0, 'the mirrored corner carries no fill');
  assert.ok(colour.getX(corner(6, 24)) < colour.getX(corner(24, 6)) * .8, 'the turned earth is darkened on the heap, not on its mirror');
  // Flat ground along the chunk's edge faces up: the skirt's upright faces do not tilt it into a pale kerb of rock.
  const normal = heapGroup.children[0].geometry.attributes.normal;
  for (const [x, z] of [[0, 10], [32, 10], [10, 0], [10, 32], [0, 0], [32, 32]])
    assert.ok(normal.getY(corner(x, z)) > .999, `the edge corner ${x}, ${z} faces up`);
  heapView.dispose();
}
// Beside a ditch the cut and its own ridge sum to nothing. The ground there was still worked, and the drawing reads that from
// how much was moved, so it is drawn as earth and not as a scarp's rock with pale scree (the trencher's ditch, DIG-YARD-TOY).
{
  const delta = new Float32Array(32 * 32), material = new Uint8Array(32 * 32);
  for (let z = 8; z < 20; z++) { delta[z * 32 + 10] = -1.5; delta[z * 32 + 11] = .75; delta[z * 32 + 12] = .75; }
  const ditchGroup = new THREE.Group();
  const ditchView = createGroundView({group: ditchGroup, groundEdit: {toSave: () => ({chunks: [{x: 0, z: 0, delta, material}]}),
    heightAt: (x, z) => 10 + (x >= 0 && x < 32 && z >= 0 && z < 32 ? delta[z * 32 + x] : 0)}});
  ditchView.update();
  const attributes = ditchGroup.children[0].geometry.attributes, corner = 7 * 33 + 11;
  assert.ok(Math.abs(attributes.aMade.getX(corner)) < 1e-6, 'the cut and its ridge sum to nothing at the ditch\'s end');
  assert.ok(attributes.aMoved.getX(corner) > .3, 'the ground there still shows that it was worked');
  assert.equal(attributes.aMoved.getX(3 * 33 + 25), 0, 'untouched ground shows no work');
  ditchView.dispose();
}
console.log('Ground view: sparse fine meshes, material colour, seam skirts, incremental refresh, made ground in place and seeded dig effects pass.');

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

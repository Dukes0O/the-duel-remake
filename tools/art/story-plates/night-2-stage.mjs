// Bake the approved game meshes and posed cast once, in gate-relative metres.
// node tools/art/story-plates/night-2-stage.mjs <evidence-directory>
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {TIN_TOWN_GATE, createTinTownGate} from '../../../src/world/tin-town-gate.js';
import {createTinTownShacks} from '../../../src/world/tin-town-shacks.js';
import {scablandsSurfaceHeightAt as heightAt} from '../../../src/world/scablands-ground.js';
import {makeCoarseGround} from '../../../src/world/scablands-scene.js';
import {createNearGround, NEAR_GROUND} from '../../../src/world/near-ground.js';
import {createRoadsDraw} from '../../../src/world/scablands-draw.js';
import {riverDepthAt} from '../../../src/world/scablands-regions.js';
import {createStoryPeople, walkerGroupAt, setStoryPersonAction} from '../../../src/world/jobs/story-people.js';
import {createStoryPeopleView} from '../../../src/world/story-people-view.js';

const dir = process.argv[2];
if (!dir) throw Error('Supply the evidence directory.');
await mkdir(dir, {recursive:true});
const gate = TIN_TOWN_GATE, floor = heightAt(gate.x, gate.z);
const origin = new THREE.Vector3(gate.x, floor, gate.z);
const worldToStage = new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z);
const point = (x,z) => ({x:gate.x+x, y:heightAt(gate.x+x,gate.z+z), z:gate.z+z});
const local = p => [p.x-origin.x,p.y-origin.y,p.z-origin.z];
const group = new THREE.Group(), ids = [];
const originAtGate = point(0,5.2), yaw = Math.atan2(gate.through.x,gate.through.z);
const cast = createStoryPeople(walkerGroupAt(originAtGate,yaw,heightAt));
const find = id => cast.find(p=>p.id===id);
const carters = cast.filter(p=>p.cart);
assert.equal(cast.length,11);
assert.equal(carters.length,4);

// The group takes the same formation as the game, facing back into town.
// Wim sits at the front end of the first salt cart. The bed is at 0.509 m;
// the sitting action's support is 0.263 times her standing height.
const wim = find('wim'), seat = find('walker-1').cart;
const seatPoint = new THREE.Vector3(-.12, .509-wim.height*.263, .39)
  .applyAxisAngle(new THREE.Vector3(0,1,0),seat.yaw).add(new THREE.Vector3(seat.x,seat.y,seat.z));
Object.assign(wim.position,seatPoint);
wim.yaw = seat.yaw-.26;
setStoryPersonAction(wim,'sit');
const dace = find('dace'), besideDace = find('walker-3').cart;
dace.yaw = yaw + .13;
assert.ok(Math.hypot(dace.position.x-besideDace.x,dace.position.z-besideDace.z)<1.25);

const feet = point(-.35,-9.4);
const eye = {...feet, y:feet.y+1.62};
const aim = {x:gate.x,y:eye.y+(6+9.4)*Math.tan(8.4*Math.PI/180),z:gate.z+6};
const tableau = {width:1920,height:1080,gateWorld:origin.toArray(),
  camera:{eye:local(eye),aim:local(aim),verticalFov:48,eyeHeight:1.62,near:.15,far:2400},
  people:cast.map(p=>({id:p.id,action:p.action,yaw:p.yaw,position:local(p.position)})),
  carts:carters.map(p=>({owner:p.id,yaw:p.cart.yaw,axle:local({x:p.cart.x,y:p.cart.y,z:p.cart.z})})), ids};
const toMaterials = new Map();
async function loadAsset(url) {
  const bytes = await readFile(new URL('../../../public'+url,import.meta.url));
  const jsonBytes = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20,20+jsonBytes));
  const embedded = [];
  for (const [i,img] of gltf.images.entries()) {
    const v=gltf.bufferViews[img.bufferView], offset=28+jsonBytes+(v.byteOffset||0);
    const name=path.basename(url,'.glb')+'-'+i+(img.mimeType==='image/png'?'.png':'.jpg');
    await writeFile(path.join(dir,name),bytes.subarray(offset,offset+v.byteLength));
    embedded.push(name);
  }
  const loader=new GLTFLoader();
  loader.register(()=>({name:'OFFLINE_ATLAS',loadTexture(index) {
    const t=new THREE.Texture(); t.userData.atlas=embedded[gltf.textures[index].source];
    t.flipY=false; return Promise.resolve(t);
  }}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
function staticMaterial(source) {
  if (!toMaterials.has(source)) {
    const material=new THREE.MeshStandardMaterial({name:source.name, color:source.color||0xffffff,
      roughness:source.roughness??.94, metalness:source.metalness??0, emissive:source.emissive??0,
      emissiveIntensity:source.emissiveIntensity??1, side:source.side});
    if (source.map?.userData.atlas) material.userData.atlas=source.map.userData.atlas;
    toMaterials.set(source,material);
  }
  return toMaterials.get(source);
}
const pos = new THREE.Vector3(), matrix=new THREE.Matrix4(), direction=new THREE.Matrix3();
const joint=new THREE.Matrix4(), n=new THREE.Vector3(), weighted=new THREE.Vector3(), rest=new THREE.Vector3();
function bakeMesh(mesh, label, prefix) {
  const g=mesh.geometry.clone();
  if (mesh.isSkinnedMesh) {
    const source=mesh.geometry.attributes, normals=g.attributes.normal;
    for (let i=0; i<source.position.count; i++) {
      mesh.getVertexPosition(i,pos); g.attributes.position.setXYZ(i,pos.x,pos.y,pos.z);
      rest.fromBufferAttribute(source.normal,i).applyMatrix3(direction.setFromMatrix4(mesh.bindMatrix));
      n.set(0,0,0);
      for (let slot=0;slot<4;slot++) {
        const w=source.skinWeight.getComponent(i,slot);
        if (!w) continue;
        const k=source.skinIndex.getComponent(i,slot);
        joint.multiplyMatrices(mesh.skeleton.bones[k].matrixWorld,mesh.skeleton.boneInverses[k]);
        weighted.copy(rest).applyMatrix3(direction.setFromMatrix4(joint)); n.addScaledVector(weighted,w);
      }
      n.applyMatrix3(direction.setFromMatrix4(mesh.bindMatrixInverse)).normalize();
      normals.setXYZ(i,n.x,n.y,n.z);
    }
    g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
  }
  g.applyMatrix4(matrix.multiplyMatrices(worldToStage,mesh.matrixWorld));
  g.computeBoundingBox(); g.computeBoundingSphere();
  const source=mesh.material;
  const mat=Array.isArray(source)?source.map(staticMaterial):staticMaterial(source);
  const out=new THREE.Mesh(g,mat);
  out.name=prefix+' / '+(mesh.name||'mesh');
  out.userData.plateGroup=label;
  group.add(out);
  if(!ids.includes(label)) ids.push(label);
}
const view=createStoryPeopleView(loadAsset), job={storyPeople:cast};
view.update(job,eye,0);
await view.group.userData.ready;
assert.ifError(view.group.userData.loadError);
for(let frame=0;frame<=120;frame++) view.update(job,eye,frame/60);
// Game's default seat attaches to every sitter. Here the approved cart is the seat.
view.group.getObjectByName('story-person-wim').getObjectByName('Camp stool').visible=false;
view.group.updateMatrixWorld(true);
for(const root of view.group.children) root.traverseVisible(mesh=>{
  if(mesh.isMesh) bakeMesh(mesh,root.name,root.name);
});

const modelGate=createTinTownGate({ground:floor}), shacks=createTinTownShacks();
for(const model of [modelGate,shacks]) {
  model.updateMatrixWorld(true);
  model.traverseVisible(mesh=>{
    if(!mesh.isMesh) return;
    const assembly=model===modelGate?mesh.parent.name:'Tin Town shacks';
    bakeMesh(mesh,assembly,assembly);
  });
}

// Export both actual ground meshes and the real road ribbons at this spectator.
// The ordinary game shader clips the far ground inside the near window.
const groundMaterial = name => new THREE.MeshStandardMaterial({name,roughness:.99});
const plainAt = (x,z) => heightAt(x,z)+riverDepthAt(x,z);
const near = createNearGround({material:groundMaterial('Scablands near ground'),heightAt:plainAt});
near.follow(eye.x,eye.z);
const coarse = makeCoarseGround(groundMaterial('Scablands coarse ground'));
tableau.nearHole = [near.centreX-gate.x,near.centreZ-gate.z,
  NEAR_GROUND.cellsX*NEAR_GROUND.cellX/2-1,NEAR_GROUND.cellsZ*NEAR_GROUND.cellZ/2-1];
const roads = createRoadsDraw({plainAt,material:groundMaterial('Scablands gravel road')});
while (roads.update(eye.x,eye.z)) { /* Build every visible piece as the running scene settles. */ }
for (const [root,label] of [[near.mesh,'ground'],[coarse,'ground'],[roads.group,'Gravel road']]) {
  root.updateMatrixWorld(true);
  root.traverseVisible(mesh=>{
    const points=mesh.geometry?.attributes.position;
    if (!mesh.isMesh || !points?.count) return;
    const road=mesh.geometry.attributes.aRoad;
    if (road) mesh.geometry.setAttribute('uv1',road);
    bakeMesh(mesh,label,mesh.name);
    const geometry=group.children.at(-1).geometry;
    const uv=[],p=geometry.attributes.position;
    for (let i=0;i<p.count;i++) uv.push(p.getX(i)/4.6,p.getZ(i)/4.6);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.deleteAttribute('aRoad');
  });
}

globalThis.FileReader??=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(x=>{this.result=x;this.onloadend?.();});}};
const bytes=await new GLTFExporter().parseAsync(group,{binary:true});
await writeFile(path.join(dir,'stage.glb'),new Uint8Array(bytes));
await writeFile(path.join(dir,'camera-and-cast.json'),JSON.stringify(tableau,null,2)+'\n');
console.log('11 Walkers, 4 carts, 3 fixed gate lamps, 1.62 m eye; '+group.children.length+' game meshes.');
view.dispose();

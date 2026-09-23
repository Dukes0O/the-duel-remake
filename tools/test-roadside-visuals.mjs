import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {buildEnvironment, disposeTree} from '../src/world.js';
import {syncScene} from '../src/scene-systems.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const oldLoad=THREE.TextureLoader.prototype.load,oldDocument=globalThis.document;
THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>target[key]??(()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};

try {
  const course=new Course(COURSE.find(def=>def.id==='high-country'),1989);
  const world=buildEnvironment(course);
  const tree=course.features.trees.find(feature=>feature.theme!=='desert'&&feature.scale<=1.1);
  const sign=course.features.signs[0],chevron=course.features.chevrons[0];
  const pine=world.children.filter(mesh=>mesh.userData.vegetationCell?.entries.some(({feature})=>feature.id===tree.id));
  const signGroup=world.children.find(group=>group.userData.roadSignId===sign.id);
  const chevronMesh=world.children.find(mesh=>mesh.userData.turnSignCell?.entries.some(({feature})=>feature.id===chevron.id));
  check(pine.length===2&&!!signGroup&&!!chevronMesh,'each breakable object keeps its established world mesh');
  const treeIndex=pine[0].userData.vegetationCell.entries.findIndex(({feature})=>feature.id===tree.id);
  const chevronIndex=chevronMesh.userData.turnSignCell.entries.findIndex(({feature})=>feature.id===chevron.id);
  const treeBefore=pine.map(mesh=>Array.from(mesh.instanceMatrix.array));
  const signBefore=signGroup.quaternion.toArray();
  const chevronBefore=Array.from(chevronMesh.instanceMatrix.array);
  const featuresBefore=JSON.stringify({trees:course.features.trees,signs:course.features.signs,chevrons:course.features.chevrons});
  const events=[{id:tree.id,kind:'tree',atTime:2,directionX:1,directionZ:0},
    {id:sign.id,kind:'sign',atTime:2,directionX:0,directionZ:1},
    {id:chevron.id,kind:'chevron',atTime:2,directionX:-1,directionZ:0}];
  const state={status:'racing',stageTimeSec:2.8,brokenScenery:events,fallenCacti:[],crushedProps:[]};
  const stateBefore=JSON.stringify(state);
  syncScene(world,state,0);
  const treeAfter=pine.map(mesh=>Array.from(mesh.instanceMatrix.array));
  check(treeAfter.every((buffer,i)=>JSON.stringify(buffer)!==JSON.stringify(treeBefore[i])),'trunk and crown fall together');
  check(JSON.stringify(signGroup.quaternion.toArray())!==JSON.stringify(signBefore),'whole road sign tips from a post hit');
  check(JSON.stringify(Array.from(chevronMesh.instanceMatrix.array))!==JSON.stringify(chevronBefore),'turn sign visibly falls');
  const matrix=new THREE.Matrix4();
  for(const mesh of [...pine,chevronMesh]){
    mesh.getMatrixAt(mesh===chevronMesh?chevronIndex:treeIndex,matrix);
    check(matrix.elements.every(Number.isFinite),'fallen instance transform stays finite');
    check(mesh.boundingBox.containsBox(mesh.geometry.boundingBox.clone().applyMatrix4(matrix)),'cell bounds include the fallen prop');
  }
  same(JSON.stringify(state),stateBefore,'visual updates never alter simulation events');
  same(JSON.stringify({trees:course.features.trees,signs:course.features.signs,chevrons:course.features.chevrons}),featuresBefore,'the course remains reusable');
  syncScene(world,{status:'menu',stageTimeSec:0,brokenScenery:events,fallenCacti:[],crushedProps:[]},0);
  same(pine.map(mesh=>Array.from(mesh.instanceMatrix.array)),treeBefore,'menu restores pine instances in a cached world');
  same(signGroup.quaternion.toArray(),signBefore,'menu restores road signs');
  same(Array.from(chevronMesh.instanceMatrix.array),chevronBefore,'menu restores turn signs');
  disposeTree(world);
} finally {
  THREE.TextureLoader.prototype.load=oldLoad;
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
}

console.log(`Roadside fall visuals: ${checks} checks passed.`);

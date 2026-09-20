import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {freestyleLayout,freestyleHeightAt,freestyleSurfaceHeightAt} from '../src/freestyle-course.js';
import {freestyleTerrainGeometry,addFreestyleScenery} from '../src/freestyle-scene.js';
import {disposeTree} from '../src/world.js';
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const def=COURSE.find(c=>c.practice),course=new Course(def,1989);
check(COURSE.indexOf(def)===15&&def.id==='titan-freestyle','practice appends one stable event; old IDs stay in place');
check(def.kind==='arena'&&!def.hasRival&&!def.hasRadar&&!def.stuntTrial&&!def.chaseTimeLimit,'practice has no competitive objective');
check(course.features.lapGates.length===0&&course.features.checkpoints.length===0,'no finish gates or lap pressure');
check(!course.features.obstacles.some(o=>o.arenaWall||o.id.startsWith('finish-post')),'open arena has no old inner wall or finish posts');
check(course.features.ramps.length===3&&course.features.crushables.length===12&&course.features.rocks.length===7,'three jump lines, twelve wrecks and progressive rocks');
check(course.features.practiceMounds.at(-1).height===44,'steep climb has an intentional visible summit');
check(freestyleLayout(course)===freestyleLayout(course),'layout is cached, not allocated per ground sample');
const geometry=freestyleTerrainGeometry(course),positions=geometry.attributes.position,index=geometry.index;
check(positions.count<20000&&index.count/3<30000,'adaptive ground keeps detailed hills without a dense empty floor');
check([...positions.array,...geometry.attributes.normal.array].every(Number.isFinite),'finite ground and normal attributes');
for(let i=0;i<index.count;i+=3){
  const a=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i)),b=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+1)),c=new THREE.Vector3().fromBufferAttribute(positions,index.getX(i+2));
  check(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).y>0,'terrain triangles face upward');
  const x=(a.x+b.x+c.x)/3,z=(a.z+b.z+c.z)/3,y=(a.y+b.y+c.y)/3;
  check(Math.abs(freestyleSurfaceHeightAt(course,x,z)-y)<.0001,'support follows the actual triangle, not an invisible smoother ramp');
}
for(const mound of course.features.practiceMounds){
  check(Math.abs(freestyleHeightAt(course,mound.x,mound.z)-mound.height)<1e-9,`${mound.id}: authored crest height`);
  for(const side of[-1,1]){
    const c=Math.cos(mound.heading),s=Math.sin(mound.heading),x=mound.x+c*side*(mound.halfX+1),z=mound.z-s*side*(mound.halfX+1);
    check(freestyleHeightAt(course,x,z)===0,`${mound.id}: clear side runout`);
  }
}
for(const feature of course.features.crushables){
  check([feature.x,feature.y,feature.z,feature.heading].every(Number.isFinite),'salvage placement finite');
  check(feature.y===course.groundAt(feature.s,feature.off).y,'salvage rests on visible terrain');
}
const oldLoad=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
try{
  const world=new THREE.Group(),detail=addFreestyleScenery(world,course);let draws=0,triangles=0;
  detail.traverse(mesh=>{if(!mesh.isMesh)return;draws++;triangles+=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);});
  check(draws<=12,'practice architecture, signs and rock garden are material-batched');
  check(triangles<100000,'quarry detail keeps a bounded mesh budget');
  let disposed=0;detail.traverse(mesh=>mesh.geometry?.addEventListener('dispose',()=>disposed++));disposeTree(world);check(disposed>0,'detail resource cleanup runs');
  console.log(`Practice scenery: ${draws} draws, ${triangles} submitted triangles; ground ${index.count/3} triangles.`);
}finally{THREE.TextureLoader.prototype.load=oldLoad;geometry.dispose();}
console.log(`Freestyle course: ${checks} layout, open access, terrain support, geometry and cleanup checks passed.`);

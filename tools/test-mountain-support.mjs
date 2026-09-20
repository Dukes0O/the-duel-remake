import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {buildMountainGeometry,mountainTransform} from '../src/mountain-landscape.js';
import {sampleMountainSupport} from '../src/mountain-support.js';
import {makeRng} from '../src/rng.js';

let checks=0,maxError=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;};
const geometries=Array.from({length:4},(_,i)=>buildMountainGeometry(i));
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster(),matrix=new THREE.Matrix4();
for(const id of ['pacific-canyon','alpine-serpent','titan-freestyle']){
  const course=new Course(COURSE.find(def=>def.id===id),1989),before=JSON.stringify(course.features),counts=new Map(),meshes=[];
  for(const f of course.features.mountains){
    const n=counts.get(f.theme)||0;counts.set(f.theme,n+1);
    const mesh=new THREE.InstancedMesh(geometries[n%4],material,1);mesh.setMatrixAt(0,mountainTransform(course,f));mesh.updateMatrixWorld(true);meshes.push(mesh);
  }
  check(meshes.length>0,`${id}: test actual rendered mountains`);
  const rng=makeRng(775),points=[];
  for(const f of course.features.mountains){
    for(let i=0;i<14;i++){const angle=rng.range(0,Math.PI*2),radius=rng.range(0,.98),x=Math.cos(angle)*radius*f.halfX,z=Math.sin(angle)*radius*f.halfZ,c=Math.cos(f.heading),s=Math.sin(f.heading);points.push([f.x+c*x+s*z,f.z-s*x+c*z]);}
  }
  points.push([1e7,-1e7]);
  for(const [x,z]of points){
    ray.set(new THREE.Vector3(x,10000,z),new THREE.Vector3(0,-1,0));
    const expected=ray.intersectObjects(meshes,false)[0]?.point.y??null,actual=sampleMountainSupport(course,x,z);
    check((expected===null)===(actual===null),`${id}: numeric support coverage matches visible triangles`);
    if(expected!==null){const error=Math.abs(actual-expected);maxError=Math.max(maxError,error);check(error<1e-7,`${id}: exact Float32 mesh support (${error})`);}
    check(Object.is(sampleMountainSupport(course,x,z),actual),`${id}: repeated cached support is deterministic`);
  }
  check(JSON.stringify(course.features)===before,`${id}: support never changes course/colliders`);
  const times=[];for(let round=0;round<3;round++){const t=performance.now();for(let i=0;i<10000;i++){const p=points[i%points.length];sampleMountainSupport(course,p[0],p[1]);}times.push(performance.now()-t);}
  console.log(`${id}: ${meshes.length} mountains; 10,000 warmed numeric support queries ${times.map(t=>t.toFixed(2)).join('/')} ms`);
  for(const mesh of meshes)mesh.dispose();
}
for(const geometry of geometries)geometry.dispose();material.dispose();
console.log(`Mountain support: ${checks} exact rendered-triangle, variant, cache and immutability checks; max height error ${maxError.toExponential(3)}m.`);

import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import * as THREE from 'three';
import meshes from '../src/generated/course-landmarks.json' with {type:'json'};
import {SET_PIECE_BOUNDS} from '../src/course-set-pieces.js';
import {addCourseLandmarks} from '../src/course-landmarks.js';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {disposeTree} from '../src/world.js';

let checks=0,triangles=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
assert.deepEqual(Object.keys(meshes.assets).sort(),Object.keys(SET_PIECE_BOUNDS).sort());checks++;
check(meshes.revision>=3,'inspected Blender revision, including outward-facing custom meshes');
check(statSync(new URL('../public/assets/models/course-landmarks.blend',import.meta.url)).size>100000,'editable native source retained');
for(const [name,groups] of Object.entries(meshes.assets)){
  const bounds=SET_PIECE_BOUNDS[name];let assetTriangles=0;
  check(Object.keys(groups).length<=10,`${name}: material-batched landmark`);
  for(const [material,data] of Object.entries(groups)){
    const spec=meshes.materials[material];check(!!spec,`${name}: known PBR material`);
    check(data.positions.length===data.normals.length&&data.positions.length%9===0,`${name}: triangle attributes align`);
    for(let i=0;i<data.positions.length;i+=3){
      const [x,y,z]=data.positions.slice(i,i+3),normal=data.normals.slice(i,i+3);
      check([x,y,z,...normal].every(Number.isFinite),`${name}: finite geometry`);
      check(Math.abs(x)<=bounds.halfX+.001&&Math.abs(z)<=bounds.halfZ+.001&&y<=bounds.height+.001&&y>=-.001,`${name}: runtime mesh stays inside physics bounds (${x},${y},${z})`);
      check(Math.abs(Math.hypot(...normal)-1)<.0001,`${name}: normalized exported normal`);
    }
    for(let i=0;i<data.positions.length;i+=9){
      const a=new THREE.Vector3(...data.positions.slice(i,i+3)),b=new THREE.Vector3(...data.positions.slice(i+3,i+6)),c=new THREE.Vector3(...data.positions.slice(i+6,i+9));
      const face=b.sub(a).cross(c.sub(a)),normal=new THREE.Vector3(...data.normals.slice(i,i+3));
      check(face.length()>1e-8&&face.normalize().dot(normal)>.999,`${name}: nondegenerate outward-wound export`);
    }
    assetTriangles+=data.positions.length/9;
  }
  check(assetTriangles<6500,`${name}: bounded per-course triangle cost`);triangles+=assetTriangles;
}
for(const def of COURSE){
  const course=new Course(def,1989),before=JSON.stringify(course.features),group=new THREE.Group();addCourseLandmarks(group,course);
  check(JSON.stringify(course.features)===before,`${def.id}: rendering never mutates colliders`);
  if(!def.expansion){check(group.children.length===0,`${def.id}: legacy scene unchanged`);continue;}
  const model=group.children.find(child=>child.userData.courseLandmark),placement=course.features.setPieces[0];
  check(model?.userData.courseLandmark===def.expansion.landmark,`${def.id}: intended reference family`);
  check(model.position.y===placement.baseY&&model.rotation.y===placement.heading,`${def.id}: native mesh and collision placement match`);
  let resources=0,disposed=0;group.traverse(object=>{for(const resource of [object.geometry,object.material].filter(Boolean)){resources++;resource.addEventListener('dispose',()=>disposed++);}});
  disposeTree(group);check(disposed===resources,`${def.id}: all landmark graphics resources released`);
}
console.log(`Blender course landmarks: ${checks} checks; ${triangles} triangles across six reusable models.`);

import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {addArenaCrushables} from '../src/arena-props.js';
const course=new Course(COURSE.find(c=>c.arena),1989),world=new THREE.Group(),group=addArenaCrushables(world,course);
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const bounds=object=>{world.updateMatrixWorld(true);const inverse=object.matrixWorld.clone().invert(),box=new THREE.Box3(),point=new THREE.Vector3();object.traverse(m=>{if(!m.isMesh)return;const position=m.geometry.attributes.position,matrix=inverse.clone().multiply(m.matrixWorld);for(let i=0;i<position.count;i++)box.expandByPoint(point.fromBufferAttribute(position,i).applyMatrix4(matrix));});return box;};
const original=group.children.map(bounds);
check(group.children.length===course.features.crushables.length,'Every physical salvage car has a visible shell');
for(let i=0;i<original.length;i++){
 const b=original[i],feature=course.features.crushables[i];
 check(b.min.x>=-feature.halfX-.005&&b.max.x<=feature.halfX+.005,'Intact body fits its collision width');
 check(b.min.z>=-feature.halfZ-.005&&b.max.z<=feature.halfZ+.005,'Intact body fits its collision length');
 check(b.max.y<=feature.height,'Intact body fits vertical clearance');
}
const id=course.features.crushables[0].id;
group.userData.updateSimulation({crushedProps:[id]},.04);
const partial=bounds(group.children[0]);
check(partial.max.y<original[0].max.y&&partial.max.y>.7,'Deformation animates through a partial crush');
for(let i=0;i<120;i++)group.userData.updateSimulation({crushedProps:[id]},1/60);
const flat=bounds(group.children[0]);
check(flat.max.y<.72,'Roof and cabin collapse below the truck');
check(bounds(group.children[1]).equals(original[1]),'Other salvage cars retain their intact geometry');
group.userData.updateSimulation({crushedProps:[]},0);
for(let i=0;i<original.length;i++)check(bounds(group.children[i]).equals(original[i]),'New race resets the visible shell');
check(addArenaCrushables(new THREE.Group(),new Course(COURSE[0],1989))===null,'Paved events contain no arena salvage');
console.log(`Arena salvage models: ${checks} bounds, deformation and reset checks passed.`);

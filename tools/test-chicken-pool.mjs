import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {createChickens,CHICKEN_VISIBILITY} from '../src/chickens.js';
import {disposeTree} from '../src/world.js';

let checks=0;const check=(value,label)=>{assert(value,label);checks++;};
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),vertex=new THREE.Vector3(),color=new THREE.Color();
const paired=new Set(['Chicken wings','Chicken legs','Chicken eyes','Chicken feet']);
const active=view=>Array.from(view.group.userData.activeBirdIndices.slice(0,view.group.userData.visibleChickenCount));
function slotFor(view,source){return active(view).indexOf(source);}
function pose(view,source,part='Chicken bodies'){
  const mesh=view.group.getObjectByName(part),slot=slotFor(view,source);if(slot<0)return null;
  mesh.getMatrixAt(paired.has(part)?slot*2:slot,matrix);return Array.from(matrix.elements);
}
function sourceColor(view,source,part){const mesh=view.group.getObjectByName(part),slot=slotFor(view,source);mesh.getColorAt(paired.has(part)?slot*2:slot,color);return color.toArray();}
function validateInstances(view,course,state){
  const ids=active(view),data=view.group.userData,viewer=course.groundAt(state.s,state.lateral||0),flocks=new Map(course.features.flocks.map(flock=>[flock.id,flock]));
  check(ids.length===new Set(ids).size&&ids.every(id=>id>=0&&id<data.chickenCount),'active slots refer to unique original birds');
  check(data.activeBirdIndices.slice(ids.length).every(id=>id===-1),'unused pool entries have no stale source identity');
  for(const mesh of view.group.children){
    const parts=paired.has(mesh.name)?2:1;
    check(mesh.count===ids.length*parts,'submitted part count exactly matches the compact bird population');
    for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
      check(matrix.elements.every(Number.isFinite),'active instance transforms are finite');
      if(mesh.name==='Chicken bodies'){
        const flock=flocks.get(data.sourceFlockIds[ids[i]]),center=course.groundAt(flock.s,flock.off);
        check(Math.hypot(position.x-center.x,position.z-center.z)<=flock.radius+.5,'body position belongs to the reported source flock');
      }
      // Inspect actual transformed mesh vertices, not just instance centers.
      const vertices=mesh.geometry.getAttribute('position');
      for(let j=0;j<vertices.count;j++){
        vertex.fromBufferAttribute(vertices,j).applyMatrix4(matrix);
        assert(Number.isFinite(vertex.x)&&Number.isFinite(vertex.y)&&Number.isFinite(vertex.z),'transformed chicken vertex must remain finite');
        assert(Math.hypot(vertex.x-viewer.x,vertex.z-viewer.z)<=CHICKEN_VISIBILITY.radius+1.2,'submitted vertices stay within the bounded population radius');
      }
      checks++;
    }
  }
}

let totalCapacity=0,totalVisible=0,totalTriangles=0,visibleTriangles=0,samples=0,maxFraction=0;
for(const def of COURSE){
  const course=new Course(def,1989),view=createChickens(course),before=JSON.stringify(course.features.flocks);
  const identities=view.group.children.map(mesh=>[mesh.uuid,mesh.geometry.uuid,mesh.instanceMatrix.array,mesh.instanceColor?.array]);
  for(const s of[172,course.length*.25,course.length*.55,course.length*.85]){
    const state={status:'racing',s,lateral:0,speedMph:70,collectedFlocks:[]};view.update(state,6);
    validateInstances(view,course,state);
    const count=view.group.userData.chickenCount,visible=view.group.userData.visibleChickenCount;
    if(count){samples++;totalCapacity+=count;totalVisible+=visible;maxFraction=Math.max(maxFraction,visible/count);}
    for(const mesh of view.group.children){const triangles=(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;totalTriangles+=triangles*mesh.instanceMatrix.count;visibleTriangles+=triangles*mesh.count;}
  }
  view.update({status:'racing',s:-1,lateral:0,collectedFlocks:[]},8);const seamIds=active(view),seamPoses=seamIds.map(id=>pose(view,id));
  view.update({status:'racing',s:course.length-1,lateral:0,collectedFlocks:[]},8);
  check(JSON.stringify(active(view))===JSON.stringify(seamIds)&&seamIds.every((id,i)=>pose(view,id).every((value,j)=>Math.abs(value-seamPoses[i][j])<.0001)),'world-radius population and source poses agree across the closed lap seam');
  view.update({status:'racing',s:172+course.length,lateral:0,collectedFlocks:[]},8);const secondLap=active(view);
  view.update({status:'racing',s:172,lateral:0,collectedFlocks:[]},8);
  check(JSON.stringify(active(view))===JSON.stringify(secondLap),'lap number does not change the same physical bird population');
  view.update({status:'menu',s:172,lateral:-2.8,collectedFlocks:[]},1000);
  validateInstances(view,course,{s:172,lateral:-2.8});
  check(view.group.children.every((mesh,i)=>mesh.uuid===identities[i][0]&&mesh.geometry.uuid===identities[i][1]&&mesh.instanceMatrix.array===identities[i][2]&&mesh.instanceColor?.array===identities[i][3]),'menu, laps and teleports retain fixed instance buffers and geometry');
  check(JSON.stringify(course.features.flocks)===before,'render population changes leave every actual pickup flock intact');
  if(!course.features.flocks.length)check(!view.group.visible&&view.group.children.every(mesh=>mesh.count===0),'an empty-flock course submits no bird geometry');
  disposeTree(view.group);
}
check(samples>0&&totalVisible/totalCapacity<.3,'actual courses submit fewer than30 percent of source birds on average');
check(maxFraction<.5,'no tested active-flock view submits half of its whole course population');
check(visibleTriangles/totalTriangles<.3,'submitted chicken triangles fall by more than70 percent');

// A flat source isolates culling fade, compacted colour identity, and animation
// continuity from terrain and route curvature.
let groundCalls=0;
const flocks=Array.from({length:18},(_,i)=>({id:`test-${i}`,s:500+i*170,off:10,radius:3.5,count:8,seed:230+i}));
const course={length:5000,features:{flocks},groundAt(s,off=0){groundCalls++;return{x:off,y:0,z:s,heading:0};}};
const view=createChickens(course),source=8*6,state={status:'menu',s:flocks[6].s,lateral:10,collectedFlocks:[]};
view.update(state,0);const baseline=pose(view,source),baselineSlot=slotFor(view,source),colors=['Chicken bodies','Chicken heads','Chicken wings','Chicken tails'].map(part=>sourceColor(view,source,part));
const center=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(baseline));
const initialScale=new THREE.Vector3().setFromMatrixScale(new THREE.Matrix4().fromArray(baseline)).length();
groundCalls=0;view.update({...state,s:state.s+170},0);
check(slotFor(view,source)!==baselineSlot&&slotFor(view,source)>=0,'a retained source bird moves to a different compact slot when nearer flocks change');
check(pose(view,source).every((value,i)=>value===baseline[i]),'a compact-slot change preserves the exact source bird pose');
check(colors.every((value,i)=>JSON.stringify(value)===JSON.stringify(sourceColor(view,source,['Chicken bodies','Chicken heads','Chicken wings','Chicken tails'][i]))),'body, head, wing and tail colours follow the source bird rather than the reused slot');
check(groundCalls<view.group.userData.chickenCount,'distant birds skip pose and foot ground sampling');

for(const [distance,factor]of[[240,1],[270,.5],[299,.0008240740740740327]]){
  view.update({...state,s:center.z-distance,lateral:center.x},0);
  const values=pose(view,source);check(values!==null,'birds remain in the outer fade band before the radius limit');
  const actualScale=scale.setFromMatrixScale(new THREE.Matrix4().fromArray(values)).length()/initialScale;
  check(Math.abs(actualScale-factor)<1e-6,'the outer60m uses a continuous smoothstep scale fade');
}
view.update({...state,s:center.z-301,lateral:center.x},0);check(slotFor(view,source)===-1,'birds beyond300m leave submitted instances entirely');
view.update(state,0);const collected={...state,status:'racing',collectedFlocks:[flocks[6].id]};view.update(collected,10);view.update(collected,11);
const flying=pose(view,source);check(flying&&new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(flying)).y>center.y+.5,'nearby collected birds still perform their airborne scatter');
view.update(collected,14);check(slotFor(view,source)===-1,'completed flyaway removes its birds from the compact population');
view.update({...state,s:flocks[16].s,collectedFlocks:collected.collectedFlocks},15);view.update(collected,16);check(slotFor(view,source)===-1,'teleporting away and back cannot respawn a collected flock');
view.update(state,0);check(slotFor(view,source)>=0,'restart restores an eligible source bird');
view.update(collected,20);view.update(collected,24);view.update(state,1000);check(slotFor(view,source)>=0,'empty menu collection state restores birds with an advancing clock');
view.update({...state,s:8000},1000);check(!view.group.visible&&view.group.children.every(mesh=>mesh.count===0),'a far teleport clears every submitted slot immediately');
view.update(state,1000);check(view.group.visible&&slotFor(view,source)>=0,'returning restores the bounded pool without rebuilding its meshes');
disposeTree(view.group);
console.log(`Chicken pool: ${checks} source identity, vertex, colour, fade, lap, collection and reset checks passed. ${Math.round(totalVisible/totalCapacity*100)}% of birds submitted on average; ${Math.round((1-visibleTriangles/totalTriangles)*100)}% fewer chicken triangles across${samples} populated views.`);

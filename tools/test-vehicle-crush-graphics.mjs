import assert from 'node:assert/strict';
import * as THREE from 'three';
import {models} from './audit-vehicle-grounding.mjs';
import {createVehicle,updateNpcVehicleDamage,updateVehicleDamage} from '../src/vehicles.js';
import {applyVehicleTerrainPose,placeGroundedVehicle,prepareVehicleGrounding} from '../src/vehicle-grounding.js';
import {disposeTree} from '../src/world.js';

let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;},equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const clean={front:0,rear:0,left:0,right:0};
const inventory=v=>{const a=[];v.traverse(o=>a.push([o,o.geometry,o.material]));return a;};
const versions=v=>v.userData.damageMeshes.map(({mesh})=>[mesh.geometry.attributes.position.version,mesh.geometry.attributes.normal.version,mesh.geometry.attributes.panelWear.version]);
const actors=[...models,{key:'traffic',vehicle:createVehicle()},{key:'police',vehicle:createVehicle()}];
for(const {key,vehicle:v}of actors){
  const d=v.userData,resources=inventory(v),untouched=actors.filter(a=>a.vehicle!==v).map(a=>versions(a.vehicle));
  updateNpcVehicleDamage(v,{damageZones:clean,crushDamage:.8,crushed:true});
  let roofDrop=0,wear=0;
  for(const {mesh,rest}of d.damageMeshes){
    const p=mesh.geometry.attributes.position.array;
    check(p.every(Number.isFinite)&&mesh.geometry.attributes.normal.array.every(Number.isFinite),`${key}: finite crushed vertices/normals`);
    for(let i=0;i<p.length;i+=3)roofDrop=Math.max(roofDrop,rest[i+1]-p[i+1]);
    for(const w of mesh.geometry.attributes.panelWear.array)wear=Math.max(wear,w);
  }
  check(roofDrop>.35,`${key}: visibly lowered roof/body, ${roofDrop}`);check(wear>.3,`${key}: persistent scuffs and broken lens wear`);
  check(d.fractures.every(({mesh})=>mesh.visible),`${key}: glazing fractures with roof collapse`);
  check(d.wheelPivots.every(p=>Math.abs(p.rotation.z)>.3&&p.scale.y<.9),`${key}: axles visibly splay and tires compress`);
  if(d.driver)check(!d.driver.visible,`${key}: no intact driver protrudes through flattened cabin`);
  const changed=versions(v);for(let i=0;i<180;i++)check(!updateNpcVehicleDamage(v,{crushDamage:.8,damageZones:clean}),`${key}: steady wreck skips deformation`);
  equal(versions(v),changed,`${key}: steady wreck uploads no buffers`);equal(inventory(v),resources,`${key}: no extra wreck geometry/materials`);
  equal(actors.filter(a=>a.vehicle!==v).map(a=>versions(a.vehicle)),untouched,`${key}: no damage leaks to other actors`);
  updateNpcVehicleDamage(v,null);
  for(const {mesh,rest,normals}of d.damageMeshes){equal(mesh.geometry.attributes.position.array,rest,`${key}: exact intact reset`);equal(mesh.geometry.attributes.normal.array,normals,`${key}: exact normals reset`);}
  for(const pivot of d.wheelPivots){equal(pivot.position.toArray(),pivot.userData.restPosition.toArray(),`${key}: exact wheel position reset`);equal(pivot.scale.toArray(),[1,1,1],`${key}: wheel size restored`);}
  if(d.driver)check(d.driver.visible,`${key}: restored driver visible`);
  check(d.fractures.every(({mesh})=>!mesh.visible),`${key}: fractures clear for next stage/menu actor`);
  updateVehicleDamage(v,1,false,0,{...clean,front:1});const normal=d.damageMeshes.map(({mesh})=>mesh.geometry.attributes.position.array.slice());
  let dented=0;
  for(const {mesh,rest,damageBasis} of d.damageMeshes){
    check(damageBasis?.length===rest.length/3*15,`${key}: each body has a prepared damage basis`);
    const position=mesh.geometry.attributes.position.array;
    for(let i=0;i<position.length;i++)if(Math.abs(position[i]-rest[i])>.004)dented++;
  }
  check(dented>100,`${key}: prepared front influence retains a visible hit-zone dent`);
  updateVehicleDamage(v,1,false,0,{...clean,front:1},0);equal(d.damageMeshes.map(({mesh})=>mesh.geometry.attributes.position.array),normal,`${key}: zero crush preserves normal impact deformation`);
  updateNpcVehicleDamage(v,null);
}
const truck=models.find(m=>m.key==='titan_monster').vehicle,course={groundAt:()=>({y:10})},actor={s:10,lateral:2,groundHeight:17,terrainPitch:.5,terrainRoll:-.3};
placeGroundedVehicle(truck,{x:0,y:10.035,z:0,heading:.7});const initial=truck.position.y;applyVehicleTerrainPose(truck,course,actor);
check(Math.abs(truck.position.y-initial-7)<1e-12,'support adds physical climb without losing tire/surface offset');equal(truck.rotation.x,-.5,'positive physics pitch raises nose');check(truck.rotation.z<0,'negative cross grade lowers left wheels');
const snapshot=JSON.stringify(actor);for(const pitch of [0,.5,Math.PI,Math.PI*2]){actor.terrainPitch=pitch;placeGroundedVehicle(truck,{x:0,y:10,z:0,heading:.7});applyVehicleTerrainPose(truck,course,actor);equal(truck.rotation.x,-pitch,'complete tumble rotation is not clamped');}
actor.terrainPitch=.5;equal(JSON.stringify(actor),snapshot,'render pose leaves physics untouched');
placeGroundedVehicle(truck,{x:0,y:10,z:0,heading:.7});applyVehicleTerrainPose(truck,course,{});equal(truck.rotation.x,0,'missing overrides reset to normal road placement');
for(const [pitch,roll]of [[.5,0],[-.5,0],[0,.3],[0,-.3],[.5,.3],[-.5,-.3]])for(const yaw of [0,.8,2.7]){
  placeGroundedVehicle(truck,{x:0,y:10,z:0,heading:yaw});applyVehicleTerrainPose(truck,course,{s:0,lateral:0,terrainPitch:pitch,terrainRoll:roll});truck.updateMatrixWorld(true);
  const normal=new THREE.Vector3(-Math.tan(roll),1,-Math.tan(pitch)).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).normalize();
  const wheels=truck.userData.wheelPivots.map(p=>p.getWorldPosition(new THREE.Vector3())),origin=wheels[0];
  for(const wheel of wheels)check(Math.abs(wheel.clone().sub(origin).dot(normal))<1e-7,'all four actual Titan wheel centers follow the independent sampled grades at every yaw');
  const front=truck.userData.wheelPivots.find(p=>p.userData.front),rear=truck.userData.wheelPivots.find(p=>!p.userData.front);
  if(pitch)check(Math.sign(front.getWorldPosition(new THREE.Vector3()).y-rear.getWorldPosition(new THREE.Vector3()).y)===Math.sign(pitch),'actual front axle rises on uphill and falls on downhill');
}
for(const {key,vehicle:v}of actors){
  const meta=prepareVehicleGrounding(v),versionsBefore=versions(v);
  for(const pitch of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]){
    placeGroundedVehicle(v,{x:0,y:10,z:0,heading:.6});applyVehicleTerrainPose(v,course,{s:0,lateral:0,groundHeight:10,terrainPitch:pitch,terrainRoll:.3,tumble:true});v.updateMatrixWorld(true);
    let minY=Infinity;const point=new THREE.Vector3();v.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible||mesh===v.userData.contactShadow)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);minY=Math.min(minY,point.y);}});
    check(minY>=10-1e-6,`${key}: tumbling body and wheels never rotate through support plane at ${pitch}`);
    check(v.position.y<10+Math.max(meta.tumbleBounds.max[1]-meta.tumbleBounds.min[1],meta.tumbleBounds.max[2]-meta.tumbleBounds.min[2])+1,`${key}: tumble pivot stays bounded`);
  }
  equal(versions(v),versionsBefore,`${key}: tumble never rewrites body buffers`);
}
for(const {vehicle}of actors)disposeTree(vehicle);
console.log(`Vehicle crush graphics: ${checks} checks covering all ${models.length} models, traffic/police, localized collapse, cached updates, resource isolation, exact resets and physics-owned climb/tumble.`);

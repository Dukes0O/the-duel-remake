import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {strip} from '../src/world.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {prepareVehicleGrounding,placeGroundedVehicle,vehicleGroundPoint,vehicleGroundSlope,TIRE_CLEARANCE} from '../src/vehicle-grounding.js';
import {models,contacts} from './audit-vehicle-grounding.mjs';

let checks=0,min=Infinity,max=-Infinity;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const near=(a,b,tolerance,message)=>ok(Math.abs(a-b)<=tolerance,`${message}: ${a} vs ${b}`);
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const courses=['high-country','ridge-rally','timberline-rush'].map(id=>new Course(COURSE.find(c=>c.id===id),1989));
ok(models.length===8,'Grounding checks include all eight actual runtime models');

for(const model of models){
  const v=model.vehicle,geometryBefore=[];
  ok(v.userData.vehicleKey===model.key,`${model.key} fixture comes through the runtime model router`);
  if(model.key==='falcone_heritage')ok(v.userData.vehicleSource==='licensed'&&!v.userData.aeroPackage,'Heritage uses licensed sport geometry, not the redesigned starter or Aurora GT');
  v.traverse(n=>{if(n.isMesh)geometryBefore.push([n,n.geometry,n.geometry.attributes.position.version,n.position.clone()]);});
  const meta=prepareVehicleGrounding(v);
  ok(Object.isFrozen(meta)&&Object.isFrozen(meta.wheels),`${model.key} immutable cached metadata`);
  near(meta.contactY,Math.min(...model.wheels.map(w=>w.minY)),1e-9,`${model.key} actual tire base`);
  ok(meta.wheels.length===4,`${model.key} four measured tires`);
  for(let i=0;i<4;i++)near(v.userData.wheels[i].parent.userData.radius,model.wheels[i].radius,1e-9,`${model.key} measured rolling radius`);
  for(const[n,g,version,p]of geometryBefore){ok(n.geometry===g&&g.attributes.position.version===version,`${model.key} no geometry mutation`);if(n!==v.userData.contactShadow)ok(n.position.equals(p),`${model.key} body and wheels stay together`);}
  const wheelNodes=new Set();for(const wheel of v.userData.wheels)wheel.traverse(n=>wheelNodes.add(n));
  let bodyFloor=Infinity;const vertex=new THREE.Vector3();
  v.traverse(n=>{if(!n.isMesh||wheelNodes.has(n)||n===v.userData.contactShadow||!n.visible)return;const a=n.geometry.attributes.position;for(let i=0;i<a.count;i++){vertex.fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld);bodyFloor=Math.min(bodyFloor,vertex.y);}});
  ok(bodyFloor-meta.contactY>.05,`${model.key} whole body remains above the tire plane`);
  // Both road types are truly flat in this fixture, with the production surface
  // lifts and source terrain depression retained. The geometry is a real plane.
  for(const offroad of[false,true]){
    const flat={def:{offroad},groundAt:(s,l)=>({x:l,y:3-.06,z:s,heading:0}),at:()=>({y:3}),surfaceAt:()=>({roadHalfWidth:7,shortcutId:null})};
    const y=vehicleGroundPoint(flat,0,0).y,road=new THREE.Mesh(new THREE.PlaneGeometry(30,30).rotateX(-Math.PI/2).translate(0,y,0),material);road.updateMatrixWorld(true);
    for(const angle of[0,Math.PI/2,Math.PI,-Math.PI/2])for(const gap of contacts(model,flat,0,0,road,angle))near(gap,TIRE_CLEARANCE,0.002,`${model.key} flat ${offroad?'gravel':'asphalt'} tire`);
    road.geometry.dispose();
  }
  // Cache hits never traverse wheels, even if their posed/damaged geometry has
  // changed; repeated placement must not turn a wreck into a new factory base.
  const traverses=v.userData.wheels.map(w=>w.traverse);
  for(const wheel of v.userData.wheels)wheel.traverse=()=>{throw Error('Repeated wheel scan');};
  const p={x:2,y:7,z:3,heading:.8},wheel=v.userData.wheels[0],before=wheel.rotation.x;
  placeGroundedVehicle(v,p,.25,1);
  near(wheel.rotation.x-before,1/meta.wheels[0].radius,1e-10,`${model.key} distance-based wheel spin`);
  ok(v.userData.grounding===meta&&v.rotation.order==='YXZ',`${model.key} cached yaw-first pose`);
  const groundedY=v.position.y;v.position.y+=2.25;
  near(v.position.y-groundedY,2.25,1e-12,`${model.key} airborne displacement preserved`);
  for(let i=0;i<4;i++){v.userData.wheels[i].traverse=traverses[i];v.userData.wheels[i].rotation.x=0;}
  updateVehicleDamage(v,2,false,0,{left:2});updateVehicleDamage(v,0,false,0,null);
  placeGroundedVehicle(v,p,0,0);
  ok(v.userData.grounding===meta,`${model.key} damage reset preserves tire origin`);
}

for(const course of courses){
  const road=new THREE.Mesh(strip(course,s=>-course.roadHalfWidthAt(s),s=>course.roadHalfWidthAt(s),.035),material);road.updateMatrixWorld(true);
  const points=[];
  for(let s=8;s<course.length-8;s+=8){const slope=vehicleGroundSlope(course,s,0,0);points.push({s,grade:Math.abs(slope.pitch),score:Math.abs(slope.pitch)*(1-Math.cos(course.at(s).heading))});}
  const worst=[...points].sort((a,b)=>b.score-a.score).filter((p,i,a)=>a.slice(0,i).every(q=>Math.abs(p.s-q.s)>40)).slice(0,6);
  worst.push([...points].sort((a,b)=>b.grade-a.grade)[0]);
  for(const{ s }of worst)for(const model of models)for(const angle of[0,.4,-.4,Math.PI]){
    const gaps=contacts(model,course,s,0,road,angle);
    // A rigid four-wheel pose spans multiple road triangles at a crest. Allow
    // 7.5cm there; flat surfaces and the reported steep defect are much tighter.
    for(const gap of gaps){min=Math.min(min,gap);max=Math.max(max,gap);ok(gap>-.075&&gap<.075,`${course.def.id} ${model.key} s=${s},yaw=${angle}: tire gap ${gap}`);}
  }
  for(const cut of course.features.shortcuts){
    const branch=new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,s=>course.shortcutOffset(cut,s)+cut.halfWidth,.065,cut.start,cut.end,true),material),roads=new THREE.Group();roads.add(road,branch);roads.updateMatrixWorld(true);
    for(const t of[.02,.5,.98]){
      const s=cut.start+(cut.end-cut.start)*t,lateral=course.shortcutOffset(cut,s),a=course.groundAt(s-.5,course.shortcutOffset(cut,s-.5)),b=course.groundAt(s+.5,course.shortcutOffset(cut,s+.5)),angle=Math.atan2(b.x-a.x,b.z-a.z)-course.at(s).heading;
      for(const model of models)for(const gap of contacts(model,course,s,lateral,roads,angle))ok(Math.abs(gap)<.075,`${course.def.id} ${model.key} branch ${cut.id},t=${t}: gap ${gap}`);
    }
    roads.remove(road);branch.geometry.dispose();
  }
  road.geometry.dispose();
}
// An authored route can change. Keep the yaw-first regression independently on
// a fixed 14% inclined plane so a new crest cannot weaken its strict tolerance.
const heading=2.4,grade=.14,sn=Math.sin(heading),cs=Math.cos(heading);
const slopeFixture={def:{offroad:true},groundAt:(s,l)=>({x:s*sn+l*cs,y:s*grade,z:s*cs-l*sn,heading}),at:s=>({y:s*grade}),surfaceAt:()=>({roadHalfWidth:7,shortcutId:null})};
const slopeGeometry=new THREE.PlaneGeometry(30,30).rotateX(-Math.PI/2),sp=slopeGeometry.attributes.position;
for(let i=0;i<sp.count;i++)sp.setY(i,(sp.getX(i)*sn+sp.getZ(i)*cs)*grade+.035);
slopeGeometry.computeVertexNormals();const slopeRoad=new THREE.Mesh(slopeGeometry,material);slopeRoad.updateMatrixWorld(true);
for(const model of models)for(const gap of contacts(model,slopeFixture,0,0,slopeRoad))near(gap,TIRE_CLEARANCE,.016,`${model.key} yaw-first inclined plane`);
slopeGeometry.dispose();
// Recheck the user's original location with the newly authored hill. A rigid
// chassis spans changing slopes here; the fixed plane above protects pose math.
const ridge=courses[1],ridgeRoad=new THREE.Mesh(strip(ridge,s=>-ridge.roadHalfWidthAt(s),s=>ridge.roadHalfWidthAt(s),.035),material);ridgeRoad.updateMatrixWorld(true);
const titanGaps=contacts(models.find(m=>m.key==='titan_monster'),ridge,2168,0,ridgeRoad);
for(const gap of titanGaps)ok(gap>-.05&&gap<.05,`Ridge2168 Titan contact ${gap}`);
ridgeRoad.geometry.dispose();material.dispose();
console.log(`Vehicle grounding: ${checks} checks across ${models.length} actual models; steep asphalt/gravel triangle gaps ${min.toFixed(4)}..${max.toFixed(4)}m; Ridge2168 Titan ${titanGaps.map(n=>n.toFixed(4)).join(', ')}m.`);

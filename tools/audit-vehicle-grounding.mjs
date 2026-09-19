// Shared headless actual-model fixtures and optional contact diagnostic.
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CARS,COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {strip} from '../src/world.js';
import {loadHeroVehicle} from '../src/hero-vehicle.js';
import {createUnlockedVehicle,UNLOCK_VEHICLE_DIMENSIONS} from '../src/unlock-vehicles.js';
import {placeGroundedVehicle as place,vehicleGroundSlope as groundSlope,vehicleGroundPoint,prepareVehicleGrounding} from '../src/vehicle-grounding.js';

// Preserve every original mesh, physical factor and transform. Only texture
// bindings are removed for the headless GLB parser, which has no image decoder.
const source=await readFile(new URL('../public/assets/models/car-concept.glb',import.meta.url)),jsonLength=source.readUInt32LE(12),json=JSON.parse(source.toString('utf8',20,20+jsonLength));
function stripTextures(value){if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(/Texture$/.test(key))delete value[key];else stripTextures(value[key]);}}
stripTextures(json.materials);delete json.images;delete json.textures;delete json.samplers;
const text=Buffer.from(JSON.stringify(json)),padded=Math.ceil(text.length/4)*4,binary=source.subarray(20+jsonLength),glb=Buffer.alloc(20+padded+binary.length,0x20);
glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(padded,12);glb.writeUInt32LE(0x4e4f534a,16);text.copy(glb,20);binary.copy(glb,20+padded);
const parsed=await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),''),oldLoad=GLTFLoader.prototype.loadAsync;
parsed.scene.updateMatrixWorld(true);
const sourceBounds=new THREE.Box3().setFromObject(parsed.scene),sourceScale=4.8/(sourceBounds.max.z-sourceBounds.min.z),sourceLowest=[];
parsed.scene.traverse(mesh=>{if(mesh.isMesh){const bounds=new THREE.Box3().setFromObject(mesh);sourceLowest.push({name:mesh.name,material:mesh.material.name,normalizedBottomM:+((bounds.min.y-sourceBounds.min.y)*sourceScale).toFixed(5)});}});
sourceLowest.sort((a,b)=>a.normalizedBottomM-b.normalizedBottomM);
let hero;try{GLTFLoader.prototype.loadAsync=async()=>parsed;hero=await loadHeroVehicle();}finally{GLTFLoader.prototype.loadAsync=oldLoad;}
const point=new THREE.Vector3(),center=new THREE.Vector3(),plane=new THREE.Plane(),normal=new THREE.Vector3(),inverse=new THREE.Matrix4(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
export const models=Object.entries(CARS).map(([key,config])=>{
  const vehicle=UNLOCK_VEHICLE_DIMENSIONS[key]?createUnlockedVehicle({key,...config}):hero({color:config.color,kind:key==='aurora_gt'?'gt':key.includes('959')?'stuttgart':'sport'});
  vehicle.updateMatrixWorld(true);
  const wheels=vehicle.userData.wheels.map(wheel=>{
    const vertices=[];let minY=Infinity,maxY=-Infinity;
    wheel.traverse(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);vertices.push(point.x,point.y,point.z);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);}});
    return{vertices:new Float32Array(vertices),center:wheel.parent.position.clone(),minY,radius:(maxY-minY)/2,spinRadius:wheel.parent.userData.radius||.36};
  });
  return{key,vehicle,wheels};
});
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
function surfaceAt(road,x,z){ray.set(point.set(x,1000,z),down);const hit=ray.intersectObject(road,true)[0];if(!hit)throw Error('Contact point left the legal road');return hit;}
export function contacts(model,course,s,lateral,road,angle=0){
  const p=vehicleGroundPoint(course,s,lateral);
  const v=model.vehicle;place(v,p,angle,0);const slope=groundSlope(course,s,lateral,angle);v.rotation.x=slope.pitch;v.rotation.z=slope.roll;v.updateMatrixWorld(true);inverse.copy(v.matrixWorld).invert();
  return model.wheels.map(wheel=>{
    center.copy(wheel.center).applyMatrix4(v.matrixWorld);
    const hit=surfaceAt(road,center.x,center.z);normal.copy(hit.face.normal);if(normal.y<0)normal.negate();
    plane.setFromNormalAndCoplanarPoint(normal,hit.point).applyMatrix4(inverse);
    let min=Infinity,index=0;const a=wheel.vertices,n=plane.normal;
    for(let i=0;i<a.length;i+=3){const distance=n.x*a[i]+n.y*a[i+1]+n.z*a[i+2]+plane.constant;if(distance<min){min=distance;index=i;}}
    const contact=new THREE.Vector3(a[index],a[index+1],a[index+2]).applyMatrix4(v.matrixWorld),actual=surfaceAt(road,contact.x,contact.z);
    return contact.y-actual.point.y;
  });
}
if(process.argv[1]?.endsWith('audit-vehicle-grounding.mjs')){
const report={method:'Minimum actual wheel vertex relative to the rendered road triangle plane, then vertical ray at that contact. Straight, undamaged, no airborne/roughness animation.',heroSourceLowest:sourceLowest.slice(0,8),flat:[],slopes:[],worst:[]};
report.heroRuntimeLowest=[];models[0].vehicle.traverse(mesh=>{if(!mesh.isMesh||mesh===models[0].vehicle.userData.contactShadow)return;let min=Infinity;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);min=Math.min(min,point.y);}report.heroRuntimeLowest.push({material:mesh.material.name,bottomM:+min.toFixed(5)});});report.heroRuntimeLowest.sort((a,b)=>a.bottomM-b.bottomM);report.heroRuntimeLowest=report.heroRuntimeLowest.slice(0,8);
for(const model of models)report.flat.push({car:model.key,tireBottomsM:model.wheels.map(w=>+w.minY.toFixed(5)),measured:prepareVehicleGrounding(model.vehicle)});
for(const id of ['high-country','ridge-rally','timberline-rush']){
  const course=new Course(COURSE.find(c=>c.id===id),1989),candidates=[];
  for(let s=8;s<course.length-8;s+=8){const p=course.at(s),slope=groundSlope(course,s,0,0);candidates.push({s,heading:p.heading,grade:-Math.tan(slope.pitch),score:Math.abs(slope.pitch)*(1-Math.cos(p.heading))+Math.abs(slope.roll)*Math.abs(Math.sin(p.heading))});}
  const samples=[...candidates].sort((a,b)=>b.score-a.score).filter((candidate,index,array)=>array.slice(0,index).every(p=>Math.abs(p.s-candidate.s)>40)).slice(0,6);
  // Add the strongest ascent and descent even if their headings happen to mask
  // the rotation-order error.
  samples.push([...candidates].sort((a,b)=>b.grade-a.grade)[0],[...candidates].sort((a,b)=>a.grade-b.grade)[0]);
  const road=new THREE.Mesh(strip(course,s=>-course.roadHalfWidthAt(s),s=>course.roadHalfWidthAt(s),.035),material);road.updateMatrixWorld(true);
  for(const model of models){
    let low=Infinity,high=-Infinity,correctedLow=Infinity,correctedHigh=-Infinity;
    for(const sample of samples){
      const current=contacts(model,course,sample.s,0,road),corrected=current;
      low=Math.min(low,...current);high=Math.max(high,...current);correctedLow=Math.min(correctedLow,...corrected);correctedHigh=Math.max(correctedHigh,...corrected);
      report.worst.push({course:id,car:model.key,s:sample.s,headingDeg:+(sample.heading*180/Math.PI).toFixed(1),gradePercent:+(sample.grade*100).toFixed(2),gapsM:current.map(n=>+n.toFixed(4)),yawFirstGapsM:corrected.map(n=>+n.toFixed(4)),severity:Math.max(...current)-Math.min(...current)});
    }
    report.slopes.push({course:id,car:model.key,samples:samples.length,minGapM:+low.toFixed(4),maxGapM:+high.toFixed(4),yawFirstMinM:+correctedLow.toFixed(4),yawFirstMaxM:+correctedHigh.toFixed(4)});
  }
  road.geometry.dispose();
}
report.worst.sort((a,b)=>b.severity-a.severity);report.worst=report.worst.slice(0,8);console.log(JSON.stringify(process.argv.includes('--origin')?{source:report.heroSourceLowest,runtime:report.heroRuntimeLowest}:report,null,2));
}

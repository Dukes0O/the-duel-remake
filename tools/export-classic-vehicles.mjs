import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createClassicVehicle,CLASSIC_VEHICLE_DIMENSIONS} from '../src/classic-vehicles.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {updateDriver} from '../src/driver.js';

globalThis.FileReader??=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();},error=>this.onerror?.(error));}};
const destination=new URL('../public/assets/models/classics/',import.meta.url);await mkdir(destination,{recursive:true});const exporter=new GLTFExporter(),manifest=[];
for(const[key,dimensions]of Object.entries(CLASSIC_VEHICLE_DIMENSIONS)){
  const vehicle=createClassicVehicle({key});assert.equal(vehicle.userData.wheels.length,4);assert(vehicle.userData.driver&&vehicle.userData.steeringPivot&&vehicle.userData.boostFlames.length);
  for(const zone of['front','rear','left','right']){updateVehicleDamage(vehicle,2,false,0,{[zone]:2});let changed=0;for(const item of vehicle.userData.damageMeshes){const a=item.mesh.geometry.attributes.position.array;assert(a.every(Number.isFinite));for(let i=0;i<a.length;i++)if(Math.abs(a[i]-item.rest[i])>.005)changed++;}assert(changed>100,`${key} ${zone} visible localized deformation`);}
  updateVehicleDamage(vehicle,0,false,0,{front:0,rear:0,left:0,right:0});for(const item of vehicle.userData.damageMeshes){assert.deepEqual(item.mesh.geometry.attributes.position.array,item.rest);assert.deepEqual(item.mesh.geometry.attributes.normal.array,item.normals);}
  assert(vehicle.userData.fractures.every(f=>f.rest.length>0),`${key} all glass zones crack`);updateDriver(vehicle.userData.driver,.9,.2);updateDriver(vehicle.userData.driver,0);vehicle.updateMatrixWorld(true);
  const bounds=new THREE.Box3();let triangles=0,draws=0;
  vehicle.traverseVisible(object=>{if(!object.isMesh)return;bounds.union(new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position).applyMatrix4(object.matrixWorld));triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;draws++;});
  const measured=bounds.getSize(new THREE.Vector3());assert(Math.abs(measured.x-dimensions.width)<.04&&Math.abs(measured.y-dimensions.height)<.05&&Math.abs(measured.z-dimensions.length)<.06,`${key} original collision envelope`);
  vehicle.userData.wheelPivots.forEach((p,i)=>{p.name=`WheelPivot_${i}_${p.userData.front?'front':'rear'}`;});vehicle.userData.wheels.forEach((w,i)=>{w.name=`WheelSpin_${i}`;});vehicle.userData.driver.name='Driver_helmet_and_harness';vehicle.userData.steeringPivot.name='SteeringWheel';
  vehicle.traverse(object=>{object.userData={};object.geometry?.deleteAttribute('panelWear');});vehicle.userData={model:key,unit:'metre',forward:'+Z',driverLeft:'+X',up:'+Y',dimensions,source:'src/classic-vehicles.js'};
  const buffer=await exporter.parseAsync(vehicle,{binary:true,onlyVisible:true});await writeFile(new URL(`${key}.glb`,destination),Buffer.from(buffer));const entry={key,file:`${key}.glb`,bytes:buffer.byteLength,triangles,draws,dimensions,measured:measured.toArray().map(n=>+n.toFixed(3))};manifest.push(entry);console.log(JSON.stringify(entry));
}
await writeFile(new URL('manifest.json',destination),JSON.stringify({source:'Original classic starter vehicles for The Duel',vehicles:manifest},null,2)+'\n');console.log('Two original starter GLBs exported; geometry bounds, four damage directions, window cracks and exact resets passed.');

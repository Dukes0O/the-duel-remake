import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClassicVehicle,CLASSIC_VEHICLE_DIMENSIONS} from '../src/classic-vehicles.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {updateDriver} from '../src/driver.js';
import {prepareVehicleGrounding} from '../src/vehicle-grounding.js';

let checks=0;const ok=(value,label)=>{assert.ok(value,label);checks++;},equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const models=Object.keys(CLASSIC_VEHICLE_DIMENSIONS).map(key=>createClassicVehicle({key,color:0x939d9c,accent:0x333333}));
equal(createClassicVehicle({key:'aurora_gt'}),null,'Unsupported model cannot silently become a starter');
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),surfaces=[];
for(const vehicle of models) {
  const d=vehicle.userData,key=d.classicKey,expected=CLASSIC_VEHICLE_DIMENSIONS[key];vehicle.updateMatrixWorld(true);
  equal(vehicle.name,key,'Semantic model identity');equal(d.paint.color.getHex(),0x939d9c,'Neutral paint is identical');
  equal(d.wheels.length,4,'Four actual animated wheels');equal(d.wheelPivots.filter(p=>p.userData.front).length,2,'Only front wheels steer');
  ok(d.driver&&d.steeringPivot&&d.brakeLights.length&&d.boostFlames.length,'All production animation hooks exist');
  const skin=d.damageMeshes.filter(item=>item.mesh.material===d.paint).map(item=>item.mesh);surfaces.push(skin);
  const bounds=new THREE.Box3();vehicle.traverseVisible(object=>{if(object.isMesh){bounds.union(new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position).applyMatrix4(object.matrixWorld));ok(object.geometry.attributes.position.array.every(Number.isFinite),`${key} finite mesh`);}});
  const size=bounds.getSize(new THREE.Vector3());ok(Math.abs(size.x-expected.width)<.04&&Math.abs(size.z-expected.length)<.06&&Math.abs(size.y-expected.height)<.05,`${key} retains collision envelope`);
  const grounding=prepareVehicleGrounding(vehicle);ok(grounding.wheels.length===4&&grounding.wheels.every(w=>Number.isFinite(w.radius)),`${key} measured tire plane`);
  // This is the real painted deck crossing the driver's chest defect, tested
  // inside the opening beneath the windshield and above the seat cushion.
  ray.set(new THREE.Vector3(d.driver.position.x,1.04,-.25),down);const deck=ray.intersectObjects(skin,false)[0];ok(!deck||deck.point.y<.67,`${key} no painted body slab crosses the seated torso`);
  updateDriver(d.driver,.85,.14);for(const arm of d.driver.userData.arms)ok(arm.hand.position.toArray().every(Number.isFinite),`${key} steering pose`);updateDriver(d.driver,0);
  for(const zone of['front','rear','left','right']) {
    updateVehicleDamage(vehicle,2,false,0,{[zone]:2});let changes=0;
    for(const item of d.damageMeshes){const a=item.mesh.geometry.attributes.position.array;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-item.rest[i])>.004)changes++;}
    ok(changes>100,`${key} ${zone} visibly deforms`);
  }
  updateVehicleDamage(vehicle,0,false,0,{front:0,rear:0,left:0,right:0});for(const item of d.damageMeshes){equal(item.mesh.geometry.attributes.position.array,item.rest,`${key} exact reset`);equal(item.mesh.geometry.attributes.normal.array,item.normals,`${key} normal reset`);}
  equal(d.fractures.length,4,'Four directional glazing zones');ok(d.fractures.every(f=>f.rest.length>0),'Each zone intersects actual glazing');
}
// Same color and same viewing rays: these must be different physical shells,
// not a paint preset of one imported car. Sample visible roofs, nose and wing.
let deltaSquared=0,samples=0,maxDifference=0;
for(let z=-2.15;z<=2.16;z+=.18)for(const x of[-.86,-.65,-.4,0,.4,.65,.86]) {
  const heights=surfaces.map(skin=>{ray.set(new THREE.Vector3(x,3,z),down);return ray.intersectObjects(skin,false)[0]?.point.y;});
  if(heights.every(Number.isFinite)){const difference=Math.abs(heights[0]-heights[1]);deltaSquared+=difference*difference;samples++;maxDifference=Math.max(maxDifference,difference);}
}
const rms=Math.sqrt(deltaSquared/samples);ok(samples>100,'Substantial matching surface coverage');ok(rms>.065&&maxDifference>.18,`Neutral-paint starter silhouettes differ materially: RMS ${rms}`);
const nose=(skin,x,z)=>{ray.set(new THREE.Vector3(x,3,z),down);return ray.intersectObjects(skin,false)[0]?.point.y;};
ok(nose(surfaces[1],0,2.1)>nose(surfaces[0],0,2.1)+.10,'Rounded coupe has a fuller nose than the flat wedge');
ok(nose(surfaces[0],0,-2.05)>nose(surfaces[1],0,-2.05)+.15,'Falcone bridge is distinctly higher than Stuttgart integrated hoop');
console.log(`Classic vehicles: ${checks} checks; ${samples} same-paint surface comparisons, ${(rms*100).toFixed(1)}cm RMS / ${(maxDifference*100).toFixed(1)}cm maximum silhouette difference; cockpit, animation, grounding, glass and damage reset preserved.`);

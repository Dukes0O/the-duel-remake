import assert from 'node:assert/strict';
import * as THREE from 'three';
import {styleGhostVehicle} from '../src/ghost-vehicle.js';
import {createUnlockedVehicle} from '../src/unlock-vehicles.js';
const car=createUnlockedVehicle({key:'banshee_muscle'}),original=[];
car.traverse(object=>{if(object.isMesh)original.push([object,object.material,object.castShadow,object.receiveShadow,object.renderOrder]);});
const style=styleGhostVehicle(car),material=original[0][0].material;let checks=0;
for(const [mesh,prior]of original){assert.notEqual(mesh.material,prior);assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false);checks+=3;}
style.opacity(2);assert.equal(material.opacity,.3);style.opacity(-1);assert.equal(material.opacity,0);checks+=2;
style.restore();style.restore();
for(const [mesh,prior,cast,receive,order]of original){assert.equal(mesh.material,prior);assert.equal(mesh.castShadow,cast);assert.equal(mesh.receiveShadow,receive);assert.equal(mesh.renderOrder,order);checks+=4;}
assert.ok(car instanceof THREE.Group);checks++;
console.log(`Ghost vehicle: ${checks} isolated-material and cleanup checks passed.`);

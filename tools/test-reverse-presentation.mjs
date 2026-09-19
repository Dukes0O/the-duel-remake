import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {DRIVE} from '../src/config.js';
import {placeGroundedVehicle} from '../src/vehicle-grounding.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const renderer=readFileSync(new URL('../src/render3d.js',import.meta.url),'utf8');
// Exercise the actual HUD expressions without starting a browser or touching saves.
const hud=main.match(/text\('speed-value',([^;]+)\); text\('gear-value',([^;]+)\);/);
check(hud,'HUD speed and gear expressions remain available');
const readout=new Function('s',`return [${hud[1]},${hud[2]}];`);
for(const [speedMph,gear,expected]of [[-22,-1,['022','R']],[-.3,-1,['000','R']],[0,-1,['000','R']],[0,0,['000',1]],[137.8,3,['138',4]]]){
  assert.deepEqual(readout({speedMph,gear}),expected);checks++;
}
const travel=renderer.match(/const wheelTravel = mph => ([^;]+);/);
check(travel,'renderer wheel travel expression remains available');
const wheelTravel=new Function('moving','DRIVE','dt','mph',`return ${travel[1]};`);
check(wheelTravel(true,DRIVE,.1,-22)<0&&wheelTravel(true,DRIVE,.1,22)>0,'wheel travel preserves the direction of speed');
check(wheelTravel(false,DRIVE,.1,-22)===0,'paused or inactive reverse wheels do not turn');
check(/place\(player, pp, 0, wheelTravel\(st.speedMph\)\)/.test(renderer),'live player uses signed speed for wheel travel');
check(/place\(ghost,gp,ghostPose.headingError,wheelTravel\(ghostPose.speedMph\)\)/.test(renderer),'ghost uses its own signed recorded speed for wheel travel');
const vehicle=new THREE.Group(),wheel=new THREE.Group();
wheel.add(new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),new THREE.MeshBasicMaterial()));
vehicle.add(wheel);vehicle.userData.wheels=[wheel];
const point={x:0,y:0,z:0,heading:0};
placeGroundedVehicle(vehicle,point,0,wheelTravel(true,DRIVE,.1,-22));
check(wheel.rotation.x<0,'grounded reverse travel actually turns wheel geometry backwards');
placeGroundedVehicle(vehicle,point,0,wheelTravel(true,DRIVE,.1,22));
check(Math.abs(wheel.rotation.x)<1e-12,'equal forward travel restores the wheel angle exactly');
const brake=renderer.match(/const braking=([^;]+);/);
check(brake,'renderer chooses brake lamps from effective gear pedals');
const braking=new Function('st',`return ${brake[1]};`);
check(braking({gear:-1,input:{throttle:0,brake:1}})===0,'reverse acceleration does not light the red brake lamps');
check(braking({gear:-1,input:{throttle:1,brake:0}})===1,'W/RT braking in reverse lights the red brake lamps');
check(braking({gear:0,input:{throttle:0,brake:1}})===1,'forward brake lamp behavior stays unchanged');
check(/const speed=Math.abs\(st.speedMph\)/.test(renderer)&&!/Math.min\(st.speedMph\s*\//.test(renderer),'camera field of view, shake and body lean use speed magnitude');
wheel.children[0].geometry.dispose();wheel.children[0].material.dispose();
console.log(`Reverse presentation: ${checks} HUD, signed live/ghost wheel travel, grounded spin, camera and brake-lamp checks passed.`);

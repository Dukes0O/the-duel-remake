import assert from 'node:assert/strict';
import {strip,terrainGeometry as terrain} from '../src/world.js';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { addRallyDetail } from '../src/rally-detail.js';

const ray=new THREE.Raycaster(),direction=new THREE.Vector3(0,-1,0),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
let checks=0,minRutGap=Infinity,maxRutGap=-Infinity,maxTerrainGap=-Infinity;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
for(const seed of [1989,42,17,9999]){
  const course=new Course(COURSE.find(def=>def.offroad),seed),dressing=addRallyDetail(new THREE.Group(),course);
  const road=[new THREE.Mesh(strip(course,s=>-course.roadHalfWidthAt(s),s=>course.roadHalfWidthAt(s),.035),material)];
  for(const cut of course.features.shortcuts)road.push(new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,s=>course.shortcutOffset(cut,s)+cut.halfWidth,.065,cut.start,cut.end,true),material));
  const ground=new THREE.Mesh(terrain(course,true),material);
  for(const placement of dressing.userData.rallyDetail.placements){
    check(Math.abs(course.groundAt(placement.s,placement.off).y-placement.y)<1e-6,`${seed}: ${placement.kind} base follows terrain`);
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8,n=course.nearest(placement.x+Math.cos(angle)*placement.radius,placement.z+Math.sin(angle)*placement.radius);
      check(!course.surfaceAt(n.s,n.lateral).road,`${seed}: ${placement.kind} enters a legal driving corridor`);
    }
    for(const tunnel of course.features.tunnels)check(!(placement.s>tunnel.start-placement.radius&&placement.s<tunnel.end+placement.radius&&Math.abs(placement.off)<42+placement.radius),`${seed}: dressing intersects tunnel cover`);
  }
  const positions=dressing.children[0].geometry.attributes.position;
  // Include the previously failing merge samples as well as a course-wide grid.
  const samples=new Set();for(let i=0;i<positions.count;i+=137)samples.add(i);
  for(let i=0;i<positions.count;i++)if(Math.abs(course.nearest(positions.getX(i),positions.getZ(i)).s-1628)<.05||Math.abs(course.nearest(positions.getX(i),positions.getZ(i)).s-2786)<.05)samples.add(i);
  for(const i of samples){
    // Fully faded edge/end vertices are not visible. At an exact merge end,
    // Float32 rounding can put their ray micrometres outside the upper strip.
    if(dressing.children[0].geometry.attributes.color.getW(i)<.001)continue;
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),nearest=course.nearest(x,z);
    // At the exact interface two strips differ in height by 3 cm. Avoid an
    // ambiguous floating-point ray on that boundary; both adjacent rows remain
    // in the audit and must agree with the actual rendered top surface.
    if(course.features.shortcuts.some(cut=>Math.abs(nearest.s-cut.start)<.001||Math.abs(nearest.s-cut.end)<.001))continue;
    ray.set(new THREE.Vector3(x,y+100,z),direction);
    const top=ray.intersectObjects(road,false)[0],soil=ray.intersectObject(ground,false)[0];
    check(!!top,`${seed}: rut has no rendered road beneath it`);
    const gap=y-top.point.y;minRutGap=Math.min(minRutGap,gap);maxRutGap=Math.max(maxRutGap,gap);
    check(gap>-.002&&gap<.025,`${seed}: rut is buried/floating by ${gap.toFixed(4)}m at vertex${i}, route ${JSON.stringify(course.nearest(x,z))}`);
    check(!!soil,`${seed}: terrain hole beneath road`);
    maxTerrainGap=Math.max(maxTerrainGap,soil.point.y-top.point.y);
    check(soil.point.y<top.point.y-.012,`${seed}: terrain intersects the driving surface`);
  }
  for(const mesh of [...road,ground,...dressing.children])mesh.geometry.dispose();
}
for(const def of COURSE.filter(def=>!def.offroad))check(addRallyDetail(new THREE.Group(),new Course(def,1989))===null,`${def.name}: rally dressing leaks into another event`);
console.log(`Rally detail: ${checks} checks passed; rut gap ${minRutGap.toFixed(4)}–${maxRutGap.toFixed(4)}m; terrain below road by at least ${(-maxTerrainGap).toFixed(4)}m.`);

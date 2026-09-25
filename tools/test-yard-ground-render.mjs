import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {hiddenRoadGroundGeometry} from '../src/world-surfaces.js';

for (const route of ROUTE_VARIANTS) test(`${route.id}: rendered yard floor matches existing physical flat support`, () => {
  const course=new Course(COURSE.find(row=>row.id==='pacific-canyon'),route.seed,{hiddenRoad:true});
  const road=course.hiddenRoad, gate=road.poseAt(road.length);
  const before=JSON.stringify({road:road.samples,walls:road.walls,obstacles:course.features.obstacles});
  const geometry=hiddenRoadGroundGeometry(course), material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material); mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(); let checked=0;
  try {
    for(const localX of [-100,-60,-20,0,20,60,100]) for(const localZ of [12,30,60,100,150,190,224.5]) {
      const x=gate.x+localX*Math.cos(gate.heading)+localZ*Math.sin(gate.heading);
      const z=gate.z-localX*Math.sin(gate.heading)+localZ*Math.cos(gate.heading);
      if(!road.contains(x,z)) continue;
      const near=course.nearest(x,z,gate.s), floor=course.groundAt(near.s,near.lateral).y;
      assert.ok(Math.abs(floor-gate.y)<.001,'the existing physical yard is flat');
      ray.set(new THREE.Vector3(x,gate.y+1000,z),new THREE.Vector3(0,-1,0));
      const hits=ray.intersectObject(mesh,false);
      assert.ok(hits.length,`rendered floor is present at ${localX},${localZ}`);
      assert.ok(Math.abs(hits[0].point.y-(floor+.035))<.20,
        `visible terrain at ${localX},${localZ} is ${hits[0].point.y-floor}m above physical floor`);
      checked++;
    }
    assert.ok(checked>=35);
    assert.equal(JSON.stringify({road:road.samples,walls:road.walls,obstacles:course.features.obstacles}),before);
  } finally {geometry.dispose();material.dispose();}
});

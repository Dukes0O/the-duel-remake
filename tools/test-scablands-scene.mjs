import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {scablandsSurfaceHeightAt,scablandsGroundEdit,resetScablandsGroundEdit} from '../src/world/scablands-ground.js';
import {createScablandsScene,SCABLANDS_ASSETS,SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';

const course=new Course(SCABLANDS_VENUE,1989);
const loaded=[];
const scene=createScablandsScene(course,{loadAsset:async path=>{
  loaded.push(path);const root=new THREE.Group();root.name=path;
  if(path===SCABLANDS_ASSETS.vehicles){
    for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace",'Thief buggy']){const part=new THREE.Group();part.name=name;root.add(part);}
  }
  return {scene:root};
}});
assert.equal(await scene.ready,true,'all placed art loads');
assert.equal(loaded.length,7,'each required art family loads once');
assert.deepEqual(new Set(loaded),new Set(Object.values(SCABLANDS_ASSETS)),'only the shipped Scablands art families load');

const places=new Map(SCABLANDS_PLACES.map(place=>[place.id,place]));
assert.equal(SCABLANDS_SOLIDS.length,8,'each named place has its solid');
for(const solid of SCABLANDS_SOLIDS){
  const place=places.get(solid.placeId);
  assert.ok(place,`${solid.id} names a place table entry`);
  assert.ok(solid.collision,`${solid.id} has collision`);
  assert.deepEqual(solid.collision.center,solid.center,`${solid.id} collision center matches its place placement`);
  assert.deepEqual(solid.collision.halfExtents,solid.size.map(value=>value/2),`${solid.id} collision covers its declared solid dimensions`);
  assert.ok(Math.abs(solid.center[0]-place.x)<100&&Math.abs(solid.center[2]-place.z)<100,`${solid.id} remains at ${place.name}`);
  assert.ok(solid.size.every(value=>value>0),'solid dimensions are positive');
}

const ground=scene.group.getObjectByName('Scablands ground chunks');
const near=ground.children.filter(mesh=>mesh.name==='Scablands near ground');
const far=ground.children.find(mesh=>mesh.name==='Scablands far ground');
assert.equal(near.length,4,'near ground is split into four chunks');
assert.ok(far,'a coarse horizon ground is present');
assert.ok(near[0].geometry.attributes.position.count>far.geometry.attributes.position.count,'far ground uses fewer vertices');
const nearVertex=near[0].geometry.attributes.position;
const x=near[0].position.x+nearVertex.getX(0),z=near[0].position.z+nearVertex.getZ(0);
assert.ok(Math.abs(near[0].position.y+nearVertex.getY(0)-scablandsSurfaceHeightAt(x,z)-.025)<.001,'rendered terrain samples the shared physics height');
const untouchedX=far.geometry.attributes.position.getX(0),untouchedZ=far.geometry.attributes.position.getZ(0);
const untouchedY=far.geometry.attributes.position.getY(0);
const editX=far.geometry.attributes.position.getX(1),editZ=far.geometry.attributes.position.getZ(1);
scablandsGroundEdit.cut({x:editX,z:editZ,radius:1},scablandsGroundEdit.heightAt(editX,editZ)-3);
assert.ok(scene.group.userData.updateGroundView()>0,'committed edits refresh near ground and horizon');
assert.ok(Math.abs(far.geometry.attributes.position.getY(1)-untouchedY)>0.1,'far ground rebuild includes edited terrain');
assert.equal(far.geometry.attributes.position.getY(0),untouchedY,'far ground keeps undug terrain exactly unchanged');
resetScablandsGroundEdit();
assert.ok(scene.group.getObjectByName('Radio mast visible across the Scablands'),'mast is placed in the world');
assert.ok(scene.group.getObjectByName('Everburn smoke pillar visible across the Scablands'),'smoke pillar is placed in the world');
assert.ok(scene.group.getObjectByName("Old Smoke's furnace fire and chimney smoke"),'furnace art gets its smoke and fire treatment');
assert.ok(scene.group.getObjectByName('Dead Mall sand drifts and rubble'),'mall art gets rubble dressing');
assert.equal(scene.group.userData.solids,SCABLANDS_SOLIDS,'scene exposes the tested static collision set');
scene.dispose();
assert.equal(scene.group.children.length,0,'disposing the scene releases its presentation graph');
console.log('Scablands scene: place art, coarse horizon, shared ground, landmark visibility and all solid collision boxes pass.');

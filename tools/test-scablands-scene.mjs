import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {scablandsSurfaceHeightAt,scablandsGroundEdit,resetScablandsGroundEdit} from '../src/world/scablands-ground.js';
import {createScablandsScene,SCABLANDS_ASSETS,SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
import {animateScene,syncScene} from '../src/scene-systems.js';

const course=new Course(SCABLANDS_VENUE,1989);
const loaded=[];
const scene=createScablandsScene(course,{loadAsset:async path=>{
  loaded.push(path);const root=new THREE.Group();root.name=path;
  if(path===SCABLANDS_ASSETS.vehicles){
    for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace",'Thief buggy']){
      const part=new THREE.Group();part.name=name;root.add(part);
      if(name==="Old Smoke's rolling furnace")for(const plateName of ['Furnace side armor','Furnace side armor','Hanging torn furnace plate','Hanging torn furnace plate','Furnace torn corner plate','Furnace torn corner plate']){
        const plate=new THREE.Group();plate.name=plateName;part.add(plate);
      }
      // The model's three rear vents are the rear door; three vents on each flank are the left and right doors.
      if(name==="Old Smoke's rolling furnace")for(let index=1;index<=3;index++)for(const ventName of [`old-smoke-vent-${index}-glow`,`Flank vent 1 ${index} ember`,`Flank vent -1 ${index} ember`]){
        const vent=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xff8020,emissive:0xff8020,emissiveIntensity:2}));
        vent.name=ventName;part.add(vent);
      }
    }
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
const furnace=scene.group.getObjectByName("Old Smoke's rolling furnace");
assert.ok(furnace,'Everburn places the furnace model');
assert.equal(furnace.scale.x,1.5,'Old Smoke is scaled up by half in the world');
const stillPosition=new THREE.Vector3();furnace.getWorldPosition(stillPosition);
assert.ok(Math.abs(stillPosition.x-(places.get('everburn').x+18))<.001,
  'outside the chase, the furnace remains in its authored Everburn place');
const doorMaterials=door=>[1,2,3].map(index=>scene.group.getObjectByName(
  door==='rear'?`old-smoke-vent-${index}-glow`:`Flank vent ${door==='left'?'':'-'}1 ${index} ember`).material.emissiveIntensity);
const furnaceFire=scene.group.getObjectByName("Old Smoke's furnace fire and chimney smoke");
const everburn=places.get('everburn'),doorWorld=new THREE.Vector3(),chimneyWorld=new THREE.Vector3();
furnaceFire.children[0].getWorldPosition(doorWorld);furnaceFire.children[6].getWorldPosition(chimneyWorld);
assert.ok(Math.abs(doorWorld.x-(everburn.x+17.28))<.001,
  'fire is placed at the furnace door on its forward face');
assert.ok(Math.abs(chimneyWorld.x-(everburn.x+19.77))<.001&&Math.abs(chimneyWorld.z-(everburn.z+.93))<.001,
  'smoke starts over the scaled furnace chimney');
const chaseState={arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn'},clockSec:0,job:{stepIndex:0,steps:[{kind:'chase'}]},
  actors:[{id:'old-smoke-furnace',startedAtSec:0,position:{x:places.get('everburn').x+100,y:0,z:places.get('everburn').z},heading:.5,
    furnace:{phase:'glow',door:'left',hits:0,phaseSec:0}}]}}};
assert.equal(EVERBURN_JOBS[5].steps[1].actor.renderCar,undefined,'Old Smoke does not spawn as an ordinary vehicle');
syncScene(scene.group,chaseState);
const actor=chaseState.arena.worldJob.actors[0],furnaceWorld=new THREE.Vector3(),litVentWorld=new THREE.Vector3();
furnace.getWorldPosition(furnaceWorld);scene.group.getObjectByName('Flank vent 1 1 ember').getWorldPosition(litVentWorld);
assert.ok(furnaceWorld.distanceTo(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z))<8,
  'after the actor moves 100 m, the authored furnace follows within 8 m');
assert.ok(Math.abs(furnace.parent.rotation.y-actor.heading)<.001,'the furnace follows the chase actor heading');
assert.ok(litVentWorld.distanceTo(new THREE.Vector3(actor.position.x,actor.position.y,actor.position.z))<8,
  'the lit vent on the moving furnace is within 8 m of the hit target');
const lit=()=>[doorMaterials('left'),doorMaterials('right'),doorMaterials('rear')];
const dark=[.15,.15,.15],glow=[2.8,2.8,2.8];
const furnaceActor=chaseState.arena.worldJob.actors[0];
assert.deepEqual(lit(),[glow,dark,dark],'only the open door glows: the left door lights its flank vents');
furnaceActor.furnace={phase:'glow',door:'right',hits:1,phaseSec:0};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,glow,dark],'the visible glow follows the furnace\'s open door');
furnaceActor.furnace={phase:'glow',door:'rear',hits:2,phaseSec:0};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,dark,glow],'the rear door lights the rear vents');
furnaceActor.furnace={phase:'stoke',door:'rear',hits:2,phaseSec:4};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,dark,dark],'no door glows during the stoke');
const plates=[];furnace.traverse(node=>{if(/armor$|plate$/.test(node.name))plates.push(node);});
const visiblePlates=()=>plates.filter(plate=>plate.visible).length;
assert.equal(plates.length,6,'the furnace model has six armour plates');
furnaceActor.furnace={phase:'idle',door:null,hits:0,phaseSec:0};
syncScene(scene.group,chaseState);
assert.equal(visiblePlates(),6,'all plates are on before the first hit');
furnaceActor.furnace={phase:'stagger',door:null,hits:1,phaseSec:0};
syncScene(scene.group,chaseState);
assert.equal(visiblePlates(),4,'a plate falls off the furnace with each hit');
furnaceActor.furnace={phase:'rollin',door:null,hits:3,phaseSec:0};
syncScene(scene.group,chaseState);
assert.equal(visiblePlates(),0,'every plate has gone by the third hit');
furnaceActor.furnace={phase:'stoke',door:'rear',hits:2,phaseSec:4};
syncScene(scene.group,chaseState);
const sootColour=scene.group.getObjectByName("Old Smoke's furnace fire and chimney smoke").children[6].material.color;
assert.ok(sootColour.r>sootColour.b*1.8,'the smoke turns orange at the end of the stoke');
furnaceActor.furnace={phase:'idle',door:null,hits:0,phaseSec:0};
syncScene(scene.group,chaseState);
const greySmoke=sootColour.r;
furnaceActor.furnace={phase:'idle',door:null,hits:3,phaseSec:0};
syncScene(scene.group,chaseState);
assert.ok(sootColour.r<greySmoke,'the smoke is blacker after the hits');
const soot=furnaceFire.children[6];
const smokeY=soot.position.y;animateScene(scene.group,2);
assert.notEqual(soot.position.y,smokeY,'chimney smoke moves as presentation');
assert.ok(scene.group.getObjectByName('Dead Mall sand drifts and rubble'),'mall art gets rubble dressing');
assert.equal(scene.group.userData.solids,SCABLANDS_SOLIDS,'scene exposes the tested static collision set');
scene.dispose();
assert.equal(scene.group.children.length,0,'disposing the scene releases its presentation graph');
console.log('Scablands scene: place art, coarse horizon, shared ground, landmark visibility and all solid collision boxes pass.');

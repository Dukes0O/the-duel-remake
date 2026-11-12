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
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace){
    for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){
      const part=new THREE.Group();part.name=name;root.add(part);
      if(name==="Old Smoke's rolling furnace")for(const plateName of ['Furnace side armor','Furnace side armor','Hanging torn furnace plate','Hanging torn furnace plate','Furnace torn corner plate','Furnace torn corner plate']){
        const plate=new THREE.Group();plate.name=plateName;part.add(plate);
      }
      // Each truck carries six wheels named as its recipe names them; they turn about the model's X axis.
      if(name==='Big Bess gas truck'||name==="Old Smoke's rolling furnace")for(let index=1;index<=3;index++)for(const side of ['left','right']){
        const wheel=new THREE.Group();wheel.name=`${name==='Big Bess gas truck'?'Big Bess':'Furnace'} wheel ${index} ${side}`;part.add(wheel);}
      // Twelve parts share one material, as the real model's rust and steel parts do.
      if(name==="Old Smoke's rolling furnace"){const shared=new THREE.MeshStandardMaterial({color:new THREE.Color(.5,.5,.5)});
        for(let index=0;index<12;index++){const body=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),shared);body.name=`Shared body part ${index}`;part.add(body);}}
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
assert.ok(Math.abs(scene.group.getObjectByName('Shared body part 11').material.color.r-.42)<.001,
  'a material shared by many parts is tinted once, not once for every part');
assert.equal(loaded.length,8,'each required art family loads once');
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
// BIG-BESS-PHOTO: the Scablands scene draws Big Bess's own truck. She has her own rig, outside the Boneyard's detail
// group, that stands at her old Boneyard place and follows her escort actor in the Everburn story.
const boneyard=places.get('boneyard'),bessRig=scene.group.getObjectByName('Big Bess moving rig');
assert.ok(bessRig&&bessRig.parent===scene.group,'Big Bess has her own moving rig, outside the Boneyard detail group');
assert.ok(bessRig.getObjectByName('Big Bess gas truck'),'the rig carries the Big Bess model');
assert.ok(bessRig.getObjectByName('Big Bess exhaust, shade and road dust'),'Big Bess gets her exhaust, shade and road dust');
const bessAt=()=>new THREE.Vector3().copy(bessRig.position);
assert.ok(bessAt().distanceTo(new THREE.Vector3(boneyard.x+18,scablandsSurfaceHeightAt(boneyard.x,boneyard.z),boneyard.z))<.001,
  'outside a job, Big Bess stands at her Boneyard place');
assert.ok(Math.abs(bessRig.rotation.y-(SCABLANDS_PLACES.indexOf(boneyard)%4)*Math.PI/2)<.001,'outside a job, she keeps her Boneyard turn');
assert.ok(!EVERBURN_JOBS[3].steps[0].actor.renderCar,'job 4 spawns no stand-in car for Big Bess: the Scablands scene draws her truck');
const bessActor={id:'big-bess',position:{x:boneyard.x+100,y:0,z:boneyard.z},heading:1.2};
syncScene(scene.group,{arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn'},clockSec:0,job:{stepIndex:0,steps:[{kind:'escort',path:[]}]},actors:[bessActor]}}});
assert.ok(bessAt().distanceTo(new THREE.Vector3(boneyard.x+100,scablandsSurfaceHeightAt(boneyard.x+100,boneyard.z),boneyard.z))<.001,
  'in the escort, Big Bess takes the position of her actor, on the ground');
assert.ok(Math.abs(bessRig.rotation.y-1.2)<.001,'in the escort, Big Bess takes the heading of her actor');
bessActor.heading=undefined;bessActor.position={x:0,y:0,z:0};bessActor.pathIndex=1;
const escortAt=(actors,path=[])=>({arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn'},clockSec:0,job:{stepIndex:0,steps:[{kind:'escort',path}]},actors}}});
syncScene(scene.group,escortAt([bessActor],[{position:{x:0,z:0}},{position:{x:100,z:0}}]));
assert.ok(Math.abs(bessRig.rotation.y-Math.PI/2)<.001,'with no heading of her own, Big Bess faces the path point she is driving to');
assert.ok(bessRig.getObjectByName('Exhaust smoke'),'Big Bess has her exhaust smoke');
const doorMaterials=door=>[1,2,3].map(index=>scene.group.getObjectByName(
  door==='rear'?`old-smoke-vent-${index}-glow`:`Flank vent ${door==='left'?'':'-'}1 ${index} ember`).material.emissiveIntensity);
const furnaceFire=scene.group.getObjectByName("Old Smoke's furnace fire and chimney smoke");
const everburn=places.get('everburn'),chimneyWorld=new THREE.Vector3();
furnaceFire.children[6].getWorldPosition(chimneyWorld);
// EVERBURN-FURNACE-LOOK round 2: the stand-in cones at the front face are gone. Fire now stands over each of the
// three doors and shows only while that door glows.
const tongues=furnaceFire.children.slice(0,6),fireOver=()=>tongues.filter(tongue=>tongue.visible).map(tongue=>tongue.userData.door);
assert.deepEqual(tongues.map(tongue=>tongue.userData.door),['left','left','right','right','rear','rear'],'each door has two tongues of fire');
assert.ok(tongues[0].position.x>2&&tongues[2].position.x<-2&&tongues[4].position.z<-4,'the fire stands over the left, right and rear doors');
assert.deepEqual(fireOver(),[],'no fire shows over a door outside the chase');
// EVERBURN-FURNACE-LOOK round 3: the photo model's chimney stands behind the cab on the furnace's left.
assert.ok(Math.abs(chimneyWorld.x-(everburn.x+16))<.001&&Math.abs(chimneyWorld.z-(everburn.z+1.1))<.001,
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
assert.deepEqual(fireOver(),['left','left'],'fire shows over the glowing left door only');
furnaceActor.furnace={phase:'glow',door:'right',hits:1,phaseSec:0};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,glow,dark],'the visible glow follows the furnace\'s open door');
furnaceActor.furnace={phase:'glow',door:'rear',hits:2,phaseSec:0};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,dark,glow],'the rear door lights the rear vents');
assert.deepEqual(fireOver(),['rear','rear'],'fire shows over the glowing rear door only');
furnaceActor.furnace={phase:'stoke',door:'rear',hits:2,phaseSec:4};
syncScene(scene.group,chaseState);
assert.deepEqual(lit(),[dark,dark,dark],'no door glows during the stoke');
assert.deepEqual(fireOver(),[],'no fire shows over a door during the stoke');
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
// Wheels turn by the distance driven divided by the wheel radius, and the road dust shows only while she moves.
const bessWheel=scene.group.getObjectByName('Big Bess wheel 3 right'),dustPuffs=()=>bessRig.getObjectByName('Road dust behind the wheels').children;
bessActor.heading=0;bessActor.position={x:0,y:0,z:0};
syncScene(scene.group,escortAt([bessActor]));
animateScene(scene.group,100);
assert.equal(dustPuffs().filter(puff=>puff.visible).length,0,'no road dust shows while Big Bess stands still');
const spunBefore=bessWheel.rotation.x;
bessActor.position={x:0,y:0,z:5};
syncScene(scene.group,escortAt([bessActor]));
animateScene(scene.group,100.25);
const turned=(bessWheel.rotation.x-spunBefore-5/.555)%(Math.PI*2);
assert.ok(Math.abs(turned)<.001||Math.abs(Math.abs(turned)-Math.PI*2)<.001,'driving 5 m turns a 0.555 m wheel by 5 / 0.555 radians');
assert.ok(dustPuffs().filter(puff=>puff.visible).length>0,'road dust shows behind Big Bess once she moves');
assert.ok(dustPuffs().every(puff=>puff.position.z<-3.4&&puff.scale.x>=1&&puff.scale.x<=5),'road dust is born behind the rear axle and grows from 1 m to 5 m');
// The furnace's wheels turn too: 3 m driven turns a wheel of 85 x 3.2 / 404 m radius by 3 / that radius.
const furnaceWheel=scene.group.getObjectByName('Furnace wheel 2 left'),furnaceWheelRadius=85*3.2/404;
syncScene(scene.group,chaseState);
animateScene(scene.group,101);
const furnaceSpunBefore=furnaceWheel.rotation.x;
furnaceActor.position={x:furnaceActor.position.x+3*Math.sin(furnaceActor.heading),y:0,z:furnaceActor.position.z+3*Math.cos(furnaceActor.heading)};
syncScene(scene.group,chaseState);
animateScene(scene.group,101.25);
const furnaceTurned=(furnaceWheel.rotation.x-furnaceSpunBefore-3/furnaceWheelRadius)%(Math.PI*2);
assert.ok(Math.abs(furnaceTurned)<.001||Math.abs(Math.abs(furnaceTurned)-Math.PI*2)<.001,'driving 3 m turns the furnace wheel by 3 / its radius');
// EVERBURN-RUN-AT-TOWN: Tin Town's gate burns once the furnace has set it alight, and stays alight until the job ends.
const gateFire=scene.group.getObjectByName('Tin Town gate fire and smoke');
assert.ok(gateFire,'the scene carries a fire for Tin Town\'s gate');
assert.equal(gateFire.children.filter(node=>node.name==='Fire on the gate').length,3,'the gate has three tongues of fire');
assert.ok(gateFire.children.some(node=>node.name==='Gate smoke'),'the gate has a plume of smoke');
const everburnJob=EVERBURN_JOBS[5],gateAt=everburnJob.steps[1].path[everburnJob.steps[1].actor.gateWaypoint].position;
assert.deepEqual([gateAt.x,gateAt.z],[575,62],'the job names the gate at Tin Town');
const atGate=(furnace,extra={})=>({arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number:6},clockSec:0,job:{stepIndex:1,steps:everburnJob.steps},
  actors:[{id:'old-smoke-furnace',startedAtSec:0,position:{x:500,y:0,z:60},heading:1.5,furnace}],...extra}}});
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,gateBurnt:false}));
assert.equal(gateFire.visible,false,'the gate does not burn before the furnace has set it alight');
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,townReached:true,gateBurnt:false}));
assert.equal(gateFire.visible,false,'a furnace that reached the gate without burning it leaves it whole');
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,townReached:true,gateBurnt:true}));
assert.equal(gateFire.visible,true,'the gate burns after gateBurnt');
assert.ok(Math.hypot(gateFire.position.x-gateAt.x,gateFire.position.z-gateAt.z)<.001,'the fire stands on the gate');
const tongueHeights=gateFire.children.filter(node=>node.name==='Fire on the gate').map(node=>node.scale.y);
assert.ok(tongueHeights.every(height=>height>2.5&&height<3.8),'the tongues of fire are about 3 m tall');
const gateSmokeY=gateFire.children.find(node=>node.name==='Gate smoke').position.y;animateScene(scene.group,150);
assert.notEqual(gateFire.children.find(node=>node.name==='Gate smoke').position.y,gateSmokeY,'the gate smoke moves as presentation');
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,gateBurnt:false},{gateBurnt:true}));
assert.equal(gateFire.visible,true,'the job remembers the fire when a wreck starts the chase again');
syncScene(scene.group,{arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number:5},clockSec:0,job:{stepIndex:0,steps:[{kind:'heist'}]},actors:[]}}});
assert.equal(gateFire.visible,false,'another job starts with the gate whole');
// EVERBURN-RUN-AT-TOWN: the furnace is seen in jobs 1, 3 and 4 before it is fought. It is drawn only: no actor stands behind it.
const sightingState=(number,job,worldJob={})=>({arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number},clockSec:0,job,actors:[],...worldJob}}});
const rigAt=()=>{const point=new THREE.Vector3();furnace.parent.updateWorldMatrix(true,false);furnace.parent.getWorldPosition(point);return point;};
const rig=furnace.parent,restAt=new THREE.Vector3(places.get('everburn').x+18,scablandsSurfaceHeightAt(places.get('everburn').x,places.get('everburn').z),places.get('everburn').z);
// Job 1: standing on the skyline at (300, -120), smoke and no door fire, until the pot is delivered.
const hot={stepIndex:0,steps:EVERBURN_JOBS[0].steps,done:false};
syncScene(scene.group,sightingState(1,hot));
assert.ok(Math.hypot(rigAt().x-300,rigAt().z+120)<.001&&rig.visible,'job 1: the furnace stands at (300, -120)');
assert.ok(Math.abs(rigAt().y-scablandsSurfaceHeightAt(300,-120))<.001,'job 1: it stands on the ground');
assert.deepEqual(fireOver(),[],'job 1: no door fire shows on the standing furnace');
assert.ok(furnaceFire.children.slice(6,20).every(puff=>puff.name==='Chimney smoke'),'job 1: its chimney smoke is drawn');
animateScene(scene.group,200);
assert.ok(furnaceFire.visible&&furnace.visible,'job 1: the furnace and its smoke are drawn');
syncScene(scene.group,sightingState(1,{...hot,done:true}));
assert.equal(rig.visible,false,'job 1: once the pot is delivered the furnace is gone');
assert.equal(sightingState(1,hot).arena.worldJob.actors.length,0,'job 1: no furnace actor stands behind the sighting');
// Job 3: until the thief is caught the furnace keeps its place; then it rolls from (140, 470) toward (-60, 440) for 20 s and is gone.
const run={stepIndex:0,steps:EVERBURN_JOBS[2].steps,done:false};
syncScene(scene.group,sightingState(3,run,{clockSec:40}));
assert.ok(rigAt().distanceTo(restAt)<.001&&rig.visible,'job 3: before the catch the furnace stays where it was');
const rolling=seconds=>{syncScene(scene.group,sightingState(3,run,{clockSec:100+seconds,wonAtSec:100}));return rigAt();};
assert.ok(Math.hypot(rolling(0).x-140,rigAt().z-470)<.001,'job 3: it starts at (140, 470) as the thief is caught');
assert.ok(Math.abs(rig.rotation.y-Math.atan2(-200,-30))<.001,'job 3: it faces the way it rolls');
assert.ok(Math.hypot(rolling(10).x-40,rigAt().z-455)<.001,'job 3: halfway through the 20 seconds it is halfway along');
assert.ok(rolling(19.9).x<-59&&rig.visible,'job 3: it is still rolling just before 20 seconds');
rolling(20);
assert.equal(rig.visible,false,'job 3: after 20 seconds it is gone');
assert.deepEqual([rolling(5).x,rolling(5).z],[rolling(5).x,rolling(5).z],'job 3: the same clock gives the same place');
// Job 4: 150 m north of Big Bess while she is between 30% and 70% of her road, at her speed, then turning away north.
const slow=EVERBURN_JOBS[3].steps[0],points=slow.path.map(item=>item.position);
const legs=points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.z-points[index].z)),total=legs[0]+legs[1];
const escortAtShare=share=>{const metres=share*total,second=metres>legs[0],from=points[second?1:0],to=points[second?2:1],t=(metres-(second?legs[0]:0))/legs[second?1:0];
  return {id:'big-bess',position:{x:from.x+(to.x-from.x)*t,y:0,z:from.z+(to.z-from.z)*t},pathIndex:second?2:1};};
const escorting=(share,job={stepIndex:0,steps:EVERBURN_JOBS[3].steps,done:false})=>sightingState(4,job,{actors:[escortAtShare(share)]});
const wrapAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
syncScene(scene.group,escorting(.2));
assert.ok(rigAt().distanceTo(restAt)<.001,'job 4: before 30% of her road the furnace stays where it was');
for(const share of [.31,.5,.69]){
  const bess=escortAtShare(share).position;
  syncScene(scene.group,escorting(share));
  assert.ok(Math.hypot(rigAt().x-bess.x,rigAt().z-(bess.z-150))<.001&&rig.visible,`job 4: at ${share*100}% the furnace is 150 m north of Big Bess`);
  assert.ok(Math.abs(wrapAngle(rig.rotation.y-bessRig.rotation.y))<.001,'job 4: it faces the way she faces');
}
assert.deepEqual(fireOver(),[],'job 4: no door fire shows on the pacing furnace');
const before=escortAtShare(.69).position;
syncScene(scene.group,escorting(.76));
assert.ok(Math.abs(wrapAngle(rig.rotation.y-Math.PI))<.001,'job 4: past 70% it has turned to face north');
assert.ok(rigAt().z<before.z-150&&rig.visible,'job 4: and it is further north than before');
syncScene(scene.group,escorting(.99));
assert.equal(rig.visible,false,'job 4: it turns away north and is gone');
assert.equal(escorting(.5).arena.worldJob.actors.every(item=>item.id!=='old-smoke-furnace'),true,'job 4: no furnace actor stands behind the sighting');
syncScene(scene.group,sightingState(5,{stepIndex:0,steps:[{kind:'heist'}],done:false}));
assert.ok(rigAt().distanceTo(restAt)<.001&&rig.visible,'another job leaves the furnace where it stands');
assert.ok(scene.group.getObjectByName('Dead Mall sand drifts and rubble'),'mall art gets rubble dressing');
assert.equal(scene.group.userData.solids,SCABLANDS_SOLIDS,'scene exposes the tested static collision set');
scene.dispose();
assert.equal(scene.group.children.length,0,'disposing the scene releases its presentation graph');
// EVERBURN-WELL-ART: the game's model loader renames parts (a space becomes an underscore, a full stop is dropped).
// The scene must find the furnace, its six plates and its nine vent lights under those names too.
const loaderName=name=>THREE.PropertyBinding.sanitizeNodeName(name);
const renamed=createScablandsScene(course,{loadAsset:async path=>{
  const root=new THREE.Group();
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace)for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){
    const part=new THREE.Group();part.name=loaderName(name);root.add(part);
    if(name!=="Old Smoke's rolling furnace")continue;
    for(const plateName of ['Furnace side armor','Furnace side armor.001','Hanging torn furnace plate','Hanging torn furnace plate.001','Furnace torn corner plate','Furnace torn corner plate.001']){
      const plate=new THREE.Group();plate.name=loaderName(plateName);part.add(plate);}
    for(let index=1;index<=3;index++)for(const ventName of [`old-smoke-vent-${index}-glow`,`Flank vent 1 ${index} ember`,`Flank vent -1 ${index} ember`]){
      const vent=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({emissive:0xff8020,emissiveIntensity:2}));
      vent.name=loaderName(ventName);part.add(vent);}
  }
  return {scene:root};
}});
assert.equal(await renamed.ready,true,'the art loads when parts carry the loader\'s names');
const renamedRig=renamed.group.getObjectByName("Old Smoke's moving furnace rig");
assert.ok(renamedRig,'the furnace is placed when its part carries the loader\'s name');
syncScene(renamed.group,{arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn'},clockSec:0,job:{stepIndex:0,steps:[{kind:'chase'}]},
  actors:[{id:'old-smoke-furnace',startedAtSec:0,position:{x:0,y:0,z:0},heading:0,furnace:{phase:'glow',door:'right',hits:1,phaseSec:0}}]}}});
const renamedParts=[];renamedRig.traverse(node=>renamedParts.push(node));
assert.equal(renamedParts.filter(node=>/plate|armor/.test(node.name)&&!node.visible).length,2,'two of the six renamed plates fall with the first hit');
assert.equal(renamedParts.filter(node=>node.isMesh&&node.material.emissiveIntensity===2.8).length,3,'the three renamed vents of the glowing door light up');
renamed.dispose();
console.log('Scablands scene: place art, coarse horizon, shared ground, landmark visibility and all solid collision boxes pass.');

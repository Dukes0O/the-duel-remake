import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {SCABLANDS_VENUE,SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {TIN_TOWN_GATE} from '../src/world/tin-town-gate.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {GAS_RUN_PATHS} from '../src/world/jobs/gas-run.js';
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
assert.equal(SCABLANDS_SOLIDS.length,16,'the eight named places, six Tin Town clusters and two gate posts each have a solid');
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
assert.equal(gateFire.children.filter(node=>node.name==='Fire on the gate').length,9,'the gate has nine flames: two posts, three over the beam, four along the fences');
assert.ok(gateFire.children.some(node=>node.name==='Gate smoke'),'the gate has a plume of smoke');
const everburnJob=EVERBURN_JOBS[5],gateAt=everburnJob.steps[1].path[everburnJob.steps[1].actor.gateWaypoint].position;
assert.deepEqual([gateAt.x,gateAt.z],[575,82],'the job stops the furnace at (575, 82): the furnace stops in front of the gate');
const atGate=(furnace,extra={})=>({arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number:6},clockSec:0,job:{stepIndex:1,steps:everburnJob.steps},
  actors:[{id:'old-smoke-furnace',startedAtSec:0,position:{x:500,y:0,z:60},heading:1.5,furnace}],...extra}}});
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,gateBurnt:false}));
assert.equal(gateFire.visible,false,'the gate does not burn before the furnace has set it alight');
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,townReached:true,gateBurnt:false}));
assert.equal(gateFire.visible,false,'a furnace that reached the gate without burning it leaves it whole');
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,townReached:true,gateBurnt:true}));
assert.equal(gateFire.visible,true,'the gate burns after gateBurnt');
const gateModel=scene.group.getObjectByName('Tin Town gate');
assert.ok(Math.hypot(gateFire.position.x-gateModel.position.x,gateFire.position.z-gateModel.position.z)<.001,'the fire stands on the gate itself');
// LAND round 2 (Claude): the fire takes the whole gate. A flame at least 9 m tall stands from the ground up each post,
// three stand over the beam, and the fire reaches along both fences.
const gateTongues=gateFire.children.filter(node=>node.name==='Fire on the gate');
const postFlames=gateTongues.filter(node=>node.position.y===0&&Math.abs(Math.abs(node.position.x)-5.1)<.6);
assert.ok(postFlames.length===2&&postFlames.every(node=>node.scale.y>=9),'a flame at least 9 m tall climbs each post from the ground');
assert.equal(gateTongues.filter(node=>node.position.y>6).length,3,'three flames stand over the beam');
const reach=Math.max(...gateTongues.map(node=>node.position.x+node.scale.x/2))-Math.min(...gateTongues.map(node=>node.position.x-node.scale.x/2));
assert.ok(reach>=34&&Math.abs(gateTongues.reduce((sum,node)=>sum+node.position.x,0))<.001,'the fire reaches along both fences, 34 m or more, centred on the gate');
assert.equal(gateFire.children.filter(node=>node.name==='Gate smoke').length,12,'the plume is twelve puffs');
assert.equal(gateFire.children.filter(node=>node.name==='Sparks from the gate fire').length,9,'sparks are thrown off every flame');
const gateGlow=gateFire.children.find(node=>node.name==='Firelight on the ground at the gate');
assert.ok(gateGlow&&gateGlow.material.uniforms.uTime&&gateGlow.position.y<.5,'firelight lies on the ground at the gate');
const gateSmokeY=gateFire.children.find(node=>node.name==='Gate smoke').position.y;animateScene(scene.group,150);
assert.notEqual(gateFire.children.find(node=>node.name==='Gate smoke').position.y,gateSmokeY,'the gate smoke moves as presentation');
{
  let highest=0;
  for(let seconds=0;seconds<40;seconds+=.5){animateScene(scene.group,seconds);for(const puff of gateFire.children.filter(node=>node.name==='Gate smoke'))highest=Math.max(highest,puff.position.y);}
  assert.ok(highest>28&&highest<=33,`the plume rises about 30 m (highest ${highest.toFixed(1)} m)`);
  animateScene(scene.group,150);
}
syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,gateBurnt:false},{gateBurnt:true}));
assert.equal(gateFire.visible,true,'the job remembers the fire when a wreck starts the chase again');
syncScene(scene.group,{arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number:5},clockSec:0,job:{stepIndex:0,steps:[{kind:'heist'}]},actors:[]}}});
assert.equal(gateFire.visible,false,'another job starts with the gate whole');
// EVERBURN-RUN-AT-TOWN: the furnace is seen in jobs 1, 3 and 4 before it is fought. It is drawn only: no actor stands behind it.
const sightingState=(number,job,worldJob={})=>({arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn',number},clockSec:0,job,actors:[],...worldJob}}});
const rigAt=()=>{const point=new THREE.Vector3();furnace.parent.updateWorldMatrix(true,false);furnace.parent.getWorldPosition(point);return point;};
const rig=furnace.parent,restAt=new THREE.Vector3(places.get('everburn').x+18,scablandsSurfaceHeightAt(places.get('everburn').x,places.get('everburn').z),places.get('everburn').z);
// Job 1: standing on the skyline at (300, -60), smoke and no door fire, until the pot is delivered.
const hot={stepIndex:0,steps:EVERBURN_JOBS[0].steps,done:false};
syncScene(scene.group,sightingState(1,hot));
assert.ok(Math.hypot(rigAt().x-300,rigAt().z+60)<.001&&rig.visible,'job 1: the furnace stands at (300, -60)');
assert.ok(Math.abs(rigAt().y-scablandsSurfaceHeightAt(300,-60))<.001,'job 1: it stands on the ground');
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
// Job 4: 90 m to the north of Big Bess and 40 m ahead of her while she is between 30% and 70% of her road, at her speed, then turning away north.
const slow=EVERBURN_JOBS[3].steps[0],points=slow.path.map(item=>item.position);
const legs=points.slice(1).map((point,index)=>Math.hypot(point.x-points[index].x,point.z-points[index].z)),total=legs[0]+legs[1];
const escortAtShare=share=>{const metres=share*total,second=metres>legs[0],from=points[second?1:0],to=points[second?2:1],t=(metres-(second?legs[0]:0))/legs[second?1:0];
  return {id:'big-bess',position:{x:from.x+(to.x-from.x)*t,y:0,z:from.z+(to.z-from.z)*t},pathIndex:second?2:1,roadHeading:Math.atan2(to.x-from.x,to.z-from.z)};};
const escorting=(share,job={stepIndex:0,steps:EVERBURN_JOBS[3].steps,done:false})=>sightingState(4,job,{actors:[escortAtShare(share)]});
const wrapAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));
syncScene(scene.group,escorting(.2));
assert.ok(rigAt().distanceTo(restAt)<.001,'job 4: before 30% of her road the furnace stays where it was');
for(const share of [.31,.5,.69]){
  const {position:bess,roadHeading}=escortAtShare(share);
  syncScene(scene.group,escorting(share));
  assert.ok(Math.hypot(rigAt().x-(bess.x+Math.sin(roadHeading)*40),rigAt().z-(bess.z+Math.cos(roadHeading)*40-90))<.001&&rig.visible,`job 4: at ${share*100}% the furnace is 90 m north of Big Bess and 40 m ahead of her`);
  assert.ok(Math.abs(wrapAngle(rig.rotation.y-bessRig.rotation.y))<.001,'job 4: it faces the way she faces');
}
assert.deepEqual(fireOver(),[],'job 4: no door fire shows on the pacing furnace');
syncScene(scene.group,escorting(.69));
const beforeTurn=rigAt().clone();
syncScene(scene.group,escorting(.76));
assert.ok(Math.abs(wrapAngle(rig.rotation.y-Math.PI))<.001,'job 4: past 70% it has turned to face north');
assert.ok(rigAt().z<beforeTurn.z&&rig.visible,'job 4: and it is further north than before');
syncScene(scene.group,escorting(.99));
assert.equal(rig.visible,false,'job 4: it turns away north and is gone');
assert.equal(escorting(.5).arena.worldJob.actors.every(item=>item.id!=='old-smoke-furnace'),true,'job 4: no furnace actor stands behind the sighting');
syncScene(scene.group,sightingState(5,{stepIndex:0,steps:[{kind:'heist'}],done:false}));
assert.ok(rigAt().distanceTo(restAt)<.001&&rig.visible,'another job leaves the furnace where it stands');
assert.ok(scene.group.getObjectByName('Dead Mall sand drifts and rubble'),'mall art gets rubble dressing');
assert.equal(scene.group.userData.solids,SCABLANDS_SOLIDS,'scene exposes the tested static collision set');
// SCABLANDS-LAND, check 1a: every material of every placed model file arrives with a colour that is not white (or with
// a picture), read from the real files. Four recipes once drew colour through a noise node, which the exporter does not
// write, and 10 of 10, 12 of 12, 4 of 9 and 3 of 7 materials arrived white. Metal is .2 or less on those four.
const readMaterials=url=>{
  const buffer=readFileSync(new URL('../public'+url,import.meta.url)),json=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString('utf8'));
  return json.materials??[];
};
for(const [key,url] of Object.entries(SCABLANDS_ASSETS)){
  const materials=readMaterials(url);
  assert.ok(materials.length>0,`${key}: the model has materials`);
  for(const material of materials){
    const pbr=material.pbrMetallicRoughness??{},factor=pbr.baseColorFactor;
    assert.ok(pbr.baseColorTexture||(factor&&factor.slice(0,3).some(value=>value<.98)),`${key}: "${material.name}" has a colour that is not white`);
    if(['tintown','kit','everburn','boneyard'].includes(key))assert.ok((pbr.metallicFactor??1)<=.2+1e-6,`${key}: "${material.name}" has metal at .2 or less`);
  }
}
// Checks 1b to 1d work on the ground as it is drawn.
scene.group.updateMatrixWorld(true);
const raycaster=new THREE.Raycaster(),straightDown=new THREE.Vector3(0,-1,0);
const heightOn=(meshes,x,z)=>{raycaster.set(new THREE.Vector3(x,5000,z),straightDown);const hit=raycaster.intersectObjects(meshes,false)[0];return hit?hit.point.y:null;};
const road=ground.children.find(mesh=>mesh.name==='Scablands dirt road');
assert.ok(road,'the dirt road is drawn');
{
  const roadAt=road.geometry.attributes.position,across=20,sections=roadAt.count/across;
  assert.ok(across>=3&&Number.isInteger(sections),'the road is cut across at three or more points');
  // The first cross-section lies across the oval at its east end: 1.2 times the road's half width each side.
  const reach=SCABLANDS_LAYOUT.roadHalfWidth*1.2;
  assert.ok(Math.abs(roadAt.getX(0)-(SCABLANDS_LAYOUT.frameRadiusX-reach))<.01&&Math.abs(roadAt.getX(across-1)-(SCABLANDS_LAYOUT.frameRadiusX+reach))<.01,'the road is 1.2 times the road half width to each side');
  assert.ok(road.material.vertexColors&&road.material.userData.groundLook,'the road has its ruts and the ground look');
  // It lies on the ground as drawn: never more than 0.3 m above it, and sunk into it more than 0.5 m only at the steepest edges.
  let sampled=0,sunk=0,highest=-1e9;
  for(let section=0;section<sections;section+=3)for(let point=0;point<across-1;point++)for(const part of [0,.5]){
    const i=section*across+point,j=i+1,x=roadAt.getX(i)+(roadAt.getX(j)-roadAt.getX(i))*part,z=roadAt.getZ(i)+(roadAt.getZ(j)-roadAt.getZ(i))*part;
    const onRoad=heightOn([road],x,z),onGround=heightOn(near,x,z);
    if(onRoad===null||onGround===null)continue;
    sampled++;highest=Math.max(highest,onRoad-onGround);if(onRoad-onGround<-.5)sunk++;
  }
  assert.ok(sampled>3000,'the road is sampled along its whole length');
  assert.ok(highest<=.3,`the road is no taller than 0.3 m above the ground anywhere (highest ${highest.toFixed(2)} m)`);
  assert.ok(sunk/sampled<.05,`the road is sunk more than 0.5 m only at the steepest edges (${sunk} of ${sampled})`);
  const index=road.geometry.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let faceDown=0;
  for(let k=0;k<index.length;k+=3){a.fromBufferAttribute(roadAt,index[k]);b.fromBufferAttribute(roadAt,index[k+1]);c.fromBufferAttribute(roadAt,index[k+2]);
    if(b.sub(a).cross(c.sub(a)).y<=0)faceDown++;}
  assert.equal(faceDown,0,'every face of the road looks up');
  const middle=Math.floor(sections/2)*across+across/2;
  assert.ok(Math.abs(roadAt.getY(middle)-scablandsSurfaceHeightAt(roadAt.getX(middle),roadAt.getZ(middle)))<.5,'the middle of the road lies on the land');
}
// Check 1c: the far ground lies below the near ground wherever both exist.
{
  let samples=0,smallest=1e9;
  for(let x=-695;x<=695;x+=17)for(let z=-495;z<=495;z+=13){
    const farHeight=heightOn([far],x,z),nearHeight=heightOn(near,x,z);
    assert.ok(farHeight!==null&&nearHeight!==null,`both grounds exist at ${x}, ${z}`);
    samples++;smallest=Math.min(smallest,nearHeight-farHeight);
  }
  assert.ok(samples>5000&&smallest>0,`the far ground lies below the near ground everywhere it was sampled (closest ${smallest.toFixed(2)} m, ${samples} places)`);
  const farAt=far.geometry.attributes.position;
  assert.ok(Math.abs(farAt.getY(0)+far.position.y-(scablandsSurfaceHeightAt(-1400,-1000)+.025-.12))<.001,'the far ground is unchanged outside the near ground');
}
// Check 1d: Tin Town's gate stands at its place, across the line the trucks drive, with a 9 m opening.
{
  const gate=scene.group.getObjectByName('Tin Town gate'),land=scablandsSurfaceHeightAt(575,62);
  assert.ok(gate&&gate.parent===scene.group,'the scene carries Tin Town\'s gate');
  assert.ok(Math.hypot(gate.position.x-575,gate.position.z-62)<.001&&Math.abs(gate.position.y-land)<.001,'the gate stands at (575, 62), on the ground');
  gate.updateMatrixWorld(true);
  const left=gate.getObjectByName('Gate post left'),right=gate.getObjectByName('Gate post right');
  assert.ok(left&&right,'the gate has two posts');
  // In the gate's own frame (X along the beam, Z the way a truck drives) the posts stand 9 m apart and 7 m tall.
  const own=new THREE.Matrix4().copy(gate.matrixWorld).invert(),boxIn=object=>{const box=new THREE.Box3();
    object.traverse(node=>{if(node.isMesh){node.geometry.computeBoundingBox();box.union(node.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(own,node.matrixWorld)));}});return box;};
  const leftBox=boxIn(left),rightBox=boxIn(right);
  assert.ok(Math.abs((rightBox.min.x-leftBox.max.x)-9)<.05,`the gate's opening is 9 m (${(rightBox.min.x-leftBox.max.x).toFixed(2)})`);
  assert.ok(Math.abs(leftBox.max.y-7)<.05&&Math.abs(rightBox.max.y-7)<.05,'the posts are 7 m tall');
  // The way a truck drives through is north and south: the furnace's way in (from (610, 170)) and the gas run's Boneyard road
  // (from (447, 308)) both cross the opening within 30 degrees of straight, and the road goes on to the town's centre.
  const through=new THREE.Vector3(0,0,1).transformDirection(gate.matrixWorld),across=(from,to)=>Math.abs(through.dot(new THREE.Vector3(to.x-from.x,0,to.z-from.z).normalize()));
  // The furnace does not drive through the gate (it stops 20 m in front of it); the Boneyard road does, squarely, from (575, 112) to (575, 62).
  assert.ok(across({x:575,z:112},{x:575,z:62})>.9999,'the gas run Boneyard road passes squarely through the opening of the gate');
  assert.deepEqual([TIN_TOWN_GATE.x,TIN_TOWN_GATE.z+20],[gateAt.x,gateAt.z],'the furnace stops 20 m in front of the gate, south of it');
  assert.equal(gate.getObjectByName('Gate sign plate').userData.text,'TIN TOWN','the gate carries a tin sign reading TIN TOWN');
  const glowing=material=>material.emissive.getHex()!==0&&material.emissiveIntensity>0;
  const lampMeshes=gate.getObjectByName('Gate lamps').children.filter(mesh=>glowing(mesh.material));
  assert.ok(lampMeshes.length>0&&lampMeshes.every(mesh=>mesh.material.emissiveIntensity>.3&&mesh.material.emissiveIntensity<1.5),'the gate\'s lamps glow a little');
  const fence=['left','right'].map(side=>boxIn(gate.getObjectByName(`Gate fence ${side}`)));
  assert.ok(fence.every(box=>box.max.x-box.min.x>=13.9&&box.max.x-box.min.x<=15.2),'each side of the gate has about 14 m of fence');
  const beam=boxIn(gate.getObjectByName('Gate beam'));
  // The wear is drawn over every material that does not glow.
  const materials=[];gate.traverse(node=>{if(node.isMesh)materials.push(node.material);});
  assert.ok(materials.length>5&&materials.every(material=>Boolean(material.userData.scrapWear)===!glowing(material)),'the wear is drawn over every material of the gate except its lamp glass');
  // When it burns, the fire takes the whole gate, from the ground up (redrawn by Claude, 12 November).
  syncScene(scene.group,atGate({phase:'idle',door:null,hits:0,phaseSec:0,townReached:true,gateBurnt:true}));
  assert.ok(Math.hypot(gateFire.position.x-575,gateFire.position.z-62)<.001,'the fire stands at the gate');
  assert.ok(Math.abs(gateFire.position.y-land)<.05&&Math.abs(Math.max(...gateFire.children.filter(node=>node.name==='Fire on the gate'&&node.position.y>6).map(node=>node.position.y))-beam.max.y)<1.2,`the fire stands from the ground up, with three flames over the beam (beam top ${beam.max.y.toFixed(2)})`);
  assert.ok(Math.abs(gateFire.rotation.y-gate.rotation.y)<1e-9,'the flames stand along the gate');
}
// SCABLANDS-LAND follow-up: Tin Town's shacks, drawn in code round the town's own model.
{
  const town=scene.group.getObjectByName('Tin Town shacks'),data=town?.userData;
  assert.ok(town&&town.parent===scene.group,'the scene carries the Tin Town shacks');
  assert.ok(data.shacks.length>=40&&data.shacks.length<=50,`there are 40 to 50 shacks (${data.shacks.length})`);
  assert.equal(data.clusters.length,6,'the shacks stand in six clusters');
  assert.deepEqual([...new Set(data.shacks.map(shack=>shack.size))].sort(),['L','M','S'],'the shacks come in three sizes');
  assert.ok(data.shacks.some(shack=>shack.level===2)&&data.shacks.every(shack=>shack.level<=2),'they are stacked one, two or three high');
  assert.ok(data.tower&&data.tower.height>=10.5&&data.tower.height<=12.5,`the water tower is about 11 m tall (${data.tower?.height.toFixed(1)})`);
  assert.ok(data.pole&&data.pole.height>=12,'the radio pole stands in a cluster');
  assert.ok(data.fence.length>20,`the fence runs round the outside of the ring (${data.fence.length} sheets)`);
  const meshes=[];town.traverse(node=>{if(node.isMesh)meshes.push(node);});
  assert.ok(meshes.length>=1&&meshes.length<=12,`the whole town is at most 12 draw calls (${meshes.length})`);
  assert.ok(data.triangles<60000,`the town is under 60,000 triangles (${Math.round(data.triangles)})`);
  const glowing=material=>material.emissive.getHex()!==0&&material.emissiveIntensity>0;
  assert.ok(meshes.every(mesh=>Boolean(mesh.material.userData.scrapWear)===!glowing(mesh.material))&&meshes.some(mesh=>glowing(mesh.material)),'the wear is drawn over everything that does not glow, and some lamps glow');
  // Clear ground: nothing is drawn within 24 m of the town's centre or 10 m either side of the roads jobs use, read from the real job paths.
  const flat=list=>list.map(item=>item.position??item);
  const furnaceSteps=EVERBURN_JOBS[5].steps[1].path,planes=furnaceSteps.findIndex(item=>item.id==='furnace-planes-3'),roadHome=furnaceSteps.findIndex(item=>item.id==='furnace-road-1');
  const lines=[];
  const addLine=(points)=>{for(let index=1;index<points.length;index++)lines.push([points[index-1],points[index]]);};
  addLine(flat(furnaceSteps.slice(planes,roadHome+1)));
  addLine(flat(GAS_RUN_PATHS.long));addLine(flat(GAS_RUN_PATHS.boneyard));
  addLine(flat(EVERBURN_JOBS[3].steps[0].path).slice(1));
  addLine([{x:0,z:0},{x:600,z:0}]);addLine([{x:575,z:62},{x:600,z:0}]);
  assert.ok(lines.length>=12,'the roads and lines are read from the real job paths');
  const distanceToLine=(x,z,[a,b])=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);};
  let nearestCentre=1e9,nearestRoad=1e9,vertices=0;
  for(const mesh of meshes){
    const at=mesh.geometry.attributes.position;
    for(let index=0;index<at.count;index++){
      const x=at.getX(index),z=at.getZ(index);vertices++;
      nearestCentre=Math.min(nearestCentre,Math.hypot(x-600,z));
      for(const line of lines)nearestRoad=Math.min(nearestRoad,distanceToLine(x,z,line));
    }
  }
  assert.ok(vertices>10000,'the shacks are drawn');
  assert.ok(nearestCentre>=24,`nothing is drawn within 24 m of the town's centre (nearest ${nearestCentre.toFixed(1)} m)`);
  assert.ok(nearestRoad>=10,`nothing is drawn within 10 m of a road or path (nearest ${nearestRoad.toFixed(1)} m)`);
  // Every foot stands on the ground at its own point.
  assert.ok(data.feet.length>150,'every leg, post and sheet has a foot');
  const worst=Math.max(...data.feet.map(foot=>Math.abs(foot.y-scablandsSurfaceHeightAt(foot.x,foot.z))));
  assert.ok(worst<=.15,`every leg's foot is within 0.15 m of the ground (worst ${worst.toFixed(3)} m)`);
  // The solids: one box a cluster, two for the gate's posts, and every shack stands inside its cluster's box.
  const clusterSolids=SCABLANDS_SOLIDS.filter(solid=>/^tin-town-cluster-\d$/.test(solid.id)),postSolids=SCABLANDS_SOLIDS.filter(solid=>/^tin-town-gate-post-/.test(solid.id));
  assert.equal(clusterSolids.length,6,'one solid for each cluster');assert.equal(postSolids.length,2,'two solids for the gate\'s posts');
  for(const shack of data.shacks){
    const solid=clusterSolids[shack.cluster];
    assert.ok(Math.abs(shack.x-solid.center[0])<=solid.size[0]/2&&Math.abs(shack.z-solid.center[2])<=solid.size[2]/2,`a shack of cluster ${shack.cluster+1} stands inside its solid`);
  }
  for(const solid of clusterSolids)for(const line of lines)for(let metres=0;metres<=Math.hypot(line[1].x-line[0].x,line[1].z-line[0].z);metres+=1){
    const length=Math.hypot(line[1].x-line[0].x,line[1].z-line[0].z),x=line[0].x+(line[1].x-line[0].x)*metres/length,z=line[0].z+(line[1].z-line[0].z)*metres/length;
    if(Math.hypot(Math.max(Math.abs(x-solid.center[0])-solid.size[0]/2,0),Math.max(Math.abs(z-solid.center[2])-solid.size[2]/2,0))<10)assert.fail(`${solid.id} is within 10 m of a road`);
  }
}
// The ground look is drawn over the near ground, the far ground, the road and any edited chunk.
assert.ok(near.every(tile=>tile.material.userData.groundLook)&&far.material.userData.groundLook,'the near and far ground carry the ground look');
{
  scablandsGroundEdit.cut({x:100,z:100,radius:4},scablandsGroundEdit.heightAt(100,100)-2);
  assert.ok(scene.group.userData.updateGroundView()>0,'a cut refreshes the ground');
  const chunk=ground.children.find(mesh=>/^Scablands edited ground/.test(mesh.name));
  assert.ok(chunk&&chunk.material.userData.groundLook,'an edited chunk carries the ground look');
  assert.ok(ground.children.includes(road)&&road.name==='Scablands dirt road','the road is rebuilt after an edit and keeps its name');
  // The far ground stays dropped under the near ground after a rebuild: the vertex at (0, 0) is the 179th.
  const lowered=far.geometry.attributes.position.getY(8*21+10)+far.position.y;
  assert.ok(lowered<scablandsSurfaceHeightAt(0,0)-39,'the far ground stays dropped under the near ground after an edit');
  resetScablandsGroundEdit();scene.group.userData.updateGroundView();
}
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
// SCABLANDS-LAND: wear is drawn over every place's materials, one wear for each place, with the place's own ground point
// as its origin; lamps and flames and the people are left clean.
const worn=createScablandsScene(course,{loadAsset:async path=>{
  const root=new THREE.Group();
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace){
    for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){const part=new THREE.Group();part.name=name;root.add(part);}
    return {scene:root};
  }
  const steel=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'plain steel',color:0x808080}));steel.name='steel';
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'forge lamp glass lit',color:0xffaa44,emissive:0xff8820,emissiveIntensity:2}));lamp.name='lamp';
  const person=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'person cloth',color:0x806040}));person.name='person';
  root.add(path===SCABLANDS_ASSETS.folk?person:steel,...(path===SCABLANDS_ASSETS.folk?[]:[lamp]));
  return {scene:root};
}});
assert.equal(await worn.ready,true,'the worn scene loads');
const inverseOf=material=>{const shader={uniforms:{},vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>'};
  material.onBeforeCompile(shader);return shader.uniforms.uScrapInverse.value;};
const wearMatrices=new Set();
for(const place of SCABLANDS_PLACES){
  const lod=worn.group.getObjectByName(`${place.name} detail LOD`),full=lod.levels[0].object,parts=[];
  full.traverse(node=>{if(node.isMesh)parts.push(node);});
  for(const mesh of parts){
    const wearing=mesh.material.userData.scrapWear===true;
    if(mesh.name==='steel'){
      assert.ok(wearing,`${place.name}: plain steel is worn`);
      const ground=new THREE.Vector3(place.x,scablandsSurfaceHeightAt(place.x,place.z),place.z).applyMatrix4(inverseOf(mesh.material));
      assert.ok(ground.length()<1e-6,`${place.name}: the wear's origin is the place's own ground point`);
      wearMatrices.add(inverseOf(mesh.material));
    }
    else assert.ok(!wearing,`${place.name}: ${mesh.name} is not worn (lamps, flames and people stay as they are)`);
  }
}
assert.equal(wearMatrices.size,5,'each of the five places that carry art (Tin Town, the Boneyard, the Dead Mall, the Everburn and the Ridge) has its own wear');
worn.dispose();
console.log('Scablands scene: place art, coarse horizon, shared ground, landmark visibility and all solid collision boxes pass.');

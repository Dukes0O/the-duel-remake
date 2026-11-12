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
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BONEYARD_WRECKS,BESS_REST} from '../src/world/boneyard-wrecks.js';
import {createEverburnProps} from '../src/world/everburn-props.js';
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
assert.equal(SCABLANDS_SOLIDS.length,18,'the seven named places other than the Boneyard, its three wrecks, six Tin Town clusters and two gate posts each have a solid');
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
assert.ok(scene.group.getObjectByName('Everburn fire and smoke'),'the Everburn fire and smoke are placed in the world');
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
// SCABLANDS-LAND round 3, fix 5 (re-recorded): her resting place moved from the Boneyard's own spot plus 18 m, which lay inside the north
// wreck, to BESS_REST, 5 m or more clear of every wreck.
assert.ok(bessAt().distanceTo(new THREE.Vector3(BESS_REST.x,scablandsSurfaceHeightAt(BESS_REST.x,BESS_REST.z),BESS_REST.z))<.001,
  'outside a job, Big Bess stands at her resting place in the Boneyard');
assert.ok(Math.abs(bessRig.rotation.y-BESS_REST.heading)<.001,'outside a job, she keeps the turn of her resting place');
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
// FIELD-BATTLE-ASH: the battle's furnace follows its actor like the chase's, comes out with two of its six shields gone and the
// rear door scorched (drawing only), stays where it stopped with its door fire out and thin smoke when it is dead, and later runs
// show it as a wreck where the run's definition says.
{
  const battleStep={kind:'escort',path:[],furnaceActor:{battle:{hurtAtStart:['rear']}}};
  const battleState=(actors,definition={storyId:'everburn',run:true,battle:true})=>({arena:{mode:'world-job',worldJob:{definition,clockSec:0,job:{stepIndex:0,steps:[battleStep]},actors}}});
  const everburnAt=places.get('everburn');
  syncScene(scene.group,battleState([bessActor]));
  assert.equal(visiblePlates(),4,'before it comes out, the battle\'s furnace stands by the well with two of its six shields already gone');
  assert.equal(furnace.parent.position.x,everburnAt.x+18,'and stands in its place by the well until it comes out');
  const hunter={id:'old-smoke-furnace',position:{x:-100,y:0,z:300},heading:1.1,furnace:{phase:'stoke',door:'left',hits:0,phaseSec:1,dead:false,battle:{hurtAtStart:['rear']}}};
  syncScene(scene.group,battleState([bessActor,hunter]));
  assert.ok(Math.abs(furnace.parent.position.x+100)<.001&&Math.abs(furnace.parent.position.z-300)<.001,'once out, the furnace follows its actor');
  assert.ok(Math.abs(furnace.parent.rotation.y-1.1)<.001,'and its heading');
  assert.equal(visiblePlates(),4,'it comes out with two of its six shields gone');
  hunter.furnace={...hunter.furnace,phase:'stagger',hits:1};
  syncScene(scene.group,battleState([bessActor,hunter]));
  assert.equal(visiblePlates(),2,'the first broken door takes its two shields, the left ones, with it');
  animateScene(scene.group,7);
  const fullFade=furnaceFire.children[6].userData.fade;
  // Cinders thrown on Big Bess are drawn: lumps in the air from the chimney to her tank, fire on the tank and firelight
  // under her, for as long as the furnace's own state says it is throwing them, and never otherwise.
  const cinderArc=scene.group.getObjectByName('Cinders thrown through the air');
  const bessFires=[],lastFires=[];
  scene.group.traverse(node=>{if(node.name==='Fire on Big Bess')bessFires.push(node);if(node.name==="The furnace's last fire")lastFires.push(node);});
  const bessGlow=scene.group.getObjectByName('Firelight under Big Bess');
  assert.ok(cinderArc&&bessFires.length===3&&bessGlow&&lastFires.length===2,'the cinders, three fires on the tank, the firelight and the last fire exist');
  const cindersShown=()=>[cinderArc.visible,bessFires.every(fire=>fire.visible),bessGlow.visible];
  assert.deepEqual(cindersShown(),[false,false,false],'no cinders fly and Big Bess does not burn while the furnace is only following her');
  hunter.furnace={...hunter.furnace,phase:'follow',burning:true};
  syncScene(scene.group,battleState([bessActor,hunter]));
  animateScene(scene.group,7.5);
  assert.deepEqual(cindersShown(),[true,true,true],'while the furnace throws cinders they fly, the tank burns and the road is lit');
  {
    const lumps=cinderArc.geometry.attributes.position,low=Math.min(-100,bessActor.position.x)-4,high=Math.max(-100,bessActor.position.x)+4;
    let highest=-Infinity,inside=true;
    for(let index=0;index<lumps.count;index++){
      const x=lumps.getX(index),y=lumps.getY(index),z=lumps.getZ(index);
      inside=inside&&Number.isFinite(x+y+z)&&x>=low&&x<=high;highest=Math.max(highest,y);
    }
    const tankTop=bessRig.position.y+3;
    assert.ok(lumps.count>=30&&inside,'every lump is in the air between the furnace and Big Bess');
    assert.ok(highest>tankTop+1.5&&highest<Math.max(tankTop,furnace.parent.position.y+5.15)+8,'and the throw arcs over her tank, not into the sky');
  }
  assert.ok(lastFires.every(fire=>!fire.visible),'the last fire is hidden while the furnace lives');
  hunter.furnace={...hunter.furnace,burning:false};
  syncScene(scene.group,battleState([bessActor,hunter]));
  assert.deepEqual(cindersShown(),[false,false,false],'the cinders and her fire stop when the furnace stops throwing');
  animateScene(scene.group,7);
  hunter.furnace={phase:'dead',door:null,hits:3,dead:true,phaseSec:0,burning:true,battle:{hurtAtStart:['rear']}};
  hunter.position={x:-40,y:0,z:330};
  syncScene(scene.group,battleState([bessActor,hunter]));
  animateScene(scene.group,7);
  assert.ok(Math.abs(furnace.parent.position.x+40)<.001,'a dead furnace stays where it stopped');
  assert.deepEqual(fireOver(),[],'a dead furnace has no fire over its doors');
  assert.deepEqual(cindersShown(),[false,false,false],'a dead furnace throws nothing');
  // It dies with a last fire from its chimney and heavy smoke; twelve seconds later the fire is out and the smoke is thin.
  assert.ok(lastFires.every(fire=>fire.visible&&fire.scale.y>2),'as it dies, the last fire stands in its chimney');
  assert.ok(furnaceFire.children[6].userData.fade>fullFade,'under heavy smoke');
  animateScene(scene.group,9.5);syncScene(scene.group,battleState([bessActor,hunter]));animateScene(scene.group,9.5);
  assert.ok(lastFires.every(fire=>fire.visible&&fire.scale.y<fire.userData.tall*.6),'the last fire sinks as it burns out');
  // Two full turns of the plume later (the plume turns once in 100/11 seconds), so the same puff is at the same age.
  const later=7+200/11;
  animateScene(scene.group,later);syncScene(scene.group,battleState([bessActor,hunter]));animateScene(scene.group,later);
  assert.ok(lastFires.every(fire=>!fire.visible),'eighteen seconds on, the last fire is out');
  assert.deepEqual(fireOver(),[],'and there is still no fire over its doors');
  assert.ok(furnaceFire.children[6].userData.fade<fullFade*.5&&furnaceFire.children[6].userData.fade>0,'and only thin smoke rises from it');
  assert.equal(visiblePlates(),0,'with its three doors broken every shield is gone');
  // The job is over (the step index is past the last step): the furnace is still drawn where it stopped.
  const over=battleState([bessActor,hunter]);over.arena.worldJob.job.stepIndex=1;
  syncScene(scene.group,over);
  assert.ok(Math.abs(furnace.parent.position.x+40)<.001,'when the battle is over the furnace stays where it stopped');
  // A later Boneyard run: the wreck, at the place the run names, with thin smoke and no fire; no wreck on a run that names none.
  const wreck={x:250,z:407,heading:1.3};
  const wreckState=definition=>({arena:{mode:'world-job',worldJob:{definition,clockSec:0,job:{stepIndex:0,steps:[{kind:'escort',path:[]}]},actors:[bessActor]}}});
  syncScene(scene.group,wreckState({storyId:'everburn',run:true,road:'boneyard',wreck}));
  assert.ok(Math.abs(furnace.parent.position.x-250)<.001&&Math.abs(furnace.parent.position.z-407)<.001,'a Boneyard run after the win draws the dead furnace at the wreck place');
  assert.ok(Math.abs(furnace.parent.rotation.y-1.3)<.001&&furnace.parent.visible,'lying along the road, and shown');
  assert.equal(visiblePlates(),0,'its shields are gone');
  assert.deepEqual(fireOver(),[],'with no fire');
  {
    const shown=[];scene.group.traverse(node=>{if(node.name==="The furnace's last fire"||node.name==='Fire on Big Bess'||node.name==='Cinders thrown through the air')shown.push(node.visible);});
    assert.ok(shown.length===6&&shown.every(visible=>!visible),'no last fire, no cinders and no fire on Big Bess beside the wreck');
  }
  animateScene(scene.group,7);
  assert.ok(furnaceFire.children[6].userData.fade<fullFade*.5,'and thin smoke');
  syncScene(scene.group,wreckState({storyId:'everburn',run:true,road:'boneyard'}));
  assert.ok(Math.abs(furnace.parent.position.x-(everburnAt.x+18))<.001,'a run with no wreck leaves the furnace in its place by the well');
  assert.equal(visiblePlates(),6,'with all its shields on');
}
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
assert.ok(!scene.group.getObjectByName('Dead Mall sand drifts and rubble'),'the nine flat rocks round the mall are gone');
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
  // Seen from far off: a 16 m watchtower with a lamp in the cluster nearest the gate, and chimney smoke from three shacks in different clusters.
  const nearestToGate=data.clusters.map(cluster=>({index:cluster.index,distance:Math.hypot((cluster.rect.x0+cluster.rect.x1)/2-575,(cluster.rect.z0+cluster.rect.z1)/2-62)})).sort((a,b)=>a.distance-b.distance)[0].index;
  assert.ok(data.watchtower&&Math.abs(data.watchtower.height-16)<.6,`the watchtower is 16 m tall (${data.watchtower?.height.toFixed(1)})`);
  const towerCluster=data.clusters.find(cluster=>data.watchtower.x>=cluster.rect.x0&&data.watchtower.x<=cluster.rect.x1&&data.watchtower.z>=cluster.rect.z0&&data.watchtower.z<=cluster.rect.z1);
  assert.equal(towerCluster?.index,nearestToGate,'the watchtower stands in the cluster nearest the gate');
  assert.equal(data.chimneys.length,3,'three shacks have a chimney');assert.equal(new Set(data.chimneys.map(chimney=>chimney.cluster)).size,3,'in three different clusters');
  const smoke=scene.group.getObjectByName('Tin Town chimney smoke');
  assert.ok(smoke&&smoke.children.length===24&&smoke.children.every(puff=>puff.name==='Chimney smoke of a shack'),'each chimney has a plume of eight puffs');
  animateScene(scene.group,30);
  const plumeOf=plume=>smoke.children.filter(puff=>puff.userData.plume===plume);
  for(let plume=0;plume<3;plume++){
    const chimney=data.chimneys[plume],puffs=plumeOf(plume).sort((a,b)=>a.position.y-b.position.y);
    assert.ok(puffs.length===8&&puffs[0].position.y>=chimney.y&&puffs[7].position.y-chimney.y>10&&puffs[7].position.y-chimney.y<=14.01,`plume ${plume+1} rises about 14 m`);
    assert.ok(puffs.every(puff=>puff.position.x>=chimney.x-.5&&puff.position.z>=chimney.z-.01),`plume ${plume+1} drifts the same way as the others (towards +x and +z)`);
  }
  assert.ok(smoke.children.every(puff=>puff.userData.fade<=.56),'the plumes are light');
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
// SCABLANDS-LAND round 3, fix 1: the Everburn's fire and smoke are drawn in code. The model's own flame solids are not
// drawn, three wellTongues of fire 5 to 7 m tall stand on the derrick, a column of 14 to 18 wellPuffs climbs to about 90 m and
// leans one way, and past 280 m the well's stand-in is a thin mast the height of the derrick.
const wellScene=createScablandsScene(course,{loadAsset:async path=>{
  const root=new THREE.Group();
  if(path===SCABLANDS_ASSETS.everburn){
    for(const name of ['everburn-flare-stack','everburn-flame-core','everburn-flame-outer','everburn-merged-everburn-burning-everburn-flame-orange','everburn-merged-everburn-burning-everburn-embers']){
      const part=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x886644}));part.name=name;root.add(part);
    }
  }
  if(path===SCABLANDS_ASSETS.boneyard)for(const name of ['Boneyard_ground_—_Dry_Scablands_dirt','Boneyard_field_scrap_—_Pitted_grey_aircraft_aluminium']){
    const part=new THREE.Mesh(new THREE.BoxGeometry(10,.3,10),new THREE.MeshStandardMaterial({color:0x7e6a50}));part.name=name;root.add(part);
  }
  if(path===SCABLANDS_ASSETS.mall){
    const drift=new THREE.Mesh(new THREE.BoxGeometry(7,1.1,3.6),new THREE.MeshStandardMaterial({color:0x7d5c33}));drift.name='sand-drift-1';drift.position.set(-11,.8,-8);root.add(drift);
    // Fix 6: forty plain parts of two surfaces, one lamp part with its own glow, and a part with a single surface.
    const wallSurface=new THREE.MeshStandardMaterial({name:'mall wall',color:0x908b80}),railSurface=new THREE.MeshStandardMaterial({name:'mall rail',color:0x6a4e38});
    for(let index=0;index<40;index++){const part=new THREE.Mesh(new THREE.BoxGeometry(1,2,.5),index%4?wallSurface:railSurface);part.name=`mall-part-${index}`;part.position.set(index-20,1,index%3);part.rotation.y=index*.1;root.add(part);}
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshStandardMaterial({name:'lamp amber',color:0xd87624,emissive:0xd87624,emissiveIntensity:1.5}));lamp.name='ash-men-lamp-1-amber-lens';lamp.position.set(3,4,0);root.add(lamp);
  }
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace)for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){const part=new THREE.Group();part.name=name;root.add(part);}
  return {scene:root};
}});
assert.equal(await wellScene.ready,true,'the well scene loads');
const wellLod=wellScene.group.getObjectByName('The Everburn detail LOD');
assert.ok(wellLod.getObjectByName('everburn-flare-stack')&&wellLod.getObjectByName('everburn-merged-everburn-burning-everburn-embers'),'the derrick and the embers are still drawn');
assert.ok(!wellLod.getObjectByName('everburn-flame-core')&&!wellLod.getObjectByName('everburn-flame-outer')&&!wellLod.getObjectByName('everburn-merged-everburn-burning-everburn-flame-orange'),
  'the model own flame solids are not drawn');
assert.ok(!wellScene.group.getObjectByName('Everburn smoke pillar visible across the Scablands'),'the seven grey spheres are gone');
const wellFire=wellScene.group.getObjectByName('Everburn fire and smoke'),everburnPlaceRow=places.get('everburn');
assert.ok(wellFire&&Math.abs(wellFire.position.x-everburnPlaceRow.x)<.001&&Math.abs(wellFire.position.z-everburnPlaceRow.z)<.001,'the fire stands on the well');
animateScene(wellScene.group,3.7);
const wellTongues=wellFire.children.filter(node=>node.name==='Fire on the Everburn derrick'),wellPuffs=wellFire.children.filter(node=>node.name==='Everburn smoke');
assert.equal(wellTongues.length,3,'three wellTongues of fire');
for(const tongue of wellTongues)assert.ok(tongue.scale.y>=4.2&&tongue.scale.y<=8.5&&tongue.position.y>7&&tongue.position.y<9,'a tongue is 5 to 7 m tall (flickering) and stands on the derrick top');
assert.ok(wellFire.children.some(node=>node.name==='Firelight on the ground at the Everburn'),'firelight on the ground under the derrick');
assert.ok(wellPuffs.length>=14&&wellPuffs.length<=18,'a column of 14 to 18 smoke wellPuffs');
const columnTop=Math.max(...wellPuffs.filter(puff=>puff.userData.fade>.05).map(puff=>puff.position.y));
assert.ok(columnTop>70&&columnTop<100,`the column reaches about 90 m (reaches ${columnTop.toFixed(0)} m)`);
const lean=[];for(const seconds of [0,1.3,6,11.9]){animateScene(wellScene.group,seconds);for(const puff of wellPuffs)if(puff.position.y>60)lean.push(puff.position.x);}
assert.ok(lean.every(x=>x>5),'the column leans one way with a fixed wind (downwind of the derrick at every moment)');
const wellFar=wellLod.levels[1].object;
assert.ok(wellFar.geometry.type==='CylinderGeometry'&&wellFar.geometry.parameters.height>7&&wellFar.geometry.parameters.height<10&&wellFar.geometry.parameters.radiusBottom<1,
  'past 280 m the well is a thin mast the height of its derrick, not a box');
assert.ok(wellScene.group.getObjectByName('The Dead Mall detail LOD').levels[1].object.geometry.type==='BoxGeometry','the other places keep their plain far shape');
// Fix 4: the Boneyard's flat dirt slab is not drawn; its scrap plates are.
const boneyardLod=wellScene.group.getObjectByName('The Boneyard detail LOD');
assert.ok(!boneyardLod.getObjectByName('Boneyard_ground_—_Dry_Scablands_dirt')&&boneyardLod.getObjectByName('Boneyard_field_scrap_—_Pitted_grey_aircraft_aluminium'),'the dirt slab is not drawn and the scrap plates are');
// Fix 6: the mall is drawn in one piece for each surface, with every part where it was and the lamp's glow kept.
const mallLod=wellScene.group.getObjectByName('The Dead Mall detail LOD'),mallMeshes=[];
mallLod.levels[0].object.traverse(node=>{if(node.isMesh)mallMeshes.push(node);});
assert.equal(mallMeshes.length,3,'42 parts of three surfaces (wall, rail, lamp) are drawn as three meshes');
const mergedWall=mallMeshes.find(mesh=>mesh.material.name==='mall wall');
assert.ok(mergedWall&&mergedWall.geometry.attributes.position.count===30*36,'the thirty wall parts are in one mesh with all their vertices');
mergedWall.geometry.computeBoundingBox();
assert.ok(mergedWall.geometry.boundingBox.min.x<-18.5&&mergedWall.geometry.boundingBox.max.x>18,'each merged part stays where it was in the model');
assert.ok(mallMeshes.some(mesh=>mesh.name==='ash-men-lamp-1-amber-lens'&&mesh.material.emissiveIntensity===1.5),'a surface with one part keeps its name and its glow');
// Fix 3: the mall's four sand drifts at the entrance are not drawn.
assert.ok(!wellScene.group.getObjectByName('sand-drift-1'),'the mall sand drifts are not drawn');
wellScene.dispose();
// Fix 5: the three wrecks of the real Boneyard model lie as the table says: three different headings, one rolled onto a wing,
// uneven gaps, nothing but the buried landing gear sunk, each solid where it is drawn, both roads and the furnace's path
// 8 m clear of every solid, and Big Bess's resting place 5 m clear of every wreck.
const realParse=path=>{const bytes=readFileSync(new URL('../public'+path,import.meta.url));
  return new Promise((resolve,reject)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',resolve,reject));};
const wreckScene=createScablandsScene(course,{loadAsset:async path=>{
  if(path===SCABLANDS_ASSETS.boneyard)return realParse(path);
  const root=new THREE.Group();
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace)for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){const part=new THREE.Group();part.name=name;root.add(part);}
  return {scene:root};
}});
assert.equal(await wreckScene.ready,true,'the Boneyard scene with its real model loads');
wreckScene.group.updateMatrixWorld(true);
const wreckLod=wreckScene.group.getObjectByName('The Boneyard detail LOD'),corner=new THREE.Vector3(),footprints=new Map();
for(const wreck of BONEYARD_WRECKS){
  const pivot=wreckLod.getObjectByName(`${wreck.part} on the ground`);
  assert.ok(pivot,`${wreck.part} is lifted out of the model and set down again`);
  const all=new THREE.Box3(),notGear=new THREE.Box3(),pods=new THREE.Box3();
  pivot.traverse(mesh=>{if(!mesh.isMesh)return;
    const gear=/landing gear/.test(mesh.name.replace(/_/g,' ')),engine=/engines/.test(mesh.name);
    const positions=mesh.geometry.attributes.position;
    for(let index=0;index<positions.count;index++){corner.fromBufferAttribute(positions,index).applyMatrix4(mesh.matrixWorld);all.expandByPoint(corner);if(!gear)notGear.expandByPoint(corner);if(engine)pods.expandByPoint(corner);}});
  footprints.set(wreck.id,all);
  const solid=SCABLANDS_SOLIDS.find(row=>row.id===`boneyard-wreck-${wreck.id}`),ground=scablandsSurfaceHeightAt(wreck.x,wreck.z);
  assert.ok(solid,`${wreck.part} has its own solid`);
  assert.ok(all.min.x>=solid.center[0]-solid.size[0]/2&&all.max.x<=solid.center[0]+solid.size[0]/2&&all.min.z>=solid.center[2]-solid.size[2]/2&&all.max.z<=solid.center[2]+solid.size[2]/2,
    `${wreck.part} lies inside its solid (x ${all.min.x.toFixed(1)} to ${all.max.x.toFixed(1)}, z ${all.min.z.toFixed(1)} to ${all.max.z.toFixed(1)})`);
  assert.ok(Math.abs(notGear.min.y-ground)<.12,`${wreck.part} rests on the ground (lowest part ${(notGear.min.y-ground).toFixed(2)} m from it)`);
  if(!Number.isFinite(pods.min.y))continue;
  if(wreck.roll===0)assert.ok(pods.min.y>=ground-.15,`${wreck.part}'s engine pods are sunk no deeper than a hand (${(ground-pods.min.y).toFixed(2)} m)`);
}
assert.equal(new Set(BONEYARD_WRECKS.map(wreck=>wreck.heading)).size,3,'the three wrecks lie on three different headings');
assert.equal(BONEYARD_WRECKS.filter(wreck=>wreck.roll!==0).length,1,'one wreck is rolled onto a wing');
const gaps=[['north','east'],['north','south'],['east','south']].map(([a,b])=>{
  const boxA=footprints.get(a),boxB=footprints.get(b);
  return Math.hypot(Math.max(boxA.min.x-boxB.max.x,boxB.min.x-boxA.max.x,0),Math.max(boxA.min.z-boxB.max.z,boxB.min.z-boxA.max.z,0));});
assert.ok(Math.max(...gaps)-Math.min(...gaps)>10&&Math.min(...gaps)>=3,`the gaps between wrecks are uneven (${gaps.map(gap=>gap.toFixed(0)).join(', ')} m) and no two touch`);
const boxDistance=(x,z,solid)=>Math.hypot(Math.max(Math.abs(x-solid.center[0])-solid.size[0]/2,0),Math.max(Math.abs(z-solid.center[2])-solid.size[2]/2,0));
const lineDistance=(line,solid)=>{let closest=Infinity;for(let index=0;index<line.length-1;index++){
  const [ax,az]=line[index],[bx,bz]=line[index+1],length=Math.hypot(bx-ax,bz-az);
  for(let metres=0;metres<=length;metres+=.5)closest=Math.min(closest,boxDistance(ax+(bx-ax)*metres/length,az+(bz-az)*metres/length,solid));}return closest;};
const roads={boneyardRoad:GAS_RUN_PATHS.boneyard.map(place=>[place.position.x,place.position.z]),longRoad:GAS_RUN_PATHS.long.map(place=>[place.position.x,place.position.z]),
  furnacePath:EVERBURN_JOBS[5].steps[1].path.map(place=>[(place.position??place).x,(place.position??place).z])};
for(const wreck of BONEYARD_WRECKS){
  const solid=SCABLANDS_SOLIDS.find(row=>row.id===`boneyard-wreck-${wreck.id}`);
  for(const [name,line] of Object.entries(roads))assert.ok(lineDistance(line,solid)>=8,`${wreck.part} keeps 8 m from the ${name} (${lineDistance(line,solid).toFixed(1)} m)`);
  const bessBox=footprints.get(wreck.id);
  assert.ok(Math.hypot(Math.max(bessBox.min.x-BESS_REST.x,BESS_REST.x-bessBox.max.x,0),Math.max(bessBox.min.z-BESS_REST.z,BESS_REST.z-bessBox.max.z,0))>=5,`Big Bess's resting place is 5 m clear of the ${wreck.part}`);
}
wreckScene.dispose();
// Fix 7: the well is not alone on its disc. Eight to twelve props cut from the real kit model stand in one cluster, clear of
// the raiders' way in, their hold, the furnace's parking place and the car's start at the well, each on the ground.
const propScene=createScablandsScene(course,{loadAsset:async path=>{
  if(path===SCABLANDS_ASSETS.kit)return realParse(path);
  const root=new THREE.Group();
  if(path===SCABLANDS_ASSETS.bess||path===SCABLANDS_ASSETS.furnace)for(const name of ['Big Bess gas truck',"Old Smoke's rolling furnace"]){const part=new THREE.Group();part.name=name;root.add(part);}
  return {scene:root};
}});
assert.equal(await propScene.ready,true,'the scene with the real kit loads');
propScene.group.updateMatrixWorld(true);
const sceneProps=propScene.group.getObjectByName('The Everburn detail LOD').getObjectByName('Everburn well props'),sceneMeshes=[];
sceneProps.traverse(node=>{if(node.isMesh)sceneMeshes.push(node);});
assert.ok(sceneMeshes.length>=2&&sceneMeshes.length<=12,`the props are drawn in one mesh for each surface (${sceneMeshes.length} meshes)`);
const propKit=await realParse(SCABLANDS_ASSETS.kit),propCluster=createEverburnProps(propKit.scene,{groundAt:(east,south)=>scablandsSurfaceHeightAt(places.get('everburn').x+east,places.get('everburn').z+south)-scablandsSurfaceHeightAt(places.get('everburn').x,places.get('everburn').z)});
const propRoot=new THREE.Group();propRoot.position.set(places.get('everburn').x,scablandsSurfaceHeightAt(places.get('everburn').x,places.get('everburn').z),places.get('everburn').z);propRoot.add(propCluster);propRoot.updateMatrixWorld(true);
assert.ok(propCluster&&propCluster.children.length>=8&&propCluster.children.length<=12,`eight to twelve props stand by the well (${propCluster?.children.length})`);
const wellAt=places.get('everburn'),avoid=[['the raiders way in',-448,288,14],['the raiders hold',-426,303,14],['the furnace parking place',wellAt.x+18,wellAt.z,12],['the car start at the well',wellAt.x,wellAt.z,12]];
const propGround=scablandsSurfaceHeightAt(wellAt.x,wellAt.z);
for(const prop of propCluster.children){
  const bounds=new THREE.Box3().setFromObject(prop),size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.y>.3&&size.y<8&&size.x<8&&size.z<8,`${prop.name} is a small prop (${size.x.toFixed(1)} by ${size.y.toFixed(1)} by ${size.z.toFixed(1)} m)`);
  assert.ok(Math.abs(bounds.min.y-scablandsSurfaceHeightAt((bounds.min.x+bounds.max.x)/2,(bounds.min.z+bounds.max.z)/2))<.1,`${prop.name} stands on the ground`);
  for(const [what,x,z,metres] of avoid){
    const away=Math.hypot(Math.max(bounds.min.x-x,x-bounds.max.x,0),Math.max(bounds.min.z-z,z-bounds.max.z,0));
    assert.ok(away>=metres,`${prop.name} stands ${metres} m or more from ${what} (${away.toFixed(1)} m)`);
  }
}
assert.ok(new Set(propCluster.children.map(prop=>prop.name)).size>=5,'the props are of at least five kinds');
propScene.dispose();
console.log('Scablands scene: place art, coarse horizon, shared ground, landmark visibility and all solid collision boxes pass.');

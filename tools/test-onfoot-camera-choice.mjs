import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createProfile, PLAYERS_KEY} from '../src/progression.js';
import {needsCareerMigration, backupBeforeMigration, captureCareer} from '../src/career-backup.js';
import {keyboardAction, INPUT_CONTEXTS} from '../src/input-contexts.js';
import * as THREE from 'three';
import * as cameraChoice from '../src/onfoot-camera.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat.js';

const memory=new Map();
const storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.localStorage=storage; globalThis.cancelAnimationFrame=()=>{};
let checks=0;const failures=[];
async function check(name,run){checks++;try{await run();}catch(error){failures.push(`${name}: ${error.message}`);}}
function appFixture(){memory.clear();const app=new App();app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:true}});return app;}

await check('old and malformed preferences default first person without changing other choices',()=>{
  const profile=createProfile();
  for(const value of [undefined,null,'wrong',{},false]){
    const result=normalizeRaceSettings({footCamera:value,ghostEnabled:false,difficulty:'pro'},profile);
    assert.equal(result.footCamera,'first-person');assert.equal(result.ghostEnabled,false);assert.equal(result.difficulty,'pro');
  }
  assert.equal(normalizeRaceSettings({footCamera:'overhead'},profile).footCamera,'overhead');
});
await check('missing preference requires verified backup; failure never writes old bytes',async()=>{
  memory.clear();const profile=createProfile();profile.raceSettings=normalizeRaceSettings({},profile);delete profile.raceSettings.footCamera;
  storage.setItem(PLAYERS_KEY,JSON.stringify({version:2,activePlayerId:'test',players:[{id:'test',name:'Test',profile}]}));
  const before=captureCareer(storage),records=new Map();assert.equal(needsCareerMigration(storage),true);
  const backup=await backupBeforeMigration(storage,{async save(row){records.set(row.id,structuredClone(row));},async load(id){return records.get(id);}});
  assert.deepEqual(backup.entries,before);assert.deepEqual(captureCareer(storage),before);
  await assert.rejects(backupBeforeMigration(storage,{async save(){throw Error('blocked');},async load(){return null;}}));
  assert.deepEqual(captureCareer(storage),before);
});
await check('named-player preference persists and remains separate from car camera and race choices',()=>{
  const app=appFixture();assert.equal(app.footCameraMode,'first-person');
  const first=app.player.id,choices=structuredClone(app.getRaceChoices());app.setCamera('wide');
  assert.equal(app.setFootCamera('overhead'),'overhead');assert.equal(app.cameraMode,'wide');assert.deepEqual(app.getRaceChoices(),choices);
  assert.equal(app.setFootCamera('invalid'),'overhead');
  const reloaded=new App();reloaded.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:true}});
  assert.equal(reloaded.footCameraMode,'overhead');reloaded.dispose();
  app.addPlayer('Second camera');assert.equal(app.footCameraMode,'first-person');app.selectPlayer(first);assert.equal(app.footCameraMode,'overhead');
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{wasteland2:false}});
  const before=JSON.stringify(app.profile);assert.equal(app.footCameraMode,'first-person');app.setFootCamera('first-person');assert.equal(JSON.stringify(app.profile),before);
  app.dispose();
});
await check('foot KeyC changes presentation only; car keys and gamepad map remain unchanged',()=>{
  assert.equal(keyboardAction('foot','KeyC'),'foot-camera-cycle');assert.equal(keyboardAction('car','KeyC'),'camera:front');
  assert.deepEqual(INPUT_CONTEXTS.foot.gamepad,[[9,'pause'],[2,'enter-car'],[0,'jump'],[7,'fire'],[6,'aim'],[12,'gear:1'],[15,'gear:2'],[13,'gear:3']]);
  const app=appFixture();app.startCampaign({mode:'wasteland',startStage:0,seed:1989});
  app.duel.state.status='racing';app.duel.state.countdown=0;app.duel.state.onFoot=true;
  app.setCamera('back');app._footPointer={lookX:4,lookY:-2,fire:true,aim:true};
  const before=structuredClone(app.duel.state),pointer=structuredClone(app._footPointer);
  app._inputAction(keyboardAction('foot','KeyC'));assert.equal(app.footCameraMode,'overhead');assert.equal(app.cameraMode,'back');
  assert.deepEqual(app.duel.state,before);assert.deepEqual(app._footPointer,pointer);
  app._inputAction(keyboardAction('foot','KeyC'));assert.equal(app.footCameraMode,'first-person');assert.deepEqual(app.duel.state,before);
  app.duel.state.onFoot=false;assert.equal(app.cameraMode,'back');app.returnToMenu();assert.equal(app._footPointer.fire,false);app.dispose();
});

await check('default first-person remains exact and overhead is genuinely behind and above',()=>{
  const course={nearest:()=>({s:0,lateral:0}),groundAt:()=>({y:2}),features:{tunnels:[]},tunnelAt:()=>null};
  const fighter=Object.freeze({x:12,y:2,z:30,s:0,yaw:.6,pitch:.2});
  const pose=cameraChoice.onFootCameraPose(course,fighter);
  assert.deepEqual(pose,{position:{x:12,y:3.62,z:30},target:{x:12+Math.sin(.6)*Math.cos(.2)*8,y:3.62+Math.sin(.2)*8,z:30+Math.cos(.6)*Math.cos(.2)*8},fov:72});
  assert.deepEqual(cameraChoice.onFootCameraPose(course,fighter,'first-person'),pose);
  const overhead=cameraChoice.onFootCameraPose(course,fighter,'overhead');
  const dx=overhead.position.x-fighter.x,dz=overhead.position.z-fighter.z;
  assert.ok(dx*Math.sin(fighter.yaw)+dz*Math.cos(fighter.yaw)<-1,'eye follows behind the actual heading');
  assert.ok(overhead.position.y>fighter.y+1.62,'overhead eye is above standing eye');
  assert.ok(Math.hypot(dx,dz)<=8,'short bounded follow boom');
});
await check('all eleven combat courses retain final terrain and tunnel clearance without fighter writes',()=>{
  const definitions=COURSE.filter(supportsCombat);assert.equal(definitions.length,11);
  let tunnels=0;
  for(const definition of definitions){
    const course=new Course(definition,1989),distances=[course.length*.23,course.length*.71];
    for(const tunnel of course.features.tunnels.slice(0,1))distances.push((tunnel.start+tunnel.end)/2);
    for(const s of distances){
      const p=course.groundAt(s,0),fighter=Object.freeze({x:p.x,y:p.y,z:p.z,s,yaw:course.at(s).heading+.25,pitch:0});
      const before=JSON.stringify(fighter),pose=cameraChoice.onFootCameraPose(course,fighter,'overhead');
      const near=course.nearest(pose.position.x,pose.position.z,s),ground=course.groundAt(near.s,near.lateral),tunnel=course.tunnelAt(near.s);
      assert.ok(pose.position.y>=ground.y+.65-1e-8,`${definition.id}: final eye above actual terrain`);
      assert.ok(Math.hypot(pose.position.x-fighter.x,pose.position.z-fighter.z)<=8,`${definition.id}: bounded boom`);
      if(tunnel){tunnels++;const ratio=Math.min(.995,Math.abs(near.lateral)/tunnel.width);
        const roof=course.at(near.s).y+3.6+(tunnel.height-3.6)*Math.sqrt(1-ratio*ratio)-.45;
        assert.ok(pose.position.y<=roof+1e-8,`${definition.id}: actual arch clearance`);
        assert.ok(Math.abs(near.lateral)<tunnel.width,`${definition.id}: eye within tunnel walls`);
      }
      assert.deepEqual(cameraChoice.onFootCameraPose(course,fighter,'overhead'),pose,'same common-time snapshot gives exact pose');
      assert.equal(JSON.stringify(fighter),before);
    }
  }
  assert.ok(tunnels>0,'real tunnel poses were exercised');
});
await check('a fighter outside the tunnel is not pulled into its distant lateral corridor',()=>{
  const course=new Course(COURSE.find(def=>def.id==='high-country'),1989),tunnel=course.features.tunnels[0];
  const s=(tunnel.start+tunnel.end)/2,p=course.groundAt(s,tunnel.width+20);
  const fighter=Object.freeze({x:p.x,y:p.y,z:p.z,s,yaw:course.at(s).heading,pitch:0});
  const pose=cameraChoice.onFootCameraPose(course,fighter,'overhead');
  assert.ok(Math.hypot(pose.position.x-fighter.x,pose.position.z-fighter.z)<=8,'unrelated tunnel must not teleport the eye');
  const near=course.nearest(pose.position.x,pose.position.z,s);
  assert.ok(pose.position.y>=course.groundAt(near.s,near.lateral).y+.65-1e-8);
});
await check('reticle projects the fighter aim ray from each actual camera, including overhead parallax',()=>{
  assert.equal(typeof cameraChoice.onFootAimPoint,'function');assert.equal(typeof cameraChoice.projectOnFootAim,'function');
  const course={nearest:()=>({s:0,lateral:0}),groundAt:()=>({y:0}),features:{tunnels:[]},tunnelAt:()=>null};
  for(const mode of ['first-person','overhead'])for(const pitch of [0,.15]){
    const fighter=Object.freeze({x:0,y:0,z:0,s:0,yaw:.3,pitch}),pose=cameraChoice.onFootCameraPose(course,fighter,mode);
    const camera=new THREE.PerspectiveCamera(pose.fov,16/9,.1,1000);
    camera.position.copy(pose.position);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);camera.updateMatrixWorld();
    const eye=new THREE.Vector3(fighter.x,fighter.y+1.62,fighter.z),direction=new THREE.Vector3(Math.sin(.3)*Math.cos(pitch),Math.sin(pitch),Math.cos(.3)*Math.cos(pitch));
    const expectedWorld=eye.clone().addScaledVector(direction,60),point=cameraChoice.onFootAimPoint(fighter,60);
    assert.ok(new THREE.Vector3(point.x,point.y,point.z).distanceTo(expectedWorld)<1e-8,'existing fighter aim origin/direction unchanged');
    const projected=expectedWorld.project(camera),marker=cameraChoice.projectOnFootAim(camera,fighter);
    assert.ok(Math.abs(marker.x-(projected.x+1)/2)<1e-8&&Math.abs(marker.y-(1-projected.y)/2)<1e-8);
    assert.equal(marker.visible,Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&projected.z>=-1&&projected.z<=1);
    if(mode==='overhead'&&pitch===0)assert.ok(Math.abs(marker.y-.5)>.01,'offset eye needs parallax rather than a fixed center marker');
  }
});

for(const failure of failures)console.error(`FAIL ${failure}`);
console.log(`On-foot camera choice: ${checks-failures.length}/${checks} checks passed; ${failures.length} failed.`);
if(failures.length)process.exitCode=1;

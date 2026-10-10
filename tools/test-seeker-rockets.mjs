import assert from 'node:assert/strict';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {startRocketVolley, stepRocketPod, shouldUseRocketPods, launchAimedRocket} from '../src/arsenal/rockets.js';
import {addHazard, clearHazards} from '../src/arsenal/hazards.js';
import {deployDecoyDrone} from '../src/arsenal/decoy-drone.js';
import {targetFor} from '../src/arsenal/targeting.js';
import {SOUND_BANK} from '../src/sound-bank.js';

let passed = 0;
const check = (name, fn) => {try {fn(); passed++;} catch (error) {console.error(name, error); process.exitCode=1;}};
function fixture(enabled=true) {
  const state={s:0,lateral:0,speedMph:0,headingError:0,stageTimeSec:0,mode:'wasteland',status:'racing',opponents:[],traffic:[],combat:{serial:0,projectiles:[],rocketVolleys:[]}};
  const events=[];
  const duel={state,events,featureFlags:createFeatureFlags({storage:null,qa:true,search:enabled?'?flags=seeker-rockets':''}),
    course:{groundAt:(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0}),nearest:(x,z)=>({s:z,lateral:x})},
    _vehicleSpec:()=>({halfWidth:1,halfLength:2,height:1.7}), _obstacles:()=>[],emit:e=>events.push(e)};
  const car=(s,lateral=0)=>{const actor={s,lateral,speedMph:0,armor:100};state.opponents.push(actor);return actor;};
  const fire=()=>{startRocketVolley(duel,state);return state.combat.projectiles.at(-1);};
  return {duel,state,car,fire,events};
}
const steer=(duel,shot,dt=1/120)=>stepRocketPod(duel,shot,dt,{damageCar:(_d,a,n)=>{a.armor-=n;return n;},shielded:(_d,a)=>a.shield});
check('dev flag is production isolated',()=>{
  assert.equal(FEATURE_STATES['seeker-rockets'],'dev');
  assert.equal(createFeatureFlags({storage:null,qa:false,search:'?flags=seeker-rockets'}).enabled('seeker-rockets'),false);
});
check('nearest eligible enemy within nose cone and range',()=>{
  const {car,fire}=fixture(); car(10,20);car(121);car(65,5);car(40,7);
  assert.equal(fire().seekerTargetId,'cpu:3');
});
check('walls and scrap block acquisition',()=>{
  for(const kind of ['wall','scrap-pile']){
    const {duel,car,fire}=fixture();car(50);duel._obstacles=()=>[{kind,shape:'box',x:0,y:0,z:25,halfX:4,halfZ:2,height:4}];
    assert.equal(fire().seekerTargetId,null);
  }
});
check('smoke blocks acquisition and permanently breaks a chase',()=>{
  const {duel,car,fire,state}=fixture();car(60,4);const shot=fire();assert.equal(shot.seekerTargetId,'cpu:0');
  const smoke=addHazard(duel,{kind:'smoke',shape:'circle',x:2,y:0,z:30,radius:6,lifetime:6,opacity:1});
  assert.ok(smoke);steer(duel,shot);assert.equal(shot.seekerTargetId,null);
  assert.equal(fire().seekerTargetId,null);clearHazards(duel);
  const vx=shot.vx;steer(duel,shot);assert.equal(shot.vx,vx);assert.equal(shot.seekerTargetId,null);
});
check('turn rate is capped at 35 degrees/second at 80m/s',()=>{
  for(const hz of [30,60,144]){
    const {duel,car,fire}=fixture();car(80,20);const shot=fire(),before=Math.atan2(shot.vx,shot.vz);steer(duel,shot,1/hz);
    assert.ok(Math.abs(Math.atan2(shot.vx,shot.vz)-before-35*Math.PI/180/hz)<1e-9);
    assert.ok(Math.abs(Math.hypot(shot.vx,shot.vz)-80)<1e-9);
  }
});
check('lost target never retargets; no target stays straight',()=>{
  const {duel,car,fire}=fixture();const first=car(60,10);const shot=fire();car(50);first.finished=true;
  steer(duel,shot);assert.equal(shot.seekerTargetId,null);const vx=shot.vx;first.finished=false;steer(duel,shot);assert.equal(shot.vx,vx);
  const blank=fixture();const straight=blank.fire();blank.car(50,5);steer(blank.duel,straight);assert.equal(straight.seekerTargetId,null);
});
check('decoy within25m pulls a rocket once and cannot reacquire after expiry',()=>{
  const {duel,car,fire,state}=fixture();car(70);const shot=fire();const drone={id:'drone',decoy:true,drone:true,active:true,expiresAt:5,ownerId:'cpu:0',s:65,lateral:10,speedMph:0,armor:1};state.opponents.push(drone);
  steer(duel,shot);assert.equal(shot.seekerTargetId,'drone');
  drone.active=false;steer(duel,shot);assert.equal(shot.seekerTargetId,null);
});
check('decoy beyond25m does not pull',()=>{
  const {duel,car,fire,state}=fixture();car(70);const shot=fire();state.opponents.push({id:'far',decoy:true,drone:true,active:true,expiresAt:5,ownerId:'cpu:0',s:30,lateral:0,speedMph:0});steer(duel,shot);assert.equal(shot.seekerTargetId,'cpu:0');
});
check('shield blocks damage',()=>{
  const {duel,car,fire}=fixture();const enemy=car(20);enemy.shield=true;const shot=fire();for(let i=0;i<100&&!shot.dead;i++)steer(duel,shot);assert.equal(enemy.armor,100);assert.equal(shot.dead,true);
});
check('CPU fires 20-100m within20 degrees when enabled',()=>{
  const {duel,car,state}=fixture();const owner=car(-60,-15);assert.equal(shouldUseRocketPods(duel,owner),true);
  owner.s=-19;owner.lateral=0;assert.equal(shouldUseRocketPods(duel,owner),false);owner.s=-101;assert.equal(shouldUseRocketPods(duel,owner),false);
  owner.s=-60;owner.lateral=-30;assert.equal(shouldUseRocketPods(duel,owner),false);
  state.finished=true;assert.equal(shouldUseRocketPods(duel,owner),false);
});
check('Gunn aimed rockets and switch-off pods retain straight flight',()=>{
  const {duel,car,state}=fixture();car(60,15);const shot=launchAimedRocket(duel,state,{x:0,y:1,z:100});const vx=shot.vx;steer(duel,shot);assert.equal(shot.vx,vx);assert.equal(shot.seekerTargetId,undefined);
  const off=fixture(false);off.car(60,15);const old=off.fire(),oldVx=old.vx;steer(off.duel,old);assert.equal(old.vx,oldVx);
});
check('lock cue occurs for a new chase and has a short authored tone',()=>{
  const {car,fire,events}=fixture();car(60,5);fire();assert.equal(events.filter(e=>e.arsenalCue==='weapon.rockets.lock').length,1);
  const cue=SOUND_BANK['weapon.rockets.lock'];assert.ok(cue);assert.ok(cue.layers.every(l=>l.duration<=.25));
});
check('cone and range boundaries and per-rocket acquisition',()=>{
  for(const [distance,degrees,expected] of [[120,20,true],[120.01,0,false],[50,20.01,false]]){
    const {car,fire}=fixture();const angle=degrees*Math.PI/180;car(distance*Math.cos(angle),distance*Math.sin(angle));
    assert.equal(fire().seekerTargetId!==null,expected);
  }
});
check('old targeting defaults still prefer an eligible decoy',()=>{
  const {duel,state,car}=fixture();car(70);state.opponents.push({id:'default-decoy',decoy:true,active:true,expiresAt:5,ownerId:'cpu:0',s:20,lateral:0,speedMph:0});
  assert.equal(targetFor(duel,state,{lockedTargetId:'cpu:0',range:120}).id,'default-decoy');
  assert.equal(targetFor(duel,state,{lockedTargetId:'cpu:0',range:120,allowDecoys:false}),state.opponents[0]);
});
check('moving launch car still gives seeker80m/s; airborne target obeys3D cap',()=>{
  const {duel,state,car,fire}=fixture();state.speedMph=100;const enemy=car(70,10);enemy.airHeight=20;
  const shot=fire();assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy,shot.vz)-80)<1e-9);
  const before=[shot.vx,shot.vy,shot.vz];steer(duel,shot,1/30);
  const dot=(before[0]*shot.vx+before[1]*shot.vy+before[2]*shot.vz)/6400;
  assert.ok(Math.acos(dot)<=35*Math.PI/180/30+1e-9);assert.ok(shot.vy>0);
});
check('Mirage copies do not gain the new Decoy Drone pull',()=>{
  const {duel,state,car,fire}=fixture();car(70);const shot=fire();state.opponents.push({id:'clone',decoy:true,active:true,expiresAt:5,ownerId:'cpu:0',s:65,lateral:5,speedMph:0});
  steer(duel,shot);assert.equal(shot.seekerTargetId,'cpu:0');
});
check('native Decoy Drone bursts on actual seeker contact',()=>{
  const {duel,state,car,fire,events}=fixture();state.wastelandGateDiscovered=true;state.combat.bursts=[];
  const owner=car(60);state.rival=owner;const drone=deployDecoyDrone(duel,owner);const shot=fire();
  for(let i=0;i<180&&!shot.dead;i++)stepRocketPod(duel,shot,1/120);
  assert.equal(shot.dead,true);assert.equal(drone.active,false);assert.ok(!state.opponents.includes(drone));
  assert.equal(events.filter(e=>e.arsenalCue==='weapon.decoy.burst').length,1);
});
console.log(`Seeker rockets: ${passed}/17 checks passed`);

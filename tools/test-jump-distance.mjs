import assert from 'node:assert/strict';
import {createJumpHeightReadout} from '../src/jump-height.js';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steeringYawAuthority} from '../src/config.js';
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
const course={groundAt(){throw Error('HUD must not sample terrain');}},r=createJumpHeightReadout();
const base={status:'racing',stageTimeSec:1,airborne:true,airHeight:2,airDistance:12.345,airTime:.65,stageCrashes:0,boundaryResets:0,impactTimer:0,_jumpY:2};
let read=r.update(Object.freeze({...base}),course);check(read.distanceMeters===12.345&&read.durationSeconds===.65,'HUD reads unrounded physics distance and duration');
read=r.update({...base,stageTimeSec:2,airborne:false,airHeight:0,airDistance:25.7,airTime:1.4,_jumpY:0},course);
check(read.phase==='landed'&&read.distanceMeters===25.7&&read.durationSeconds===1.4,'landing uses final measured range, not last rendered airborne sample');
for(let i=0;i<30;i++)check(r.update({...base,stageTimeSec:2,airborne:false,airDistance:999,paused:true,_jumpY:0},course).distanceMeters===25.7,'paused landing keeps completed jump');
check(r.update({...base,stageTimeSec:4,airborne:false,_jumpY:0},course).distanceMeters===0,'distance expires with the landing panel');
for(const invalid of[NaN,Infinity,-Infinity,-3,'14',null,undefined]){
  const fresh=createJumpHeightReadout().update({...base,airDistance:invalid,airTime:invalid},course);
  check(fresh.distanceMeters===0&&fresh.durationSeconds===0,'invalid measurements cannot enter the HUD');
}
for(const reset of[{status:'menu'},{stageCrashes:1},{boundaryResets:1},{airborne:false,_jumpY:null},{impactTimer:.4}]){
  const readout=createJumpHeightReadout();readout.update(base,course);check(readout.update({...base,stageTimeSec:2,...reset},course).phase==='hidden','recovery and lifecycle clear distance');
}
function run(fps){
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:COURSE.findIndex(c=>c.id==='titan-stunt-trial'),car:'titan_monster',difficulty:'casual'});
  const hud=createJumpHeightReadout();let accumulator=0,steps=0,landed=null,previous=false,origin=null,peak=0;
  while(steps<1800&&!landed){accumulator+=1/fps;while(accumulator>=1/120-1e-10&&steps<1800&&!landed){
    const s=duel.state,mps=s.speedMph*DRIVE.mphToWorld,surface=duel._drivingSurface(s.s,s.lateral),heading=Math.atan(-s.lateral*2.5/Math.max(15,mps)),look=duel.course.at(s.s+mps*.18);
    const yaw=look.curvature*mps+(heading-s.headingError)*6,authority=Math.max(.05,steeringYawAuthority(s.speedMph,duel.car.grip,surface.traction));
    duel.setInput({throttle:1,steer:Math.max(-1,Math.min(1,-yaw/authority))});duel.step(1/120);accumulator-=1/120;steps++;
    if(s.airborne){origin??={...s._airOrigin};peak=Math.max(peak,s.airHeight);check(s.airDistance>=0&&s.airTime>=0,'physics measurements finite and nonnegative');}
    if(previous&&!s.airborne){const p=duel.course.worldAt(s.s,s.lateral);landed={distance:s.airDistance,duration:s.airTime,expected:Math.hypot(p.x-origin.x,p.z-origin.z),peak,steps};}
    previous=s.airborne;
  }hud.update(duel.state,duel.course);}
  check(!!landed&&landed.distance>10&&landed.duration>.5,'ordinary input produces a measured physical jump');
  check(Math.abs(landed.distance-landed.expected)<1e-8,'distance is horizontal takeoff-to-landing length, not altitude or speed multiplied by time');
  return landed;
}
const a=run(30),b=run(144);assert.deepEqual(a,b);checks++;
console.log(`Jump distance: ${checks} checks; real jump ${a.distance.toFixed(3)} m / ${a.duration.toFixed(3)} s, identical at 30/144 FPS.`);

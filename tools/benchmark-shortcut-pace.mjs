import { Duel } from '../src/game.js';
import { COURSE, DRIVE, steeringYawAuthority } from '../src/config.js';

// Audit only: one common run-up is cloned at the branch entrance. Thereafter,
// every position comes from ordinary steering/throttle inputs and Duel.step.
// Traffic and radar are removed to isolate route geometry/surface pace; solid
// scenery, terrain, grip, gears, drift, damage and recovery remain active.
const dt=1/120,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const rows=[],fixtures=new Map(),requested=process.argv.slice(2),events=requested[0]==='all'?COURSE.filter(d=>!d.arena).map(d=>d.id):requested.length?requested:['pacific-canyon','ridge-rally'];
const seeds=(process.env.DUEL_PACE_SEEDS||'1989,42').split(',').map(Number);
function make(seed,stage,car){
  const key=`${seed}/${stage}/${car}`;
  if(!fixtures.has(key)){const d=new Duel({seed});d.startCampaign({startStage:stage,car,difficulty:'casual',mode:'timetrial'});d.state.status='racing';d.state.traffic=[];d.state.rival=null;d.state.police.pursuit=null;d.course.features.radarTraps=[];fixtures.set(key,{course:d.course,state:structuredClone(d.state),gates:d._lapGates});}
  const fixture=fixtures.get(key),d=new Duel({seed});d.state=structuredClone(fixture.state);d.course=fixture.course;d._lapGates=fixture.gates;d._obstacleQueryCache=new Map();d._obstacleArray=d.course.features.obstacles;return d;
}
function path(course,cut){
  const offset=s=>cut&&s>=cut.start&&s<=cut.end?course.shortcutOffset(cut,s):0;
  const point=s=>course.groundAt(s,offset(s));
  const heading=s=>{const a=point(s-.75),b=point(s+.75);return Math.atan2(b.x-a.x,b.z-a.z);};
  const curvature=s=>{const a=point(s-3),b=point(s+3);return angle(heading(s+3),heading(s-3))/Math.max(.1,Math.hypot(b.x-a.x,b.z-a.z));};
  return{offset,heading,curvature};
}
function drive(d,route,boost=false){
  const st=d.state,car=d.car,frame=d.course.at(st.s),mps=st.speedMph*DRIVE.mphToWorld;
  const target=angle(route.heading(st.s),frame.heading)+Math.atan((route.offset(st.s)-st.lateral)*2.5/Math.max(15,mps));
  const yaw=route.curvature(st.s+mps*.18)*mps+angle(target,st.headingError)*6;
  const surface=d._drivingSurface(st.s,st.lateral),traction=surface.traction,authority=Math.max(.05,steeringYawAuthority(st.speedMph,car.grip,traction));
  const bend=Math.max(...[0,100,220].map(a=>Math.abs(route.curvature(st.s+a))));
  const corner=Math.min(car.topSpeed*.94,.85*Math.sqrt(DRIVE.maxLateralAccel*car.grip*traction/Math.max(.0001,bend))/DRIVE.mphToWorld);
  const speed=Math.min(surface.speedLimit,corner);
  d.setInput({throttle:st.speedMph<speed?1:0,brake:st.speedMph>speed+4?Math.min(1,(st.speedMph-speed)/20):0,steer:clamp(-yaw/authority,-1,1),boost});
}
function run(d,route,end,cutEnd){
  let time=0,split=null,error=0,minSpeed=Infinity,maxSpeed=0,offSurface=0,boostSeconds=0,previous=d.state.s;
  while(d.state.s<end&&time<100&&d.state.status==='racing'){
    previous=d.state.s;drive(d,route);d.step(dt);time+=dt;
    const st=d.state;error=Math.max(error,Math.abs(st.lateral-route.offset(st.s)));minSpeed=Math.min(minSpeed,st.speedMph);maxSpeed=Math.max(maxSpeed,st.speedMph);
    if(!d.course.surfaceAt(st.s,st.lateral).road)offSurface+=dt;if(st.boosting)boostSeconds+=dt;
    if(split===null&&previous<cutEnd&&st.s>=cutEnd)split=time-dt+dt*(cutEnd-previous)/(st.s-previous);
  }
  if(d.state.s>=end)time-=dt*(d.state.s-end)/(d.state.s-previous);
  return{seconds:+time.toFixed(3),branchSeconds:split===null?null:+split.toFixed(3),exitSpeed:+d.state.speedMph.toFixed(1),minSpeed:+minSpeed.toFixed(1),maxSpeed:+maxSpeed.toFixed(1),maxTrackingError:+error.toFixed(3),offSurfaceSeconds:+offSurface.toFixed(3),majorCrashes:d.state.majorCrashes,boundaryResets:d.state.boundaryResets,status:d.state.status,lastCrash:d.state.lastCrashReason,boostSeconds};
}
for(const seed of seeds)for(const id of events)for(const car of['falcone_f42','dusthawk_rally']){
  const stage=COURSE.findIndex(d=>d.id===id),probe=make(seed,stage,car);
  for(const cut of probe.course.features.shortcuts){
    const warm=make(seed,stage,car),s=warm.state;Object.assign(s,{s:cut.start-220,prevS:cut.start-220,lateral:0,prevLateral:0,speedMph:60,gear:1,offRoad:!!warm.course.def.offroad});
    const common=path(warm.course,null);let elapsed=0;while(s.s<cut.start&&elapsed<30){drive(warm,common);warm.step(dt);elapsed+=dt;}
    const snapshot=structuredClone(s),entrySpeed=s.speedMph,end=Math.min(warm.course.length-2,cut.end+100);
    const result={event:id,seed,car,cut:cut.id,surface:cut.surface,mainMeters:+cut.mainMeters.toFixed(1),cutMeters:+cut.cutMeters.toFixed(1),entrySpeed:+entrySpeed.toFixed(1),runUpSeconds:+elapsed.toFixed(3),exitRunout:+(end-cut.end).toFixed(1)};
    for(const branch of[false,true]){const d=make(seed,stage,car);d.state=structuredClone(snapshot);const route=path(d.course,branch?cut:null);result[branch?'shortcut':'main']=run(d,route,end,cut.end);}
    result.gainSeconds=+(result.main.seconds-result.shortcut.seconds).toFixed(3);result.gainPercent=+(100*result.gainSeconds/result.main.seconds).toFixed(2);rows.push(result);
  }
}
// The entire rally event is legal gravel: test requested nitro on that surface.
const nitro=make(1989,COURSE.findIndex(d=>d.offroad),'dusthawk_rally');Object.assign(nitro.state,{s:200,prevS:200,speedMph:80,gear:2,offRoad:true});let active=0;const route=path(nitro.course,null);
for(let i=0;i<1200;i++){drive(nitro,route,true);nitro.step(dt);active+=nitro.state.boosting?dt:0;}
console.log(JSON.stringify({method:'120 Hz input-only driving; cloned common220m run-up; no traffic/radar; branch timing plus up to100m exit runout; no upgrades/nitro',rows,nitro:{requestedSeconds:10,activeSeconds:active,remaining:nitro.state.boost,crashes:nitro.state.majorCrashes}},null,2));

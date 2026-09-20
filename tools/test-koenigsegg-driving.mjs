import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {CARS,BOOST,COURSE} from '../src/config.js';
import {UPGRADE_TYPES,CAR_PRICES,isCarUnlocked,getUpgradeLevels,upgradedCar,bestKey} from '../src/progression.js';

const key='koenigsegg_jesko',dt=1/120;
const levels=Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type=>[type,3]));
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const near=(actual,expected,tolerance,label)=>check(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);
check(CARS[key],'the completion reward has its own catalog identity');
const tuned=upgradedCar(CARS[key],levels);
for(const [other,spec]of Object.entries(CARS).filter(([other])=>other!==key)){
  const max=upgradedCar(spec,levels);
  check(tuned.topSpeed>max.topSpeed,`${other}: the Jesko is faster even than this fully upgraded car`);
  check(tuned.accel>max.accel,`${other}: the Jesko has more engine acceleration`);
  check(tuned.braking>max.braking,`${other}: the Jesko has stronger brakes`);
  check(tuned.grip>=max.grip,`${other}: the Jesko has top-tier corner grip`);
  check(tuned.boostCapacity>max.boostCapacity,`${other}: the Jesko carries a larger nitro tank`);
}

// Straight, level proving ground isolates actual driving code from authored
// corner limits. This is a capability test, not a fabricated course finish.
function provingGround(car,{speed=0,difficulty='casual'}={}){
  const duel=new Duel({car,difficulty}),s=duel.state;
  const point=(distance,lateral=0)=>({x:lateral,y:0,z:distance,heading:0,curvature:0});
  duel.course={def:{id:'hypercar-proving-ground',theme:'desert'},length:200000,raceLength:400000,closed:false,
    features:{obstacles:[],mountains:[],flocks:[],shortcuts:[],ramps:[],crushables:[],radarTraps:[]},
    at:distance=>point(distance),worldAt:point,groundAt:point,phase:distance=>distance,themeAt:()=> 'desert',roadHalfWidthAt:()=>7,
    surfaceAt:(_,lateral)=>({road:Math.abs(lateral)<=7,mainRoad:Math.abs(lateral)<=7,roadHalfWidth:7}),
    nearest:(x,z)=>({s:z,lateral:x}),obstaclesNear:()=>[],nearestRadar:()=>null};
  Object.assign(s,{status:'racing',s:100,prevS:100,lateral:0,prevLateral:0,speedMph:speed,upgrades:{...levels},gear:speed?CARS[car].gears.length-1:0,rival:null,traffic:[]});
  duel._obstacleQueryCache=new Map();duel._obstacleArray=duel.course.features.obstacles;
  return duel;
}
function accelerate(car,boost){
  const duel=provingGround(car),s=duel.state;let peak=0;
  duel.setInput({throttle:1,boost});
  for(let step=0;step<40/dt;step++){
    duel._drive(dt);peak=Math.max(peak,s.speedMph);
    check(Number.isFinite(s.speedMph+s.s+s.lateral+s.headingError),'high-speed state remains finite');
    check(s.boost>=0&&s.boost<=1,'nitro remains bounded');
  }
  same(s.stageCrashes,0,'flat-out acceleration does not create a phantom impact');
  return {peak,duel};
}
const dry=accelerate(key,false),wet=accelerate(key,true);
near(dry.peak,tuned.topSpeed,.4,'actual unboosted speed reaches the displayed max');
const expectedBoost=tuned.topSpeed*(BOOST.topSpeedMult+levels.nitro*.025+(tuned.nitroSpeedBonus||0));
near(wet.peak,expectedBoost,.5,'actual nitro speed reaches the car-specific ceiling');
check(wet.peak>dry.peak+50,'nitro gives a substantial high-speed surge');
const manual=provingGround(key,{difficulty:'pro'});const usedGears=new Set();
for(let step=0;step<40/dt;step++){
  manual.setInput({throttle:1,shiftUp:manual.state.revs>.95});manual._drive(dt);usedGears.add(manual.state.gear);
}
same([...usedGears],[...tuned.gears.keys()],'Pro driving can shift through every forward gear in order');
near(manual.state.speedMph,tuned.topSpeed,.4,'careful manual shifts reach the same unboosted top speed');
same(manual.state.stageCrashes,0,'correct manual shifts avoid an engine blow');
function brakeToRest(car,speed){
  const duel=provingGround(car,{speed}),s=duel.state,start=s.s;duel.setInput({brake:1});let steps=0;
  while(s.speedMph>0&&steps<1200){duel._drive(dt);steps++;}
  same(s.speedMph,0,`${car}: full brake reaches rest before reverse engages`);
  return {brakingMeters:s.s-start,brakingSeconds:steps*dt};
}
const fastStop=brakeToRest(key,200);
const benchmark=[];
for(const car of Object.keys(CARS)){
  // 100 mph is attainable by every car, including the monster truck; testing
  // that truck at 200 mph would measure its speed clamp, not just its brakes.
  const stopping=brakeToRest(car,100);
  const nitro=provingGround(car,{speed:100});nitro.setInput({boost:true});let nitroSteps=0,peak=100;
  while(nitro.state.boost>0&&nitroSteps<6000){nitro._drive(dt);nitroSteps++;peak=Math.max(peak,nitro.state.speedMph);}
  same(nitro.state.boost,0,`${car}: holding nitro drains a finite tank`);
  const expected=(1+levels.nitro*.14)*nitro.car.boostCapacity/BOOST.drainPerSec;
  near(nitroSteps*dt,expected,dt+.000001,`${car}: tank duration matches the active car's capacity`);
  const burst=provingGround(car,{speed:100});burst.setInput({boost:true});for(let step=0;step<60;step++)burst._drive(dt);
  benchmark.push({car,...stopping,nitroSeconds:nitroSteps*dt,burstGain:burst.state.speedMph-100,peak});
}
const reward=benchmark.find(row=>row.car===key);
for(const row of benchmark.filter(row=>row.car!==key)){
  check(reward.brakingMeters<row.brakingMeters,`${row.car}: Jesko stops in less distance from 100 mph`);
  check(reward.nitroSeconds>row.nitroSeconds*1.3,`${row.car}: Jesko nitro lasts substantially longer`);
  check(reward.burstGain>row.burstGain*1.2,`${row.car}: Jesko has a stronger measured nitro impulse`);
}

// Real garage purchases in private memory, followed by two input-only Pacific
// races. No browser profile, position, speed, checkpoint or finish is changed.
const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:name=>memory.get(name)??null,setItem:(name,value)=>memory.set(name,String(value))};
try{
  const buyer=new App();buyer.profile.credits=250000;buyer._saveProfile();
  for(const car of Object.keys(CAR_PRICES))check(buyer.unlockCar(car).ok,'test wallet buys an ordinary catalog car');
  for(const [car,spec]of Object.entries(CARS).filter(([,spec])=>!spec.unlockRequirement))for(const type of Object.keys(UPGRADE_TYPES))for(let level=0;level<3;level++)check(buyer.purchaseUpgrade(car,type).ok,'normal garage API builds the qualifying fleet');
  check(isCarUnlocked(buyer.profile,key),'the final upgrade earns the reward');same(getUpgradeLevels(buyer.profile,key),levels,'the earned reward comes fully upgraded');
  const options={startStage:0,car:key,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',routeVariant:'route_a'},runs=[];
  for(const fps of [30,144]){
    const app=new App();app.autopilot=true;app._scriptedCrashDone=true;
    app.setRaceSettings(options);check(app.startCampaign(),'owned maxed Jesko starts from persisted menu setup');
    const s=app.duel.state;app._scriptedCrashDone=true;same(s.car,key,'start preserves the selected reward');same(s.upgrades,levels,'race snapshots every max upgrade');same(app.duel.car,tuned,'physics and garage use the same final tuning');
    const step=app.duel.step,hash=createHash('sha256');let steps=0;
    app.duel.step=function(delta){const active=['countdown','racing','ticket'].includes(this.state.status),value=step.call(this,delta);if(active){const p=this.state;hash.update(JSON.stringify([p.status,p.s,p.lateral,p.speedMph,p.headingError,p.gear,p.revs,p.boost,p.airHeight,p.stageTimeSec,p.stageCrashes,p.completedLaps,p.input]));steps++;}return value;};
    try{for(let frame=0;frame<fps*360&&['countdown','racing','ticket'].includes(s.status);frame++)app.advance(1/fps,1/fps);}finally{app.duel.step=step;}
    same(s.status,'stage_result',`Jesko @ ${fps} FPS completes the actual course`);check(s.results?.completed,`Jesko @ ${fps} FPS passes every gate and both laps`);
    const context={...options,stageIndex:s.stageIndex,seed:s.seed,laps:s.lapsTotal};same(app.profile.personalBests[bestKey(context)],s.results.timeSec,'the reward has its own saved car best');same(app.getGhostRecord(context)?.car,key,'the reward records its own replay');
    runs.push({steps,hash:hash.digest('hex'),time:s.results.timeSec,crashes:s.stageCrashes});app.returnToMenu();
  }
  same(runs[1],runs[0],'30 and 144 FPS produce the exact same Jesko driving trajectory and finish');
  console.log(`Jesko input-only Pacific race: ${runs[0].time}s, ${runs[0].steps} fixed steps, ${runs[0].crashes} crashes, exact 30/144 FPS trajectory.`);
  for(const [startStage,event]of COURSE.entries())if(event.expansion){
    const app=new App();check(app.purchaseCourse(event.id).ok,`${event.id}: normal credits unlock this course`);
    check(app.startCampaign({...options,startStage,mode:'duel',cpuDifficulty:'easy'}),`${event.id}: the owned reward enters this owned course`);
    app.autopilot=true;app._scriptedCrashDone=true;const s=app.duel.state;
    let missedGates=0;app.duel.onChange((_,change)=>{if(change.checkpointReset)missedGates++;});
    for(let frame=0;frame<30*360&&['countdown','racing','ticket'].includes(s.status);frame++){
      app.advance(1/30,1/30);
      check([s.s,s.lateral,s.speedMph,s.headingError,s.airHeight].every(Number.isFinite),`${event.id}: actual high-speed road state stays finite`);
    }
    same(s.status,'stage_result',`${event.id}: the Jesko completes the actual expansion route`);
    check(s.results?.completed&&s.completedLaps===2,`${event.id}: both real laps are complete`);
    check(s.results?.won,`${event.id}: the normal input-driven Jesko beats the default CPU`);
    same(missedGates,0,`${event.id}: no skipped checkpoint is hidden by recovery`);
    same(s.boundaryResets,0,`${event.id}: the Jesko remains inside the road-course boundary`);
    console.log(`Jesko ${event.name}: ${s.results.timeSec}s, ${s.stageCrashes} crashes, ${s.jumps} landed jumps; two input-only laps and a real win.`);
    app.returnToMenu();
  }
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
console.log(`Jesko performance: ${dry.peak.toFixed(2)} mph dry / ${wet.peak.toFixed(2)} mph nitro; 200–0 mph in ${fastStop.brakingSeconds.toFixed(3)} s / ${fastStop.brakingMeters.toFixed(2)} m; ${reward.nitroSeconds.toFixed(3)} s nitro.`);
console.log(`Koenigsegg driving: ${checks} checks passed, including all nine maxed-car capability comparisons and eight full races.`);

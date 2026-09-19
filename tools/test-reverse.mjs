import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {COURSE, DRIVE, LIVES, TRAFFIC} from '../src/config.js';

// No real saves or browser input are touched. Isolated geometry tests use a
// straight road; App tests use actual controls and its ordinary 120 Hz loop.
const memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const near=(actual,expected,tolerance,label)=>check(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs ${expected}`);
const dt=1/120,stageIndex=COURSE.findIndex(event=>!event.kind);

function straight(duel){
  const point=(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0,curvature:0});
  duel.course={def:{theme:'desert'},length:10000,raceLength:20000,closed:false,
    features:{obstacles:[],flocks:[],shortcuts:[],radarTraps:[]},at:s=>point(s),worldAt:point,groundAt:point,
    nearest:(x,z)=>({s:z,lateral:x,distance:Math.abs(x)}),phase:s=>s,themeAt:()=> 'desert',roadHalfWidthAt:()=>7,
    surfaceAt:(_,lateral)=>({road:Math.abs(lateral)<=7,mainRoad:Math.abs(lateral)<=7,shortcutId:null,roadHalfWidth:7}),
    nearestRadar:()=>null,obstaclesNear:()=>duel.course.features.obstacles};
  duel._lapGates=[2500,5000,7500];duel._obstacleQueryCache=new Map();duel._obstacleArray=duel.course.features.obstacles;
  Object.assign(duel.state,{s:1000,prevS:1000,lateral:0,prevLateral:0,rival:null,traffic:[],lapsTotal:2});
  return duel;
}
function fixture(difficulty='casual'){
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:stageIndex,mode:'timetrial',difficulty,cpuDifficulty:'medium'});
  straight(duel);duel.state.status='racing';return duel;
}
function step(duel,frames,input={}){
  duel.setInput({throttle:0,brake:0,steer:0,boost:false,...input});
  for(let frame=0;frame<frames;frame++)duel.step(dt);
}

same([DRIVE.reverseHoldSec,DRIVE.reverseMaxMph,DRIVE.reverseAccel],[.25,22,14],'advertised reverse intent delay, cap and acceleration are explicit');
for(const difficulty of ['casual','pro']){
  const d=fixture(difficulty),s=d.state,shifts=[];d.onChange((_,event)=>{if(event.shift!=null)shifts.push(event.shift);});
  step(d,29,{brake:1});same([s.speedMph,s.gear,s.s],[0,0,1000],`${difficulty}: brake must be held at rest for the full intent delay`);
  step(d,1,{brake:1});check(s.speedMph<0&&s.gear===-1&&s.s<1000,`${difficulty}: deliberate hold engages R and moves backward`);
  near(s.speedMph,-(14-DRIVE.dragCoeff*.2)*dt,1e-10,`${difficulty}: reverse acceleration is 14 mph/s before rolling drag`);
  step(d,360,{brake:1});near(s.speedMph,-22,1e-10,`${difficulty}: sustained reverse stops accelerating at 22 mph`);
  check(s.revs>=0&&s.revs<=1&&Number.isFinite(s.revs),`${difficulty}: reverse revs use a valid ratio rather than gears[-1]`);
  same(shifts,[-1],`${difficulty}: selecting R emits only one shift event`);
  s.boost=.6;step(d,240,{brake:1,boost:true,shiftUp:true,shiftDown:true});
  same([s.gear,s.speedMph,s.boost,s.boosting,s.overrevSec],[-1,-22,.6,false,0],`${difficulty}: reverse has no shift escape, nitro use, or over-rev`);
  same([s.lives,s.stageCrashes,s.status],[LIVES.start,0,'racing'],`${difficulty}: holding reverse cannot blow the engine`);
  const speed=s.speedMph,position=s.s;step(d,60);
  check(s.speedMph>speed&&s.speedMph<0&&s.s<position,`${difficulty}: releasing the pedals coasts backward and slows down`);
  s.speedMph=-.001;step(d,1);same(s.speedMph,0,`${difficulty}: rolling drag cannot push a stopped reverse car forward`);
  step(d,1,{throttle:1});same([s.speedMph,s.gear],[0,0],`${difficulty}: throttle selects first only at zero`);
  step(d,1,{throttle:1});check(s.speedMph>0&&s.gear===0,`${difficulty}: the next throttle step drives forward in first`);

  const interrupted=fixture(difficulty);step(interrupted,24,{brake:1});step(interrupted,1);step(interrupted,24,{brake:1});
  same([interrupted.state.speedMph,interrupted.state.gear],[0,0],`${difficulty}: releasing brake resets the reverse intent timer`);
  step(interrupted,6,{brake:1});check(interrupted.state.speedMph<0,`${difficulty}: a new full deliberate hold still works`);

  const forward=fixture(difficulty),backward=fixture(difficulty);
  forward.state.speedMph=10;Object.assign(backward.state,{speedMph:-10,gear:-1});
  step(forward,48,{steer:.5});step(backward,48,{steer:.5});
  check(forward.state.headingError<0&&backward.state.headingError>0,`${difficulty}: the same steering input turns the nose the opposite way in reverse`);
  near(backward.state.headingError,-forward.state.headingError,1e-12,`${difficulty}: steering magnitude is symmetric at equal absolute speed`);
  near(backward.state.yawVelocity,-forward.state.yawVelocity,1e-12,`${difficulty}: yaw direction follows signed travel`);
  near(backward.state.s-1000,1000-forward.state.s,1e-9,`${difficulty}: reverse distance is signed, not visual-only movement`);
}

// A swept reverse step must hit the near face, even when protection suppresses
// damage. The rear of the body, not its forward-facing nose, takes the scrape.
for(const protectedCar of [false,true]){
  const d=fixture(),s=d.state;
  d.course.features.obstacles.push({id:'rear-wall',kind:'building',shape:'box',s:990,off:0,x:0,z:990,heading:0,halfX:4,halfZ:3,height:5});
  Object.assign(s,{prevS:1000,s:980,speedMph:-22,gear:-1,invulnerableSec:protectedCar?2:0});d._collisions();
  check(s.s>=995.35&&s.s<=995.5,'reverse swept contact stops at the near side of a solid wall');
  check(s.speedMph<=0&&s.speedMph>-3,'reverse wall response removes inward velocity without flipping direction');
  same([s.lives,s.majorCrashes],[LIVES.start,0],'a low-speed reverse scrape cannot consume a life');
  check(protectedCar?s.damageZones.rear===0:s.damageZones.rear>0,'rear wall scrape respects temporary damage protection');
  same(s.damageZones.front,0,'backing into a wall does not damage the front panel');
}
{
  const d=fixture(),s=d.state;
  Object.assign(s,{s:1000,prevS:1000});
  d.course.features.obstacles.push({id:'rear-wall',kind:'building',shape:'box',s:990,off:0,x:0,z:990,heading:0,halfX:4,halfZ:3,height:5});
  step(d,600,{brake:1});
  check(s.s>=995.35&&s.s<996,'holding actual reverse input cannot creep through a rear wall');
  same(s.stageCrashes,0,'persistent low-speed contact stays a scrape rather than a major crash');
}
for(const protectedCar of [false,true]){
  const d=fixture(),s=d.state,traffic={alive:true,s:990,prevS:990,lateral:0,prevLateral:0,dir:1,speedMph:0};
  Object.assign(s,{prevS:1000,s:993,speedMph:-22,gear:-1,invulnerableSec:protectedCar?2:0});s.traffic=[traffic];d._collisions();
  const minimum=d._vehicleSpec(s).halfLength+d._vehicleSpec(traffic).halfLength+.3;
  check(s.s-traffic.s>=minimum,'a stationary traffic car remains solid when backed into');
  check(s.speedMph<=0&&s.speedMph>-22&&Number.isFinite(traffic.speedMph),'rear traffic contact slows the player without an instant forward impulse');
  check(traffic.speedMph>=0,'ordinary forward traffic is not assigned a reverse gear implicitly');
  check(protectedCar?s.damageZones.rear===0:s.damageZones.rear>0,'traffic hit damages the rear only when damage is enabled');
  same([s.nearMisses,s.score,s.lives],[0,0,LIVES.start],'reverse traffic contact awards nothing and is not a major crash');
}
for(const kind of ['rival','police']){
  const d=fixture(),s=d.state,npc={s:990,prevS:990,lateral:0,prevLateral:0,dir:1,speedMph:0,headingError:0,pushVelocity:0};
  if(kind==='rival')s.rival=npc;else s.police.pursuit=npc;
  Object.assign(s,{prevS:1000,s:993,speedMph:-22,gear:-1});d._vehicleContact(s,npc,kind);
  check(!npc.yieldingToPlayer,`backing into ${kind} cannot invoke the late forward cut-in yield path`);
  check(s.s>993&&npc.s<990,`backing into ${kind} shares contact correction rather than teleporting only the NPC`);
  check(s.speedMph<0&&s.speedMph>-22&&npc.speedMph===0,`${kind} contact preserves bounded signed player momentum and nonnegative NPC speed`);
  check(s.damageZones.rear>0,`backing into ${kind} is a real rear scrape, not a free yield`);
}
for(const cpuDifficulty of ['easy','medium','hard'])for(const playerSpeed of [0,-22])for(const kind of ['rival','police']){
  const d=fixture(),s=d.state;
  Object.assign(s,{cpuDifficulty,speedMph:playerSpeed,gear:playerSpeed<0?-1:0});
  const npc={s:994,prevS:994,lateral:0,prevLateral:0,dir:1,speedMph:2,headingError:0,pushVelocity:0,
    completedLaps:0,nextLapGate:0,lapTimes:[],lapStartedAt:0};
  if(kind==='rival')s.rival=npc;else s.police.pursuit=npc;
  let nonnegative=true,neverBacksUp=true;
  for(let frame=0;frame<60;frame++){
    const previous=npc.s;if(kind==='rival')d._rival(dt);else d._movePolice(npc,dt);
    nonnegative&&=Number.isFinite(npc.speedMph)&&npc.speedMph>=0;neverBacksUp&&=npc.s>=previous;
  }
  check(nonnegative,`${cpuDifficulty} ${kind}: a stopped/backing player cannot produce a negative NPC speed target`);
  check(neverBacksUp,`${cpuDifficulty} ${kind}: yielding to a stopped/backing player does not reverse NPC travel`);
}

// Crossing an ordered marker in reverse neither earns nor consumes it. A
// following forward run must still visit the normal checkpoints in order.
{
  const d=fixture(),s=d.state,events=[];d.onChange((_,event)=>events.push(event));
  Object.assign(s,{prevS:2500.2,s:2499.8,speedMph:-22,gear:-1});d._advanceLaps(s,dt);
  same([s.nextLapGate,s.completedLaps,s.score],[0,0,0],'backing over a lap checkpoint does not validate it');
  Object.assign(s,{prevS:10000.2,s:9999.8,nextLapGate:3});d._advanceLaps(s,dt);
  same([s.completedLaps,s.nextLapGate,s.lapTimes,s.results],[0,3,[],null],'backing across the finish cannot complete a lap or race');
  same(events.length,0,'reverse lap crossings emit no checkpoint or finish rewards');
}
{
  const index=COURSE.findIndex(event=>event.kind==='checkpoint'),d=new Duel({seed:1989});
  check(index>=0,'a real checkpoint-rush event exists');d.startCampaign({startStage:index,cpuDifficulty:'medium'});
  const s=d.state,gate=d.course.features.rushGates[0],before=structuredClone(s.checkpointRush),limit=s.timeLimitSec;
  Object.assign(s,{status:'racing',prevS:gate.s+.2,s:gate.s-.2,prevLateral:0,lateral:0,speedMph:-22,gear:-1});d._advanceRushGates(dt);
  same(s.checkpointRush,before,'backing through a real rush gate neither awards nor consumes its extension');same(s.timeLimitSec,limit,'reverse gate crossing adds no time');
}
for(const trafficDirection of [1,-1]){
  const d=fixture(),s=d.state,clearance=(TRAFFIC.collideLatU+TRAFFIC.nearMissLatU)/2;
  Object.assign(s,{prevS:1001,s:999,speedMph:-22,gear:-1,boost:.3});
  // The oncoming case flips the usual relative pass sign while the player is
  // reversing. It must not be treated as a high-speed forward near miss.
  s.traffic=[{alive:true,prevS:trafficDirection<0?1002:1000,s:trafficDirection<0?998:1000,prevLateral:clearance,lateral:clearance,dir:trafficDirection,speedMph:trafficDirection<0?80:0}];
  d._collisions();same([s.nearMisses,s.score,s.stageStyleScore,s.combo,s.boost],[0,0,0,0,.3],'backing past traffic earns no near-miss score, combo or nitro');
}

const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');let activePad=null;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>activePad?[activePad]:[]}});
function appInputRun(difficulty,fps,controller){
  memory.clear();activePad=null;
  const app=new App();check(app.startCampaign({startStage:stageIndex,mode:'timetrial',difficulty,cpuDifficulty:'medium',seed:1989}),'normal App start succeeds');straight(app.duel);
  const s=app.duel.state,hash=createHash('sha256'),snapshots=[],stepDuel=app.duel.step;
  let count=0,zeroBetweenDirections=false,previousSpeed=0;
  app.duel.step=function(slice){
    const result=stepDuel.call(this,slice),p=this.state;
    assert.ok(!(previousSpeed>0&&p.speedMph<0)&&!(previousSpeed<0&&p.speedMph>0),'direction changes must pass through an actual stopped simulation step');
    if(previousSpeed!==0&&p.speedMph===0)zeroBetweenDirections=true;
    previousSpeed=p.speedMph;count++;
    hash.update(JSON.stringify([p.status,p.stageTimeSec,p.s,p.lateral,p.speedMph,p.gear,p.revs,p.headingError,p.yawVelocity,p.reverseHoldSec,p.input]));hash.update('\n');
    return result;
  };
  const control=(direction,seconds)=>{
    app.keys={};activePad=null;
    if(controller==='gamepad'){
      const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
      if(direction){const index=direction==='forward'?7:6;buttons[index]={pressed:true,value:1};}
      activePad={connected:true,axes:[0],buttons};
    }else if(direction)app.keys[controller==='arrows'?(direction==='forward'?'ArrowUp':'ArrowDown'):(direction==='forward'?'KeyW':'KeyS')]=true;
    app.advance(seconds,1/fps);snapshots.push([s.s,s.speedMph,s.gear,s.headingError,s.reverseHoldSec]);
  };
  control(null,3.1);same(s.status,'racing','real countdown finishes before driving');
  control('forward',1);check(s.speedMph>20&&s.s>1000,'forward pedal actually accelerates the car');
  const forwardSpeed=s.speedMph;control('backward',.1);check(s.speedMph>0&&s.speedMph<forwardSpeed,'S/Down/LT first brakes a moving forward car');
  control('backward',3);same([s.speedMph,s.gear],[-22,-1],'continued brake input selects R and reaches its cap');
  control(null,.25);check(s.speedMph<0&&s.speedMph>-22,'release coasts in reverse');
  const reverseSpeed=s.speedMph;control('forward',dt);check(s.speedMph<0&&s.speedMph>reverseSpeed&&s.gear===-1,'W/Up/RT first brakes reverse travel without flipping direction');
  control('forward',1);check(s.speedMph>0&&s.gear===0,'continued forward pedal returns to first and moves forward');
  check(zeroBetweenDirections,'input-only round trip includes a physical stop');same([s.stageCrashes,s.nearMisses,s.completedLaps],[0,0,0],'short direction changes earn no race rewards or crashes');
  app.duel.step=stepDuel;activePad=null;
  return {hash:hash.digest('hex'),count,snapshots};
}
try{
  for(const difficulty of ['casual','pro']){
    let reference=null;
    for(const controller of ['wasd','arrows','gamepad'])for(const fps of [30,144]){
      const run=appInputRun(difficulty,fps,controller);
      if(reference)same(run,reference,`${difficulty}: ${controller} at ${fps} FPS has the identical per-step driving trajectory`);else reference=run;
    }
  }
  for(const difficulty of ['casual','pro']){
    memory.clear();const app=new App();app.startCampaign({startStage:stageIndex,mode:'timetrial',difficulty});straight(app.duel);app.advance(3.1);
    app.keys={KeyS:true};app.advance(.2);same([app.duel.state.gear,app.duel.state.speedMph],[0,0],'partial intent has not selected reverse');
    app.togglePause();app.advance(2);app.resume();app.advance(dt);same(app.duel.state.gear,0,'time spent paused does not count toward reverse intent');
    app.restart();const s=app.duel.state;same([s.status,s.speedMph,s.gear,s.reverseHoldSec],['countdown',0,0,0],'restart clears signed speed, gear and intent');
    straight(app.duel);app.advance(3.1);app.keys={KeyS:true};app.advance(.2);same([s.speedMph,s.gear],[0,0],'the old partial hold cannot leak through restart');
    app.advance(.2);check(s.speedMph<0&&s.gear===-1,'reverse works normally after the restart');
    app.restart();same([s.speedMph,s.gear,s.reverseHoldSec,s.input.brake],[0,0,0,0],'restarting while moving backward also clears controls and reverse state');
  }
}finally{
  if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
}
console.log(`Reverse driving: ${checks} checks passed (auto/manual, rear contacts, reward guards, keyboard/gamepad, reset and exact 30/144 FPS trajectories).`);

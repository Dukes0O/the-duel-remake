// BOWL-REX-2. The only complete drive uses normal controls in the real Duel.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {SHOW_NIGHTS} from '../src/bowl/bowl-show.js';
import {bowlNightPlayable,settleShowNight,bowlHudView} from '../src/bowl/bowl-night.js';
import {BOWL_GOALS,BOWL_SOUND_CUES,BIG_MO} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createProfile} from '../src/progression.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {createScrapdomeYard} from '../src/scrapdome-yard.js';
import {createRexView} from '../src/bowl/bowl-rex-view.js';
import {createRexFight,stepRexFight,REX_RULES,REX_CUES,REX_EVENT,REX_TROPHY,rexInTheYard} from '../src/bowl/bowl-rex.js';
import {eyePoint,hookMarker,modelPoint,rexAnchor,signedAngle,truckPoint,stepHook,releaseHook,wrap} from '../src/bowl/bowl-hook.js';
import {childDrive} from './scenarios/bowl-rex-fight.mjs';

const dt=1/120;
function start(seed=101,level='easy'){
  const d=new Duel({seed});
  d.featureFlags={enabled:n=>n==='titan-bowl'};
  assert.ok(d.startBowlNight({night:5,cpuDifficulty:level,seed}));
  const night=d.state.bowlNight;
  night.show.eventIndex=3;night.phase='result';
  assert.ok(d.continueBowlNight());
  return d;
}
const d=start(),course=d.course;
const make=(difficulty='easy')=>createRexFight({difficulty,course});
const still={s:d.state.s,lateral:d.state.lateral,input:{},speedMph:0};
assert.ok(bowlNightPlayable(5));
assert.equal(SHOW_NIGHTS[4].events.at(-1),REX_EVENT);
assert.ok(SHOW_NIGHTS.slice(0,4).every(n=>!n.events.includes(REX_EVENT)));
assert.equal(make().s,course.features.bowl.gates.find(g=>g.name==='Car Park Gate').s);
assert.equal(make().places.rail,course.features.bowl.rails.lateral);
assert.ok(Math.hypot(...['x','z'].map(k=>rexAnchor(make(),course)[k]-truckPoint(course,still)[k]))<26);
function truckAt(point,heading,extra={}){
  const road=d._roadPosition(point,14);
  return {...road,speedMph:0,input:{},headingError:signedAngle(heading-course.at(road.s).heading),...extra};
}
function approach(f,range=12,angle=0,away=false){
  const eye=eyePoint(f,course,Math.max(0,f.boxes.indexOf(false)));
  // Approach from the centre of the floor, either facing the eye or facing away.
  const heading=rexAnchor(f,course).heading+Math.PI/2*(f.direction<0?-1:1);
  const spot=modelPoint({...eye,heading},0,0,-range);
  return truckAt(spot,heading+angle+(away?Math.PI:0));
}
function tired(index=0,level='easy'){
  const f=make(level);f.phase='rest';f.low=true;f.rests=1;f.first=false;
  f.boxes=f.boxes.map((_,i)=>i<index);return f;
}

for(const level of ['easy','medium','hard']){
  const f=make(level),events=[];
  for(let i=1;i<=120*40 && !events.some(e=>e.type==='boxOpen');i++){
    for(const e of stepRexFight(f,still,dt,course))events.push({...e,time:i*dt});
  }
  const first=events.find(e=>e.type==='fire'),tell=events.find(e=>e.type==='tell');
  assert.ok(first.time<=8 && first.time-tell.time>=REX_RULES.level[level].tellSec-dt);
  assert.equal(first.cone.heading,tell.cone.heading);
  assert.equal(first.cone.halfAngle,tell.cone.halfAngle);
  assert.equal(events.filter(e=>e.type==='fire').length,level==='easy'?1:2);
  const gate=tired(0,level);gate.rests=REX_RULES.level[level].rests;gate.t=100;
  for(let i=0;i<1000 && !gate.done;i++)stepRexFight(gate,still,dt,course);
  assert.equal(gate.done?.reason,'gate');
  assert.equal(gate.s,gate.places.gateS);
  const burned=make(level);
  for(let i=0;i<300 && !burned.done;i++){
    burned.phase='fire';burned.t=0;burned.scorched=false;
    const at=truckPoint(course,still);
    burned.cone={x:at.x,z:at.z-3,heading:0,halfAngle:.3,sweep:0,range:29};
    stepRexFight(burned,still,dt,course);
  }
  assert.equal(burned.hits,{easy:5,medium:4,hard:3}[level]);
  assert.equal(burned.done.reason,'toasted');
  const collision=make(level);collision.hits=collision.maxHits+.01;
  assert.deepEqual(stepRexFight(collision,still,dt,course),[{type:'toasted'}]);
}
{
  const f=tired(),truck=approach(f);
  assert.ok(hookMarker(f,truck,course).canBite);
  assert.ok(!hookMarker(f,approach(f,12,Math.PI*.36),course).canBite);
  assert.ok(!hookMarker(f,approach(f,26),course).canBite);
  truck.input.interact=true;
  const events=[];
  for(let i=0;i<35;i++)events.push(...stepRexFight(f,truck,dt,course));
  assert.equal(f.hook.phase,'flying');
  events.push(...stepRexFight(f,truck,dt,course));
  assert.equal(f.hook.phase,'attached');
  assert.equal(events.filter(e=>e.type==='hookFire').length,1);
  f.t=60;stepRexFight(f,truck,dt,course);assert.equal(f.phase,'rest');
  truck.input.interact=false;stepRexFight(f,truck,dt,course);
  truck.input.interact=true;stepRexFight(f,truck,dt,course);assert.equal(f.hook.phase,'idle');
  const miss=tired();miss.low=false;miss.phase='walk';miss.s=14;
  const side=rexAnchor(miss,course),point=modelPoint(side,8,0,-1.5);
  const aiming=truckAt(point,side.heading-Math.PI/2,{input:{interact:true}});
  miss.marker=null;
  const ev=[];for(let i=0;i<260;i++)stepHook(miss,aiming,dt,course,ev);
  assert.ok(ev.some(e=>e.type==='clang'));assert.equal(miss.hook.phase,'idle');
  assert.ok(!ev.some(e=>e.type==='bite'));
  const clean=tired(),wait=approach(clean,12,Math.PI);
  const ev2=[];wait.input.interact=true;
  for(let i=0;i<240;i++)ev2.push(...stepRexFight(clean,wait,dt,course));
  assert.ok(!ev2.some(e=>e.type==='bite'));assert.equal(clean.hook.phase,'idle');
}
{
  const tables={easy:[2,3,3],medium:[3,4,4],hard:[3,5,5]};
  for(const [level,times] of Object.entries(tables))for(let box=0;box<3;box++){
    const f=tired(box,level);
    const truck=approach(f,14.8,0,true);
    truck.input.throttle=1;truck.boosting=true;
    Object.assign(f.hook,{phase:'attached',box});
    const events=[];
    for(let i=0;i<Math.round(times[box]/2/dt)-1;i++)events.push(...stepRexFight(f,truck,dt,course));
    assert.equal(f.boxes[box],false);
    events.push(...stepRexFight(f,truck,dt,course));
    assert.equal(f.boxes[box],true);
    assert.ok(events.some(e=>e.type==='boxOut'));
    assert.equal(f.hook.phase,'dragging');
    if(box===2)assert.ok(events.some(e=>e.type==='tell'));
  }
  const f=tired(1),truck=approach(f,14.6,0,true);truck.speedMph=23;truck.input.throttle=1;
  Object.assign(f.hook,{phase:'attached',box:1});
  const ev=stepRexFight(f,truck,dt,course);assert.ok(ev.some(e=>e.type==='jerk'));
  assert.ok(ev.some(e=>e.type==='brace'));const first=f.hook.pulls[1];
  assert.ok(f.hook.length<15);
  stepRexFight(f,truck,dt,course);assert.ok(f.hook.pulls[1]<first+.1);
  const kept=f.hook.pulls[1];releaseHook(f.hook,[]);f.t=100;stepRexFight(f,truck,dt,course);
  assert.equal(f.hook.pulls[1],kept);assert.ok(!f.low);
  const head=tired(2);Object.assign(head.hook,{phase:'attached',box:2});
  const observer=approach(head,14.7,0,true);stepRexFight(head,observer,dt,course);
  const fixed={...head.cone};assert.equal(head.phase,'tell');
  const elsewhere=approach(head,14,Math.PI/2);
  for(let i=0;i<330;i++)stepRexFight(head,elsewhere,dt,course);
  assert.equal(head.phase,'fire');assert.equal(head.cone.heading,fixed.heading);
  const anger=tired(2);anger.low=false;anger.phase='walk';anger.t=8;
  stepRexFight(anger,still,dt,course);assert.equal(anger.cone.sweep,Math.PI/6);
  anger.phase='walk';anger.throwDue=true;const ring=stepRexFight(anger,still,dt,course).find(e=>e.type==='lift');
  assert.ok(ring);const trip=[];
  for(let i=0;i<500;i++)trip.push(...stepRexFight(anger,{...still,s:still.s+60},dt,course));
  const land=trip.find(e=>e.type==='thrownLand');
  assert.ok(land && !land.hit);assert.deepEqual(land.at,ring.at);
}
for(const cue of Object.values(REX_CUES)){
  if(['bowl.hook.tight','bowl.rex.box.drag'].includes(cue))continue;
  assert.ok(SOUND_BANK[BOWL_SOUND_CUES[cue]],cue);
}
for(const name of ['noBox','slack','brace','scorch','tell','rest','out.1','out.2','out.3'])assert.ok(BIG_MO['rex.'+name]);
for(const phase of ['walk','rest','tell','fire','lift','throw','fallen','exit']){
  for(const h of ['idle','attached','dragging'])assert.ok(BOWL_GOALS.scrapasaurus({phase,hook:{phase:h},boxes:[false,false,false]}).split(' ').length<=5);
}
// Each trajectory starts outside and finishes beyond the part in one step.
function crossing({low=false,fallen=false,localZ,y}){
  const duel=start(),s=duel.state,f=s.bowlNight.event.rex;
  f.low=low;f.phase=fallen?'fallen':low?'rest':'walk';f.t=fallen?3:0;
  const frame=rexAnchor(f,duel.course);
  const a=duel._roadPosition(modelPoint(frame,-13,0,localZ),f.s);
  const b=duel._roadPosition(modelPoint(frame,13,0,localZ),f.s);
  Object.assign(s,{prevS:a.s,prevLateral:a.lateral,s:b.s,lateral:b.lateral,
    airborne:y>0,airHeight:y,prevAirHeight:y,groundHeight:0,prevGroundHeight:0,
    speedMph:60,headingError:signedAngle(frame.heading+Math.PI/2-duel.course.at(b.s).heading)});
  duel._obstacles=()=>[];
  let hit=false;duel.onChange((_,ev)=>{if(ev.bowlRex?.type==='bump')hit=true;});
  duel._staticContacts(s,true);
  return hit;
}
for(const probe of [{localZ:-1.55,y:0},{localZ:0,y:6},{localZ:6.6,y:8.8},{localZ:-10,y:5.75},
  {low:true,localZ:-10,y:0},{low:true,localZ:6,y:1},{low:true,fallen:true,localZ:0,y:3}]){
  assert.ok(crossing(probe),'swept wall contact '+JSON.stringify(probe));
}
assert.ok(!crossing({localZ:-10,y:10}));
assert.ok(!crossing({low:true,fallen:true,localZ:0,y:9}),'air above the fallen body is clear');

// The yard trophy and its original save condition survive the change of fight.
const profile=createProfile();
assert.ok(!rexInTheYard(profile));
const settled=settleShowNight(profile,{won:true,night:5,bests:{}});
assert.ok(settled.ok&&rexInTheYard(settled.profile)&&settled.profile.bowl.trophies.includes(REX_TROPHY));


function modelFixture(){
  const scene=new THREE.Group();
  for(let i=1;i<=3;i++){
    const box=new THREE.Group(),socket=new THREE.Mesh(new THREE.BoxGeometry(1,.1,1));
    box.name='battery-box-'+i;box.position.set(0,9.86,i-2);scene.add(box,socket);
    socket.name='battery-socket-'+i;
    for(const state of ['whole','open']){
      const cell=new THREE.Mesh(new THREE.BoxGeometry(1,.5,1),new THREE.MeshStandardMaterial());
      cell.name=box.name+'-'+state;cell.scale.setScalar(state==='open'?0:1);box.add(cell);
    }
  }
  return scene;
}
{
  const path=new Course(COURSE.find(row=>row.id==='pacific-canyon'),1989,{hiddenRoad:true});
  const model=modelFixture();let loads=0;
  const yard=createScrapdomeYard(path,{loadAsset:async()=>({scene:new THREE.Group()}),
    loadRex:async()=>{loads++;return {scene:model};}});
  await yard.ready;yard.setRexOrnament(false);await Promise.resolve();assert.equal(loads,0);
  yard.setRexOrnament(true);await new Promise(r=>setTimeout(r,0));
  assert.equal(loads,1);const body=yard.group.getObjectByName('Beaten Scrapasaurus');assert.ok(body.visible);
  for(let i=1;i<=3;i++)assert.ok(!model.getObjectByName('battery-box-'+i+'-whole').visible && model.getObjectByName('battery-socket-'+i).visible);
  yard.group.updateMatrixWorld(true);assert.ok(Math.abs(new THREE.Box3().setFromObject(body).min.y-body.parent.getWorldPosition(new THREE.Vector3()).y)<1e-6);
  yard.setRexOrnament(false);assert.ok(!body.visible);yard.dispose();
}
{
  let loads=0;const model=modelFixture(),view=createRexView({loadModel:async()=>{loads++;return {scene:model,animations:[]};}});
  const f=tired(),state={bowlNight:{night:5,event:{type:REX_EVENT,rex:f}}};
  const first=t=>view.update(course,state,t,true);
  first(0);await new Promise(r=>setTimeout(r,0));
  f.marker=hookMarker(f,approach(f),course);
  const snap=JSON.stringify(f);first(10);assert.equal(JSON.stringify(f),snap);
  assert.ok(model.getObjectByName('battery-box-1-open').visible && model.getObjectByName('battery-box-1-open').scale.x===1);
  assert.ok(!model.getObjectByName('battery-box-1-whole').visible);
  const at=eyePoint(f,course,0);f.boxes[0]=true;f.hook.phase='dragging';f.hook.box=0;
  f.hook.drag={...at,x:at.x+6};f.hook.tip=f.hook.drag;f.hook.origin=at;
  first(20);assert.equal(view.group.getObjectByName('battery-box-1').position.x,at.x+6);
  assert.ok(model.getObjectByName('battery-socket-1').visible);
  assert.ok(view.group.getObjectByName('Scrapasaurus tow cable').visible);
  f.phase='tell';f.cone={x:0,z:0,heading:.4,flameHeading:.2,sweep:0,range:29,halfAngle:.32};
  first(30);const cone=view.group.getObjectByName('Scrapasaurus fire cone');
  assert.ok(cone.visible&&!cone.material.depthTest);assert.equal(cone.rotation.y,.4);
  assert.ok(!view.group.getObjectByName('Scrapasaurus fire').visible && view.group.getObjectByName('Scrapasaurus chest glow').visible);
  f.phase='fire';first(40);assert.ok(view.group.getObjectByName('Scrapasaurus fire').visible);
  for(const night of [1,3,4]){
    view.update(course,{bowlNight:{night,event:{type:'carCrush'}}},50,true);
    assert.equal(view.group.visible,night>=3);
  }
  first(60);assert.equal(loads,1);
  view.dispose();
}
function drive(seed){
  const duel=start(seed),s=duel.state,night=s.bowlNight,f=night.event.rex;
  const rng=makeRng(seed),driver={reaction:rng.range(.4,.75),lane:rng.range(9.7,10.4),pace:rng.range(16,19)};
  const trace=[];let fall=null,ending=null;
  duel.onChange((_,ev)=>{
    if(ev.bowlRex){trace.push(ev.bowlRex.type);if(ev.bowlRex.type==='fall')fall=night.clock;}
    if(ev.bowlEventResult)ending=night.clock;
  });
  for(let i=0;i<120*400 && s.status!=='bowl_break';i++){
    childDrive(duel,driver);
    if(f.hook.phase==='attached'){assert.equal(s.input.steer,0);assert.ok(!s.input.boost);}
    if(f.phase==='fallen'){
      assert.equal(f.hook.phase,'dragging');
      assert.ok(f.hook.drag);
    }
    duel.step(dt);
  }
  assert.ok(night.lastResult,'fight ended, seed '+seed);
  if(night.lastResult.won){
    assert.equal(trace.filter(x=>x==='boxOut').length,3);
    assert.equal(trace.filter(x=>x==='fall').length,1);
    assert.ok(Math.abs(ending-fall-10)<dt*.01,'result exactly ten seconds after the third extraction');
    assert.equal(night.event.resultHoldSince,fall);
    assert.ok(bowlHudView(s,duel.course).goal.split(' ').length<=5);
  }
  return {won:night.lastResult.won,trace};
}
if(!process.argv.includes('--rules-only')){
  const runs=Array.from({length:10},(_,i)=>drive(101+i));
  assert.deepEqual(drive(101),runs[0]);
  const wins=runs.filter(run=>run.won).length;
  console.log('Easy ordinary-input tow wins:',wins,'of 10');
  assert.ok(wins>=9,'child-pace driver must win at least nine of ten');
}
console.log('Scrapasaurus tow rules, continuous wall contacts, yard and read-only view passed.');


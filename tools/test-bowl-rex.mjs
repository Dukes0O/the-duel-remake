// BOWL-REX-2. The only complete drive uses normal controls in the real Duel.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {crowdAfter, SHOW_NIGHTS, scoreStuntEvent} from '../src/bowl/bowl-show.js';
import {bowlNightPlayable,settleShowNight,bowlHudView} from '../src/bowl/bowl-night.js';
import {BOWL_GOALS,BOWL_RESULTS,BOWL_SOUND_CUES,BIG_MO} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createProfile} from '../src/progression.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {sweepObstacle} from '../src/collision.js';
import {createScrapdomeYard} from '../src/scrapdome-yard.js';
import {createRexView,bombRingOver,BOMB_RING_TONE,BOWL_FLOOR_TONES} from '../src/bowl/bowl-rex-view.js';
import {bowlStrip, offscreenRexPull} from '../src/bowl/bowl-hud.js';
import {createRexFight,stepRexFight,REX_RULES,REX_CUES,REX_EVENT,REX_TROPHY,rexInTheYard,rexRiseAttacks,rexLineFor,REX_3_EVENTS} from '../src/bowl/bowl-rex.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {eyePoint,hookMarker,modelPoint,rexAnchor,rexSolids,signedAngle,truckPoint,stepHook,releaseHook,TOW_LENGTH,wrap} from '../src/bowl/bowl-hook.js';
import {childDrive} from './scenarios/bowl-rex-fight.mjs';

const dt=1/120;
assert.equal(scoreStuntEvent({type:'rexBox'}, 0).points, 300);
assert.equal(scoreStuntEvent({type:'rexFall'}, 0).points, 500);
assert.equal(scoreStuntEvent({type:'rexBox'}, 50).points, 450);
assert.equal(scoreStuntEvent({type:'rexFall'}, 50).points, 750);
function start(seed=101,level='easy',rex3=false){
  const d=new Duel({seed});
  d.featureFlags={enabled:n=>n==='titan-bowl' || rex3 && n==='bowl-rex-3'};
  assert.ok(d.startBowlNight({night:5,eventIndex:2,cpuDifficulty:level,seed}));
  assert.equal(d.state.bowlNight.event.type,REX_EVENT);
  return d;
}
{
  const wreck=start();
  wreck.state.status='gameover';wreck.state.impactTimer=0;
  wreck.step(dt);
  assert.equal(wreck.state.bowlNight.lastResult.won,false);
  assert.equal(wreck.state.bowlNight.lastResult.wrecked,true);
}
{
  const duel=start(), state=duel.state, keys={};
  state.status='racing';
  const steering={update:()=>0};
  const controls={duel,keys,_readGamepad:()=>({}),activeInputContext:()=>'car',
    _resetKeyboardInput(){},_keyboardSteering:steering,_arenaKeyboardSteering:steering,
    _keyboardThrottle:{update:()=>0}};
  const rex=state.bowlNight.event.rex;
  for(const [down,phase] of [[true,'flying'],[false,'flying'],[true,'idle'],[false,'idle'],[true,'flying']]){
    keys.KeyF=down;
    App.prototype._applyInput.call(controls,dt);
    assert.equal(state.input.interact,down);
    stepHook(rex,state,dt,duel.course,[]);assert.equal(rex.hook.phase,phase);
  }
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
  assert.ok(!events.some(e=>e.type==='scorch' && e.time<first.time+1.65),'the stationary starting truck is clear of the first fire');
  assert.equal(first.cone.heading,tell.cone.heading);
  assert.equal(first.cone.halfAngle,tell.cone.halfAngle);
  assert.equal(events.filter(e=>e.type==='fire').length,level==='easy'?1:2);
  for(const count of [1,2]){
    const resting=tired(0,level);resting.rests=count;
    resting.t=REX_RULES.level[level].restSec-2*dt;
    stepRexFight(resting,still,dt,course);assert.equal(resting.phase,'rest');
    stepRexFight(resting,still,dt,course);assert.equal(resting.phase,'walk');
  }
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
  const tables={easy:[2,4,3],medium:[3,4,4],hard:[3,5,5]};
  for(const [level,times] of Object.entries(tables))for(let box=0;box<3;box++){
    const f=tired(box,level);
    const truck=approach(f,14.8,0,true);
    truck.input.throttle=1;truck.boosting=true;
    Object.assign(f.hook,{phase:'attached',box});
    const events=[];
    for(let i=0;i<Math.round(times[box]/2/dt)-1;i++)events.push(...stepRexFight(f,truck,dt,course));
    assert.equal(f.boxes[box],false);
    events.push(...stepRexFight(f,truck,dt,course));
    if(box===2){
      const tell=events.findIndex(e=>e.type==='tell');
      while(f.phase!=='fire' && !f.boxes[box]){assert.ok(!f.boxes[box]);events.push(...stepRexFight(f,truck,dt,course));}
      assert.ok(tell>=0 && events.some(e=>e.type==='fire'));
      for(let i=0;i<85 && !f.boxes[box];i++)events.push(...stepRexFight(f,truck,dt,course));
    }
    assert.equal(f.boxes[box],true);
    assert.ok(events.some(e=>e.type==='boxOut'));
    assert.equal(f.hook.phase,'dragging');
    if(box===2)assert.ok(events.some(e=>e.type==='tell'));
  }
  const f=tired(1,'hard'),truck=approach(f,14.6,0,true);truck.speedMph=23;truck.input.throttle=1;
  Object.assign(f.hook,{phase:'attached',box:1});
  const ev=stepRexFight(f,truck,dt,course);assert.ok(ev.some(e=>e.type==='jerk'));
  assert.ok(ev.some(e=>e.type==='brace'));const first=f.hook.pulls[1];
  assert.ok(f.hook.length<15);
  stepRexFight(f,truck,dt,course);assert.ok(f.hook.pulls[1]<first+.1);
  for(let i=2;i<239;i++)assert.ok(!stepRexFight(f,truck,dt,course).some(e=>e.type==='braceStall'));
  assert.ok(stepRexFight(f,truck,dt,course).some(e=>e.type==='braceStall'));
  assert.equal(f.hook.pulls[1],first);
  assert.equal(BIG_MO['rex.brace'],'It pulled you in, so press Space as you pull.');
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
  anger.phase='walk';anger.due=['car'];const ring=stepRexFight(anger,still,dt,course).find(e=>e.type==='lift');
  assert.ok(ring);const trip=[];
  for(let i=0;i<500;i++)trip.push(...stepRexFight(anger,{...still,s:still.s+60},dt,course));
  const land=trip.find(e=>e.type==='thrownLand');
  assert.ok(land && !land.hit);assert.deepEqual(land.at,ring.at);
}
{
  const duel = start(), state = duel.state, fight = state.bowlNight.event.rex;
  const tip = eyePoint(fight, duel.course, 1);
  const project = visible => point => {
    assert.deepEqual(point, tip);
    return {visible};
  };
  Object.assign(fight.hook, {phase: 'attached', box: 1, tight: true, pulls: [2, 2, 0], tip});
  const strip = () => bowlStrip(state, bowlHudView(state, duel.course));
  assert.equal(strip().goal, 'KEEP PULLING');
  assert.equal(offscreenRexPull(strip(), project(false)), 50, 'the strip mirrors the progress when the box is off screen');
  assert.equal(offscreenRexPull(strip(), project(true)), null, 'the ring on the box suffices when it is visible');
  releaseHook(fight.hook, []);
  assert.equal(offscreenRexPull(strip(), project(false)), null, 'letting go clears the pull ring');
}
for(const cue of Object.values(REX_CUES)){
  if(['bowl.hook.tight','bowl.rex.box.drag'].includes(cue))continue;
  assert.ok(SOUND_BANK[BOWL_SOUND_CUES[cue]],cue);
}
for(const name of ['noBox','slack','brace','scorch','tell','rest','out.1','out.2','out.3'])assert.ok(BIG_MO['rex.'+name]);
for (const phase of ['walk','rest','tell','fire','lift','throw','fallen','exit']) {
  for (const h of ['idle','attached','dragging']) {
    const goal = BOWL_GOALS.scrapasaurus({phase, hook: {phase: h}, boxes: [false, false, false]});
    if (phase === 'tell' || phase === 'fire') assert.equal(goal, 'ITS CHEST IS GLOWING, SO GET CLEAR');
    else assert.ok(goal.split(' ').length <= 5);
  }
}
function placeShowTruck(duel, point, heading, speedMph = 0) {
  const state = duel.state, {s, lateral} = duel._roadPosition(point, state.s);
  const ground = duel.course.groundAt(s, lateral).y;
  Object.assign(state, {s, prevS: s, lateral, prevLateral: lateral, speedMph, boost: 1,
    groundHeight: ground, prevGroundHeight: ground, _jumpY: ground, airHeight: 0,
    prevAirHeight: 0, _verticalSpeed: 0, airborne: false, pushVelocity: 0,
    headingError: signedAngle(heading - duel.course.at(s).heading)});
}

for (const level of ['easy', 'hard']) {
  const duel = start(101, level), {state, course} = duel, f = state.bowlNight.event.rex;
  while (state.status === 'countdown') duel.step(dt);
  Object.assign(f, {phase: 'rest', low: true, rests: 1, first: false, s: 45, direction: 1, boxes: [true, false, false]});
  const eye = eyePoint(f, course, 1), {heading} = rexAnchor(f, course);
  placeShowTruck(duel, modelPoint({...eye, heading}, -14.25, 0, 0), heading - Math.PI / 2);
  Object.assign(f.hook, {phase: 'attached', box: 1, length: TOW_LENGTH, pulls: [2, 0, 0]});
  let tight = 0;
  for (let tick = 0; tick < 625 && !f.boxes[1]; tick++) {
    duel.setInput({throttle: 1, boost: false, steer: 0});
    if (f.hook.tight) tight += dt;
    duel.step(dt);
  }
  assert.ok(f.braced && tight + 1e-8 >= 4 - dt, level + ' held through a real brace');
  if (level === 'easy') assert.ok(f.boxes[1] && tight <= 5, 'throttle alone frees the Easy back box within one tired spell');
  else assert.ok(!f.boxes[1] && f.hints.braceStall, 'the same throttle alone stalls against Hard');
}

for (const move of [false, true]) {
  const duel = start(), {state, course} = duel, f = state.bowlNight.event.rex;
  while (state.status === 'countdown') duel.step(dt);
  Object.assign(f, {phase: 'walk', s: 35, t: 2.4, direction: 1, tells: 1, first: false});
  const frame = rexAnchor(f, course);
  placeShowTruck(duel, modelPoint(frame, -6, 0, 18), frame.heading - Math.PI / 2);
  duel.step(dt);
  assert.equal(f.phase, 'tell');
  for (let tick = 0; tick < 540 && f.phase !== 'rest'; tick++) {
    duel.setInput({throttle: move ? 1 : 0, steer: 0});
    duel.step(dt);
  }
  assert.equal(f.phase, 'rest');
  assert.equal(f.scorched, !move, 'moving away on the chest tell avoids the fire that burns a truck left in place');
}

// Full throttle, boost and steering at the same wall contacts that used to
// pull the final truck pose more than 20 metres from the attached battery.
let tautFrames = 0;
for (const [station, degrees] of [[25, 10], [135, 10], [218, 90], [280, 170]]) {
  const duel = start(), {state, course} = duel, f = state.bowlNight.event.rex;
  while (state.status === 'countdown') duel.step(dt);
  Object.assign(f, {phase: 'rest', low: true, rests: 1, first: false, s: station, direction: 1});
  const eye = eyePoint(f, course, 0), heading = rexAnchor(f, course).heading + degrees * Math.PI / 180;
  placeShowTruck(duel, modelPoint({...eye, heading}, 0, 0, 14), heading, 52);
  Object.assign(f.hook, {phase: 'attached', box: 0, length: TOW_LENGTH, pulls: [0, 0, 0]});
  for (let tick = 0; tick < 100 && f.hook.phase === 'attached'; tick++) {
    duel.setInput({throttle: 1, steer: Math.sin(tick * .07), boost: true});
    duel.step(dt);
    if (f.hook.phase !== 'attached') break;
    const at = truckPoint(course, state);
    const span = Math.hypot(at.x - eye.x, at.y - eye.y, at.z - eye.z);
    assert.ok(span <= TOW_LENGTH + 1e-6, `cable at ${station} m, step ${tick}: ${span} m`);
    if (span > TOW_LENGTH - .12) tautFrames++;
  }
}
assert.ok(tautFrames > 0, 'the wall-contact drives include a taut cable under power');
{
  const duel = start(), {state, course} = duel, f = state.bowlNight.event.rex;
  while (state.status === 'countdown') duel.step(dt);
  Object.assign(f, {phase: 'rest', low: true, rests: 1, first: false, s: 166, direction: 1});
  const s = 170.43096129493892, lateral = 4.299231530927322, heading = 121 * Math.PI / 180;
  placeShowTruck(duel, course.worldAt(s, lateral), heading, 75);
  Object.assign(f.hook, {phase: 'attached', box: 0, length: TOW_LENGTH, pulls: [0, 0, 0]});
  duel.setInput({throttle: 1, boost: true, steer: -.8});
  duel.step(dt);
  const eye = eyePoint(f, course, 0), at = truckPoint(course, state);
  const span = Math.hypot(at.x - eye.x, at.y - eye.y, at.z - eye.z);
  assert.ok(span <= TOW_LENGTH && span > TOW_LENGTH - .12, 'the cable stays taut and under 15 m on the kicker flank');
}

// Each trajectory starts outside and finishes beyond the part in one step.
function crossing({low=false,fallen=false,localZ,y}){
  const duel=start(),s=duel.state,f=s.bowlNight.event.rex;
  f.low=low;f.phase=fallen?'fallen':low?'rest':'walk';f.t=fallen?3:0;
  // The sweep tests the beast's solids. Keep both endpoints inside the shutters.
  f.places.rail=0;
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

// The space between the feet is open down low, and the same body solids
// rest against the floor by the time the fall's dust begins.
{
  const duel = start(), course = duel.course, fight = duel.state.bowlNight.event.rex;
  const anchor = rexAnchor(fight, course), underBelly = modelPoint(anchor, 0, .25, -1.4);
  assert.ok(rexSolids(fight, course).every(part =>
    !sweepObstacle(underBelly, underBelly, part, anchor.heading, {halfWidth: .1, halfLength: .1, height: .2})),
  'the visible gap between the feet has no solid below the belly');
  Object.assign(fight, {phase: 'fallen', low: true, t: 1.5, boxes: [true, true, true]});
  const down = rexSolids(fight, course);
  assert.ok(Math.abs(Math.min(...down.map(part => part.minY)) - anchor.y) <= .2, 'the lowest fallen solid reaches the floor');
  assert.ok(Math.abs(down.find(part => part.id === 'rex-ribs').minY - anchor.y) <= .2,
    'the fallen ribcage lies against the floor at the landing');
}

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
    const leads = new THREE.Group();
    leads.name = 'battery-leads-' + i;
    leads.scale.setScalar(0);
    socket.add(leads);
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
  for (let i = 1; i <= 3; i++) {
    assert.ok(!model.getObjectByName('battery-box-' + i + '-whole').visible && model.getObjectByName('battery-socket-' + i).visible);
    const leads = model.getObjectByName('battery-leads-' + i);
    assert.ok(leads.visible, 'the torn lead group is visible');
    assert.deepEqual(leads.scale.toArray(), [1, 1, 1], 'the yard shows torn leads in socket ' + i);
  }
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
  const beam=view.group.getObjectByName('Open battery beam'),arrow=view.group.getObjectByName('Offscreen battery arrow');
  assert.ok(beam.visible && beam.geometry.parameters.height>=30);
  const camera=new THREE.PerspectiveCamera(55,1.5,.1,500);
  camera.position.copy(f.marker);camera.position.z+=30;camera.updateMatrixWorld();
  arrow.onBeforeRender(null,null,camera);assert.equal(arrow.material.opacity,0);
  camera.rotateY(Math.PI);camera.updateMatrixWorld();
  arrow.onBeforeRender(null,null,camera);assert.equal(arrow.material.opacity,1);
  const ndc=arrow.position.clone().project(camera);assert.ok(Math.abs(ndc.x)<=.9 && Math.abs(ndc.y)<=.8);
  f.hook.phase='attached';f.hook.box=0;f.hook.pulls[0]=1;first(15);
  const progress=view.group.getObjectByName('Battery pull progress');
  assert.ok(progress.visible);assert.equal(progress.geometry.drawRange.count,32*6);
  const at=eyePoint(f,course,0);f.boxes[0]=true;f.hook.phase='dragging';f.hook.box=0;
  f.hook.drag={...at,x:at.x+6};f.hook.tip=f.hook.drag;f.hook.origin=at;
  first(20);assert.equal(view.group.getObjectByName('battery-box-1').position.x,at.x+6);
  assert.ok(model.getObjectByName('battery-socket-1').visible);
  assert.ok(view.group.getObjectByName('Scrapasaurus tow cable').visible);
  f.phase='tell';f.cone={x:0,z:0,heading:.4,flameHeading:.2,sweep:0,range:29,halfAngle:.32};
  first(30);
  assert.equal(view.group.getObjectByName('Scrapasaurus fire cone'), undefined, 'the chest alone marks the tell');
  assert.ok(!view.group.getObjectByName('Scrapasaurus fire').visible && view.group.getObjectByName('Scrapasaurus chest glow').visible);
  f.phase='fire';first(40);
  assert.ok(view.group.getObjectByName('Scrapasaurus fire').visible);
  assert.equal(view.group.getObjectByName('Scrapasaurus fire cone'), undefined, 'there is no floor fan during fire either');
  for(const night of [1,3,4]){
    view.update(course,{bowlNight:{night,event:{type:'carCrush'}}},50,true);
    assert.equal(view.group.visible,night>=3);
  }
  first(60);assert.equal(loads,1);
  view.dispose();
}
// BOWL-REX-3: the eye beam and the bombs, without driving, with its switch (`bowl-rex-3`) on.
const make3=(difficulty='easy')=>createRexFight({difficulty,course,rex3:true});
const tired3=(index=0,level='easy')=>Object.assign(tired(index,level),{rex3:true});
assert.ok(Object.hasOwn(FEATURE_STATES,'bowl-rex-3'),'the beam and the bombs have a switch of their own');
// Off, it gets up as released: a car with two boxes out, nothing else, and no beam between Medium's breaths.
for(const level of ['easy','medium','hard'])for(const [out,owed] of [[0,[]],[1,[]],[2,['car']]]){
  const f=make(level);f.boxes=[0,1,2].map(i=>i<out);assert.deepEqual(rexRiseAttacks(f),owed);
}
{
  const levels=['easy','medium','hard'];
  // No beam and no bomb before the first box is out, on any level.
  for(const level of levels){
    const f=make3(level),events=[];
    for(let i=0;i<120*40 && !events.some(e=>e.type==='boxOpen');i++)events.push(...stepRexFight(f,still,dt,course));
    assert.ok(!events.some(e=>['beamAim','bombTell'].includes(e.type)),level+': nothing new before a box is out');
    assert.deepEqual(rexRiseAttacks(make3(level)),[]);
  }
  // Getting up: the beam alone after the first box; with two out, Easy's bomb, beam, car and round again,
  // Medium's and Hard's bomb and car in turn, the bomb first.
  const order=(level,out,count)=>{const f=make3(level);f.boxes=[0,1,2].map(i=>i<out);return Array.from({length:count},()=>rexRiseAttacks(f).join());};
  for(const level of levels)assert.deepEqual(order(level,1,3),['beam','beam','beam']);
  assert.deepEqual(order('easy',2,4),['bomb','beam','car','bomb']);
  for(const level of ['medium','hard'])assert.deepEqual(order(level,2,3),['bomb','car','bomb']);
  // The same orders when it really gets up from a tired spell (the first extra event after the rise).
  const risen=(level,out,clear=true)=>{
    const f=tired3(out,level),seen=[];
    for(let round=0;round<3;round++){
      Object.assign(f,{phase:'rest',low:true,t:REX_RULES.level[level].restSec,rests:1});
      if(clear)f.bomb=null;
      for(let i=0;i<20;i++){
        const e=stepRexFight(f,still,dt,course).find(e=>['beamAim','bombTell','lift','tell'].includes(e.type));
        if(e){seen.push(e.type);break;}
      }
      f.beam=null;f.headDown=false;
    }
    return seen;
  };
  for(const level of levels)assert.deepEqual(risen(level,1),['beamAim','beamAim','beamAim']);
  assert.deepEqual(risen('easy',2),['bombTell','beamAim','lift']);
  assert.deepEqual(risen('hard',2),['bombTell','lift','bombTell']);
  // Never two bombs: a bomb owed while one lies is a car.
  assert.deepEqual(risen('medium',2,false).slice(0,3),['bombTell','lift','lift']);
  // Medium and Hard, two boxes out: the beam between its two breaths; on Hard twice running, the second
  // following for 0.6 s and stopping for 0.4 s. Nothing is added while it is tired.
  for(const level of ['medium','hard']){
    const f=tired3(2,level);Object.assign(f,{phase:'fire',low:false,fires:1,t:REX_RULES.fire.seconds,
      cone:{x:0,z:0,heading:0,flameHeading:0,sweep:0,halfAngle:.3,range:29}});
    const aims=[];let second=null;
    for(let i=0;i<120*12 && f.phase!=='tell';i++){
      for(const e of stepRexFight(f,{...still,s:still.s+40},dt,course))if(e.type==='beamAim'){aims.push(e);if(e.second)second={...f.beam};}
    }
    assert.equal(aims.length,level==='hard'?2:1,level+' beams between the breaths');
    if(level==='hard')assert.deepEqual([second.aimSec,second.lockSec],[.6,.4]);
  }
  const resting=tired3(2,'medium');resting.due=['beam'];
  for(let i=0;i<120*5;i++)assert.ok(!stepRexFight(resting,still,dt,course).some(e=>['beamAim','bombTell','lift'].includes(e.type)),'nothing new while tired');
}
// The eye beam: a fight with one box out that has just got up, and a truck on the floor.
const truckOn=(s,lateral,extra={})=>({s,lateral,speedMph:0,input:{},headingError:0,airHeight:0,...extra});
function beamFight(level='easy'){
  const f=make3(level);Object.assign(f,{first:false,boxes:[true,false,false],phase:'walk',t:0,s:60,direction:1,due:['beam']});
  return f;
}
function runBeam(f,truck,move){
  const events=[];let fixed=null;
  for(let i=0;i<120*6 && (f.beam || !events.length);i++){
    const wasStopped=f.beam?.stopped;
    events.push(...stepRexFight(f,truck,dt,course));
    if(f.beam?.stopped && !wasStopped)fixed={heading:f.beam.heading,length:f.beam.length,x:f.beam.x,z:f.beam.z};
    if(f.beam?.stopped){
      assert.deepEqual({heading:f.beam.heading,length:f.beam.length,x:f.beam.x,z:f.beam.z},fixed,'the line never moves once stopped');
      move?.(f.beam);
    }
  }
  return events;
}
{
  // Across the line at 20 mph when it stops: clear. Standing on it: one scorch.
  for(const level of ['easy','medium','hard']){
    const stand=beamFight(level),truck=truckOn(70,4);
    const ev=runBeam(stand,truck);
    assert.ok(ev.some(e=>e.type==='beamLock') && ev.some(e=>e.type==='beam'));
    assert.equal(stand.hits,1,level+': a truck standing on the line is hit');
    assert.equal(stand.scorches.beam,1);
    const cross=beamFight(level),mover=truckOn(70,4,{speedMph:20});
    const evc=runBeam(cross,mover,beam=>{
      const at=truckPoint(course,mover),v=20*.44704*dt;
      const road=d._roadPosition({x:at.x+Math.cos(beam.heading)*v,z:at.z-Math.sin(beam.heading)*v},mover.s);
      mover.s=road.s;mover.lateral=road.lateral;
    });
    assert.ok(evc.some(e=>e.type==='beam'));
    assert.equal(cross.hits,0,level+': a truck crossing the line at 20 mph as it stops is clear');
  }
  // Far away does not help: 50 m off along the line is hit. More than 3 m up is missed, and it is a beamOver.
  const far=beamFight(),distant=truckOn(118,8);
  const head=modelPoint(rexAnchor(far,course),0,0,far.places.headAhead),at=truckPoint(course,distant);
  assert.ok(Math.hypot(at.x-head.x,at.z-head.z)>=50);
  runBeam(far,distant);assert.equal(far.hits,1,'a truck 50 m away on the line is hit');
  const jump=beamFight(),air=truckOn(70,4,{airHeight:3.5});
  const evj=runBeam(jump,air);
  assert.equal(jump.hits,0);assert.ok(evj.some(e=>e.type==='beamOver'),'the truck over the beam is called');
  // The first beam in a fight follows half as long again on Easy and Medium, not on Hard.
  for(const [level,first] of [['easy',2.7],['medium',2.1],['hard',1]]){
    const f=beamFight(level);stepRexFight(f,truckOn(70,4),dt,course);
    assert.ok(Math.abs(f.beam.aimSec-first)<1e-9,level);
    f.beam=null;f.phase='walk';f.due=['beam'];stepRexFight(f,truckOn(70,4),dt,course);
    assert.equal(f.beam.aimSec,REX_RULES.level[level].beamAimSec);
  }
}
// A bomb lying ticking on the floor.
function bombAt(f,point,extra={}){
  const y=course.groundAt(point.s,point.lateral).y,w=course.worldAt(point.s,point.lateral);
  f.bomb={phase:'lying',t:0,x:w.x,y,z:w.z,fuse:10,left:10,share:1,tick:0,canBite:false,onCable:false,from:w,...extra};
  return f.bomb;
}
{
  // It bursts when its time is up and scorches only a truck within 7 m.
  for(const [lateral,hit] of [[-6.5,true],[-7.5,false]]){
    const f=make3();Object.assign(f,{first:false,phase:'walk',t:0,s:200,direction:1});
    bombAt(f,{s:70,lateral:0});
    const truck=truckOn(70,lateral),events=[];
    for(let i=0;i<120*11 && f.bomb;i++)events.push(...stepRexFight(f,truck,dt,course));
    const burst=events.find(e=>e.type==='bombBurst');
    assert.ok(burst && events.filter(e=>e.type==='bombTick').length>5);
    assert.equal(burst.truck,hit);assert.equal(f.hits,hit?1:0,'a burst scorches only a truck within 7 m');
    const ticks=[];let clock=0;
    const g=make3();Object.assign(g,{first:false,phase:'walk',t:0,s:200,direction:1});bombAt(g,{s:70,lateral:0});
    for(let i=0;i<120*11 && g.bomb;i++){clock+=dt;if(stepRexFight(g,truckOn(70,-15),dt,course).some(e=>e.type==='bombTick'))ticks.push(clock);}
    assert.ok(Math.abs(clock-10)<.02,'the Easy bomb ticks for 10 seconds');
    assert.ok(ticks.at(-1)-ticks.at(-2)<(ticks[1]-ticks[0])/3,'the tick quickens');
  }
  // A bomb thrown onto the truck bursts at once, as it lands.
  const f=make3();Object.assign(f,{first:false,boxes:[true,true,false],phase:'walk',t:0,s:200,direction:1,due:['bomb']});
  const truck=truckOn(70,0),events=[];
  for(let i=0;i<120*8 && !events.some(e=>e.type==='bombBurst');i++)events.push(...stepRexFight(f,truck,dt,course));
  assert.ok(events.some(e=>e.type==='bombTell') && events.some(e=>e.type==='bombThrow'));
  const t0=events.findIndex(e=>e.type==='bombTell'),burst=events.find(e=>e.type==='bombBurst');
  assert.ok(t0>=0 && burst.landed && burst.truck && f.hits===1 && f.scorches.bomb===1);
  assert.equal(f.bomb,null);
}
{
  // The hook takes a bomb only with no open box in reach.
  const box=tired3(),truck=approach(box),from=truckPoint(course,truck);
  const ahead=modelPoint(from,0,0,8),road=d._roadPosition(ahead,truck.s);
  bombAt(box,road);
  truck.input.interact=true;
  const ev=[];for(let i=0;i<60;i++)ev.push(...stepRexFight(box,truck,dt,course));
  assert.equal(box.hook.phase,'attached');assert.ok(!box.bomb.onCable && !ev.some(e=>e.bomb));
  const walk=make3();Object.assign(walk,{first:false,phase:'walk',t:0,s:200,direction:1});
  const lone=truckOn(70,0,{headingError:0}),loneAt=truckPoint(course,lone);
  bombAt(walk,d._roadPosition(modelPoint(loneAt,0,0,10),70));
  stepRexFight(walk,lone,dt,course);
  assert.ok(walk.bomb.canBite);assert.equal(BOWL_GOALS.scrapasaurus(walk),'HOOK THE BOMB');
  lone.input.interact=true;const bite=[];
  for(let i=0;i<60;i++)bite.push(...stepRexFight(walk,lone,dt,course));
  assert.ok(bite.some(e=>e.type==='bite' && e.bomb));assert.ok(walk.bomb.onCable && walk.hook.phase==='dragging');
  assert.equal(BOWL_GOALS.scrapasaurus(walk),'DRAG IT INTO ITS LEGS');
  // It trails at the cable's end and F lets it go where it lies.
  lone.s=110;for(let i=0;i<3;i++)stepRexFight(walk,lone,dt,course);
  const pulled=truckPoint(course,lone);
  assert.ok(Math.abs(Math.hypot(walk.bomb.x-pulled.x,walk.bomb.z-pulled.z)-TOW_LENGTH)<1e-6);
  lone.input.interact=false;stepRexFight(walk,lone,dt,course);
  lone.input.interact=true;const kept={x:walk.bomb.x,z:walk.bomb.z};stepRexFight(walk,lone,dt,course);
  assert.equal(walk.hook.phase,'idle');assert.ok(!walk.bomb.onCable);
  assert.deepEqual({x:walk.bomb.x,z:walk.bomb.z},kept);
}
{
  // Sent back: a bomb on the cable within 6 m of a leg bursts there; it sags, the tired spell does not count,
  // the box that opens has a second of pull, and the truck at the cable's end is not scorched.
  for(const level of ['easy','hard']){
    const f=make3(level);Object.assign(f,{first:false,boxes:[true,true,false],phase:'walk',t:0,s:60,direction:1,rests:2});
    const shin=rexSolids(f,course).find(p=>p.id==='rex-shin1');
    const spot=modelPoint({...shin,heading:shin.heading},shin.halfX+3,0,0);
    const bomb=bombAt(f,d._roadPosition(spot,60),{onCable:true});
    const anchor=rexAnchor(f,course),out=Math.atan2(bomb.x-anchor.x,bomb.z-anchor.z);
    const truck={...d._roadPosition({x:bomb.x+Math.sin(out)*14,z:bomb.z+Math.cos(out)*14},60),speedMph:0,input:{},headingError:0};
    Object.assign(f.hook,{phase:'dragging',bomb:true,box:-1});
    const ev=stepRexFight(f,truck,dt,course);
    const burst=ev.find(e=>e.type==='bombBurst');
    assert.ok(burst?.beast && !burst.truck && ev.some(e=>e.type==='stagger'),level+' sent back');
    assert.equal(f.phase,'rest');assert.ok(f.low);assert.equal(f.rests,2,'the stagger is not counted');
    assert.equal(f.hook.pulls[2],1,'the box that opens has one second of pull');
    assert.equal(f.hits,0);assert.equal(f.hook.phase,'idle');assert.equal(f.bomb,null);
    f.t=REX_RULES.level[level].restSec;stepRexFight(f,truck,dt,course);
    assert.equal(f.rests,2);assert.equal(f.phase,'walk');
  }
  // A bomb on the cable that bursts away from the beast harms only a truck within 7 m, and is late.
  const f=make3();Object.assign(f,{first:false,boxes:[true,true,false],phase:'walk',t:0,s:200,direction:1});
  bombAt(f,{s:70,lateral:0},{onCable:true,left:dt/2});Object.assign(f.hook,{phase:'dragging',bomb:true,box:-1});
  const ev=stepRexFight(f,truckOn(70+TOW_LENGTH,0),dt,course),burst=ev.find(e=>e.type==='bombBurst');
  assert.ok(burst && burst.onCable && !burst.beast && !burst.truck && f.hits===0);
  assert.equal(rexLineFor(burst),'rex.why.bombLate');
}
{
  // Goal lines: five words or fewer, an open box's lines first, and none for a bomb's ring.
  const states=[];
  for(const phase of ['walk','rest','tell','fire','lift','throw','beam','hatch','lob','fallen','exit'])
    for(const hook of [{phase:'idle'},{phase:'attached',tight:true},{phase:'dragging'},{phase:'dragging',bomb:true}])
      for(const beam of [null,{phase:'aim'},{phase:'lock'}])
        for(const bomb of [null,{phase:'tell'},{phase:'lying',canBite:true},{phase:'lying',onCable:true}])
          states.push({phase,hook,beam,bomb,boxes:[true,false,false]});
  for(const state of states){
    const goal=BOWL_GOALS.scrapasaurus(state);
    // BOWL-REX-2's chest line, longer by one word, is unchanged and kept out as the older check above keeps it.
    if(state.phase!=='tell' && state.phase!=='fire')assert.ok(goal.split(' ').length<=5,goal);
    if(state.phase==='rest' && state.hook.phase==='idle')assert.equal(goal,'HOOK THE GLOWING BOX');
  }
  assert.equal(BOWL_GOALS.scrapasaurus({phase:'beam',beam:{phase:'aim'},hook:{phase:'idle'}}),'TURN ACROSS THE RED LINE');
  assert.equal(BOWL_GOALS.scrapasaurus({phase:'walk',hook:{phase:'idle'},bomb:{phase:'tell'},boxes:[true,true,false]}),'ONE BOX LEFT');
  for(const id of ['eyes','bombs','bombHooked','stagger','beamOver','why.beam','why.bombLand','why.bombNear','why.bombLate'])
    assert.ok(/^[A-Z].*[.!]$/.test(BIG_MO['rex.'+id]),id);
  assert.equal(rexLineFor({type:'scorch',cause:'beam'}),'rex.why.beam');
  assert.equal(rexLineFor({type:'bombBurst',landed:true,truck:true}),'rex.why.bombLand');
  assert.equal(rexLineFor({type:'bombBurst',truck:true}),'rex.why.bombNear');
  assert.equal(rexLineFor({type:'bite',bomb:true}),'rex.bombHooked');
  // Each new event's cue is named (bowl-rex.js, beside REX_3_EVENTS), and plays nothing until BOWL-SOUND records it.
  for(const type of REX_3_EVENTS)assert.ok(!Object.hasOwn(REX_CUES,type),type+' plays no stand-in');
}
{
  // The rings' tone: a darkening of the floor under it, 2 to 4 steps of 255 on each of red, green and blue,
  // over the Bowl's dirt and its darkest and lightest floor, in the dark and under twice the light.
  for(const [name,floor] of Object.entries(BOWL_FLOOR_TONES))for(const light of [.5,1,2]){
    const {floor:lit,ring}=bombRingOver(floor,light);
    for(let k=0;k<3;k++){const step=lit[k]-ring[k];assert.ok(step>=2 && step<=4,`${name} at ${light}: ${lit} against ${ring}`);}
  }
  let loads=0;const view=createRexView({loadModel:async()=>{loads++;return {scene:new THREE.Group(),animations:[]};}});
  const f=make3();Object.assign(f,{first:false,boxes:[true,true,false],phase:'hatch',t:0,s:60,direction:1});
  bombAt(f,{s:80,lateral:0},{phase:'tell'});
  const state={bowlNight:{night:5,event:{type:REX_EVENT,rex:f}}};
  const land=()=>view.group.getObjectByName('Scrapasaurus bomb landing ring'),lie=()=>view.group.getObjectByName('Scrapasaurus bomb ring');
  const tone=mesh=>JSON.stringify({c:mesh.material.color.toArray(),o:mesh.material.opacity,b:mesh.material.blending,e:mesh.material.blendEquation,
    s:mesh.material.blendSrc,dd:mesh.material.blendDst,id:mesh.material.uuid,vis:mesh.material.visible});
  const snap=JSON.stringify(f);let first=null;
  for(const [phase,time] of [['tell',0],['tell',.5],['air',.3],['air',.9],['lying',0],['lying',5],['lying',9.9],['cable',2]]){
    f.bomb.phase=phase==='cable'?'lying':phase;f.bomb.onCable=phase==='cable';f.bomb.t=time;f.bomb.share=1-time/10;
    if(phase==='cable')f.bomb.x+=3;
    view.update(course,state,1000+time*1000,true);
    const ring=f.bomb.phase==='lying' ? lie() : land();
    assert.ok(ring.visible && !(f.bomb.phase==='lying' ? land() : lie()).visible);
    assert.ok(Math.abs(ring.position.x-f.bomb.x)<1e-9 && Math.abs(ring.position.z-f.bomb.z)<1e-9,'the ring lies under the bomb');
    first??=tone(ring);assert.equal(tone(ring),first,'the ring keeps one tone from the tell to the burst');
    assert.equal(tone(land()),tone(lie()));
    assert.equal(ring.children.length,0,'no outline or rim');
    assert.equal(view.group.getObjectByName('Scrapasaurus bomb shadow').visible,f.bomb.phase==='air');
  }
  const m=lie().material;
  assert.ok(m.isMeshBasicMaterial && !('emissive' in m),'the ring gives off no light');
  assert.equal(m.blending,THREE.CustomBlending);assert.equal(m.blendEquation,THREE.ReverseSubtractEquation);
  assert.deepEqual([m.blendSrc,m.blendDst,m.opacity],[THREE.OneFactor,THREE.SrcAlphaFactor,BOMB_RING_TONE.keep]);
  assert.ok(BOMB_RING_TONE.take.every(v=>v>0 && v<.01),'it only takes a little away');
  assert.deepEqual([land().geometry.parameters.outerRadius,lie().geometry.parameters.outerRadius],[REX_RULES.thrown.hitRadius,REX_RULES.bomb.burstRadius]);
  assert.deepEqual([land().geometry.parameters.innerRadius,lie().geometry.parameters.innerRadius],[REX_RULES.thrown.hitRadius-.35,REX_RULES.bomb.burstRadius-.35]);
  // The line, the strip and the beam, read from the fight's state and nothing written back.
  f.bomb=null;f.phase='beam';
  f.beam={phase:'aim',t:0,x:0,y:0,z:0,heading:.3,length:80,aimSec:1.8,lockSec:.7,stopped:false};
  view.update(course,state,20000,true);
  assert.ok(view.group.getObjectByName('Scrapasaurus eye beam line').visible && !view.group.getObjectByName('Scrapasaurus eye beam strip').visible);
  f.beam.phase='lock';view.update(course,state,20100,true);
  const strip=view.group.getObjectByName('Scrapasaurus eye beam strip');
  assert.ok(strip.visible && strip.scale.x===REX_RULES.beam.width && strip.scale.z===80);
  f.beam.phase='burn';view.update(course,state,20200,true);
  assert.ok(view.group.getObjectByName('Scrapasaurus eye beam').visible);
  f.beam=null;f.bomb=null;f.phase='hatch';
  assert.notEqual(JSON.stringify(f),snap);
  const before=JSON.stringify(f);view.update(course,state,30000,true);assert.equal(JSON.stringify(f),before,'the view writes nothing');
  view.dispose();assert.equal(loads,1);
}
function drive(seed,useSpace=true,slowTween=false,rex3=false){
  const duel=start(seed,'easy',rex3),s=duel.state,night=s.bowlNight,f=night.event.rex;
  const rng=makeRng(seed),driver={useSpace,reaction:rng.range(.4,.75),lane:rng.range(9.7,10.4),pace:rng.range(16,19)};
  if(slowTween)Object.assign(driver,{slowTween:true,reaction:rng.range(.75,1.25),pace:rng.range(22,30),wobble:rng.range(.13,.23),wobblePhase:rng.range(0,6.28)});
  const trace=[], awards=[];
  let fall=null,ending=null,firstDrag=null,dragDistance=0, crowd=0, scoredAt=0, combined=0;
  const landings=[];
  duel.onChange((_,ev)=>{
    if (ev.bowlScore && ev.bowlScore.type !== 'crushChain') {
      const {type, points, crowd: nextCrowd} = ev.bowlScore;
      if (type === 'rexBox' || type === 'rexFall') {
        const base = type === 'rexBox' ? 300 : 500;
        assert.equal(points, Math.round(base * (1 + crowdAfter(crowd, s.stageTimeSec - scoredAt) / 100)));
        awards.push({type, points});
      }
      combined += points;
      crowd = nextCrowd;
      scoredAt = s.stageTimeSec;
    }
    if(ev.bowlRex?.type==='jerk')assert.notEqual(ev.bowlRex.box,1,'the back box has no run-up in either drive');
    // BOWL-REX-3: the child-pace driver never hooks a bomb, and is 8 m from one within 3 s of its landing.
    if(ev.bowlRex?.type==='bite')assert.ok(!ev.bowlRex.bomb,'the child-pace driver never hooks a bomb');
    if(ev.bowlRex?.type==='bombLand')landings.push({at:ev.bowlRex.at,clock:night.clock,far:false});
    if(ev.bowlRex){trace.push(ev.bowlRex.type);if(ev.bowlRex.type==='fall')fall=night.clock;}
    if(ev.bowlEventResult)ending=night.clock;
  });
  for(let i=0;i<120*400 && s.status!=='bowl_break';i++){
    childDrive(duel,driver);
    for(const landing of landings)if(!landing.far && night.clock-landing.clock<=3){
      const at=truckPoint(duel.course,s);landing.far=Math.hypot(at.x-landing.at.x,at.z-landing.at.z)>=8 || !f.bomb;
    }
    if(f.hook.phase==='attached'){assert.equal(s.input.steer,0);assert.ok(!s.input.boost || (useSpace && f.hook.box===1 && f.braced));}
    if(f.phase==='fallen'){
      assert.equal(f.hook.phase,'dragging');
      const drag=f.hook.drag;assert.ok(drag);
      firstDrag??={...drag};
      dragDistance=Math.max(dragDistance,Math.hypot(drag.x-firstDrag.x,drag.z-firstDrag.z));
    }
    duel.step(dt);
  }
  assert.ok(night.lastResult,'fight ended, seed '+seed);
  assert.equal(night.lastResult.score, combined, 'the result reports the points awarded during the fight');
  if (awards.length) {
    const boxes = awards.filter(row => row.type === 'rexBox').reduce((sum, row) => sum + row.points, 0);
    const fallPoints = awards.find(row => row.type === 'rexFall')?.points ?? 0;
    assert.deepEqual(night.lastResult.rexPoints, {boxes, fall:fallPoints});
    if (fallPoints) {
      const line = BOWL_RESULTS.eventRexPoints(night.lastResult.rexPoints);
      assert.ok(line.includes(boxes.toLocaleString()) && line.includes(fallPoints.toLocaleString()));
    }
  }
  if(night.lastResult.won){
    assert.equal(awards.filter(row => row.type === 'rexBox').length, 3);
    assert.equal(awards.filter(row => row.type === 'rexFall').length, 1);
    assert.equal(trace.filter(x=>x==='boxOut').length,3);
    assert.equal(trace.filter(x=>x==='fall').length,1);
    assert.ok(Math.abs(ending-fall-10)<dt*.01,'result exactly ten seconds after the third extraction');
    assert.equal(night.event.resultHoldSince,fall);
    assert.ok(dragDistance>1,'the final box moves behind the truck during the fall');
    assert.ok(bowlHudView(s,duel.course).goal.split(' ').length<=5);
  }
  assert.ok(landings.every(landing=>landing.far),'8 m from each bomb within 3 s of its landing, seed '+seed);
  return {won:night.lastResult.won,backBox:f.boxes[1],trace,scorches:{...f.scorches}};
}
const byCause=runs=>Object.entries(runs.reduce((sum,run)=>{for(const [k,v] of Object.entries(run.scorches))sum[k]=(sum[k]||0)+v;return sum;},{}))
  .map(([k,v])=>k+' '+v).join(', ');
// With bowl-rex-3 off the released fight is unchanged, event for event: Big Mo's lines, every Scrapasaurus event and
// its cue, the result and the final truck, boxes, pulls and scorches of five whole fights by the child-pace driver.
// The digest was recorded from integration/wasteland at 6f5c75f, before BOWL-REX-3.
{
  const {createHash}=await import('node:crypto'),digest=createHash('sha256');
  for(const [seed,level] of [[101,'easy'],[104,'easy'],[107,'easy'],[101,'medium'],[102,'hard']]){
    const duel=start(seed,level),s=duel.state,night=s.bowlNight,f=night.event.rex,rng=makeRng(seed);
    const driver={useSpace:true,reaction:rng.range(.4,.75),lane:rng.range(9.7,10.4),pace:rng.range(16,19)};
    const trace=[];
    duel.onChange((_,ev)=>{if(ev.bowlRex)trace.push(ev.bowlRex.type+':'+(ev.bowlRex.cue??''));if(ev.bowlCaption)trace.push('mo:'+ev.bowlCaption.id);});
    for(let i=0;i<120*400&&s.status!=='bowl_break';i++){childDrive(duel,driver);duel.step(dt);}
    digest.update(JSON.stringify({trace,result:night.lastResult,s:s.s.toFixed(6),lat:s.lateral.toFixed(6),hits:f.hits,rests:f.rests,
      boxes:f.boxes,pulls:f.hook.pulls.map(p=>p.toFixed(6))}));
  }
  assert.equal(digest.digest('hex'),'ff8709563353fbbabd00c43c120070f867ec69d4828122bc8072f3414d686c22','bowl-rex-3 off: the released fight');
}
if(!process.argv.includes('--rules-only')){
  const runs=Array.from({length:10},(_,i)=>drive(101+i));
  assert.deepEqual(drive(101),runs[0]);
  const wins=runs.filter(run=>run.won).length;
  console.log('Easy tow wins using Space on the brace:',wins,'of 10; scorches by cause:',byCause(runs));
  assert.ok(wins>=6,'driver using Space wins at least six of ten');
  const plain=Array.from({length:10},(_,i)=>drive(101+i,false));
  const backBoxes = plain.filter(run => run.backBox).length;
  console.log('Throttle-only back boxes:', backBoxes, 'of 10; fights won:', plain.filter(run => run.won).length, '; scorches by cause:', byCause(plain));
  assert.ok(backBoxes >= 6, 'the same Easy driver can pull the braced back box with throttle alone');
  const tween=Array.from({length:10},(_,i)=>drive(101+i,true,true));
  console.log('Late-reaction 22-30 mph driver wins:',tween.filter(run=>run.won).length,'of 10');
  // BOWL-REX-3 on: the same child-pace driver over thirty seeds, crossing the line, keeping 8 m from bombs.
  const on=Array.from({length:30},(_,i)=>drive(101+i,true,false,true));
  const onWins=on.filter(run=>run.won).length;
  console.log('With bowl-rex-3, Easy wins using Space:',onWins,'of 30; scorches by cause:',byCause(on));
  assert.ok(on.every(run=>run.trace.includes('beamAim') && run.trace.includes('bombTell')),'every fight meets a beam and a bomb');
  assert.ok(onWins>=18,'the child-pace driver still wins at least six in ten with the beam and bombs');
}
console.log('Scrapasaurus tow rules, continuous wall contacts, yard and read-only view passed.');

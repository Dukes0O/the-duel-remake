import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {App} from '../src/app.js';
import {useRacingLine} from './track-script-drive.mjs';
import {Duel} from '../src/game.js';
import {COURSE, DRIVE} from '../src/config.js';
import {PIT, pitAt, pitBox, pitView, stepPitService,choosePit,pitEstimate,pitTransitTarget} from '../src/pit-lane.js';
import {initializeField} from '../src/race-field.js';
import {stepFieldRacer,runtimeOf} from '../src/race-field-driver.js';
import {addTrackScriptScene} from '../src/track-script-scene.js';
const def = {id:'pit-test', name:'Pit test', stage:97, theme:'alpine', closed:false,
  laps:1, noTraffic:true, hasRadar:false, hasRival:false, airborne:true,
  speedLimitMph:100, sections:[{theme:'alpine',name:'Test',share:1}],
  pitLane:{straight:'Service Straight',side:'right'},
  script:[['straight',500,{name:'Service Straight'}],['turn','L',90,80,{surface:'snow'}],['straight',800]]};
const dt=1/120;
function race(){COURSE.push(def);const duel=new Duel({seed:1989});
  duel.startCampaign({startStage:COURSE.length-1,car:'falcone_f42',opponentCount:0,tyre:'summer'});
  Object.assign(duel.state,{status:'racing',countdown:0,traffic:[]});
  return {duel,done:()=>COURSE.pop()};}

test('pit road has matched asphalt/support, nine metres and a real separating wall',()=>{
  const course=new Course(def,1989),lane=course.pitLane;
  assert.equal(lane.width,9);assert.equal(PIT.limitMph,60/1.609344);
  for(const s of [lane.entry+80,lane.box,lane.exit-80]){
    const off=lane.offsetAt(s);assert.equal(pitAt(course,s,off),lane);
    assert.equal(course.surfaceAt(s,off).pitLane,true);
    assert.equal(course.gripKindAt(s,off),'asphalt');
    assert.ok(Math.abs(course.groundAt(s,off).y-course.worldAt(s,off).y)<1e-10);
  }
  assert.ok(course.features.walls.some(w=>w.pitWall));
  const group=new THREE.Group();addTrackScriptScene(group,course);
  assert.ok(group.getObjectByName('pit-lane-road'));
  assert.ok(group.getObjectByName('pit-player-box'));
  assert.ok(group.getObjectByName('pit-crew'));
  assert.equal(pitAt(course,lane.box,0),null);
});

test('native driving limits the player to 60 km/h and spends four seconds in the box',()=>{
  const {duel,done}=race();try{
    const s=duel.state,lane=duel.course.pitLane,events=[];duel.onChange((_state,e)=>events.push(e));
    Object.assign(s,{s:lane.entry+80,lateral:lane.offsetAt(lane.entry+80),speedMph:100,boost:.5});
    duel.setInput({throttle:1,boost:true});duel.step(dt);
    assert.ok(s.speedMph<=PIT.limitMph);assert.equal(s.boosting,false);assert.equal(s.boost,.5);
    assert.ok(events.some(e=>e.pitCue==='pit.limiter'));
    Object.assign(s,{s:lane.box,lateral:lane.offsetAt(lane.box),speedMph:0,boost:.1});
    duel.setInput({throttle:1,boost:true});
    for(let i=0;i<479;i++)duel.step(dt);
    assert.equal(s.tyre,undefined);assert.equal(s.speedMph,0);
    assert.ok(pitView(duel).text.startsWith('FITTING WINTER'));
    duel.step(dt);assert.equal(s.tyre,'winter');assert.equal(s.boost,1);
    assert.equal(pitView(duel).text,'GO');
    assert.equal(events.filter(e=>e.pitCue==='pit.go').length,1);
    for(let i=0;i<480;i++)stepPitService(duel,s,dt);
    assert.equal(s.tyre,'winter');assert.equal(events.filter(e=>e.pitCue==='pit.go').length,1);
  }finally{done();}
});

test('a fast box crossing cannot start service, and opting out preserves course surfaces',()=>{
  const {duel,done}=race();try{
    const s=duel.state,lane=duel.course.pitLane;
    Object.assign(s,{s:lane.box,lateral:lane.offsetAt(lane.box),speedMph:5/1.609344});
    stepPitService(duel,s,dt);assert.notEqual(s.pit?.phase,'servicing');
    const plain=new Course({...def,pitLane:undefined},1989);
    assert.equal(plain.pitLane,undefined);assert.equal(pitAt(plain,lane.box,lane.offsetAt(lane.box)),null);
    assert.equal(plain.surfaceAt(lane.box,lane.offsetAt(lane.box)).road,false);
  }finally{done();}
});

test('computer racer drives into the actual lane, services once and rejoins',()=>{
  const {duel,done}=race();try{
    Object.assign(duel.state,{opponentCount:1,cpuDifficulty:'easy',stageTimeSec:10,fieldSeed:4242});
    initializeField(duel);duel.state.status='racing';duel.state.stageTimeSec=10;
    const r=duel.state.opponents[0],lane=duel.course.pitLane;
    Object.assign(r,{s:lane.entry-10,lateral:0,speedMph:60});
    const trace=[];
    for(let i=0;i<120*80;i++){
      stepFieldRacer(duel,r,dt);duel.state.stageTimeSec+=dt;
      if(i%30===0)trace.push([r.s,r.lateral,r.speedMph,r.pit?.phase]);
      if(r.s>lane.exit+5)break;
    }
    assert.ok(trace.some(p=>p[3]==='servicing'),JSON.stringify(trace));
    assert.equal(r.tyre,'winter');assert.equal(r.boost,1);
    assert.ok(r.s>lane.exit,JSON.stringify(trace));assert.ok(Math.abs(r.lateral)<duel.course.roadHalfWidthAt(r.s));
    assert.equal(r.field.recoveries,0);
  }finally{done();}
});

test('seeded strategies use the benefit estimate and Nia stays out in some easy races',()=>{
  const {duel,done}=race();try{
    Object.assign(duel.state,{opponentCount:1,cpuDifficulty:'easy',stageTimeSec:10,fieldSeed:4242});
    initializeField(duel);const r=duel.state.opponents[0],run=runtimeOf(duel,r);
    assert.equal(pitEstimate(duel,r,run).suits,true);
    assert.equal(choosePit(duel,r,run).stop,true);
    assert.deepEqual(choosePit(duel,r,run),choosePit(duel,r,run));
    r.racerId='nia_frost';let stays=0;
    for(let seed=0;seed<500;seed++){duel.state.fieldSeed=seed;if(!choosePit(duel,r,run).stop)stays++;}
    assert.ok(stays>150&&stays<250,`Nia stays ${stays}/500`);
    duel.state.cpuDifficulty='hard';
    const estimate=pitEstimate(duel,r,run);assert.equal(choosePit(duel,r,run).stop,estimate.saved>0);
  }finally{done();}
});

test('service holds the stopped pose even if contact pushes it between ticks',()=>{
  const {duel,done}=race();try{
    const s=duel.state,lane=duel.course.pitLane;
    Object.assign(s,{s:lane.box,lateral:lane.offsetAt(lane.box),speedMph:0,headingError:.1});
    stepPitService(duel,s,dt);
    Object.assign(s,{s:lane.box+20,lateral:0,speedMph:10,headingError:1,pushVelocity:5});
    assert.equal(stepPitService(duel,s,dt),true);
    assert.equal(s.s,lane.box);assert.equal(s.lateral,lane.offsetAt(lane.box));
    assert.equal(s.headingError,.1);assert.equal(s.speedMph,0);assert.equal(s.pushVelocity,0);
    const group=new THREE.Group();addTrackScriptScene(group,duel.course);
    const before=JSON.stringify(s);group.userData.updatePitCrew(s);
    assert.equal(JSON.stringify(s),before,'crew/board renderer changes no race state');
  }finally{done();}
});

test('all seven computer boxes leave the marked player box free',()=>{
  const lane={box:250};
  const boxes=[pitBox(lane,{}),...Array.from({length:7},(_,index)=>pitBox(lane,{field:{index}}))];
  assert.equal(new Set(boxes).size,8);
  assert.deepEqual(boxes,[250,226,234,242,258,266,274,282]);
});


test('Grand Prix player uses the centre box despite its race-wide field object',()=>{
  const duel=new Duel({seed:1989,featureFlags:{enabled:name=>name==='grand-prix'}});
  duel.startCampaign({startStage:0,mode:'grandprix',seed:1989,fieldSeed:4242,
    car:'falcone_f42',cpuDifficulty:'easy',difficulty:'casual'});
  assert.equal(duel.state.field.size,8);
  assert.equal(duel.state.opponents.length,7);
  duel.course=new Course(def,1989);
  const state=duel.state,lane=duel.course.pitLane;
  assert.equal(pitBox(lane,state),lane.box);
  const boxes=[state,...state.opponents].map(actor=>pitBox(lane,actor));
  assert.equal(new Set(boxes).size,8);
  assert.deepEqual(boxes,[250,226,234,242,258,266,274,282]);
  Object.assign(state,{status:'racing',s:lane.box,lateral:lane.offsetAt(lane.box),
    speedMph:0,boost:.1,paused:false});
  for(let index=0;index<479;index++)stepPitService(duel,state,dt);
  assert.equal(state.pit.phase,'servicing');
  assert.equal(state.tyre,undefined);
  assert.equal(state.speedMph,0);
  stepPitService(duel,state,dt);
  assert.equal(state.pit.phase,'ready');
  assert.equal(state.tyre,'winter');
  assert.equal(state.boost,1);
});


test('unplanned pit target is read-only and leaves chosen stops and the road unchanged', () => {
  const course = new Course(def, 1989), lane = course.pitLane;
  const actor = {s: lane.entry + 80, lateral: lane.offsetAt(lane.entry + 80),
    field: {pitChoice: {stop: false}}, speedMph: PIT.limitMph};
  const before = JSON.stringify(actor), look = actor.s + 12;
  assert.deepEqual(pitTransitTarget(course, actor, look),
    {lateral: lane.offsetAt(look), speedMph: PIT.limitMph});
  assert.equal(JSON.stringify(actor), before);
  assert.equal(pitTransitTarget(course, {...actor, lateral: 0}, look), null);
  assert.equal(pitTransitTarget(course, {...actor, field: {pitChoice: {stop: true}}}, look), null);
  assert.equal(pitTransitTarget(course, {...actor, pit: {phase: 'servicing'}}, look), null);
});

for (const native of [false, true]) test((native ? 'native circuit' : 'demo') +
  ' automatic player drives an unchosen pit lane to exit within its limiter-length time', () => {
  const {duel, done} = race();
  try {
    const lane = duel.course.pitLane, state = duel.state;
    const start = lane.entry + PIT.taper + 5;
    const app = Object.create(App.prototype);
    app.duel = duel; app._scriptedCrashDone = true;
    if (native) useRacingLine(app, .95);
    Object.assign(state, {s: start, prevS: start, lateral: lane.offsetAt(start),
      prevLateral: lane.offsetAt(start), speedMph: PIT.limitMph, headingError: 0});
    const tyre = state.tyre, budget = (lane.exit - lane.entry) / (PIT.limitMph * DRIVE.mphToWorld);
    let elapsed = 0, serviced = false;
    while (state.s <= lane.exit && elapsed < budget) {
      app._driveAutopilot(dt); duel.step(dt); elapsed += dt;
      serviced ||= state.pit?.phase === 'servicing';
      if (pitAt(duel.course, state.s, state.lateral))
        assert.ok(state.speedMph <= PIT.limitMph, 'actual pit limiter remains active');
    }
    assert.ok(state.s > lane.exit, `${state.s} at ${elapsed} s, limit ${budget} s`);
    assert.ok(Math.abs(state.lateral) <= duel.course.roadHalfWidthAt(state.s));
    assert.equal(serviced, false); assert.equal(state.tyre, tyre);
  } finally {done();}
});

for (const [finished, staleStop] of [[false, false], [true, false], [true, true]])
  test((finished ? 'finished' : 'racing') + (staleStop ? ' with a previous stop choice' : '') +
  ' computer car already in the pit lane follows it through at the limiter', () => {
  const {duel, done} = race();
  try {
    Object.assign(duel.state, {opponentCount: 1, cpuDifficulty: 'easy', fieldSeed: 4242});
    initializeField(duel); duel.state.status = 'racing'; duel.state.stageTimeSec = 0;
    const r = duel.state.opponents[0], lane = duel.course.pitLane;
    const start = lane.entry + PIT.taper + 5;
    Object.assign(r, {s: start, lateral: lane.offsetAt(start), speedMph: PIT.limitMph,
      headingError: 0, finished});
    r.field.pitChoice = {stop: staleStop}; r.field.reaction = 0;
    const tyre = r.tyre, budget = (lane.exit - lane.entry) / (PIT.limitMph * DRIVE.mphToWorld);
    let elapsed = 0;
    while (r.s <= lane.exit && elapsed < budget) {
      stepFieldRacer(duel, r, dt); duel.state.stageTimeSec += dt; elapsed += dt;
      assert.notEqual(r.pit?.phase, 'servicing');
      if (pitAt(duel.course, r.s, r.lateral)) assert.ok(r.speedMph <= PIT.limitMph);
    }
    assert.ok(r.s > lane.exit, `${r.s} at ${elapsed} s, limit ${budget} s`);
    assert.ok(Math.abs(r.lateral) <= duel.course.roadHalfWidthAt(r.s));
    assert.equal(r.tyre, tyre); assert.equal(r.field.pitServiced, undefined);
    assert.equal(r.field.recoveries, 0);
    assert.equal(r.field.pitChoice.stop, staleStop, 'transit does not rewrite the previous stop choice');
  } finally {done();}
});

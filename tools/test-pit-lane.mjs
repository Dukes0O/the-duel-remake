import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {PIT, pitAt, pitView, stepPitService,choosePit,pitEstimate} from '../src/pit-lane.js';
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

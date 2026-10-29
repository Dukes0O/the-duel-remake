import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {App} from '../src/app.js';
import {useRacingLine} from './track-script-drive.mjs';
import {Duel} from '../src/game.js';
import {COURSE, DRIVE, CARS} from '../src/config.js';
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


test('opt-in bay limits only its centred 180 metres and leaves legacy lane arithmetic exact',()=>{
  const legacy=new Course(def,1989),course=new Course({...def,pitLane:{...def.pitLane,limiterLength:180,limitKph:80}},1989);
  const lane=course.pitLane;
  assert.equal(lane.limiterStart,lane.box-90);assert.equal(lane.limiterEnd,lane.box+90);
  assert.equal(lane.limitMph,80/1.609344);
  assert.deepEqual(course.samples,legacy.samples,'bay metadata cannot change the lane road');
  for(const key of ['entry','exit','box','width','side'])assert.equal(lane[key],legacy.pitLane[key]);
  const events=[],actor={s:lane.entry+80,lateral:lane.offsetAt(lane.entry+80),speedMph:100,boosting:true};
  const duel={course,state:actor,emit:event=>events.push(event)};
  stepPitService(duel,actor,dt);
  assert.equal(actor.speedMph,100,'outside the bay the lane is driven normally');
  assert.equal(events.length,0,'no limiter tone before the real bay');
  assert.equal(pitTransitTarget(course,actor).speedMph,null,'existing controllers fall back to their normal profile outside the bay');
  actor.s=lane.limiterStart;actor.lateral=lane.offsetAt(actor.s);
  stepPitService(duel,actor,dt);
  assert.equal(actor.speedMph,lane.limitMph);assert.equal(actor.boosting,false);
  assert.equal(events.filter(event=>event.pitCue==='pit.limiter').length,1);
  actor.status='racing';assert.ok(pitView(duel).text.startsWith('80 KM/H'));
  const run={spec:CARS.falcone_f42,profile:{at:()=>100}},r={tyre:'summer',completedLaps:0};
  const oldEstimate=pitEstimate({course:legacy,state:{lapsTotal:1}},r,run);
  const newEstimate=pitEstimate({course,state:{lapsTotal:1}},r,run);
  const normal=100*DRIVE.mphToWorld;
  const oldTransit=(legacy.pitLane.exit-legacy.pitLane.entry)*(1/(PIT.limitMph*DRIVE.mphToWorld)-1/normal);
  const newTransit=180*(1/(lane.limitMph*DRIVE.mphToWorld)-1/normal);
  assert.ok(Math.abs((newEstimate.saved-oldEstimate.saved)-(oldTransit-newTransit))<1e-10,'CPU estimate uses only the real limited span/speed');
  assert.equal(newEstimate.suits,oldEstimate.suits);
  const oldActor={s:legacy.pitLane.entry+80,lateral:legacy.pitLane.offsetAt(legacy.pitLane.entry+80),speedMph:100};
  stepPitService({course:legacy,state:oldActor,emit:()=>{}},oldActor,dt);
  assert.equal(oldActor.speedMph,PIT.limitMph);
  assert.deepEqual(pitTransitTarget(legacy,oldActor),{lateral:legacy.pitLane.offsetAt(oldActor.s),speedMph:PIT.limitMph});
});

test('opt-in bay still requires the real box and exactly four seconds of service',()=>{
  const course=new Course({...def,pitLane:{...def.pitLane,limiterLength:180,limitKph:80}},1989),lane=course.pitLane;
  const actor={s:lane.box,lateral:lane.offsetAt(lane.box),speedMph:0,boost:.1};
  const events=[],duel={course,state:actor,emit:event=>events.push(event)};
  for(let tick=0;tick<479;tick++)stepPitService(duel,actor,dt);
  assert.equal(actor.pit.phase,'servicing');assert.equal(actor.tyre,undefined);
  stepPitService(duel,actor,dt);
  assert.equal(actor.pit.phase,'ready');assert.equal(actor.tyre,'winter');assert.equal(actor.boost,1);
  assert.equal(events.filter(event=>event.pitCue==='pit.go').length,1);
});


for(const native of [false,true])test('opt-in bay '+(native?'native line':'demo')+' controller uses its normal target before the limiter',()=>{
  const bayDef={...def,pitLane:{...def.pitLane,limiterLength:180,limitKph:80}};
  COURSE.push(bayDef);
  try{
    const duel=new Duel({seed:1989});duel.startCampaign({startStage:COURSE.length-1,car:'falcone_f42',opponentCount:0});
    const actor=duel.state,lane=duel.course.pitLane,app=Object.create(App.prototype);
    app.duel=duel;app._scriptedCrashDone=true;if(native)useRacingLine(app,.95);
    Object.assign(actor,{status:'racing',countdown:0,s:lane.entry+80,lateral:lane.offsetAt(lane.entry+80),speedMph:70,impactTimer:0});
    app._driveAutopilot(dt);
    assert.equal(actor.input.throttle,1,'null transit speed preserves the original normal speed target');
    assert.equal(actor.input.brake,0);
    actor.s=lane.limiterStart;actor.lateral=lane.offsetAt(actor.s);
    app._driveAutopilot(dt);
    assert.equal(actor.input.throttle,0);assert.ok(actor.input.brake>0,'actual bay speed is requested');
  }finally{COURSE.pop();}
});

test('opt-in bay computer stop branch retains normal profile outside the limiter',()=>{
  const bayDef={...def,pitLane:{...def.pitLane,limiterLength:180,limitKph:80}};
  COURSE.push(bayDef);
  try{
    const duel=new Duel({seed:1989});duel.startCampaign({startStage:COURSE.length-1,car:'falcone_f42',opponentCount:0});
    Object.assign(duel.state,{opponentCount:1,cpuDifficulty:'easy',fieldSeed:4242});initializeField(duel);
    duel.state.status='racing';duel.state.stageTimeSec=10;
    const actor=duel.state.opponents[0],lane=duel.course.pitLane;
    Object.assign(actor,{s:lane.entry+80,lateral:lane.offsetAt(lane.entry+80),speedMph:70});
    actor.field.reaction=0;actor.field.pitChoice={stop:true};actor.field.pitServiced=true;
    stepFieldRacer(duel,actor,dt);
    assert.ok(actor.speedMph>PIT.limitMph,'outside-bay stop departure is not held to legacy 60 km/h');
    assert.ok(actor.s>lane.entry+80,'legal CPU driving advances');
    assert.equal(actor.pit?.phase,'lane','no forced service or finish');
  }finally{COURSE.pop();}
});


test('shared pit pavement query includes the apron overlap without changing limiter semantics',async()=>{
 const {pitRoadAt}=await import('../src/pit-lane.js');assert.equal(typeof pitRoadAt,'function');
 const {ALL_CIRCUITS}=await import('../src/circuits/index.js');
 for(const id of ['ardennes-forest','panorama-ridge']){
  const course=new Course(ALL_CIRCUITS.find(row=>row.id===id),1989),lane=course.pitLane;
  for(const s of [lane.entry-.001,lane.entry,lane.entry+15,lane.box,lane.exit-15,lane.exit,lane.exit+.001])
   for(const delta of [-4.501,-4.5,-2,0,2,4.5,4.501]){
    const off=lane.offsetAt(s)+delta,phase=course.phase(s),paved=phase>=lane.entry&&phase<=lane.exit&&Math.abs(off-lane.offsetAt(phase))<=4.5;
    assert.equal(!!pitRoadAt(course,s,off),paved,'exact existing pavement boundary');
    assert.equal(!!pitAt(course,s,off),paved&&Math.abs(off)>course.roadHalfWidthAt(phase),'original main-road limiter exclusion stays exact');
   }
  const s=lane.exit-15,off=lane.offsetAt(s);
  assert.ok(Math.abs(off)<course.roadHalfWidthAt(s));assert.equal(pitRoadAt(course,s,off),lane);assert.equal(pitAt(course,s,off),null);
 }
 const course=new Course(COURSE[0],1989);assert.equal(pitRoadAt(course,0,0),null);
});


test('damp pit drawing shares the actual paved material with exact geometry and legacy controls',async()=>{
  const {ALL_CIRCUITS}=await import('../src/circuits/index.js');
  const {createPavedRoadMaterial}=await import('../src/road-surface.js');
  const {disposeTree}=await import('../src/world.js');
  assert.deepEqual(ALL_CIRCUITS.filter(row=>row.dampRoad!==undefined).map(row=>row.id),['ardennes-forest','eifel-crown']);
  const load=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.image={src:url};return texture;};
  try{for(const id of ['ardennes-forest','panorama-ridge','tremblant-snow','summit-run']){
    const course=new Course(ALL_CIRCUITS.find(row=>row.id===id),1989),before=JSON.stringify(course.features);
    const control=new THREE.Group(),drawn=new THREE.Group();
    addTrackScriptScene(control,course);
    const texture=new THREE.Texture();
    const roadMaterial=createPavedRoadMaterial({asphalt:texture,night:course.def.theme==='city',wet:!!course.def.wetRoad,
      ...(course.def.dampRoad!==undefined?{dampRoad:course.def.dampRoad,courseLength:course.length,mistBanks:course.def.effects?.valleyMist}:{})});
    addTrackScriptScene(drawn,course,{snow:false,...(course.def.dampRoad!==undefined?{roadMaterial}:{})});
    try{
      const old=control.getObjectByName('pit-lane-road'),road=drawn.getObjectByName('pit-lane-road');
      assert.ok(old&&road);assert.equal(road.receiveShadow,old.receiveShadow);
      for(const key of ['position','normal','uv'])assert.deepEqual(road.geometry.attributes[key].array,old.geometry.attributes[key].array,'pit '+key+' unchanged');
      assert.deepEqual(road.geometry.index.array,old.geometry.index.array);
      const paints=group=>{const rows=[];group.traverse(node=>{if(node.name==='pit-entry-line'||node.name==='pit-exit-line'||node.name==='pit-player-box')rows.push([node.name,node.material.color.getHex(),node.material.roughness,Array.from(node.geometry.attributes.position.array)]);});return rows;};
      assert.deepEqual(paints(drawn),paints(control),'every painted line and box stays exact');
      assert.equal(JSON.stringify(course.features),before,'drawing cannot alter race features');
      if(course.def.dampRoad!==undefined){
        assert.equal(road.material,roadMaterial,'the pit must share the real main-road texture, tone and damp shader');
        assert.equal(road.material.map,texture);assert.equal(road.material.bumpMap,texture);
        assert.equal(road.material.color.getHex(),course.def.dampRoad.colour);
      }else{
        assert.notEqual(road.material,roadMaterial);assert.equal(road.material.color.getHex(),0x41454a);
        assert.equal(road.material.roughness,.95);assert.equal(road.material.metalness,0);
        assert.equal(road.material.map,null);assert.equal(road.material.bumpMap,null);
      }
    }finally{disposeTree(control);disposeTree(drawn);roadMaterial.dispose();texture.dispose();}
  }}finally{THREE.TextureLoader.prototype.load=load;}
});

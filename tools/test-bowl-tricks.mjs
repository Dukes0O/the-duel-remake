import assert from 'node:assert/strict';
import test from 'node:test';
import {createProfile,settleRace} from '../src/progression.js';
import {COURSE} from '../src/config.js';
import {makeRng} from '../src/rng.js';
import {Duel} from '../src/game.js';
import {stepBowlTricks} from '../src/bowl/bowl-tricks.js';

const DT = 1 / 120;

function actor(overrides = {}) {
  return {airborne: true, airHeight: 8, speedMph: 72,
    input: {throttle: 0, brake: 0}, ...overrides};
}

// A key pressed in the air tips the nose; the first step airborne is the take-off.
function pressInAir(duel, state, input) {
  const pressed = {...state.input};
  state.input = {throttle: 0, brake: 0};
  stepBowlTricks(duel, state, DT);
  state.input = pressed;
  Object.assign(state.input, input);
}

test('W/S pitch only the Bowl truck and do not change flight velocity', () => {
  const state = actor({input: {throttle: 1, brake: 0}});
  const bowl = {course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: name => name === 'titan-bowl'}, state};
  pressInAir(bowl, state, {throttle: 1});
  stepBowlTricks(bowl, state, DT);
  assert.ok(state.bowlPose.pitch < 0, 'W pitches the nose down');
  assert.equal(state.speedMph, 72, 'air control does not change velocity');

  const reversePitch = actor({input: {throttle: 0, brake: 1}});
  pressInAir({...bowl, state: reversePitch}, reversePitch, {brake: 1});
  stepBowlTricks({...bowl, state: reversePitch}, reversePitch, DT);
  assert.ok(reversePitch.bowlPose.pitch > 0, 'S pitches the nose up');

  const ordinary = actor({input: {throttle: 1, brake: 0}});
  stepBowlTricks({course: {def: {}}, featureFlags: {enabled: () => true}, state: ordinary}, ordinary, DT);
  assert.equal(Object.hasOwn(ordinary, 'bowlPose'), false, 'other courses do not start Bowl air state');

  const disabled = actor({input: {throttle: 1, brake: 0}});
  stepBowlTricks({course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: () => false}, state: disabled}, disabled, DT);
  assert.equal(Object.hasOwn(disabled, 'bowlPose'), false, 'the dev switch gates air control');
});

test('a key held from before take-off tips nothing until it is pressed again', () => {
  const state = actor({airborne: false, input: {throttle: 1, brake: 0}});
  const bowl = {course: {def: {bowl: true, tricks: true}}, featureFlags: {enabled: name => name === 'titan-bowl'}, state};
  stepBowlTricks(bowl, state, DT);
  state.airborne = true;
  for (let i = 0; i < 60; i++) stepBowlTricks(bowl, state, DT);
  assert.equal(state.bowlPose.pitch, 0, 'the throttle held over the lip leaves the nose level');
  state.input.throttle = 0; stepBowlTricks(bowl, state, DT);
  state.input.throttle = 1; stepBowlTricks(bowl, state, DT);
  assert.ok(state.bowlPose.pitch < 0, 'pressed again in the air, W tips the nose down');
  state.airborne = false; stepBowlTricks(bowl, state, DT);
  assert.ok(!state.tumble, 'a small tip lands on the wheels');
});

function carLaunch(enabled, slam = false) {
  const practice = COURSE.findIndex(course => course.practice);
  const duel = new Duel({seed: 1989});
  duel.startCampaign({car: 'titan_monster', startStage: practice, difficulty: 'casual', mode: 'timetrial'});
  const point = (s, lateral = 0) => ({x: lateral, y: 0, z: s, heading: 0, curvature: 0});
  duel.course = {def: {id: 'bowl-air-launch', practice: true, bowl: true, tricks: true, kind: 'arena', theme: 'desert'},
    closed: false, length: 10000, raceLength: 20000,
    features: {obstacles: [], mountains: [], ramps: [], crushables: [], shortcuts: [], flocks: []},
    at: point, worldAt: point, groundAt: point, nearest: (x, z) => ({s: z, lateral: x}), phase: s => s,
    surfaceAt: (_, lateral) => ({mainRoad: Math.abs(lateral) <= 7, road: Math.abs(lateral) <= 7, roadHalfWidth: 7}),
    themeAt: () => 'desert', roadHalfWidthAt: () => 7, nearestRadar: () => null,
    obstaclesNear: () => duel.course.features.obstacles};
  duel.featureFlags = {enabled: name => name === 'titan-bowl' && enabled};
  duel._obstacleArray = duel.course.features.obstacles;
  duel._obstacleQueryCache.clear();
  duel._lapGates = [];
  const target = {s: 40, prevS: 40, lateral: 30, prevLateral: 30, speedMph: 0,
    headingError: 0, pushVelocity: 0, dir: 1, car: 'falcone_f42', alive: true,
    damageZones: {front: 0, rear: 0, left: 0, right: 0}};
  Object.assign(duel.state, {status: 'racing', s: 28, prevS: 28, lateral: 30,
    prevLateral: 30, speedMph: 30, traffic: [target]});
  const samples = [], events = [];
  let airTicks = 0;
  duel.onChange((_, ev) => { if (ev.bowlTrick || ev.jumpLanded) events.push(ev); });
  for (let i = 0; i < 360; i++) {
    if (duel.state.airborne) airTicks++;
    duel.setInput({throttle: 0, brake: +(slam && duel.state.airborne && airTicks <= 60), steer: 0, boost: false});
    duel.step(DT);
    const s = duel.state;
    samples.push([s.speedMph, s.airHeight, s.airborne, !!s.tumble]);
  }
  assert.equal(target.crushed, true, 'the Titan still launches from the parked car');
  if (slam) {
    assert.ok(events.some(e => e.bowlTrick?.landing === 'slam'));
    assert.ok(!events.some(e => e.jumpLanded), 'a roof landing pays no launch off the parked car');
  }
  return samples;
}

test('enabling Bowl air leaves the Titan launch off cars unchanged', () => {
  assert.deepEqual(carLaunch(true), carLaunch(false));
  carLaunch(true, true);
});

function onFloor(speed, lateral = -13, start = 38) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  duel.startBowlNight({night: 1, cpuDifficulty: 'medium'});
  Object.assign(duel.state.bowlNight, {show: {night: 1, eventIndex: 1, complete: false}, phase: 'result'});
  duel.continueBowlNight();
  Object.assign(duel.state, {status: 'racing', s: start, prevS: start, lateral, prevLateral: lateral,
    speedMph: speed, gear: 2, headingError: 0});
  const events = [];
  duel.onChange((_, ev) => { if (ev.bowlTrick) events.push(ev.bowlTrick); });
  return {duel, events};
}

const neutral = {throttle: 0, brake: 0, steer: 0, boost: false};
function bigJump(keys, setup = () => {}) {
  const {duel, events} = onFloor(53), speeds = [];
  setup(duel);
  let ticks = 0;
  for (let i = 0; i < 515; i++) {
    const input = {...neutral};
    if (duel.state.airborne) {
      Object.assign(input, keys(++ticks));
      speeds.push(duel.state.speedMph);
    } else if (ticks) input.throttle = 1;
    duel.setInput(input);
    duel.step(DT);
  }
  assert.ok(ticks > 218, 'the authored Big Jump permits a double');
  return {duel, events, speeds};
}

test('the Big Jump pays full turns, combos, sideways landings and a damage-free Slam', () => {
  const fly = (keys, expected) => {
    const run = bigJump(t => t > 2 ? keys(t - 2) : {});
    assert.deepEqual(run.events.map(e => [e.kind, e.turns, e.points, e.landing]), expected);
    return run;
  };
  const single = fly(t => ({brake: +(t <= 120)}), [['backflip', 1, 50, 'clean']]);
  assert.deepEqual(single.events[0].cues, ['bowl.trick.land', 'bowl.trick.new']);
  assert.deepEqual(single.speeds, bigJump(() => ({})).speeds, 'S leaves the whole flight speed trace unchanged');
  fly(t => ({brake: +(t <= 216)}), [['backflip', 2, 200, 'clean']]);
  fly(t => ({throttle: +(t <= 120)}), [['frontFlip', 1, 50, 'clean']]);
  fly(t => ({steer: +(t <= 108)}), [['spin', 1, 30, 'clean']]);
  fly(t => ({brake: +(t <= 120), steer: +(t <= 108)}), [['backflip', 1, 75, 'clean'], ['spin', 1, 45, 'clean']]);
  fly(t => ({boost: t <= 120, steer: +(t <= 120)}), [['barrelRoll', 1, 60, 'clean']]);
  fly(t => ({boost: t > 27 && t <= 147, steer: +(t <= 147)}), [['sideFlip', 1, 40, 'slide']]);
  const slam = fly(t => ({brake: +(t <= 60)}), [['slam', 0, 0, 'slam']]);
  assert.ok(Object.values(slam.duel.state.damageZones).every(value => value === 0));
  assert.ok(slam.duel.state.speedMph > 1 && slam.duel.state.bowlPose.pitch === 0);
});

test('a first-frame press counts, and a completed flip survives a reversal', () => {
  const run = bigJump(t => ({brake: +(t <= 120), throttle: +(t > 120 && t <= 216)}));
  assert.deepEqual(run.events.map(e => [e.kind, e.points, e.combo]), [['frontFlip', 75, 2], ['backflip', 75, 2]]);
});

test('a Slam takes one third of the actual crowd, pays zero and plays no crowd cheer', () => {
  const scores = [];
  let crowdBefore, timeBefore, landedAt;
  const run = bigJump(t => ({brake: +(t <= 60)}), duel => {
    const event = duel.state.bowlNight.event;
    event.crowd = 75;
    duel.onChange((_, ev) => {
      if (ev.bowlScore) scores.push(ev.bowlScore);
      if (ev.bowlTrick?.landing === 'slam') landedAt = duel.state.stageTimeSec;
    });
    crowdBefore = event.crowd;
    timeBefore = event.crowdAt;
  });
  assert.deepEqual(scores.map(e => [e.points, e.cue]), [[0, null]]);
  assert.equal(run.duel.state.bowlNight.event.score, 0);
  assert.ok(Math.abs(scores[0].crowd - crowdBefore * Math.exp(-.03 * (landedAt - timeBefore)) * 2 / 3) < 1e-9);
});

test('the real floor counts wheelies, stoppies and consecutive donuts', () => {
  for (const [speed, input, steps, expected] of [
    [0, {throttle: 1}, 370, [['wheelie', 8], ['wheelie', 8], ['wheelie', 33]]],
    [42, {brake: 1}, 123, [['stoppie', 10]]],
    [4, {throttle: 1, steer: 1}, 545, [['donut', 15], ['donut', 20], ['donut', 25], ['cyclone', 30]]],
  ]) {
    const {duel, events} = onFloor(speed, 7, 1);
    for (let i = 0; i < steps; i++) {
      duel.setInput({...neutral, boost: true, ...input});
      duel.step(DT);
    }
    assert.deepEqual(events.map(e => [e.kind, e.points]), expected);
  }
});

test('the next roll uses the heading at its own start', () => {
  const s = actor({airHeight:35, _verticalSpeed:9, cpuDifficulty:'hard'});
  const starts = [];
  const duel = {state:s, course:{def:{bowl:true,tricks:true}}, featureFlags:{enabled:()=>true},
    emit:ev=>{if(ev.bowlTrickGo) starts.push(ev.bowlTrickGo.kind);}};
  stepBowlTricks(duel,s,DT);
  for (let i=0; i<160; i++) {
    s.input = {throttle:0,brake:0,steer:[0,8,45].includes(i)?-1:0,boost:[8,45].includes(i)};
    stepBowlTricks(duel,s,DT);
  }
  assert.deepEqual(starts,['spin','barrelRoll','barrelRoll']);
});

function seededFlight(id, level, seed, habit, wall = false) {
  const {duel, events} = onFloor(50);
  const s = duel.state, ramp = duel.course.features.ramps.find(r=>r.id===id), rng = makeRng(seed*7919);
  s.bowlNight.cpuDifficulty = level;
  const fullSpeed = id === 'jump-kicker' && !habit;
  const start = wall ? 46 : ramp.start-2;
  const line = wall ? -14 : ramp.off;
  const y = duel.course.groundAt(start,line).y;
  Object.assign(s,{s:start,prevS:start,lateral:line,prevLateral:line,groundHeight:y,prevGroundHeight:y,
    airborne:false,_jumpY:y,_verticalSpeed:0,boost:1,headingError:wall ? .35 : 0,speedMph:wall ? 50 : fullSpeed ? duel.car.topSpeed : 30,gear:fullSpeed ? duel.car.gears.length-1 : 2});
  let air = 0, outside = false, late = 0;
  duel.onChange((_,event)=>{ if(event.bowlTrickLate) late++; });
  const release = rng.range(0,.3), tap = rng.range(habit ? .1 : .2,habit ? .8 : .7), hold = rng.range(.05,1.5);
  for (let i=0; i<850; i++) {
    const t = air*DT;
    const input = !s.airborne ? {throttle:1,boost:wall} : habit === 'hold brake' ? {brake:+(air>1)} : habit === 'carry' ? {throttle:1} :
      habit ? {throttle:+(t>=tap)} : {throttle:+(t<release),brake:+(t>=tap && t<tap+hold)};
    duel.setInput({...neutral,...input});
    if(s.airborne) air++;
    duel.step(DT);
    outside ||= s.lateral > duel.course.features.bowl.outside.wall;
    if(air && !s.airborne) break;
  }
  assert.ok(air>0);
  duel.setInput(neutral); duel.step(DT); // Show Night observes the landing at the next fixed step.
  return {events,landing:s.bowlLanding,score:s.bowlNight.event.score,outside,late};
}
test('seeded children can tap a backflip and hold the throttle again on real jumps', () => {
  for(const ramp of ['jump-kicker','table','big-jump']) {
    const runs = Array.from({length:10}, (_,i)=>seededFlight(ramp,'easy',i+1,false));
    const clean = runs.filter(r=>r.events.some(e=>e.kind==='backflip' && e.landing==='clean')).length;
    console.log(ramp + ': ' + clean + '/10 clean child backflips');
    if(ramp!=='jump-kicker') assert.ok(clean>=8);
    assert.ok(runs.every(r=>r.landing!=='slam'));
  }
  for(const level of ['easy','medium']) for(const wall of [false,true]) {
    const runs = Array.from({length:10},(_,i)=>seededFlight('big-jump',level,i+1,true,wall));
    assert.ok(runs.every(r=>r.landing==='clean' && r.events.every(e=>e.kind==='frontFlip')));
    if (wall) assert.ok(runs.every(r=>r.outside),'every over-wall drive physically crossed the outer wall');
    const carried = seededFlight('big-jump',level,7,'carry',wall);
    assert.ok(carried.score>0 && carried.events.length===0);
  }
});
test('the landing window and Easy recovery depend on the requested turn, not the current angle alone', () => {
  const trial = (level,ticks,second=false) => {
    const s=actor({airHeight:30,_verticalSpeed:6,cpuDifficulty:level});
    const events=[];
    const duel={state:s,course:{def:{bowl:true,tricks:true}},featureFlags:{enabled:()=>true},
      emit:ev=>{if(ev.bowlTrick)events.push(ev.bowlTrick);}};
    stepBowlTricks(duel,s,DT);
    for(let t=0;t<ticks;t++) { s.input={brake:+(t===0 || second && t===98)};stepBowlTricks(duel,s,Math.min(1,ticks-t)*DT); }
    s.airborne=false;stepBowlTricks(duel,s,DT);
    return {s,events,duel};
  };
  assert.equal(trial('easy',96*(1-55/360)).s.bowlLanding,'clean');
  assert.equal(trial('hard',96*(1-55/360)).s.bowlLanding,'slam');
  const easy=trial('easy',112,true);
  assert.ok(easy.events.some(e=>e.kind==='backflip' && e.points===50));
  assert.equal(easy.s.bowlLanding,'slam');
  for(let i=0;i<121;i++)stepBowlTricks(easy.duel,easy.s,DT);
  assert.equal(Math.abs(easy.s.bowlPose.pitch),0);
});

function arenaRace(car, enabled) {
  const duel = new Duel({seed:1989});
  duel.featureFlags = {enabled:name=>enabled && name==='arena-tricks'};
  duel.startCampaign({car,startStage:COURSE.findIndex(c=>c.id==='titan-arena'),cpuDifficulty:'easy',mode:'duel',playerId:'arena-driver'});
  const s=duel.state;s.status='racing';
  const events=[];duel.onChange((_,ev)=>{if(ev.bowlTrick)events.push(ev.bowlTrick);});
  return {duel,s,events};
}
function arenaJump(car,keys,enabled=true) {
  const {duel,s,events}=arenaRace(car,enabled), ramp=duel.course.features.ramps[0];
  const start=ramp.start-3, y=duel.course.groundAt(start,0).y;
  Object.assign(s,{s:start,prevS:start,lateral:0,prevLateral:0,groundHeight:y,prevGroundHeight:y,headingError:0,
    _jumpY:y,_verticalSpeed:0,airborne:false,speedMph:Math.min(110,duel.car.topSpeed*.92),gear:duel.car.gears.length-1});
  let air=0;
  const trace=[];
  for(let i=0;i<850;i++){
    const pressed=s.airborne && ++air===2;
    duel.setInput({...neutral,...(pressed ? keys : {})});duel.step(DT);
    trace.push([s.s,s.lateral,s.airHeight,s.speedMph]);
    if(air&&!s.airborne)break;
  }
  assert.ok(air>0,car+' takes the authored Arena ramp');
  return {duel,s,trace,events};
}
test('the normal Monster Arena race accepts road, rally and monster vehicles and keeps trick score separate',()=>{
  for(const car of ['falcone_f42','dusthawk_rally','titan_monster']){
    for(const [keys,expected,points] of [[{brake:1},'backflip',50],[{steer:1},'spin',30]]){
      const run=arenaJump(car,keys),clean=arenaJump(car,{});
      assert.ok(run.events.some(e=>e.kind===expected && e.points===points),car+' '+expected);
      assert.deepEqual(run.trace,clean.trace,'trick leaves actual race position and time unchanged');
      assert.equal(run.s.score,clean.s.score);
      assert.ok(run.s.arenaTrickShow.event.score>0);
      assert.deepEqual([run.s.position,run.s.stageTimeSec],[clean.s.position,clean.s.stageTimeSec]);
    }
    for(const [steer,kind,points] of [[0,'wheelie',8],[1,'donut',15]]){
      const {duel,s,events}=arenaRace(car,true);
      Object.assign(s,{s:80,prevS:80,lateral:0,prevLateral:0,speedMph:0,headingError:0});
      for(let i=0;i<290;i++){duel.setInput({...neutral,throttle:1,steer,boost:true});duel.step(DT);}
      assert.ok(events.some(e=>e.kind===kind && e.points===points),car+' '+kind);
    }
  }
  const off=arenaJump('falcone_f42',{brake:1},false);
  assert.ok(!off.s.arenaTrickShow && !off.s.bowlPose && !off.events.length);
});

test('a scored Arena backflip preserves the finish of the final race sector', () => {
  function finish(trick) {
    const {duel,s,events} = arenaRace('falcone_f42',true);
    const ramp = duel.course.features.ramps.at(-1);
    const start = duel.course.length*(s.lapsTotal-1) + ramp.start-3;
    const y = duel.course.groundAt(start,0).y;
    Object.assign(s,{s:start,prevS:start,lateral:0,prevLateral:0,groundHeight:y,prevGroundHeight:y,
      _jumpY:y,_verticalSpeed:0,airborne:false,speedMph:100,gear:duel.car.gears.length-1,
      completedLaps:s.lapsTotal-1,nextLapGate:duel._lapGates.filter(g=>g<ramp.start-3).length});
    let air=0;
    for(let i=0;i<9000 && s.status==='racing';i++){
      const steer = Math.max(-1,Math.min(1,s.headingError*2.5+s.lateral*.08));
      if(s.airborne)air++;
      duel.setInput(s.airborne ? {...neutral,brake:+(trick&&air===2)} : {...neutral,steer,throttle:+(s.speedMph<80)});
      duel.step(DT);
    }
    assert.ok(s.results?.completed,'the car finishes the race through its finish gate');
    assert.equal(events.some(e=>e.kind==='backflip'),trick);
    const outcome = settleRace(createProfile(),{...s.results,runId:'matched-sector',car:s.car,mode:s.mode,
      seed:s.seed,difficulty:s.difficulty,cpuDifficulty:s.cpuDifficulty,upgrades:s.upgrades,rival:s.rivalSettings});
    assert.ok(outcome.awarded && outcome.reward>0, 'the completed race earns its normal reward');
    return {results:s.results,reward:outcome.reward};
  }
  assert.deepEqual(finish(true),finish(false),'winner, elapsed time, lap times and race pay are identical');
});

test('each newly loaded Arena stage begins with a fresh trick score', () => {
  const {duel,s} = arenaRace('falcone_f42',true);
  stepBowlTricks(duel,s,DT);
  const before = s.arenaTrickShow;
  before.event.score = 423;
  duel._loadStage(s.stageIndex);
  stepBowlTricks(duel,s,DT);
  assert.notEqual(s.arenaTrickShow,before);
  assert.equal(s.arenaTrickShow.event.score,0);
  duel._loadStage(COURSE.findIndex(c=>c.id==='titan-stunt-trial'));
  stepBowlTricks(duel,s,DT);
  assert.ok(!s.arenaTrickShow && !s.bowlPose,'the next ordinary course drops the Arena pose and score');
});

test('the child-pace kicker admits one held turn and tells the driver once about a late repeat', () => {
  const easy = seededFlight('jump-kicker','easy',1,'hold brake');
  assert.ok(easy.events.some(e=>e.kind==='backflip' && e.turns===1));
  assert.equal(easy.late,1);
  assert.equal(easy.landing,'clean');
  const hard = seededFlight('jump-kicker','hard',1,'hold brake');
  assert.equal(hard.landing,'slam');
  assert.equal(hard.late,0);
});

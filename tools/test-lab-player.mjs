// LAB-POLISH: a repeatable player attempt, using dials and native controls only.
// LAB-CHALLENGE-EASE: all sixteen lessons must pass with simple play.
import assert from 'node:assert/strict';
import test from 'node:test';
import {BENCH_SCRIPT} from './scenarios/lab-polish.mjs';
import {LAB_LESSONS} from '../src/lab/lab-lessons.js';
import {openBench, setControl, runBench, goalMet} from '../src/lab/lab-model.js';
import {checkProtections} from '../src/lab/lab-workshop.js';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {createHeliSession} from '../src/heli/heli-session.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {armMissions} from '../src/heli/heli-missions.js';
import {createMissions, setMissions} from '../src/heli/heli-save.js';
import {driveCircuit} from './track-script-drive.mjs';
import {createLabLap} from '../src/lab/lab-lap.js';
import {createSkiRun, stepSkiRun} from '../src/ski/ski-session.js';
import {waxRunResult, snowOfDay} from '../src/lab/benches/wax.js';

const report = row => console.log('PLAYER ' + JSON.stringify(row));
const DAY = '2026-10-20';
const worlds = new Map();
function loadCourse(id) {
  if (!worlds.has(id)) {
    const course = new Course(ALL_CIRCUITS.find(row => row.id === id), 1989);
    worlds.set(id, {course, ground: groundFromCourse(course)});
  }
  return worlds.get(id);
}

test('all sixteen benches meet their goals with rounded dial inputs', () => {
  assert.deepEqual(Object.keys(BENCH_SCRIPT).sort(), LAB_LESSONS.map(row => row.id).sort());
  for (const [id, runs] of Object.entries(BENCH_SCRIPT)) {
    let state = openBench(id);
    for (const settings of runs) {
      for (const [key, value] of Object.entries(settings)) state = setControl(state, key, value);
      state = runBench(state);
      for (const [key, value] of Object.entries(settings)) assert.equal(state.result.settings[key], value, `${id}: legal dial ${key}`);
    }
    assert.equal(goalMet(state), true, id);
    report({bench:id, runs:runs.length, goal:true});
  }
  assert.equal(checkProtections({underbody:'zinc', exhaust:'bare', armour:'zinc'}).passed, true);
  report({challenge:'rust', passed:true, play:'Zinc on wet parts; dry exhaust bare.'});
});

const clamp = v => Math.max(-1, Math.min(1, v));
// Observe only four times a second and round the stick to tenths. The pilot
// steers toward visible targets; it never writes positions, fuel or verdicts.
function pilot(v, target, speed = 12) {
  const h = v.heli, dx = target.x - h.x, dz = target.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
  const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
  const fx = Math.sin(h.heading), fz = Math.cos(h.heading);
  const round = value => Math.round(clamp(value) * 10) / 10;
  return {pitch:round((ex * fx + ez * fz) * .25), roll:round((-ex * fz + ez * fx) * .25),
    lift:round(Math.max(-4, Math.min(4, target.y - h.y)) * .3 - h.vy * .3), yaw:0};
}

function attempt(id) {
  let profile = normalizeProfile({...createProfile(), credits:20000,
    courses:{version:1,unlocked:['tremblant-woods','summit-run']},
    heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3,playDay:{last:DAY,count:5}}});
  const missions = armMissions(createMissions(), {date:'2026-10-14',playerName:'Lab QA'});
  profile = setMissions(profile, {...missions,count:missions.need}, {enabled:true}).profile;
  const session = createHeliSession({profile,enabled:true,labEnabled:true,fireEnabled:true,summitRunEnabled:true,
    loadCourse,loadFireCourse:loadCourse,playerName:'Lab QA',today:DAY,carId:'falcone_f42'});
  session.start();
  if (id === 'projectile' || id === 'fire') assert.equal(session.fitBucket().ok, true);
  assert.equal(session.startChallenge(id).ok, true, id);
  let seconds = 0, outcome = null, controls = {}, steps = 0, maxWater = 0, buoyHits = 0;
  const tick = (limit, target, until = () => false, speed = 12, pour = false) => {
    for (let i = 0; i < limit * 120 && !outcome; i++) {
      const v = session.view();
      if (steps++ % 30 === 0) controls = {...pilot(v, typeof target === 'function' ? target(v) : target, speed), pour};
      const events = session.step(controls); seconds += 1 / 120;
      maxWater = Math.max(maxWater, session.view().bucket?.water ?? 0);
      buoyHits += events.filter(e => e.type === 'buoyHit').length;
      outcome = events.find(e => ['challengePassed','challengeRetry','crashed'].includes(e.type)) ?? null;
      if (until(session.view())) break;
    }
  };
  const load = () => session.view().loads.find(row => row.id === (id === 'lift' ? 'dusthawk_rally' : id === 'altitude' ? 'lab-crate' : 'falcone_f42') && !row.own);
  const settle = (target, limit = 90, speed = 6) => tick(limit,target,v => Math.hypot(v.heli.x-target.x,v.heli.z-target.z)<1.5 && Math.abs(v.heli.y-target.y)<.6 && Math.hypot(v.heli.vx,v.heli.vy,v.heli.vz)<.7,speed);
  if (['lift','pendulum','altitude'].includes(id)) {
    const car = load();
    settle({x:car.x,z:car.z,y:car.y+15.3});
    session.pressHook();
    if (!load()?.hooked) outcome ??= {type:'hookFailed'};
    if (id === 'lift') tick(120,v => ({x:v.zone.x+.5,z:v.zone.z-.5,y:v.zone.y+19.2}),()=>false,4);
    if (id === 'pendulum') {
      // The target is the same clear patch the challenge chooses, shown on its board.
      // Read its authored spot, never a desired load state.
      
      const v = session.view(), world = loadCourse(v.courseId);
      const target = challengeSpots(id,world,courseSite(world.course,world.ground,v.courseId)).target;
      settle({x:v.heli.x,z:v.heli.z,y:Math.max(v.heli.y,target.y+40)});
      settle({x:target.x+2,z:target.z-2,y:target.y+40},180,10);
      settle({x:target.x+2,z:target.z-2,y:target.y+15.4},90,3);
      session.pressHook(); tick(2,v=>({x:v.heli.x,z:v.heli.z,y:v.heli.y}));
    }
    if (id === 'altitude') {
      assert.equal(session.setDestination('summit-run'), true);
      tick(240,v=>({x:v.heli.x-300,z:v.heli.z+300,y:100}),v=>v.cruiseOffered,25);
      session.acceptCruise(); tick(10,v=>({x:v.heli.x,z:v.heli.z,y:v.heli.y}),v=>v.phase==='flying');
      let released = false;
      tick(360,v=>{
        const d=Math.hypot(v.heli.x-v.zone.x,v.heli.z-v.zone.z);
        if(!released && load()?.onGround && load()?.hooked){session.pressHook();released=true;}
        return released ? {x:v.zone.x+20,z:v.zone.z,y:v.zone.y-1}
          : {x:v.zone.x,z:v.zone.z,y:v.zone.y+(d>300?150:Math.max(15.2,d*.45))};
      },()=>false,25);
    }
  } else if (id === 'headings') {
    const marker = session.view().challenge.props[0];
    tick(140,v=>({x:marker.x+4,z:marker.z-3,y:Math.hypot(v.heli.x-marker.x,v.heli.z-marker.z)>120?90:marker.y+12}),()=>false,16);
  } else {
    const v=session.view(), world=loadCourse(v.courseId);
    const spots=challengeSpots(id,world,courseSite(world.course,world.ground,v.courseId));
    let trips=0, drops=0;
    const move=(target,limit=90,speed=14)=>tick(limit,target,v=>Math.hypot(v.heli.x-target.x,v.heli.z-target.z)<3 && Math.abs(v.heli.y-target.y)<2 && Math.hypot(v.heli.vx,v.heli.vz)<2,speed);
    move({x:v.heli.x,z:v.heli.z,y:v.zone.y+70},60,3);
    const scoop = () => {
      move({x:spots.scoop.x,z:spots.scoop.z,y:spots.scoop.y+70},120,20);
      tick(60,{x:spots.scoop.x,z:spots.scoop.z,y:spots.scoop.y+14.8},v=>v.bucket.water>=v.bucket.holds-5,3);
      trips++;
      move({x:spots.scoop.x,z:spots.scoop.z,y:spots.scoop.y+40},45,6);
    };
    if(id==='projectile') {
      scoop();
      let correction=0, side=0;
      const direction=spots.scoop.z>spots.buoys[0].z?-1:1;
      for(const [index,target] of [...spots.buoys.entries()].sort((a,b)=>Math.abs(a[1].z-spots.scoop.z)-Math.abs(b[1].z-spots.scoop.z))) {
        for(let tries=0;tries<3 && !outcome;tries++) {
          if(session.view().challenge.props.filter(p=>p.kind==='buoy')[index].hit) break;
          if(session.view().bucket.water<75) scoop();
          // Fly straight at 8 m/s, 40 m above the lake. Start the short pour
          // 12 m before the buoy; use the visible splash to adjust the next pass.
          move({x:target.x+side,z:target.z-direction*45,y:target.y+40},60,14);
          tick(20,{x:target.x+side,z:target.z+direction*60,y:target.y+40},v=>direction*(v.heli.z-target.z)>=-12+direction*correction,8);
          tick(.25,{x:target.x+side,z:target.z+direction*60,y:target.y+40},()=>false,8,true); drops++;
          tick(5,{x:target.x+side,z:target.z+direction*60,y:target.y+40},()=>false,8);
          const splash=session.view().challenge?.props.find(p=>p.kind==='splash');
          if(splash) { correction+=Math.round(target.z-splash.z); side+=Math.round(target.x-splash.x); }
        }
      }
    } else {
      for(let trip=0;trip<8 && !outcome;trip++) {
        scoop();
        while(session.view().bucket.water>25 && !outcome) {
          const target=session.view().challenge.props.find(p=>p.kind==='fire' && p.percent>0);
          if(!target) break;
          // Hover at a modest height; the normal aim ring guides small corrections.
          let aim={x:target.x,z:target.z,y:target.y+40};
          settle(aim,90,14);
          const ring=session.view().bucket.aim;
          if(ring) { aim={...aim,x:aim.x+Math.round(target.x-ring.x),z:aim.z+Math.round(target.z-ring.z)}; settle(aim,20,3); }
          tick(.5,aim,()=>false,3,true); drops++;
          tick(5,aim,()=>false,3);
        }
      }
    }
    report({challenge:id,trips,drops});
  }
  report({challenge:id,seconds:Math.round(seconds*10)/10,passed:outcome?.type==='challengePassed',
    outcome:outcome?.type??'time limit',reason:outcome?.reason??null,
    ...(id==='projectile'||id==='fire'?{maxWater:Math.round(maxWater),buoyHits}: {})});
  assert.equal(outcome?.type,'challengePassed',id);

  if(id==='projectile') assert.ok(seconds<=180,'three hits within three minutes, including scooping');
  if(id==='fire') {
    assert.ok(session.view().challenge == null,'session finishes the practice challenge');
    assert.ok(seconds <= 290,'steady pilot finishes at least a minute before the road at 350 s');
  }
  session.leave();
}
// Reuse the game's placement rules, outside the pilot/controller.
import {challengeSpots} from '../src/lab/lab-challenges.js';
import {courseSite} from '../src/heli/heli-session.js';
test('six helicopter challenges attempted with quarter-second, rounded controls', () => {
  for(const id of ['lift','projectile','fire','pendulum','altitude','headings']) attempt(id);
});

test('G-force and wax challenges through native driving and ski controls', () => {
  const lap=createLabLap(); lap.arm(); let passed=false;
  const result=driveCircuit(ALL_CIRCUITS.find(c=>c.id==='tremblant-woods'),{mode:'timetrial',opponentCount:0,skill:.9,stopAfterLaps:1,maxSeconds:400,
    onTick:(state,duel)=>{if(lap.step(state,duel.course).some(e=>e.type==='gforcePass'))passed=true;}});
  assert.equal(passed,true,'G-force native lap');
  report({challenge:'gforce',passed,seconds:result.timeSec,corners:lap.view()?.count??0});
  const run=createSkiRun({runId:'slalom',wax:'right'}), line=run.zone.line;
  let index=1, controls={};
  for(let step=0;step<120*180 && !run.finished;step++){
    if(step%24===0){
      const h=run.skier;
      const ahead=h.z+Math.min(8,3+h.speed*.1);
      while(index<line.length-1 && line[index].z<ahead)index++;
      const a=line[index-1], b=line[index], fraction=Math.max(0,Math.min(1,(ahead-a.z)/(b.z-a.z)));
      const target={x:a.x+(b.x-a.x)*fraction,z:a.z+(b.z-a.z)*fraction}, error=Math.atan2(Math.sin(Math.atan2(target.x-h.x,target.z-h.z)-h.heading),Math.cos(Math.atan2(target.x-h.x,target.z-h.z)-h.heading));
      controls={turn:h.grounded?Math.round(clamp(-error/.44)*10)/10:0,tuck:Math.abs(error)<.08,skid:Math.abs(error)>.4,skate:true};
    }
    stepSkiRun(run,controls);
  }
  assert.equal(run.finished,true,'simple ski script reaches the finish');
  const time=run.result?.time;
  assert.equal(waxRunResult({day:DAY,pick:snowOfDay(DAY).wax,time}).pass,true,'correct wax and a finished native run pass');
  report({challenge:'wax',passed:!!run.finished && waxRunResult({day:DAY,pick:snowOfDay(DAY).wax,time}).pass,
    seconds:time??null,finished:run.finished,missed:run.result?.missed??null});
});

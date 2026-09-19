import assert from 'node:assert/strict';
import { App } from '../src/app.js';
import { Duel } from '../src/game.js';
import { Course } from '../src/course.js';
import { COURSE, DRIVE, LIVES } from '../src/config.js';
import { sweepObstacle } from '../src/collision.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const index=COURSE.findIndex(event=>event.id==='timberline-rush'),definition=COURSE[index];
function trial(cpuDifficulty='hard',seed=1989){const d=new Duel({seed});d.startCampaign({startStage:index,cpuDifficulty,car:'falcone_f42',mode:'timetrial'});return d;}
function cross(d,gateIndex,lateral=0){const s=d.state,gate=d.course.features.rushGates[gateIndex%6],lap=Math.floor(gateIndex/6),distance=gate.s+lap*d.course.length;
  Object.assign(s,{status:'racing',prevS:distance-.2,s:distance+.2,prevLateral:lateral,lateral,speedMph:120,completedLaps:lap});d._advanceRushGates(1/120);}

for(const [level,initial,extension]of[['easy',40,10],['medium',34,8],['hard',30,7]]){
  const d=trial(level),s=d.state;
  check(s.car==='dusthawk_rally'&&s.mode==='duel'&&s.lapsTotal===2,'checkpoint entry enforces Dusthawk, objective mode and two laps');
  check(!s.rival&&!s.traffic.length&&!s.police.pursuit&&!d.course.features.radarTraps.length,'the rally challenge has no traffic, rival or police');
  check(s.checkpointRush.total===12&&s.timeRemaining===initial&&s.checkpointRush.extensionSec===extension,'each difficulty has its advertised starting clock and extension');
  check(s.objective.kind==='checkpointRush'&&s.objective.targetCheckpoints===12,'the objective advertises all twelve gates');
  const road=d._drivingSurface(0,0),dirt=d._drivingSurface(0,25);
  check(road.preparedGravel&&road.boostAllowed&&road.speedLimit===d.car.topSpeed*.98,'the new rally trail retains prepared gravel pace and boost');
  check(!dirt.preparedGravel&&!dirt.boostAllowed&&dirt.speedLimit===d.car.offRoadSpeed,'rough off-trail retains its reduced grip and speed');
}
for(const seed of[1989,42,17,2026]){
  const c=new Course(definition,seed),ridge=new Course(COURSE.find(event=>event.id==='ridge-rally'),seed);
  const fixed=new Course(definition,1989);check(c.samples.every((p,i)=>Math.hypot(p.x-fixed.samples[i].x,p.z-fixed.samples[i].z)<1e-9),'a fixed-route challenge never promises unseen layout variants');
  check(c.features.rushGates.length===6&&c.length===3800&&c.raceLength===7600,'six gates span a two-lap3800m circuit');
  check(c.sections[0].name==='Dry Creek'&&c.sections[1].name==='Timberline Summit','both new scenery sections are present');
  check(Math.max(...c.samples.map(p=>p.y))-Math.min(...c.samples.map(p=>p.y))>70,'the summit has a real climb rather than a flat backdrop');
  check(Math.max(...c.samples.map(p=>Math.abs(p.curvature)))<1/170,'the new shape leaves a safe near-terrain turning radius');
  const a=c.at(c.length*.42),b=ridge.at(ridge.length*.42);
  check(Math.hypot(a.x-b.x,a.z-b.z)>30,'Timberline is physically distinct from the existing Ridge layout');
  for(const [i,gate]of c.features.rushGates.entries()){
    check(gate.s>100&&gate.s<c.length-100&&(!i||gate.s-c.features.rushGates[i-1].s>=160),'ordered gate spacing leaves a usable driving interval');
    check(!c.features.shortcuts.some(cut=>gate.s>cut.start-36&&gate.s<cut.end+36)&&!c.features.tunnels.some(t=>gate.s>t.start-40&&gate.s<t.end+40),'gates sit clear of shortcut paths and tunnel portals');
    check(gate.halfWidth===c.roadHalfWidthAt(gate.s)+1,'crossing tolerance is the trail plus one metre');
    for(const post of gate.posts){
      const obstacle=c.features.obstacles.find(o=>o.id===post.id);
      check(obstacle?.rushGateSupport&&obstacle.height===post.height,'every visible gate support has a matching solid hull');
      check(Math.abs(post.y+post.height-(gate.bannerBottomY+gate.bannerHeight+.2))<1e-9,'both supports reach the actual banner top despite sloping verges');
      check(!!sweepObstacle(post,post,obstacle,post.heading),'support hulls are physically solid');
      for(const offset of[-4.2,0,4.2]){const from=c.groundAt(gate.s-6,offset),to=c.groundAt(gate.s+6,offset);
        check(!sweepObstacle(from,to,obstacle,from.heading,{halfWidth:1.6,halfLength:2.9}),'even a wide truck fits the marked trail beneath each gate');}
    }
  }
}
{
  const d=trial(),s=d.state,events=[];d.onChange((_,event)=>{if(event.checkpointRushEvent)events.push(event.checkpointRushEvent);});
  cross(d,0);check(s.checkpointRush.passed===1&&s.timeLimitSec===37&&events[0].type==='passed','one legal forward crossing earns one time extension');
  cross(d,0);check(s.checkpointRush.passed===1&&s.timeLimitSec===37&&events.length===1,'repeating the same gate cannot farm extra time');
  cross(d,1,12);check(s.checkpointRush.missed===1&&s.checkpointRush.nextGate===2&&s.timeLimitSec===37,'passing outside the gate records a miss without extending the clock');
  cross(d,1);check(s.checkpointRush.passed===1&&s.checkpointRush.missed===1,'a missed gate cannot be repaired by driving back and farming its extension');
  const before=JSON.stringify(s.checkpointRush);d._safeReset(s);check(JSON.stringify(s.checkpointRush)===before,'safe recovery preserves gate history and never awards an extension');
  d.startCampaign();check(s.checkpointRush===null&&s.objective===null&&s.timeLimitSec===null,'ordinary races clear challenge history');
}
{
  const d=trial(),s=d.state,g=d.course.features.rushGates[0];
  Object.assign(s,{status:'racing',prevS:g.s-100,s:g.s+1,prevLateral:0,lateral:0,speedMph:120});d._advanceRushGates(1/120);
  check(s.checkpointRush.passed===0&&s.checkpointRush.missed===1&&s.timeLimitSec===30,'a discontinuous teleport across a gate earns no time');
  const other=trial(),q=other.state;Object.assign(q,{status:'racing',prevS:g.s+1,s:g.s-1,prevLateral:0,lateral:0,speedMph:120});other._advanceRushGates(1/120);
  check(q.checkpointRush.nextGate===0&&q.timeLimitSec===30,'reverse crossings never award or consume a gate');
  Object.assign(q,{prevS:g.s+2,s:g.s+3});other._advanceRushGates(1/120);
  check(q.checkpointRush.missed===1,'starting beyond an unvisited gate cannot treat it as passed');
}
for(const fraction of[.2,.8]){
  const d=trial(),s=d.state,g=d.course.features.rushGates[0],dt=.01;
  Object.assign(s,{status:'racing',prevS:g.s-fraction*.1,s:g.s+(1-fraction)*.1,prevLateral:0,lateral:0,speedMph:120,stageTimeSec:30.005});
  d._advanceRushGates(dt);d._deadline();
  check(fraction===.2?s.status==='racing'&&s.timeLimitSec===37:s.results?.timeout&&s.timeLimitSec===30,'gate timing uses the interpolated crossing instant, never reviving an expired clock');
}
for(const completeGates of[false,true]){
  const d=trial(),s=d.state;for(let i=0;i<12;i++)cross(d,i,!completeGates&&i===2?12:0);
  Object.assign(s,{s:d.raceLength,status:'racing',completedLaps:0,stageTimeSec:60});
  check(!d._finishStage()&&!s.results,'gate count cannot bypass checkpoint-validated race laps');
  s.completedLaps=2;d._finishStage();
  check(s.results.completed&&s.results.won===completeGates&&s.results.targetsMet===completeGates,'winning requires all ordered gates plus both valid laps');
  check(s.results.checkpointRush&&s.results.checkpointsPassed===(completeGates?12:11)&&s.results.checkpointsRequired===12&&s.results.checkpointMisses===(completeGates?0:1),'results expose the exact gate outcome');
  check(completeGates||(!s.results.isPersonalBest&&s.results.best==null),'a completed missed-goal loss cannot record a competitive time');
  d.nextStage();check(s.status==='complete','checkpoint rush remains a standalone event');
}
{
  const d=trial(),s=d.state,events=[];d.onChange((_,e)=>events.push(e));
  Object.assign(s,{status:'racing',stageTimeSec:30});d._deadline();d._deadline();
  check(s.results.timeout&&!s.results.completed&&!s.results.won&&s.timeRemaining===0,'the unextended clock loses at its deadline');
  check(events.filter(e=>e.stageResult).length===1,'timeout settles exactly once');
  const crashed=trial('easy'),q=crashed.state;q.status='racing';
  for(let i=0;i<DRIVE.majorCrashLimit;i++){q.impactTimer=0;q.speedMph=110;crashed._crash('rock');}
  check(q.catastrophic&&q.status==='gameover'&&q.majorCrashes===5&&q.lives===LIVES.start-5,'checkpoint rush retains the ordinary five-major-crash destruction rule');
  const dirt=trial(),r=dirt.state;Object.assign(r,{status:'racing',s:300,prevS:300,lateral:100,prevLateral:100,speedMph:90});dirt._boundary(r);
  check(!r.majorCrashes&&r.lives===LIVES.start&&r.checkpointRush.passed===0,'offroad boundary recovery does not consume a chassis hit or award checkpoint time');
}

const replays=[];
for(const seed of[1989,42])for(const cpuDifficulty of['easy','medium','hard'])for(const difficulty of['casual','pro']){
  const outcomes=[];
  for(const fps of[30,144]){
    const app=new App();app.autopilot=true;app._scriptedCrashDone=true;app.duel.startCampaign({startStage:index,cpuDifficulty,difficulty,seed});
    let frames=0,minRemaining=Infinity,passes=0;app.duel.onChange((s,event)=>{if(event.checkpointRushEvent){passes++;minRemaining=Math.min(minRemaining,s.timeRemaining-event.checkpointRushEvent.extensionSec);}});
    while(!['stage_result','gameover'].includes(app.duel.state.status)&&frames++<fps*180)app.advance(1/fps);
    const s=app.duel.state,r=s.results;outcomes.push({time:r?.timeSec,won:r?.won,completed:r?.completed,passed:r?.checkpointsPassed,missed:r?.checkpointMisses,hits:s.majorCrashes,resets:s.boundaryResets,laps:s.completedLaps,minRemaining:+minRemaining.toFixed(3),events:passes});
  }
  check(outcomes.every(r=>r.completed&&r.won&&r.passed===12&&r.laps===2&&!r.missed&&!r.hits&&!r.resets&&r.events===12),`${seed}/${cpuDifficulty}/${difficulty}: ordinary inputs finish all gates cleanly`);
  assert.deepEqual(outcomes[0],outcomes[1]);checks++;
  replays.push({seed,cpuDifficulty,difficulty,...outcomes[0]});
}
const recovery=[];
for(const cpuDifficulty of['easy','medium','hard']){
  const app=new App();app.autopilot=true;app._scriptedCrashDone=true;app.duel.startCampaign({startStage:index,cpuDifficulty});let frames=0,hit=false;
  while(!['stage_result','gameover'].includes(app.duel.state.status)&&frames++<120*190){const s=app.duel.state;
    if(!hit&&s.s>1500){app.duel._crash('rock');hit=true;}app.advance(1/120);}
  const s=app.duel.state;check(hit&&s.stageCrashes===1&&s.majorCrashes===(s.results.won?0:1)&&s.racePenaltySec===LIVES.crashPenaltySec,'a replay crash keeps its thirty-second cost and stage evidence; only a win repairs it');
  check(cpuDifficulty==='easy'?s.results.completed&&s.results.won:s.results.timeout&&!s.results.won,'Easy allows this crash; Medium and Hard demand a cleaner run');
  recovery.push({cpuDifficulty,time:s.results.timeSec,won:s.results.won,passed:s.results.checkpointsPassed,missed:s.results.checkpointMisses});
}
console.log(JSON.stringify({checkpointReplays:replays,recovery}));
console.log(`Timberline Checkpoint Rush: ${checks} checks passed.`);

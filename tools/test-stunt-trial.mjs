import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { COURSE, DRIVE, LIVES, steeringYawAuthority } from '../src/config.js';

let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const index=COURSE.findIndex(course=>course.id==='titan-stunt-trial');
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
function trial(cpuDifficulty='hard',difficulty='casual') {
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:index,car:'falcone_f42',cpuDifficulty,difficulty});return duel;
}
for(const [level,seconds] of [['easy',95],['medium',75],['hard',62]]) {
  const d=trial(level),s=d.state;
  check(s.car==='titan_monster'&&s.lapsTotal===2,'the trial requires the Titan and two complete laps');
  check(s.rival===null&&s.traffic.length===0&&!s.police.pursuit,'the trial has no CPU race, traffic, or police');
  check(s.timeLimitSec===seconds&&s.objective.timeLimitSec===seconds,`${level} applies its configured deadline`);
  check(s.objective.targetJumps===4&&s.objective.targetCrushes===4,'the objective requires four landed jumps and four player crushes');
}
{
  const d=trial(),s=d.state;s.status='racing';s.jumps=4;s.crushCount=4;s.s=d.raceLength;s.completedLaps=0;
  check(d._finishStage()===false&&s.status==='racing'&&!s.results,'stunt totals cannot bypass validated race laps');
  s.completedLaps=1;check(d._finishStage()===false,'one lap cannot substitute for the required two');
  d.startCampaign({startStage:index,mode:'timetrial'});check(d.state.mode==='duel'&&!d.state.rival,'the stunt objective cannot become an ordinary Time Trial through direct entry');
}
for(const [jumps,crushCount] of [[3,4],[4,3],[4,4]]) {
  const d=trial(),s=d.state,events=[];d.onChange((_,event)=>events.push(event));
  Object.assign(s,{status:'racing',s:d.raceLength,completedLaps:2,stageTimeSec:55,jumps,crushCount});d._finishStage();
  const expected=jumps>=4&&crushCount>=4;
  check(s.results.completed&&s.results.won===expected&&s.results.targetsMet===expected,'a valid finish wins only after meeting both stunt targets');
  check(s.results.objective==='stuntTrial'&&s.results.objectiveMissed===!expected&&s.results.targets.jumps===4&&s.results.targets.crushes===4,'the result exposes accurate goal metadata');
  d._finishStage();check(events.filter(event=>event.stageResult).length===1,'repeated finish calls cannot settle the same stunt result twice');
  d.nextStage();check(s.status==='complete','the stunt trial remains a standalone event');
}
{
  const d=trial(),s=d.state,events=[];d.onChange((_,event)=>events.push(event));
  Object.assign(s,{status:'racing',stageTimeSec:32,racePenaltySec:30,jumps:4,crushCount:4,completedLaps:1});
  d._deadline();
  check(s.status==='stage_result'&&s.results.timeout&&!s.results.completed&&!s.results.won,'the deadline includes crash penalties and requires finishing the laps');
  check(s.results.targetsMet&&s.results.timeSec===62&&s.results.timeLimitSec===62,'timeout metadata preserves achieved stunts and the deadline');
  d._deadline();check(events.filter(event=>event.stageResult).length===1,'a deadline loss emits exactly one result');
  check(!s.catastrophic&&s.lives===LIVES.start,'a missed stunt deadline does not explode the vehicle');
  const late=trial();Object.assign(late.state,{status:'racing',stageTimeSec:62,jumps:4,crushCount:4,completedLaps:2,s:late.raceLength});late._finishStage();
  check(late.state.results.timeout&&!late.state.results.completed,'a direct late finish cannot bypass the deadline');
  const fatal=trial();Object.assign(fatal.state,{status:'racing',majorCrashes:4,jumps:2,crushCount:3,speedMph:100});fatal._crash('head_on',1,100);
  check(fatal.state.results.objective==='stuntTrial'&&!fatal.state.results.won&&!fatal.state.results.completed&&fatal.state.results.crushCount===3,'fatal results preserve objective progress without awarding a win');
  d.startCampaign({startStage:0});check(d.state.objective===null&&d.state.timeLimitSec===null,'returning to the campaign clears stunt rules');
}

// This driver supplies ordinary steering, throttle and gear inputs. It never
// writes poses, lap counts, jump counts, damage or crush rewards.
function stuntInput(d) {
  const s=d.state;if(s.status!=='racing')return;
  const next=d.course.features.crushables.filter(prop=>!s.crushedProps.includes(prop.id))
    .map(prop=>({...prop,gap:d.relativeS(prop.s,s.s)-s.s})).filter(prop=>prop.gap>-10&&prop.gap<105).sort((a,b)=>a.gap-b.gap)[0];
  const target=next?next.off:0,mps=s.speedMph*DRIVE.mphToWorld,frame=d.course.at(s.s),surface=d._drivingSurface(s.s,s.lateral);
  const heading=Math.atan((target-s.lateral)*2.5/Math.max(15,mps)),look=d.course.at(s.s+mps*.18);
  const yaw=look.curvature*mps+(heading-s.headingError)*6,authority=Math.max(.05,steeringYawAuthority(s.speedMph,d.car.grip,surface.traction));
  const bend=Math.max(Math.abs(frame.curvature),Math.abs(d.course.at(s.s+100).curvature),Math.abs(d.course.at(s.s+220).curvature));
  const targetSpeed=Math.min(d.car.topSpeed*.94,surface.speedLimit,.85*Math.sqrt(DRIVE.maxLateralAccel*d.car.grip/Math.max(.0001,bend))/DRIVE.mphToWorld);
  d.setInput({throttle:s.speedMph<targetSpeed?1:0,brake:s.speedMph>targetSpeed+4?Math.min(1,(s.speedMph-targetSpeed)/20):0,
    steer:clamp(-yaw/authority,-1,1),boost:false,shiftUp:!d.diff.autoShift&&s.revs>.95,shiftDown:!d.diff.autoShift&&s.revs<.48&&s.gear>0});
}
const replays=[];
for(const difficulty of ['casual','pro'])for(const fps of [30,144]) {
  const d=trial('hard',difficulty);let accumulator=0,frames=0;
  while(!['stage_result','gameover'].includes(d.state.status)&&frames++<fps*150) {
    accumulator+=1/fps;
    while(accumulator>=1/120-1e-10){stuntInput(d);d.step(1/120);accumulator-=1/120;}
  }
  const s=d.state;replays.push({difficulty,fps,time:s.results?.timeSec,score:s.score,jumps:s.jumps,crushes:s.crushCount});
  check(s.results?.won&&s.results.completed&&s.results.targetsMet&&s.completedLaps===2,`${difficulty}/${fps}FPS wins the Hard trial through ordinary input`);
  check(s.jumps>=4&&s.crushCount>=4&&s.majorCrashes===0&&s.boost===1,'the stock Titan meets the targets cleanly without nitro');
}
for(const difficulty of ['casual','pro']) {
  const [a,b]=replays.filter(replay=>replay.difficulty===difficulty);
  check(a.time===b.time&&a.score===b.score&&a.jumps===b.jumps&&a.crushes===b.crushes,'stunt timing and rewards agree across display frame rates');
}
console.log(`Titan Stunt Trial: ${checks} deadline, objective, lifecycle and real-driving checks passed.`);
console.log(JSON.stringify(replays));

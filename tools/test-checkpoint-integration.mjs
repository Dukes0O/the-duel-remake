import assert from 'node:assert/strict';
import {ownTestCourses} from './career-fixture.mjs';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {CPU_REWARDS,createProfile,settleRace,bestKey,isValidFinish} from '../src/progression.js';
import {recordFinish,loadLeaderboard,saveLeaderboard,createLeaderboard} from '../src/leaderboard.js';
import {buildRouteMapGeometry,RouteMap} from '../src/route-map.js';
import {buildCoursePreview} from '../src/course-preview.js';

let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const index=COURSE.findIndex(stage=>stage.kind==='checkpoint'),stage=COURSE[index];assert(stage,'Checkpoint event exists');
const required=stage.checkpointRush.gatesPerLap*(stage.laps||2);
const create=()=>{const app=ownTestCourses(new App());app.profile.credits=20000;app._saveProfile();check(app.unlockCar(stage.requiredCar).ok,'Dusthawk unlock succeeds');return app;};
const starter=ownTestCourses(new App());check(starter.startCampaign({startStage:index,car:'falcone_f42'}),'a starter car can enter checkpoint rush without the recommended car');check(starter.duel.state.car==='falcone_f42','checkpoint entry preserves the chosen owned vehicle');starter.returnToMenu();

memory.clear();let app=create();app.autopilot=true;let passes=0,sawNotice=false;
app.duel.onChange((_state,event)=>{if(event.checkpointRushEvent?.type==='passed')passes++;});
check(app.startCampaign({startStage:index,car:stage.requiredCar,mode:'timetrial',cpuDifficulty:'hard',seed:42}),'owned checkpoint event starts');
let s=app.duel.state;check(s.car===stage.requiredCar&&s.mode==='duel'&&s.seed===1989,'checkpoint event snapshots the explicitly selected car, objective mode and audited fixed route');
check(s.rival===null&&s.traffic.length===0&&!s.police.pursuit?.active,'checkpoint event has no CPU, traffic or pursuit');
check(app.ghostRecorder===null,'checkpoint event never records a Time Trial ghost');
for(let i=0;i<3500&&['countdown','racing','ticket'].includes(s.status);i++){app.advance(.1);sawNotice||=!!app.checkpointNotice;}
let result=s.results;
check(result?.won&&result.completed&&result.targetsMet,'ordinary App inputs complete two laps and every Hard gate');
check(result.checkpointsPassed===required&&result.checkpointsRequired===required&&result.checkpointMisses===0&&passes===required,'actual race passes each sequential gate once');
check(sawNotice&&result.timeSec<result.timeLimitSec,'HUD gate notices and extended deadline reflect the actual run');
check(result.creditBreakdown.base===CPU_REWARDS.hard&&result.creditBreakdown.personalBest===0,'first valid record pays normal Hard reward without a fabricated improvement bonus');
check(app.profile.personalBests[bestKey({...result,car:s.car,mode:s.mode,difficulty:s.difficulty,cpuDifficulty:s.cpuDifficulty})]===result.timeSec,'successful checkpoint result saves a comparable time best');
check(app.leaderboard.entries.length===1&&app.leaderboard.entries[0].checkpointsPassed===required&&app.leaderboard.entries[0].checkpointMisses===0,'local leaderboard retains gate metadata with the valid time');
check(app.ghosts.records.length===0,'successful objective finish creates no ordinary Time Trial ghost');
const balance=app.profile.credits;app.duel.emit({stageResult:result});check(app.profile.credits===balance,'duplicate successful result cannot repeat reward');
check(new App().profile.credits===balance&&new App().leaderboard.entries[0].checkpointsRequired===required,'wallet and gate metadata survive reload');
console.log(`Checkpoint App Hard: ${result.timeSec}s, ${result.checkpointsPassed}/${required} gates, ${result.timeLimitSec}s earned deadline, +${result.creditReward}CR`);

const map=buildRouteMapGeometry(app.duel.course),preview=buildCoursePreview(app.duel.course);
check(map.gates.length===stage.checkpointRush.gatesPerLap&&preview.map.gates.length===map.gates.length,'HUD and menu preview cache each physical gate once');
check(map.gates.every(gate=>Number.isFinite(gate.marker.x)&&Number.isFinite(gate.marker.y)&&gate.marker.x>0&&gate.marker.x<map.width&&gate.marker.y>0&&gate.marker.y<map.height),'all checkpoint markers fit the route inset');
globalThis.Path2D=class{moveTo(){}lineTo(){}};
const context=()=>new Proxy({},{get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
const canvas={width:400,height:280,dataset:{},ownerDocument:{createElement:()=>({getContext:context})},getContext:context,setAttribute(name,value){this[name]=value;}};
const view=new RouteMap(canvas);view.update(app.duel.course,{...s,status:'racing',checkpointRush:{...s.checkpointRush,passed:7,nextGate:7}},0);
check(canvas['aria-label'].includes(`7 of ${required} gates passed`)&&canvas['aria-label'].includes('Gold marks the next gate'),'live map describes progress and next-gate highlighting accessibly');view.dispose();

// Settlement fixtures isolate missing goals and interruption from driving rules.
memory.clear();app=create();app.startCampaign({startStage:index,cpuDifficulty:'easy'});s=app.duel.state;
const valid={runId:'earlier-checkpoint-record',stageIndex:index,car:s.car,mode:s.mode,difficulty:s.difficulty,cpuDifficulty:'easy',seed:s.seed,completed:true,won:true,targetsMet:true,checkpointRush:true,checkpointsPassed:required,checkpointsRequired:required,checkpointMisses:0,timeSec:stage.checkpointRush.initialTimeSec.easy+required*stage.checkpointRush.extensionSec.easy-5,laps:2};
app.profile.personalBests[bestKey(valid)]=valid.timeSec;app._saveProfile();
s.status='racing';s.stageTimeSec=20;s.s=app.duel.raceLength;s.completedLaps=s.lapsTotal;s.lap=s.currentLap=s.lapsTotal;s.lapTimes=[10,10];s.checkpointRush.passed=required-1;s.checkpointRush.nextGate=required;s.checkpointRush.missed=1;
const before=app.profile.credits;app.duel._finishStage();result=s.results;
check(result.completed&&!result.won&&result.objectiveMissed,'valid laps with a missed gate lose the objective');
check(result.creditReward===-CPU_REWARDS.easy/2&&result.creditBreakdown.personalBest===0,'missed gate charges half the win reward without a faster-time bonus');
check(app.profile.personalBests[bestKey(valid)]===valid.timeSec&&app.leaderboard.entries.length===0&&app.ghosts.records.length===0,'failed checkpoint goal cannot overwrite a PB, board or ghost');
app.duel.emit({stageResult:result});check(app.profile.credits===before-CPU_REWARDS.easy/2,'failed objective settles only once');

app.returnToMenu();app.startCampaign({startStage:index,cpuDifficulty:'hard'});s=app.duel.state;app.advance(4);const timeoutBalance=app.profile.credits;s.stageTimeSec=s.timeLimitSec;app.duel._deadline();result=s.results;
check(result.timeout&&!result.completed&&!result.won,'clock expiry produces an incomplete objective result');
check(app.profile.credits===timeoutBalance-CPU_REWARDS.hard/2&&app.leaderboard.entries.length===0,'timeout charges one Hard loss and cannot enter local records');
app.duel.emit({stageResult:result});check(app.profile.credits===timeoutBalance-CPU_REWARDS.hard/2,'duplicate timeout does not charge again');

app.returnToMenu();app.startCampaign({startStage:index,cpuDifficulty:'medium'});app.advance(4);const retryBalance=app.profile.credits;
app.duel.emit({checkpointRushEvent:{type:'passed',index:0,extensionSec:8,passed:1,total:required}});check(app.checkpointNotice.type==='passed'&&app.checkpointNotice.extensionSec===8,'App keeps brief time-gained notice');
app.duel.emit({checkpointRushEvent:{type:'missed',index:1,extensionSec:0,passed:1,total:required}});check(app.checkpointNotice.type==='missed'&&app.checkpointNotice.extensionSec===0,'missed gate notice never promises an extension');
app.restart();check(app.profile.credits===retryBalance&&app.duel.state.checkpointRush.passed===0&&app.checkpointNotice===null,'restart preserves banked credits and resets checkpoints and notices');
app.restart();check(app.profile.credits===retryBalance,'restarting an untouched countdown is free');
app.advance(4);const interruptedBalance=app.profile.credits;const recovered=new App();check(recovered.profile.credits===interruptedBalance&&!recovered.profile.activeRace,'reload forfeits interrupted checkpoint earnings without debiting bank');
check(new App().profile.credits===recovered.profile.credits,'second reload cannot repeat interruption debit');
app.returnToMenu();const oldState={...app.duel.state};check(app.addPlayer('Timberline newcomer').ok,'new local player can be created');app._settleResult({...valid},oldState);
check(app.profile.credits===0&&app.profile.history.length===0,'late old-player checkpoint result cannot credit another profile');
check(!app.startCampaign({startStage:index}),'second player does not inherit course ownership');ownTestCourses(app);check(app.startCampaign({startStage:index,car:'dusthawk_rally'})&&app.duel.state.car==='falcone_f42','a second player can enter but cannot use another player’s locked Dusthawk');

for(const invalid of [{won:false},{targetsMet:false},{objectiveMissed:true},{checkpointsPassed:required-1},{checkpointsPassed:required+1},{checkpointsRequired:required-1},{checkpointMisses:1},{checkpointMisses:NaN},{timeSec:stage.checkpointRush.initialTimeSec.easy+required*stage.checkpointRush.extensionSec.easy+1},{completed:false},{abandoned:true},{timeout:true},{laps:1},{car:'missing'}]){
  const outcome={...valid,...invalid};check(!isValidFinish(outcome),'incomplete or malformed checkpoint result cannot qualify for records');
  const payment=settleRace({...createProfile(),credits:1000},outcome);check(payment.breakdown.personalBest===0&&payment.breakdown.base===(outcome.abandoned?0:-CPU_REWARDS.easy/2),'invalid result earns no best bonus; abandonment preserves bank while genuine loss retains its charge');
  check(!recordFinish(createLeaderboard(),outcome,{id:'p',name:'Player'}).recorded,'leaderboard rejects invalid checkpoint metadata');
}
const recorded=recordFinish(createLeaderboard(),valid,{id:'p',name:'Player'});check(recorded.recorded,'valid fixture can be recorded');saveLeaderboard(recorded.board);check(loadLeaderboard().entries.length===1,'valid checkpoint board row normalizes on reload');
saveLeaderboard({version:1,entries:recorded.board.entries.map(row=>({...row,checkpointMisses:1}))});check(loadLeaderboard().entries.length===0,'loaded checkpoint row with missed gates is discarded');
console.log(`Checkpoint App/rewards: ${checks} input, HUD map, gate records, loss, interruption and player-isolation checks passed.`);

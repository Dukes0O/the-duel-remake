import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {CPU_REWARDS,createProfile,settleRace,bestKey,isValidFinish} from '../src/progression.js';
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const index=COURSE.findIndex(stage=>stage.kind==='drift'),stage=COURSE[index];assert(stage,'Drift event exists');
const create=()=>{const app=new App();app.profile.credits=20000;app._saveProfile();check(app.unlockCar(stage.requiredCar).ok,'muscle car unlock succeeds');return app;};
const starter=new App();check(starter.startCampaign({startStage:index,car:'falcone_f42'}),'a starter car can enter drift trial without the recommended car');check(starter.duel.state.car==='falcone_f42','drift entry preserves the chosen owned vehicle');starter.returnToMenu();
let example;
for(const cpuDifficulty of ['easy','medium','hard']){
  memory.clear();const app=create();app.autopilot=true;let banks=0,sawChain=false,sawNotice=false;app.duel.onChange((_state,event)=>{if(event.driftBanked)banks++;});
  check(app.startCampaign({startStage:index,car:stage.requiredCar,mode:'timetrial',cpuDifficulty,seed:42}),'owned drift event starts');
  const state=app.duel.state;check(state.mode==='duel'&&state.car===stage.requiredCar&&state.seed===1989,'event snapshots the explicitly selected car, objective mode and fixed layout');
  check(state.rival===null&&state.traffic.length===0&&!state.police.pursuit?.active,'drift event has no CPU, traffic or pursuit');check(app.ghostRecorder===null,'objective event never records a Time Trial ghost');
  for(let i=0;i<1800&&['countdown','racing','ticket'].includes(state.status);i++){app.advance(.1);sawChain||=(state.drift?.chainScore||0)>0;sawNotice||=!!app.driftNotice;}
  const result=state.results;check(result?.completed&&result.won&&result.targetsMet,`${cpuDifficulty}: ordinary App steering completes both laps and score target`);
  check(result.driftScore>=stage.driftTrial.targets[cpuDifficulty]&&result.timeSec<=stage.driftTrial.timeLimitSec[cpuDifficulty],'real score and deadline satisfy configured difficulty');
  check(sawChain&&sawNotice&&banks>0,'live chain and bank events are available to the HUD during the actual run');
  check(result.creditBreakdown.base===CPU_REWARDS[cpuDifficulty],'drift win pays the ordinary difficulty base');
  check(result.creditBreakdown.drift===({easy:60,medium:50,hard:0})[cpuDifficulty],'input demo receives the expected capped score tier');
  check(result.personalBest&&Number.isFinite(app.profile.personalBests[bestKey({...result,stageIndex:index,car:state.car,mode:state.mode,difficulty:state.difficulty,cpuDifficulty,laps:2})]),'successful objective sets a comparable car best');
  check(app.leaderboard.entries.length===1&&app.ghosts.records.length===0,'valid trial enters local leaderboard without creating a ghost');
  check(app.leaderboard.entries[0].driftScore===result.driftScore&&app.leaderboard.entries[0].driftTarget===result.driftTarget&&result.driftScoreBest===result.driftScore,'actual App finish persists banked score/target and exposes local car score best');
  const balance=app.profile.credits;app.duel.emit({stageResult:result});check(app.profile.credits===balance,'duplicate finish cannot repeat reward');check(new App().profile.credits===balance,'actual drift reward survives reload');
  console.log(`Drift App ${cpuDifficulty}: ${result.timeSec}s, ${result.driftScore} banked, ${result.driftBestChain} best chain, +${result.creditReward}CR`);
  if(cpuDifficulty==='easy')example={app,state,result,balance};
}

// Settlement boundary fixtures isolate missed objectives from race physics.
memory.clear();let app=create();app.startCampaign({startStage:index,cpuDifficulty:'easy'});let s=app.duel.state;
const priorResult={runId:'prior-record',stageIndex:index,car:s.car,mode:s.mode,difficulty:s.difficulty,cpuDifficulty:'easy',seed:s.seed,completed:true,won:true,targetsMet:true,driftScore:4000,timeSec:130,laps:2};
app.profile.personalBests[bestKey(priorResult)]=130;app._saveProfile();
s.status='racing';s.stageTimeSec=90;s.s=app.duel.raceLength;s.completedLaps=s.lapsTotal;s.lap=s.currentLap=s.lapsTotal;s.lapTimes=[45,45];s.drift.bankedScore=stage.driftTrial.targets.easy-1;s.drift.chainScore=0;
const before=app.profile.credits;app.duel._finishStage();let result=s.results;
check(result.completed&&!result.won&&result.objectiveMissed,'valid two-lap finish can miss the drift objective');
check(result.creditReward===-300&&result.creditBreakdown.personalBest===0&&result.creditBreakdown.drift===0,'missed target gets only the standard loss even with a faster time');
check(app.profile.personalBests[bestKey(priorResult)]===130&&app.leaderboard.entries.length===0&&app.ghosts.records.length===0,'failed target cannot replace PB, leaderboard or ghost');
check(app.profile.history.at(-1).completed===true&&app.profile.history.at(-1).won===false,'history preserves completed laps while recording the failed objective');
app.duel.emit({stageResult:result});check(app.profile.credits===before-300,'repeated failed result cannot charge twice');
app.returnToMenu();app.startCampaign({startStage:index,cpuDifficulty:'hard'});s=app.duel.state;app.advance(4);const deadlineBalance=app.profile.credits;s.stageTimeSec=s.timeLimitSec;app.duel._deadline();result=s.results;
check(result.timeout&&!result.completed&&!result.won,'drift timeout is incomplete and unsuccessful');check(app.profile.credits===deadlineBalance-750&&result.creditBreakdown.drift===0,'Hard timeout charges exactly half the base without score bonus');
check(!s.catastrophic&&s.lives>0,'deadline preserves the persistent vehicle');app.duel.emit({stageResult:result});check(app.profile.credits===deadlineBalance-750,'timeout settles once');
app.returnToMenu();app.startCampaign({startStage:index,cpuDifficulty:'medium'});app.advance(4);const retryBalance=app.profile.credits;app.duel.emit({driftBanked:{points:400,total:400}});check(app.driftNotice.type==='banked'&&app.driftNotice.points===400,'App retains brief bank notice');app.duel.emit({driftChainLost:{reason:'hit',points:220}});check(app.driftNotice.type==='lost'&&app.driftNotice.reason==='hit','App retains the reason a live chain was lost');
app.restart();check(app.profile.credits===retryBalance&&app.duel.state.drift.bankedScore===0&&app.driftNotice===null,'restart keeps banked credits and clears unbanked chain/notice');app.restart();check(app.profile.credits===retryBalance,'restarting the fresh countdown also preserves the bank');
app.advance(4);const interruptedBalance=app.profile.credits;const recovered=new App();check(recovered.profile.credits===interruptedBalance&&!recovered.profile.activeRace,'reload forfeits the interrupted drift attempt without bank debit');check(new App().profile.credits===interruptedBalance,'second reload does not charge again');
app.returnToMenu();const oldState={...app.duel.state},oldResult={...priorResult};app.addPlayer('Independent drift driver');app._settleResult(oldResult,oldState);check(app.profile.credits===0&&app.profile.history.length===0,'late old-player drift result cannot pay another local player');check(app.startCampaign({startStage:index,car:'banshee_muscle'})&&app.duel.state.car==='falcone_f42','new player can enter but cannot use another player’s locked Banshee');

for(const [ratio,expected]of [[1,0],[1.249,0],[1.25,30],[1.5,60],[2,90],[50,90]]){const payout=settleRace(createProfile(),{...priorResult,runId:`tier-${ratio}`,timeSec:100,driftScore:Math.round(stage.driftTrial.targets.easy*ratio)});check(payout.breakdown.drift===expected,`score tier ${ratio}x awards ${expected}CR with a15% cap`);check(!settleRace(payout.profile,{...priorResult,runId:`tier-${ratio}`}).awarded,'drift performance tier is idempotent');}
for(const invalid of [{won:false},{targetsMet:false},{objectiveMissed:true},{driftScore:3499},{driftScore:Infinity},{driftScore:NaN},{timeSec:151},{completed:false},{abandoned:true},{timeout:true},{laps:1},{car:'missing'}]){
  const outcome={...priorResult,...invalid};check(!isValidFinish(outcome),'invalid drift objective cannot qualify for records');const payment=settleRace({...createProfile(),credits:1000},outcome);check(payment.breakdown.drift===0&&payment.breakdown.personalBest===0,'invalid drift finish cannot pay record or score bonus');
}
const circuit=COURSE.findIndex(item=>!item.kind),ordinary={...priorResult,runId:'ordinary-loss',stageIndex:circuit,car:'falcone_f42',won:false,timeSec:100},profile={...createProfile(),credits:1000,personalBests:{[bestKey(ordinary)]:110}};
const loss=settleRace(profile,ordinary);check(loss.breakdown.base===-300&&loss.breakdown.personalBest===120,'ordinary completed race losses still earn a valid improvement bonus');
console.log(`Drift App/rewards: ${checks} actual input, objective, record, bonus, interruption and player-isolation checks passed`);

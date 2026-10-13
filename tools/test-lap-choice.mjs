import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {createProfile,normalizeProfile,settleRace,CPU_REWARDS,DRIVING_MILESTONES,eventKey,isValidFinish,PLAYERS_KEY} from '../src/progression.js';
import {createLeaderboard,recordFinish,saveLeaderboard,loadLeaderboard} from '../src/leaderboard.js';
import {GrandPrixLapRecorder,ghostKey} from '../src/ghost.js';
import {finishQualifying} from '../src/qualifying.js';
import {createResultsScreen} from '../src/screen-results.js';
import {createLeaderboardScreen} from '../src/screen-leaderboard.js';
import {ownTestCourses} from './career-fixture.mjs';
import {chosenRaceLaps,offeredRaceLaps,supportsLapChoice,distanceFinishingPay,raceDistanceLabel} from '../src/lap-choice.js';

let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const switches=on=>({enabled:name=>name==='grand-prix'||name==='grand-prix-career'||on&&name==='lap-choice'});
const start=(mode,laps,on=true,extra={})=>{const duel=new Duel({featureFlags:switches(on)});duel.startCampaign({mode,laps,car:'falcone_f42',startStage:0,seed:1989,fieldSeed:42,...extra});return duel;};
const profile=()=>({...createProfile(),credits:5000,milestones:Object.keys(DRIVING_MILESTONES)});
const finish=(extra={})=>({runId:'lap-choice-test',stageIndex:0,car:'falcone_f42',driverId:'club',mode:'duel',difficulty:'casual',cpuDifficulty:'easy',seed:1989,laps:5,completed:true,won:true,timeSec:400,lapChoiceEnabled:true,...extra});

for(const mode of ['duel','grandprix'])for(const laps of [5,10]){
  const duel=start(mode,laps,true,{opponentCount:3});
  equal(duel.state.lapsTotal,laps,'Chosen length reaches the shared player and CPU target');
  equal(duel.raceLength,4000*laps,'The real race finish moves to the chosen length');
  if(duel.state.field)equal(duel.state.field.laps,laps,'GP field metadata agrees');
  for(const actor of [duel.state,...duel.state.opponents]){
    for(let lap=0;lap<laps;lap++)for(const gate of [...duel._lapGates,duel.course.length]){
      const at=lap*duel.course.length+gate;
      actor.prevS=at-1;actor.s=at+1;actor.lateral=actor.prevLateral=0;actor.speedMph=100;
      duel.state.stageTimeSec+=30;duel._advanceLaps(actor,1/120);
    }
    equal(actor.completedLaps,laps,'Actual ordered native gates admit every player/CPU lap');
    duel._advanceLaps(actor,1/120);equal(actor.completedLaps,laps,'The chosen finish is a hard lap bound');
  }
  duel.state.status='racing';duel._finishStage();
  equal(duel.state.results.laps,laps,'Native completed result carries the chosen identity');
}
for(const mode of ['duel','grandprix']){
  const initial=mode==='grandprix'?3:2;
  const off=start(mode,10,false),normal=start(mode,initial,true);
  equal(off.state.lapsTotal,initial,'Disabled switch ignores an explicit long race');
  equal(off.state,normal.state,'Default native race state stays exact across the switch');
  for(let i=0;i<60;i++){off.step(1/120);normal.step(1/120);}
  equal(off.state,normal.state,'Identical default inputs retain exact replay state');
  equal(chosenRaceLaps(COURSE[0],mode,4,true),initial,'Unapproved shorter/intermediate choices return the default');
}
for(const stage of COURSE)for(const mode of ['duel','grandprix','timetrial','wasteland']){
  if(stage.closed===false||stage.practice||stage.arena||stage.stuntTrial||['chase','drift','checkpoint'].includes(stage.kind)||['timetrial','wasteland'].includes(mode)){
    equal(supportsLapChoice(stage,mode),false,'Excluded event/mode keeps its fixed rules');
    equal(offeredRaceLaps(stage,mode).length,1,'Excluded events offer no alternate length');
  }
}
equal(offeredRaceLaps({closed:true,laps:6},'duel'),[6,10],'Never offer fewer laps than the authored default');
equal(distanceFinishingPay(47,{closed:true,lengthU:1000},5,'duel',true),47,'Floor-one pay is byte-exact, without rounding');
equal(distanceFinishingPay(1,{closed:true,lengthU:1700},5,'duel',true),1,'Nearest-five rounding never lowers the old component');
equal(raceDistanceLabel({lengthU:4200},10,'duel'),'10 laps · 42.0 km · x5.25','Distance display uses kilometres and the actual factor');

for(const [cpu,base]of Object.entries(CPU_REWARDS))for(const difficulty of ['casual','pro'])for(const laps of [2,5,10]){
  const payload=finish({cpuDifficulty:cpu,difficulty,laps,clean:true,policeEscapes:2});
  const old=settleRace(profile(),{...payload,lapChoiceEnabled:false});
  const scaled=settleRace(profile(),payload);
  const finishing=laps===2?base:base*(laps/2);
  equal(scaled.breakdown.base,finishing,'Classic distance scales only the positive finishing base');
  for(const name of ['clean','personalBest','streak','police','milestones','policeFines'])equal(scaled.breakdown[name],old.breakdown[name],'Original bonus/fine/milestone component stays exact');
  equal(scaled.reward-old.reward,(finishing-base)*(difficulty==='pro'?2:1),'Pro duplicates the scaled finish and leaves bonus duplication exact');
  equal(settleRace(scaled.profile,payload).awarded,false,'A longer race cannot settle twice');
}
for(const [cpu,base]of Object.entries(CPU_REWARDS))for(let position=1;position<=8;position++)for(const difficulty of ['casual','pro']){
  const payload=finish({mode:'grandprix',grandPrixCareerEnabled:true,position,fieldSize:8,won:position===1,cpuDifficulty:cpu,difficulty,snowmen:2});
  const old=settleRace(profile(),{...payload,lapChoiceEnabled:false}),scaled=settleRace(profile(),payload);
  const expected=Math.max(old.breakdown.base,Math.round(old.breakdown.base*2.5/5)*5);
  equal(scaled.breakdown.base,expected,'Every original GP position share uses the distance factor');
  equal(scaled.breakdown.snowmen,50,'Snowman bonus stays fixed');
  equal(scaled.reward-old.reward,(expected-old.breakdown.base)*(difficulty==='pro'?2:1),'GP Pro order and bonuses stay exact');
}
for(const extra of [{completed:false,won:true},{timeout:true},{abandoned:true},{laps:4}]){
  const payload=finish(extra),scaled=settleRace(profile(),payload),old=settleRace(profile(),{...payload,lapChoiceEnabled:false});
  equal(scaled.reward,old.reward,'Incomplete/invalid runs gain no distance earnings and retain loss rules');
  equal(isValidFinish(payload),false,'Incomplete/invalid finishes cannot enter records');
}
const board=createLeaderboard(),player={id:'lap-owner',name:'Lap Owner'};
let records=board;
for(const laps of [2,5,10]){
  const payload=finish({laps,timeSec:100*laps});
  const added=recordFinish(records,payload,player);ok(added.recorded,'Each offered lap count stores a valid separate finish');records=added.board;
}
equal(new Set(records.entries.map(row=>row.eventKey)).size,3,'Lap count remains part of the existing event identity');
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
ok(saveLeaderboard(records,storage),'Offered records save through the original version-one store');
equal(loadLeaderboard(storage).entries.length,3,'Offered records survive normalization without an active runtime flag');
equal(normalizeProfile(profile()).raceSettings,profile().raceSettings,'Existing profile settings retain their original shape');
const recorder=new GrandPrixLapRecorder({stageIndex:0,playerId:player.id,seed:1989,car:'falcone_f42',driverId:'club',difficulty:'casual',cpuDifficulty:'easy'},4000);
equal(recorder.context.laps,1,'GP best-lap ghost stays a single lap');
ok(ghostKey(player.id,recorder.context).includes('|laps:1|'),'GP ghost identity does not include race choice');

// Existing App and storage facade exercise player/session ownership without disk saves.
globalThis.localStorage=storage;memory.clear();
const app=new App();app.duel.featureFlags=switches(true);ownTestCourses(app);
const originalPlayer=app.player.id;
app.setRaceSettings({startStage:0,mode:'duel'});
const before=memory.get(PLAYERS_KEY);app.setLapChoice(10);
equal(memory.get(PLAYERS_KEY),before,'Choosing laps writes no saved preference');
equal(app.getRaceChoices().laps,10,'Menu choices expose the current session length');
app.setRaceSettings({startStage:1});equal(app.getRaceChoices().laps,2,'Another event starts at its own default');
app.setRaceSettings({startStage:0});equal(app.getRaceChoices().laps,10,'Returning to an event restores its session choice');
app.setRaceSettings({mode:'grandprix'});equal(app.getRaceChoices().laps,3,'GP has a separate choice from Duel');
app.setLapChoice(5);app.startCampaign({mode:'grandprix',qualifying:true,fieldSeed:42});
equal(app.duel.state.lapsTotal,2,'Optional qualifying retains its two-lap target');
app.duel.state.qualifying.timing='timed';app.duel.state.completedLaps=2;app.duel.state.lapTimes=[90,91];app.duel.state.assistedLaps=[false,false];
ok(finishQualifying(app.duel),'Existing qualifying completes normally');
equal(app.duel.state.lapsTotal,5,'The chosen GP length survives qualifying reload');
app.restart();equal(app.duel.state.lapsTotal,5,'Restart preserves the session choice');
app.returnToMenu();app.setRaceSettings({mode:'duel'});
const newPlayer=app.addPlayer('Other Driver');ok(newPlayer.ok,'Existing local player operation works');ownTestCourses(app);
equal(app.getRaceChoices().laps,2,'Another player does not inherit the first choice');
app.selectPlayer(originalPlayer);equal(app.getRaceChoices().laps,10,'Switching back restores only this player choice');
const reloaded=new App();reloaded.duel.featureFlags=switches(true);equal(reloaded.getRaceChoices().laps,2,'Reload starts a fresh session at default');

const renderApp={duel:{state:{mode:'duel',stageIndex:0}},_switches:()=>switches(true),player,profile:profile(),getMenuSeed:()=>1989,getMenuRouteLabel:()=> 'Route A',grandPrixAvailable:()=>true,leaderboard:records};
const result={...finish({laps:10}),creditReward:3000,creditBalance:8000};
const state={stageIndex:0,mode:'duel',status:'stage_result',results:result,lapsTotal:10};
const markup=createResultsScreen({app:renderApp,profile:()=>renderApp.profile,credits:String,escapeHTML:String,time:String})(state);
ok(markup.includes('10 laps · 40.0 km · x5.00'),'Results show the chosen distance directly under pay');
const leaderboardMarkup=createLeaderboardScreen({app:renderApp,boardFilter:{stage:0,laps:10,car:'',driverId:'club'},escapeHTML:String,credits:String,time:String})();
ok(leaderboardMarkup.includes('Lap Owner')&&leaderboardMarkup.includes('data-board-filter="laps"'),'Leaderboard exposes the chosen-length record');
console.log(`PASS LAP-CHOICE: ${checks} assertions`);

import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {bestKey,loadProfile} from '../src/progression.js';
import {driverModifierSignature} from '../src/drivers.js';
import {getLeaderboard,loadLeaderboard} from '../src/leaderboard.js';
import {findGhost,loadGhosts} from '../src/ghost.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const previousStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App(),stageIndex=COURSE.findIndex(stage=>!stage.kind),options={car:'falcone_f42',startStage:stageIndex,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',routeVariant:'route_a'};
  app.profile.credits=1500;app._saveProfile();check(app.purchaseDriver('mara_vale').ok,'test wallet purchases the specialist through the normal API');
  const runs=[];
  for(const driverId of ['club','mara_vale']){
    app.returnToMenu();check(app.selectDriver(driverId).ok,'owned race driver is explicitly selected');app.setRaceSettings(options);app.autopilot=true;
    same(app.getGhostRecord(options),null,'first attempt does not borrow the other performance class ghost');
    check(app.startCampaign(),'normal race starts from the saved visible setup');
    const state=app.duel.state,poses=[];same(state.driverId,driverId,'physics snapshots the selected driver');
    same(app.ghostStatus,'recording','incompatible ghost is not played at startup');
    // Two complete races, driven by the ordinary input-only demo controller.
    // No position, speed, contact, gate, lap, clock or result is injected.
    for(let frame=0;frame<3000&&['countdown','racing','ticket'].includes(state.status);frame++){
      app.advance(.1);
      if(frame%10===0)poses.push([state.s,state.lateral,state.headingError,state.speedMph]);
    }
    check(state.status==='stage_result'&&state.results?.completed,'actual input crosses every gate and completes both laps');
    same(state.completedLaps,state.lapsTotal,'validated lap count reaches the actual finish');
    same(state.results.personalBestStatus,'baseline','first enhanced finish is not paid as an improvement on a neutral record');
    same(state.results.creditBreakdown.personalBest,0,'a distinct class baseline cannot earn incompatible best credits');
    const context={...options,stageIndex,driverId,seed:state.seed,laps:state.lapsTotal};
    const key=bestKey(context);same(app.profile.personalBests[key],state.results.timeSec,'App saves the actual time in its compatible class');
    const ghost=app.getGhostRecord(context);check(!!ghost&&state.results.ghostRecorded,'actual finish captures the matching replay');
    same(ghost.driverId,driverId,'replay retains actual race driver');same(ghost.driverSignature,driverModifierSignature(driverId,state.car),'replay retains actual modifier class');
    same(ghost.samples.at(-1)[1],Math.round(state.s*100),'replay ends at the actual finish-step position');
    check(ghost.samples.at(-1)[1]>=Math.round(app.duel.raceLength*100),'final replay sample has physically crossed the two-lap finish');
    const balance=app.profile.credits,board=JSON.stringify(app.leaderboard),ghosts=JSON.stringify(app.ghosts);app.duel.emit({stageResult:state.results});
    same(app.profile.credits,balance,'duplicate completion does not pay a second time');same(JSON.stringify(app.leaderboard),board,'duplicate completion does not rewrite its board row');same(JSON.stringify(app.ghosts),ghosts,'duplicate completion does not rewrite its ghost');
    runs.push({context,key,poses,time:state.results.timeSec});
    console.log(`${driverId}: ${state.results.timeSec}s, ${state.stageCrashes} crashes, ${ghost.samples.length} replay samples`);
  }
  check(JSON.stringify(runs[0].poses)!==JSON.stringify(runs[1].poses),'an active grip skill affects real motion rather than merely relabelling identical physics');
  const profile=loadProfile(),board=loadLeaderboard(),ghosts=loadGhosts();
  same(Object.keys(profile.personalBests).sort(),runs.map(run=>run.key).sort(),'exactly two independent performance bests persist');same(board.entries.length,2,'same car/player keeps neutral and enhanced board entries');same(ghosts.records.length,2,'both real recordings survive reload');
  for(const run of runs){
    same(getLeaderboard(board,{car:'falcone_f42',driverId:run.context.driverId}).map(row=>row.timeSec),[run.time],'class filter selects only the compatible real race');
    same(findGhost(ghosts,app.player.id,run.context)?.timeSec,run.time,'reloaded ghost lookup selects the compatible real race');
  }
  const balance=app.profile.credits;app.restart();same(app.duel.state.driverId,'mara_vale','restart keeps the selected enhanced driver');same(app.ghostRecord?.driverId,'mara_vale','restart plays only the enhanced ghost');
  app.advance(4);app.returnToMenu();same(app.profile.credits,balance,'quitting the new driver attempt preserves all banked earnings');
}finally{if(previousStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=previousStorage;}
console.log(`Driver driving: ${checks} real-input completion, bank, immutable settlement and performance-class replay checks passed (two full races).`);

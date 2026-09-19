import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {bestKey,loadProfile} from '../src/progression.js';
import {loadLeaderboard} from '../src/leaderboard.js';
import {loadGhosts} from '../src/ghost.js';

// In-memory storage only. Four complete first-stage runs use the ordinary
// input-only demo driver; no position, speed, collision, or finish is injected.
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
let checks=0;const same=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;},ok=(value,message)=>{assert.ok(value,message);checks++;};
const stageIndex=COURSE.findIndex(stage=>!stage.kind),options={startStage:stageIndex,mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium',routeVariant:'route_a'};
let app=new App();app.profile.credits=2000;app._saveProfile();ok(app.unlockCar('falcone_heritage').ok,'Heritage is purchased through the normal garage API');same(app.profile.credits,200,'purchase uses its exact catalog price');

function drive(car,fps){
  app.returnToMenu();app=new App();app.autopilot=true;app.setRaceSettings({...options,car});ok(app.setRouteVariant('route_a'),'normal menu selects identical seed');
  if(car==='falcone_heritage'&&fps===30)same(app.getGhostRecord({...options,car}),null,'F42 ghost is not borrowed for the first Heritage attempt');
  ok(app.startCampaign(),'race starts from saved visible setup');
  const s=app.duel.state;assert.equal(s.car,car);same(s.seed,1989);same(s.cpuDifficulty,'medium');same(s.mode,'timetrial');same(Object.values(s.upgrades),[0,0,0,0,0,0,0],'both cars use stock builds');
  const hash=createHash('sha256'),samples=[],step=app.duel.step;let steps=0;
  app.duel.step=function(dt){
    const active=['countdown','racing','ticket'].includes(this.state.status);const result=step.call(this,dt);
    if(active){
      // Include all player motion, control, damage and timing data. Compare at
      // the 120 Hz simulation boundary, independent of the display frame rate.
      const p=this.state,pose=[p.status,p.stageTimeSec,p.totalTimeSec,p.s,p.prevS,p.lateral,p.headingError,p.speedMph,p.gear,p.revs,p.airHeight,p.slipAngle,p.crashSpin,p.boost,p.offRoad,p.impactTimer,p.stageCrashes,p.majorCrashes,p.lives,p.racePenaltySec,p.completedLaps,p.score,p.stageStyleScore,p.nearMisses,p.policeEscapes,p.lapTimes,p.input];
      hash.update(JSON.stringify(pose));hash.update('\n');steps++;
      if(steps%120===0)samples.push([steps,p.stageTimeSec,p.s,p.lateral,p.headingError,p.speedMph,p.completedLaps]);
    }
    return result;
  };
  try{for(let frame=0;frame<fps*360&&['countdown','racing','ticket'].includes(s.status);frame++)app.advance(1/fps,1/fps);}
  finally{app.duel.step=step;}
  same(s.status,'stage_result',`${car}@${fps}: stops after one stage, not a campaign`);ok(s.results?.completed,`${car}@${fps}: real driving completes both laps`);same(s.completedLaps,s.lapsTotal);same(s.results.laps,s.lapsTotal);
  const outcome=Object.fromEntries(['won','timeSec','stageTimeSec','laps','lapTimes','lives','score','styleScore','timeBonus','stageCrashes','majorCrashesBeforeRepair','crashesRepaired','livesRestored','jumps','jumpScore','crushCount','crushScore','policeEscapes'].map(key=>[key,s.results[key]]));
  const recordKey=bestKey({...options,car,stageIndex,seed:s.seed,laps:s.lapsTotal});same(app.profile.personalBests[recordKey],s.results.timeSec,'finish has its own saved car-best key');
  const ghost=app.getGhostRecord({...options,car});ok(ghost,'normal finish records its car-specific ghost');same(ghost.car,car);
  // Compare the serialized recording: Web Storage normalizes -0 to 0, so a
  // reloaded tied best and a newly captured best must use that same form.
  const result={car,fps,steps,trajectory:hash.digest('hex'),samples,outcome,ghostSamples:JSON.stringify(ghost.samples)};
  console.log(`${car} @ ${fps} FPS: ${s.results.timeSec}s, ${steps} physics steps, ${s.stageCrashes} crashes, ${result.trajectory.slice(0,16)}`);
  return result;
}

const runs=[];for(const fps of [30,144])for(const car of ['falcone_f42','falcone_heritage'])runs.push(drive(car,fps));
const reference=runs[0];
for(const run of runs.slice(1)){
  same(run.steps,reference.steps,'every car/frame rate takes exactly the same simulation steps');
  same(run.trajectory,reference.trajectory,'full per-step motion/control/damage/timing trajectory is identical');
  same(run.samples,reference.samples,'one-second trajectory samples match exactly');
  same(run.outcome,reference.outcome,'physical finish result matches exactly');
  same(run.ghostSamples,reference.ghostSamples,'saved replay samples match exactly, with separate identities');
}
const savedProfile=loadProfile(),board=loadLeaderboard(),ghosts=loadGhosts();
same(Object.keys(savedProfile.personalBests).length,2,'only two independent car bests exist');same(board.entries.length,2,'same-player F42 and Heritage occupy separate leaderboard rows');same(ghosts.records.length,2,'two separate car ghosts survive reload');
same(new Set(board.entries.map(row=>row.car)),new Set(['falcone_f42','falcone_heritage']));same(new Set(ghosts.records.map(row=>row.car)),new Set(['falcone_f42','falcone_heritage']));
same(board.entries.map(row=>row.timeSec),[reference.outcome.timeSec,reference.outcome.timeSec]);

// Saving Heritage preferences and quitting a short new attempt must neither
// debit the bank nor overwrite either completed car's records.
app.returnToMenu();app.setRaceSettings({...options,car:'falcone_heritage',difficulty:'pro'});app.setRouteVariant('route_b');app.setLightingMood('golden');app.setGhostEnabled(false);
const preferences=structuredClone(app.profile.raceSettings),balance=app.profile.credits,bests=JSON.stringify(app.profile.personalBests),boardBefore=JSON.stringify(loadLeaderboard()),ghostsBefore=JSON.stringify(loadGhosts());
const restored=new App();same(restored.profile.raceSettings,preferences,'Heritage settings survive normal reload');same(restored.getRaceChoices(),{startStage:stageIndex,car:'falcone_heritage',difficulty:'pro',cpuDifficulty:'medium',mode:'timetrial'});same([restored.menuRouteId,restored.lightingMood,restored.ghostEnabled],['route_b','golden',false]);
ok(restored.startCampaign(),'normal start uses stored Heritage setup');same(restored.duel.state.car,'falcone_heritage');same(restored.duel.state.seed,42);restored.advance(4);
same(restored.requestNavigation('menu'),true);same(restored.duel.state.status,'menu','one-click Exit returns immediately');same(restored.profile.activeRace,null,'unfinished Heritage earnings are discarded immediately');
same(restored.profile.credits,balance,'quitting Heritage preserves the bank');same(JSON.stringify(restored.profile.personalBests),bests,'unfinished Heritage attempt cannot rewrite car bests');same(JSON.stringify(loadLeaderboard()),boardBefore,'quit preserves both completed leaderboard rows');same(JSON.stringify(loadGhosts()),ghostsBefore,'quit preserves both completed ghosts');
const afterQuit=new App();same(afterQuit.profile.credits,balance);same(afterQuit.profile.raceSettings,preferences);same(afterQuit.profile.activeRace,null);same(afterQuit.profile.history.at(-1).abandoned,true);same(afterQuit.profile.history.at(-1).charge,0);
console.log(`Heritage driving: ${checks} exact trajectory, finish, record isolation, saved setup and quit-bank checks passed (four complete races).`);

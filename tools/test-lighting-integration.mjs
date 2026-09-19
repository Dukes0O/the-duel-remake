import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {PLAYERS_KEY,bestKey,eventKey} from '../src/progression.js';
import {ghostKey} from '../src/ghost.js';
import {environmentKey} from '../src/environment-key.js';
import {LIGHTING_MOODS,resolveLightingSettings} from '../src/lighting-moods.js';

let checks=0;
const check=(ok,message)=>{assert(ok,message);checks++;};
const same=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
globalThis.localStorage=storage;
const moods=Object.keys(LIGHTING_MOODS),stageIndex=COURSE.findIndex(stage=>!stage.kind);
const options={startStage:stageIndex,stageIndex,mode:'timetrial',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'easy',seed:42,laps:2};
const preferenceKey='duel_lighting_mood';

let app=new App();
check(app.lightingMood==='clear','fresh browser uses clear lighting');
for(const mood of moods){
  check(app.setLightingMood(mood)===mood&&app.lightingMood===mood,`${mood}: supported selection applies`);
  check(memory.get(preferenceKey)===mood,`${mood}: selection persists in its browserwide key`);
  check(new App().lightingMood===mood,`${mood}: a fresh App restores the preference`);
}
for(const value of ['night','Golden','','__proto__',null,{},false,42]){
  check(app.setLightingMood(value)==='clear'&&memory.get(preferenceKey)==='clear','invalid setter value becomes persisted clear');
}
memory.set(preferenceKey,'corrupt-value');
check(new App().lightingMood==='clear','invalid stored value falls back to clear');

// This display preference lives outside player progression and never writes a wallet.
memory.clear();app=new App();
const firstId=app.player.id;
app.profile.credits=2000;app._saveProfile();
const firstSave=memory.get(PLAYERS_KEY);
app.setLightingMood('golden');
check(memory.get(PLAYERS_KEY)===firstSave,'changing lighting does not rewrite the player registry');
app.addPlayer('Lighting driver');
const secondId=app.player.id;
check(secondId!==firstId&&app.profile.credits===0&&app.lightingMood==='golden','new player starts an isolated wallet while retaining browser lighting');
app.profile.credits=600;app._saveProfile();app.setLightingMood('overcast');
app.selectPlayer(firstId);
check(app.profile.credits===2000&&app.lightingMood==='overcast','returning to the first player restores only their wallet');
app.selectPlayer(secondId);
check(app.profile.credits===600&&app.lightingMood==='overcast','second player retains their own wallet and shared display preference');
check(app.players.players.every(player=>!Object.hasOwn(player.profile,'lightingMood')),'lighting does not leak into per-player profile data');
const restored=new App();
check(restored.player.id===secondId&&restored.profile.credits===600&&restored.lightingMood==='overcast','reload restores active player, wallet and independent lighting preference');

// Cached menu geometry and live simulation must be unchanged even when lighting
// changes during countdown, an active race, or pause.
memory.clear();app=new App();app.setRouteVariant('route_b');
const previews=[app.getMenuCourse(stageIndex),app.getMenuCourse(stageIndex+1)];
const cacheSize=app._menuCourses.size,menuState=JSON.stringify(app.duel.state);
for(const mood of moods){
  app.setLightingMood(mood);
  check(app.getMenuCourse(stageIndex)===previews[0]&&app.getMenuCourse(stageIndex+1)===previews[1],`${mood}: menu Course objects retain their identities`);
  check(app._menuCourses.size===cacheSize&&JSON.stringify(app.duel.state)===menuState,`${mood}: cache size and menu simulation are unchanged`);
}
app.startCampaign(options);app.autopilot=true;
const liveCourse=app.duel.course,worldKey=environmentKey(liveCourse),context=app.ghostRecorder.context;
const recordKeys=[bestKey(context),eventKey(context),ghostKey(app.player.id,context)];
for(const phase of ['countdown','racing','paused']){
  if(phase==='racing')app.advance(5);
  if(phase==='paused')app.togglePause();
  const before=JSON.stringify(app.duel.state),samples=JSON.stringify(app.ghostRecorder.samples),wallet=memory.get(PLAYERS_KEY),runId=app.runId;
  const emitted=[];app.duel.onChange((_state,event)=>{if(event.lightingMood)emitted.push(event.lightingMood);});
  for(const mood of moods){
    app.setLightingMood(mood);
    check(app.duel.course===liveCourse&&environmentKey(app.duel.course)===worldKey,`${phase}/${mood}: changing light cannot rebuild or change live geometry`);
    check(JSON.stringify(app.duel.state)===before&&app.runId===runId,`${phase}/${mood}: race state and settlement identity stay unchanged`);
    check(app.ghostRecorder.context===context&&JSON.stringify(app.ghostRecorder.samples)===samples,`${phase}/${mood}: ghost recording remains untouched`);
    same([bestKey(context),eventKey(context),ghostKey(app.player.id,context)],recordKeys,`${phase}/${mood}: comparable record identities stay unchanged`);
    check(memory.get(PLAYERS_KEY)===wallet&&app.getMenuCourse(stageIndex)===previews[0],`${phase}/${mood}: wallet and menu geometry stay untouched`);
  }
  same(emitted,moods,`${phase}: the view receives each selected mood`);
}
app.returnToMenu();

// Three complete runs use the real App input/autopilot and fixed-step physics.
// Hash each sampled trajectory and all recorded ghost points, not just finish time.
const runs=[];
for(const mood of moods){
  memory.clear();app=new App();app.setRouteVariant('route_b');app.setLightingMood(mood);app.autopilot=true;app.startCampaign(options);
  const hash=createHash('sha256');let samples=0;
  while(['countdown','racing','ticket'].includes(app.duel.state.status)&&samples<3500){
    app.advance(.1);const state=app.duel.state;
    hash.update(JSON.stringify({status:state.status,s:state.s,lateral:state.lateral,headingError:state.headingError,speedMph:state.speedMph,
      revs:state.revs,boost:state.boost,slipAngle:state.slipAngle,majorCrashes:state.majorCrashes,currentLap:state.currentLap,
      completedLaps:state.completedLaps,stageTimeSec:state.stageTimeSec,racePenaltySec:state.racePenaltySec,offRoad:state.offRoad,
      preparedGravel:state.preparedGravel,airHeight:state.airHeight,gear:state.gear,score:state.score,input:app.duel.input}));
    samples++;
  }
  const result=app.duel.state.results,ghost=app.getGhostRecord(options);
  check(result?.completed&&result.won&&result.laps===2,`${mood}: actual input completes a valid two-lap Time Trial`);
  check(ghost?.samples.length>400&&ghost.timeSec===result.timeSec,`${mood}: a complete local ghost was recorded`);
  check(app.profile.personalBests[bestKey(options)]===result.timeSec,`${mood}: completed car best is saved under the same record key`);
  check(app.leaderboard.entries.length===1,`${mood}: one local leaderboard result is saved`);
  const before={profile:JSON.stringify(app.profile),board:JSON.stringify(app.leaderboard),ghosts:JSON.stringify(app.ghosts)};
  app.returnToMenu();
  for(const next of moods){
    app.setLightingMood(next);
    check(app.getGhostRecord(options)===ghost,`${mood} to ${next}: changing light keeps the same compatible ghost`);
    same({profile:JSON.stringify(app.profile),board:JSON.stringify(app.leaderboard),ghosts:JSON.stringify(app.ghosts)},before,`${mood} to ${next}: lighting cannot add or alter recorded results`);
  }
  runs.push({mood,samples,trajectory:hash.digest('hex'),ghost:createHash('sha256').update(JSON.stringify(ghost.samples)).digest('hex'),
    timeSec:result.timeSec,reward:result.creditReward,breakdown:result.creditBreakdown,bestKey:bestKey(options),ghostKey:ghost.key});
}
for(const run of runs.slice(1)){
  const {mood,...actual}=run,{mood:baselineMood,...baseline}=runs[0];
  same(actual,baseline,`${mood}: physics trajectory, ghost points and rewards exactly match ${baselineMood}`);
}

for(const stage of COURSE.filter(stage=>stage.timeOfDay==='night'||stage.theme==='city')){
  const reference=resolveLightingSettings(stage.theme,{mood:'clear',night:true});
  for(const mood of moods){
    check(resolveLightingSettings(stage.theme,{mood,night:true})===reference,`${stage.id}/${mood}: night settings are fixed independently of outdoor selection`);
    check(resolveLightingSettings(stage.theme,{mood,night:true,tunnel:true})===resolveLightingSettings('city',{tunnel:true}),`${stage.id}/${mood}: tunnel-night settings are also fixed`);
  }
}
check(resolveLightingSettings('alpine',{mood:'golden'})!==resolveLightingSettings('alpine',{mood:'clear'}),'outdoor mood actually selects different cached visual settings');
check(resolveLightingSettings('coast',{mood:'overcast'}).sun<resolveLightingSettings('coast',{mood:'clear'}).sun,'overcast lowers the direct sunlight');

globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
app=new App();check(app.lightingMood==='clear','blocked storage starts with a safe default');
check(app.setLightingMood('overcast')==='overcast'&&app.lightingMood==='overcast','blocked storage permits session-only visual changes');
check(new App().lightingMood==='clear','blocked-storage reload cannot invent a saved preference');
delete globalThis.localStorage;
app=new App();check(app.lightingMood==='clear'&&app.setLightingMood('golden')==='golden','missing storage also supports the default and session-only selection');

console.log(`Lighting App integration: ${checks} preference, profile, cache, race and record-isolation checks passed.`);
console.log(JSON.stringify(runs.map(({mood,samples,timeSec,trajectory})=>({mood,samples,timeSec,trajectory})),null,2));

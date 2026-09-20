import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {CARS,COURSE} from '../src/config.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createProfile,CPU_REWARDS,isCarUnlocked,bestKey,eventKey,isValidFinish,UPGRADE_TYPES} from '../src/progression.js';
import {getEquippedDriverId} from '../src/drivers.js';
import {getLeaderboard} from '../src/leaderboard.js';
import {supportsRouteVariants,getRouteVariantForSeed} from '../src/route-variants.js';
import {syncRaceChoiceButtons} from '../src/race-settings-ui.js';
import {COURSE_PRICES,isCourseUnlocked} from '../src/course-access.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App();
  // Vehicle eligibility is independent of the course-purchase regression suite.
  const allCourses={version:1,unlocked:COURSE.map(course=>course.id)};
  app.profile.courses=allCourses;app._saveProfile();
  for(const [startStage,event]of COURSE.entries()){
    app.setRaceSettings({startStage,car:'stuttgart_959s'});same(app.getRaceChoices().startStage,startStage,'every course is visible before buying the recommended vehicle');same(app.getRaceChoices().car,'stuttgart_959s','course selection keeps the chosen starter');
    check(app.startCampaign(),'every course accepts an owned starter');same(app.duel.state.car,'stuttgart_959s','physics does not replace the starter');same(app.duel.state.stageIndex,startStage,'entry does not redirect to an easier course');app.returnToMenu();
    const normalized=normalizeRaceSettings({eventId:event.id,car:'titan_monster'},{...createProfile(),courses:allCourses});same(normalized.eventId,event.id,'locked-car settings do not lock their owned course');same(normalized.car,'falcone_f42','locked-car settings cannot grant the recommended car');
    check(app.startCampaign({startStage,car:'titan_monster'}),'locked vehicle request retains the existing safe starter fallback');same(app.duel.state.car,'falcone_f42','no course can bypass vehicle ownership');app.returnToMenu();
  }
  same(app.profile.credits,0,'course entry and countdown cancellation do not change the wallet');same(Object.keys(app.profile.personalBests).length,0,'countdown entry cannot fabricate records');
  same(app.profile.unlockedCars,createProfile().unlockedCars,'no course entry gifts vehicles');
  app.profile.credits=50000;app._saveProfile();for(const car of Object.keys(CARS))if(!isCarUnlocked(app.profile,car))check(app.unlockCar(car).ok,'test-only wallet buys every remaining car at catalog cost');
  const bank=app.profile.credits;
  for(const car of Object.keys(CARS))for(const [startStage,event]of COURSE.entries()){
    app.setRaceSettings({car,startStage,mode:'timetrial'});same(app.getRaceChoices().car,car,'all course changes preserve every owned car');same(app.getRaceChoices().startStage,startStage,'all vehicle changes preserve the course');
    same(new App().getRaceChoices(),app.getRaceChoices(),'per-player setup persists any owned vehicle/course pairing');
    check(app.startCampaign(),'saved pairing starts');same(app.duel.state.car,car,'raw simulation receives the chosen owned car');same(app.duel.state.stageIndex,startStage,'raw simulation receives the chosen course');
    same(app.duel.state.mode,event.practice||event.stuntTrial||['chase','drift','checkpoint'].includes(event.kind)?'duel':'timetrial','objective-only modes remain enforced without vehicle forcing');
    app.restart();same(app.duel.state.car,car,'restart preserves any chosen vehicle');same(app.duel.state.stageIndex,startStage,'restart preserves the course');app.returnToMenu();
  }
  same(app.profile.credits,bank,'course/vehicle selection and restart cannot spend or gift credits');same(app.profile.history.length,0,'countdown-only eligibility checks create no race settlements');
  for(const [stageIndex,event]of COURSE.entries())for(const car of Object.keys(CARS)){
    const cpuDifficulty='medium',required=event.checkpointRush?.gatesPerLap*(event.laps||2),result={runId:'eligibility',stageIndex,car,driverId:'club',completed:true,won:true,targetsMet:true,laps:event.laps||2,timeSec:10,cpuDifficulty,
      jumps:event.stuntTrial?.jumps,crushCount:event.stuntTrial?.crushes,driftScore:event.driftTrial?.targets[cpuDifficulty],checkpointsPassed:required,checkpointsRequired:required,checkpointMisses:0};
    same(isValidFinish(result),!event.practice,'every competitive car with complete objective evidence is eligible, while practice has no records');check(!isValidFinish({...result,completed:false}),'open eligibility still rejects incomplete races');
    if(event.stuntTrial||event.driftTrial||event.checkpointRush)check(!isValidFinish({...result,targetsMet:false}),'special objectives are still mandatory for every car');
  }

  // Execute production menu functions with DOM property stubs, not a duplicate
  // course-selection implementation. The real App handles preference writes.
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const menu=source.slice(source.indexOf('function updateMenuScene() {'),source.indexOf('\nexport function refreshRaceSetup'));
  const reward=source.slice(source.indexOf('function updateEntryReward(){'),source.indexOf('\nfunction updatePlayers()'));
  check(menu.startsWith('function updateMenuScene() {')&&reward.startsWith('function updateEntryReward(){'),'production menu function boundaries exist');
  const values={},choices={...app.getRaceChoices()},node=()=>({hidden:false,disabled:false,value:'',checked:false,title:'',innerHTML:'',classList:{toggle(){}},setAttribute(){}});
  const ui=Object.fromEntries(['lighting-mood','scene-select','route-choice','menu-biome-legend','menu-elevation','entry-reward','event-brief','ghost-control','ghost-hint','ghost-toggle'].map(id=>[id,node()]));
  ui['scene-select'].options=COURSE.map((event,index)=>({value:String(index),disabled:true,textContent:event.name}));
  const env={app,choices,ui,COURSE,CARS,CAR_PRICES:{},COURSE_PRICES,isCourseUnlocked,CPU_REWARDS,UPGRADE_TYPES,bestKey,eventKey,getLeaderboard,getEquippedDriverId,isCarUnlocked,supportsRouteVariants,getRouteVariantForSeed,syncRaceChoiceButtons,
    root:{querySelectorAll:()=>[],querySelector:()=>({textContent:''})},profile:()=>app.profile,text:(id,value)=>{values[id]=String(value);},credits:value=>Math.floor(value||0).toLocaleString(),time:value=>String(value),escapeHTML:value=>String(value),
    coursePreview:{update:()=>({distanceKm:4,laps:2,biomes:[],map:{gates:[],branches:[]},showElevation:false,reliefMeters:0})},updateMenuCar(){env.updateEntryReward();}};
  Object.assign(env,new Function('env',`with(env){${reward}\n${menu}\nreturn {updateEntryReward,updateMenuScene};}`)(env));
  for(const car of ['falcone_f42','titan_monster'])for(const [startStage,event]of COURSE.entries()){
    Object.assign(choices,{car,startStage});env.updateMenuScene();same(choices.car,car,'production course menu never forces a different car');same(choices.startStage,startStage,'production vehicle menu never redirects the course');check(ui['scene-select'].options.every(option=>!option.disabled),'every course option remains available');
    if(event.requiredCar){check(!ui['event-brief'].hidden,'recommendation and objective are visible before Start');check(values['event-brief'].includes('recommended'),'old restriction is described only as a recommendation');}
    if(event.arena&&car!=='titan_monster')check(values['event-brief'].includes('Titan recommended: lighter cars cannot crush wrecks.'),'light-car arena limitation is explicit before Start');
    if(event.stuntTrial)check(values['event-brief'].includes(`crush ${event.stuntTrial.crushes} cars`),'the unchanged stunt target is visible alongside its vehicle limitation');
  }
  check(!/choices\.car\s*=\s*(?:stage|COURSE\[[^\]]+\])\.requiredCar/.test(source),'no production menu route still forces the recommended car');
  app.returnToMenu();
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
console.log(`Course eligibility: ${checks} App, ownership, persistence, restart, strict objective and production-menu checks passed across ${Object.keys(CARS).length} cars and ${COURSE.length} courses.`);

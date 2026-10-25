import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMenuScreen} from '../src/screen-menu.js';
import {App} from '../src/app.js';
import {CARS,COURSE} from '../src/config.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createProfile,normalizeProfile,CAR_PRICES,CPU_REWARDS,isCarUnlocked,bestKey,eventKey,isValidFinish,UPGRADE_TYPES} from '../src/progression.js';
import {getEquippedDriverId} from '../src/drivers.js';
import {driverSkillLabel} from '../src/driver-ui.js';
import {getLeaderboard} from '../src/leaderboard.js';
import {supportsRouteVariants,getRouteVariantForSeed} from '../src/route-variants.js';
import {syncRaceChoiceButtons} from '../src/race-settings-ui.js';
import {COURSE_PRICES,isCourseUnlocked} from '../src/course-access.js';
import {formatSpeed} from '../src/speed-format.js';

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
  app.profile.credits=250000;app._saveProfile();for(const car of Object.keys(CAR_PRICES))if(!isCarUnlocked(app.profile,car))check(app.unlockCar(car).ok,'test-only wallet buys every priced car at catalog cost');
  for(const [car,spec]of Object.entries(CARS).filter(([,spec])=>!spec.unlockRequirement))for(const type of Object.keys(UPGRADE_TYPES))for(let level=0;level<3;level++)check(app.purchaseUpgrade(car,type).ok,'test-only wallet maxes the ordinary fleet through the real garage API');
  // 24 medals with 8 gold (any boxes, from any cars) earn the Enzo, the F1 and the Bolide through the real grant, as a save would on load.
  const fullSheet={duel:[1,1,1],grandprix:[1,1,1]};
  const medalProfile=normalizeProfile({...app.profile,medals:{version:1,cars:{falcone_f42:fullSheet,stuttgart_959s:fullSheet,falcone_heritage:fullSheet,aurora_gt:fullSheet}}});
  Object.assign(app.profile,{medals:medalProfile.medals,unlockedCars:medalProfile.unlockedCars,upgrades:medalProfile.upgrades});app._saveProfile();
  // The Falcone Sirena is owned only once the Lab restores it (SIRENA-CAR), so maxing the fleet never earns it.
  const OWNABLE_CARS=Object.keys(CARS).filter(car=>car!=='falcone_sirena'&&car!=='mcmurtry_speirling');
  check(!isCarUnlocked(app.profile,'falcone_sirena'),'maxing the fleet does not earn the Sirena: only the Lab restores it');
  check(OWNABLE_CARS.every(car=>isCarUnlocked(app.profile,car)),'maxing the ordinary fleet earns the completion car, and the medals the Enzo, the F1 and the Bolide, before eligibility checks');
  const bank=app.profile.credits;let airOnlyRefusals=0;
  for(const car of OWNABLE_CARS)for(const [startStage,event]of COURSE.entries()){
    app.setRaceSettings({car,startStage,mode:'timetrial'});same(app.getRaceChoices().car,car,'all course changes preserve every owned car');same(app.getRaceChoices().startStage,startStage,'all vehicle changes preserve the course');
    same(new App().getRaceChoices(),app.getRaceChoices(),'per-player setup persists any owned vehicle/course pairing');
    // Medal cars still start only at Tremblant Woods. The Jesko needs no flight.
    const expectRefused=['ferrari_enzo','mclaren_f1','bugatti_bolide'].includes(car)&&event.id!=='tremblant-woods';
    same(app._airOnlyRefused(car,event.id),expectRefused,`${car} at ${event.id}: air-only refusal only for the medal cars away from Tremblant Woods`);
    if(expectRefused){airOnlyRefusals++;check(!app.startCampaign(),'an air-only car is refused away from where it sits');
      check(app.courseAccessMessage.includes('travels only by air'),'the refusal says why');same(app.duel.state.status,'menu','a refused start stays on the menu');continue;}
    check(app.startCampaign(),'saved pairing starts');same(app.duel.state.car,car,'raw simulation receives the chosen owned car');same(app.duel.state.stageIndex,startStage,'raw simulation receives the chosen course');
    same(app.duel.state.mode,event.practice||event.stuntTrial||['chase','drift','checkpoint'].includes(event.kind)?'duel':'timetrial','objective-only modes remain enforced without vehicle forcing');
    app.restart();same(app.duel.state.car,car,'restart preserves any chosen vehicle');same(app.duel.state.stageIndex,startStage,'restart preserves the course');app.returnToMenu();
  }
  same(airOnlyRefusals,3*(COURSE.length-1),'the Enzo, the F1 and the Bolide each start on exactly one course, where they sit');
  // An old helicopter position must not restrict any Jesko mode on any course.
  app.profile={...app.profile,heli:{version:1,carsAt:{koenigsegg_jesko:'panorama-ridge'}}};app._saveProfile();
  check(app._switches().enabled('helicopter'),'the helicopter is on for the Jesko regression');
  for(const [startStage,event]of COURSE.entries())for(const mode of ['duel','timetrial','grandprix','wasteland']){
    check(app.startCampaign({car:'koenigsegg_jesko',startStage,mode}),`Jesko starts ${mode} at ${event.id} without transport`);
    same(app.duel.state.car,'koenigsegg_jesko','no mode substitutes another car');
    same(app.duel.state.stageIndex,startStage,'no mode redirects to its helicopter position');
    app.returnToMenu();
  }
  same(app.profile.heli.carsAt,{koenigsegg_jesko:'panorama-ridge'},'racing preserves the old saved position');
  same(app.profile.credits,bank,'course/vehicle selection and restart cannot spend or gift credits');same(app.profile.history.length,0,'countdown-only eligibility checks create no race settlements');
  for(const [stageIndex,event]of COURSE.entries())for(const car of OWNABLE_CARS){
    const cpuDifficulty='medium',required=event.checkpointRush?.gatesPerLap*(event.laps||2),result={runId:'eligibility',stageIndex,car,driverId:'club',completed:true,won:true,targetsMet:true,laps:event.laps||2,timeSec:10,cpuDifficulty,
      jumps:event.stuntTrial?.jumps,crushCount:event.stuntTrial?.crushes,driftScore:event.driftTrial?.targets[cpuDifficulty],checkpointsPassed:required,checkpointsRequired:required,checkpointMisses:0};
    same(isValidFinish(result),!event.practice,'every competitive car with complete objective evidence is eligible, while practice has no records');check(!isValidFinish({...result,completed:false}),'open eligibility still rejects incomplete races');
    if(event.stuntTrial||event.driftTrial||event.checkpointRush)check(!isValidFinish({...result,targetsMet:false}),'special objectives are still mandatory for every car');
  }

  // Execute production menu functions with DOM property stubs, not a duplicate
  // course-selection implementation. The real App handles preference writes.
  const source=readFileSync(new URL('../src/screen-menu.js',import.meta.url),'utf8');
  const values={},choices={...app.getRaceChoices()},node=()=>({hidden:false,disabled:false,value:'',checked:false,title:'',innerHTML:'',classList:{toggle(){}},setAttribute(){}});
  const ui=Object.fromEntries(['lighting-mood','scene-select','route-choice','tyre-choice','menu-biome-legend','menu-elevation','entry-reward','event-brief','ghost-control','ghost-hint','ghost-toggle','rival-customization','rival-car','rival-driver','rival-upgrades','car-speed','car-gears','car-character','garage-count','menu-credits','car-select','driver-select','driver-skill-note','cpu-target-label','scene-name','scene-length','menu-route-label','menu-shortcuts','menu-relief','menu-location','route-choice-label','ghost-record-label'].map(id=>[id,node()]));
  ui['scene-select'].options=COURSE.map((event,index)=>({value:String(index),disabled:true,textContent:event.name}));
  ui['car-select'].options=Object.keys(CARS).map(value=>({value,textContent:''}));
  const menu=createMenuScreen({app,choices,ui,root:{querySelectorAll:()=>[],querySelector:selector=>selector==='#qualifying-choice'?null:{textContent:''}},profile:()=>app.profile,text:(id,value)=>{values[id]=String(value);},credits:value=>Math.floor(value||0).toLocaleString(),time:value=>String(value),escapeHTML:value=>String(value),coursePreview:{update:()=>({distanceKm:4,laps:2,biomes:[],map:{gates:[],branches:[]},showElevation:false,reliefMeters:0})}});
  check(typeof menu.updateMenuScene==='function'&&typeof menu.updateMenuCar==='function','production menu exports the actual scene and car presenters');
  for(const car of ['falcone_f42','titan_monster'])for(const [startStage,event]of COURSE.entries()){
    Object.assign(choices,{car,startStage});menu.updateMenuScene();same(choices.car,car,'production course menu never forces a different car');same(choices.startStage,startStage,'production vehicle menu never redirects the course');check(ui['scene-select'].options.every(option=>!option.disabled),'every course option remains available');
    if(event.requiredCar){check(!ui['event-brief'].hidden,'recommendation and objective are visible before Start');check(values['event-brief'].includes('recommended'),'old restriction is described only as a recommendation');}
    if(event.arena&&car!=='titan_monster')check(values['event-brief'].includes('Titan recommended: lighter cars cannot crush wrecks.'),'light-car arena limitation is explicit before Start');
    if(event.stuntTrial)check(values['event-brief'].includes(`crush ${event.stuntTrial.crushes} cars`),'the unchanged stunt target is visible alongside its vehicle limitation');
  }
  check(!/choices\.car\s*=\s*(?:stage|COURSE\[[^\]]+\])\.requiredCar/.test(source),'no production menu route still forces the recommended car');
  app.returnToMenu();
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
console.log(`Course eligibility: ${checks} App, ownership, persistence, restart, strict objective and production-menu checks passed across ${Object.keys(CARS).length} cars and ${COURSE.length} courses.`);

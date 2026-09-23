import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseScreen} from '../src/screen-courses.js';
import {App} from '../src/app.js';
import {CARS,COURSE} from '../src/config.js';
import {COURSE_PRICES,normalizeCourseAccess,isCourseUnlocked,purchaseCourse} from '../src/course-access.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {createProfile,normalizeProfile,createPlayerRegistry,savePlayers,loadPlayers,bestKey,eventKey,settleRace,isValidFinish} from '../src/progression.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {recordFinish,createLeaderboard,mergeLeaderboards,getLeaderboard} from '../src/leaderboard.js';
import {ghostKey,normalizeGhostStore} from '../src/ghost.js';

let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const fresh=createProfile(),free=COURSE[0],paid=COURSE[1];
same(fresh.courses,{version:1,unlocked:[free.id]},'only Pacific is included in new careers');
for(const course of COURSE){
  check(Number.isSafeInteger(COURSE_PRICES[course.id])&&COURSE_PRICES[course.id]>=0,'every course has a nonnegative integer price');
  same(isCourseUnlocked(fresh,course),course===free,'new career cannot bypass a priced course');
  same(isCourseUnlocked(fresh,course.stage),isCourseUnlocked(fresh,course.id),'stable IDs and indices resolve the same ownership');
}
same(COURSE.filter(course=>COURSE_PRICES[course.id]===0).length,1,'one free course guarantees an earning path');
same(normalizeCourseAccess({version:1,unlocked:[free.id,free.id,'bad',paid.id]}),{version:1,unlocked:[free.id,paid.id]},'normalization removes unknown and duplicate unlocks');
same(normalizeCourseAccess(null,{history:{bad:1},unlockedCars:5,circuitWins:true}),fresh.courses,'malformed legacy evidence is harmless');
const legacy={...createProfile(),credits:7654,unlockedCars:Object.keys(CARS),raceSettings:{eventId:'cloudbreak-skyway',car:'stuttgart_959s'},history:[{key:'old:1',eventId:paid.id,completed:true,won:false,reward:-300}],personalBests:{[bestKey({stageIndex:2,car:'falcone_f42'})]:120},circuitWins:[]};
delete legacy.courses;
const migrated=normalizeProfile(legacy);
same(migrated.credits,legacy.credits,'migration never changes credits');same(migrated.unlockedCars,legacy.unlockedCars,'migration preserves the garage');
for(const course of COURSE)same(isCourseUnlocked(migrated,course),course.stage<9,'completed original circuits and six paid-car legacy entitlements survive; new courses are not blanket granted');
same(migrated.raceSettings.eventId,free.id,'an unearned saved selection safely returns to the included circuit');
const proof=normalizeProfile({...legacy,unlockedCars:fresh.unlockedCars,history:[],personalBests:{'eifel-crown|layout:2|seed:1989|laps:2|falcone_f42|duel|casual|easy':130},activeRace:{runId:'old-active',stageIndex:1,car:'falcone_f42'}});
same(proof.courses.unlocked,[free.id,paid.id,'eifel-crown'],'a valid prior best and interrupted active course preserve only their specific access');
same(normalizeProfile({...legacy,courses:fresh.courses}).courses,fresh.courses,'after migration, owning a recommended car does not silently grant courses');
same(normalizeProfile({...legacy,unlockedCars:[],history:[],personalBests:{'eifel-crown|layout:2':NaN,'unknown|layout:2':22}}).courses,fresh.courses,'unknown and invalid bests cannot grant courses');
check(!purchaseCourse(fresh,paid.id).ok,'insufficient funds cannot buy a course');check(!purchaseCourse(fresh,'missing').ok,'unknown courses cannot be bought');
const funded={...fresh,credits:9000,raceSettings:normalizeRaceSettings({},fresh)},snapshot=JSON.stringify(funded),bought=purchaseCourse(funded,paid.id);
check(bought.ok,'explicit purchase succeeds with enough credits');same(bought.cost,COURSE_PRICES[paid.id],'catalog price is authoritative');same(bought.profile.credits,9000-COURSE_PRICES[paid.id],'price is debited exactly once');
same(JSON.stringify(funded),snapshot,'purchase does not mutate the input profile');same(bought.profile.raceSettings,funded.raceSettings,'purchase never silently selects the course');
const again=purchaseCourse(bought.profile,paid.id);check(!again.ok,'duplicate purchase is rejected');same(again.profile,bought.profile,'duplicate does not touch the wallet');
same(normalizeRaceSettings({eventId:paid.id,car:'stuttgart_959s'},bought.profile).eventId,paid.id,'owned course settings survive normalization');
same(normalizeRaceSettings({eventId:paid.id,car:'stuttgart_959s'},fresh).eventId,free.id,'locked course settings cannot bypass access');

const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App();const before=JSON.stringify(app.duel.state);
  check(!app.startCampaign({startStage:1}),'App rejects direct locked-course start');same(JSON.stringify(app.duel.state),before,'rejected start does not change simulation');check(!app.selectCourse(paid.id),'App rejects locked selection');
  app.profile.credits=20000;app._saveProfile();
  const other=new App();check(other.purchaseCourse(paid.id).ok,'another menu can buy from the same saved wallet');
  check(!app.purchaseCourse(paid.id).ok,'stale menu refresh prevents duplicate debit');same(app.profile.credits,20000-COURSE_PRICES[paid.id],'latest wallet is retained');same(app.menuStage,0,'purchase leaves existing course selected');
  check(app.selectCourse(paid.id),'owned course selection succeeds');same(app.menuStage,1,'selection updates the menu');same(app.profile.credits,20000-COURSE_PRICES[paid.id],'selection is free');
  app.setRaceSettings({car:'stuttgart_959s'});check(app.startCampaign(),'normal App starts the owned course');same(app.duel.state.car,'stuttgart_959s','unlocked course does not force a vehicle');
  const race=app.duel.state,bank=app.profile.credits;
  check(!app.purchaseCourse(COURSE[2].id).ok&&!app.selectCourse(free.id),'purchase and selection are blocked during countdown');
  app.advance(4);check(!app.startCampaign({startStage:2}),'locked start while driving is rejected');same(app.duel.state,race,'rejected race switch cannot abandon the current run');
  app.requestNavigation('menu');same(app.profile.credits,bank,'one-click quit preserves the bank');
  same(new App().profile.courses,app.profile.courses,'course ownership persists on reload');
  const firstId=app.player.id;check(app.addPlayer('Course access other player').ok,'a separate local player can be created');same(app.profile.courses,fresh.courses,'another player receives only Pacific');app.selectPlayer(firstId);check(isCourseUnlocked(app.profile,paid),'switching back retains purchased access');
  // Settle a validated finish fixture, then use the real App navigation gate.
  app.startCampaign({startStage:1});Object.assign(app.duel.state,{status:'stage_result',completedLaps:2,stageTimeSec:100,stageCrashes:0});
  const result={won:true,completed:true,laps:2,timeSec:100};app.duel.state.results=result;app.duel.emit({stageResult:result});
  const banked=app.profile.credits,history=JSON.stringify(app.profile.history),records=JSON.stringify(app.profile.personalBests);
  check(banked>bank,'completed unlocked stage banks its normal reward');check(!app.nextStage(),'next-stage verb cannot enter locked Harbor');same(app.duel.state.stageIndex,1,'blocked campaign stays at its settled result');
  same(app.profile.credits,banked,'blocked next does not remove completed rewards');app.nextStage();same(JSON.stringify(app.profile.history),history,'repeated blocked-next cannot resettle');same(JSON.stringify(app.profile.personalBests),records,'blocked-next does not rewrite records');
  check(!app.purchaseCourse(COURSE[2].id).ok,'result screen cannot spend race funds without returning to menu');app.requestNavigation('menu');check(app.purchaseCourse(COURSE[2].id).ok,'banked reward can fund explicit menu purchase');
  app.startCampaign({startStage:1});Object.assign(app.duel.state,{status:'stage_result',results:{won:true,completed:true}});check(app.nextStage(),'owned next circuit is allowed');same(app.duel.state.stageIndex,2,'campaign reaches only its now-owned next circuit');app.returnToMenu();
  const registry=loadPlayers();check(savePlayers(registry),'course schema saves through normal registry');same(loadPlayers(),registry,'course schema round trips without rewriting settings or records');

  const practice=COURSE.find(course=>course.practice);
  check(!!practice,'the practice course exists');same(COURSE_PRICES[practice.id],900,'practice has its agreed 900-credit purchase');
  check(!isCourseUnlocked(app.profile,practice),'practice has not been gifted');check(app.purchaseCourse(practice.id).ok,'practice can be bought explicitly');check(app.selectCourse(practice.id),'practice can be selected independently');
  const practiceBank=app.profile.credits,practiceProfile=JSON.stringify({...app.profile,raceSettings:null});
  check(app.startCampaign({startStage:practice.stage,mode:'timetrial',car:'falcone_f42'}),'any owned car starts unlocked practice');same(app.duel.state.mode,'duel','practice cannot enable Time Trial recording');
  app.keys.KeyW=true;for(let frame=0;frame<600;frame++)app.advance(1/60);app.keys.KeyW=false;
  same(app.profile.activeRace,null,'actual practice GO never writes a career interruption marker');same(app.ghostRecorder,null,'practice creates no recorder');same(app.ghostRecord,null,'practice selects no ghost');
  const fabricated={runId:app.runId,stageIndex:practice.stage,car:'falcone_f42',won:true,completed:true,laps:2,timeSec:1,jumps:99,crushCount:99,targetsMet:true};
  check(!isValidFinish(fabricated),'practice is ineligible even with fabricated finish evidence');check(!settleRace(app.profile,fabricated).awarded,'progression refuses practice rewards');
  check(!recordFinish(createLeaderboard(),fabricated,app.player).recorded,'practice cannot create a leaderboard entry');app.duel.emit({stageResult:fabricated});same(app.profile.credits,practiceBank,'a stale practice result cannot change credits');
  const bogusBoard={version:1,entries:[{...fabricated,playerId:app.player.id,playerName:app.player.name,eventId:practice.id,eventKey:eventKey(fabricated),layoutVersion:practice.layoutVersion||1,seed:1989,driverId:'club',driverSignature:'',cpuDifficulty:'easy',difficulty:'casual',mode:'duel'}]};
  same(mergeLeaderboards(bogusBoard).entries,[],'serialized or merged practice rows cannot create a ranking');same(getLeaderboard(bogusBoard),[],'raw practice rows are excluded from direct rankings too');
  same(ghostKey(app.player.id,{...fabricated,mode:'timetrial'}),'','practice cannot generate a competitive replay key');
  const fakeGhost={...fabricated,playerId:app.player.id,playerName:app.player.name,mode:'timetrial',difficulty:'casual',cpuDifficulty:'easy',eventId:practice.id,layoutVersion:practice.layoutVersion||1,key:'fake',samples:[]};
  same(normalizeGhostStore({version:1,records:[fakeGhost]}).records,[],'practice replay metadata is rejected on load');
  app.requestNavigation('restart');app.advance(4);app.requestNavigation('menu');same(JSON.stringify({...app.profile,raceSettings:null}),practiceProfile,'practice driving/restart/exit preserves career wallet, history, streak and records');
  const reopened=new App();same(reopened.profile.credits,practiceBank,'practice reload cannot debit the bank');check(reopened.profile.activeRace===null,'practice leaves no marker to settle on reload');
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}

const router=readFileSync(new URL('../src/screen-router.js',import.meta.url),'utf8'),css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8')+readFileSync(new URL('../src/screen-courses.css',import.meta.url),'utf8');
const zero=courseAccessPanel(fresh,0,'<safe>');
same((zero.match(/<article\b/g)||[]).length,COURSE.length,'course shop lists every course');
check(zero.includes('role="dialog"')&&zero.includes('aria-labelledby="courses-title"')&&zero.includes('aria-label="Close course garage"'),'course dialog has accessible title and close action');
check(zero.includes('&lt;safe&gt;')&&!zero.includes('<safe>'),'course messages are escaped');check(zero.includes('Unlocking a course does not select it'),'purchase-selection distinction is visible');
for(const tag of zero.match(/<button\b[^>]*data-course-(?:select|unlock)[^>]*>/g)||[])check(tag.includes('disabled')&&tag.includes('aria-label='),'zero wallet actions are disabled and labelled');
check(css.includes('.course-access-card>button:focus-visible')&&css.includes('.course-access-grid{grid-template-columns:1fr}'),'course cards have focus and mobile layouts');
same(courseScreen(fresh,0,'<safe>'),zero,'production course screen uses the tested panel unchanged');
check(router.includes('courseScreen(profile(),choices.startStage,courseMessage)')&&router.includes("case 'next': app.nextStage()"),'production UI uses the tested panel and guarded App campaign verb');
console.log(`Course access: ${checks} pricing, migration, App ownership, campaign, practice, persistence and accessible UI checks passed.`);

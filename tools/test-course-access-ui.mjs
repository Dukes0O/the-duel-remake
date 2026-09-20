import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {COURSE,DRIVE,CARS} from '../src/config.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {DRIVERS} from '../src/drivers.js';
import {getLeaderboard} from '../src/leaderboard.js';
import {eventKey} from '../src/progression.js';
import {speedKph,formatSpeed} from '../src/speed-format.js';

let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const first=source.indexOf('  if(button.dataset.courseUnlock)'),last=source.indexOf('  if(button.dataset.routeVariant)',first);
check(first>0&&last>first,'production course action block exists');
const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App();app.profile.credits=3000;app._saveProfile();app.setRaceSettings({car:'stuttgart_959s'});
  const choices=app.getRaceChoices();let renders=0,updates=0;
  const controller=new Function('app','choices','updateMenuScene','renderState',`let courseMessage='',coursesOpen=true,lastScreen=null;return {click(button){${source.slice(first,last)}},get message(){return courseMessage;},get open(){return coursesOpen;}};`)(app,choices,()=>updates++,()=>renders++);
  controller.click({dataset:{courseSelect:'high-country'}});same(app.menuStage,0,'locked production select cannot enter a course');same(renders,0,'rejected stale action does not redraw or close the shop');
  controller.click({dataset:{courseUnlock:'high-country'}});same(app.profile.credits,2100,'production purchase debits the catalog price');same(app.menuStage,0,'production purchase does not select');check(controller.open&&controller.message.includes('Select it'),'shop remains open with the separate-selection prompt');
  const purchased=courseAccessPanel(app.profile,0,controller.message);check(purchased.includes('data-course-select="high-country"')&&!purchased.includes('data-course-unlock="high-country"'),'purchased card now offers selection, not another debit');
  controller.click({dataset:{courseUnlock:'high-country'}});same(app.profile.credits,2100,'double click cannot double debit');check(controller.message.includes('already unlocked'),'double click explains existing ownership');
  controller.click({dataset:{courseSelect:'high-country'}});same(app.menuStage,1,'production selection uses normal App settings');same(choices.car,'stuttgart_959s','selecting a course preserves the owned vehicle');check(!controller.open,'successful selection returns to the main menu');same(app.profile.credits,2100,'production selection is free');
  app.startCampaign();const bank=app.profile.credits,settings=JSON.stringify(app.profile.raceSettings),previousRenders=renders;
  controller.click({dataset:{courseUnlock:'harbor-highlands'}});controller.click({dataset:{courseSelect:'pacific-canyon'}});same(app.profile.credits,bank,'stale race buttons cannot spend credits');same(JSON.stringify(app.profile.raceSettings),settings,'stale race buttons cannot mutate settings');same(renders,previousRenders,'blocked race actions do not redraw');app.returnToMenu();

  // Exercise the actual HUD function against a real practice state. DOM
  // property stubs are views only; no duplicate practice rendering logic.
  const start=source.indexOf('function updateHud(s) {'),end=source.indexOf('\ndocument.addEventListener',start);
  check(start>0&&end>start,'production HUD boundaries exist');
  const node=()=>({hidden:false,textContent:'',dataset:{},style:{},firstChild:{textContent:''},classList:{values:new Map(),toggle(name,on){this.values.set(name,!!on);}},setAttribute(){}});
  const ui=new Proxy({}, {get:(target,key)=>target[key]??(target[key]=node())});
  const text=(id,value)=>ui[id].textContent=String(value),time=value=>Number(value||0).toFixed(2),credits=value=>Math.floor(value||0).toLocaleString(),clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
  const update=new Function('app','ui','text','time','credits','clamp','DRIVE','routeMap','speedKph','formatSpeed',`${source.slice(start,end)};return updateHud;`)(app,ui,text,time,credits,clamp,DRIVE,{update(){}},speedKph,formatSpeed);
  const practice=COURSE.find(course=>course.practice);check(app.purchaseCourse(practice.id).ok,'UI practice test uses an explicit paid unlock');app.startCampaign({startStage:practice.stage,car:'falcone_f42'});
  const boardStart=source.indexOf('function leaderboardScreen(){'),boardEnd=source.indexOf("\nroot.addEventListener('submit'",boardStart),boardFilter={stage:practice.stage,car:'',driverId:'club'};
  const board=new Function('app','COURSE','CARS','DRIVERS','boardFilter','eventKey','getLeaderboard','escapeHTML',`${source.slice(boardStart,boardEnd)};return leaderboardScreen;`)(app,COURSE,CARS,DRIVERS,boardFilter,eventKey,getLeaderboard,String);
  const boardMarkup=board();same(boardFilter.stage,0,'opening Scores from practice shows the included competitive circuit');check(!boardMarkup.includes(practice.name),'practice never appears as a ranked course choice');
  for(let frame=0;frame<240;frame++)app.advance(1/60);
  const state=app.duel.state,snapshot=JSON.stringify(state);update(state);
  same(JSON.stringify(state),snapshot,'practice HUD never writes to simulation');same(ui['race-time'].textContent,'FREE PRACTICE','the timer explicitly identifies untimed practice');same(ui['race-time-label'].textContent,'NO TIMER · NO REWARDS','practice states there is no clock or earning');
  same(ui['lap-time'].textContent,'','practice has no lap clock');same(ui['route-lap'].textContent,'PLAYGROUND','map has no lap target');same(ui['route-remaining'].textContent,'EXPLORE AT YOUR OWN PACE','map has no finish-distance pressure');
  same(ui['arena-crush'].textContent,'CRUSHED 0','practice has no required crush target');update({...state,crushCount:12});same(ui['arena-crush'].textContent,'CRUSHED 12','practice count remains open-ended above the competitive target');
  same(ui['progress-fill'].style.transform,'scaleX(0)','practice has no completion progress');check(ui['style-score-panel'].hidden&&ui['lives-display'].hidden&&ui['radar-meter'].hidden,'competitive score, crash slots and pursuit meter are hidden');
  check(ui['stage-objective'].textContent.includes('NO TIMER, RIVAL OR FINISH LINE'),'practice objective is explicit');same(ui['rival-gap'].textContent,'NO RECORDS OR REWARDS','position block cannot suggest a competitive ghost');
  app.requestNavigation('menu');app.startCampaign({startStage:0});update(app.duel.state);same(ui['race-time-label'].textContent,'RACE TIME','ordinary race clock label returns after practice');check(!ui.stage.classList.values.get('is-practice'),'ordinary HUD restores race-specific layout');check(!ui['style-score-panel'].hidden,'ordinary race style display returns');app.returnToMenu();
  // Raw Duel selects this presentation fixture without granting account access.
  app.duel.startCampaign({startStage:COURSE.find(course=>course.id==='titan-arena').stage});update(app.duel.state);same(ui['arena-crush'].textContent,'CRUSHED 0 / 6','competitive Titan Arena keeps its six-car target');update({...app.duel.state,crushCount:12});same(ui['arena-crush'].textContent,'CRUSHED 6 / 6','competitive target remains capped at six');app.returnToMenu();
  check(updates===3,'only successful or duplicate menu purchases and selection refresh the menu');
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
console.log(`Course/practice UI: ${checks} production action, purchase separation, race guards and actual-state HUD checks passed.`);

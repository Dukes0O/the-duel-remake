import assert from 'node:assert/strict';
import {createCourseActions} from '../src/screen-courses.js';
import {createHudScreen} from '../src/screen-hud.js';
import {createLeaderboardScreen} from '../src/screen-leaderboard.js';
import {App} from '../src/app.js';
import {COURSE,DRIVE,LIVES,CARS} from '../src/config.js';
import {courseAccessPanel,bestSummitAttackTime} from '../src/course-access-ui.js';
import {courseUnlockRequirement,isCourseUnlocked} from '../src/course-access.js';
import {createResultsScreen} from '../src/screen-results.js';
import {DRIVERS} from '../src/drivers.js';
import {getLeaderboard} from '../src/leaderboard.js';
import {eventKey} from '../src/progression.js';
import {speedKph,formatSpeed} from '../src/speed-format.js';

let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
check(typeof createCourseActions==='function','production course action controller exists');
const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App();app.profile.credits=3000;app._saveProfile();app.setRaceSettings({car:'stuttgart_959s'});
  const choices=app.getRaceChoices();let renders=0,updates=0;
  let courseMessage='',coursesOpen=true;
  const actions=createCourseActions({app,choices,setMessage:value=>courseMessage=value,setOpen:value=>coursesOpen=value,updateMenuScene:()=>updates++,invalidate:()=>{},renderState:()=>renders++});
  const controller={click:button=>actions.handle(button),get message(){return courseMessage;},get open(){return coursesOpen;}};
  controller.click({dataset:{courseSelect:'high-country'}});same(app.menuStage,0,'locked production select cannot enter a course');same(renders,0,'rejected stale action does not redraw or close the shop');
  controller.click({dataset:{courseUnlock:'high-country'}});same(app.profile.credits,2100,'production purchase debits the catalog price');same(app.menuStage,0,'production purchase does not select');check(controller.open&&controller.message.includes('Select it'),'shop remains open with the separate-selection prompt');
  const purchased=courseAccessPanel(app.profile,0,controller.message);check(purchased.includes('data-course-select="high-country"')&&!purchased.includes('data-course-unlock="high-country"'),'purchased card now offers selection, not another debit');
  // Course cards carry a small outline map; a secret course not yet found from the helicopter keeps its hint and has none.
  {
    const cards=purchased.split('<article ').slice(1),secretOf=(profile,course)=>courseUnlockRequirement(course)?.kind==='spotted-from-air'&&!isCourseUnlocked(profile,course);
    same(cards.length,COURSE.length,'every course has one card');
    const hidden=COURSE.filter(course=>secretOf(app.profile,course));check(hidden.length>0,'the catalog has secret courses to check');
    for(const [index,course] of COURSE.entries()){
      const card=cards[index],has=card.includes(`data-course-map="${course.id}"`);
      check(has!==secretOf(app.profile,course),`${course.id} map is shown unless it is a secret not yet found`);
      check(has===card.includes('course-card-map')&&has===card.includes(' has-map'),`${course.id} map canvas and card class agree`);
      if(!has)check(card.includes(`<button type="button" disabled aria-label="${courseUnlockRequirement(course).condition}">LOCKED</button>`),`${course.id} keeps its locked hint button`);
      if(has)check(card.indexOf('</div><canvas')>0&&card.indexOf('<canvas')<card.indexOf('<button'),`${course.id} map sits between the text and the buttons`);
    }
    const secret=hidden[0],foundProfile={...app.profile,courses:{version:1,unlocked:[...new Set([...app.profile.courses.unlocked,courseUnlockRequirement(secret).defaultEventId])]},heli:{map:{version:1,found:[secret.id]}}};
    check(isCourseUnlocked(foundProfile,secret),'the secret course opens once found from the air');
    check(courseAccessPanel(foundProfile,0,'').includes(`data-course-map="${secret.id}"`),'a found secret course shows its map');
  }
  controller.click({dataset:{courseUnlock:'high-country'}});same(app.profile.credits,2100,'double click cannot double debit');check(controller.message.includes('already unlocked'),'double click explains existing ownership');
  controller.click({dataset:{courseSelect:'high-country'}});same(app.menuStage,1,'production selection uses normal App settings');same(choices.car,'stuttgart_959s','selecting a course preserves the owned vehicle');check(!controller.open,'successful selection returns to the main menu');same(app.profile.credits,2100,'production selection is free');
  app.startCampaign();const bank=app.profile.credits,settings=JSON.stringify(app.profile.raceSettings),previousRenders=renders;
  controller.click({dataset:{courseUnlock:'harbor-highlands'}});controller.click({dataset:{courseSelect:'pacific-canyon'}});same(app.profile.credits,bank,'stale race buttons cannot spend credits');same(JSON.stringify(app.profile.raceSettings),settings,'stale race buttons cannot mutate settings');same(renders,previousRenders,'blocked race actions do not redraw');app.returnToMenu();

  // Exercise the actual HUD function against a real practice state. DOM
  // property stubs are views only; no duplicate practice rendering logic.
  check(typeof createHudScreen==='function','production HUD presenter is exported');
  const node=()=>({hidden:false,textContent:'',dataset:{},style:{},firstChild:{textContent:''},classList:{values:new Map(),toggle(name,on){this.values.set(name,!!on);}},setAttribute(){}});
  const ui=new Proxy({}, {get:(target,key)=>target[key]??(target[key]=node())});
  const text=(id,value)=>ui[id].textContent=String(value),time=value=>Number(value||0).toFixed(2),credits=value=>Math.floor(value||0).toLocaleString(),clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
  const update=createHudScreen({app,ui,text,time,credits,clamp,routeMap:{update(){}}});
  const practice=COURSE.find(course=>course.practice);check(app.purchaseCourse(practice.id).ok,'UI practice test uses an explicit paid unlock');app.startCampaign({startStage:practice.stage,car:'falcone_f42'});
  const boardFilter={stage:practice.stage,car:'',driverId:'club'};
  const board=createLeaderboardScreen({app,boardFilter,escapeHTML:String,credits,time});
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


{
  const {SUMMIT_RUN}=await import('../src/circuits/summit-run.js');
  const {SUMMIT_TIME_ATTACK}=await import('../src/circuits/summit-time-attack.js');
  const {summitAttackTargets}=await import('../src/summit-attack.js');
  const {recordFinish,createLeaderboard}=await import('../src/leaderboard.js');
  const {createProfile}=await import('../src/progression.js');
  const count=COURSE.length;
  let restoredAttack,attackIndex=-1;
  try{
    if(!COURSE.some(row=>row.id===SUMMIT_RUN.id))COURSE.push(SUMMIT_RUN);
    const attack={...SUMMIT_TIME_ATTACK,attackTimes:summitAttackTargets(100)};
    const existing=COURSE.findIndex(row=>row.id===attack.id),index=existing<0?COURSE.length:existing;
    attackIndex=index;restoredAttack=existing<0?undefined:COURSE[existing];
    if(existing<0)COURSE.push(attack);else COURSE[existing]=attack;
    const profile={...createProfile(),courses:{version:1,unlocked:['pacific-canyon','summit-run']}};
    let board=createLeaderboard();
    const otherDriver=Object.keys(DRIVERS).find(id=>id!=='club');
    const add=(timeSec,driverId='club',playerId='attack-player',mode='timetrial',car='falcone_f42')=>{
      const saved=recordFinish(board,{stageIndex:index,seed:1989,laps:1,completed:true,won:false,timeSec,
        mode,car,driverId,difficulty:driverId==='club'?'casual':'pro',cpuDifficulty:driverId==='club'?'medium':'hard',upgrades:{}},{id:playerId,name:'Attack QA'});
      check(saved.recorded,'fixture uses an actual validated record');board=saved.board;
    };
    add(114);add(102,otherDriver,'attack-player','timetrial','stuttgart_959s');
    add(90,'club','different-player');
    const otherMode={...board.entries[0],mode:'duel',timeSec:80};
    otherMode.eventKey=eventKey({...otherMode,stageIndex:index});
    board={...board,entries:[...board.entries,otherMode]};
    const before=JSON.stringify(board);
    same(bestSummitAttackTime(board,'attack-player'),102,'best valid solo time includes another car and driver, excluding other players and modes');
    same(bestSummitAttackTime(board,''),null,'missing player never queries every player');
    const damaged={...board,entries:[...board.entries,{...board.entries[0],timeSec:1,eventKey:'invalid-layout'}]};
    same(bestSummitAttackTime(damaged,'attack-player'),102,'malformed raw rows cannot manufacture a medal');
    const markup=courseAccessPanel(profile,index,'',{leaderboard:board,playerId:'attack-player'});
    const card=markup.split('<article').find(row=>row.includes('Summit Time Attack'));
    check(card.includes('BEST GOLD')&&card.includes('102.0 s'),'course card shows best medal across valid contexts');
    check(card.includes('ONE RUN')&&card.includes('NO PAY'),'solo card explains its actual event');
    check(!card.includes('data-course-unlock=')&&!card.includes('data-team-room='),'solo card cannot sell the free challenge or offer a duplicate Team Room');
    same(JSON.stringify(board),before,'medal queries never mutate leaderboard rows');
    const app={runId:'attack-ui',duel:{state:null},_switches:()=>({enabled:()=>false})};
    const render=createResultsScreen({app,profile:()=>profile,credits:String,escapeHTML:String,time:value=>Number(value).toFixed(1)});
    for(const [timeSec,won,label]of [[102,true,'GOLD'],[107,true,'SILVER'],[114,true,'BRONZE'],[116,false,null]]){
      const state={stageIndex:index,status:'stage_result',mode:'timetrial',stageTimeSec:timeSec,lapsTotal:1,
        completedLaps:1,results:{completed:true,won,timeSec,medal:label?.toLowerCase()??null,creditReward:0}};
      app.duel.state=state;const snapshot=JSON.stringify(state),html=render(state);
      check(html.includes('FINISHED.'),'legal solo completion always says Finished');
      if(label)check(html.includes('MEDAL')&&html.includes(label),'earned medal appears under the time');
      else check(!html.includes('MEDAL'),'slower-than-bronze legal finish has no medal');
      check(!html.includes('LOSS CHARGE')&&!html.includes('CREDITS EARNED')&&!html.includes('bonus is included'),'solo results never promise pay or bonuses');
      check(html.includes('GOLD')&&html.includes('103.0'),'measured-derived medal targets are shown');
      same(JSON.stringify(state),snapshot,'results presentation never writes race state');
      app.profileSaved=false;
      const sessionOnly=render(state);
      check(sessionOnly.includes('Storage is unavailable; progress lasts for this session.'),'medal and over-bronze finishes disclose failed profile storage');
      check(sessionOnly.includes('FINISHED.'),'session-only storage does not turn a legal finish into a failure');
      if(label)check(sessionOnly.includes('MEDAL')&&sessionOnly.includes(label),'session-only finish retains its actual earned medal');
      else check(!sessionOnly.includes('MEDAL'),'session-only over-bronze finish still has no medal');
      same(JSON.stringify(state),snapshot,'session-only result warning never writes race state');
      app.profileSaved=true;
      check(!render(state).includes('Storage is unavailable'),'successful profile storage does not show a session-only warning');
    }
  }finally{if(restoredAttack)COURSE[attackIndex]=restoredAttack;COURSE.splice(count);}
}

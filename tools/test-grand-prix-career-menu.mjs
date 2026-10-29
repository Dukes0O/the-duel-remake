import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {COURSE, CARS} from '../src/config.js';
import {COURSE_PRICES, isCourseUnlocked, courseUnlockRequirement} from '../src/course-access.js';
import {createProfile} from '../src/progression.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import * as panelUi from '../src/course-access-ui.js';
import {courseScreen, createCourseActions} from '../src/screen-courses.js';

// Original flag-off markup captured before this card's implementation.
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const credits=value=>Math.floor(value||0).toLocaleString();
function legacyPanel(profile,selectedStage=0,message='',{teamRoomEnabled=false}={}){
  const cards=COURSE.map((course,index)=>{
    const owned=isCourseUnlocked(profile,course),selected=index===selectedStage,price=COURSE_PRICES[course.id];
    const attack=course.id==='summit-time-attack',requirement=courseUnlockRequirement(course);
    // Any course opened by an unlock rule (the solo challenge, the five secret courses) shows its condition and a locked button.
    const condition=requirement&&!owned?`<p>${escape(requirement.condition)}</p>`:'';
    const description=attack?`${(course.lengthU/1000).toFixed(2).replace(/0$/,'')} km · SOLO TIME TRIAL · ONE RUN · NO PAY.`:course.practice?'Untimed free driving. No credits, records or finish line.':course.stuntTrial?'Two laps, four landed jumps and four crushes.':course.kind==='drift'?'Bank the drift target and finish before the deadline.':course.kind==='checkpoint'?'Pass all twelve timed gates over two laps.':course.kind==='chase'?'Escape pursuit and finish before the deadline.':`${(course.lengthU/1000).toFixed(2).replace(/0$/,'')} km per lap · Two-lap ${course.kind?'standalone event':'campaign circuit'}.`;
    const teamRoom=teamRoomEnabled&&course.closed!==false?`<button type="button" data-team-room="${escape(course.id)}" aria-label="${owned?'Study':'Unlock to study'} ${escape(course.name)} in the Team Room" ${owned?'':'disabled'}>TEAM ROOM ↗</button>`:'';
    return `<article class="course-access-card${selected?' selected':''}"><div><span class="field-label">${course.practice?'PRACTICE':owned?'UNLOCKED':requirement?'LOCKED':`${credits(price)} CR`}</span><h3>${escape(course.name)}</h3><p>${description}</p>${condition}${course.requiredCar?`<p class="course-recommendation">${escape(CARS[course.requiredCar]?.name||'Titan')} recommended.${course.arena?' Lighter cars cannot crush wrecks.':''}</p>`:''}</div>${owned?`<button type="button" data-course-select="${course.id}" aria-label="Select ${escape(course.name)} for free" aria-pressed="${selected}" ${selected?'disabled':''}>${selected?'SELECTED':'SELECT COURSE'}</button>`:requirement?`<button type="button" disabled aria-label="${escape(requirement.condition)}">LOCKED</button>`:`<button type="button" data-course-unlock="${course.id}" aria-label="Unlock ${escape(course.name)} for ${price} credits" ${profile.credits<price?'disabled':''}>UNLOCK · ${credits(price)} CR</button>`}${teamRoom}</article>`;
  }).join('');
  return `<section class="career-panel course-access-panel" role="dialog" aria-modal="true" aria-labelledby="courses-title"><header class="shop-heading"><div><p class="eyebrow">EARN YOUR NEXT HORIZON</p><h2 id="courses-title">YOUR COURSES.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(profile.credits)}<small> CR</small></b></div><button class="shop-close" data-action="courses-close" aria-label="Close course garage">×</button></header><p>Pacific Canyon is included. Unlocking a course does not select it. Any owned car can enter an unlocked course.</p><p class="course-access-message" role="status" aria-live="polite">${escape(message)||'Course purchases belong to this player. Completed race credits stay safe.'}</p><div class="course-access-grid">${cards}</div></section>`;
}


const articles=html=>html.match(/<article\b[\s\S]*?<\/article>/g)||[];
const withApp=body=>{
  const previous=globalThis.localStorage, memory=new Map();
  globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  try {
    const app=new App();
    app.duel.featureFlags=createFeatureFlags({storage:null,qa:false,search:'',overrides:{'grand-prix':true,'grand-prix-career':true}});
    return body(app,memory);
  } finally {
    if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;
  }
};
const actionsFor=app=>{
  const choices=app.getRaceChoices(),effects=[];
  const actions=createCourseActions({app,choices,
    careerEnabled:()=>app._switches().enabled('grand-prix-career'),
    grandPrixAvailable:course=>app.grandPrixAvailable(course),
    setMessage:value=>effects.push(['message',value]),setOpen:value=>effects.push(['open',value]),
    updateMenuScene:()=>effects.push(['scene']),invalidate:()=>effects.push(['invalidate']),renderState:()=>effects.push(['render'])});
  return {actions,choices,effects};
};
const snapshot=app=>JSON.stringify({profile:app.profile,choices:app.getRaceChoices(),state:app.duel.state});
const gpButton=id=>({dataset:{courseSelect:id,courseMode:'grandprix'}});

test('flag off preserves complete original markup and ordinary actions',()=>withApp(app=>{
  for(const profile of [createProfile(),{...createProfile(),credits:2345,courses:{version:1,unlocked:COURSE.map(course=>course.id)}}]){
    for(const teamRoomEnabled of [false,true]){
      const options={teamRoomEnabled,grandPrixCareerEnabled:false,grandPrixAvailable:()=>true,selectedMode:'grandprix'};
      assert.equal(courseAccessPanel(profile,2,'<safe>',options),legacyPanel(profile,2,'<safe>',{teamRoomEnabled}));
      assert.equal(courseScreen(profile,2,'<safe>',options),legacyPanel(profile,2,'<safe>',{teamRoomEnabled}));
    }
  }
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true,'grand-prix-career':false}});
  const ui=actionsFor(app),before=snapshot(app);
  ui.actions.handle(gpButton(COURSE[0].id));
  assert.equal(snapshot(app),before);assert.deepEqual(ui.effects,[]);
  ui.actions.handle({dataset:{courseSelect:COURSE[0].id}});
  assert.equal(app.getRaceChoices().mode,'duel');assert.ok(ui.effects.some(row=>row[0]==='open'&&row[1]===false));
}));

test('enabled grouping uses actual App availability once, order, prices and base Team Room',()=>withApp(app=>{
  const options={teamRoomEnabled:true,grandPrixCareerEnabled:true,grandPrixAvailable:course=>app.grandPrixAvailable(course),selectedMode:'duel'};
  const html=courseAccessPanel(app.profile,0,'<safe>',options),gp=COURSE.filter(course=>app.grandPrixAvailable(course)),classic=COURSE.filter(course=>!app.grandPrixAvailable(course));
  assert.ok(html.includes('GRAND PRIX')&&html.includes('CLASSIC COURSES'));
  assert.equal(articles(html).length,COURSE.length);
  // A course opened only by an unlock rule (the solo challenge, the five secret courses) has no select or buy button while locked, so it is found by its name.
  const gated=course=>courseUnlockRequirement(course)&&!isCourseUnlocked(app.profile,course);
  assert.deepEqual(articles(html).map(card=>COURSE.find(course=>gated(course)&&card.includes('<h3>'+escape(course.name)+'</h3>'))?.id??card.match(/data-course-(?:select|unlock)="([^"]+)"/)[1]),[...gp,...classic].map(course=>course.id));
  for(const course of COURSE){
    const matches=card=>gated(course)?card.includes('<h3>'+escape(course.name)+'</h3>'):card.includes('="'+course.id+'"');
    const card=articles(html).find(matches);
    assert.ok(card);assert.equal(articles(html).filter(matches).length,1);
    if(course.id==='summit-time-attack'){
      assert.ok(card.includes('SOLO TIME TRIAL · ONE RUN · NO PAY.')&&card.includes('Own Summit Run to enter this solo challenge for free.'));
      assert.ok(card.includes('disabled')&&!card.includes('data-course-unlock='),'the locked solo child offers no credit purchase');
    }else if(gated(course)){
      assert.ok(card.includes(escape(courseUnlockRequirement(course).condition))&&card.includes('disabled')&&!card.includes('data-course-unlock='),course.id+': a locked secret course says how to find it and offers no purchase');
    }else if(!isCourseUnlocked(app.profile,course))assert.ok(card.includes('aria-label="Unlock '+escape(course.name)+' for '+COURSE_PRICES[course.id]+' credits"')&&card.includes('disabled'));
    assert.equal(card.includes('data-team-room='),course.closed!==false);
    if(course.requiredCar)assert.ok(card.includes('recommended.'));
    if(app.grandPrixAvailable(course)){
      assert.ok(card.includes((course.fieldSize||8)+' cars'));
      assert.ok(card.includes(course.closed===false?'ONE RUN':(course.grandPrixLaps||3)+' laps'));
    }
  }
  const first=articles(html).find(card=>card.includes('data-course-select="'+COURSE[0].id+'"'));
  assert.ok(first.includes('data-course-mode="grandprix"')&&first.includes('aria-pressed="false"')&&!first.includes('>SELECTED</button>'));
  assert.ok(html.includes('&lt;safe&gt;')&&html.includes('role="dialog"')&&html.includes('role="status"'));
  assert.ok(!html.includes('GP COMPARISON')&&!html.includes('variant'));
  const absent=courseAccessPanel(app.profile,0,'',{...options,grandPrixAvailable:()=>false});
  assert.ok(!absent.includes('GRAND PRIX'));assert.equal(articles(absent).length,COURSE.length);
  const all=courseAccessPanel(app.profile,0,'',{...options,grandPrixAvailable:()=>true});
  assert.ok(all.includes('GRAND PRIX')&&!all.includes('CLASSIC COURSES'));assert.equal(articles(all).length,COURSE.length);
}));

test('same course Duel to GP uses real settings; a selected GP button then matches both',()=>withApp(app=>{
  const ui=actionsFor(app),bank=app.profile.credits;
  assert.equal(ui.actions.handle(gpButton(COURSE[0].id)),true);
  assert.equal(app.getRaceChoices().mode,'grandprix');assert.equal(app.menuStage,0);
  assert.deepEqual(ui.choices,app.getRaceChoices());assert.equal(app.profile.credits,bank);
  assert.ok(ui.effects.some(row=>row[0]==='open'&&row[1]===false));
  const html=courseScreen(app.profile,0,'',{grandPrixCareerEnabled:true,grandPrixAvailable:course=>app.grandPrixAvailable(course),selectedMode:'grandprix'});
  const card=articles(html).find(card=>card.includes('data-course-select="'+COURSE[0].id+'"'));
  assert.ok(card.includes('aria-pressed="true"')&&card.includes('disabled')&&card.includes('>SELECTED</button>'));
}));

test('explicit requests reject locked, unsupported, unavailable and mid-race courses without effects',()=>withApp(app=>{
  const locked=COURSE.find(course=>app.grandPrixAvailable(course)&&!isCourseUnlocked(app.profile,course));
  const unsupported=COURSE.find(course=>!app.grandPrixAvailable(course));
  assert.ok(locked&&unsupported);
  for(const button of [gpButton(locked.id),gpButton(unsupported.id),gpButton('missing'),{dataset:{courseSelect:COURSE[0].id,courseMode:'missing'}}]){
    const ui=actionsFor(app),before=snapshot(app);assert.equal(ui.actions.handle(button),true);
    assert.equal(snapshot(app),before);assert.deepEqual(ui.effects,[]);
  }
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':false,'grand-prix-career':true}});
  let ui=actionsFor(app),before=snapshot(app);ui.actions.handle(gpButton(COURSE[0].id));assert.equal(snapshot(app),before);assert.deepEqual(ui.effects,[]);
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true,'grand-prix-career':true}});
  const select=app.selectCourse;app.selectCourse=()=>false;
  ui=actionsFor(app);before=snapshot(app);ui.actions.handle(gpButton(COURSE[0].id));assert.equal(snapshot(app),before);assert.deepEqual(ui.effects,[]);app.selectCourse=select;
  for(const status of ['countdown','racing','stage_result']){
    app.duel.state.status=status;ui=actionsFor(app);before=snapshot(app);ui.actions.handle(gpButton(COURSE[0].id));assert.equal(snapshot(app),before);assert.deepEqual(ui.effects,[]);
  }
}));

test('purchase keeps price, wallet, selection and mode; ordinary selection stays normal',()=>withApp(app=>{
  const paid=COURSE.find(course=>app.grandPrixAvailable(course)&&COURSE_PRICES[course.id]>0);
  app.profile.credits=9000;app._saveProfile();
  const ui=actionsFor(app),before=app.getRaceChoices();
  ui.actions.handle({dataset:{courseUnlock:paid.id}});
  assert.equal(app.profile.credits,9000-COURSE_PRICES[paid.id]);assert.deepEqual(app.getRaceChoices(),before);
  assert.ok(isCourseUnlocked(app.profile,paid));assert.ok(!ui.effects.some(row=>row[0]==='open'));
  const bank=app.profile.credits;ui.actions.handle({dataset:{courseUnlock:paid.id}});assert.equal(app.profile.credits,bank);assert.deepEqual(app.getRaceChoices(),before);
  ui.actions.handle({dataset:{courseSelect:paid.id}});
  assert.equal(COURSE[app.menuStage].id,paid.id);assert.equal(app.getRaceChoices().mode,'duel');assert.equal(app.profile.credits,bank);
  const router=readFileSync(new URL('../src/screen-router.js',import.meta.url),'utf8');
  assert.ok(router.includes("enabled('grand-prix-career')")&&router.includes('grandPrixAvailable:')&&router.includes('selectedMode: choices.mode'));
}));


test('authored description preserves four laps, custom field and open one-run wording',()=>{
  assert.equal(typeof panelUi.grandPrixCourseDescription,'function');
  assert.equal(panelUi.grandPrixCourseDescription({lengthU:4000}), '4.0 km per lap · 8 cars · 3 laps.');
  assert.equal(panelUi.grandPrixCourseDescription({lengthU:4200,fieldSize:8,grandPrixLaps:4}), '4.2 km per lap · 8 cars · 4 laps.');
  assert.equal(panelUi.grandPrixCourseDescription({lengthU:6800,fieldSize:6,grandPrixLaps:1,closed:false}), '6.8 km · 6 cars · ONE RUN.');
});

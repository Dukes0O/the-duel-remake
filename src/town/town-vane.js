import {ACT3_CHAPTERS} from './content/lines-act3.js';
import {VANE_LETTERS} from './content/vane-letters.js';
import {TOWN_DEEDS} from './content/deeds.js';
import {registerTownSystem} from './town-sim.js';

const records=value=>value&&typeof value==='object'&&!Array.isArray(value);
const emptyState=()=>({started:false,startedAt:null,kiosks:[],brownStreets:[],letters:[],pendingLetters:[],lastLetterMonth:null,lastVisitMonth:null,events:{},chapterFacts:{}});
const stateFor=town=>records(town?.vane)?town.vane:emptyState();
// Years have no ceiling and may be big integers; her schedule only needs months since she began.
const monthNumber=calendar=>Number(BigInt(calendar.year)-1n)*12+Number(calendar.month);

export function townVaneState(town) {
  const state=stateFor(town);
  return Object.freeze({started:state.started,startedAt:state.startedAt,
    kiosks:state.kiosks.map(row=>({...row})),letters:state.letters.map(row=>({...row})),
    nextChapter:ACT3_CHAPTERS.find(chapter=>state.chapterFacts[chapter.id]!==true)||null});
}

function writableState(town) {
  if(!records(town.vane)) town.vane={version:1,...emptyState()};
  const state=town.vane;
  for(const key of ['kiosks','brownStreets','letters','pendingLetters']) if(!Array.isArray(state[key])) state[key]=[];
  for(const key of ['events','chapterFacts']) if(!records(state[key])) state[key]={};
  return state;
}

// Water-quality systems can replace the streets at any time. Brown streets
// remain eligible for a kiosk; a kiosk closes when its own street is clean.
export function setTownVaneBrownStreets(town,streetIds) {
  if(!Array.isArray(streetIds)||!streetIds.every(id=>typeof id==='string'&&id)) return {ok:false,message:'Choose the streets with brown water.'};
  writableState(town).brownStreets=[...new Set(streetIds)];
  return {ok:true};
}

// Story events are named in the content table, so new events and letters do
// not need another branch in the simulation.
export function recordTownVaneEvent(town,condition,context={}) {
  if(typeof condition!=='string'||!condition) return {ok:false,message:'Choose a town event.'};
  const state=writableState(town);
  const letter=VANE_LETTERS.find(row=>row.condition===condition);
  const eventKey=letter?.repeatable?`${condition}:${context?.year??town.calendar?.year??1}`:condition;
  if(state.events[eventKey]) return {ok:true,added:false};
  // A yearly letter keeps only this year's mark, so saved rows do not grow with the years.
  if(letter?.repeatable) for(const key of Object.keys(state.events)) if(key.startsWith(`${condition}:`)) delete state.events[key];
  state.events[eventKey]=true;
  if(letter) state.pendingLetters.push({id:letter.id,context:records(context)?{...context}:{}});
  return {ok:true,added:Boolean(letter)};
}

function waterStreets(town) {
  const taps=town.utilities?.waterResult?.taps??town.utilities?.taps??[];
  return taps.filter(tap=>tap&&typeof tap.id==='string'&&tap.id&&Number(tap.litresPerDay??1)>0
    &&Number(tap.quality?.turbidity??town.utilities?.quality?.turbidity??10)>1).map(tap=>tap.id);
}
function detectConditions(town,state,calendar) {
  const ids=new Set((town.buildings??[]).filter(row=>row&&(row.finished===true||row.status==='finished'||row.state==='finished')).map(row=>row.buildingId??row.kind??row.type??row.id));
  const known={statue:'statue-built','town-hall':'town-hall-built',school:'school-built',clinic:'clinic-built','goat-pen':'goat-pen-built',reservoir:'reservoir-built'};
  for(const [building,condition] of Object.entries(known)) if([...ids].some(id=>String(id).includes(building))) recordTownVaneEvent(town,condition);
  if(town.weather?.drought&&calendar.season==='Summer') recordTownVaneEvent(town,'dry-summer');
  for(const [n,condition] of [[500,'population-500'],[1000,'population-1000']]) if((town.people?.length??0)>=n) recordTownVaneEvent(town,condition);
  for(const [id,item] of Object.entries(town.deeds?.items??{})) {
    if(item?.ownerId==='vane') recordTownVaneEvent(town,'vane-won-deed',{deedId:id});
  }
  for(const territoryId of new Set(TOWN_DEEDS.map(deed=>deed.territoryId))) {
    const set=TOWN_DEEDS.filter(deed=>deed.territoryId===territoryId);
    if(set.length>=3&&set.every(deed=>town.deeds?.items?.[deed.id]?.ownerId==='player')) recordTownVaneEvent(town,'player-holds-deed-set',{territoryId});
  }
  if(Object.values(town.deeds?.items??{}).filter(item=>item?.ownerId==='vane').length>=12) recordTownVaneEvent(town,'vane-holds-twelve-deeds');
  const dirty=waterStreets(town),previous=state.brownStreets;
  if(previous.length===0&&dirty.length) recordTownVaneEvent(town,'water-brown-again');
  state.brownStreets=dirty;
}
function townReport(town,who,what,where='Town',kind='note',key=kind) {
  town.reports??=[];town.nextReportNumber??=1;
  const facts={source:'town-vane',kind,key};
  const existing=town.reports.find(report=>report.facts?.source==='town-vane'
    &&report.facts.kind===kind&&report.facts.key===key);
  if(existing) {
    existing.who=who;existing.what=what;existing.where=where;existing.createdTick=BigInt(town.tick);
    existing.expiresTick=BigInt(town.tick);existing.unanswered=false;existing.answers=[];existing.outcome='Read';existing.facts=facts;
    return existing;
  }
  const report={id:`report-${town.nextReportNumber++}`,who,what,where,priority:1,bad:false,createdTick:BigInt(town.tick),expiresTick:BigInt(town.tick),unanswered:false,answers:[],outcome:'Read',facts};
  town.reports.push(report);
  return report;
}
function addCrispReport(town,state,month) {
  if(state.lastVisitMonth===month) return;
  const visitMonths=month-(state.startedAt??month);
  if(visitMonths<12||visitMonths%12!==0||state.lastCrispMonth===month) return;
  state.lastCrispMonth=month;
  townReport(town,'Mr Crisp','Mr Crisp visited and left a neat report: “So sorry, I was passing. Mrs Vane asked me to see how you were getting on.”','Town gate','crisp-visit','annual');
  state.lastVisitMonth=month;
}
function recordYearlyLetter(town,calendar) {
  if(calendar.year<=7||calendar.month!==1) return;
  const condition=(calendar.year-8)%2===0?'quiet-yearly-visit':'quiet-yearly-no-reply';
  recordTownVaneEvent(town,condition,{year:calendar.year});
}
function updateVane({town,calendar}) {
  const state=writableState(town),month=monthNumber(calendar);
  if(!state.started) {
    const chapter16Done=town.story?.completed?.[16]===true
      ||town.story?.completed?.['town.act2.pim']===true
      ||town.story?.facts?.chapter16Done===true;
    if(calendar.year<7||!chapter16Done) return;
    state.started=true;state.startedAt=month;state.chapterFacts[ACT3_CHAPTERS[0].id]=true;
  }
  recordYearlyLetter(town,calendar);
  detectConditions(town,state,calendar);
  const vaneDeeds=Object.values(town.deeds?.items??{}).filter(item=>item?.ownerId==='vane').length;
  if(vaneDeeds>=12) {
    if(!Number.isSafeInteger(state.deedRestUntil)) state.deedRestUntil=month+24;
    if(month<state.deedRestUntil) {
      for(const item of Object.values(town.deeds?.items??{})) if(item?.ownerId==='player'&&item.bid) item.bid=null;
    } else state.deedRestUntil=0;
  } else state.deedRestUntil=null;
  if(state.chapterFacts[ACT3_CHAPTERS[1].id]!==true&&state.kiosks.length>=2) state.chapterFacts[ACT3_CHAPTERS[1].id]=true;
  if(state.chapterFacts[ACT3_CHAPTERS[2].id]!==true&&(town.story?.completed?.['town.act3.the-deeds']===true||town.story?.facts?.tollkeeperArrived===true)) state.chapterFacts[ACT3_CHAPTERS[2].id]=true;
  const settled=town.story?.facts?.settledWarlords;
  if(state.chapterFacts[ACT3_CHAPTERS[3].id]!==true&&Array.isArray(settled)&&settled.length>=2) state.chapterFacts[ACT3_CHAPTERS[3].id]=true;
  const ownsTanker=Boolean(town.vehicles?.some?.(v=>v.kind==='tanker'||v.vehicleId==='tanker'));
  const dotStanding=Number(town.relationships?.dot?.standing??town.story?.facts?.dotStanding??0);
  if(state.chapterFacts[ACT3_CHAPTERS[4].id]!==true&&calendar.year>=11&&state.chapterFacts[ACT3_CHAPTERS[2].id]&&ownsTanker&&dotStanding>=30) state.chapterFacts[ACT3_CHAPTERS[4].id]=true;
  addCrispReport(town,state,month);
  if(month===state.lastVisitMonth) return;
  if(state.lastVisitMonth===null&&month-state.startedAt<2) return;
  const kioskMonths=month-state.startedAt-2;
  if(kioskMonths>=0&&kioskMonths%4===0&&state.brownStreets.length) {
    const occupied=new Set(state.kiosks.map(row=>row.streetId));
    const streetId=state.brownStreets.find(id=>!occupied.has(id));
    if(streetId) {
      state.kiosks.push({id:`vane-kiosk-${state.kiosks.length+1}`,streetId,openedMonth:month,open:true});
      townReport(town,'Odessa',`A white Vane water kiosk opened on ${streetId}. The water there is still brown.`,streetId,'kiosk','latest');
    }
  }
  for(const kiosk of state.kiosks) if(kiosk.open&& !state.brownStreets.includes(kiosk.streetId)) kiosk.open=false;
  // Deliver at most one letter per month, in the order events happened.
  if(state.pendingLetters.length&&state.lastLetterMonth!==month
    &&(state.lastLetterMonth===null||month-state.lastLetterMonth>=6)) {
    const pending=state.pendingLetters.shift(),content=VANE_LETTERS.find(row=>row.id===pending.id);
    if(content) {
      const year=calendar.year;
      const letter={id:content.id,year,month:calendar.month,text:content.text.replaceAll('{year}',String(year)),context:pending.context};
      state.letters.push(letter);
      town.book??=[];
      town.book.push({type:'vane-letter',tick:BigInt(town.tick),text:letter.text});
      townReport(town,'Mrs Vane (letter)',letter.text,'Town post','letter','latest');
      state.lastLetterMonth=month;
    }
  }
  state.lastVisitMonth=month;
}

const registerVaneSystem=()=>registerTownSystem('town-vane',82,1,updateVane);
let unregisterVaneSystem=registerVaneSystem();

// Lets the save fingerprint test compare the registered system with the same
// simulation while this one system is absent, then restore the normal registry.
export function unregisterTownVaneForTest() {
  unregisterVaneSystem();
  return ()=>{unregisterVaneSystem=registerVaneSystem();};
}

export {ACT3_CHAPTERS,VANE_LETTERS};

import {ACT3_CHAPTERS} from './content/lines-act3.js';
import {VANE_LETTERS} from './content/vane-letters.js';
import {registerTownSystem} from './town-sim.js';

const records=value=>value&&typeof value==='object'&&!Array.isArray(value);
const stateFor=town=>{
  if(!records(town.vane)) town.vane={version:1,started:false,startedAt:null,kiosks:[],brownStreets:[],letters:[],pendingLetters:[],lastLetterMonth:null,lastVisitMonth:null,events:{},chapterFacts:{}};
  const state=town.vane;
  if(!Array.isArray(state.kiosks)) state.kiosks=[];
  if(!Array.isArray(state.brownStreets)) state.brownStreets=[];
  if(!Array.isArray(state.letters)) state.letters=[];
  if(!Array.isArray(state.pendingLetters)) state.pendingLetters=[];
  if(!records(state.events)) state.events={};
  if(!records(state.chapterFacts)) state.chapterFacts={};
  return state;
};
const monthNumber=calendar=>(calendar.year-1)*12+calendar.month;

export function townVaneState(town) {
  const state=stateFor(town);
  return Object.freeze({started:state.started,startedAt:state.startedAt,
    kiosks:state.kiosks.map(row=>({...row})),letters:state.letters.map(row=>({...row})),
    nextChapter:ACT3_CHAPTERS.find(chapter=>state.chapterFacts[chapter.id]!==true)||null});
}

// Water-quality systems can replace the streets at any time. Brown streets
// remain eligible for a kiosk; a kiosk closes when its own street is clean.
export function setTownVaneBrownStreets(town,streetIds) {
  if(!Array.isArray(streetIds)||!streetIds.every(id=>typeof id==='string'&&id)) return {ok:false,message:'Choose the streets with brown water.'};
  stateFor(town).brownStreets=[...new Set(streetIds)];
  return {ok:true};
}

// Story events are named in the content table, so new events and letters do
// not need another branch in the simulation.
export function recordTownVaneEvent(town,condition,context={}) {
  if(typeof condition!=='string'||!condition) return {ok:false,message:'Choose a town event.'};
  const state=stateFor(town);
  const letter=VANE_LETTERS.find(row=>row.condition===condition);
  const eventKey=letter?.repeatable?`${condition}:${context?.year??town.calendar?.year??1}`:condition;
  if(state.events[eventKey]) return {ok:true,added:false};
  state.events[eventKey]=true;
  if(letter) state.pendingLetters.push({id:letter.id,context:records(context)?{...context}:{}});
  return {ok:true,added:Boolean(letter)};
}

function updateVane({town,calendar}) {
  const state=stateFor(town),month=monthNumber(calendar);
  if(!state.started) {
    const chapter16Done=town.story?.completed?.[16]===true
      ||town.story?.completed?.['town.act2.pim']===true
      ||town.story?.facts?.chapter16Done===true;
    if(calendar.year<7||!chapter16Done) return;
    state.started=true;state.startedAt=month;state.chapterFacts[ACT3_CHAPTERS[0].id]=true;
  }
  if(month===state.lastVisitMonth) return;
  if(state.lastVisitMonth===null&&month-state.startedAt<2) return;
  const kioskMonths=month-state.startedAt-2;
  if(kioskMonths>=0&&kioskMonths%4===0&&state.brownStreets.length) {
    const occupied=new Set(state.kiosks.map(row=>row.streetId));
    const streetId=state.brownStreets.find(id=>!occupied.has(id));
    if(streetId) state.kiosks.push({id:`vane-kiosk-${state.kiosks.length+1}`,streetId,openedMonth:month,open:true});
  }
  for(const kiosk of state.kiosks) if(kiosk.open&& !state.brownStreets.includes(kiosk.streetId)) kiosk.open=false;
  // Deliver at most one letter per month, in the order events happened.
  if(state.pendingLetters.length&&state.lastLetterMonth!==month
    &&(state.lastLetterMonth===null||month-state.lastLetterMonth>=6)) {
    const pending=state.pendingLetters.shift(),content=VANE_LETTERS.find(row=>row.id===pending.id);
    if(content) {
      const year=calendar.year;
      state.letters.push({id:content.id,year,month:calendar.month,text:content.text.replaceAll('{year}',String(year)),context:pending.context});
      state.lastLetterMonth=month;
    }
  }
  state.lastVisitMonth=month;
}

registerTownSystem('town-vane',82,1,updateVane);

export {ACT3_CHAPTERS,VANE_LETTERS};

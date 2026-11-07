import assert from 'node:assert/strict';
import {createTown,serializeTown} from '../src/town/town-state.js';
import {stepTown,registeredTownSystems} from '../src/town/town-sim.js';
import {townVaneState,setTownVaneBrownStreets,recordTownVaneEvent,unregisterTownVaneForTest,ACT3_CHAPTERS,VANE_LETTERS} from '../src/town/town-vane.js';
import {ACT3_CAPTIONS} from '../src/town/content/lines-act3.js';
import {captionText} from '../src/story/story-lines.js';
import {TOWN_DEEDS} from '../src/town/content/deeds.js';
import {placeTownDeedBid,townDeedState} from '../src/town/town-deeds.js';

assert.equal(registeredTownSystems().some(row=>row.name==='town-vane'),true);
assert.equal(VANE_LETTERS.length,35);
assert.equal(new Set(VANE_LETTERS.map(row=>row.id)).size,VANE_LETTERS.length);
for(const letter of VANE_LETTERS) {
  assert.ok(letter.text.startsWith('Dear Neighbour,'),letter.id);
  assert.ok(letter.text.endsWith('Kind regards.'),letter.id);
  assert.ok(letter.text.length<=260,letter.id);
}
assert.deepEqual(ACT3_CHAPTERS.map(row=>row.number),[17,18,19,20,21]);
for(const chapter of ACT3_CHAPTERS) for(const id of chapter.lineIds) assert.ok(ACT3_CAPTIONS[id],`${chapter.id} references ${id}`);
for(const [id,line] of Object.entries(ACT3_CAPTIONS)) {
  assert.ok(line.text.length<=260,id);
  assert.equal(captionText(id),line.text,id);
}

const town=createTown(41,'Dry Town');
const untouched=serializeTown(town);
assert.equal(townVaneState(town).started,false);
assert.equal(serializeTown(town),untouched,'reading Vane state never writes a save');
assert.equal(setTownVaneBrownStreets(town,['east-road','west-road']).ok,true);
town.vane={version:1,started:true,startedAt:83,kiosks:[],brownStreets:['east-road','west-road'],letters:[],pendingLetters:[],lastLetterMonth:null,lastVisitMonth:null,events:{},chapterFacts:{}};
town.utilities={waterResult:{taps:[{id:'east-road',litresPerDay:500,quality:{turbidity:10}},{id:'west-road',litresPerDay:500,quality:{turbidity:10}}]}};
assert.deepEqual(recordTownVaneEvent(town,'town-hall-built'),{ok:true,added:true});
assert.deepEqual(recordTownVaneEvent(town,'town-hall-built'),{ok:true,added:false});
// Tick 84 months, month 1: the queued letter arrives once and the next brown street
// receives the first kiosk on the two-month, then four-month schedule.
town.tick=BigInt(84*720);
stepTown(town);
let state=townVaneState(town);
assert.equal(state.letters.length,1);
assert.equal(state.letters[0].id,'vane.l.hall');
assert.equal(state.kiosks.length,1);
assert.equal(state.kiosks[0].streetId,'east-road');
stepTown(town);
assert.equal(townVaneState(town).letters.length,1);
assert.equal(town.reports.filter(report=>report.facts?.source==='town-vane'&&report.facts?.kind==='letter').length,1);

// Long-running annual reports replace their panel row while the town keeps
// its separate letter archive intact.
const centuryTown=createTown(100,'Century Town');
centuryTown.story={completed:{16:true}};
centuryTown.vane={version:1,started:true,startedAt:72,kiosks:[],brownStreets:[],letters:[],pendingLetters:[],lastLetterMonth:null,lastVisitMonth:null,events:{},chapterFacts:{}};
for(let tick=0;tick<100*360*24;tick++) stepTown(centuryTown);
assert.ok(centuryTown.calendar.year>=100);
assert.ok(centuryTown.reports.filter(report=>report.facts?.source==='town-vane').length<=3,
  'Vane reports reuse their stable panel keys instead of growing with years');
const centuryLetters=townVaneState(centuryTown).letters;
assert.ok(centuryLetters.length>=90,'a quiet town receives yearly letters after Year 7');
assert.ok(centuryLetters.every((letter,index)=>typeof letter.text==='string'
  &&(!index||letter.id!==centuryLetters[index-1].id)),
'the full letter archive stays readable and alternates its yearly letters');
assert.equal(centuryTown.vane.letters.length,centuryLetters.length,'every letter remains in the saved town archive');

console.log(`Town Vane passed: ${ACT3_CHAPTERS.length} chapters, ${Object.keys(ACT3_CAPTIONS).length} captions, ${VANE_LETTERS.length} letters.`);

// Before Year 7, registering Vane changes only its own optional save field.
const registeredTown=createTown(612,'Fingerprint Town');
const skippedTown=createTown(612,'Fingerprint Town');
for(let tick=0;tick<6*360*24;tick++) stepTown(registeredTown);
const restoreVane=unregisterTownVaneForTest();
try {
  for(let tick=0;tick<6*360*24;tick++) stepTown(skippedTown);
} finally {
  restoreVane();
}
const registeredSave=JSON.parse(serializeTown(registeredTown));
delete registeredSave.vane;
assert.deepEqual(registeredSave,JSON.parse(serializeTown(skippedTown)),
  'the registered Vane update leaves every other save value unchanged through Year 6');

// Old saves acquire their optional Vane field on the first simulation month.
const oldSave=createTown(901,'Old Save');delete oldSave.vane;
assert.equal(Object.hasOwn(oldSave,'vane'),false);
for(let i=0;i<30;i++)stepTown(oldSave);
assert.equal(Object.hasOwn(oldSave,'vane'),true,'monthly simulation initializes old saves');

// An attentive player beats every bid and cleans each street for thirty years.
for(let seed=1;seed<=10;seed++) {
  const longTown=createTown(seed,'Long Town');
  longTown.people=Array.from({length:12},(_,index)=>({id:`p-${index}`,name:`Person ${index}`,health:50}));
  longTown.buildings.push({id:'hall-1',buildingId:'town-hall',finished:true});
  longTown.story={completed:{16:true}};
  longTown.money={balances:{},entries:[],months:{},years:{}};
  longTown.till=1_000_000_000_000_000n;
  townDeedState(longTown);
  for(const deed of TOWN_DEEDS) {
    longTown.deeds.items[deed.id].ownerId='player';
    longTown.deeds.items[deed.id].guarded=true;
  }
  const streetIds=['east-road','west-road','south-road'];
  longTown.utilities={waterResult:{taps:streetIds.map(id=>({id,litresPerDay:500,quality:{turbidity:10}}))}};
  let outbidCount=0;
  // Roll one whole town year at a time; real stepTown calls keep every
  // registered system and its normal seeded inputs in the loop.
  for(let tick=0;tick<30*360*24;tick++) {
    for(const deed of TOWN_DEEDS) {
      const state=longTown.deeds.items[deed.id];
      if(state.bid) {
        const result=placeTownDeedBid(longTown,deed.id,BigInt(state.bid.amount)+1n);
        assert.equal(result.ok,true,`seed ${seed}: the player beats ${deed.name}'s bid`);
        outbidCount++;
      }
    }
    stepTown(longTown);
    if(townVaneState(longTown).kiosks.some(kiosk=>kiosk.open)) {
      for(const tap of longTown.utilities.waterResult.taps) tap.quality.turbidity=0;
    }
  }
  assert.ok(longTown.people.length>0,`seed ${seed}: Vane never removes the town's people`);
  assert.ok(longTown.buildings.some(row=>(row.buildingId??row.id).includes('town-hall')),`seed ${seed}: Vane never removes Town Hall`);
  assert.ok(townVaneState(longTown).started,`seed ${seed}: Vane remains present`);
  assert.ok(outbidCount>0,`seed ${seed}: the player had bids to beat`);
  assert.ok(townVaneState(longTown).kiosks.length>0,`seed ${seed}: Vane opened kiosks`);
  assert.ok(townVaneState(longTown).kiosks.every(kiosk=>!kiosk.open),`seed ${seed}: clean streets close her kiosks`);
  const letters=townVaneState(longTown).letters;
  assert.ok(letters.length>=25,`seed ${seed}: Vane keeps writing after repeated losses`);
  assert.ok(letters.every(letter=>letter.text.startsWith('Dear Neighbour,')&&letter.text.endsWith('Kind regards.')),
    `seed ${seed}: Vane stays polite`);
}

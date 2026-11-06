import assert from 'node:assert/strict';
import {createTown} from '../src/town/town-state.js';
import {stepTown,registeredTownSystems} from '../src/town/town-sim.js';
import {townVaneState,setTownVaneBrownStreets,recordTownVaneEvent,ACT3_CHAPTERS,VANE_LETTERS} from '../src/town/town-vane.js';
import {ACT3_CAPTIONS} from '../src/town/content/lines-act3.js';
import {captionText} from '../src/story/story-lines.js';

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
assert.equal(setTownVaneBrownStreets(town,['east-road','west-road']).ok,true);
town.vane={version:1,started:true,startedAt:83,kiosks:[],brownStreets:['east-road','west-road'],letters:[],pendingLetters:[],lastLetterMonth:null,lastVisitMonth:null,events:{},chapterFacts:{}};
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

console.log(`Town Vane passed: ${ACT3_CHAPTERS.length} chapters, ${Object.keys(ACT3_CAPTIONS).length} captions, ${VANE_LETTERS.length} letters.`);

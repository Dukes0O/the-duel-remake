import assert from 'node:assert/strict';
import '../src/town/systems/index.js';
import {createTown, stepTown, serializeTown, deserializeTown} from '../src/town/index.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {changeTownNeighbourStanding, completeTownNeighbourTrade, setTownOutpostProtection, townNeighbourStanding} from '../src/town/town-outposts.js';
import {townCaptionText} from '../src/town/content/lines.js';
import {townLedger} from '../src/town/town-money.js';
import {answerReport} from '../src/town/town-reports.js';
import {storeGood, stockpileAt} from '../src/town/town-goods.js';

function makeTown(year=1) {
  const town=createTown(412,'Dry Town');
  town.tick=BigInt((year-1)*24*360*12-1);
  town.calendar={year,month:1,day:1,hour:0};
  return town;
}

const town=makeTown();
const yard={regionId:'scablands',x:0,z:0};
storeGood(town,yard,'food',10);
assert.equal(townNeighbourStanding(town,'dot'),0);
const delivery=completeTownNeighbourTrade(town,'dot',{good:'food',amount:10,stockpile:yard});
assert.equal(delivery.ok,true);
assert.equal(delivery.truck.vehicle,'flatbed');
assert.equal(delivery.truck.status,'on-road');
assert.equal(stockpileAt(town,yard).food ?? 0,0);
stepTown(town);
assert.equal(delivery.truck.status,'delivered');
assert.equal(town.outposts.dot.trucks.length,0,'delivered trucks leave the active list');
assert.equal(stockpileAt(town,yard).pie,10);
assert.equal(townNeighbourStanding(town,'dot'),10);

const oldTruckSave=JSON.parse(serializeTown(town));
oldTruckSave.outposts.dot.trucks=Array.from({length:100},(_,i)=>({id:`old-${i}`,status:'delivered'}));
assert.equal(deserializeTown(oldTruckSave).outposts.dot.trucks.length,0,'old delivered trucks are trimmed on load');
assert.equal(changeTownNeighbourStanding(town,'dot',100).standing,100);
assert.equal(changeTownNeighbourStanding(town,'dot',100).standing,100);
assert.equal(changeTownNeighbourStanding(town,'missing',1).ok,false);
storeGood(town,yard,'food',10);
assert.equal(completeTownNeighbourTrade(town,'dot',{good:'food',amount:10,stockpile:yard,delivered:false}).ok,false);
assert.equal(townNeighbourStanding(town,'dot'),75);

const driftTown=makeTown(2);
changeTownNeighbourStanding(driftTown,'dot',4);
changeTownNeighbourStanding(driftTown,'tam',-4);
stepTown(driftTown);
assert.equal(townNeighbourStanding(driftTown,'dot'),3);
assert.equal(townNeighbourStanding(driftTown,'tam'),-3);

const protectedTown=makeTown();
assert.equal(setTownOutpostProtection(protectedTown,'dot').standing,20);
assert.equal(setTownOutpostProtection(protectedTown,'dot').standing,20);
assert.equal(townLedger(protectedTown).till,1500n);
protectedTown.calendar={year:1,month:2,day:1,hour:0};
protectedTown.tick=BigInt(24*30-1);
stepTown(protectedTown);
assert.equal(townLedger(protectedTown).till,1512n);
assert.equal(townLedger(protectedTown).balanced,true);

const reportsTown=makeTown(3);
reportsTown.calendar={year:3,month:1,day:1,hour:0};
reportsTown.tick=BigInt(24*360*2-1);
stepTown(reportsTown);
assert.equal(reportsTown.reports.filter(report=>report.facts?.outpostId==='dot').length,1);
assert.equal(answerReport(reportsTown,reportsTown.reports[0].id,'accept-deal').ok,true);
reportsTown.tick=BigInt((24*360*2)+(24*30)-1);
stepTown(reportsTown);
assert.equal(townNeighbourStanding(reportsTown,'dot'),10);
assert.equal(reportsTown.reports.filter(report=>report.facts?.outpostId==='dot').length,2);
assert.equal(reportsTown.reports[0].answers.length,3);

const chapterTown=makeTown(2);
assert.equal(getTownNext(chapterTown).chapter.id,'town.act1.twelve');
chapterTown.story={facts:{pitsDug:true,wellBuilt:true,salvageDelivered:true,soupBuilt:true,latrineBuilt:true,winterPassed:true,firstFireOut:true,goodYear:true,towerRunning:true},completed:Object.fromEntries(['town.act1.twelve','town.act1.water','town.act1.salvage','town.act1.soup','town.act1.smell','town.act1.winter','town.act1.fire','town.act1.payday','town.act1.pipes','town.act1.proper-town'].map(id=>[id,true]))};
chapterTown.calendar.year=3;
assert.equal(getTownNext(chapterTown).chapter.id,'town.act2.dot-flour');
chapterTown.story.completed['town.act2.dot-flour']=true;
chapterTown.story.completed['town.act2.dot-fire']=true;
chapterTown.calendar.year=5;
assert.equal(getTownNext(chapterTown).chapter.id,'town.act2.quill');

const boTown={people:[{name:'Bo',age:15}],calendar:{year:1}};
assert.equal(townCaptionText('town.bo.16',boTown),null);
boTown.people[0].age=16;
assert.match(townCaptionText('town.bo.grown',boTown),/passed the test/i);
boTown.people[0].age=18;
assert.match(townCaptionText('town.bo.16',boTown),/very good truck/i);

console.log('Town outpost tests passed.');

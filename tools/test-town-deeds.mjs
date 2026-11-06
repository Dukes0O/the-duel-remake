import assert from 'node:assert/strict';
import '../src/town/systems/index.js';
import {createTown,dispatchTownCommand,stepTown,serializeTown,deserializeTown} from '../src/town/index.js';
import {buyTownDeed,guardTownDeed,hasTownDeedPerk,missionResult,placeTownDeedBid,recordTownRoadPassage,townDeedReports,townDeedState} from '../src/town/town-deeds.js';
import {TOWN_DEEDS,TOWN_DEED_TERRITORIES} from '../src/town/content/deeds.js';
import {townLedger} from '../src/town/town-money.js';

const town=createTown(607,'Deed Test');
stepTown(town);
assert.equal(TOWN_DEEDS.length,24);
assert.equal(TOWN_DEED_TERRITORIES.length,8);
for(const territory of TOWN_DEED_TERRITORIES)
  assert.equal(TOWN_DEEDS.filter(deed=>deed.territoryId===territory.id).length,3);
const profile={wasteland:{territories:{sal:{hold:100,claimed:true}}}};
assert.equal(buyTownDeed(town,'sal-road',{}).ok,false,'a deed stays locked until its warlord is beaten');
assert.equal(profile.wasteland.territories.sal.hold,100,'deed purchases read but do not change territory hold');
assert.equal(buyTownDeed(town,'sal-road',{profile}).ok,true);
assert.equal(town.till,1400n);
assert.equal(hasTownDeedPerk(town,'timber-cost'),false);
for(const id of ['sal-works','sal-outpost']) assert.equal(buyTownDeed(town,id,{profile}).ok,true);
assert.equal(hasTownDeedPerk(town,'timber-cost'),true,'holding all three deeds grants the set perk');
assert.equal(townDeedState(town).filter(deed=>deed.territoryId==='sal'&&deed.setHeld).length,3);

assert.equal(guardTownDeed(town,'sal-road').ok,true);
assert.equal(recordTownRoadPassage(town,'sal-road','other').ok,true);
assert.equal(recordTownRoadPassage(town,'sal-road','town').ok,true);
assert.equal(town.deeds.pendingReceipts,2n,'a complete set doubles its road income');
assert.equal(town.deeds.pendingCosts,0n,'the Tollkeeper set perk clears town truck tolls');

const vaneTown=createTown(608,'Vane Bid');
stepTown(vaneTown);
const vaneProfile={wasteland:{territories:{dustmonger:{claimed:true}}}};
for(const id of ['dustmonger-road','dustmonger-works']) buyTownDeed(vaneTown,id,{profile:vaneProfile});
vaneTown.tick=BigInt(24*30*3-1);
stepTown(vaneTown);
const bidId=['dustmonger-road','dustmonger-works'].find(id=>vaneTown.deeds.items[id].bid);
assert.ok(bidId,'Mrs Vane makes a seeded quarterly bid');
assert.equal(placeTownDeedBid(vaneTown,bidId,200).ok,true,'the player can beat an open bid');
assert.equal(vaneTown.deeds.items[bidId].ownerId,'player');

const saleTown=createTown(610,'Vane Sale');
stepTown(saleTown);
const saleProfile={wasteland:{territories:{gunn:{claimed:true}}}};
assert.equal(buyTownDeed(saleTown,'gunn-road',{profile:saleProfile}).ok,true);
saleTown.tick=BigInt(24*30*3-1);
stepTown(saleTown);
for(let tick=0;tick<24*30*2;tick++) stepTown(saleTown);
assert.equal(saleTown.deeds.items['gunn-road'].ownerId,'vane','an unanswered bid closes in Mrs Vane’s favour');
assert.equal(saleTown.till,1550n,'the town receives her bid');
assert.equal(townLedger(saleTown).balanced,true);

const raidTown=createTown(609,'Raid Test');
stepTown(raidTown);
raidTown.tick=BigInt(24*30*4-1);
stepTown(raidTown);
const raidProfile={wasteland:{territories:{mirage:{claimed:true}}}};
assert.equal(buyTownDeed(raidTown,'mirage-road',{profile:raidProfile}).ok,true);
for(let tick=0;tick<24*30*3;tick++) stepTown(raidTown);
// Close the independent Vane bid path so this case proves the six-month raid.
raidTown.deeds.items['mirage-road'].bid=null;
for(let tick=0;tick<24*30*2;tick++) stepTown(raidTown);
for(let tick=0;tick<24*30;tick++) stepTown(raidTown);
assert.equal(raidTown.deeds.items['mirage-road'].ownerId,'raiders');
assert.ok(townDeedReports(raidTown).some(row=>row.type==='raid'));
assert.equal(missionResult(raidTown,{runId:'road-win-1',deedId:'mirage-road',won:true}).settled,true);
assert.equal(missionResult(raidTown,{runId:'road-win-1',deedId:'mirage-road',won:true}).settled,false,'a repeated mission result cannot award the deed twice');
assert.equal(raidTown.deeds.items['mirage-road'].ownerId,'player');
raidTown.deeds.reports.push({id:'answered-report',type:'raid',deedId:'mirage-road',unanswered:false});
assert.ok(!townDeedReports(raidTown).some(row=>row.id==='answered-report'),'answered deed reports are dropped');

const longTown=createTown(612,'Thirty Years of Deeds');
stepTown(longTown);
for(const deed of TOWN_DEEDS) longTown.deeds.items[deed.id]={ownerId:'player',guarded:true,unguardedMonths:0,bid:null};
for(let month=0;month<30*12;month++) {
  longTown.tick=BigInt((month+1)*24*30-1);
  stepTown(longTown);
  const runId=`long-run-${month}`;
  missionResult(longTown,{runId,deedId:'sal-road',won:month%2===0});
  if(month%4===0) missionResult(longTown,{runId,deedId:'sal-road',won:true});
}
assert.equal(longTown.calendar.year,31,'the deed schedule advances through thirty years');
assert.ok(longTown.deeds.reports.length<=32,'unanswered deed reports stay within the bounded recent list');
assert.ok(longTown.deeds.settledMissions.length<=128,'settled mission ids stay within the bounded recent list');
const legacyData=JSON.parse(serializeTown(longTown));
legacyData.deeds.reports.push(...Array.from({length:80},(_,i)=>({id:`old-${i}`,unanswered:i%2===0})));
legacyData.deeds.settledMissions=Array.from({length:300},(_,i)=>`old-run-${i}`);
const legacy=deserializeTown(legacyData);
townDeedReports(legacy);
assert.ok(legacy.deeds.reports.length<=32,'old saves trim deed reports when loaded');
assert.ok(legacy.deeds.settledMissions.length<=128,'old saves trim settled mission ids when loaded');

const saved=deserializeTown(serializeTown(raidTown));
assert.equal(saved.deeds.items['mirage-road'].ownerId,'player','new deed records survive town save and load');
assert.equal(townLedger(town).balanced,true,'deed purchases keep the double-entry Ledger balanced');

const badLedger=createTown(611,'Bad Ledger');
badLedger.till=1500n;
badLedger.money={version:1};
assert.equal(buyTownDeed(badLedger,'sal-road',{profile}).ok,false,'a purchase needs a valid Ledger posting');
assert.equal(badLedger.deeds.items['sal-road'].ownerId,null);
assert.equal(badLedger.till,1500n);
assert.equal(dispatchTownCommand(raidTown,{type:'missionResult',runId:'forged',deedId:'dustmonger-road',won:true}).ok,false,
  'fight results are not accepted as ordinary town commands');
console.log('Town deeds: data, purchase, set perk, toll, bid, raid, mission result, bounded history and save checks passed.');

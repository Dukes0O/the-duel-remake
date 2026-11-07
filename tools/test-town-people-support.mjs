import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {completeTownUtilityRoute, createTown, deserializeTown, serializeTown, stepTown, dispatchTownCommand, registeredTownSystems, TOWN_TIME} from '../src/town/index.js';
import {stepTownHomeGround} from '../src/town/town-home-ground.js';

let checks=0;function check(value,message){assert.ok(value,message);checks++;}
function days(town,count){for(let day=0;day<count;day++)for(let hour=0;hour<TOWN_TIME.ticksPerDay;hour++)stepTown(town);}
function addWell(town,litres=1_000_000){const region=town.regions.scablands;region.groundWater={pits:{},wellJobs:{},wells:{'0:0':{x:0,z:0,yieldLitresPerDay:litres,waterLitres:litres,drawdownLitres:0}},droughtDays:0};}
function stock(town,goods){town.goods={stockpiles:{'scablands:0:0':{goods:{...goods},warehouseId:null}},prices:{}};}
function paint(town,cells){const result=dispatchTownCommand(town,{type:'paintHomeGround',cells});check(result.ok,result.message);return result;}

const empty=createTown(1989,'No plots');days(empty,1);
check(empty.people.length===12,'a town without painted plots keeps its twelve founders');
check(registeredTownSystems().some(system=>system.name==='home-ground'&&system.everyTicks===TOWN_TIME.ticksPerDay),
  'home plots keep their daily system spacing');
check(empty.peopleConditions.shelterPlaces===12&&empty.peopleConditions.paintedHomePlaces===0,'founders stay in their canvas camp without painted home places');
check(!empty.book.some(entry=>entry.type==='arrival'),'no newcomers arrive without finished plots');

const growing=createTown(84,'Homes grow');addWell(growing);stock(growing,{canvas:200,tin:1000,timber:1000,steel:1000,brick:5000});
paint(growing,[{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:3,z:0}]);
days(growing,4);
check(growing.homePlots.filter(plot=>plot.tier>=1).length>=1,'stored canvas lets a household finish a tent');
check(growing.peopleConditions.paintedHomePlaces>=4,'finished painted plots add places');
days(growing,30);
check(growing.people.length>12,'water and finished home places allow arrivals');

const short=createTown(85,'Short of goods');addWell(short);stock(short,{});paint(short,[{x:0,z:0}]);days(short,2);
check(short.homePlots[0].waitingGood==='canvas','a household waits when its plot lacks the canvas to start');
check(short.reports.some(report=>report.eventId==='home-goods-shortage'&&report.what.includes('Short of canvas.')),'the Reports system explains the missing good in a sentence');

const guarded=createTown(83,'Plots stay clear');
paint(guarded,[{x:1000,z:1000},{x:1001,z:1000},{x:1002,z:1000}]);
const blockedPlot=guarded.homePlots[2];blockedPlot.tier=1;blockedPlot.household='protected-family';blockedPlot.family='protected-family';
guarded.homePlots[1].building=true;guarded.homePlots[1].progressDays=1;
const paintedMessage='That ground is painted for homes. Clear the plot first.';
for(const buildingId of ['latrine','road-dirt','pipe-50mm']) {
  const refused=dispatchTownCommand(guarded,{type:'placeBuilding',buildingId,x:1000,z:1000});
  check(!refused.ok&&refused.message===paintedMessage,`${buildingId} cannot be placed on a painted plot`);
}
const overHome=dispatchTownCommand(guarded,{type:'placeBuilding',buildingId:'latrine',x:1002,z:1000});
check(!overHome.ok&&overHome.message===paintedMessage,'a finished home plot cannot be built over');
const routeResult=completeTownUtilityRoute(guarded,{id:'painted-route',kind:'pipe',points:[{x:7996,z:8004},{x:8020,z:8004}]},50,
  {status:'finished',targetKind:'route',targetId:'painted-route',kind:'pipe'});
check(!routeResult.ok&&routeResult.message===paintedMessage,'a utility route crossing painted ground is refused');
const partialClear=dispatchTownCommand(guarded,{type:'clearHomeGround',cells:[{x:1000,z:1000},{x:1001,z:1000},{x:1002,z:1000}]});
check(partialClear.ok&&partialClear.message==='Cleared 1 empty plot. 2 plots could not be cleared because they have homes, are burning or are under construction.'
  &&guarded.homePlots.length===2&&guarded.homePlots.some(plot=>plot.household==='protected-family'),
  'clearing reports the number of empty plots and keeps homes and work in place');

const burned=createTown(87,'Burned plot');addWell(burned);stock(burned,{canvas:100});paint(burned,[{x:0,z:0}]);days(burned,4);
const plot=burned.homePlots[0],family=plot.family;
check(plot.tier===1&&burned.people.some(person=>person.family===family&&person.home===plot.id),'a finished plot holds its household');
burned.weather={windFactor:1};
for(const [id,x,z] of [['fire-west',-1,0],['fire-east',1,0],['fire-north',0,-1],['fire-south',0,1]]){
  burned.buildings.push({id,buildingId:'latrine',regionId:'scablands',x,z,width:1,depth:1,state:'finished'});
  check(dispatchTownCommand(burned,{type:'igniteTownFire',buildingId:id}).ok,'the fire command can light a finished site');
}
for(let hour=0;hour<72&&!plot.burning;hour++)stepTown(burned);
for(let hour=0;hour<72&&plot.burning;hour++)stepTown(burned);
check(plot.tier===0&&!plot.burning&&plot.burnt&&plot.household===null&&burned.people.filter(person=>person.family===family).every(person=>person.home!==plot.id),
  'an extinguished plot becomes a tier-zero ruin, gives no places, and returns its family to canvas');
days(burned,3);
check(plot.tier===1&&!plot.burnt&&plot.household&&burned.people.some(person=>person.family===plot.family&&person.home===plot.id),
  'a canvas family can rebuild the ruin and regain shelter places');
const clearable={...plot,id:'burnt-empty',x:20,z:20,tier:0,household:null,family:null,burning:false,burnt:true,building:false,progressDays:0};
burned.homePlots.push(clearable);
const clearedRuin=dispatchTownCommand(burned,{type:'clearHomeGround',cells:[{x:20,z:20}]});
check(clearedRuin.ok&&!burned.homePlots.includes(clearable),'an empty burned ruin can be cleared');

const dry=createTown(86,'Dry well');addWell(dry,0);days(dry,1);
check(dry.peopleConditions.waterLitresPerPerson===0,'a dry well measures no water per person');

const oldPeople=[{id:'person-1',name:'Saved person',family:'Saved',born:0,home:'canvas-Saved',homeTier:0,homeType:'Canvas',health:100,mood:50,skills:{},needs:{},history:[]}];
const old=deserializeTown(JSON.stringify({version:1,id:'town-old',name:'Old save',seed:4,tick:0,people:oldPeople,buildings:[]}));
check(old.people.length===1&&old.people[0].name==='Saved person'&&Array.isArray(old.homePlots)&&old.homePlots.length===0,'a legacy save keeps its person and gains an empty plot store');

const savedPeople=Array.from({length:20},(_,index)=>({id:`saved-${index}`,name:`Saved ${index}`,family:`saved-family-${Math.floor(index/2)}`,
  born:0,home:`saved-home-${Math.floor(index/2)}`,homeTier:1,homeType:'Tent',health:73,mood:60,skills:{},needs:{shelter:true,waterLitres:50,waterNeedLitres:15,foodCalories:2100},history:[]}));
const migrated=deserializeTown(JSON.stringify({version:1,id:'town-many',name:'Twenty saved people',seed:94,tick:0,people:savedPeople,buildings:[]}));
stock(migrated,{food:1_000_000});
check(migrated.people.length===20&&migrated.homePlots.length===10&&migrated.homePlots.every(plot=>plot.tier===1&&plot.household),
  'a legacy town restores a finished plot and household for every saved home');
check(migrated.people.every(person=>person.health===73)&&migrated.peopleConditions===undefined,
  'migration preserves saved health without inventing measured support');
days(migrated,90);
check(migrated.people.length===20&&migrated.people.every(person=>person.health>0),
  'three months of play do not strand saved people without shelter');

const before=serializeTown(growing);const support={...growing.peopleConditions};
check(support.shelterPlaces===growing.peopleConditions.shelterPlaces&&serializeTown(growing)===before,'reading support does not change town state');

const large=createTown(20261106,'Large home-ground timing');
large.people=Array.from({length:10_000},(_,index)=>({id:`person-${index+1}`,name:`Person ${index+1}`,
  born:0n,nextBirthday:1_000_000n,family:`family-${Math.floor(index/2)}`,home:`home-${Math.floor(index/2)}`,
  homeType:'Shack',homeTier:1,age:0,
  job:null,skills:{building:0},health:100,mood:70,
  needs:{waterLitres:50,waterNeedLitres:15,foodCalories:2100,shelter:true},history:[],generation:0,thought:'The day is calm.'}));
large.peopleIdsReady=true;
large.homePlots=Array.from({length:5_000},(_,index)=>({id:`plot-${index}`,regionId:'scablands',x:index,z:0,
  tier:1,progressDays:0,household:`family-${index}`,family:`family-${index}`,burning:false,building:false,goodDays:0}));
stepTownHomeGround({town:large,tick:BigInt(TOWN_TIME.ticksPerDay)});
const largeStart=performance.now();stepTownHomeGround({town:large,tick:BigInt(TOWN_TIME.ticksPerDay*2)});const largeDayMs=performance.now()-largeStart;
check(large.people.length===10_000&&large.homePlots.length===5_000,'the large timing town keeps all people and plots');
check(largeDayMs<30,`10,000 people and 5,000 plots simulate a home-ground day under 30 ms (saw ${largeDayMs.toFixed(2)} ms)`);
const shortageTown=createTown(20261107,'Large shortage reports');
shortageTown.people=Array.from({length:5000},(_,index)=>({id:`canvas-${index}`,family:`canvas-family-${index}`,home:'canvas',homeType:'Canvas'}));
shortageTown.homePlots=Array.from({length:5000},(_,index)=>({id:`waiting-${index}`,regionId:'scablands',x:index,z:0,
  tier:index%2?1:3,progressDays:0,household:null,family:null,burning:false,building:false,waitingGood:null}));
const shortageStart=performance.now();stepTownHomeGround({town:shortageTown,tick:BigInt(TOWN_TIME.ticksPerDay)});const shortageDayMs=performance.now()-shortageStart;
const openShortages=shortageTown.reports.filter(report=>report.unanswered&&report.eventId==='home-goods-shortage');
check(shortageDayMs<30,`5,000 waiting plots simulate a home-ground day under 30 ms (saw ${shortageDayMs.toFixed(2)} ms)`);
check(openShortages.length===2&&new Set(openShortages.map(report=>report.facts.good)).size===2,
  '5,000 waiting plots produce one open town report for each missing good');
console.log(`Town people support: ${checks} checks passed; 5,000 waiting plots ${shortageDayMs.toFixed(2)} ms, 10,000 people/5,000 plots ${largeDayMs.toFixed(2)} ms.`);

import assert from 'node:assert/strict';
import {createTown, dispatchTownCommand, stepTown, TOWN_TIME, createBuildingWorkOrder, advanceWork, buildingById} from '../src/town/index.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {groundWaterAt} from '../src/town/town-ground.js';

const ticksPerDay=TOWN_TIME.ticksPerDay;
const daysPerYear=TOWN_TIME.daysPerMonth*TOWN_TIME.monthsPerYear;
const paceSeeds=Array.from({length:10},(_,index)=>1989+index*7919);
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function stepDay(town,food=true){
  if(food){const goods={food:Math.max(1,town.people.length*2100/3600+1)};if(town.deliverForGrowth)Object.assign(goods,{canvas:100,tin:100,timber:100,steel:100,brick:200});dispatchTownCommand(town,{type:'deliverTownGoods',cell:{x:0,z:0},goods});}
  for(let hour=0;hour<ticksPerDay;hour++) stepTown(town);
}
function supportedTown(seed,name='Pace test'){
  return createTown(seed,name);
}
function followNextAndBuildStarterSupport(town){
  const first=getTownNext(town);
  check(first.chapter?.id==='town.act1.twelve'&&first.sentence==='Mark three places for test pits.',
    'the new town starts with the actual NEXT instruction to mark test pits');
  const sites=[{x:20,z:20},{x:21,z:20},{x:22,z:20}];
  for(const site of sites){
    const dug=dispatchTownCommand(town,{type:'digTestPit',...site});
    check(dug.ok,'the player can follow NEXT by starting a test pit');
    for(let day=0;day<3;day++) stepDay(town);
    check(groundWaterAt(town,site.x,site.z).known,'the test pit finishes and finds measured ground water');
  }
  town.story||={facts:{},completed:{}};town.story.facts.pitsDug=true;town.story.completed['town.act1.twelve']=true;
  const waterNext=getTownNext(town);
  check(waterNext.chapter?.id==='town.act1.water'&&waterNext.sentence==='Dig and line the best test pit.',
    'NEXT advances to the water task after the pits are finished');
  const best=sites.map(site=>({site,water:groundWaterAt(town,site.x,site.z)}))
    .sort((a,b)=>b.water.yieldLitresPerDay-a.water.yieldLitresPerDay)[0];
  check(dispatchTownCommand(town,{type:'buildWell',...best.site}).ok,'the player builds the well at the best test pit');
  for(let day=0;day<Math.ceil(best.water.depth);day++) stepDay(town);
  check(Boolean(town.regions.scablands.groundWater.wells[`${best.site.x}:${best.site.z}`]),
    'the starter well completes through the town simulation');
  town.story.facts.wellBuilt=true;
  town.story.completed['town.act1.water']=true;
  check(getTownNext(town).chapter?.id==='town.act1.salvage','NEXT advances after the starter well is built');
  dispatchTownCommand(town,{type:'deliverTownGoods',cell:{x:0,z:0},goods:{salvage:5000,food:10000,canvas:10000,tin:10000,timber:10000,steel:10000,brick:10000}});
  town.story.facts.salvageDelivered=true;town.story.completed['town.act1.salvage']=true;
  check(getTownNext(town).chapter?.id==='town.act1.soup','NEXT asks for the soup kitchen after salvage arrives');
  const placed=dispatchTownCommand(town,{type:'placeBuilding',buildingId:'soup-kitchen',x:10,z:10});check(placed.ok,'the player places the soup kitchen');
  const kitchen=town.buildings.at(-1),order=createBuildingWorkOrder(kitchen,buildingById.get('soup-kitchen'));
  for(let stage=0;stage<order.stages.length;stage++){const result=advanceWork(order,stage,order.stages[stage].amount,{...order.stages[stage].ingredients},town);check(result.ok,'the player supplies and completes a soup kitchen work stage');}
  kitchen.state='finished';
  const cells=Array.from({length:40},(_,index)=>({x:60+index,z:60}));
  check(dispatchTownCommand(town,{type:'paintHomeGround',cells}).ok,'the player paints home plots after building the kitchen');
  town.story.facts.soupBuilt=true;town.story.completed['town.act1.soup']=true;town.deliverForGrowth=true;
  check(town.homePlots.length===40&&kitchen.state==='finished','the starter town has real painted plots and its soup kitchen');
  for(const site of [{x:26,z:20},{x:27,z:20},{x:28,z:20},{x:29,z:20}]) {
    check(dispatchTownCommand(town,{type:'digTestPit',...site}).ok,'the player digs another well site');
    for(let day=0;day<3;day++)stepDay(town);
    const field=groundWaterAt(town,site.x,site.z);
    check(dispatchTownCommand(town,{type:'buildWell',...site}).ok,'the player builds another working well');
    for(let day=0;day<Math.ceil(field.depth);day++)stepDay(town);
    check(Boolean(town.regions.scablands.groundWater.wells[`${site.x}:${site.z}`]),'the new well produces measured water');
  }
}
function seedPace(seed){
  const town=supportedTown(seed);
  followNextAndBuildStarterSupport(town);
  const months=Array(24).fill(null);
  let year=town.calendar.year,month=town.calendar.month;
  while(year<=2){
    stepDay(town);
    if(town.calendar.year!==year||town.calendar.month!==month){
      year=town.calendar.year; month=town.calendar.month;
      if(year<=2) months[(year-1)*12+month-1]=town.people.length;
    }
  }
  return {town,months};
}

const results=paceSeeds.map(seed=>({seed,...seedPace(seed)}));
const rangeAt=index=>`${Math.min(...results.map(result=>result.months[index]))}-${Math.max(...results.map(result=>result.months[index]))}`;
console.log(`Town pace sample ranges: first winter ${rangeAt(9)}, Year 1 ${rangeAt(11)}, Year 2 ${rangeAt(23)}.`);
for(const {seed,town,months} of results){
  check(months[9]>=20&&months[9]<=40,`seed ${seed}: first winter has 20 to 40 people, saw ${months[9]}`);
  check(months[11]<100,`seed ${seed}: town cannot reach 100 people in Year 1, saw ${months[11]}`);
  check(months[23]>=80&&months[23]<=140,`seed ${seed}: town reaches about 100 people by Year 2, saw ${months[23]}`);
  check(town.calendar.year===3,`seed ${seed}: two years advance the calendar by two years`);
}

const ignored=createTown(4871,'Ignored Next');
for(let day=0;day<daysPerYear;day++) stepDay(ignored,false);
const next=getTownNext(ignored);
check(ignored.tick===BigInt(daysPerYear*ticksPerDay),'the clock keeps moving when the player ignores every suggestion');
check(typeof next.sentence==='string'&&next.sentence.trim().length>0,'NEXT always gives the player a sentence');
check(next.sentence.endsWith('.'),'NEXT uses a complete, plain sentence');

const greedy=supportedTown(9437,'Greedy Town');
followNextAndBuildStarterSupport(greedy);
for(let day=0;day<180;day++) stepDay(greedy);
const beforeShortage=greedy.people.length;
for(const well of Object.values(greedy.regions.scablands.groundWater.wells)) {well.yieldLitresPerDay=0;well.waterLitres=0;}
for(const person of greedy.people) person.health=1;
for(let day=0;day<daysPerYear;day++) stepDay(greedy,false);
const duringShortage=greedy.people.length;
for(const well of Object.values(greedy.regions.scablands.groundWater.wells)) {well.yieldLitresPerDay=1_000_000;well.waterLitres=1_000_000;}
for(let day=0;day<daysPerYear;day++) stepDay(greedy);
check(duringShortage<beforeShortage,`a greedy town loses people after it outgrows its support (${beforeShortage} to ${duringShortage})`);
check(greedy.people.length>duringShortage,`the town recovers after water, food and homes return (${duringShortage} to ${greedy.people.length})`);

console.log(`Town pace: ${checks} checks passed across ${paceSeeds.length} seeds; first-winter ${rangeAt(9)}, Year 1 ${rangeAt(11)}, Year 2 ${rangeAt(23)} people.`);

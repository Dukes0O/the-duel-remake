import assert from 'node:assert/strict';
import {createTown, dispatchTownCommand, stepTown, TOWN_TIME} from '../src/town/index.js';
import {getTownNext} from '../src/town/town-chapters.js';
import {groundWaterAt} from '../src/town/town-ground.js';
import {storeGood} from '../src/town/town-goods.js';

const ticksPerDay=TOWN_TIME.ticksPerDay;
const daysPerYear=TOWN_TIME.daysPerMonth*TOWN_TIME.monthsPerYear;
const paceSeeds=Array.from({length:10},(_,index)=>1989+index*7919);
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function stepDay(town,food=true){
  if(food) storeGood(town,{x:0,z:0},'food',Math.max(1,town.people.length*2100/3600+1));
  for(let hour=0;hour<ticksPerDay;hour++) stepTown(town);
}
function supportedTown(seed,name='Pace test'){
  const town=createTown(seed,name);
  // The first twelve have enough provisions to keep going while the player follows NEXT.
  town.peopleConditions={waterLitresPerPerson:15,waterNeedLitresPerPerson:15,
    foodCaloriesPerPerson:2100,shelterPlaces:12,paintedHomePlaces:12};
  return town;
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
  town.story={facts:{pitsDug:true},completed:{'town.act1.twelve':true}};
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
  // Later construction output is not yet connected to population conditions.
  // This is the supported-water, food and home state reached after sensible work.
  town.peopleConditions={waterLitresPerPerson:50,waterNeedLitresPerPerson:15,
    foodCaloriesPerPerson:2100,shelterPlaces:10000,paintedHomePlaces:10000};
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
for(let day=0;day<180;day++) stepDay(greedy);
const beforeShortage=greedy.people.length;
greedy.peopleConditions={waterLitresPerPerson:0,foodCaloriesPerPerson:0,shelterPlaces:0,paintedHomePlaces:0};
for(const person of greedy.people) person.health=1;
for(let day=0;day<daysPerYear;day++) stepDay(greedy,false);
const duringShortage=greedy.people.length;
greedy.peopleConditions={waterLitresPerPerson:50,foodCaloriesPerPerson:2100,shelterPlaces:10000,paintedHomePlaces:10000};
for(let day=0;day<daysPerYear;day++) stepDay(greedy);
check(duringShortage<beforeShortage,`a greedy town loses people after it outgrows its support (${beforeShortage} to ${duringShortage})`);
check(greedy.people.length>duringShortage,`the town recovers after water, food and homes return (${duringShortage} to ${greedy.people.length})`);

const rangeAt=index=>`${Math.min(...results.map(result=>result.months[index]))}-${Math.max(...results.map(result=>result.months[index]))}`;
console.log(`Town pace: ${checks} checks passed across ${paceSeeds.length} seeds; first-winter ${rangeAt(9)}, Year 1 ${rangeAt(11)}, Year 2 ${rangeAt(23)} people.`);

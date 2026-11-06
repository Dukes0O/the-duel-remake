import assert from 'node:assert/strict';
import {createTown, stepTown, TOWN_TIME} from '../src/town/index.js';
import {getTownNext} from '../src/town/town-chapters.js';
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
  town.peopleConditions={waterLitresPerPerson:50,foodCaloriesPerPerson:2100,shelterPlaces:10000,paintedHomePlaces:10000};
  return town;
}
function seedPace(seed){
  const town=supportedTown(seed);
  const winter=[];
  for(let day=0;day<daysPerYear*2;day++){
    stepDay(town);
    if((day+1)%30===0) winter.push(town.people.length);
  }
  return {town,winter};
}

const results=paceSeeds.map(seed=>({seed,...seedPace(seed)}));
for(const {seed,town,winter} of results){
  check(winter[9]>=20&&winter[9]<=40,`seed ${seed}: first winter has 20 to 40 people, saw ${winter[9]}`);
  check(winter[11]<100,`seed ${seed}: town cannot reach 100 people in Year 1, saw ${winter[11]}`);
  check(winter[23]>=80&&winter[23]<=140,`seed ${seed}: town reaches about 100 people by Year 2, saw ${winter[23]}`);
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

const rangeAt=index=>`${Math.min(...results.map(result=>result.winter[index]))}-${Math.max(...results.map(result=>result.winter[index]))}`;
console.log(`Town pace: ${checks} checks passed across ${paceSeeds.length} seeds; first-winter ${rangeAt(9)}, Year 1 ${rangeAt(11)}, Year 2 ${rangeAt(23)} people.`);

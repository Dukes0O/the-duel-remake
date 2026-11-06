import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createTown, deserializeTown, serializeTown, stepTown, TOWN_TIME} from '../src/town/index.js';
import {storeGood} from '../src/town/town-goods.js';

const DAYS_PER_YEAR=TOWN_TIME.daysPerMonth*TOWN_TIME.monthsPerYear;
const TICKS_PER_YEAR=DAYS_PER_YEAR*TOWN_TIME.ticksPerDay;
const SOAK_YEARS=30;
const SOAK_SEEDS=Array.from({length:10},(_,index)=>5101+index*6151);
const SIM_DAY_TARGET_MS=30;
function stepDay(town){
  storeGood(town,{x:0,z:0},'food',Math.max(1,town.people.length*2100/3600+1));
  for(let hour=0;hour<TOWN_TIME.ticksPerDay;hour++) stepTown(town);
}
function compactJsonBytes(town){return Buffer.byteLength(serializeTown(town));}

let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
const rows=[];
for(const seed of SOAK_SEEDS){
  let town=createTown(seed,`Thirty year town ${seed}`);
  town.peopleConditions={waterLitresPerPerson:50,foodCaloriesPerPerson:2100,shelterPlaces:10000,paintedHomePlaces:10000};
  let elapsedMs=0,previousPeople=0;
  for(let year=1;year<=SOAK_YEARS;year++){
    const start=performance.now();
    for(let day=0;day<DAYS_PER_YEAR;day++) stepDay(town);
    const yearElapsedMs=performance.now()-start;
    elapsedMs+=yearElapsedMs;
    const records=town.people.length+town.buildings.length+town.book.length+town.oldGround.length;
    const saveBytes=compactJsonBytes(town);
    const snapshot={seed,year,people:town.people.length,buildings:town.buildings.length,
      bookEntries:town.book.length,oldGroundEntries:town.oldGround.length,
      saveBytes,saveBytesPerRecord:Number((saveBytes/Math.max(1,records)).toFixed(1)),
      yearElapsedMs:Number(yearElapsedMs.toFixed(1)),elapsedMs:Number(elapsedMs.toFixed(1)),
      yearMsPerAveragePerson:Number((yearElapsedMs/Math.max(1,(previousPeople+town.people.length)/2)).toFixed(4))};
    rows.push(snapshot);
    previousPeople=town.people.length;
    town=deserializeTown(serializeTown(town));
  }
  const firstYear=rows.find(row=>row.seed===seed&&row.year===1);
  const lastYear=rows.at(-1);
  check(town.calendar.year===SOAK_YEARS+1,`seed ${seed}: the town reaches game year ${SOAK_YEARS+1}`);
  check(town.people.length>0,`seed ${seed}: the town remains alive after ${SOAK_YEARS} years`);
  check(rows.at(-1).saveBytes>0,`seed ${seed}: the town keeps a readable save`);
  check(lastYear.saveBytesPerRecord<=firstYear.saveBytesPerRecord*2,
    `seed ${seed}: save bytes per retained record stay within 2 times Year 1`);
  check(lastYear.yearMsPerAveragePerson<=firstYear.yearMsPerAveragePerson*4,
    `seed ${seed}: yearly sim time per resident stays within 4 times Year 1`);
}

const large=createTown(20261106,'Ten thousand person timing');
large.people=Array.from({length:10_000},(_,index)=>({id:`person-${index+1}`,name:`Person ${index+1}`,
  born:0,family:`family-${Math.floor(index/4)}`,home:`home-${Math.floor(index/4)}`,
  job:'townhand',skills:{building:0},health:100,mood:70,
  needs:{waterLitres:50,waterNeedLitres:15,foodCalories:2100,shelter:true},
  history:['Came to make a home in the town.'],generation:0,thought:'The morning is quiet.'}));
large.peopleConditions={waterLitresPerPerson:50,foodCaloriesPerPerson:2100,shelterPlaces:12_000,paintedHomePlaces:12_000};
large.buildings=Array.from({length:5_000},(_,index)=>({id:`latrine-${index}`,buildingId:'latrine',state:'complete'}));
stepDay(large);
const dayStart=performance.now();
stepDay(large);
const largeTownDayMs=performance.now()-dayStart;
check(large.people.length===10_000,`10,000-person timing town keeps every resident`);
check(largeTownDayMs<SIM_DAY_TARGET_MS,`10,000 people and 5,000 buildings simulate a day under ${SIM_DAY_TARGET_MS} ms (saw ${largeTownDayMs.toFixed(2)} ms)`);

for(const row of rows) console.log(JSON.stringify(row));
console.log(`Town soak: ${checks} checks passed; ${SOAK_SEEDS.length} seeds x ${SOAK_YEARS} years; largest saved town ${Math.max(...rows.map(row=>row.saveBytes))} bytes; 10,000-person day ${largeTownDayMs.toFixed(2)} ms.`);

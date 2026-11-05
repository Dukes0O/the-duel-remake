import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {
  BUILDINGS, GOODS, SCABLANDS_TOWN_REGION, TOWN_MIGRATIONS, TOWN_SAVE_VERSION,
  cellIsReserved, createTown, deserializeTown, dispatchTownCommand, getTownChunk,
  registerTownSystem, serializeTown, stepTown, townCalendarAt, validateTownContent,
} from '../src/town/index.js';

let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function same(actual,expected,message){assert.deepEqual(actual,expected,message);checks++;}

assert.equal(validateTownContent({buildings:BUILDINGS,goods:GOODS}),true); checks++;
assert.equal(new Set(BUILDINGS.map(row=>row.id)).size,BUILDINGS.length); checks++;
assert.equal(TOWN_SAVE_VERSION,1); checks++;
assert.equal(TOWN_MIGRATIONS[0].version,1); checks++;
assert.equal(SCABLANDS_TOWN_REGION.groundHeightAt(0,0),0); checks++;

// Keep the data contract in step with every authored art id. IDs with a
// numeric suffix are expanded below; part names such as "building:lamp" are
// deliberately not building ids.
const artIds=new Set();
for(const file of readdirSync(new URL('../docs/board/cards/',import.meta.url))) if(file.startsWith('TOWN-ART-')&&file.endsWith('.md')) {
  const text=readFileSync(new URL(`../docs/board/cards/${file}`,import.meta.url),'utf8');
  for(const match of text.matchAll(/`([a-z][a-z0-9]*(?:-[a-z0-9]+)*)`(?:\s+(\d+)x\d+)?/g)) {
    if(match[1].includes(':')) continue;
    if(match[2]) artIds.add(match[1]); else if(BUILDINGS.some(row=>row.id===match[1])) artIds.add(match[1]);
  }
}
for(const id of ['hand-well','standpipe','water-tower','pump-house','treatment-plant','reservoir','latrine','bathhouse','reed-bed','trash-sorter','soup-kitchen','chicken-run','goat-pen','greenhouse','salvage-yard','forge','sawmill','kiln','warehouse','windmill','generator','solar-rack','fuel-depot','watchtower','guard-post','fire-station','clinic','school','town-hall','old-ground','workshop','motor-pool','trading-post','toll-bank','radio-mast','helipad','tavern','wreck-ring','drive-in','mud-pit','big-wheel','scrap-coaster']) {
  check(artIds.has(id),`art cards name ${id}`);
  check(BUILDINGS.some(row=>row.id===id),`building data includes ${id}`);
}

const town=createTown(1989,'First Town',[{id:'one',name:'Ari'}]);
check(getTownChunk(town.regions.scablands,2,3)===null,'unused chunks do not exist');
const first=dispatchTownCommand(town,{type:'placeBuilding',buildingId:'hand-well',x:90_000,z:-80_000});
check(first.ok,'a cell far from the start can be built on');
check(town.regions.scablands.chunks['5625:-5000'],'only the used chunk is made');
check(cellIsReserved('scablands',0,0),'the Dome oval is reserved');
check(cellIsReserved('scablands',-3,-12),'the gate on the Dome south side is reserved');
check(!cellIsReserved('scablands',90000,-80000),'far map cells remain open');
const refused=dispatchTownCommand(town,{type:'placeBuilding',buildingId:'hand-well',x:90_000,z:-80_000});
check(!refused.ok&&refused.message.endsWith('.'),'a refused command gives one plain sentence');
const custom={id:'test-shed',width:1,depth:1,materials:{timber:1},workerHours:1,upkeepMonthly:0,staff:0,gives:'A dry place',opensWith:'start'};
const added=dispatchTownCommand(town,{type:'placeBuilding',buildingId:'test-shed',x:-12,z:44},{buildings:[...BUILDINGS,custom]});
check(added.ok,'a new building works from its data row alone');
const punctuation=dispatchTownCommand(town,{type:'renameTown',name:'Town. Forget it'});
check(punctuation.message==='The town name has changed.','a name cannot turn a command reply into multiple sentences');
const idsTown=createTown(19,'Id test');
dispatchTownCommand(idsTown,{type:'placeBuilding',buildingId:'hand-well',x:60,z:40});
dispatchTownCommand(idsTown,{type:'placeBuilding',buildingId:'standpipe',x:62,z:40});
dispatchTownCommand(idsTown,{type:'removeBuilding',id:'building-1'});
const afterRemoval=dispatchTownCommand(idsTown,{type:'placeBuilding',buildingId:'hand-well',x:64,z:40});
check(afterRemoval.ok&&idsTown.buildings.at(-1).id==='building-3','new building ids do not collide after a removal');

same(townCalendarAt(0),{hour:0,day:1,month:1,season:'Spring',year:1},'calendar begins at year one');
same(townCalendarAt(71),{hour:23,day:3,month:1,season:'Spring',year:1},'three days have 72 hourly ticks');
same(townCalendarAt(24*30*3),{hour:0,day:1,month:4,season:'Summer',year:1},'seasons follow three 30-day months');
same(townCalendarAt(24*30*12),{hour:0,day:1,month:1,season:'Spring',year:2},'a year has twelve months');

const fixture=readFileSync(new URL('./fixtures/town/town-v1.json',import.meta.url),'utf8');
const fromFixture=deserializeTown(fixture);
same(fromFixture.calendar,townCalendarAt(25),'load repairs its displayed calendar from the hour count');
const firstVersion=deserializeTown(readFileSync(new URL('./fixtures/town/town-v0.json',import.meta.url),'utf8'));
same(firstVersion.version,1,'the first saved version migrates to version one');
same(firstVersion.unknownChapterData,{story:'preserve me'},'version one keeps data it does not understand');
const withUnknown=deserializeTown({...JSON.parse(fixture), futureField:{kept:true}});
same(withUnknown.futureField,{kept:true},'unknown saved fields survive a load');
for(let tick=0;tick<256;tick++) {
  const source=createTown(41,'Save test');
  for(let i=0;i<tick;i++) stepTown(source);
  const loaded=deserializeTown(serializeTown(source));
  same(loaded,source,`save and load at tick ${tick} keep every field`);
  stepTown(source); stepTown(loaded);
  same(serializeTown(loaded),serializeTown(source),`save and load at tick ${tick} keep the next step`);
}

const unregister=registerTownSystem('town-core-test-random',90,7,({town,rng})=>{town.randomSamples=(town.randomSamples||0)+rng.int(1,1000);});
function longRun(){
  const state=createTown(8675309,'Long Run');
  for(let tick=0;tick<100_000;tick++) {
    const commands=tick===0?[{type:'renameTown',name:'Long Run, Keep Going'}]
      :tick===10?[{type:'placeBuilding',buildingId:'hand-well',x:60,z:40}]
      :tick===11?[{type:'placeBuilding',buildingId:'standpipe',x:62,z:40}]
      :tick===12?[{type:'removeBuilding',id:'building-1'}]
      :tick===13?[{type:'placeBuilding',buildingId:'greenhouse',x:64,z:42}]:[];
    stepTown(state,commands);
  }
  return state;
}
const runA=longRun(),runB=longRun();
unregister();
same(runA.tick,100000,'the long run reaches its requested tick');
same(serializeTown(runA),serializeTown(runB),'seeded commands produce one fingerprint after 100,000 ticks');

const large=createTown(90210,'Large Town');
large.people=Array.from({length:10000},(_,i)=>({id:`person-${i}`,name:`Person ${i}`,born:i,skills:{building:i%8}}));
large.buildings=Array.from({length:5000},(_,i)=>({id:`building-${i}`,buildingId:'hand-well',regionId:'scablands',x:i*2,z:-i,width:1,depth:1,groundY:0}));
const start=performance.now();
const largeLoaded=deserializeTown(serializeTown(large));
const dayStart=performance.now();
for(let tick=0;tick<24;tick++)stepTown(largeLoaded);
const dayElapsed=performance.now()-dayStart;
const elapsed=performance.now()-start;
same(largeLoaded.people.length,10000,'all people survive save, load and a sim day');
same(largeLoaded.buildings.length,5000,'all building records survive save, load and a sim day');
check(dayElapsed<30,`a 10,000-person, 5,000-building sim day stays under 30 ms (observed ${dayElapsed.toFixed(2)} ms)`);

console.log(`Town core: ${checks} checks passed; 100,000 ticks repeat; large save/load/day ${elapsed.toFixed(2)} ms total, ${dayElapsed.toFixed(2)} ms to step.`);

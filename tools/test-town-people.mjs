import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
await import('../src/town/systems/modules/people.js');
const {createTown, stepTown, dispatchTownCommand, serializeTown, deserializeTown, registeredTownSystems, TOWN_TIME} = await import('../src/town/index.js');
import {TOWN_THOUGHTS, TOWN_SEASON_THOUGHTS} from '../src/town/content/thoughts.js';
import {storeGood} from '../src/town/town-goods.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function same(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
const fedTowns = new WeakSet();
function stepDay(town) {
  // A well-fed town: TOWN-FARM now works out each day's food from what is in the stores.
  if (town.name === 'Repeatable' || fedTowns.has(town)) storeGood(town, {x:0, z:0}, 'food', (town.people?.length || 0) * 2100 / 3600 + 1);
  const fixtureWell=town.keepFixtureWellFull?town.regions?.scablands?.groundWater?.wells?.fixture:null;
  if(fixtureWell){fixtureWell.yieldLitresPerDay=Math.max(600,(town.people?.length||12)*50);fixtureWell.waterLitres=Math.max(fixtureWell.waterLitres||0,fixtureWell.yieldLitresPerDay);}
  const startTick=BigInt(town.tick);
  for (let hour = 0; hour < TOWN_TIME.ticksPerDay; hour++) stepTown(town);
  return BigInt(town.tick)-startTick;
}
function setMeasuredHousing(town,capacity,waterLitresPerDay) {
  const count=Math.ceil(capacity/8),cells=Array.from({length:count},(_,index)=>({x:100+index,z:100}));
  const result=dispatchTownCommand(town,{type:'paintHomeGround',cells});assert.equal(result.ok,true,result.message);
  town.homePlots.forEach((plot,index)=>{plot.tier=5;plot.household=`fixture-household-${index}`;plot.family=plot.household;});
  town.regions.scablands.groundWater={pits:{},wellJobs:{},wells:{fixture:{x:0,z:0,yieldLitresPerDay:waterLitresPerDay,waterLitres:waterLitresPerDay,drawdownLitres:0}},droughtDays:0};
  town.keepFixtureWellFull=true;
  storeGood(town,{x:0,z:0},'food',1_000_000);
  stepDay(town); // Let real support measurements reach each person's daily record.
}

check(registeredTownSystems().some(system => system.name === 'town-people' && system.everyTicks === 1), 'people work is scheduled every town tick');
check(TOWN_THOUGHTS.length >= 80, 'thought content includes at least 80 lines');
for (const [season, lines] of Object.entries(TOWN_SEASON_THOUGHTS)) {
  check(lines.length >= 20, `${season} has seasonal thoughts`);
  check(lines.every(line => /^[A-Z].*[.!?]$/.test(line) && !line.includes('—')), `${season} thoughts are whole plain sentences`);
}

const town = createTown(1989, 'First Town');
town.buildings.push({id:'school-1', buildingId:'school', state:'complete'});
same(stepDay(town),BigInt(TOWN_TIME.ticksPerDay),'a simulated day advances exactly 24 town ticks');
same(town.people.length, 12, 'the first day creates the twelve founders');
check(town.people.every(person => person.id && person.name && person.born <= 0 && person.family && person.home && person.skills && person.health && person.mood !== undefined && person.history.length), 'founders are individual records');
check(new Set(town.people.map(person => person.name)).size === 12, 'founders have unique names');
check(town.people.every(person => typeof person.thought === 'string' && person.thought.endsWith('.')), 'each person has one thought');
check(new Set(town.people.map(person => person.family)).size === 6, 'founders begin in six families');
check(town.people.every(person => person.workHours === 8), 'working-age adults work eight hours each day');
check(town.people.filter(person => person.job === 'school').length === 3, 'complete buildings fill jobs from their staff needs');

const first = createTown(42, 'Repeatable');
const second = createTown(42, 'Repeatable');
setMeasuredHousing(first,10_000,1_000_000);
setMeasuredHousing(second,10_000,1_000_000);
first.buildings.push({id:'school-1', buildingId:'school', state:'complete'});
second.buildings.push({id:'school-1', buildingId:'school', state:'complete'});
// A well-kept town has latrines. TOWN-HEALTH makes a town with none sick, and sick people have few children.
for (const town2 of [first, second]) for (let index = 0; index < 600; index++) town2.buildings.push({id:`latrine-${index}`, buildingId:'latrine', state:'complete'});
for (let day = 0; day < TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear * 30; day++) { stepDay(first); stepDay(second); }
same(serializeTown(first), serializeTown(second), 'the same seed and years produce the same people history');
check(first.people.some(person => person.generation >= 2), 'thirty years include children of the founders who become parents');
check(first.oldGround.length > 0, 'people who pass away are remembered in the Old Ground');
check(first.book.some(entry => entry.type === 'birth') && first.book.some(entry => entry.type === 'arrival'), 'births and arrivals are recorded in the Book');
check(first.people.some(person => person.retired), 'older people retire');
check(first.people.some(person => person.skills.learning > 0), 'school years build children\'s skills');

const supported = createTown(23, 'Room to Grow');
setMeasuredHousing(supported,1000,600);
fedTowns.add(supported);
stepDay(supported);
const originalPopulation = supported.people.length;
check(supported.people.every(person => person.workHours === 8), 'adults work eight hours when no staffed buildings are open');
for (let day = 0; day < 360; day++) stepDay(supported);
check(supported.people.length > originalPopulation, 'supported town receives arrivals and grows without a fixed people cap');
check(supported.people.every(person => person.needs.waterLitres === 50 && person.needs.foodCalories === 2100), 'people track measured water and food needs');
for (let day = 0; day < 180; day++) stepDay(supported);
check(supported.people.some(person => person.homeTier > 0), 'homes improve over time on painted ground');
check(supported.homes.every(home => Number.isInteger(home.tier) && home.id), 'homes keep their own saved records');
const saved = deserializeTown(serializeTown(supported));
same(saved.people, supported.people, 'people survive a save and load round trip');
const homeToWatch = supported.homes.find(home => home.tier > 0);
const previousHomeTier = homeToWatch.tier;
supported.keepFixtureWellFull=false;
supported.regions.scablands.groundWater.wells.fixture.waterLitres=0;
supported.regions.scablands.groundWater.wells.fixture.yieldLitresPerDay=0;
for (let day = 0; day < 360; day++) stepDay(supported);
check(homeToWatch.tier < previousHomeTier, 'homes step back slowly after support is lost');

const challenged = createTown(7, 'Hard Times');
stepDay(challenged);
for (const person of challenged.people) person.health = 1;
const starting = challenged.people.length;
for (let day = 0; day < TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear; day++) stepDay(challenged);
check(challenged.people.length < starting, 'unmet needs can reduce the living population');
setMeasuredHousing(challenged,100,10_000);
for (let day = 0; day < 360; day++) stepDay(challenged);
check(challenged.people.length > 0 && challenged.people.some(person => person.health > 1), 'restored water, food and shelter let the population recover');

const large = createTown(88, 'No Ceiling');
large.people = Array.from({length:10_001}, (_, index) => ({id:`person-${index}`, name:`Person ${index}`, born:0, family:`family-${index}`, home:'canvas', job:'townhand', skills:{building:0}, health:100, mood:50, needs:{waterLitres:50, foodCalories:2100, shelter:true}, history:[], generation:0, thought:'The day is calm.'}));
large.buildings = Array.from({length:5_000}, (_, index) => ({id:`building-${index}`, buildingId:'hand-well', state:'complete'}));
stepDay(large);
const largeStart = performance.now();
stepDay(large);
const largeDayMs = performance.now() - largeStart;
same(large.people.length, 10_001, 'the people system has no fixed population ceiling');
same(large.nextPersonNumber, 10_001n, 'new person ids advance beyond the largest saved id');
check(largeDayMs < 30, `a 10,000-person, 5,000-building day stays under 30 ms (observed ${largeDayMs.toFixed(2)} ms)`);

console.log(`Town people: ${checks} checks passed; thirty years produced ${first.people.length} living people and ${first.oldGround.length} Old Ground entries; 10,000-person day ${largeDayMs.toFixed(2)} ms.`);

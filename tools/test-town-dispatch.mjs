import assert from 'node:assert/strict';
import {createTown, deserializeTown, dispatchTownCommand, stepTown, serializeTown, townDispatchChance,
  townDispatchChanceWords, townDispatchRecords, registeredTownSystems} from '../src/town/index.js';
import {TOWN_DISPATCH_LOGS, TOWN_DISPATCH_LOG_COUNT} from '../src/town/content/logs.js';
import {completeTownNeighbourTrade} from '../src/town/town-outposts.js';
import {storeGood} from '../src/town/town-goods.js';
import {stepTownBook} from '../src/town/town-book.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function same(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }
function stepHours(town, hours) { for (let hour=0; hour<hours; hour++) stepTown(town); }

check(registeredTownSystems().some(system => system.name === 'town-dispatch' && system.everyTicks === 24),
  'dispatch runs as a registered daily town system');
same(townDispatchChance({crewSkill:0, vehicleBonus:0, standing:0, difficulty:0}), 0.5, 'the chance starts at an even half');
same(townDispatchChance({crewSkill:0.3, vehicleBonus:0.15, standing:0.1, difficulty:0}), 0.95, 'the best chance is capped at 95 percent');
same(townDispatchChance({crewSkill:0, vehicleBonus:0, standing:-0.1, difficulty:0.5}), 0.1, 'the worst chance is held at 10 percent');
same(townDispatchChanceWords(0.2), 'Risky', 'low chances use the risky label');
same(townDispatchChanceWords(0.5), 'Even', 'middle chances use the even label');
same(townDispatchChanceWords(0.7), 'Likely', 'good chances use the likely label');
same(townDispatchChanceWords(0.9), 'Sure thing', 'high chances use the sure thing label');

const crewIds = ['cinder','odessa','wren','dune','tusk','nell','jax','rook','vesper'];
check(TOWN_DISPATCH_LOG_COUNT >= 80, 'the log library has at least 80 entries');
check(crewIds.every(id => TOWN_DISPATCH_LOGS[id]?.length > 0), 'each crew member has lines in their own voice');
check(Object.values(TOWN_DISPATCH_LOGS).flat().every(line => /^[A-Z].*[.!?]$/.test(line) && !line.includes('—')),
  'logs are short sentences without em dashes');

const town = createTown(1989, 'Scout Test');
same(townDispatchRecords(town).active.length, 0, 'reading dispatch records does not require saved dispatch data');
check(!Object.hasOwn(town, 'dispatch'), 'reading town dispatch data leaves the town unchanged');
const refused = dispatchTownCommand(town, {type:'dispatchCrew', crewId:'wren', kind:'scout', days:1.5, chunkX:0, chunkZ:0});
check(!refused.ok, 'dispatch duration must be a whole number of days');
const started = dispatchTownCommand(town, {type:'dispatchCrew', crewId:'wren', kind:'scout', days:1,
  vehicleBonus:0.15, standing:0.1, difficulty:0, chunkX:4, chunkZ:-3});
check(started.ok, 'a crew member can start a scout dispatch');
same(started.chanceWords, 'Sure thing', 'the dispatch returns a plain-language chance');
check(started.message.includes('95 percent'), 'the dispatch message includes the numeric chance');
const saveBeforeCompletion = serializeTown(town);
check(saveBeforeCompletion.includes('"active"'), 'active dispatches are ordinary save data');
stepHours(town, 24);
const records = townDispatchRecords(town);
same(records.active.length, 0, 'the dispatch ends after its stated day');
same(records.completed.length, 1, 'the completed dispatch is kept in the town record');
check(records.completed[0].succeeded, 'the seeded high-chance scout succeeds');
check(records.explored.some(area => area.regionId === 'scablands' && area.x === 4 && area.z === -3), 'a successful scout clears its target chunk');
same(records.explored.length, 9, 'a scout clears its target and eight neighboring chunks');
check(records.completed[0].text.startsWith('Day 1. '), 'the result includes a short day log');

const retryTown=createTown(1989,'Retry Scout');
dispatchTownCommand(retryTown,{type:'dispatchCrew',crewId:'wren',kind:'scout',days:1,chunkX:8,chunkZ:2});
const failedJob=retryTown.dispatch.active[0]; failedJob.chance=0.1; failedJob.stage=3; failedJob.progress=0.6;
stepHours(retryTown,24);
const failure=townDispatchRecords(retryTown);
same(failure.open.length,1,'a failed dispatch leaves its job open');
same(failure.open[0].stage,3,'a failed dispatch keeps the job stage');
same(failure.open[0].progress,0.6,'a failed dispatch keeps its progress');
check(failure.crew.wren.unavailableUntil>retryTown.tick,'the failed crew member must rest');
const retry=dispatchTownCommand(retryTown,{type:'dispatchCrew',crewId:'odessa',kind:'scout',days:1,jobId:failure.open[0].id});
check(retry.ok,'another crew member can be sent to the same open job');
retryTown.dispatch.active[0].chance=1;
const bookEntriesBeforeSuccess=retryTown.book.length;
stepHours(retryTown,24);
same(townDispatchRecords(retryTown).open.length,0,'a successful retry closes the open job');
check(townDispatchRecords(retryTown).explored.some(area=>area.x===8&&area.z===2),'a successful retry completes the original scout target');
same(townDispatchRecords(retryTown).totals.scout,2,'dispatch totals count both attempts by kind');
same(retryTown.book.length,bookEntriesBeforeSuccess,'ordinary repeat successes do not crowd the Town\'s Book');
retryTown.tick=8640n;
stepTownBook(retryTown,retryTown.tick);
check(retryTown.bookPages.at(-1).entries.some(entry=>entry.includes('finished 2 dispatch jobs this year')),'the Town\'s Book keeps the yearly dispatch total');
check(!retryTown.dispatch.yearTotals['1'],'a yearly total is compacted after the Book records it');

const legacy=JSON.parse(serializeTown(town));
legacy.dispatch.completed=Array.from({length:60},(_,index)=>({id:`old-${index}`}));
const trimmed=deserializeTown(legacy);
same(trimmed.dispatch.completed.length,40,'old saves trim dispatch history on load');

const longTown=createTown(904,'Thirty Year Town');
const yard={regionId:'scablands',x:0,z:0};
const crew=crewIds;
for(let day=0;day<30*360;day++) {
  dispatchTownCommand(longTown,{type:'dispatchCrew',crewId:crew[day%crew.length],kind:'scout',days:1,chunkX:day%64,chunkZ:Math.floor(day/64)%64});
  storeGood(longTown,yard,'food',10);
  completeTownNeighbourTrade(longTown,'dot',{good:'food',amount:10,stockpile:yard});
  stepHours(longTown,24);
}
const longSave=serializeTown(longTown);
check(Buffer.byteLength(longSave,'utf8')<5*1024*1024,'30 years of daily dispatch and trade stay below the 5 MB save target');
same(townDispatchRecords(longTown).completed.length,40,'long-running towns retain only the latest 40 dispatch results');
same(longTown.outposts.dot.trucks.length,0,'long-running towns retain no delivered trade trucks');
same(longTown.outposts.dot.tradeRuns,30*360,'the trade total survives after trucks are removed');

const growing = createTown(23, 'Long Service');
const first = dispatchTownCommand(growing, {type:'dispatchCrew', crewId:'odessa', kind:'repair', days:360});
check(first.ok, 'a specialist can take a long repair job');
stepHours(growing, 24 * 360);
const afterYear = townDispatchRecords(growing);
same(afterYear.crew.odessa.age, 26, 'crew age advances by one year of town time');
const second = dispatchTownCommand(growing, {type:'dispatchCrew', crewId:'odessa', kind:'repair', days:1});
check(second.ok && second.chance > first.chance, 'using a skill over a year improves the later chance');

const repeatA = createTown(421, 'Repeatable Dispatch');
const repeatB = createTown(421, 'Repeatable Dispatch');
for (const current of [repeatA, repeatB]) {
  dispatchTownCommand(current, {type:'dispatchCrew', crewId:'rook', kind:'talk', days:1, difficulty:0.1});
  stepHours(current, 24);
}
same(serializeTown(repeatA), serializeTown(repeatB), 'the same seed and dispatch commands produce the same result');

console.log(`Town dispatch: ${checks} checks passed.`);

import assert from 'node:assert/strict';
import {isOpen, waterRoadLimitLitresPerDay} from '../src/town/town-links.js';

const fresh = {id:'new', wasteland:{rank:1,warlords:{},crew:{unlocked:[]}}, unlockedCars:['falcone_f42']};
const town = {mayors:['new']};
assert.equal(isOpen(town,{new:fresh},'hand-well'),true,'a new player can build the first well');
assert.equal(isOpen(town,{new:fresh},'water-tower'),'Beat Sal.','a locked building says what opens it');
assert.equal(waterRoadLimitLitresPerDay(town,{new:fresh}),10_000,'the starting Water Road limit is 10,000 litres a day');

const mid = {wasteland:{rank:9,warlords:{sal:{defeated:true},dustmonger:{defeated:true}},crew:{unlocked:['rook','tusk']},},unlockedCars:['falcone_f42','titan_monster'],story:{ember:{jobs:['one','two']}}};
const midTown = {mayors:['mid'],people:Array.from({length:50},()=>({}))};
assert.equal(isOpen(midTown,{mid},'water-tower'),true,'a beaten warlord opens their building');
assert.equal(isOpen(midTown,{mid},'pump-house'),true,'a second warlord opens its building');
assert.equal(isOpen(midTown,{mid},'treatment-plant'),'Beat Kettle and finish the Everburn.','the plant needs both story conditions');
assert.equal(isOpen(midTown,{mid},'goat-pen'),'Meet Old Tam.','a neighbour opening has a clear reason');
assert.equal(waterRoadLimitLitresPerDay(midTown,{mid}),34_000,'each beaten warlord adds 12,000 litres a day');

const finished = {wasteland:{rank:20,warlords:{defeated:['sal','dustmonger','mirage','gunn','kettle','vultures','tollkeeper','blackiron','magnus']},crew:{unlocked:['rook','tusk','cinder']}},unlockedCars:['falcone_f42','titan_monster'],story:{ember:{jobs:['a','b','c','d','e','f']},water:{read:true}}};
assert.equal(isOpen({mayors:['done'],people:Array.from({length:2000},()=>({}))},{done:finished},'treatment-plant'),true,'a finished player can build the plant');
assert.equal(isOpen({mayors:['done'],calendar:{year:2},people:Array.from({length:2000},()=>({}))},{done:finished},'scrap-coaster'),true,'late buildings open from their people requirement');
assert.equal(waterRoadLimitLitresPerDay({mayors:['done']},{done:finished}),318_000,'the Baron adds the reviewed 200,000 litre bonus');

const mayorA = {wasteland:{rank:1,warlords:{},crew:{unlocked:[]}},unlockedCars:[]};
const mayorB = {wasteland:{rank:10,warlords:{sal:{defeated:true}},crew:{unlocked:['cinder']}},unlockedCars:['titan_monster']};
const shared = {mayors:['a','b']};
const profiles = {a:mayorA,b:mayorB};
const before = JSON.stringify({shared,profiles});
assert.equal(isOpen(shared,profiles,'water-tower'),true,'a shared town uses the best mayor progression');
assert.equal(waterRoadLimitLitresPerDay(shared,profiles),22_000,'shared town uses its best Water Road limit');
assert.equal(isOpen(shared,profiles,'scrap-coaster'),'Reach 2,000 people.','building needs still belong to the town');
assert.equal(JSON.stringify({shared,profiles}),before,'reading links never writes to the town or profiles');
assert.equal(isOpen({mayors:['a'],chaptersDone:3},{a:mayorA},'hand-well'),true,'town chapter progress is available to content links');
assert.equal(isOpen(shared,profiles,'unknown'),'This place is not in the town yet.','unknown content is reported plainly');
console.log('Town links passed 16 checks.');

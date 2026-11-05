import assert from 'node:assert/strict';
import {createTown, deserializeTown, dispatchTownCommand, groundWaterAt, SCABLANDS_TOWN_REGION, serializeTown, stepTown} from '../src/town/index.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';

for (const [x,z] of [[0,0],[240,-80],[-640,320]]) {
  assert.equal(SCABLANDS_TOWN_REGION.groundHeightAt(x,z),scablandsSurfaceHeightAt(x,z),`town ground matches Scablands height at ${x}, ${z}`);
}

const first=createTown(4312,'Dry Town');
const twin=createTown(4312,'Dry Town');
const other=createTown(4313,'Dry Town');
const untouched=createTown(4312,'Dry Town');
assert.deepEqual(groundWaterAt(first,4,7),{known:false},'water stays unknown before a test pit');
assert.deepEqual(groundWaterAt(first,4,7),groundWaterAt(twin,4,7),'same seed has the same hidden field');
for (const town of [twin,other]) dispatchTownCommand(town,{type:'digTestPit',x:4,z:7});

const start=dispatchTownCommand(first,{type:'digTestPit',x:4,z:7});
assert.equal(start.ok,true);
assert.match(start.message,/three days/);
assert.equal(groundWaterAt(first,4,7).known,false,'a working pit has not revealed water');
for(let i=0;i<72;i++) stepTown(first);
for(let i=0;i<72;i++) stepTown(twin);
for(let i=0;i<72;i++) stepTown(other);
const result=groundWaterAt(first,4,7);
assert.equal(result.state,'found','pit completes after three game days');
assert.ok(result.depth>0&&result.yieldLitresPerDay>0,'the test pit finds depth and daily yield');
assert.deepEqual(result,groundWaterAt(twin,4,7),'same seed and location give the same water');
assert.notDeepEqual(result,groundWaterAt(other,4,7),'a different seed changes the water field');
assert.deepEqual(groundWaterAt(untouched,4,7),{known:false},'a finding stays private to the town where the pit was dug');

const duplicate=dispatchTownCommand(first,{type:'digTestPit',x:4,z:7});
assert.equal(duplicate.ok,false,'a second pit cannot replace the finding');
assert.equal(dispatchTownCommand(first,{type:'buildWell',x:5,z:7}).ok,false,'a well needs a test pit at its location');
const wellJob=dispatchTownCommand(first,{type:'buildWell',x:4,z:7});
assert.equal(wellJob.ok,true,'a well uses the tested ground');
const wellDays=Math.ceil(result.depth);
assert.match(wellJob.message,new RegExp(`${wellDays} days`),'well depth sets its work time');
for(let i=0;i<wellDays*24-1;i++) stepTown(first);
assert.equal(first.regions.scablands.groundWater.wells['4:7'],undefined,'the well is not ready before the work ends');
stepTown(first);
const wellState=first.regions.scablands.groundWater.wells['4:7'];
assert.ok(wellState,'the well is ready after its depth-based work time');
const amount=wellState.waterLitres;
assert.equal(dispatchTownCommand(first,{type:'drawWellWater',x:4,z:7,litres:amount+50}).ok,true);
assert.equal(wellState.waterLitres,0,'drawing water empties the available well store');
assert.equal(wellState.drawdownLitres,amount,'well records water drawn');
for(let i=0;i<24;i++) stepTown(first);
assert.ok(wellState.waterLitres>0,'a well recovers water after use');
while(first.regions.scablands.groundWater.droughtDays<30) {
  for(let i=0;i<24;i++) stepTown(first);
}
assert.ok(wellState.depth>result.depth,'a long dry spell lowers the local water table');

const loaded=deserializeTown(serializeTown(first));
assert.deepEqual(loaded.regions.scablands.groundWater,first.regions.scablands.groundWater,'pits and wells survive save and load');
assert.deepEqual(groundWaterAt(loaded,4,7),result,'a saved test pit keeps its finding');

console.log('Town ground: seeded hidden water, three-day test pits, wells, recovery and save round trip passed.');

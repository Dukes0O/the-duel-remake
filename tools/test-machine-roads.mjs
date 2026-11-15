import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRoadMachineState, createRoadWork, roadCell, roadCondition, roadYardControls, stepRoadMachine, workRoadCell, workTownRoadCell} from '../src/machines/roads.js';
import {createTown, deserializeTown, serializeTown} from '../src/town/town-state.js';
import {stepTown} from '../src/town/index.js';
import {machineControlInput} from '../src/input-contexts.js';
import {findHaulRoute, createHauler} from '../src/town/town-haulers.js';
import {closeDigSandbox, createDigSandbox, digSandboxMachineState, stepDigSandbox, switchDigMachine} from '../src/machines/dig-sandbox.js';

async function checkMachineText(directory) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkMachineText(path);
    else if (entry.isFile()) {
      const text = await readFile(path, 'utf8');
      assert.ok(!text.includes('\u00c2'), `${path} contains a broken character.`);
    }
  }
}
await checkMachineText('src/machines');

function buildRoad() {
  let work = createRoadWork();
  work.cells['0:0'] = {...roadCell(work, 0, 0), height:2};
  work.cells['0:1'] = {...roadCell(work, 0, 1), height:-1};
  work = workRoadCell(work, {kind:'dozer', x:0, z:0, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 2);
  work = workRoadCell(work, {kind:'dozer', x:0, z:1, bladeHeight:0}).work;
  assert.equal(work.bladeLoad, 1, 'Filling a ditch uses material from the blade.');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'soft');
  for (let i = 0; i < 3; i++) work = workRoadCell(work, {kind:'roller', x:0, z:1}).work;
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:2, edgeOffsetM:0.5}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'rough');
  work = workRoadCell(work, {kind:'paver', x:0, z:1, speedMps:0.5, edgeOffsetM:0}).work;
  assert.equal(roadCondition(roadCell(work, 0, 1)), 'good');
  return work;
}
assert.deepEqual(buildRoad(), buildRoad(), 'The same work produces the same road.');
assert.equal(roadCondition(roadCell(createRoadWork(), 0, 0)), 'unfinished');
const oldTown = createTown(42, 'Road test');
const oldSave = serializeTown(oldTown);
const loadedOldTown = deserializeTown(oldSave);
assert.equal(serializeTown(loadedOldTown), oldSave, 'An older town loads without adding road data.');
// Start with a cut and fill as the town ground would supply them.
loadedOldTown.machineRoadWork = createRoadWork();
loadedOldTown.machineRoadWork.cells['0:0'] = {...roadCell(loadedOldTown.machineRoadWork, 0, 0), height:1};
loadedOldTown.machineRoadWork.cells['0:1'] = {...roadCell(loadedOldTown.machineRoadWork, 0, 1), height:-1};
workTownRoadCell(loadedOldTown, {kind:'dozer', x:0, z:0, bladeHeight:0});
workTownRoadCell(loadedOldTown, {kind:'dozer', x:0, z:1, bladeHeight:0});
for (let i=0; i<3; i++) workTownRoadCell(loadedOldTown, {kind:'roller', x:0, z:1});
workTownRoadCell(loadedOldTown, {kind:'paver', x:0, z:1, speedMps:0.5, edgeOffsetM:0});
const loadedRoadTown = deserializeTown(serializeTown(loadedOldTown));
assert.equal(roadCondition(roadCell(loadedRoadTown.machineRoadWork, 0, 1)), 'good', 'A saved road remains a road.');
assert.equal(serializeTown(deserializeTown(oldSave)), oldSave, 'Road work does not alter the older save.');
// Two adjacent town cells give a truck a route. Every metre must be firm and
// smoothly paved before the whole route receives the highest grade.
const haulTown = createTown(42, 'Haul road');
haulTown.machineRoadWork = createRoadWork();
for (let x=0; x<16; x++) for (let z=0; z<8; z++) {
  haulTown.machineRoadWork.cells[`${x}:${z}`] = {...roadCell(haulTown.machineRoadWork, x, z), spread:1};
  workTownRoadCell(haulTown, {kind:'roller', x, z});
}
const from = {x:0,z:0}, to = {x:1,z:0};
const dirtHours = findHaulRoute(haulTown.machineRoads, from, to).hours;
for (let x=0; x<16; x++) for (let z=0; z<8; z++) {
  for (let pass=0; pass<2; pass++) workTownRoadCell(haulTown, {kind:'roller', x, z});
}
const firmHours = findHaulRoute(haulTown.machineRoads, from, to).hours;
assert.ok(firmHours < dirtHours, 'A firm road gives trucks a faster route.');
for (let x=0; x<16; x++) for (let z=0; z<8; z++)
  workTownRoadCell(haulTown, {kind:'paver', x, z, speedMps:0.5, edgeOffsetM:0});
const savedHaulTown = deserializeTown(serializeTown(haulTown));
assert.deepEqual(savedHaulTown.machineRoads.map(road => road.roadClass), ['paved', 'paved']);
const truck = createHauler({id:'road-truck', from, to, roads:savedHaulTown.machineRoads, vehicle:'truck', fuelLitres:1});
assert.ok(truck.ok && truck.agent.hoursToDestination < firmHours, 'A saved paved road makes a truck faster.');
// The town itself advances its own hauler on saved road grades each hour.
const slowTown = deserializeTown(serializeTown(savedHaulTown));
const fastTown = deserializeTown(serializeTown(savedHaulTown));
slowTown.machineRoads.forEach(road => {road.roadClass='dirt';});
for (const town of [slowTown, fastTown]) {
  const trip = createHauler({id:'day-truck', from, to, roads:town.machineRoads, vehicle:'truck', fuelLitres:1});
  trip.agent.speedFactor=0.000001;
  town.haulers=[trip.agent];
  for (let hour=0; hour<24; hour++) stepTown(town);
}
assert.ok(fastTown.haulers[0].progress > slowTown.haulers[0].progress,
  'A paved road moves the town truck farther through one day of town ticks.');
assert.ok(fastTown.haulers[0].progress > 0.1, 'Partial travel accumulates across hourly ticks.');
workTownRoadCell(haulTown, {kind:'paver', x:0, z:0, speedMps:2, edgeOffsetM:0});
assert.equal(haulTown.machineRoads[0].roadClass, 'plank', 'A rough patch lowers the road grade.');
workTownRoadCell(haulTown, {kind:'paver', x:0, z:0, speedMps:0.5, edgeOffsetM:0});
assert.equal(haulTown.machineRoads[0].roadClass, 'paved', 'Paving the patch again restores the grade.');

const slowControls = roadYardControls('paver', {forward:1, steer:0}, {Space:true, ShiftLeft:true});
assert.equal(slowControls.forward, 0.5);
assert.equal(roadYardControls('roller', {forward:1}, {ShiftLeft:true}).forward, 1);
let repairGround = createRoadWork();
repairGround.cells['0:1'] = {height:0, spread:1, compaction:1, surface:1, roughness:0.8};
let repairMachine = createRoadMachineState('paver');
for (let i=0; i<240; i++) {
  const next = stepRoadMachine(repairMachine, repairGround, slowControls, 1/60);
  repairMachine = next.state; repairGround = next.work;
}
assert.equal(roadCondition(roadCell(repairGround, 0, 1)), 'good', 'The keyboard slow pace repairs rough paving.');
for (const kind of ['dozer', 'roller', 'paver']) {
  const initial = createRoadMachineState(kind);
  const ground = createRoadWork();
  const idle = stepRoadMachine(initial, ground, {working:true}, 1);
  assert.deepEqual(idle.work, ground, 'A stopped machine does not make a road.');
  const driving = stepRoadMachine(initial, ground, {forward:1, working:true}, 4);
  assert.ok(driving.state.machine.z > 0, 'The machine drives.');
  assert.ok(driving.events.length > 0, 'Working while driving changes ground along the path.');
  assert.deepEqual(driving, stepRoadMachine(initial, ground, {forward:1, working:true}, 4));
  assert.equal(driving.events[0].cue, {dozer:'dozer-blade', roller:'roller-ground', paver:'paver-surface'}[kind]);
  const raised = stepRoadMachine(initial, ground, {forward:1}, 4);
  assert.deepEqual(raised.work, ground, 'Driving with the tool raised leaves the ground alone.');
}
// Cut ordinary flat ground, then drive back with the blade raised to spread it.
let longGround = createRoadWork();
let longDozer = createRoadMachineState('dozer');
for (let i=0; i<45; i++) {
  const next = stepRoadMachine(longDozer, longGround, {forward:1, working:true}, 1);
  longDozer = next.state; longGround = next.work;
}
for (let i=0; i<50; i++) {
  const next = stepRoadMachine(longDozer, longGround, {forward:-1}, 1);
  longDozer = next.state; longGround = next.work;
}
for (let z=2; z<=41; z++) {
  assert.ok(roadCell(longGround, 0, z).spread > 0, `The blade spreads ordinary ground at ${z} m.`);
  for (let pass=0; pass<3; pass++) longGround = workRoadCell(longGround, {kind:'roller', x:0, z}).work;
  longGround = workRoadCell(longGround, {kind:'paver', x:0, z, speedMps:0.5, edgeOffsetM:0}).work;
  assert.equal(roadCondition(roadCell(longGround, 0, z)), 'good');
}
// Drive a weaving pass, then return along the original line to repair it.
let drivenGround = createRoadWork();
for (let x=-5; x<=5; x++) for (let z=0; z<20; z++)
  drivenGround.cells[`${x}:${z}`] = {height:0, spread:1, compaction:1, surface:0, roughness:0};
let drivenPaver = createRoadMachineState('paver');
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(drivenPaver, drivenGround,
    {forward:0.5, working:true, steer:i>150 && i<240 ? 0.2 : 0}, 1/60);
  drivenPaver=next.state; drivenGround=next.work;
}
assert.equal(roadCondition(roadCell(drivenGround, 0, 3)), 'rough', 'Steering away from the line leaves a ragged edge.');
drivenPaver = createRoadMachineState('paver');
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(drivenPaver, drivenGround, {forward:0.5, working:true}, 1/60);
  drivenPaver=next.state; drivenGround=next.work;
}
assert.equal(roadCondition(roadCell(drivenGround, 0, 3)), 'good', 'A straight pass repairs the edge.');
// A new working pass establishes its own line, including alongside a prior strip.
let sideGround = createRoadWork();
for (let x=0; x<=1; x++) for (let z=0; z<12; z++)
  sideGround.cells[`${x}:${z}`] = {height:0, spread:1, compaction:1, surface:0, roughness:0};
let sidePaver = createRoadMachineState('paver');
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(sidePaver, sideGround, {forward:0.5, working:true}, 1/60);
  sidePaver=next.state; sideGround=next.work;
}
sidePaver = stepRoadMachine(sidePaver, sideGround, {}, 1/60).state;
Object.assign(sidePaver.machine, {x:1,z:0,heading:0,speedMps:0});
for (let i=0; i<600; i++) {
  const next = stepRoadMachine(sidePaver, sideGround, {forward:0.5, working:true}, 1/60);
  sidePaver=next.state; sideGround=next.work;
}
assert.equal(roadCondition(roadCell(sideGround,1,3)), 'good', 'A straight second strip has its own line.');
// A heap between worked metres leaves a bump until the drum presses it level.
let bumpGround = createRoadWork();
for (let z=0; z<10; z++) bumpGround.cells[`0:${z}`] =
  {height:z===3 ? 1 : 0, spread:1, compaction:1, surface:0, roughness:0};
function drivePass(kind, ground) {
  let machine = createRoadMachineState(kind);
  for (let i=0; i<600; i++) {
    const next = stepRoadMachine(machine, ground, {forward:0.5, working:true}, 1/60);
    machine=next.state; ground=next.work;
  }
  return ground;
}
bumpGround = drivePass('paver', bumpGround);
assert.equal(roadCondition(roadCell(bumpGround, 0, 3)), 'rough', 'A heap creates a visible bump.');
for (let pass=0; pass<4; pass++) bumpGround = drivePass('roller', bumpGround);
bumpGround = drivePass('paver', bumpGround);
assert.equal(roadCondition(roadCell(bumpGround, 0, 3)), 'good', 'Rolling and paving again repairs the bump.');
let unworkedBump = createRoadWork();
unworkedBump.cells['0:3'] = {height:0,spread:1,compaction:1,surface:0,roughness:0};
unworkedBump.cells['1:3'] = {...roadCell(unworkedBump,1,3), height:1};
unworkedBump = drivePass('paver', unworkedBump);
assert.equal(roadCondition(roadCell(unworkedBump,0,3)), 'rough', 'A higher unworked neighbour leaves a bump.');
unworkedBump.cells['1:3'].height = 0;
unworkedBump = drivePass('paver', unworkedBump);
assert.equal(roadCondition(roadCell(unworkedBump,0,3)), 'good', 'Paving again repairs the levelled bump.');
// Height plus carried and packed material stays constant across each action.
let coveredRoad = createRoadWork();
coveredRoad.cells['0:0'] = {height:1,spread:1,compaction:1,surface:0,roughness:0};
coveredRoad.cells['1:0'] = {height:0,spread:1,compaction:1,surface:1,roughness:0};
coveredRoad = workRoadCell(coveredRoad, {kind:'roller',x:0,z:0}).work;
assert.equal(roadCondition(roadCell(coveredRoad,1,0)), 'unfinished', 'Loose material covers the paved neighbour.');
for (let pass=0; pass<4; pass++) coveredRoad = workRoadCell(coveredRoad, {kind:'roller',x:0,z:0}).work;
for (let pass=0; pass<3; pass++) coveredRoad = workRoadCell(coveredRoad, {kind:'roller',x:1,z:0}).work;
coveredRoad = workRoadCell(coveredRoad, {kind:'paver',x:1,z:0,speedMps:0.5,edgeOffsetM:0}).work;
assert.equal(roadCondition(roadCell(coveredRoad,1,0)), 'good', 'Rolling and paving repair the covered road.');
let material = createRoadWork();
material.cells['0:0']={height:1,spread:1,compaction:0,surface:0,roughness:0};
const totalMaterial = work => Object.values(work.cells).reduce((sum,cell)=>sum+cell.height,0)
  + work.bladeLoad + (work.packedVolume ?? 0);
for (const action of [
  {kind:'roller',x:0,z:0},
  {kind:'dozer',x:0,z:0,bladeHeight:0},
  {kind:'dozer',x:0,z:1,bladeHeight:0,spreading:true},
  {kind:'paver',x:0,z:1,speedMps:0.5,edgeOffsetM:0},
]) {
  const before=totalMaterial(material), packed=material.packedVolume ?? 0;
  material=workRoadCell(material,action).work;
  assert.ok(Math.abs(totalMaterial(material)-before)<1e-9, `${action.kind} conserves material including packing.`);
  if (action.kind==='roller') {
    assert.ok(material.packedVolume-packed<=0.025+1e-9, 'Rolling packs at most one tenth of the moved depth.');
    assert.ok(roadCell(material,1,0).height>0, 'The roller pushes the rest onto neighbouring ground.');
  }
}
// The trencher and road machines all alter the same yard ground.
let sharedYard = createDigSandbox({playerId:'shared-road-ground-test'});
sharedYard.activeMachine='trencher';
Object.assign(sharedYard.trencher.machine, {x:60,z:10,heading:0,speedMps:0});
const originalHeight=sharedYard.ground.heightAt(60,15);
sharedYard=stepDigSandbox(sharedYard, {controls:{forward:1},action:'trench'}, 12);
assert.ok(sharedYard.ground.heightAt(60,15)<originalHeight-1, 'The trencher digs the shared ground.');
sharedYard.activeMachine='dozer';
Object.assign(sharedYard.roadMachines.dozer.machine, {x:60,z:-120,heading:0,speedMps:0});
sharedYard=stepDigSandbox(sharedYard, {controls:{forward:1,working:true}}, 100);
assert.ok(sharedYard.ground.heightAt(60,15)>originalHeight-0.11, 'The dozer fills the trencher ditch in the same ground.');
for (const x of [59,61]) {
  Object.assign(sharedYard.roadMachines.dozer.machine, {x,z:-120,heading:0,speedMps:0});
  sharedYard=stepDigSandbox(sharedYard, {controls:{forward:1,working:true}}, 100);
}
for (const kind of ['roller','roller','roller','paver']) {
  sharedYard.activeMachine=kind;
  Object.assign(sharedYard.roadMachines[kind].machine, {x:60,z:13,heading:0,speedMps:0});
  sharedYard=stepDigSandbox(sharedYard, {controls:{forward:kind==='paver'?0.5:1,working:true}}, 5);
}
assert.equal(roadCondition(roadCell(sharedYard.roadWork,60,15)), 'good', 'The road crosses the filled ditch.');
sharedYard.activeMachine='trencher';
Object.assign(sharedYard.trencher.machine, {x:70,z:10,heading:0,speedMps:0});
sharedYard=stepDigSandbox(sharedYard, {controls:{forward:1},action:'trench'}, 12);
closeDigSandbox();
const sharedNextVisit = createDigSandbox({playerId:'shared-road-ground-test'});
assert.ok(sharedNextVisit.ground.heightAt(60,15)>originalHeight-0.11, 'The filled ditch remains filled on the next visit.');
assert.equal(roadCondition(roadCell(sharedNextVisit.roadWork,60,15)), 'good', 'The road remains on the next visit.');
closeDigSandbox();
// Digging and road work persist together during the page session.
let visit = createDigSandbox({playerId:'road-visit-reset-test'});
const untouchedHeight = visit.ground.heightAt(60, 15);
visit.activeMachine = 'dozer';
Object.assign(visit.roadMachines.dozer.machine, {x:60,z:10,heading:0,speedMps:0});
visit = stepDigSandbox(visit, {controls:{forward:1,working:true}}, 5);
assert.ok(visit.ground.heightAt(60,15) < untouchedHeight - 0.05, 'The blade changes the ground during the visit.');
visit.activeMachine = 'trencher';
Object.assign(visit.trencher.machine, {x:70,z:10,heading:0,speedMps:0});
const digHeight = visit.ground.heightAt(70,15);
visit = stepDigSandbox(visit, {controls:{forward:1},action:'trench'}, 12);
assert.ok(visit.ground.heightAt(70,15) < digHeight - 1, 'The trencher digs before leaving.');
closeDigSandbox();
const nextVisit = createDigSandbox({playerId:'road-visit-reset-test'});
assert.ok(nextVisit.ground.heightAt(60,15) < untouchedHeight - 0.05, 'Road work persists into the next visit.');
assert.ok(nextVisit.ground.heightAt(70,15) < digHeight - 1, 'The existing digging memory still persists.');
closeDigSandbox();
// Send the same held keys and machine positions as the browser scenario.
let keyboardYard = createDigSandbox({playerId:'keyboard-road-test'});
for (let i=0; i<4; i++) keyboardYard=switchDigMachine(keyboardYard);
function driveKeys(until, slow=false) {
  const keys={KeyW:true, Space:true, ShiftLeft:slow};
  for (let i=0; i<1800 && !until(); i++) {
    const controls=roadYardControls(keyboardYard.activeMachine, machineControlInput(keys), keys);
    keyboardYard=stepDigSandbox(keyboardYard, {controls}, 1/60);
  }
  assert.ok(until(), `Keyboard work finished for ${keyboardYard.activeMachine}.`);
}
driveKeys(() => keyboardYard.roadWork.bladeLoad>0);
driveKeys(() => roadCell(keyboardYard.roadWork, 40, 19).spread>0);
keyboardYard=switchDigMachine(keyboardYard);
for (let pass=1; pass<=3; pass++) {
  Object.assign(keyboardYard.roadMachines.roller.machine, {x:40,z:15,heading:0,speedMps:0});
  driveKeys(() => roadCell(keyboardYard.roadWork, 40, 17).compaction>=Math.min(1, pass*0.35)-0.01);
}
keyboardYard=switchDigMachine(keyboardYard);
Object.assign(keyboardYard.roadMachines.paver.machine, {x:40,z:15,heading:0,speedMps:0});
driveKeys(() => roadCell(keyboardYard.roadWork, 40, 17).surface===1);
assert.equal(roadCondition(roadCell(keyboardYard.roadWork,40,17)), 'rough');
Object.assign(keyboardYard.roadMachines.paver.machine, {x:40,z:15,heading:0,speedMps:0});
driveKeys(() => roadCondition(roadCell(keyboardYard.roadWork,40,17))==='good', true);
closeDigSandbox();
let yard = createDigSandbox({playerId:'road-test'});
for (const expected of ['dumpTruck', 'trencher', 'drill', 'dozer', 'roller', 'paver', 'excavator']) {
  yard = switchDigMachine(yard);
  assert.equal(yard.activeMachine, expected, 'Every machine can be selected in the yard.');
}
for (const kind of ['dozer', 'roller', 'paver']) {
  yard = {...yard, activeMachine:kind};
  const before = digSandboxMachineState(yard);
  yard = stepDigSandbox(yard, {controls:{forward:1, working:true}}, 4);
  assert.ok(digSandboxMachineState(yard).z > before.z, `${kind} drives in the yard simulation.`);
}
assert.ok(Object.keys(yard.roadWork.cells).length > 0, 'Road work remains in the yard when machines change.');
const freshYard = createDigSandbox({playerId:'fresh-road-practice-test'});
const expectedPractice = {cells:{}, bladeLoad:0};
for (let z=12; z<=19; z++) expectedPractice.cells[`40:${z}`] =
  {height:z<16 ? 1 : -1, spread:0, compaction:0, surface:0, roughness:0};
assert.deepEqual(freshYard.roadWork, expectedPractice, 'A fresh visit contains exactly the practice ground.');
assert.equal(roadCell(freshYard.roadWork, 40, 12).height, 1, 'The yard has material to cut.');
assert.equal(roadCell(freshYard.roadWork, 40, 16).height, -1, 'The yard has a low place to fill.');
let practice = {...freshYard, activeMachine:'dozer'};
practice = stepDigSandbox(practice, {controls:{forward:1, working:true}}, 12);
assert.ok(roadCell(practice.roadWork, 40, 16).spread > 0, 'Driving the blade carries yard material into the low ground.');
closeDigSandbox();
let revisitedPractice = createDigSandbox({playerId:'practice-revisit-test'});
revisitedPractice.activeMachine = 'trencher';
Object.assign(revisitedPractice.trencher.machine, {x:40,z:10,heading:0,speedMps:0});
revisitedPractice = stepDigSandbox(revisitedPractice, {controls:{forward:1},action:'trench'}, 12);
const dugPracticeHeight = revisitedPractice.ground.heightAt(40,15);
closeDigSandbox();
revisitedPractice = createDigSandbox({playerId:'practice-revisit-test'});
assert.ok(Math.abs(revisitedPractice.ground.heightAt(40,15) - dugPracticeHeight) < 1e-5,
  'Reopening the yard does not lay practice ground over a dug cell.');
closeDigSandbox();
console.log('Road work rules pass.');
import * as THREE from 'three';
import {createRoadWorkView} from '../src/machines/roads-view.js';
const scene = new THREE.Group();
const floorGeometry = new THREE.PlaneGeometry(20, 20, 20, 20);
floorGeometry.rotateX(-Math.PI/2);
const floorPositions = floorGeometry.attributes.position;
for (let i=0; i<floorPositions.count; i++) floorPositions.setY(i,4);
floorGeometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(floorPositions.count*3).fill(1),3));
const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({vertexColors:true}));
scene.add(floor);
const roadView = createRoadWorkView(scene, () => 4, floor);
const visibleWork = createRoadWork();
visibleWork.cells['2:3'] = {height:0.5, spread:1, compaction:0.2, surface:1, roughness:0.8};
roadView.update(visibleWork);
const vertexAt = (x,z) => (z+10)*21+x+10;
const middle=vertexAt(2,3), edge=vertexAt(3,3), outside=vertexAt(4,3);
assert.equal(floorPositions.getY(middle), 4.5, 'Work changes the ground height.');
assert.ok(floorPositions.getY(edge)>4, 'The worked ground reaches across the drum.');
assert.equal(floorPositions.getY(outside),4, 'Ground beyond the machine stays untouched.');
const softColor = floorGeometry.attributes.color.getX(middle);
visibleWork.cells['2:3'] = {height:0, spread:1, compaction:1, surface:1, roughness:0};
roadView.update(visibleWork);
assert.notEqual(floorGeometry.attributes.color.getX(middle), softColor, 'A repaired road looks different.');
const pavedColor = floorGeometry.attributes.color.getX(middle);
assert.equal(floorGeometry.attributes.color.getX(edge), pavedColor, 'A paved road has a clean edge across the screed.');
visibleWork.cells['2:3'] = {height:0, spread:1, compaction:1, surface:0, roughness:0};
roadView.update(visibleWork);
const firmColor = floorGeometry.attributes.color.getX(middle);
visibleWork.cells['2:3'] = {height:0, spread:1, compaction:0, surface:0, roughness:0};
roadView.update(visibleWork);
const looseColor = floorGeometry.attributes.color.getX(middle);
assert.ok(looseColor > firmColor && firmColor > pavedColor, 'Loose, firm and paved ground have distinct lightness.');
assert.equal(floorPositions.getY(middle), 4, 'Repair restores the ground height.');
delete visibleWork.cells['2:3'];
roadView.update(visibleWork);
assert.equal(floorGeometry.attributes.color.getX(middle), 1, 'Removing work restores the original ground colour.');
visibleWork.bladeLoad = 2;
roadView.update(visibleWork, {x:10, z:20, heading:0});
const heap = scene.getObjectByName('dozer-blade-heap');
assert.equal(heap.visible, true, 'The material carried by the blade is visible.');
assert.equal(heap.position.z, 22, 'The heap travels ahead of the dozer.');
visibleWork.bladeLoad = 0;
roadView.update(visibleWork, {x:10, z:20, heading:0});
assert.equal(heap.visible, false, 'The heap disappears when the blade has emptied.');
roadView.dispose();
assert.equal(scene.children.length, 1, 'The yard removes its road view on exit.');
floorGeometry.dispose(); floor.material.dispose();

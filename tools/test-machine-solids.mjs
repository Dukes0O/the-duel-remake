import assert from 'node:assert/strict';
import {machineFootprint, footprintOverlap, machineMoveContact} from '../src/machines/yard-solids.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {closeDigSandbox, createDigSandbox, digSandboxMachineState, PARKED_DOZER, stepDigSandbox, yardSolids} from '../src/machines/dig-sandbox.js';

// MACHINE-YARD-NEXT: the yard's machines meet each other as solids, each by its own outline.
const YARD_MACHINES = ['dozer', 'roller', 'paver', 'drill', 'excavator', 'dumpTruck', 'loader', 'mixer', 'trencher'];
for (const id of YARD_MACHINES) {
  const outline = machineDefinition(id).footprint;
  assert.ok(outline && outline.maxX > outline.minX && outline.maxZ > outline.minZ, `The ${id} has a plan outline.`);
}

// A footprint is centred on the outline and turns with the machine.
const paver = machineFootprint('paver', {x:10, z:20, heading:0});
assert.ok(Math.abs(paver.z - (20 + (3.97 - 4.6) / 2)) < 1e-9 && Math.abs(paver.halfX - 2.79) < 1e-9);
const turned = machineFootprint('drill', {x:0, z:0, heading:Math.PI / 2});
assert.ok(turned.x > 2.5 && Math.abs(turned.z) < 1e-9, 'The drill truck reaches forward of its hole, and turns with its heading.');

// Contact begins exactly where the two outlines meet, front to back.
const dozer = machineFootprint('dozer', {x:40, z:20, heading:0});
const touchZ = 20 - 2.01 - 2.79;
assert.equal(footprintOverlap(machineFootprint('roller', {x:40, z:touchZ - 0.01, heading:0}), dozer), 0);
assert.ok(Math.abs(footprintOverlap(machineFootprint('roller', {x:40, z:touchZ + 0.1, heading:0}), dozer) - 0.1) < 1e-9);
// Side by side, the widths count: the paver is wide and the roller is narrow.
assert.equal(footprintOverlap(machineFootprint('roller', {x:40 + 1.9 + 1.04 + 0.01, z:20, heading:0}), dozer), 0);
assert.ok(footprintOverlap(machineFootprint('paver', {x:40 + 1.9 + 1.04 + 0.01, z:20, heading:0}), dozer) > 1.7);
// Turned machines meet by their corners, not by a circle round them.
// A roller turned 45 degrees backs onto the dozer's front corner: its rear face is 2.49 m from its outline's centre.
const diagonal = along => ({x:41.9 + (along - 0.3) * Math.SQRT1_2, z:22.22 + (along - 0.3) * Math.SQRT1_2, heading:Math.PI / 4});
assert.equal(footprintOverlap(machineFootprint('roller', diagonal(2.49 + 0.05)), dozer), 0, 'A turned roller clear of the corner is clear.');
assert.ok(footprintOverlap(machineFootprint('roller', diagonal(2.49 - 0.05)), dozer) > 0.04, 'A turned roller on the corner touches it.');

// A move that would press into another machine is refused; one that keeps clear or backs away is allowed.
const before = {x:40, z:touchZ - 0.005, heading:0}, forward = {...before, z:before.z + 0.02}, back = {...before, z:before.z - 0.02};
assert.equal(machineMoveContact('roller', before, forward, [dozer])?.z, dozer.z, 'The roller stops against the dozer.');
assert.equal(machineMoveContact('roller', before, back, [dozer]), null, 'The roller can back away.');
assert.equal(machineMoveContact('roller', {x:30, z:0, heading:0}, {x:30, z:0.5, heading:0}, [dozer]), null);
// A machine placed overlapping another may only work its way out.
const inside = {x:40, z:touchZ + 0.5, heading:0};
assert.ok(machineMoveContact('roller', inside, {...inside, z:inside.z + 0.02}, [dozer]), 'Pushing deeper is refused.');
assert.equal(machineMoveContact('roller', inside, {...inside, z:inside.z - 0.02}, [dozer]), null, 'Backing out is allowed.');

// The yard holds every working machine and the old parked dozer. None starts inside another.
const yard = createDigSandbox({playerId:'machine-solids-test'});
const solids = yardSolids(yard, null);
assert.deepEqual(solids.map(solid => solid.id).sort(), ['parked', ...YARD_MACHINES].sort(), 'Every yard machine except Mabel is solid.');
for (const [index, a] of solids.entries()) for (const b of solids.slice(index + 1))
  assert.equal(footprintOverlap(a, b), 0, `The ${a.id} and the ${b.id} start apart.`);
assert.deepEqual(solids.find(solid => solid.id === 'parked'), {...machineFootprint('dozer', PARKED_DOZER), id:'parked'});

// One driven machine of each kind stops against the next: road, haul, drill, plant and trencher.
const cases = [
  ['roller', 'dozer', sim => sim.roadMachines.roller.machine, {forward:1, working:true}],
  ['dumpTruck', 'excavator', sim => sim.haul.machines.dumpTruck, {forward:1}],
  ['drill', 'paver', sim => sim.drill.machine, {forward:1}],
  ['loader', 'mixer', sim => sim.plant.loader.machine, {forward:1}],
  ['trencher', 'roller', sim => sim.trencher.machine, {forward:1}],
];
for (const [driven, standing, machineOf, controls] of cases) {
  let sim = createDigSandbox({playerId:`machine-solids-${driven}`});
  Object.assign(digSandboxMachineState(sim, standing), {x:120, z:40, heading:0, speedMps:0});
  const definition = machineDefinition(driven), other = machineDefinition(standing).footprint;
  // Start a metre short of the standing machine's rear, facing it.
  Object.assign(machineOf(sim), {x:120, z:40 + other.minZ - definition.footprint.maxZ - 1, heading:0, speedMps:0});
  sim = {...sim, activeMachine:driven, mode:'drive'};
  const events = [];
  for (let i = 0; i < 6 * 60; i++) { sim = stepDigSandbox(sim, {controls}, 1 / 60); events.push(...sim.events); }
  const gap = footprintOverlap(machineFootprint(driven, machineOf(sim)), machineFootprint(standing, digSandboxMachineState(sim, standing)));
  assert.equal(gap, 0, `The ${driven} does not pass into the ${standing}.`);
  assert.ok(machineOf(sim).z > 40 + other.minZ - definition.footprint.maxZ - 0.1, `The ${driven} drives right up to the ${standing}.`);
  const contact = events.find(event => event.type === 'machine-contact');
  assert.equal(contact?.cue, 'machine-contact', `Meeting the ${standing} is heard.`);
  assert.match(contact.message, /^The [a-z ]+ has stopped against the [a-z ]+\.$/);
  closeDigSandbox();
}
console.log('Machine solids passed: outlines from the models, exact contact, backing away, and every yard machine stopping against another.');

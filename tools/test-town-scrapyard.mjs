import assert from 'node:assert/strict';
import {createTown, deserializeTown, serializeTown} from '../src/town/town-state.js';
import {MACHINE_PARTS, SCRAPYARD_MACHINES} from '../src/town/content/machine-parts.js';
import {addScrapyardPart, advanceScrapyardBuild, beginMachineBuild, scrapyardMachines} from '../src/town/town-scrapyard.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
function same(actual, expected, message) { assert.deepEqual(actual, expected, message); checks++; }

const town = createTown(142, 'Machine Yard');
const initial = scrapyardMachines(town);
check(initial.find(machine => machine.id === 'flatbed')?.owned, 'the flatbed is ready from the start');
check(initial.find(machine => machine.id === 'trencher')?.missingParts.length > 0, 'the trencher shows its missing parts');
check(initial.every(machine => typeof machine.picture === 'string'), 'each machine list row has a picture key for the screen');
check(MACHINE_PARTS.length === SCRAPYARD_MACHINES.reduce((sum, machine) => sum + machine.parts.length, 0), 'part data covers every listed machine part');

const firstPart = SCRAPYARD_MACHINES.find(machine => machine.id === 'trencher').parts[0];
check(!beginMachineBuild(town, 'trencher').ok, 'missing parts block a build');
check(addScrapyardPart(town, {partId:firstPart.id, source:'salvage'}).ok, 'salvage can supply a machine part');
check(!beginMachineBuild(town, 'trencher').ok, 'a partial parts list cannot start a build');
for (const part of SCRAPYARD_MACHINES.find(machine => machine.id === 'trencher').parts.slice(1)) {
  check(addScrapyardPart(town, {partId:part.id, source:'job'}).ok, 'a completed job can supply a machine part');
}
const started = beginMachineBuild(town, 'trencher');
check(started.ok && started.minutesRemaining === 15, 'the first machine starts a short build after its parts arrive');
check(!beginMachineBuild(town, 'dump-truck').ok, 'later machines wait for the earlier machine');
check(!advanceScrapyardBuild(town, 14).complete, 'a machine is not ready before its build time ends');
const finished = advanceScrapyardBuild(town, 1);
check(finished.complete && finished.machineId === 'trencher', 'the build completes after 15 minutes');
check(scrapyardMachines(town).find(machine => machine.id === 'trencher').owned, 'the finished machine is available');
same(town.scrapyard.events.map(event => event.type), ['machine-started'], 'the first start-up is recorded once');
check(!advanceScrapyardBuild(town, 1).complete, 'a finished machine cannot create a second start-up event');

const dumpParts = SCRAPYARD_MACHINES.find(machine => machine.id === 'dump-truck').parts;
for (const part of dumpParts) check(addScrapyardPart(town, {partId:part.id, source:'trader'}).ok, 'traders can supply parts');
check(beginMachineBuild(town, 'dump-truck').ok, 'the next machine can be built after its parts arrive');
const restored = deserializeTown(serializeTown(town));
same(scrapyardMachines(restored), scrapyardMachines(town), 'machine ownership and build progress survive a save round trip');
check(!addScrapyardPart(town, {partId:'unknown-part', source:'salvage'}).ok, 'unknown parts are refused');
check(!addScrapyardPart(town, {partId:firstPart.id, source:'button'}).ok, 'parts cannot come from an unsupported source');
check(!advanceScrapyardBuild(town, -1).ok, 'negative build time is refused');

console.log(`TOWN-SCRAPYARD: ${checks} checks passed.`);

// TOWN-RESERVED-OUTPOSTS: the town's planning keeps the neighbours' outposts clear. Each outpost's fenced ground, with a margin, is
// reserved ground of the town's region, so a building, a road or a home plot planned on it is refused with a sentence that says whose
// place it is. A town saved before this card (tools/fixtures/town/town-before-reserved-outposts.json, made by the code of
// integration/wasteland at 82a9125 with a hand well on Dot's porch, a road at the Rail Halt and a home plot at Old Tam's hut) loads unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTown, deserializeTown, dispatchTownCommand, serializeTown} from '../src/town/index.js';
import {OUTPOSTS_WORLD, OUTPOST_GROUND_MARGIN} from '../src/town/content/outposts-world.js';
import {TOWN_NEIGHBOURS} from '../src/town/content/neighbours.js';
import {townOutpostWorld} from '../src/town/town-outpost-world.js';
import {thingPoint} from '../src/town/town-world-things.js';
import {createTownWorld} from '../src/town/town-world.js';
import {cellIsReserved, RESERVED_GROUND_SENTENCE, reservedGroundSentence, SCABLANDS_TOWN_REGION, TOWN_CELL_METRES}
  from '../src/town/town-world-data.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const same = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const cellOf = point => ({x: Math.floor(point.x / TOWN_CELL_METRES), z: Math.floor(point.z / TOWN_CELL_METRES)});
const neighbourName = new Map(TOWN_NEIGHBOURS.map(row => [row.id, row.name]));

// A town that protects every neighbour, so each outpost's fence stands and is checked with the rest.
const town = createTown(2611, 'Reserved outposts');
town.outposts = Object.fromEntries(OUTPOSTS_WORLD.map(row => [row.neighbourId, {protected: true}]));
const {outposts} = townOutpostWorld(town);
same(outposts.length, OUTPOSTS_WORLD.length, 'every outpost is placed');

for (const outpost of outposts) {
  const row = OUTPOSTS_WORLD.find(item => item.id === outpost.id), who = neighbourName.get(row.neighbourId);
  const shape = SCABLANDS_TOWN_REGION.reservedShapes.find(item => item.outpostId === outpost.id);
  check(shape, `${row.name} is reserved ground of the town's region`);

  // The sentence is plain: whole, with the outpost's name and whose place it is, and no dash.
  check(row.ground.includes(row.name) && row.ground.includes(`${who}’s`), `${row.name}'s sentence names the place and ${who}`);
  check(/^[A-Z].*\.$/.test(row.ground) && !/[—–]/.test(row.ground), `${row.name}'s sentence is a plain sentence`);

  // Planning a building on the outpost is refused with that sentence, and nothing is planned.
  const at = cellOf(outpost), before = serializeTown(town);
  for (const buildingId of ['hand-well', 'reservoir', 'road-dirt']) {
    const answer = dispatchTownCommand(town, {type: 'placeBuilding', buildingId, ...at});
    same({ok: answer.ok, message: answer.message}, {ok: false, message: row.ground}, `${buildingId} planned on ${row.name} is refused`);
  }
  const plot = dispatchTownCommand(town, {type: 'paintHomeGround', cells: [at]});
  same({ok: plot.ok, message: plot.message}, {ok: false, message: row.ground}, `a home plot on ${row.name} is refused`);
  same(serializeTown(town), before, `nothing is planned on ${row.name}`);

  // Everything the outpost has on the ground stands on reserved ground: its solids, its fence, its people and its animals.
  const points = [...outpost.solids.map(solid => ({x: solid.x, z: solid.z})), ...outpost.fence,
    ...outpost.people.flatMap(person => [person.home, person.aside, ...(person.wander ?? [])].filter(Boolean)),
    ...outpost.animals.flatMap(animal => animal.wander)];
  check(points.length > 0 && outpost.fence.length > 0, `${row.name} has things on its ground`);
  for (const point of points) {
    const cell = cellOf(point);
    check(reservedGroundSentence('scablands', cell.x, cell.z) === row.ground, `${row.name}'s ground covers (${point.x}, ${point.z})`);
  }

  // The margin: on the outpost's open side, ground a little short of the margin's edge past the fence is kept; ground two cells past
  // that edge is free, and a hand well is planned there.
  const [west] = row.fence.bounds ?? row.bounds, fenceAt = west - (row.fence.margin ?? 3);
  const kept = cellOf(thingPoint(outpost, fenceAt - OUTPOST_GROUND_MARGIN + 1, 0));
  check(cellIsReserved('scablands', kept.x, kept.z), `${row.name}'s margin keeps the ground just past its fence`);
  const free = cellOf(thingPoint(outpost, fenceAt - OUTPOST_GROUND_MARGIN - 2 * TOWN_CELL_METRES, 0));
  check(!cellIsReserved('scablands', free.x, free.z), `the ground two cells past ${row.name}'s margin is free`);
  const placed = dispatchTownCommand(town, {type: 'placeBuilding', buildingId: 'hand-well', ...free});
  check(placed.ok, `a hand well can be planned beside ${row.name}: ${placed.message}`);
}

// The Dome and the old roads still answer as they did.
same(reservedGroundSentence('scablands', 0, -21), RESERVED_GROUND_SENTENCE, 'the Dome oval is kept clear as before');
same(dispatchTownCommand(createTown(7, 'Dome'), {type: 'placeBuilding', buildingId: 'hand-well', x: 0, z: -21}).message,
  'That ground is kept clear.', 'planning on the Dome says the ground is kept clear');
same(reservedGroundSentence('scablands', 4, 8), null, 'the town\'s own ground is free');

// A town saved before this card loads unchanged, the buildings and the plot it already had on the outposts' ground included.
const saved = readFileSync(new URL('./fixtures/town/town-before-reserved-outposts.json', import.meta.url), 'utf8').trim();
const loaded = deserializeTown(saved);
same(serializeTown(loaded), saved, 'a town saved before the outposts were reserved loads unchanged');
const [dot, , tam, , halt] = townOutpostWorld(loaded).outposts;
check(loaded.buildings.some(building => building.buildingId === 'hand-well' && building.x === cellOf(dot).x && building.z === cellOf(dot).z),
  'the hand well planned on Dot’s ground before is still there');
check(loaded.buildings.some(building => building.buildingId === 'road-dirt' && building.x === cellOf(halt).x),
  'the road planned at the Rail Halt before is still there');
check(loaded.homePlots.some(plot => plot.x === cellOf(tam).x && plot.z === cellOf(tam).z), 'the home plot at Old Tam’s hut is still there');
check(createTownWorld(loaded).solids.some(solid => solid.id === 'building-2'), 'the old town\'s drive is made with its old buildings');

console.log(`Town reserved outposts: ${checks} checks passed.`);

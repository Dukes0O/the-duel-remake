// HELI-RUSTWALL slice 1: the Scablands as a place Kestrel One can fly (src/heli/heli-scablands.js), built from the land's
// own ground, solids, roads and places (src/town/town-heli.js). Everything sits on the real ground, the flying area's ceiling
// clears the highest ground on the land, the Reservoir and the dip tank hold water, and the same town gives the same world.
import assert from 'node:assert/strict';
import {createTown} from '../src/town/index.js';
import {scablandsHeliInputs, townHelipad} from '../src/town/town-heli.js';
import {SCABLANDS_PLACES, SCABLANDS_LAYOUT} from '../src/world/scablands.js';
import {scablandsSurfaceHeightAt, scablandsRoadDistance} from '../src/world/scablands-ground.js';
import {ROAD_HALF_WIDTH} from '../src/world/scablands-road.js';
import {HILLS} from '../src/world/scablands-height.js';
import {SCABLANDS_ID, SCABLANDS_HELI, SCABLANDS_LIFTS, SCABLANDS_LINES, createScablandsWorld, ridgeFireRecord, openLifts, createScout,
  scablandsFlyable} from '../src/heli/heli-scablands.js';
import {FIRE, cellIJ} from '../src/heli/heli-fire.js';
import {KESTREL} from '../src/heli/heli-flight.js';
import {TOWN_CAPTIONS} from '../src/town/content/lines.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };

function townWith({pad = true, reservoir = true, fire = null, lifts = []} = {}) {
  const town = createTown(4242, 'Rustwall');
  town.buildings = [
    ...(pad ? [{id: 'building-7', buildingId: 'helipad', regionId: 'scablands', x: 30, z: -12, width: 4, depth: 4, state: 'finished', groundY: 0}] : []),
    {id: 'building-8', buildingId: 'helipad', regionId: 'scablands', x: 60, z: -12, width: 4, depth: 4, state: 'plan', groundY: 0},
    ...(reservoir ? [{id: 'building-9', buildingId: 'reservoir', regionId: 'scablands', x: 30, z: 6, width: 4, depth: 4, state: 'finished', groundY: 0}] : []),
  ];
  if (fire || lifts.length) town.heli = {ridgeFire: fire, liftsDone: lifts, scouted: 0, flown: false};
  return town;
}

// ---- The pad and the inputs -----------------------------------------------------------------------------------------------
const town = townWith({fire: {state: 'burning', raisedTick: 0n}});
const inputs = scablandsHeliInputs(town);
ok(townHelipad(town)?.id === 'building-7', 'the finished Helipad is the pad; one still a plan is not');
ok(inputs.pad.x === 32 * 8 && inputs.pad.z === -10 * 8, 'the pad is the middle of the Helipad, in metres');
ok(!inputs.solids.some(solid => ['building-7', 'building-9'].includes(solid.id)), 'the pad and the Reservoir are not obstacles');
ok(inputs.solids.some(solid => solid.id === 'building-8'), 'other town buildings are obstacles');
ok(inputs.solids.length > 50, `the land's own solids are obstacles (${inputs.solids.length})`);
ok(!scablandsFlyable(scablandsHeliInputs(townWith({pad: false}))), 'no finished Helipad: the Scablands cannot be flown');

const world = createScablandsWorld(inputs);
const {site, hut, tank, truck, ground} = world;
ok(site.courseId === SCABLANDS_ID && site.zone.radius === 12, 'the pad is the usual 12 m landing circle');
ok(Math.abs(site.zone.y - scablandsSurfaceHeightAt(inputs.pad.x, inputs.pad.z)) < 0.5, 'the pad sits on the real ground');

// ---- Every job site on the real ground --------------------------------------------------------------------------------------
const ridge = SCABLANDS_PLACES.find(place => place.id === 'ridge');
const level = (x, z, radius) => {
  let low = Infinity, high = -Infinity;
  for (let k = 0; k < 16; k++) for (const r of [0, radius / 2, radius]) {
    const y = scablandsSurfaceHeightAt(x + Math.cos(k * Math.PI / 8) * r, z + Math.sin(k * Math.PI / 8) * r);
    low = Math.min(low, y); high = Math.max(high, y);
  }
  return high - low;
};
ok(Math.hypot(hut.x - ridge.x, hut.z - ridge.z) <= 60, 'Old Tam\'s hut circle is on the Ridge');
ok(Math.abs(hut.y - scablandsSurfaceHeightAt(hut.x, hut.z)) < 0.5 && level(hut.x, hut.z, hut.radius) <= 1.6, `the hut circle is level real ground (${level(hut.x, hut.z, hut.radius).toFixed(2)} m)`);
ok(hut.y > 40, `the hut is up on the Ridge (${hut.y.toFixed(1)} m)`);
const tankRoad = scablandsRoadDistance(tank.x, tank.z) - ROAD_HALF_WIDTH;
ok(tankRoad >= 6 && tankRoad <= 30, `the dip tank stands beside a road, where the fire truck can fill it (${tankRoad.toFixed(1)} m off)`);
ok(level(tank.x, tank.z, tank.radius) <= 0.6, 'the dip tank stands on level ground');
ok(tank.y <= hut.y - 15 && truck.y <= hut.y - 15, 'the dip tank and the pickup are at the foot of the Ridge, below the hut');
ok(Math.abs(truck.y - scablandsSurfaceHeightAt(truck.x, truck.z)) < 0.5, 'the pickup stands on the real ground');
ok(!ground.near(tank.x, tank.z, tank.radius + 4).length && !ground.near(hut.x, hut.z, hut.radius + 4).length, 'nothing stands in the tank or the hut circle');

// ---- The flying area and its ceiling -----------------------------------------------------------------------------------------
const {area} = site;
let highest = -Infinity, at = null;
for (let x = area.minX; x <= area.maxX; x += 50) for (let z = area.minZ; z <= area.maxZ; z += 50) {
  const y = scablandsSurfaceHeightAt(x, z);
  if (y > highest) { highest = y; at = {x, z}; }
}
for (const hill of HILLS) highest = Math.max(highest, scablandsSurfaceHeightAt(hill.x, hill.z));
ok(highest <= SCABLANDS_HELI.highestGround, `the highest ground on the land (${highest.toFixed(1)} m at ${at.x}, ${at.z}) is no higher than the number the ceiling clears`);
ok(area.ceiling >= highest + SCABLANDS_HELI.clearAbove, `the ceiling (${area.ceiling.toFixed(0)} m) is at least ${SCABLANDS_HELI.clearAbove} m over the highest ground`);
const lookout = HILLS.find(hill => hill.kind === 'lookout');
ok(area.ceiling - scablandsSurfaceHeightAt(lookout.x, lookout.z) > 200, 'the Lookout, the highest hill inside the rim, is far under the ceiling');
for (const place of SCABLANDS_PLACES) ok(place.x > area.minX && place.x < area.maxX && place.z > area.minZ && place.z < area.maxZ, `${place.name} is inside the flying area`);
for (const point of [hut, tank, truck, site.zone]) ok(point.x > area.minX + 500 && point.x < area.maxX - 500 && point.z > area.minZ + 500 && point.z < area.maxZ - 500, 'each job site is well inside the flying area');
ok(area.maxX === SCABLANDS_LAYOUT.halfWidth && area.maxZ === SCABLANDS_LAYOUT.halfDepth, 'the flying area is the whole land');
// The thin-air rule leaves Kestrel One able to climb to the ceiling with a full bucket.
const thrust = KESTREL.maxThrust * Math.exp(-(SCABLANDS_HELI.baseAltitude + area.ceiling) / KESTREL.airScaleHeight);
ok(thrust > (KESTREL.emptyKg + KESTREL.pilotKg + KESTREL.tankKg + 650) * 9.81, 'a full tank and a full bucket still lift at the ceiling');

// ---- Water to scoop -----------------------------------------------------------------------------------------------------------
const reservoir = inputs.reservoirs[0];
ok(ground.water(reservoir.x, reservoir.z) !== null && ground.water(reservoir.x + 15, reservoir.z - 15) !== null, 'the Reservoir can be scooped');
ok(ground.water(reservoir.x, reservoir.z) - ground.height(reservoir.x, reservoir.z) >= SCABLANDS_HELI.reservoirDepth - 0.01, 'the Reservoir is about 2 m deep');
ok(ground.water(reservoir.x + 20, reservoir.z) === null, 'outside the Reservoir there is no water');
ok(ground.water(tank.x, tank.z) - ground.height(tank.x, tank.z) > 1.3, 'the dip tank holds 1.37 m of water while the Ridge burns');
const quiet = createScablandsWorld(scablandsHeliInputs(townWith({fire: {state: 'out', raisedTick: 0n}, reservoir: false})));
ok(quiet.ground.water(quiet.tank.x, quiet.tank.z) === null, 'with the fire out the dip tank is packed away');
ok(quiet.water.length === 0, 'no Reservoir and no fire: nothing to scoop (the Scablands is dry)');

// ---- The Ridge fire ------------------------------------------------------------------------------------------------------------
ok(world.grid.forest >= 150, `the Ridge's scrub makes ${world.grid.forest} fire cells`);
ok(world.grid.lostAt === FIRE.lostCells, 'a Ridge fire is lost at the usual 45 cells');
for (const cell of world.grid.cells.values()) {
  const d = Math.hypot(cell.x - ridge.x, cell.z - ridge.z);
  if (d < SCABLANDS_HELI.scrub.inner - 15 || d > SCABLANDS_HELI.scrub.outer + 15) { ok(false, 'a fire cell off the Ridge'); break; }
}
ok([...world.grid.cells.values()].every(cell => scablandsRoadDistance(cell.x, cell.z) >= ROAD_HALF_WIDTH), 'roads stay firebreaks: no scrub cell on a road');
const fire = ridgeFireRecord(world, inputs);
ok(fire && fire.courseId === SCABLANDS_ID && fire.burning.length === 3, 'a new Ridge fire starts with three cells, as the fire rules start one');
const [i, j] = cellIJ(fire.burning.find(([, p]) => p === FIRE.startPercent)[0]);
const fromTank = Math.hypot((i + 0.5) * FIRE.cell - tank.x, (j + 0.5) * FIRE.cell - tank.z);
ok(fromTank >= FIRE.shoreNear && fromTank <= FIRE.shoreFar + 25, `the fire starts 250 to 1,000 m from the dip tank (${fromTank.toFixed(0)} m)`);
assert.deepEqual(ridgeFireRecord(createScablandsWorld(scablandsHeliInputs(town)), inputs), fire, 'the same town starts the same fire'); checks++;
const saved = {...fire, burning: fire.burning.slice(0, 1)};
ok(ridgeFireRecord(world, {...inputs, ridgeFire: {state: 'burning', fire: saved}}) === saved, 'a saved fire carries on where it stopped');
ok(ridgeFireRecord(world, {...inputs, ridgeFire: {state: 'out'}}) === null, 'a fire that is out stays out');

// ---- The same town, the same world; the lifts; the lines ----------------------------------------------------------------------
const again = createScablandsWorld(scablandsHeliInputs(town));
assert.deepEqual([again.hut, again.tank, again.truck, again.site.zone, again.site.crate, again.grid.forest], [hut, tank, truck, site.zone, site.crate, world.grid.forest]);
checks++;
ok(SCABLANDS_LIFTS.every(lift => lift.massKg <= KESTREL.hookLimitKg), 'both loads are within Kestrel One\'s hook limit');
ok(openLifts(inputs).map(lift => lift.id).join() === 'tam-truck', 'while the Ridge burns only the pickup waits; the feed follows the fire');
ok(openLifts({...inputs, ridgeFire: {state: 'dune'}}).length === 2, 'after the fire both loads wait');
ok(openLifts({...inputs, ridgeFire: {state: 'out'}, liftsDone: ['tam-feed', 'tam-truck']}).length === 0, 'a load set down once is done');
ok(openLifts(scablandsHeliInputs(townWith({pad: false}))).length === 0, 'no pad, no lifts');
for (const [id, line] of Object.entries(SCABLANDS_LINES)) {
  ok(line.text.length < 260 && !/—|–/.test(line.text) && /^[A-Z].*[.?!]$/.test(line.text), `${id} is a whole sentence under 260 characters with no dashes`);
}
ok(SCABLANDS_LINES['heli.scablands.roger.first'].text === TOWN_CAPTIONS['town.heli.roger'].text, 'Roger\'s first line is the same in the town and in the helicopter');

// ---- Scouting ------------------------------------------------------------------------------------------------------------------
const scout = createScout({explored: [{x: 2, z: -1}], chunkMetres: inputs.chunkMetres, land: inputs.land});
const over = (x, z, above) => ({x, z, y: ground.height(x, z) + above, onGround: false});
ok(scout.step(over(300, -100, 10), ground).length === 0, 'flying below 30 m uncovers nothing');
const seen = scout.step(over(300, -100, 60), ground);
ok(seen.length === 8, `at 60 m the chunk below and the eight round it are seen, less the one already known (${seen.length})`);
ok(scout.step(over(310, -110, 60), ground).length === 0, 'the same chunk is seen once');
ok(scout.step(over(300 + 128, -100, 60), ground).length === 3, 'the next chunk east adds one new column of three');
ok(scout.step({...over(300, -100, 60), onGround: true}, ground).length === 0, 'on the ground nothing is seen');
ok(scout.step(over(6990, 4990, 60), ground).every(c => c.x < 55 && c.z < 40), 'nothing past the edge of the land is put on the map');

console.log(`test-heli-scablands: ${checks} checks passed`);

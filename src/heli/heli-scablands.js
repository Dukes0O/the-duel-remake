// The Scablands as a place Kestrel One can fly (card HELI-RUSTWALL; docs/story/the-long-dry.md section 6). Pure game rules,
// no graphics: the town's Helipad is the pad, a finished Reservoir and the Ridge fire's dip tank can be scooped, Old Tam's
// crate and pickup wait to be lifted up the Ridge, and flying over the land uncovers the town's map. The flight, the cable,
// the bucket and the fire rules are the helicopter's own and are not changed here: this file only gives them a place.
//
// It imports nothing outside src/heli/ (the import guard in tools/test-heli-mode.mjs): the app hands it the land as plain
// inputs, built by src/town/town-heli.js from the Scablands' own ground, solids, roads and places.
//
// inputs: {heightAt(x, z), solids: [{id, x, z, radius, base, top, kind}], roadDistance(x, z), roadHalfWidth,
//   places: [{id, x, z, flatRadius}], land: {halfWidth, halfDepth}, chunkMetres, seed,
//   pad: {x, z} | null, reservoirs: [{x, z, half}], explored: [{x, z}], ridgeFire: null | {state, fire}, liftsDone: [id]}
import {createHeliGround} from './heli-ground.js';
import {CABLE} from './heli-cable.js';
import {FIRE, fireGrid, startCells, startFire, cellId} from './heli-fire.js';
import {heliHash} from './heli-save.js';
import {makeRng} from '../rng.js';

export const SCABLANDS_ID = 'scablands';

export const SCABLANDS_HELI = Object.freeze({
  name: 'The Scablands',
  // The thin-air rule's height: the dry lake bed lies about as high as Pacific Canyon, where the Hidden Road leaves the coast
  // (pilot-map-data.js PLACE_ALTITUDES); the land's own heights sit on top of it.
  baseAltitude: 40,
  // The flying area is the whole land, 14 by 10 km. Its ceiling is the usual 300 m over the pad, and never less than this far
  // over the highest ground on the land (the rim and the wall, about 195 m, then the Lookout, about 79 m).
  ceilingAbove: 300, clearAbove: 100, highestGround: 196,
  // The 4 by 4 cell Helipad (src/town/content/buildings.js) is 32 m across; the landing circle is the usual 12 m one.
  padRadius: CABLE.landingRadius, parkingDistance: 25,
  // A Reservoir holds 2,000,000 litres over its 32 m square: about 2 m of water (src/town/content/buildings.js).
  reservoirDepth: 2,
  // A folding dip tank, the kind fire crews set up near a fire for helicopter buckets: about 45,000 litres (12,000 US
  // gallons) in a tank about 6.4 m across and 1.37 m deep (makers' tables). The fire truck fills it at the foot of the Ridge,
  // where a truck can still drive, and keeps it topped up. It stands beside a road, below Old Tam's hut.
  dipTank: Object.freeze({radius: 3.2, depth: 1.37, litres: 45000, fromRidge: Object.freeze([550, 1000]), roadside: Object.freeze([6, 30])}),
  // While the Ridge burns a fuel truck stands with the dip tank, in a landing circle of the usual 12 m this far from it, as
  // the lodge's crews stage fuel near a rescue at Summit Run (heli-session.js); it sells at the pump's price.
  fuelFromTank: Object.freeze([25, 60]),
  // Old Tam's hut on the Ridge's flat top: the circle where lifted loads are set down.
  hutRadius: 12,
  // Dry scrub on the Ridge's shoulder: a band two fire cells (20 m) deep between these distances from the Ridge's middle,
  // with 3 to 6 bushes a cell (desert scrub stands a few metres apart). None within hutClear of the hut or tankClear of the
  // tank. The fire rules were tuned on Tremblant Woods' strip of forest one or two cells deep; an open slope of scrub burns
  // out in two spread steps under them, so the scrub is a band of that depth, chosen so the HELI_FIRE section 4.5 targets
  // hold on the Ridge (tools/test-heli-scablands.mjs: left alone, calm 12 steps and windy 10; answered at once, 5 drops).
  scrub: Object.freeze({inner: 245, outer: 280, perCell: Object.freeze([3, 6]), hutClear: 60, tankClear: 40}),
  // Old Tam's pickup slid off the track at the Ridge's foot, this far from its middle.
  truckFromRidge: Object.freeze([450, 1000]),
  // Scouting: flying at least this high over the ground uncovers the map chunk under the helicopter and the eight around it,
  // as a crew member's scouting trip does (src/town/town-dispatch.js), and the same 30 m a call waits for (HELI_FIRE 3.2).
  scoutHeight: 30, scoutReach: 1,
});

// The two loads waiting to go up the Ridge. A crate of goat feed and water: twelve 25 kg sacks of feed and 150 litres of
// water in cans, 450 kg. Old Tam's pickup: a small 1970s pickup weighs about 1,100 to 1,250 kg empty, so 1,200 kg, under
// Kestrel One's 1,500 kg hook limit.
export const SCABLANDS_LIFTS = Object.freeze([
  Object.freeze({id: 'tam-feed', kind: 'crate', massKg: 450, from: 'pad', to: 'hut', afterFire: true,
    title: 'Fly a crate of goat feed and water up to Old Tam on the Ridge.'}),
  Object.freeze({id: 'tam-truck', kind: 'truck', massKg: 1200, from: 'truck', to: 'hut', afterFire: false,
    title: 'Lift Old Tam\'s pickup from the foot of the Ridge back up to his hut.'}),
]);

// What is said in the Scablands (on screen, with the radio's click; voice is a later card). Every line is a plain, whole
// sentence with one job (Kyle, 19 November 2026), under 260 characters, with no em dashes.
export const SCABLANDS_LINES = Object.freeze({
  'heli.scablands.roger.first': Object.freeze({who: 'Roger', when: 'The first lift-off over the wall',
    text: 'Kestrel One, this is Tremblant. Please say your position again, because I didn\'t know that wall had another side.'}),
  'heli.scablands.roger.fire': Object.freeze({who: 'Roger', when: 'A lift-off with the Ridge on fire',
    text: 'There\'s a fire in the scrub on the Ridge, Kestrel One. Fit the bucket at the pad, then fill it at the dip tank the fire truck has set up at the foot of the Ridge.'}),
  'heli.scablands.roger.tank': Object.freeze({who: 'Roger', when: 'The bucket fitted, the Ridge on fire',
    text: 'The dip tank is the round orange pool beside the road below the Ridge. Lower the bucket into it slowly and let it fill.'}),
  'heli.scablands.tam.out': Object.freeze({who: 'Old Tam', when: 'The Ridge fire put out',
    text: 'The fire\'s out, and the goats have decided to forgive you. Come up for tea some time, and mind the goats when you do.'}),
  'heli.scablands.roger.lost': Object.freeze({who: 'Roger', when: 'The Ridge fire grew too big',
    text: 'The fire has burnt out the scrub on the Ridge, Kestrel One. Old Tam and his goats are safe, and the scrub will grow back.'}),
  'heli.scablands.tam.feed': Object.freeze({who: 'Old Tam', when: 'The feed crate waits by the pad',
    text: 'The fire took the goats\' grazing. If you could fly me up that crate of feed and water, they would be very grateful, and so would I.'}),
  'heli.scablands.tam.fed': Object.freeze({who: 'Old Tam', when: 'The feed crate set down at the hut',
    text: 'That\'s the feed. The goats have already found it, so I would leave before they find you.'}),
  'heli.scablands.tam.truck': Object.freeze({who: 'Old Tam', when: 'The pickup waits at the foot of the Ridge',
    text: 'My old pickup slid off the track at the bottom of the Ridge, and it won\'t drive back up. Could you lift it up to the hut for me?'}),
  'heli.scablands.tam.trucked': Object.freeze({who: 'Old Tam', when: 'The pickup set down at the hut',
    text: 'That\'s my truck back where it belongs. Please don\'t tell anyone I tried to drive it down the Ridge.'}),
  'heli.scablands.roger.scout': Object.freeze({who: 'Roger', when: 'The first chunk of the map uncovered from the air',
    text: 'Everything you fly over goes on the town\'s map, Kestrel One. Stay at least thirty metres up and you\'ll see the ground clearly.'}),
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

function validInputs(inputs) {
  if (!inputs || typeof inputs.heightAt !== 'function' || typeof inputs.roadDistance !== 'function')
    throw new Error('The Scablands needs its ground: heightAt and roadDistance.');
  if (!Array.isArray(inputs.places) || !inputs.places.some(place => place.id === 'ridge')) throw new Error('The Scablands needs its places, the Ridge among them.');
  if (!inputs.land || !(inputs.land.halfWidth > 0) || !(inputs.land.halfDepth > 0)) throw new Error('The Scablands needs its size.');
  return inputs;
}

// A finished Helipad, if the town has one: the pad. Without it Kestrel One cannot come over the wall.
export const scablandsFlyable = inputs => !!inputs?.pad && Number.isFinite(inputs.pad.x) && Number.isFinite(inputs.pad.z);

// The water the bucket can scoop from: each finished Reservoir, and the dip tank while the Ridge burns. Each is
// {kind, x, z, surface, floor, contains(x, z)}.
function waterBodies(inputs, natural, tank) {
  const bodies = [];
  for (const reservoir of inputs.reservoirs ?? []) {
    if (![reservoir.x, reservoir.z, reservoir.half].every(Number.isFinite)) continue;
    const surface = natural(reservoir.x, reservoir.z), floor = surface - SCABLANDS_HELI.reservoirDepth;
    bodies.push(Object.freeze({kind: 'reservoir', x: reservoir.x, z: reservoir.z, half: reservoir.half, surface, floor,
      contains: (x, z) => Math.abs(x - reservoir.x) <= reservoir.half && Math.abs(z - reservoir.z) <= reservoir.half}));
  }
  if (tank) {
    const floor = natural(tank.x, tank.z), surface = floor + SCABLANDS_HELI.dipTank.depth;
    bodies.push(Object.freeze({kind: 'dipTank', x: tank.x, z: tank.z, radius: tank.radius, surface, floor,
      contains: (x, z) => Math.hypot(x - tank.x, z - tank.z) <= tank.radius}));
  }
  return bodies;
}

// Is a circle open, level ground off the road with nothing tall in it? (The same test as the landing-zone search beside a
// course's start, src/heli/heli-session.js, here with the Scablands' own roads.)
function clearCircle(inputs, ground, x, z, radius, flatness, {road = 6} = {}) {
  if (inputs.roadDistance(x, z) < inputs.roadHalfWidth + road + radius * 0.5) return false;
  const centre = ground.height(x, z);
  let low = centre, high = centre;
  for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, r = radius * ring / 2;
    const y = ground.height(x + Math.cos(a) * r, z + Math.sin(a) * r);
    low = Math.min(low, y); high = Math.max(high, y);
  }
  if (high - low > flatness) return false;
  return ground.near(x, z, radius + 4).every(o => o.top <= centre + 0.5 && o.shape !== 'cone');
}

// The first spot found going out in rings from a middle, the same way every time.
function searchRings(centre, distances, test, steps = 24, start = 0) {
  for (const distance of distances) {
    const count = distance === 0 ? 1 : steps;
    for (let k = 0; k < count; k++) {
      const a = start + k * 2 * Math.PI / count, x = centre.x + Math.cos(a) * distance, z = centre.z + Math.sin(a) * distance;
      if (test(x, z)) return {x, z};
    }
  }
  return null;
}
const range = (from, to, step) => { const out = []; for (let v = from; v <= to + 1e-9; v += step) out.push(v); return out; };

// The world the session loads for the Scablands: a course-like frame (the few things a course is asked), the ground, and
// the place's facts. Built once per visit from the inputs; the same inputs give the same world.
export function createScablandsWorld(rawInputs) {
  const inputs = validInputs(rawInputs);
  const ridge = inputs.places.find(place => place.id === 'ridge');
  // The land with no water in it, for searches; the ground the helicopter meets is built after the water.
  const solids = (inputs.solids ?? []).filter(o => [o.x, o.z, o.radius, o.base, o.top].every(Number.isFinite));
  const dry = createHeliGround({heightAt: inputs.heightAt, obstacles: solids});
  // Old Tam's hut circle on the Ridge's flat top.
  const hutAt = searchRings(ridge, range(0, 60, 10), (x, z) => clearCircle(inputs, dry, x, z, SCABLANDS_HELI.hutRadius, 1.5), 16);
  if (!hutAt) throw new Error('No clear circle on the Ridge for Old Tam\'s hut.');
  const hut = Object.freeze({x: hutAt.x, z: hutAt.z, y: dry.height(hutAt.x, hutAt.z), radius: SCABLANDS_HELI.hutRadius});
  // Search from the side that faces the yard, so the tank and the pickup sit on the way up from town.
  const towardYard = Math.atan2(-ridge.z, -ridge.x);
  const below = (x, z) => dry.height(x, z) <= hut.y - 15;
  const tankSpec = SCABLANDS_HELI.dipTank;
  const tankAt = searchRings(ridge, range(tankSpec.fromRidge[0], tankSpec.fromRidge[1], 25), (x, z) => {
    const fromRoad = inputs.roadDistance(x, z) - inputs.roadHalfWidth;
    return fromRoad >= tankSpec.roadside[0] && fromRoad <= tankSpec.roadside[1] && below(x, z)
      && clearCircle(inputs, dry, x, z, tankSpec.radius + 1, 0.5, {road: -inputs.roadHalfWidth});
  }, 48, towardYard);
  if (!tankAt) throw new Error('No level ground beside a road below the Ridge for the dip tank.');
  const tank = Object.freeze({x: tankAt.x, z: tankAt.z, y: dry.height(tankAt.x, tankAt.z), radius: tankSpec.radius, litres: tankSpec.litres});
  const fuelAt = searchRings(tank, range(SCABLANDS_HELI.fuelFromTank[0], SCABLANDS_HELI.fuelFromTank[1], 5),
    (x, z) => clearCircle(inputs, dry, x, z, SCABLANDS_HELI.padRadius, 1.5, {road: -inputs.roadHalfWidth}), 24, towardYard);
  if (!fuelAt) throw new Error('No clear circle beside the dip tank for the fuel truck.');
  const fuel = Object.freeze({x: fuelAt.x, z: fuelAt.z, y: dry.height(fuelAt.x, fuelAt.z), radius: SCABLANDS_HELI.padRadius});
  const truckAt = searchRings(ridge, range(SCABLANDS_HELI.truckFromRidge[0], SCABLANDS_HELI.truckFromRidge[1], 25), (x, z) => {
    const fromRoad = inputs.roadDistance(x, z) - inputs.roadHalfWidth;
    return fromRoad >= 4 && fromRoad <= 25 && below(x, z) && Math.hypot(x - tank.x, z - tank.z) > 60
      && clearCircle(inputs, dry, x, z, 4, 2, {road: -inputs.roadHalfWidth});
  }, 48, towardYard + 0.5);
  if (!truckAt) throw new Error('No spot at the foot of the Ridge for Old Tam\'s pickup.');
  const truck = Object.freeze({x: truckAt.x, z: truckAt.z, y: dry.height(truckAt.x, truckAt.z), heading: towardYard});

  const flyable = scablandsFlyable(inputs);
  const burning = flyable && inputs.ridgeFire?.state === 'burning';
  // The Reservoir is dug: inside it the ground is its floor, so the bucket can sink into the water. The dip tank stands on
  // the ground, and only while the Ridge burns.
  const bodies = waterBodies(inputs, inputs.heightAt, burning ? tank : null);
  const heightAt = (x, z) => {
    for (const body of bodies) if (body.kind === 'reservoir' && body.contains(x, z)) return body.floor;
    return inputs.heightAt(x, z);
  };
  const water = (x, z) => { for (const body of bodies) if (body.contains(x, z)) return body.surface; return null; };
  const ground = createHeliGround({heightAt, obstacles: solids, water});

  // The pad: the middle of the town's Helipad. Parking, a spare spot and the crate's spot beside it, as at any pad.
  let site = null;
  if (flyable) {
    const zone = Object.freeze({x: inputs.pad.x, z: inputs.pad.z, y: ground.height(inputs.pad.x, inputs.pad.z), radius: SCABLANDS_HELI.padRadius});
    const near = (distance, offset, size, flat) => searchRings(zone, [distance], (x, z) => clearCircle(inputs, ground, x, z, size, flat, {road: -inputs.roadHalfWidth}), 16, offset);
    const parkingAt = near(SCABLANDS_HELI.parkingDistance, 0, 6, 1) ?? {x: zone.x + SCABLANDS_HELI.parkingDistance, z: zone.z};
    const spareAt = near(SCABLANDS_HELI.parkingDistance + 10, Math.PI / 8, 6, 1) ?? {x: zone.x - SCABLANDS_HELI.parkingDistance, z: zone.z};
    const crateAt = near(18, Math.PI / 16, 3, 1) ?? {x: zone.x, z: zone.z + 18};
    const spot = p => Object.freeze({x: p.x, z: p.z, y: ground.height(p.x, p.z), heading: 0});
    const {halfWidth, halfDepth} = inputs.land;
    const ceiling = Math.max(zone.y + SCABLANDS_HELI.ceilingAbove, SCABLANDS_HELI.highestGround + SCABLANDS_HELI.clearAbove);
    site = Object.freeze({courseId: SCABLANDS_ID, zone, parking: spot(parkingAt), spare: spot(spareAt), crate: spot(crateAt), carryTarget: null,
      area: Object.freeze({minX: -halfWidth, maxX: halfWidth, minZ: -halfDepth, maxZ: halfDepth, ceiling}), startY: zone.y});
  }

  // Dry scrub on the Ridge's slopes, as the fire grid's trees (low bushes: the rotor and the cargo pass over them).
  const scrub = [];
  const {inner, outer, perCell, hutClear, tankClear} = SCABLANDS_HELI.scrub;
  for (let i = Math.floor((ridge.x - outer) / FIRE.cell); i <= Math.floor((ridge.x + outer) / FIRE.cell); i++) {
    for (let j = Math.floor((ridge.z - outer) / FIRE.cell); j <= Math.floor((ridge.z + outer) / FIRE.cell); j++) {
      const x = (i + 0.5) * FIRE.cell, z = (j + 0.5) * FIRE.cell, fromRidge = Math.hypot(x - ridge.x, z - ridge.z);
      if (fromRidge < inner || fromRidge > outer || Math.hypot(x - hut.x, z - hut.z) < hutClear || Math.hypot(x - tank.x, z - tank.z) < tankClear) continue;
      if (inputs.roadDistance(x, z) < inputs.roadHalfWidth + FIRE.cell / 2) continue;
      const rng = makeRng(heliHash(inputs.seed ?? 0, 'scrub', cellId(i, j)));
      const count = rng.int(perCell[0], perCell[1]);
      for (let k = 0; k < count; k++) {
        const bx = i * FIRE.cell + rng.range(1, FIRE.cell - 1), bz = j * FIRE.cell + rng.range(1, FIRE.cell - 1);
        scrub.push(Object.freeze({x: bx, z: bz, y: inputs.heightAt(bx, bz), kind: 'tree', scrub: true}));
      }
    }
  }
  const pad = site?.zone ?? {x: 0, z: 0, y: inputs.heightAt(0, 0)};
  const course = scablandsFrame(inputs, pad, scrub);
  const grid = fireGrid(course, ground, site);
  return Object.freeze({course, ground, site, hut, tank, fuel, truck, ridge: Object.freeze({x: ridge.x, z: ridge.z}), grid,
    water: Object.freeze(bodies.map(body => Object.freeze({kind: body.kind, x: body.x, z: body.z, surface: body.surface,
      ...(body.kind === 'dipTank' ? {radius: body.radius} : {half: body.half})}))),
    scrubCount: scrub.length});
}

// The few things a course is asked, for a land that is no course: its id and name, the fire grid's seed, the "road" a fire
// stays clear of (the Scablands' own roads) and a start (the pad).
function scablandsFrame(inputs, pad, scrub) {
  const start = Object.freeze({x: pad.x, z: pad.z, y: pad.y, heading: 0, curvature: 0, tunnel: false, s: 0});
  const nearest = (x, z) => Object.freeze({x, z, y: inputs.heightAt(x, z), heading: 0, curvature: 0, tunnel: false, s: 0,
    lateral: inputs.roadDistance(x, z), distance: inputs.roadDistance(x, z)});
  return Object.freeze({def: Object.freeze({id: SCABLANDS_ID, name: SCABLANDS_HELI.name, scablands: true}), seed: FIRE.courseSeed, closed: true,
    length: 1, step: 1, samples: Object.freeze([start]), sections: Object.freeze([]),
    features: Object.freeze({obstacles: Object.freeze(scrub)}),
    phase: s => s, at: () => start, worldAt: () => start, nearest, roadHalfWidthAt: () => inputs.roadHalfWidth,
    groundAt: () => start});
}

// The Ridge fire's record: the town's saved one, else a new fire started by the fire rules' own start rule (a forest cell
// away from the roads and the pad, 250 to 1,000 m from the water, which here is the dip tank). Null when nothing burns.
export function ridgeFireRecord(world, inputs) {
  if (!world.site || inputs?.ridgeFire?.state !== 'burning') return null;
  const saved = inputs.ridgeFire.fire;
  if (saved && Array.isArray(saved.burning) && Array.isArray(saved.burnt) && saved.courseId === SCABLANDS_ID) return saved;
  const candidates = startCells(world.course, world.ground, world.grid);
  return startFire({id: 'ridge-fire', courseId: SCABLANDS_ID, grid: world.grid, seed: heliHash(inputs.seed ?? 0, 'ridge-fire'), startDay: 0, candidates});
}

// The lifts that can be done now: the pad stands, not done before, and the feed only once the Ridge fire is over.
export function openLifts(inputs) {
  if (!scablandsFlyable(inputs)) return [];
  const done = new Set(inputs.liftsDone ?? []);
  const fireOver = ['out', 'lost', 'dune'].includes(inputs.ridgeFire?.state);
  return SCABLANDS_LIFTS.filter(lift => !done.has(lift.id) && (!lift.afterFire || fireOver));
}

// ---- Scouting from the air ------------------------------------------------------------------------------------------------
// The map chunks already known, and those uncovered on this flight. step() returns the chunks newly uncovered, [{x, z}].
export function createScout({explored = [], chunkMetres = 128, land} = {}) {
  if (!(chunkMetres > 0) || !land) throw new Error('Scouting needs the chunk size and the land.');
  const known = new Set(explored.filter(c => Number.isSafeInteger(c?.x) && Number.isSafeInteger(c?.z)).map(c => `${c.x},${c.z}`));
  const limit = {x: Math.ceil(land.halfWidth / chunkMetres), z: Math.ceil(land.halfDepth / chunkMetres)};
  let under = null;
  return {
    step(heli, ground) {
      if (!heli || heli.onGround || heli.y - ground.height(heli.x, heli.z) < SCABLANDS_HELI.scoutHeight) { under = null; return []; }
      const cx = Math.floor(heli.x / chunkMetres), cz = Math.floor(heli.z / chunkMetres), key = `${cx},${cz}`;
      if (key === under) return [];
      under = key;
      const found = [], reach = SCABLANDS_HELI.scoutReach;
      for (let z = cz - reach; z <= cz + reach; z++) for (let x = cx - reach; x <= cx + reach; x++) {
        if (x < -limit.x || x >= limit.x || z < -limit.z || z >= limit.z) continue;
        const k = `${x},${z}`;
        if (!known.has(k)) { known.add(k); found.push(Object.freeze({x, z})); }
      }
      return found;
    },
    count: () => known.size,
    total: () => 4 * limit.x * limit.z,
    has: (x, z) => known.has(`${x},${z}`),
  };
}

export const scablandsShare = scout => clamp(Math.floor(100 * scout.count() / Math.max(1, scout.total())), 0, 100);

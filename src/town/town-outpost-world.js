// The neighbours' outposts placed in the Scablands for one town (TOWN-OUTPOST-SCENE). Pure: no DOM and no Three.js. The town drive reads
// it once at its start (src/town/town-world.js), so that a replay is repeatable from seed, inputs and this layout, and the job makes each
// outpost solid from it; the drawing (src/town/view/town-outposts-scene.js) is made from the same rows. It changes no job's rules.
import {LAND} from '../world/scablands-names.js';
import {ROAD_NET} from '../world/scablands-road.js';
import {IRON_LINE, nearestIronLineDistance, sampleIronLine} from '../world/iron-line.js';
import {scablandsSurfaceHeightAt} from '../world/scablands-ground.js';
import {makeRng} from '../rng.js';
import {OUTPOSTS_WORLD, OUTPOST_FENCE} from './content/outposts-world.js';
import {boxSolids, fenceRing, fenceSolid, headingToward, thingBase, thingPoint, thingSeed} from './town-world-things.js';

// The nearest point of the road net to (x, z), searched over every road's centre line.
function nearestRoadPoint(x, z, net = ROAD_NET) {
  let best = null, gap = Infinity;
  for (const road of net.roads) for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
    const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < gap) { gap = d; best = {x: px, z: pz, distance: d, roadId: road.id}; }
  }
  return best;
}

// The nearest point of the Iron Line's rail to (x, z).
function nearestRailPoint(x, z) {
  const hit = nearestIronLineDistance(IRON_LINE, {x, y: 0, z});
  const point = sampleIronLine(IRON_LINE, hit.metres);
  return {x: point.x, z: point.z, distance: Math.hypot(point.x - x, point.z - z)};
}

// Where one outpost stands and which way it faces: a plain record the drawing and the tests read.
export function placeOutpost(row, {land = LAND, heightAt = scablandsSurfaceHeightAt} = {}) {
  const at = land.at(...row.at);
  const target = row.faces === 'rail' ? nearestRailPoint(at.x, at.z) : nearestRoadPoint(at.x, at.z);
  const heading = headingToward(at.x, at.z, target.x, target.z, row.front);
  const thing = {id: row.id, x: at.x, z: at.z, heading};
  const base = thingBase(thing, row.bounds, heightAt);
  return Object.freeze({...thing, base: base.y, buried: base.buried, relief: base.relief, faces: Object.freeze({...target})});
}

// A person's or an animal's spot, in the world, on the ground or on the outpost's own floor.
function spot(outpost, [lx, lz], lift, heightAt) {
  const point = thingPoint(outpost, lx, lz);
  return Object.freeze({x: point.x, z: point.z, y: lift ? outpost.base + lift : heightAt(point.x, point.z)});
}
const yawOf = (outpost, [fx, fz]) => {
  const cos = Math.cos(outpost.heading), sin = Math.sin(outpost.heading);
  return Math.atan2(fx * cos + fz * sin, -fx * sin + fz * cos);
};

function placePeople(row, outpost, heightAt) {
  return row.people.map((person, index) => Object.freeze({
    id: `${row.id}-person-${index + 1}`, figure: person.figure, who: person.who, lift: person.lift ?? 0,
    home: spot(outpost, person.at, person.lift, heightAt), yaw: yawOf(outpost, person.look ?? [-1, 0]),
    aside: person.aside ? spot(outpost, person.aside, person.lift, heightAt) : null,
    wander: person.wander ? Object.freeze(person.wander.map(point => spot(outpost, point, person.lift, heightAt))) : null,
  }));
}

// Animals that graze an area are given seeded spots in it, from the town's seed, so a town keeps its goats where they were.
function placeAnimals(row, outpost, seed, heightAt) {
  const out = [];
  row.animals.forEach((animal, index) => {
    if (animal.wander) {
      out.push(Object.freeze({id: `${row.id}-${animal.kind}-${index + 1}`, kind: animal.kind, who: animal.who, pace: animal.pace,
        lift: animal.lift ?? 0, wander: Object.freeze(animal.wander.map(point => spot(outpost, point, animal.lift, heightAt)))}));
      return;
    }
    const rng = makeRng(thingSeed(seed, `${row.id}:${animal.kind}:${index}`)), [west, north, east, south] = animal.area;
    for (let n = 0; n < animal.count; n++) {
      // Each animal has a few spots of its own in the area and moves between them, grazing.
      const spots = [];
      for (let k = 0; k < 4; k++) spots.push(spot(outpost, [rng.range(west, east), rng.range(north, south)], animal.lift, heightAt));
      out.push(Object.freeze({id: `${row.id}-${animal.kind}-${index + 1}-${n + 1}`, kind: animal.kind, who: animal.who, pace: animal.pace,
        lift: animal.lift ?? 0, wander: Object.freeze(spots)}));
    }
  });
  return Object.freeze(out);
}

// The fence protection builds: drawn and solid only while the town protects that neighbour (src/town/town-outposts.js).
function placeFence(row, outpost, town, heightAt) {
  if (town?.outposts?.[row.neighbourId]?.protected !== true) return Object.freeze([]);
  return Object.freeze(fenceRing(outpost, row.fence.bounds ?? row.bounds, {gate: row.fence.gate, openSide: row.fence.openSide === true,
    margin: row.fence.margin ?? 3, length: 8, heightAt}));
}

// Every outpost for a town: [{id, neighbourId, name, node, x, z, heading, base, lift, people, animals, fence, solids}], and every solid.
export function townOutpostWorld(town = null, {land = LAND, heightAt = scablandsSurfaceHeightAt, rows = OUTPOSTS_WORLD} = {}) {
  const seed = Number.isFinite(town?.seed) ? town.seed : 0;
  const outposts = rows.map(row => {
    const outpost = placeOutpost(row, {land, heightAt});
    const fence = placeFence(row, outpost, town, heightAt);
    const solids = [...boxSolids(outpost, row.boxes, {base: outpost.base}),
      ...fence.map(piece => fenceSolid(piece, OUTPOST_FENCE.height))];
    return Object.freeze({...outpost, neighbourId: row.neighbourId, name: row.name, node: row.node, lift: row.lift, reach: row.reach,
      people: Object.freeze(placePeople(row, outpost, heightAt)), animals: placeAnimals(row, outpost, seed, heightAt),
      fence, protectedPlace: fence.length > 0, solids: Object.freeze(solids)});
  });
  return Object.freeze({outposts: Object.freeze(outposts), solids: Object.freeze(outposts.flatMap(outpost => outpost.solids))});
}

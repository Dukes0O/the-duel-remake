// The Bus Ring (OPEN-LOOK-BUS-RING, round 1), drawn in code: the camp of the tinkers, led by Gasket, who mend anything
// with a wheel on it for anybody, Road Rats included. Design: docs/story/open-scablands.md section 16 (its row in the
// sites table) and docs/story/threads/market-day.md (the Bus Ring and the tinkers).
//
// Seven old buses drawn up nose to tail in a ring about 31 m across, as a wall, with a gap for a gate that faces south,
// to where the Ridge spur comes down onto the salt. Two stand on stacks of sleepers, three on flat tyres, one has sunk on its outer wheels, and the
// one across the yard from the gate has had its roof cut away to make a workshop. The gaps between one bus and the next
// are shut with corrugated tin. Inside: a lathe and a bench under a canopy off the workshop bus, the parts sorted on a
// rack, a car on axle stands with its engine hanging from a chain hoist on an A-frame, a buggy's frame on trestles being
// welded with the set and its two bottles beside it, a brake-drum forge and an anvil, and a drum stove and a door on
// trestles where the tinkers eat, sitting on seats taken out of the buses.
//
// What tells it from afar: the pale roofs of the ring catching the light, the lamp on its mast over the gate, and at dusk
// the blue-white flicker of the welding, seen through the gate from the road and thrown up on the canopy and the buses.
//
// Everything is in metres from the site's centre: x to the east, z to the south, y up from the ground. The layout is a
// fixed list worked out once from a fixed seeded sequence, so it is the same on every run and its solids can be listed
// before anything is drawn. Nothing here changes race state, reads a save or reads the clock of the wall.
//
// A heading here is a three.js turn about the vertical: a thing's front (its own +z) points along (sin h, cos h) and its
// own x runs along (cos h, -sin h), which is also how src/world/scablands-solids.js reads a solid's `heading`.
//
// What this file gives the cards that place the site and use it:
//   BUS_RING_LAYOUT                 the radius, every named spot, where each thing stands
//   busRingSolids(stage)            the boxes and circles a car or a walker cannot pass
//   buildBusRing({stage, heightAt}) a THREE.Group; `heightAt(x, z)` is the ground under a point of the site, in the
//                                   group's own metres (a group stood at the site's centre with y = 0 is given the
//                                   land's own height at centre + (x, z))
//   updateBusRing(group, seconds)   the parts that move: the welding's flicker, light and sparks, the stove's smoke,
//                                   the lamps, the wear. `seconds` is the game's own clock.
//   busRingWeld(seconds)            how bright the welding arc is at a moment (0 to 1), without graphics
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear, createSparks} from '../../scrap-look.js';
import {createSmokeColumn} from '../../smoke-column.js';

export const BUS_RING_STAGES = Object.freeze(['camp']);
export const BUS_RING_BUDGET = Object.freeze({draws: 12, triangles: 60000});

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mulberry = seed => () => {
  seed = seed + 0x6d2b79f5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
// The same answer for the same whole numbers, between 0 and 1: for lumps that must not move from run to run.
const lump = (i, j, k = 0) => {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 974711)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth noise on a lattice of whole numbers, between 0 and 1: for weathering that does not come in blocks.
const noise = (x, y, k) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = smooth(x - x0), ty = smooth(y - y0), at = (i, j) => lump(x0 + i, y0 + j, k);
  return (at(0, 0) * (1 - tx) + at(1, 0) * tx) * (1 - ty) + (at(0, 1) * (1 - tx) + at(1, 1) * tx) * ty;
};
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const part of Object.values(value)) freeze(part); Object.freeze(value); }
  return value;
};

// ---- The layout -------------------------------------------------------------------------------------------------------
const RADIUS = 36;
// The wind blows towards the east-south-east, as Tin Town's chimney smoke does.
const WIND = Object.freeze({x: .94, z: .34});
// The gate faces a little west of south, to where the Ridge spur comes down off the ridge onto the pan about 700 m off:
// the carts come that way, and from there the flicker of the welding is seen through the gate.
const GATE_FACING = Object.freeze({x: -.156, z: .9878});
// The yard's own frame: its +z runs out through the gate and its +x to the right of a tinker who walks out of it.
const YARD_TURN = Math.atan2(GATE_FACING.x, GATE_FACING.z);
const yard = (x, z) => ({x: x * GATE_FACING.z + z * GATE_FACING.x, z: -x * GATE_FACING.x + z * GATE_FACING.z});
// A bus is 2.5 m wide. Its skirt is `skirt` above the ground under it, its window sills `belt` above the skirt, the
// windows `window` deep, and the roof rises `crown` above the top of the windows.
const BUS = Object.freeze({halfWidth: 1.25, belt: 1.02, window: .8, crown: .3, bonnet: 1.5});
// Round the ring from the gate's north-east post: lengths in metres over the bumpers, how each stands, and its paint.
// The fourth, across the yard from the gate, is the workshop with its roof cut away.
const BUSES = Object.freeze([
  {id: 'bus-1', length: 10.6, style: 'nose', rest: 'blocks', paint: 0},
  {id: 'bus-2', length: 11.6, style: 'flat', rest: 'wheels', paint: 1},
  {id: 'bus-3', length: 10.2, style: 'flat', rest: 'sunk', paint: 2},
  {id: 'workshop', length: 12, style: 'flat', rest: 'blocks', paint: 3, workshop: true},
  {id: 'bus-5', length: 11.2, style: 'flat', rest: 'wheels', paint: 4},
  {id: 'bus-6', length: 9.8, style: 'nose', rest: 'blocks', paint: 5},
  {id: 'bus-7', length: 11.4, style: 'flat', rest: 'wheels', paint: 2},
]);
const RING = Object.freeze({gate: 5.8, joint: 1.15});
// How each bus stands: the height of its skirt above the ground under it, and how far it leans out.
const REST = Object.freeze({wheels: {skirt: .44, lean: 0}, blocks: {skirt: .62, lean: 0}, sunk: {skirt: .38, lean: -.06}});

// The ring's radius, so that the buses, the gaps between them and the gate close the circle as chords of it.
function ringRadius() {
  const chords = [RING.gate, ...BUSES.flatMap((bus, index) => index ? [RING.joint, bus.length] : [bus.length])];
  let low = 6, high = 40;
  for (let step = 0; step < 60; step++) {
    const mid = (low + high) / 2, total = chords.reduce((sum, chord) => sum + 2 * Math.asin(chord / 2 / mid), 0);
    if (total > Math.PI * 2) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

function makeLayout() {
  const random = mulberry(0xb05e51), between = (low, high) => low + (high - low) * random();
  const spots = {}, solids = [];
  const spot = (name, at, more = {}) => { spots[name] = {x: at.x, z: at.z, ...more}; };
  const solid = (id, kind, shape, at, halfX, halfZ, heading, height) => solids.push({id: `bus-ring-${id}`, kind, shape, x: at.x, z: at.z, halfX, halfZ, heading, height});
  const round = (id, kind, at, radius, height) => solid(id, kind, 'ellipse', at, radius, radius, 0, height);
  const looksAt = (at, up) => ({x: at.x, z: at.z, y: up});
  // A point given in a turned thing's own metres (its x and z), in the site's.
  const from = (base, lx, lz) => ({x: base.x + lx * Math.cos(base.heading) + lz * Math.sin(base.heading), z: base.z - lx * Math.sin(base.heading) + lz * Math.cos(base.heading)});
  const inYard = (x, z, heading = 0) => ({...yard(x, z), heading: heading + YARD_TURN});

  // ---- The ring of buses, nose to tail, each the chord of a circle; a gap of tin between one and the next.
  const radius = ringRadius(), angle = chord => 2 * Math.asin(chord / 2 / radius), on = theta => ({x: Math.cos(theta) * radius, z: Math.sin(theta) * radius});
  const gateAngle = Math.atan2(GATE_FACING.z, GATE_FACING.x);
  let theta = gateAngle + angle(RING.gate) / 2;
  const buses = [], joints = [];
  BUSES.forEach((row, index) => {
    if (index) {
      const half = angle(RING.joint) / 2;
      joints.push({id: `joint-${index}`, angle: theta + half, x: on(theta + half).x, z: on(theta + half).z, kind: ['tin', 'tyres', 'tin', 'door', 'tin', 'tyres'][index - 1], seed: Math.floor(random() * 0x7fffffff)});
      theta += half * 2;
    }
    const a = on(theta), b = on(theta + angle(row.length));
    const bus = {...row, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, heading: Math.atan2(b.x - a.x, b.z - a.z) + between(-.025, .025),
      skirt: REST[row.rest].skirt, lean: REST[row.rest].lean + between(-.012, .012), seed: Math.floor(random() * 0x7fffffff)};
    buses.push(bus);
    theta += angle(row.length);
    solid(bus.id, 'bus', 'box', bus, BUS.halfWidth + .1, bus.length / 2 + .06, bus.heading, bus.skirt + BUS.belt + BUS.window + BUS.crown + .1);
  });
  for (const joint of joints) {
    const centre = {x: Math.cos(joint.angle) * (radius + .85), z: Math.sin(joint.angle) * (radius + .85)};
    solid(joint.id, 'wall', 'box', centre, .95, 1.05, -joint.angle, 2.3);
    if (joint.kind === 'tyres') round(`${joint.id}-tyres`, 'tyres', {x: Math.cos(joint.angle) * (radius + 2.4), z: Math.sin(joint.angle) * (radius + 2.4)}, .5, 1.2);
  }
  // The gate: a post at each side, a pole that lifts on a counterweight of tyres, and the lamp on its mast to the east.
  const gateEnds = [gateAngle - angle(RING.gate) / 2, gateAngle + angle(RING.gate) / 2].map(end => on(end));
  const gate = {x: (gateEnds[0].x + gateEnds[1].x) / 2, z: (gateEnds[0].z + gateEnds[1].z) / 2, heading: YARD_TURN, width: RING.gate,
    posts: gateEnds.map((end, index) => {
      const inward = {x: -end.x / radius, z: -end.z / radius}, along = index ? -1 : 1, tangent = {x: GATE_FACING.z * along, z: -GATE_FACING.x * along};
      return {x: end.x + inward.x * .2 - tangent.x * .45, z: end.z + inward.z * .2 - tangent.z * .45};
    })};
  // The pole pivots on the west post (to the right of a tinker walking out) and stands lifted, its tyres on the short end.
  gate.pivot = gate.posts[1];
  // The mast stands just outside the east post, and its arm reaches out over the gateway.
  gate.mast = {x: gate.posts[0].x + GATE_FACING.x * .95, z: gate.posts[0].z + GATE_FACING.z * .95, height: 5.4};
  gate.posts.forEach((post, index) => round(`gate-post-${index + 1}`, 'post', post, .14, 2.4));
  round('lamp-mast', 'post', gate.mast, .14, gate.mast.height);

  // ---- The workshop's yard under the canopy, in the workshop bus's own metres: its -x faces the yard.
  const workshop = buses.find(bus => bus.workshop), W = BUS.halfWidth;
  const canopy = {reach: 3.9, halfLength: 4.1, height: 2.55, posts: [-3.95, 3.95].map(lz => from(workshop, -W - 3.9, lz))};
  canopy.posts.forEach((post, index) => round(`canopy-post-${index + 1}`, 'post', post, .1, canopy.height));
  const bench = {...from(workshop, -W - .78, -1.35), heading: workshop.heading, length: 3, depth: .76, height: .9};
  solid('bench', 'bench', 'box', bench, bench.depth / 2 + .05, bench.length / 2 + .05, bench.heading, bench.height + .3);
  const lathe = {...from(workshop, -W - .72, 1.6), heading: workshop.heading, length: 1.9, depth: .62, height: 1.25};
  solid('lathe', 'machine', 'box', lathe, lathe.depth / 2 + .1, lathe.length / 2 + .1, lathe.heading, lathe.height);
  const rack = {...from(workshop, -W - .42, -3.55), heading: workshop.heading, length: 1.5, depth: .48, height: 1.95};
  solid('rack', 'shelves', 'box', rack, rack.depth / 2 + .04, rack.length / 2 + .04, rack.heading, rack.height);
  const inside = {lamp: {lx: .1, ly: 1.85, lz: 0}};
  spot('workbench', from(workshop, -W - 1.62, -1.35), {heading: workshop.heading + Math.PI / 2, looksAt: looksAt(bench, .95)});
  spot('gasket', from(workshop, -W - 1.62, 1.55), {heading: workshop.heading + Math.PI / 2, looksAt: looksAt(lathe, 1.05)});
  spot('shelves', from(workshop, -W - 1.5, -3.55), {heading: workshop.heading + Math.PI / 2, looksAt: looksAt(rack, 1.2)});

  // ---- The car on stands, its engine hanging from the chain hoist on its A-frame.
  const car = inYard(-5.3, -1.9, Math.PI);
  solid('car', 'car', 'box', car, .96, 2.22, car.heading, 1.55);
  const hoist = {...from(car, 0, 1.25), heading: car.heading, span: 1.62, splay: .95, height: 3.35};
  for (const side of [-1, 1]) for (const foot of [-1, 1]) round(`hoist-leg-${side < 0 ? 'west' : 'east'}-${foot < 0 ? 1 : 2}`, 'post', from(hoist, side * hoist.span, foot * hoist.splay), .13, hoist.height);
  const looseWheel = {...from(car, -2.2, -.6), heading: 0};
  round('loose-wheel', 'wheel', looseWheel, .45, .25);
  const bonnet = {...from(car, 1.95, -1.15), heading: car.heading + 1.35};
  spot('hoist', from(car, -.4, 3.25), {heading: car.heading + Math.PI, looksAt: looksAt(from(car, 0, 1.25), 1.4)});

  // ---- The welding: a buggy's frame on trestles, the set and its two bottles beside it.
  const frame = inYard(1.3, -3.6, Math.PI / 2);
  solid('buggy-frame', 'frame', 'box', frame, .72, 1.75, frame.heading, 1.35);
  const welder = inYard(3.45, -2.05, .4);
  solid('welding-set', 'machine', 'box', welder, .34, .44, welder.heading, .95);
  const bottles = inYard(3.55, -4.55, -.3);
  solid('bottles', 'bottles', 'box', bottles, .42, .38, bottles.heading, 1.6);
  const arc = {...yard(.65, -3.1), y: 1.02};
  spot('welder', yard(.55, -1.9), {heading: Math.PI + YARD_TURN, looksAt: looksAt(arc, arc.y)});

  // ---- The forge: a brake drum on legs with its blower, and the anvil on a stump.
  const forge = inYard(7.1, .7, .3), anvil = inYard(6.05, 1.95, -.5), quench = inYard(7.9, 1.95);
  round('forge', 'forge', forge, .48, 1);
  round('anvil', 'anvil', anvil, .4, .85);
  round('quench', 'drum', quench, .3, .6);
  spot('forge', yard(5.45, .55), {heading: Math.PI / 2 + YARD_TURN, looksAt: looksAt(forge, .9)});

  // ---- The stove and the table where the tinkers eat, with two bench seats out of the buses.
  const stove = inYard(-8.05, 1.1), table = inYard(-6.3, 4.45, Math.PI / 2);
  round('stove', 'stove', stove, .42, 2.9);
  solid('table', 'table', 'box', table, .46, 1.06, table.heading, .8);
  const seats = [-1, 1].map(side => ({...from(table, side * .88, 0), heading: table.heading + (side < 0 ? Math.PI : 0)}));
  seats.forEach((seat, index) => solid(`seat-${index + 1}`, 'seat', 'box', seat, .32, .88, seat.heading, .95));
  spot('table', yard(-4.55, 4.45), {heading: -Math.PI / 2 + YARD_TURN, looksAt: looksAt(table, .8)});
  spot('stove', yard(-7.1, 2.05), {heading: -Math.PI / 2 + YARD_TURN, looksAt: looksAt(stove, .7)});

  // ---- Gasket's bus: the door of the second bus, with a crate for a step.
  const home = buses[1], door = home.style === 'nose' ? home.length / 2 - BUS.bonnet - .7 : home.length / 2 - .72;
  const step = {...from(home, -W - .38, door), heading: home.heading};
  solid('step', 'step', 'box', step, .3, .45, step.heading, .3);
  spot('bunk', from(home, -W - 1.25, door), {heading: home.heading - Math.PI / 2, looksAt: looksAt(from(home, 0, door), 1.4)});

  // ---- What lies about the yard: stacks of tyres, drums, an engine block on a pallet, a heap of panels and wheels.
  const tyreStacks = [[8.6, -4.4, 5], [-2.6, 9.1, 4], [4.2, 8.8, 3], [-9.4, -4.6, 4]].map(([x, z, count], index) => ({...yard(x, z), count, seed: 30 + index * 7}));
  tyreStacks.forEach((stack, index) => round(`tyres-${index + 1}`, 'tyres', stack, .46, stack.count * .26));
  const drums = [[9.15, -1.6, false], [9.6, -.9, false], [8.9, -2.35, true], [-9, 5.6, false]].map(([x, z, lying], index) => ({...yard(x, z), lying, seed: 50 + index * 5}));
  drums.forEach((drum, index) => round(`drum-${index + 1}`, 'drum', drum, drum.lying ? .5 : .33, .9));
  const block = inYard(4.6, 5.9, .4);
  solid('engine-block', 'scrap', 'box', block, .62, .62, block.heading, .9);
  const heap = inYard(-3.1, 7.4, .8);
  round('panel-heap', 'scrap', heap, 1.05, .9);

  // ---- The spots outside: the gate, where the car stops, and a place on the approach to look from.
  spot('gate', yard(.35, 11.4), {heading: Math.PI + YARD_TURN, looksAt: looksAt(yard(.3, -5), 1.3)});
  spot('car-stop', yard(-.4, 21), {heading: Math.PI + YARD_TURN, looksAt: looksAt(arc, 1)});
  spot('lookout', yard(5.5, 29), {heading: Math.PI + YARD_TURN - .18, looksAt: looksAt({x: 0, z: 0}, 1.6)});
  // The cart tracks: two ruts come in from the road, swing to where carts stop, and go on through the gate.
  const tracks = [-1, 1].map(side => [[-3.6, 36], [-2.4, 31], [-1.2, 26], [-.4, 21.5], [-.1, 17], [.1, 13], [.2, 9.5], [-.6, 6.2], [-2.2, 3.4], [-3.4, 1.2]]
    .map(([x, z]) => yard(x + side * .78, z)));

  const lamps = [
    {id: 'gate', x: gate.mast.x - GATE_FACING.z * 1.05, z: gate.mast.z + GATE_FACING.x * 1.05, y: gate.mast.height - .55},
    {id: 'table', ...from(table, 0, .45), y: .92},
  ];
  return freeze({
    radius: RADIUS, wind: WIND, gateFacing: GATE_FACING,
    ring: {radius, gate, joints},
    buses, canopy, workshopInside: inside,
    things: {bench, lathe, rack, car, hoist, looseWheel, bonnet, frame, welder, bottles, arc, forge, anvil, quench, stove, table, seats, step, block, heap},
    tyreStacks, drums, tracks, lamps, spots, solids,
  });
}

/** The site's radius, every named spot ({x, z, heading, and a looksAt point {x, z, y} with y above the ground there}) and
 * where each thing stands, in metres from the site's centre. */
export const BUS_RING_LAYOUT = makeLayout();

/** The boxes and circles a car or a walker cannot pass, in the site's metres. */
export function busRingSolids(stage = 'camp') {
  if (!BUS_RING_STAGES.includes(stage)) throw new RangeError(`The Bus Ring has no stage called ${JSON.stringify(stage)}.`);
  return BUS_RING_LAYOUT.solids;
}

/** How bright the welding arc is at a moment, from 0 to 1. A bead is laid in a burst of one and a half to five seconds;
 * then the welder stops to chip, look and move along. While the arc is struck it flickers many times a second. */
export const BUS_RING_WELD = Object.freeze({cycle: 7, shortest: 1.6, longest: 4.8});
export function busRingWeld(seconds) {
  if (!Number.isFinite(seconds)) return 0;
  const {cycle, shortest, longest} = BUS_RING_WELD;
  const index = Math.floor(seconds / cycle), t = seconds - index * cycle;
  const start = 1.1 * lump(index, 1, 77), length = shortest + (longest - shortest) * lump(index, 2, 77);
  if (t < start || t > start + length) return 0;
  const edge = Math.min(1, (t - start) / .06, (start + length - t) / .06);
  const flick = .66 + .2 * Math.sin(seconds * 61.7) * Math.sin(seconds * 23.3 + 1.1) + .2 * (lump(Math.floor(seconds * 30), 3, 77) - .3);
  return clamp(edge * flick);
}

// ---- Drawing: the kit -------------------------------------------------------------------------------------------------
const tone = hex => new THREE.Color(hex);
let PALETTE = null;
const makePalette = () => ({
  // Faded paint: a mustard school bus, a council green, cream, oxblood, a grey-blue coach and an army olive.
  paint: [tone(0x655838), tone(0x4a5444), tone(0x7a7462), tone(0x553429), tone(0x434e55), tone(0x4b4a34)],
  // The band of a second colour along each bus's waist, faded the same way.
  livery: [tone(0x7a7462), tone(0x7a7462), tone(0x553429), tone(0x7a7462), tone(0x7a7462), tone(0x655838)],
  rust: [tone(0x5f3c2b), tone(0x6b4730), tone(0x523727)],
  roof: [tone(0xa9a496), tone(0xa09e91), tone(0xaea693), tone(0x9d9a8e)],
  tin: [tone(0x6e6b63), tone(0x7a5a3d), tone(0x605d57), tone(0x77736a), tone(0x67503a)],
  drum: [tone(0x4d5960), tone(0x5f3b30), tone(0x2f2e2b), tone(0x6e6b63), tone(0x56553d)],
  timber: [tone(0x6d6052), tone(0x55493c), tone(0x7a6e5f), tone(0x5f5244)],
  iron: tone(0x393734), tube: tone(0x6b6962), rubber: tone(0x221f1d), chrome: tone(0x86877f),
  cloth: [tone(0x6a6447), tone(0x7b725b), tone(0x585d55), tone(0x6e4a3a)],
  seat: [tone(0x5a3a31), tone(0x4a4d52), tone(0x5e5a40)],
  machine: tone(0x515d55), welder: tone(0x4c5660), oxygen: tone(0x2b2c2b), acetylene: tone(0x5a2f2b),
  glass: tone(0x1f2623), dark: tone(0x1c1b19), floor: tone(0x2c2925),
  // The ground here is the salt pan: what is carried in on boots and tyres is grey-brown dirt.
  oil: tone(0x0f0d0b), worn: tone(0x847a6c), track: tone(0x6d6254), soot: tone(0x0b0a09),
  lamp: new THREE.Color(1, .7, .36), coals: new THREE.Color(1, .38, .08),
});

// Pieces collected by material, each with its colour in its vertices, under a stack of placements, then merged: one mesh
// a material.
const ONE = new THREE.Vector3(1, 1, 1);
function assembly() {
  const lists = {sheet: [], frame: [], roof: [], glass: [], glow: [], marks: []}, stack = [new THREE.Matrix4()];
  let triangles = 0;
  const here = () => stack[stack.length - 1];
  const placed = (x, y, z, yaw = 0, pitch = 0, roll = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), ONE);
  const within = (matrix, work) => { stack.push(here().clone().multiply(matrix)); try { work(); } finally { stack.pop(); } };
  const keep = (kind, geometry, colour = null) => {
    const count = geometry.attributes.position.count;
    if (!geometry.index) geometry.setIndex([...Array(count).keys()]);
    if (kind !== 'marks') geometry.deleteAttribute('uv');
    if (colour) {
      const colours = new Float32Array(count * 3);
      for (let index = 0; index < count; index++) { colours[index * 3] = colour.r; colours[index * 3 + 1] = colour.g; colours[index * 3 + 2] = colour.b; }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    }
    geometry.applyMatrix4(here());
    geometry.computeVertexNormals();
    triangles += geometry.index.count / 3;
    lists[kind].push(geometry);
  };
  // Loose triangles, three corners each, with one colour for all.
  const faces = (kind, positions, colour) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    keep(kind, geometry, colour);
  };
  const turned = (geometry, x, y, z, turn = [0, 0, 0]) => geometry.applyMatrix4(placed(x, y, z, turn[1], turn[0], turn[2]));
  const box = (kind, w, h, d, colour, x, y, z, turn) => keep(kind, turned(new THREE.BoxGeometry(w, h, d), x, y, z, turn), colour);
  const direction = new THREE.Vector3(), forward = new THREE.Vector3(0, 0, 1), upward = new THREE.Vector3(0, 1, 0), quaternion = new THREE.Quaternion();
  // A bar of rectangular section from one point to another, and a round tube the same way.
  const bar = (kind, a, b, wide, colour, tall = wide) => {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    direction.normalize();
    const geometry = new THREE.BoxGeometry(wide, tall, length);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), quaternion.setFromUnitVectors(forward, direction), ONE));
    keep(kind, geometry, colour);
  };
  const tube = (kind, a, b, radius, colour, sides = 6, endRadius = radius) => {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    direction.normalize();
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, sides, 1, false);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), quaternion.setFromUnitVectors(upward, direction), ONE));
    keep(kind, geometry, colour);
  };
  // A bent tube or wire through a list of points.
  const line = (kind, points, radius, colour, sides = 5) => { for (let index = 1; index < points.length; index++) tube(kind, points[index - 1], points[index], radius, colour, sides); };
  // A surface through a grid of points: point(u, v) for u and v from 0 to 1. `colour` is one colour or colour(x, y, z, u, v).
  const surface = (kind, across, along, point, colour) => {
    const positions = [], colours = [], indices = [];
    for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
      const p = point(i / across, j / along);
      positions.push(...p);
      if (typeof colour === 'function') { const c = colour(p[0], p[1], p[2], i / across, j / along); colours.push(c.r, c.g, c.b); }
    }
    for (let j = 0; j < along; j++) for (let i = 0; i < across; i++) { const a = j * (across + 1) + i, b = a + 1, c = a + across + 1, d = c + 1; indices.push(a, c, b, b, c, d); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (typeof colour === 'function') geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices);
    keep(kind, geometry, typeof colour === 'function' ? null : colour);
  };
  // Corrugated sheet between four corners (two at the foot, two at the head), a rib every 0.2 m, its edges rusted ragged.
  const ribbed = (kind, p00, p10, p01, p11, colour, random, sag = 0) => {
    const a = new THREE.Vector3(...p00), b = new THREE.Vector3(...p10), c = new THREE.Vector3(...p01), d = new THREE.Vector3(...p11);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(), ribs = Math.max(2, Math.round(a.distanceTo(b) / .2));
    const positions = [], colours = [], indices = [], foot = new THREE.Vector3(), head = new THREE.Vector3(), at = new THREE.Vector3(), rows = 3;
    const seed = Math.round(random() * 100000), oxide = tone(0x6f4126);
    for (let rib = 0; rib <= ribs; rib++) {
      const u = rib / ribs, wave = rib % 2 ? .017 : -.017;
      foot.lerpVectors(a, b, u); head.lerpVectors(c, d, u);
      const fray = random() * .06, length = Math.max(.1, foot.distanceTo(head));
      for (let row = 0; row < rows; row++) {
        const v = row / (rows - 1), t = v === 0 ? fray / length : v;
        at.lerpVectors(foot, head, t).addScaledVector(normal, wave - sag * Math.sin(v * Math.PI));
        positions.push(at.x, at.y, at.z);
        const stain = lump(rib >> 1, row, seed) * .5 + lump(rib >> 2, 7, seed) * .3 + (1 - v) * .3;
        const shade = colour.clone().lerp(oxide, smooth((stain - .42) * 2.4) * .8).multiplyScalar(.74 + .32 * lump(rib, row, seed + 1));
        colours.push(shade.r, shade.g, shade.b);
      }
    }
    for (let rib = 0; rib < ribs; rib++) for (let row = 0; row < rows - 1; row++) { const e = rib * rows + row, f = e + rows; indices.push(e, f, e + 1, e + 1, f, f + 1); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices);
    keep(kind, geometry);
  };
  // A tyre stood on its tread across x (turn it to lay it down), squashed where it meets the ground when it is flat.
  const tyre = (x, y, z, turn = [0, 0, 0], radius = .5, section = .15, squash = 1, colour = PALETTE.rubber) => {
    const geometry = new THREE.TorusGeometry(radius - section, section, 6, 12);
    geometry.rotateY(Math.PI / 2);
    if (squash !== 1) {
      const points = geometry.attributes.position;
      for (let index = 0; index < points.count; index++) { const py = points.getY(index); if (py < 0) points.setY(index, py * squash); }
    }
    keep('frame', turned(geometry, x, y, z, turn), colour);
  };
  const LATHE_DRUM = [[0, 0], [.28, 0], [.29, .03], [.29, .28], [.305, .3], [.29, .32], [.29, .57], [.305, .59], [.29, .61], [.29, .86], [.27, .88], [.2, .87], [0, .87]].map(([r, h]) => new THREE.Vector2(r, h));
  const drum = (x, y, z, colour, turn = [0, 0, 0]) => keep('frame', turned(new THREE.LatheGeometry(LATHE_DRUM, 9), x, y, z, turn), colour);
  const lathe = (kind, profile, sides, colour, x, y, z, turn) => keep(kind, turned(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), sides), x, y, z, turn), colour);
  return {lists, placed, within, keep, faces, box, bar, tube, line, surface, ribbed, tyre, drum, lathe, get triangles() { return triangles; }};
}

// ---- Drawing: a bus ---------------------------------------------------------------------------------------------------
// In a bus's own metres: y up from the ground under it, the front +z, the yard to its -x. The body is built from its
// skirt, its side panels with the wheel arches cut up into them, a band of window bays between thin pillars, an arched
// roof, and its two ends. The workshop's roof is cut away down to its hoops.
function drawBus(kit, P, bus, localGround) {
  const {box, bar, tube, line, surface, ribbed, tyre, faces, lathe, within, placed} = kit;
  const random = mulberry(bus.seed), between = (low, high) => low + (high - low) * random(), pick = list => list[Math.floor(random() * list.length)];
  const W = BUS.halfWidth, half = bus.length / 2, sill = bus.skirt, belt = sill + BUS.belt, rail = belt + BUS.window, crown = rail + BUS.crown, floor = sill + .3;
  const nose = bus.style === 'nose', front = nose ? half - BUS.bonnet : half, rear = -half;
  const axles = [nose ? half - .8 : front - 2.3, rear + 2.85];
  const paint = P.paint[bus.paint], rust = P.rust[bus.seed % P.rust.length], roofColour = P.roof[bus.seed % P.roof.length];
  const door = [front - 1.2, front - .22];
  // Two knocks that pushed the panels in.
  const dents = [0, 1].map(() => ({side: random() < .5 ? -1 : 1, y: between(sill + .3, belt - .1), z: between(rear + .8, front - .8), reach: between(.5, 1), deep: between(.05, .14)}));
  // Paint faded and rusted through: worst low down, where the wet stood, in soft patches; a second colour along the waist.
  const livery = P.livery[bus.paint], band = [sill + .4, sill + .62];
  const body = (x, y, z) => {
    const patch = noise(z * .9 + 40, y * 1.4, bus.seed % 9973) * .6 + noise(z * 2.7 + 40, y * 3.9, bus.seed % 9973 + 5) * .4;
    const low = clamp(1 - (y - sill) / 1.2);
    const rusted = smooth((patch * .85 + low * .5 - .66) * 3);
    const base = y > band[0] && y < band[1] ? livery : paint;
    return base.clone().lerp(rust, rusted * .8).multiplyScalar(.84 + .22 * noise(z * 5 + 40, y * 6, bus.seed % 9973 + 3));
  };
  const archLift = z => {
    let lift = 0;
    for (const axle of nose ? [axles[1]] : axles) { const off = (z - axle) / .66; if (Math.abs(off) < 1) lift = Math.max(lift, .64 * Math.sqrt(1 - off * off)); }
    return lift;
  };
  const dent = (x, y, z) => {
    let push = 0;
    for (const hit of dents) if (Math.sign(x) === hit.side) { const off = Math.hypot(y - hit.y, z - hit.z); if (off < hit.reach) push = Math.max(push, hit.deep * smooth(1 - off / hit.reach)); }
    return x - Math.sign(x) * push;
  };

  // The side panels from the skirt to the window sills, with the arches, and the door on the yard side.
  for (const side of [-1, 1]) {
    const ranges = side < 0 ? [[rear, door[0]], [door[1], front]] : [[rear, front]];
    for (const [z0, z1] of ranges) {
      const columns = Math.max(2, Math.round((z1 - z0) / .3));
      surface('sheet', columns, 3, (u, v) => {
        const z = z0 + (z1 - z0) * u, bottom = sill + archLift(z), y = bottom + (belt - bottom) * v;
        return [dent(side * (W - .015 * Math.sin(v * Math.PI)), y, z), y, z];
      }, body);
      // The seams between the panels, and the rub rail along the side, and the sill under the windows.
      for (let seam = Math.ceil((z0 + .3) / 1.4) * 1.4; seam < z1 - .3; seam += 1.4) {
        const bottom = sill + archLift(seam);
        if (belt - bottom > .3) bar('sheet', [side * (W + .008), bottom + .03, seam], [side * (W + .008), belt - .02, seam], .018, paint.clone().multiplyScalar(.6), .03);
      }
      for (const [y, colour] of [[sill + .5, P.rust[1]], [belt, paint]]) {
        if (y === sill + .5) {
          let start = z0;
          for (const axle of nose ? [axles[1]] : axles) if (axle - .7 > start && axle - .7 < z1) { bar('sheet', [side * (W + .02), y, start + .02], [side * (W + .02), y, axle - .7], .05, colour, .07); start = axle + .7; }
          if (z1 - start > .3) bar('sheet', [side * (W + .02), y, start], [side * (W + .02), y, z1 - .02], .05, colour, .07);
        } else bar('sheet', [side * (W + .015), y, z0], [side * (W + .015), y, z1], .06, colour, .05);
      }
    }
    // The gutter at the top of the windows.
    bar('sheet', [side * (W + .01), rail, rear + .02], [side * (W + .01), rail, front - .02], .05, paint, .06);
  }
  // The door on the yard side: its leaves folded open, and the gap of the stair well.
  {
    const hinge = door[1];
    for (const leaf of [0, 1]) {
      const z = hinge - leaf * .5, swing = 1.25 - leaf * .1;
      within(placed(-W + .05, floor - .25, z, Math.PI / 2 - swing), () => {
        box('sheet', .48, belt - floor + .15, .04, paint.clone().multiplyScalar(.9), .24, (belt - floor + .15) / 2, 0);
        box('glass', .38, rail - belt - .15, .02, P.glass, .24, belt - floor + .15 + (rail - belt - .15) / 2, .02);
      });
    }
    box('frame', .1, rail - sill, .08, P.iron, -W + .02, (rail + sill) / 2, door[0]);
  }

  // The window bays. To the yard the glass is kept or gone; to the land the bays are shut with tin and boards.
  const span = front - rear - .5, bays = Math.max(6, Math.round(span / 1.05));
  for (const side of [-1, 1]) {
    let posts = [...Array(bays + 1).keys()].map(index => rear + .25 + index * span / bays);
    if (side < 0) posts = [...posts.filter(z => Math.abs(z - door[0]) > .35 && Math.abs(z - door[1]) > .25 && (z < door[0] || z > door[1])), door[0], door[1]].sort((a, b) => a - b);
    for (const z of posts) bar('sheet', [side * (W - .01), belt, z], [side * (W - .01), rail, z], .045, paint, .075);
    for (let index = 0; index < posts.length - 1; index++) {
      const z0 = posts[index], z1 = posts[index + 1];
      if (side < 0 && z0 >= door[0] - .01 && z1 <= door[1] + .01) continue;
      const roll = random(), x = side * W;
      const fill = bus.workshop ? (side < 0 ? 'empty' : roll < .75 ? 'tin' : 'board')
        : side < 0 ? (roll < .34 ? 'empty' : roll < .74 ? 'glass' : roll < .9 ? 'broken' : 'board')
          : (roll < .5 ? 'tin' : roll < .74 ? 'board' : roll < .88 ? 'glass' : 'empty');
      if (fill === 'glass' || fill === 'broken') {
        const g = side * (W - .035), y0 = belt + .04, y1 = rail - .04, a = z0 + .04, b = z1 - .04, shade = P.glass.clone().multiplyScalar(.8 + .4 * random());
        if (fill === 'glass') faces('glass', [g, y0, a, g, y0, b, g, y1, a, g, y1, a, g, y0, b, g, y1, b], shade);
        else {
          const cut = between(.3, .7);
          faces('glass', [g, y0, a, g, y0, b, g, y0 + (y1 - y0) * cut, b, g, y0, a, g, y0 + (y1 - y0) * cut, b, g, y1, a + (b - a) * (1 - cut), g, y0, a, g, y1, a + (b - a) * (1 - cut), g, y1, a], shade);
        }
      } else if (fill === 'tin') {
        const out = side * (W + .04), y0 = belt - .12 + between(-.04, .04), y1 = rail + .04 + between(-.06, .02);
        ribbed('sheet', [out, y0, z0 - .08], [out, y0 + between(-.05, .05), z1 + .08], [out, y1, z0 - .08], [out, y1, z1 + .08], pick(P.tin), random);
      } else if (fill === 'board') {
        const planks = 2 + Math.floor(random() * 2), height = (rail - belt) / planks;
        for (let plank = 0; plank < planks; plank++)
          box('frame', .03, height - .03, z1 - z0 + .12, pick(P.timber), side * (W + .035), belt + height * (plank + .5), (z0 + z1) / 2 + between(-.04, .04), [between(-.05, .05), 0, 0]);
      }
    }
  }

  // The roof: an arched sheet from gutter to gutter, pale and dirty, with hatches and what is kept on it.
  const roofY = u => rail + (crown - rail) * Math.sqrt(1 - Math.abs(2 * u - 1) ** 5);
  if (!bus.workshop) {
    const along = Math.round((front - rear) / .55), ripple = lump(bus.seed, 3, 3) * .03;
    surface('roof', 10, along, (u, v) => {
      const z = rear + .02 + (front - rear - .04) * v, x = W * (2 * u - 1) * .995;
      return [x, roofY(u) - ripple * Math.sin(v * Math.PI * 5) * (1 - Math.abs(2 * u - 1)), z];
    }, (x, y, z, u) => {
      const edge = Math.abs(2 * u - 1), streak = lump(Math.floor(z * 2.2 + 60), Math.floor(u * 6), bus.seed + 21);
      return roofColour.clone().lerp(rust, smooth((edge - .72) * 4) * .55 + smooth((streak - .8) * 5) * .35).multiplyScalar(.86 + .2 * lump(Math.floor(z * 3 + 40), Math.floor(u * 10), bus.seed + 22));
    });
    for (const z of [rear + 2.2, front - 2.6]) if (random() < .8) box('roof', .62, .08, .62, roofColour.clone().multiplyScalar(.82), between(-.15, .15), crown - .005, z, [0, between(-.1, .1), 0]);
    const keepOnRoof = random();
    if (keepOnRoof < .35) tyre(between(-.3, .3), crown + .12, between(rear + 1, front - 1), [0, 0, Math.PI / 2], .48, .15, 1);
    else if (keepOnRoof < .6) kit.drum(between(-.3, .3), crown + .25, between(rear + 1, front - 1), pick(P.tin), [0, 0, Math.PI / 2]);
  } else {
    // The workshop: the roof cut off along the gutters, its hoops left standing, a tarpaulin over the back of them.
    const hoops = [rear + .3, rear + 2.2, rear + 4.1, rear + 6, rear + 7.9, front - .3];
    for (const z of hoops) line('frame', [...Array(9).keys()].map(index => { const u = index / 8; return [W * (2 * u - 1), roofY(u) - .03, z + (index % 2 ? .01 : 0)]; }), .028, P.tube);
    for (const side of [-1, 1]) bar('frame', [side * W, rail + .02, rear], [side * W, rail + .02, front], .06, P.iron, .05);
    const tarp = P.cloth[1];
    surface('sheet', 8, 6, (u, v) => {
      const z = hoops[0] + (hoops[2] - hoops[0] + .3) * v, sag = .12 * Math.sin(v * Math.PI * 2) ** 2;
      return [W * (2 * u - 1) * 1.02, roofY(u) + .015 - sag * (1 - Math.abs(2 * u - 1)) + (u < .02 || u > .98 ? -.25 : 0), z];
    }, (x, y, z, u, v) => tarp.clone().multiplyScalar(.78 + .3 * lump(Math.floor(u * 8), Math.floor(v * 6), 5)));
    // Inside: a long shelf of tins along the wall to the land, and the lamp hung from a hoop.
    for (let index = 0; index < 9; index++) {
      const z = rear + 1.3 + index * .95;
      box('frame', .44, .04, .9, P.timber[1], W - .3, belt + .05, z);
      for (let tin = 0; tin < 3; tin++) lathe('frame', [[0, 0], [.07, 0], [.07, .16], [0, .16]], 6, pick(P.tin), W - .3 + between(-.12, .12), belt + .07, z + (tin - 1) * .27, [0, 0, 0]);
    }
    box('frame', .7, .9, 2.2, P.timber[2], W - .5, floor + .45, -1.5);
  }
  // The roof's ends, and the gap between the roof and the gutters at each end, filled.
  const cap = (z, colour) => {
    const positions = [];
    for (let index = 0; index < 10; index++) {
      const u0 = index / 10, u1 = (index + 1) / 10;
      positions.push(0, rail, z, W * (2 * u1 - 1), roofY(u1), z, W * (2 * u0 - 1), roofY(u0), z);
    }
    faces('sheet', positions, colour);
  };

  // The front.
  {
    const z = front;
    surface('sheet', 4, 2, (u, v) => [W * (2 * u - 1), sill + (belt - sill) * v, z + .02 * Math.sin(u * Math.PI)], body);
    if (!bus.workshop) cap(z, paint.clone().multiplyScalar(.92)); else cap(z, P.tin[0]);
    box('glass', 1.5, .2, .02, P.dark, 0, rail + .16, z + .01);
    for (const x of [-W + .03, 0, W - .03]) bar('sheet', [x, belt, z], [x * .985, rail, z - .06], .07, paint, .06);
    const missing = random() < .4 ? (random() < .5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) if (side !== missing) {
      const a = side * .05, b = side * (W - .07);
      faces('glass', [a, belt + .05, z, b, belt + .05, z, a, rail - .05, z - .055, a, rail - .05, z - .055, b, belt + .05, z, b, rail - .05, z - .055], P.glass);
    }
    if (!nose) {
      box('frame', W * 2 + .08, .2, .14, P.iron, 0, sill + .1, z + .08, [0, 0, between(-.03, .03)]);
      for (const side of [-1, 1]) tube('frame', [side * (W - .32), sill + .42, z - .02], [side * (W - .32), sill + .42, z + .05], .1, P.dark, 8);
      for (let index = 0; index < 4; index++) bar('frame', [-.55, sill + .18 + index * .07, z + .03], [.55, sill + .18 + index * .07, z + .03], .03, P.iron, .03);
    }
  }
  // The bonnet of a school bus: a rounded hood between the wings, a grille, and the wings over the front wheels.
  if (nose) {
    const hood = belt - .12, tip = half - .12;
    surface('sheet', 6, 3, (u, v) => {
      const x = (2 * u - 1) * .82, z = front + (tip - front) * v;
      return [x, hood + .1 * (1 - (2 * u - 1) ** 2) - .08 * v * v, z];
    }, body);
    for (const side of [-1, 1]) surface('sheet', 1, 3, (u, v) => [side * .82, hood - .4 * u, front + (tip - front) * v], body);
    box('frame', 1.5, hood - sill - .2, .06, P.iron, 0, sill + .15 + (hood - sill - .2) / 2, tip + .02);
    for (let index = 0; index < 7; index++) bar('frame', [-.62 + index * .2, sill + .25, tip + .06], [-.62 + index * .2, hood - .08, tip + .06], .03, P.chrome, .03);
    for (const side of [-1, 1]) {
      const wing = new THREE.CylinderGeometry(.62, .62, .48, 9, 1, true, 0, Math.PI);
      wing.rotateZ(Math.PI / 2);
      kit.keep('sheet', wing.applyMatrix4(placed(side * (W - .24), sill + .1, axles[0])), paint.clone().lerp(rust, .3));
      tube('frame', [side * (W - .4), hood - .08, tip - .05], [side * (W - .4), hood - .08, tip + .08], .11, P.dark, 8);
    }
    box('frame', W * 2 + .06, .18, .14, P.iron, 0, sill + .12, half - .04);
  }
  // The back: a panel from the skirt to the gutters, the back window kept or shut with tin, the engine's grille.
  {
    const z = rear;
    surface('sheet', 4, 4, (u, v) => [W * (2 * u - 1), sill + (rail - sill) * v, z - .015 * Math.sin(u * Math.PI)], body);
    cap(z, bus.workshop ? P.tin[0] : paint.clone().multiplyScalar(.92));
    if (random() < .55) faces('glass', [-W + .35, belt + .12, z - .02, W - .35, belt + .12, z - .02, -W + .35, rail - .08, z - .02, -W + .35, rail - .08, z - .02, W - .35, belt + .12, z - .02, W - .35, rail - .08, z - .02], P.glass);
    else ribbed('sheet', [-W + .3, belt + .08, z - .04], [W - .3, belt + .08, z - .04], [-W + .3, rail - .04, z - .04], [W - .3, rail - .04, z - .04], pick(P.tin), random);
    for (let index = 0; index < 5; index++) bar('frame', [-.7, sill + .2 + index * .09, z - .03], [.7, sill + .2 + index * .09, z - .03], .035, P.iron, .03);
    // The corners are rounded by a strip, and the lamps are dull red glass or empty sockets.
    for (const side of [-1, 1]) {
      bar('sheet', [side * (W - .02), sill + .02, z - .02], [side * (W - .02), rail, z - .02], .07, paint.clone().multiplyScalar(.7), .07);
      box(random() < .6 ? 'glass' : 'frame', .14, .24, .03, random() < .6 ? tone(0x4a1c16) : P.dark, side * (W - .22), sill + .78, z - .03);
    }
    box('frame', W * 2 + .08, .2, .14, P.iron, 0, sill + .1, z - .08, [0, 0, between(-.03, .03)]);
    if (random() < .5) {
      for (const x of [.45, .85]) bar('frame', [x, sill + .35, z - .07], [x, crown - .05, z - .07], .035, P.tube, .035);
      for (let rung = 0; rung < 7; rung++) bar('frame', [.45, sill + .5 + rung * .3, z - .07], [.85, sill + .5 + rung * .3, z - .07], .03, P.tube, .03);
    }
  }
  // Inside: the floor, and some of the seats still in their rows.
  box('frame', W * 2 - .1, .05, front - rear - .2, P.floor, 0, floor, (front + rear) / 2);
  if (!bus.workshop) for (let index = 0; index < 5; index++) {
    const z = rear + 1.6 + index * (front - rear - 3.2) / 4, colour = pick(P.seat);
    for (const side of [-1, 1]) if (random() < .6) {
      box('frame', .85, .5, .09, colour, side * (W - .55), floor + .62, z, [-.2, 0, 0]);
      box('frame', .85, .1, .42, colour, side * (W - .55), floor + .42, z + .22);
    }
  }

  // Underneath: the chassis rails, the axles with their drums, the fuel tank and the exhaust.
  const under = sill - .1;
  for (const side of [-1, 1]) bar('frame', [side * .55, under, rear + .4], [side * .55, under, (nose ? half : front) - .35], .1, P.iron, .16);
  for (const axle of axles) {
    tube('frame', [-W + .3, sill + .04, axle], [W - .3, sill + .04, axle], .06, P.iron, 6);
    for (const side of [-1, 1]) tube('frame', [side * (W - .45), sill + .04, axle], [side * (W - .25), sill + .04, axle], .2, P.iron, 9);
  }
  box('frame', .5, .38, 1.1, P.iron, W - .55, sill - .05, (axles[0] + axles[1]) / 2 + .6);
  tube('frame', [-.3, under - .02, axles[1] + .6], [-.4, under, rear + .2], .045, P.rust[2], 5);

  // How it stands: on its tyres, or on stacks of sleepers under the axles. The stack's foot is the ground under it.
  if (bus.rest === 'blocks') {
    for (const axle of axles) for (const side of [-1, 1]) {
      const x = side * .55, foot = localGround(x, axle), top = under - .08, layers = Math.max(1, Math.ceil((top - foot) / .14));
      for (let layer = 0; layer < layers; layer++) {
        const y = foot + (top - foot) * (layer + .5) / layers, across = layer % 2 === 0, shade = pick(P.timber);
        for (const offset of [-.2, .2]) box('frame', across ? .95 : .2, (top - foot) / layers - .01, across ? .2 : .95, shade,
          x + (across ? between(-.05, .05) : offset), y, axle + (across ? offset : between(-.05, .05)), [0, between(-.08, .08), 0]);
      }
    }
  } else {
    for (const axle of axles) for (const side of [-1, 1]) {
      const flat = bus.rest === 'sunk' && side > 0 ? .6 : .8 + .15 * random(), foot = localGround(side * (W - .3), axle), centre = foot + .5 * flat - .02;
      tyre(side * (W - .3), centre, axle, [0, 0, 0], .5, .16, flat);
      tube('frame', [side * (W - .4), centre, axle], [side * (W - .2), centre, axle], .26, P.iron, 9);
    }
  }
}

// ---- Drawing: the car on stands -------------------------------------------------------------------------------------
// A saloon with its bonnet off and its engine out, its front on axle stands and its back on its tyres. Front +z.
function drawCar(kit, P) {
  const {surface, bar, tube, box, tyre, faces} = kit;
  const half = .86, nose = 2.15, belt = .92, roof = 1.4, sill = .34, scuttle = .78, rear = -1.1, arch = .4, axles = [1.35, -1.38];
  const paint = P.paint[3].clone().lerp(P.rust[0], .3), rust = P.rust[2];
  const colour = (x, y, z) => paint.clone().lerp(rust, smooth((lump(Math.floor(z * 2 + 20), Math.floor(y * 3), 71) + (1 - y) * .5 - .7) * 3)).multiplyScalar(.82 + .25 * lump(Math.floor(z * 4 + 20), Math.floor(y * 4), 72));
  const archLift = z => { let lift = 0; for (const axle of axles) { const off = (z - axle) / arch; if (Math.abs(off) < 1) lift = Math.max(lift, .38 * Math.sqrt(1 - off * off)); } return lift; };
  for (const side of [-1, 1]) {
    surface('sheet', 16, 2, (u, v) => {
      const z = -nose + 2 * nose * u, end = smooth((Math.abs(z) - (nose - .45)) / .45), bottom = sill + archLift(z) + end * .08, y = bottom + (belt - end * .1 - bottom) * v;
      return [side * half * (1 - .12 * end) * (1 - .04 * v), y, z];
    }, colour);
  }
  // The scuttle, the boot lid and the two ends.
  surface('sheet', 4, 2, (u, v) => [half * (2 * u - 1) * .96, belt + .02 * Math.sin(u * Math.PI), scuttle + .12 * v], colour);
  surface('sheet', 4, 3, (u, v) => [half * (2 * u - 1) * .94, belt - .04 * v, rear - (nose - .1 + rear) * v], colour);
  for (const [z, w] of [[nose, .86], [-nose, .88]]) surface('sheet', 3, 1, (u, v) => [half * w * (2 * u - 1), sill + .1 + (belt - .2 - sill) * v, z], colour);
  // The cabin: thin pillars, a dished roof, and the back window.
  const roofAt = (x, z) => roof - .03 * (x / half) ** 2 - .04 * Math.sin((z - rear) / (scuttle - .4 - rear) * Math.PI);
  surface('sheet', 3, 3, (u, v) => { const x = (2 * u - 1) * half * .8, z = scuttle - .42 + (rear + .3 - (scuttle - .42)) * v; return [x, roofAt(x, z), z]; }, colour);
  for (const side of [-1, 1]) {
    bar('sheet', [side * half * .9, belt, scuttle], [side * half * .8, roof - .02, scuttle - .42], .05, paint, .07);
    bar('sheet', [side * half * .9, belt, -.15], [side * half * .8, roof - .02, -.15], .05, paint, .07);
    bar('sheet', [side * half * .9, belt, rear], [side * half * .8, roof - .02, rear + .3], .08, paint, .11);
  }
  faces('glass', [-half * .78, belt + .04, rear - .02, half * .78, belt + .04, rear - .02, -half * .7, roof - .06, rear + .28, -half * .7, roof - .06, rear + .28, half * .78, belt + .04, rear - .02, half * .7, roof - .06, rear + .28], P.glass);
  // The empty engine bay: its floor, the inner wings and the radiator gone, wires hanging.
  box('frame', half * 1.5, .05, nose - scuttle - .25, P.dark, 0, sill + .3, (nose + scuttle) / 2);
  for (const side of [-1, 1]) box('frame', .05, .35, nose - scuttle - .3, P.dark, side * .5, sill + .5, (nose + scuttle) / 2);
  for (let index = 0; index < 3; index++) kit.line('frame', [[-.3 + index * .25, belt - .05, scuttle + .1], [-.25 + index * .2, belt - .35, scuttle + .4 + index * .1], [-.2 + index * .3, sill + .45, scuttle + .6]], .01, index ? P.rust[2] : P.dark, 3);
  // The rails under it, the back axle on its tyres, the front hubs bare.
  for (const side of [-1, 1]) bar('frame', [side * .5, sill + .02, nose - .4], [side * .5, sill + .02, -nose + .4], .07, P.iron, .1);
  for (const side of [-1, 1]) {
    tyre(side * (half - .12), .3, axles[1], [0, 0, 0], .3, .1, .85);
    tube('frame', [side * (half - .3), sill + .02, axles[0]], [side * (half - .14), sill + .02, axles[0]], .13, P.iron, 8);
  }
  bar('frame', [-.8, .22, nose + .05], [.8, .22, nose + .05], .1, P.chrome.clone().multiplyScalar(.7), .12);
  bar('frame', [-.8, .24, -nose - .05], [.8, .24, -nose - .05], .1, P.iron, .12);
}

// ---- Drawing: the textures made in code -------------------------------------------------------------------------------
const softNoise = (x, y, size, cells, k) => {
  const fx = x / size * cells, fy = y / size * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0), at = (i, j) => lump((x0 + i) % cells, (y0 + j) % cells, k);
  return (at(0, 0) * (1 - tx) + at(1, 0) * tx) * (1 - ty) + (at(0, 1) * (1 - tx) + at(1, 1) * tx) * ty;
};
// Four pictures in one for what lies on the ground, white with their shape in the alpha: a spill with a ragged edge, a
// length of rut, a ring of scorch, and a soft round patch for worn ground.
const MARK = Object.freeze({spill: [0, 0], track: [1, 0], scorch: [0, 1], soft: [1, 1]});
function groundMarks() {
  const cell = 64, size = cell * 2, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const cx = x < cell ? 0 : 1, cy = y < cell ? 0 : 1, u = (x - cx * cell + .5) / cell, v = (y - cy * cell + .5) / cell, far = Math.hypot(u - .5, v - .5) * 2, angle = Math.atan2(v - .5, u - .5);
    const ragged = .66 + .1 * Math.sin(angle * 3 + 1) + .06 * Math.sin(angle * 5 + 2.2) + .05 * Math.sin(angle * 9 + .4) + .12 * (softNoise(x, y, size, 10, 3) - .5);
    const blotch = softNoise(x, y, size, 14, 4) * .65 + softNoise(x, y, size, 34, 8) * .35;
    let alpha;
    if (cx === 0 && cy === 0) alpha = smooth((ragged - far) / .34) * (.45 + .75 * blotch);
    else if (cx === 1 && cy === 0) alpha = (1 - smooth((Math.abs(u - .5) * 2 - .25) / .7)) * (.34 + .65 * blotch);
    else if (cx === 0 && cy === 1) alpha = smooth((ragged + .25 - far) / .5) * (.3 + .7 * smooth(far / .45)) * (.5 + .7 * blotch);
    else alpha = smooth((ragged + .2 - far) / .6) * (.4 + .6 * blotch);
    const index = (y * size + x) * 4;
    data[index] = data[index + 1] = data[index + 2] = 255;
    data[index + 3] = Math.round(clamp(alpha) * 255);
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}

// The flash of the welding and the halo of the lamps: soft cards that face the viewer, added to the picture's light, in
// one draw. Each card has its foot, its size, which light it belongs to (0 the arc, 1 the lamps), its strength, and the
// least angle it covers however far off it is seen.
function createFlashes(cards) {
  const positions = [], uvs = [], feet = [], kinds = [], indices = [];
  cards.forEach((card, index) => {
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { positions.push((u - .5) * card.size, (v - .5) * card.size, 0); uvs.push(u, v); feet.push(card.x, card.y, card.z); kinds.push(card.kind, card.strength, card.least ?? 0); }
    indices.push(index * 4, index * 4 + 1, index * 4 + 2, index * 4 + 1, index * 4 + 3, index * 4 + 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aFoot', new THREE.Float32BufferAttribute(feet, 3));
  geometry.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 3));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: {uWeld: {value: 0}, uLamp: {value: 1}},
    vertexShader: `
      attribute vec3 aFoot;attribute vec3 aKind;varying vec2 vUv;varying vec2 vKind;
      void main(){
        vUv=uv;vKind=aKind.xy;
        vec4 mv=modelViewMatrix*vec4(aFoot,1.0);
        // A card never shrinks below its least angle, so that a spark of light still shows from far off.
        float size=length(position.xy)*1.4142;
        mv.xy+=position.xy*max(1.0,-mv.z*aKind.z/max(size,.001));
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `
      uniform float uWeld;uniform float uLamp;varying vec2 vUv;varying vec2 vKind;
      void main(){
        float d=length(vUv-.5)*2.0;
        float glow=pow(max(0.0,1.0-d),2.6)*vKind.y;
        float core=pow(max(0.0,1.0-d*2.2),3.0)*vKind.y;
        vec3 arc=vec3(.72,.84,1.0)*(glow*1.3+core*2.5)*uWeld;
        vec3 lamp=vec3(1.0,.66,.32)*(glow+core*1.4)*uLamp;
        vec3 colour=mix(arc,lamp,step(.5,vKind.x));
        gl_FragColor=vec4(colour,clamp(max(colour.r,colour.b),0.0,1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

// ---- Drawing: the whole site ------------------------------------------------------------------------------------------
export function buildBusRing({stage = 'camp', heightAt = null} = {}) {
  if (!BUS_RING_STAGES.includes(stage)) throw new RangeError(`The Bus Ring has no stage called ${JSON.stringify(stage)}.`);
  PALETTE ??= makePalette();
  const P = PALETTE, L = BUS_RING_LAYOUT, ground = heightAt ?? (() => 0), W = BUS.halfWidth;
  const random = mulberry(0x7105e4), between = (low, high) => low + (high - low) * random(), pick = list => list[Math.floor(random() * list.length)];
  const group = new THREE.Group();
  group.name = 'The Bus Ring';
  const kit = assembly(), {within, placed, box, bar, tube, line, surface, ribbed, tyre, drum, lathe, keep} = kit;
  const on = (at, work, lift = 0) => within(placed(at.x, ground(at.x, at.z) + lift, at.z, at.heading ?? 0), work);
  const from = (base, lx, lz) => ({x: base.x + lx * Math.cos(base.heading) + lz * Math.sin(base.heading), z: base.z - lx * Math.sin(base.heading) + lz * Math.cos(base.heading)});

  // ---- The buses. Each is tipped to lie on the ground under its four wheels.
  const poses = new Map();
  for (const bus of L.buses) {
    const half = BUS.halfWidth - .3, nose = bus.style === 'nose', front = nose ? bus.length / 2 - .8 : bus.length / 2 - 2.3, back = -bus.length / 2 + 2.85;
    const g = (lx, lz) => { const at = from(bus, lx, lz); return ground(at.x, at.z); };
    const yFront = (g(-half, front) + g(half, front)) / 2, yBack = (g(-half, back) + g(half, back)) / 2;
    const yIn = (g(-half, front) + g(-half, back)) / 2, yOut = (g(half, front) + g(half, back)) / 2;
    const slope = (yFront - yBack) / (front - back), tilt = (yOut - yIn) / (half * 2), base = yBack - back * slope;
    const matrix = placed(bus.x, base, bus.z, bus.heading, -Math.atan(slope), Math.atan(tilt) + bus.lean);
    poses.set(bus.id, matrix);
    within(matrix, () => drawBus(kit, P, bus, (lx, lz) => g(lx, lz) - (base + lz * slope + lx * (tilt + bus.lean))));
  }
  const busPoint = (bus, lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(poses.get(bus.id));

  // ---- The gaps between the buses, shut with tin on posts, with tyres or an old door to make them good.
  for (const joint of L.ring.joints) {
    const r = L.ring.radius, out = {x: Math.cos(joint.angle), z: Math.sin(joint.angle)}, along = {x: -out.z, z: out.x}, jr = mulberry(joint.seed);
    const at = (radial, tangent) => ({x: out.x * radial + along.x * tangent, z: out.z * radial + along.z * tangent});
    const corners = [-1.08, 1.08].map(t => at(r + .95 + jr() * .1, t));
    const top = 2.15 + jr() * .25;
    ribbed('sheet', [corners[0].x, ground(corners[0].x, corners[0].z) + .02, corners[0].z], [corners[1].x, ground(corners[1].x, corners[1].z) + .02, corners[1].z],
      [corners[0].x + out.x * .08, ground(corners[0].x, corners[0].z) + top, corners[0].z + out.z * .08], [corners[1].x + out.x * .05, ground(corners[1].x, corners[1].z) + top - .12, corners[1].z + out.z * .05], pick(P.tin), jr, .03);
    for (const corner of corners) tube('frame', [corner.x - out.x * .06, ground(corner.x, corner.z) - .1, corner.z - out.z * .06], [corner.x - out.x * .04, ground(corner.x, corner.z) + top + .1, corner.z - out.z * .04], .045, P.tube, 5);
    for (const y of [.5, top - .3]) bar('frame', [corners[0].x - out.x * .08, ground(corners[0].x, corners[0].z) + y, corners[0].z - out.z * .08], [corners[1].x - out.x * .08, ground(corners[1].x, corners[1].z) + y, corners[1].z - out.z * .08], .05, P.timber[1], .09);
    if (joint.kind === 'tyres') {
      const stack = at(r + 2.4, .05);
      for (let index = 0; index < 5; index++) tyre(stack.x + (jr() - .5) * .08, ground(stack.x, stack.z) + .13 + index * .26, stack.z + (jr() - .5) * .08, [0, jr() * 3, Math.PI / 2], .46, .14, 1);
    } else if (joint.kind === 'door') {
      const door = at(r + 1.1, -.1);
      within(placed(door.x, ground(door.x, door.z) + .55, door.z, -joint.angle + Math.PI / 2, 0, .06), () => {
        surface('sheet', 2, 2, (u, v) => [(u - .5) * 1.05, (v - .5) * 1.0, .015 * Math.sin(v * Math.PI)], P.paint[4].clone().lerp(P.rust[0], .4));
        box('glass', .7, .36, .02, P.glass, .05, .22, .02);
      });
    }
  }

  // ---- The gate: two posts, the pole up on its tyres, and the lamp on its mast.
  {
    const gate = L.ring.gate;
    for (const post of gate.posts) {
      tube('frame', [post.x, ground(post.x, post.z) - .2, post.z], [post.x + .02, ground(post.x, post.z) + 2.4, post.z - .01], .07, P.tube, 7);
      tyre(post.x, ground(post.x, post.z) + .1, post.z, [0, 0, Math.PI / 2], .46, .14, 1);
      tyre(post.x, ground(post.x, post.z) + .31, post.z, [0, 1, Math.PI / 2], .46, .14, 1);
    }
    // The pole pivots on the west post, lifted towards the east one, with three tyres threaded on its short end for a weight.
    const pivot = gate.pivot, py = ground(pivot.x, pivot.z) + 1.5, lift = 1.05, inward = {x: -GATE_FACING.x * .15, z: -GATE_FACING.z * .15};
    const apart = Math.hypot(gate.posts[0].x - pivot.x, gate.posts[0].z - pivot.z), across = {x: (gate.posts[0].x - pivot.x) / apart, z: (gate.posts[0].z - pivot.z) / apart};
    const hinge = [pivot.x + inward.x, py, pivot.z + inward.z];
    const along = t => [hinge[0] + across.x * Math.cos(lift) * t, py + Math.sin(lift) * t, hinge[2] + across.z * Math.cos(lift) * t];
    tube('frame', along(-1.15), hinge, .06, P.timber[2], 6);
    // Painted bands, faded, to see it by.
    for (let band = 0; band < 6; band++) tube('frame', along(band), along(band + 1), .055 - .004 * band, band % 2 ? P.rust[0] : P.roof[0].clone().multiplyScalar(.85), 6);
    const pole = new THREE.Vector3(across.x * Math.cos(lift), Math.sin(lift), across.z * Math.cos(lift)).normalize();
    for (let index = 0; index < 3; index++) {
      const at = along(-1.05 + index * .2), ring = new THREE.TorusGeometry(.26, .11, 6, 12);
      ring.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pole), new THREE.Vector3(1, 1, 1)));
      keep('frame', ring, P.rubber);
    }
    // The post the pole turns on, and a chain to hold it down when it is shut.
    tube('frame', [pivot.x, py - .2, pivot.z], [pivot.x, py + .12, pivot.z], .09, P.iron, 7);
    line('frame', [along(-1.1), [along(-1.1)[0], ground(pivot.x, pivot.z) + .3, along(-1.1)[2]]], .012, P.iron, 3);
    const mast = gate.mast, my = ground(mast.x, mast.z), top = [mast.x + .06, my + mast.height, mast.z - .04];
    tube('frame', [mast.x, my - .3, mast.z], top, .07, P.tube, 7, .05);
    const lamp = L.lamps.find(row => row.id === 'gate');
    const arm = [lamp.x, my + mast.height - .12, lamp.z];
    tube('frame', top, arm, .03, P.tube, 5);
    bar('frame', [top[0], top[1] - .7, top[2]], [(top[0] + arm[0]) / 2, arm[1] - .02, (top[2] + arm[2]) / 2], .03, P.tube);
    line('frame', [arm, [lamp.x, my + lamp.y + .32, lamp.z]], .008, P.iron, 3);
    lathe('frame', [[.02, .35], [.1, .3], [.22, .12], [.24, .06]], 8, P.iron, lamp.x, my + lamp.y - .02, lamp.z);
    keep('glow', new THREE.SphereGeometry(.08, 7, 5).translate(lamp.x, my + lamp.y + .02, lamp.z), P.lamp);
    for (const [dx, dz] of [[1.7, .8], [-1.4, 1.2], [.2, -1.8]]) line('frame', [[top[0], top[1] - .3, top[2]], [mast.x + dx, ground(mast.x + dx, mast.z + dz) + .05, mast.z + dz]], .006, P.iron, 3);
  }

  // ---- The canopy off the workshop's yard side: a patched tarpaulin from its gutter to two poles.
  const workshop = L.buses.find(bus => bus.workshop), canopy = L.canopy;
  {
    const rail = workshop.skirt + BUS.belt + BUS.window;
    const posts = canopy.posts.map(post => [post.x, ground(post.x, post.z), post.z]);
    for (const post of posts) tube('frame', post, [post[0], post[1] + canopy.height + .1, post[2]], .05, P.tube, 6);
    const edge = [-canopy.halfLength, canopy.halfLength].map(lz => busPoint(workshop, -W - .02, rail - .04, lz));
    const outer = posts.map(post => new THREE.Vector3(post[0], post[1] + canopy.height, post[2]));
    const cloth = P.cloth[0];
    const at = (u, v) => {
      const inner = new THREE.Vector3().lerpVectors(edge[0], edge[1], v), out = new THREE.Vector3().lerpVectors(outer[0], outer[1], v), p = inner.lerp(out, u);
      p.y -= .22 * Math.sin(u * Math.PI) * (.6 + .4 * Math.sin(v * Math.PI * 3) ** 2) + .03 * Math.sin(v * 17);
      return [p.x, p.y, p.z];
    };
    surface('sheet', 6, 10, at, (x, y, z, u, v) => cloth.clone().lerp(P.cloth[3], smooth((lump(Math.floor(u * 3), Math.floor(v * 4), 15) - .7) * 6)).multiplyScalar(.75 + .3 * lump(Math.floor(u * 6), Math.floor(v * 10), 16)));
    // A patch sewn over a tear, and the edge rolled round a pole between the posts.
    const patch = (u, v) => { const p = at(.3 + u * .3, .55 + v * .2); return [p[0], p[1] + .03, p[2]]; };
    surface('sheet', 2, 2, patch, P.cloth[2]);
    line('frame', outer.map(p => [p.x, p.y + .02, p.z]), .035, P.timber[0], 5);
    for (const [index, post] of posts.entries()) {
      const outward = from(workshop, -W - 5.4, (index ? 1 : -1) * 4.6);
      line('frame', [[post[0], post[1] + canopy.height, post[2]], [outward.x, ground(outward.x, outward.z) + .05, outward.z]], .007, P.cloth[1], 3);
    }
  }

  // ---- The bench, its vice and its tools.
  const T = L.things;
  on(T.bench, () => {
    const {length, depth, height} = T.bench;
    box('frame', depth, .06, length, P.timber[0], 0, height, 0, [0, 0, .01]);
    box('frame', depth - .1, .03, length - .2, P.timber[3], .02, .25, 0);
    for (const x of [-1, 1]) for (const z of [-1, 1]) bar('frame', [x * (depth / 2 - .05), 0, z * (length / 2 - .06)], [x * (depth / 2 - .05), height - .03, z * (length / 2 - .06)], .05, P.iron, .05);
    box('frame', .22, .14, .16, P.machine, -.18, height + .1, length / 2 - .25);
    box('frame', .08, .12, .2, P.machine, -.33, height + .12, length / 2 - .25);
    bar('frame', [-.42, height + .1, length / 2 - .4], [-.42, height + .1, length / 2 - .1], .02, P.chrome);
    for (let index = 0; index < 6; index++) box('frame', .12 + random() * .15, .05 + random() * .08, .1 + random() * .2, pick([P.iron, P.machine, P.rust[1], P.timber[2]]), between(-.2, .2), height + .06, between(-1.2, .9), [0, between(-1, 1), 0]);
    lathe('frame', [[0, 0], [.16, 0], [.16, .04], [.05, .04], [.05, .1], [0, .1]], 10, P.rust[0], .15, height + .03, -.7);
    // A pegboard of tools on the bus behind the bench.
    box('frame', .03, .7, 2.2, P.timber[2], .44, 1.5, 0);
    for (let index = 0; index < 9; index++) bar('frame', [.41, 1.3 + random() * .35, -.95 + index * .24], [.41, 1.55 + random() * .3, -.95 + index * .24 + between(-.05, .05)], .025, pick([P.iron, P.chrome, P.rust[2]]));
  });
  // ---- The lathe: its cabinet, the bed, the headstock with its chuck, the tailstock and the carriage, and the motor.
  on(T.lathe, () => {
    const {length} = T.lathe, bedY = .86;
    box('frame', .55, .78, length - .1, P.machine.clone().multiplyScalar(.8), 0, .39, 0);
    for (const x of [-.09, .09]) box('frame', .08, .12, length, P.machine, x, bedY, 0);
    box('frame', .34, .36, .4, P.machine, 0, bedY + .2, -length / 2 + .22);
    tube('frame', [0, bedY + .24, -length / 2 + .42], [0, bedY + .24, -length / 2 + .52], .1, P.chrome, 10);
    box('frame', .22, .22, .24, P.machine, 0, bedY + .16, length / 2 - .2);
    tube('frame', [0, bedY + .2, length / 2 - .32], [0, bedY + .2, length / 2 - .5], .025, P.chrome, 6);
    box('frame', .3, .1, .26, P.machine.clone().multiplyScalar(.85), 0, bedY + .11, .1);
    tube('frame', [.15, bedY + .1, .1], [.32, bedY + .1, .1], .015, P.chrome, 5);
    tube('frame', [0, bedY + .24, -length / 2 + .52], [0, bedY + .24, .2], .02, P.chrome, 5);
    tube('frame', [.26, .55, -length / 2 + .18], [.26, .55, -length / 2 + .52], .13, P.machine.clone().multiplyScalar(.7), 9);
    box('frame', .08, .5, .16, P.iron, .2, .75, -length / 2 + .2);
  });
  // ---- The rack of parts, sorted: tins of bolts, boxes, gears, pistons, lamps and a wheel rim.
  on(T.rack, () => {
    const {length, depth, height} = T.rack;
    for (const x of [-1, 1]) for (const z of [-1, 1]) bar('frame', [x * depth / 2, 0, z * length / 2], [x * depth / 2, height, z * length / 2], .04, P.iron, .04);
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = .15 + shelf * .55;
      box('frame', depth, .025, length, P.timber[shelf % 4], 0, y, 0, [0, 0, .01 * (shelf % 2)]);
      for (let index = 0; index < 6; index++) {
        const z = -length / 2 + .15 + index * (length - .3) / 5, kind = (shelf * 3 + index) % 4;
        if (kind === 0) lathe('frame', [[0, 0], [.08, 0], [.08, .14], [0, .14]], 7, pick(P.tin), between(-.08, .08), y + .015, z);
        else if (kind === 1) box('frame', .3, .16, .2, pick([P.timber[2], P.tin[1], P.rust[2]]), 0, y + .09, z);
        else if (kind === 2) lathe('frame', [[.03, 0], [.13, 0], [.13, .04], [.03, .04]], 10, P.rust[0], between(-.05, .05), y + .015, z);
        else lathe('frame', [[0, 0], [.06, 0], [.06, .13], [.05, .15], [0, .15]], 7, P.chrome, 0, y + .015, z);
      }
    }
    tyre(0, height + .05, 0, [0, 0, Math.PI / 2], .36, .05, 1, P.rust[1]);
  });

  // ---- Inside the workshop bus: the lamp hung from its hoops.
  {
    const lamp = L.workshopInside.lamp, at = busPoint(workshop, lamp.lx, workshop.skirt + lamp.ly, lamp.lz);
    lathe('frame', [[.02, .2], [.08, .16], [.17, .03], [.18, 0]], 8, P.iron, at.x, at.y, at.z);
    keep('glow', new THREE.SphereGeometry(.07, 7, 5).translate(at.x, at.y + .01, at.z), P.lamp);
    tube('frame', [at.x, at.y + .2, at.z], [at.x, at.y + .34, at.z], .006, P.iron, 3);
  }

  // ---- The car on its stands, the hoist over it with the engine on the chain.
  on(T.car, () => within(placed(0, .1, 0, 0, -.14, 0), () => drawCar(kit, P)));
  on(T.car, () => {
    for (const side of [-1, 1]) {
      const x = side * .5, z = 1.35, top = .1 + .34 + .02 + Math.sin(.14) * 1.35;
      for (let leg = 0; leg < 3; leg++) { const angle = leg * Math.PI * 2 / 3; bar('frame', [x + Math.cos(angle) * .2, 0, z + Math.sin(angle) * .2], [x, top - .12, z], .025, P.rust[2]); }
      tube('frame', [x, top - .14, z], [x, top, z], .03, P.iron, 5);
    }
  });
  on(T.hoist, () => {
    const {span, splay, height} = T.hoist;
    for (const side of [-1, 1]) {
      for (const foot of [-1, 1]) tube('frame', [side * span, 0, foot * splay], [side * span * .96, height, 0], .05, P.tube, 6);
      bar('frame', [side * span, .5, -splay * .85], [side * span, .5, splay * .85], .04, P.tube);
    }
    box('frame', span * 2 + .3, .03, .14, P.iron, 0, height + .1, 0);
    box('frame', span * 2 + .3, .03, .14, P.iron, 0, height - .06, 0);
    box('frame', span * 2 + .3, .14, .02, P.iron, 0, height + .02, 0);
    box('frame', .22, .28, .18, P.rust[2], .1, height - .26, 0);
    for (const z of [-.08, .08]) tube('frame', [.1 - .1, height - .3, z], [.1 + .1, height - .3, z], .07, P.iron, 8);
    bar('frame', [.1, height - .42, 0], [.1, 2.08, 0], .02, P.iron);
    line('frame', [[.2, height - .35, .1], [.26, 1.4, .14], [.18, .95, .1], [.12, 1.4, .06], [.18, height - .35, .08]], .008, P.iron, 3);
    keep('frame', new THREE.TorusGeometry(.05, .012, 4, 8, Math.PI * 1.4).translate(.1, 2.03, 0), P.iron);
    for (const x of [-.18, .38]) bar('frame', [.1, 2.0, 0], [x, 1.78, (x < 0 ? -.15 : .15)], .012, P.iron);
    // The engine on the chains: the block, its head, the manifold and the pulley.
    within(placed(.1, 1.48, 0, .25, .05, .03), () => {
      box('frame', .55, .42, .68, P.rust[2].clone().multiplyScalar(.75), 0, 0, 0);
      box('frame', .44, .14, .64, P.machine.clone().multiplyScalar(.6), 0, .28, 0);
      box('frame', .5, .1, .6, P.iron, 0, -.26, 0);
      tube('frame', [0, .02, .34], [0, .02, .42], .1, P.iron, 10);
      for (let index = 0; index < 4; index++) bar('frame', [.27, .14, -.24 + index * .16], [.36, .04, -.24 + index * .16], .04, P.rust[0]);
      bar('frame', [.36, .04, -.26], [.36, .04, .26], .05, P.rust[0]);
    });
  });
  on(T.looseWheel, () => { tyre(0, .1, 0, [0, 0, Math.PI / 2], .3, .1, 1); tube('frame', [0, .04, 0], [0, .16, 0], .19, P.iron, 9); });
  on(T.bonnet, () => surface('sheet', 3, 3, (u, v) => [(u - .5) * 1.4, .05 + .05 * Math.sin(u * Math.PI) + .02 * v, (v - .5) * 1.2], P.paint[1].clone().lerp(P.rust[0], .45)), .02);

  // ---- The welding: the buggy's frame on trestles, the set on its wheels, the bottles on their trolley, the leads.
  on(T.frame, () => {
    const y = .95;
    for (const z of [-1.1, 1.1]) {
      for (const x of [-.55, .55]) for (const lean of [-1, 1]) bar('frame', [x, 0, z + lean * .3], [x * .9, y - .05, z], .05, P.timber[3], .07);
      box('frame', 1.3, .08, .12, P.timber[1], 0, y - .06, z);
    }
    const rails = [-.48, .48];
    for (const x of rails) tube('frame', [x, y, -1.6], [x, y, 1.6], .022, P.tube, 5);
    for (const z of [-1.55, -.6, .3, 1.1, 1.55]) tube('frame', [-.48, y, z], [.48, y, z], .02, P.tube, 5);
    line('frame', [[-.48, y, -.15], [-.44, y + .8, -.1], [-.2, y + 1.05, -.08], [.2, y + 1.05, -.08], [.44, y + .8, -.1], [.48, y, -.15]], .022, P.tube, 5);
    for (const x of rails) tube('frame', [x, y + .8, -.1], [x, y, .9], .02, P.tube, 5);
    for (const side of [-1, 1]) line('frame', [[side * .48, y, 1.4], [side * .85, y - .15, 1.55], [side * .48, y, 1.65]], .016, P.rust[2], 4);
    box('frame', .26, .3, .06, P.dark, .3, y + .12, -1.2, [-.6, 0, 0]);
  });
  on(T.welder, () => {
    // A transformer set in a dented case: louvres down its sides, a front panel with its two dials and terminals.
    box('frame', .5, .62, .7, P.welder, 0, .45, 0, [0, 0, .012]);
    box('frame', .46, .04, .66, P.welder.clone().multiplyScalar(.7), 0, .78, 0);
    for (const side of [-1, 1]) for (let louvre = 0; louvre < 5; louvre++) bar('frame', [side * .255, .3 + louvre * .07, -.22], [side * .255, .3 + louvre * .07, .22], .015, P.dark, .025);
    box('frame', .02, .4, .5, P.dark, .26, .5, 0);
    for (const z of [-.18, .18]) tube('frame', [.26, .3, z], [.31, .3, z], .025, P.chrome, 6);
    box('frame', .52, .08, .72, P.rust[0], 0, .17, 0);
    for (const z of [-.15, .1]) tube('frame', [.26, .55, z], [.28, .55, z], .05, P.dark, 8);
    for (const x of [-.22, .22]) tube('frame', [x, .2, -.32], [x * 1.05, .2, -.32], .14, P.rubber, 9);
    bar('frame', [-.2, .9, .3], [.2, .9, .3], .025, P.tube);
    for (const x of [-.2, .2]) bar('frame', [x, .76, .3], [x, .9, .3], .025, P.tube);
    keep('frame', new THREE.TorusGeometry(.2, .018, 4, 12).rotateY(Math.PI / 2).translate(-.28, .5, 0), P.rubber);
  });
  on(T.bottles, () => {
    within(placed(0, 0, 0, 0, .14, 0), () => {
      for (const [x, colour] of [[-.13, P.oxygen], [.13, P.acetylene]]) {
        lathe('frame', [[0, .1], [.115, .1], [.115, 1.32], [.09, 1.42], [.04, 1.47], [0, 1.47]], 9, colour, x, 0, 0);
        tube('frame', [x, 1.47, 0], [x, 1.56, 0], .02, P.chrome, 5);
      }
      box('frame', .5, .04, .3, P.iron, 0, .08, 0);
      for (const x of [-.24, .24]) bar('frame', [x, .1, -.14], [x, 1.2, -.14], .025, P.iron);
      bar('frame', [-.24, 1.0, -.14], [.24, 1.0, -.14], .02, P.iron);
      for (const x of [-.27, .27]) tube('frame', [x, .13, -.16], [x * 1.1, .13, -.16], .12, P.rubber, 8);
    });
  });
  {
    const arc = T.arc, set = T.welder, bottles = T.bottles, gy = (x, z) => ground(x, z) + .03;
    const lead = (a, b, lift, wander) => {
      const points = [];
      for (let index = 0; index <= 8; index++) {
        const t = index / 8, x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI * 2) * wander, z = a.z + (b.z - a.z) * t + Math.cos(t * Math.PI * 3) * wander * .6;
        const y = index === 0 ? a.y : index === 8 ? b.y : gy(x, z) + lift * Math.sin(t * Math.PI) ** 6;
        points.push([x, y, z]);
      }
      line('frame', points, .014, P.rubber, 4);
    };
    lead({x: set.x, y: ground(set.x, set.z) + .5, z: set.z}, {x: arc.x, y: ground(arc.x, arc.z) + arc.y - .02, z: arc.z}, .9, .35);
    lead({x: set.x - .1, y: ground(set.x, set.z) + .5, z: set.z}, {x: T.frame.x, y: ground(T.frame.x, T.frame.z) + .95, z: T.frame.z}, .6, .25);
    lead({x: bottles.x, y: ground(bottles.x, bottles.z) + 1.5, z: bottles.z}, {x: T.frame.x + .5, y: ground(T.frame.x, T.frame.z) + .97, z: T.frame.z - .2}, .5, .3);
  }

  // ---- The forge, its blower and the anvil on its stump, the quench drum.
  on(T.forge, () => {
    for (let leg = 0; leg < 3; leg++) { const angle = leg * Math.PI * 2 / 3 + .4; bar('frame', [Math.cos(angle) * .42, 0, Math.sin(angle) * .42], [Math.cos(angle) * .24, .72, Math.sin(angle) * .24], .04, P.iron); }
    lathe('frame', [[.06, 0], [.36, 0], [.4, .04], [.4, .2], [.36, .22], [.3, .1], [.06, .08]], 11, P.rust[2].clone().multiplyScalar(.7), 0, .72, 0);
    keep('glow', new THREE.CircleGeometry(.27, 9).rotateX(-Math.PI / 2).translate(0, .83, 0), P.coals);
    for (let index = 0; index < 7; index++) box('frame', .08, .05, .07, P.dark, between(-.2, .2), .86, between(-.2, .2), [between(0, 1), between(0, 3), 0]);
    tube('frame', [.38, .7, 0], [.75, .62, 0], .05, P.iron, 6);
    tube('frame', [.8, .46, -.12], [.8, .46, .12], .2, P.machine.clone().multiplyScalar(.75), 10);
    bar('frame', [.8, .46, .14], [.8, .7, .26], .02, P.iron);
    for (const z of [-.18, .18]) bar('frame', [.8, 0, z], [.8, .3, z], .03, P.iron);
    bar('frame', [-.2, .9, .2], [-.75, .95, .55], .015, P.iron);
  });
  on(T.anvil, () => {
    lathe('frame', [[0, 0], [.3, 0], [.31, .05], [.28, .55], [0, .55]], 9, P.timber[1], 0, 0, 0);
    box('frame', .22, .1, .36, P.iron, 0, .6, 0);
    box('frame', .14, .12, .26, P.iron, 0, .7, 0);
    box('frame', .2, .08, .4, P.iron, 0, .8, -.02);
    keep('frame', new THREE.ConeGeometry(.08, .3, 6).rotateX(Math.PI / 2).translate(0, .8, .35), P.iron);
    bar('frame', [.1, .85, -.1], [.18, .86, -.6], .015, P.iron);
  });
  on(T.quench, () => drum(0, 0, 0, P.tin[0], [0, 0, 0]));

  // ---- The stove on its bricks, its pipe and kettle, and the table with the bus seats either side.
  on(T.stove, () => {
    for (const x of [-.22, .22]) box('frame', .22, .12, .46, P.rust[1], x, .06, 0);
    drum(0, .12, 0, P.rust[2].clone().multiplyScalar(.6));
    box('glow', .2, .14, .02, P.coals, 0, .4, .3);
    box('frame', .26, .2, .03, P.iron, .2, .4, .3, [0, .8, 0]);
    tube('frame', [.1, .99, -.05], [.12, 2.7, -.08], .065, P.iron, 7);
    lathe('frame', [[0, .14], [.16, .02], [.17, 0]], 7, P.iron, .12, 2.72, -.08);
    lathe('frame', [[0, 0], [.1, 0], [.12, .08], [.1, .16], [.03, .2], [0, .2]], 8, P.chrome.clone().multiplyScalar(.6), -.12, .99, .08);
  });
  on(T.table, () => {
    for (const z of [-.75, .75]) for (const x of [-.36, .36]) for (const lean of [-1, 1]) bar('frame', [x + lean * .12, 0, z], [x, .72, z], .045, P.timber[3]);
    surface('frame', 2, 3, (u, v) => [(u - .5) * .86, .76 + .01 * Math.sin(v * 7), (v - .5) * 2.05], P.timber[2]);
    for (const z of [-.5, .5]) box('frame', .6, .015, .7, P.timber[0], 0, .77, z);
    for (let index = 0; index < 5; index++) lathe('frame', [[0, 0], [.04, 0], [.045, .1], [0, .1]], 6, pick([P.tin[0], P.chrome, P.rust[1]]), between(-.3, .3), .78, between(-.8, .8));
    lathe('frame', [[0, 0], [.14, 0], [.15, .16], [0, .16]], 9, P.iron, .1, .78, -.3);
    lathe('frame', [[0, 0], [.07, 0], [.07, .04], [.05, .05], [.05, .22], [.07, .26], [.02, .3], [0, .3]], 6, P.iron, -.1, .78, .45);
    keep('glow', new THREE.SphereGeometry(.04, 6, 4).translate(-.1, .92, .45), P.lamp);
  });
  for (const seat of T.seats) on(seat, () => {
    const colour = pick(P.seat);
    box('sheet', .48, .14, 1.7, colour, 0, .45, 0);
    box('sheet', .12, .55, 1.7, colour.clone().multiplyScalar(.88), .26, .78, 0, [0, 0, -.18]);
    for (const z of [-.7, .7]) { bar('frame', [-.2, 0, z], [-.18, .38, z], .03, P.tube); bar('frame', [.2, 0, z], [.22, .38, z], .03, P.tube); }
    bar('frame', [.3, .5, -.85], [.3, .5, .85], .025, P.chrome);
  });
  on(T.step, () => { box('frame', .5, .28, .85, P.timber[0], 0, .14, 0, [0, 0, .03]); for (const z of [-.3, 0, .3]) box('frame', .52, .02, .02, P.timber[3], 0, .29, z); });

  // ---- What lies about: tyre stacks, drums, the engine block on its pallet, the heap of panels.
  for (const stack of L.tyreStacks) {
    const sr = mulberry(stack.seed);
    for (let index = 0; index < stack.count; index++) tyre(stack.x + (sr() - .5) * .1, ground(stack.x, stack.z) + .13 + index * .26, stack.z + (sr() - .5) * .1, [0, sr() * 3, Math.PI / 2], .44 + sr() * .05, .13, 1);
  }
  for (const row of L.drums) {
    const colour = pick(P.drum).clone().lerp(P.rust[0], .25 + .3 * random());
    if (row.lying) drum(row.x, ground(row.x, row.z) + .29, row.z, colour, [0, .9, Math.PI / 2]);
    else drum(row.x, ground(row.x, row.z), row.z, colour, [0, between(0, 3), between(-.03, .03)]);
  }
  on(T.block, () => {
    for (const x of [-.45, 0, .45]) box('frame', .1, .1, 1.1, P.timber[1], x, .05, 0);
    for (const z of [-.45, 0, .45]) box('frame', 1.1, .025, .14, P.timber[2], 0, .115, z);
    box('frame', .5, .45, .7, P.rust[2].clone().multiplyScalar(.7), -.05, .36, 0, [0, .15, 0]);
    box('frame', .38, .14, .62, P.machine.clone().multiplyScalar(.6), -.05, .65, 0, [0, .15, 0]);
  });
  on(T.heap, () => {
    const hr = mulberry(91);
    for (let index = 0; index < 9; index++) {
      const angle = hr() * Math.PI * 2, reach = hr() * .6, w = .5 + hr() * .6, d = .4 + hr() * .6;
      within(placed(Math.cos(angle) * reach, .05 + index * .08, Math.sin(angle) * reach, hr() * 3, (hr() - .5) * .5, (hr() - .5) * .5), () =>
        surface('sheet', 2, 2, (u, v) => [(u - .5) * w, .03 * Math.sin(u * Math.PI), (v - .5) * d], pick([...P.paint, ...P.tin]).clone().lerp(P.rust[0], .4)));
    }
    for (let index = 0; index < 3; index++) tyre((hr() - .5) * .8, .45 + index * .1, (hr() - .5) * .8, [hr() - .5, hr() * 3, Math.PI / 2 + (hr() - .5)], .35, .04, 1, P.rust[1]);
  });

  // ---- Marks on the ground: the yard trodden pale, the cart tracks, oil under the car and the hoist, scorch at the forge.
  {
    const mark = (cell, x, z, turn, w, d, colour, opacity = 1, steps = 6) => {
      const [cx, cy] = MARK[cell], c = Math.cos(turn), s = Math.sin(turn), pos = [], uv = [], rgba = [], index = [];
      for (let j = 0; j <= steps; j++) for (let i = 0; i <= steps; i++) {
        const lu = i / steps - .5, lv = j / steps - .5, px = x + lu * w * c + lv * d * s, pz = z - lu * w * s + lv * d * c;
        pos.push(px, ground(px, pz) + .05, pz);
        uv.push((cx + .02 + .96 * (i / steps)) / 2, (cy + .02 + .96 * (j / steps)) / 2);
        rgba.push(colour.r, colour.g, colour.b, opacity);
      }
      for (let j = 0; j < steps; j++) for (let i = 0; i < steps; i++) { const a = j * (steps + 1) + i, b = a + 1, cc = a + steps + 1, d2 = cc + 1; index.push(a, cc, b, b, cc, d2); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));
      geometry.setIndex(index);
      keep('marks', geometry);
    };
    mark('soft', 0, 0, .3, 25, 25, P.worn, .3, 12);
    mark('soft', T.car.x, T.car.z, T.car.heading, 6, 7, P.track, .28);
    for (const row of [T.car, T.hoist, T.welder, T.block]) mark('spill', row.x + between(-.4, .4), row.z + between(-.4, .4), between(0, 3), 1.6 + random(), 1.2 + random(), P.oil, .55, 3);
    mark('scorch', T.forge.x, T.forge.z, 1, 2.8, 2.8, P.soot, .7, 3);
    mark('scorch', T.arc.x, T.arc.z, .3, 2, 2, P.soot, .45, 3);
    mark('scorch', T.stove.x, T.stove.z, 0, 1.8, 1.8, P.soot, .6, 3);
    // The ruts: a strip along each, its strength fading at both ends.
    for (const [ruts, track] of L.tracks.entries()) {
      const pos = [], uv = [], rgba = [], index = [], points = track;
      let along = 0;
      for (let i = 0; i < points.length; i++) {
        const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
        const dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1, nx = -dz / length, nz = dx / length;
        if (i) along += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
        const fade = Math.min(1, i / 2.5, (points.length - 1 - i) / 2.5) * (.3 + .12 * noise(along * .4, ruts * 7, 11));
        for (const across of [-1, 1]) {
          const wide = .2 + .06 * noise(along * .7, ruts * 5, 12), x = points[i].x + nx * across * wide, z = points[i].z + nz * across * wide;
          pos.push(x, ground(x, z) + .055, z);
          uv.push(.5 + .5 * (across < 0 ? .02 : .98), (.02 + .96 * ((along / 6 + ruts * .3) % 1)) / 2);
          rgba.push(P.track.r, P.track.g, P.track.b, fade);
        }
        if (i) { const a = (i - 1) * 2; index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(rgba, 4));
      geometry.setIndex(index);
      keep('marks', geometry);
    }
  }

  // ---- Merge each material's pieces, put the wear over the scrap, and add the flashes, the sparks, the smoke and the lights.
  const marks = groundMarks();
  const materials = {
    sheet: new THREE.MeshStandardMaterial({name: 'bus bodies, tin and canvas', vertexColors: true, roughness: .86, metalness: .1, side: THREE.DoubleSide, flatShading: true}),
    frame: new THREE.MeshStandardMaterial({name: 'iron, tube, timber and rubber', vertexColors: true, roughness: .9, metalness: .08}),
    roof: new THREE.MeshStandardMaterial({name: 'the pale roofs', vertexColors: true, roughness: .5, metalness: .35, side: THREE.DoubleSide}),
    glass: new THREE.MeshStandardMaterial({name: 'old bus glass', vertexColors: true, roughness: .28, metalness: .15, envMapIntensity: .7, side: THREE.DoubleSide}),
    glow: new THREE.MeshBasicMaterial({name: 'lamps, coals and the stove door', vertexColors: true}),
    marks: new THREE.MeshStandardMaterial({name: 'oil, ruts and the trodden yard', vertexColors: true, map: marks, roughness: .9, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}),
  };
  const floor = new THREE.Object3D();
  floor.name = 'The yard floor';
  floor.position.set(0, ground(0, 0), 0);
  group.add(floor);
  const wear = createScrapWear({soot: [[T.forge.x, 1, T.forge.z, 2], [T.stove.x, 2.8, T.stove.z, 1.2]], dustTop: 1.1, paint: .45});
  for (const [kind, list] of Object.entries(kit.lists)) {
    if (!list.length) continue;
    if (kind === 'sheet' || kind === 'frame') wear.apply(materials[kind]);
    const merged = mergeGeometries(list);
    for (const geometry of list) geometry.dispose();
    const mesh = new THREE.Mesh(merged, materials[kind]);
    mesh.name = `The Bus Ring, ${materials[kind].name}`;
    mesh.castShadow = mesh.receiveShadow = kind === 'sheet' || kind === 'frame' || kind === 'roof';
    if (kind === 'marks') mesh.renderOrder = 1;
    group.add(mesh);
  }
  const arcAt = {x: T.arc.x, y: ground(T.arc.x, T.arc.z) + T.arc.y, z: T.arc.z};
  const gateLamp = L.lamps.find(row => row.id === 'gate'), tableLamp = L.lamps.find(row => row.id === 'table');
  const workshopLamp = busPoint(workshop, L.workshopInside.lamp.lx, workshop.skirt + L.workshopInside.lamp.ly, L.workshopInside.lamp.lz);
  const gy = row => ground(row.x, row.z) + row.y;
  const flashes = createFlashes([
    {...arcAt, size: .45, kind: 0, strength: 1, least: .008},
    {...arcAt, y: arcAt.y + .4, size: 2.2, kind: 0, strength: .4, least: .014},
    {...arcAt, y: arcAt.y + 1.8, size: 9, kind: 0, strength: .1},
    {x: gateLamp.x, y: gy(gateLamp), z: gateLamp.z, size: 1.4, kind: 1, strength: .7, least: .008},
    {x: workshopLamp.x, y: workshopLamp.y, z: workshopLamp.z, size: 1.3, kind: 1, strength: .6},
    {x: tableLamp.x, y: gy(tableLamp) + .02, z: tableLamp.z, size: .5, kind: 1, strength: .6},
  ]);
  flashes.name = 'The Bus Ring, the welding flash and the lamps';
  group.add(flashes);
  const sparks = createSparks(30);
  sparks.name = 'The Bus Ring, welding sparks';
  group.add(sparks);
  const smoke = createSmokeColumn({height: 22, foot: .16, top: 3.2, wind: WIND, lean: .22, colour: 0x8a8278, pale: 0xd6cec2, strength: .5});
  smoke.name = 'The Bus Ring, stove smoke';
  smoke.position.set(T.stove.x + .12, ground(T.stove.x, T.stove.z) + 2.86, T.stove.z - .08);
  group.add(smoke);
  const lights = [];
  const light = (colour, strength, distance, at, flicker) => {
    const point = new THREE.PointLight(colour, strength, distance, 2);
    point.position.set(at.x, at.y, at.z);
    point.userData = {strength, flicker};
    group.add(point);
    lights.push(point);
    return point;
  };
  // The arc's light stands a little above and in front of it, so that it lights the yard and not only the frame it is on.
  const weldLight = light(0xbcd2ff, 0, 18, {x: arcAt.x + GATE_FACING.x * .8, y: arcAt.y + 1.1, z: arcAt.z + GATE_FACING.z * .8}, 'weld');
  light(0xffb466, 26, 11, {x: workshopLamp.x, y: workshopLamp.y - .1, z: workshopLamp.z}, 'lamp');
  light(0xffb466, 22, 13, {x: gateLamp.x, y: gy(gateLamp) - .1, z: gateLamp.z}, 'lamp');
  let draws = 0;
  group.traverse(node => { if (node.isMesh || node.isPoints || node.isLine) draws++; });
  const extra = flashes.geometry.index.count / 3 + smoke.geometry.index.count / 3;
  group.userData = {stage, draws, triangles: kit.triangles + extra, lights, flashes, sparks, smoke, weldLight, wear, floor,
    arc: arcAt, outward: {x: GATE_FACING.x, z: GATE_FACING.z},
    dispose() { marks.dispose(); group.traverse(node => { node.geometry?.dispose(); node.material?.dispose?.(); }); }};
  return group;
}

/** The parts that move: the welding's flicker, its light and its sparks, the stove's smoke, the lamps' flicker and the
 * wear. `seconds` is the game's own clock. */
export function updateBusRing(group, seconds) {
  const data = group?.userData;
  if (!data?.flashes || !Number.isFinite(seconds)) return;
  const weld = busRingWeld(seconds);
  data.flashes.material.uniforms.uWeld.value = weld;
  data.weldLight.intensity = 75 * weld;
  data.sparks.visible = weld > .2;
  if (data.sparks.visible) data.sparks.userData.place(seconds * 1.7, data.arc, {x: data.outward.x * .25, z: data.outward.z * .25}, 0);
  data.smoke.userData.update(seconds);
  data.wear.follow(data.floor);
  for (const light of data.lights) if (light.userData.flicker === 'lamp')
    light.intensity = light.userData.strength * (.94 + .04 * Math.sin(seconds * 7.3 + light.position.x) + .02 * Math.sin(seconds * 13.1));
}

// OPEN-LOOK-BUS-RING: the Bus Ring's drawing, checked without graphics.
// Each stage builds within the budget; the layout is the same on two runs; every solid lies inside the radius; every named
// spot is clear of every solid; the welding flickers in bursts; and each text the scenario sends to the page parses.
import assert from 'node:assert/strict';
import {
  BUS_RING_LAYOUT, BUS_RING_STAGES, BUS_RING_BUDGET, BUS_RING_WELD, busRingSolids, buildBusRing, updateBusRing, busRingWeld,
} from '../src/world/open/looks/bus-ring-look.js';
import {PICTURES, SITE, roadView, viewFor, weldMoment, pageSources} from './scenarios/look-bus-ring.mjs';
import {LAND} from '../src/world/scablands-names.js';

const L = BUS_RING_LAYOUT;
// The spots the card asks for (car-stop, the leader's place, the meeting place) under the names OPEN-T-MARKET already uses
// for them (`workbench` is its meeting place, `lookout` and `car-stop` its other two), and the places the yard is used.
const SPOTS = ['car-stop', 'lookout', 'gate', 'workbench', 'gasket', 'shelves', 'hoist', 'welder', 'forge', 'table', 'stove', 'bunk'];

// ---- The layout ----
assert.deepEqual(BUS_RING_STAGES, ['camp']);
assert.deepEqual(Object.keys(L.spots).sort(), [...SPOTS].sort(), 'every named spot, and no other');
assert.equal(JSON.stringify(L), JSON.stringify(BUS_RING_LAYOUT));
{
  const again = await import('../src/world/open/looks/bus-ring-look.js?second-run');
  assert.notEqual(again.BUS_RING_LAYOUT, L);
  assert.equal(JSON.stringify(again.BUS_RING_LAYOUT), JSON.stringify(L), 'the layout is the same when the file is loaded again');
}
assert.ok(Object.isFrozen(L) && Object.isFrozen(L.spots) && Object.isFrozen(L.spots['car-stop']) && Object.isFrozen(L.buses[0]) && Object.isFrozen(L.solids[0]),
  'the layout cannot be changed by a card that reads it');
for (const [name, spot] of Object.entries(L.spots)) {
  assert.ok(Number.isFinite(spot.x) && Number.isFinite(spot.z) && Number.isFinite(spot.heading), name);
  assert.ok(Math.hypot(spot.x, spot.z) <= L.radius, `${name} lies inside the radius`);
  assert.ok(spot.looksAt && Number.isFinite(spot.looksAt.y), `${name} has something to look at`);
}

// ---- The ring: seven buses nose to tail, a gap of tin between one and the next, and the gate ----
assert.equal(L.buses.length, 7);
assert.equal(L.buses.filter(bus => bus.workshop).length, 1, 'one bus is the workshop');
assert.ok(L.buses.some(bus => bus.rest === 'blocks') && L.buses.some(bus => bus.rest === 'wheels') && L.buses.some(bus => bus.rest === 'sunk'), 'some on blocks, some on their tyres, one sunk');
{
  const ends = bus => [-1, 1].map(end => ({x: bus.x + end * bus.length / 2 * Math.sin(bus.heading), z: bus.z + end * bus.length / 2 * Math.cos(bus.heading)}));
  for (let index = 1; index < L.buses.length; index++) {
    const front = ends(L.buses[index - 1])[1], back = ends(L.buses[index])[0], gap = Math.hypot(front.x - back.x, front.z - back.z);
    assert.ok(gap > .8 && gap < 1.6, `${L.buses[index - 1].id} stands nose to tail with ${L.buses[index].id}: ${gap.toFixed(2)} m`);
  }
  const first = ends(L.buses[0])[0], last = ends(L.buses.at(-1))[1], gate = Math.hypot(first.x - last.x, first.z - last.z);
  assert.ok(gate > 5 && gate < 6.5, `a gate wide enough for a car: ${gate.toFixed(2)} m`);
  const middle = {x: (first.x + last.x) / 2, z: (first.z + last.z) / 2}, out = Math.hypot(middle.x, middle.z);
  assert.ok(Math.abs(middle.x / out - L.gateFacing.x) < .02 && Math.abs(middle.z / out - L.gateFacing.z) < .02, 'the gate faces the way the layout says');
  // The workshop is across the yard from the gate.
  const workshop = L.buses.find(bus => bus.workshop);
  assert.ok((workshop.x * L.gateFacing.x + workshop.z * L.gateFacing.z) / Math.hypot(workshop.x, workshop.z) < -.9, 'the workshop faces the gate across the yard');
  assert.ok(L.ring.radius > 13 && L.ring.radius < 16, `the ring is about 30 m across: radius ${L.ring.radius.toFixed(2)}`);
}

// ---- Solids and spots ----
const corners = solid => {
  if (solid.shape === 'ellipse') return [[solid.x + solid.halfX, solid.z], [solid.x - solid.halfX, solid.z], [solid.x, solid.z + solid.halfZ], [solid.x, solid.z - solid.halfZ]];
  const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [solid.x + sx * solid.halfX * cos + sz * solid.halfZ * sin, solid.z - sx * solid.halfX * sin + sz * solid.halfZ * cos]);
};
// How far a point is outside a solid (0 or less when it is inside).
const clearance = (solid, x, z) => {
  const dx = x - solid.x, dz = z - solid.z;
  if (solid.shape === 'ellipse') return Math.hypot(dx, dz) - Math.max(solid.halfX, solid.halfZ);
  const cos = Math.cos(solid.heading), sin = Math.sin(solid.heading), lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
  const ox = Math.abs(lx) - solid.halfX, oz = Math.abs(lz) - solid.halfZ;
  return ox > 0 || oz > 0 ? Math.hypot(Math.max(ox, 0), Math.max(oz, 0)) : Math.max(ox, oz);
};
assert.throws(() => busRingSolids('town'), RangeError);
{
  const solids = busRingSolids('camp');
  assert.equal(solids, busRingSolids());
  assert.equal(new Set(solids.map(solid => solid.id)).size, solids.length, 'each solid has its own id');
  for (const solid of solids) {
    assert.ok(solid.id.startsWith('bus-ring-') && ['box', 'ellipse'].includes(solid.shape) && solid.halfX > 0 && solid.halfZ > 0 && solid.height > 0 && Number.isFinite(solid.heading), solid.id);
    for (const [x, z] of corners(solid)) assert.ok(Math.hypot(x, z) <= L.radius, `${solid.id} lies inside the radius`);
    for (const [name, spot] of Object.entries(L.spots)) assert.ok(clearance(solid, spot.x, spot.z) >= .3, `${name} is clear of ${solid.id}: ${clearance(solid, spot.x, spot.z).toFixed(2)} m`);
  }
  for (const id of ['bus-1', 'workshop', 'bench', 'lathe', 'rack', 'car', 'buggy-frame', 'welding-set', 'bottles', 'forge', 'anvil', 'stove', 'table'])
    assert.ok(solids.some(solid => solid.id === `bus-ring-${id}`), `${id} is solid`);
  // The cart tracks come in through the gate and pass clear of everything that stands in the yard.
  for (const track of L.tracks) {
    for (const point of track) for (const solid of solids) assert.ok(clearance(solid, point.x, point.z) > .3, `the tracks pass clear of ${solid.id}`);
    assert.ok(Math.hypot(track[0].x, track[0].z) > 30 && Math.hypot(track.at(-1).x, track.at(-1).z) < 10, 'the tracks come in from outside');
  }
  // Nobody is shut in: the gate is open from car-stop to the middle of the yard.
  for (let t = 0; t <= 1; t += .02) {
    const stop = L.spots['car-stop'], gate = L.spots.gate, x = stop.x + (gate.x - stop.x) * t, z = stop.z + (gate.z - stop.z) * t;
    for (const solid of solids) assert.ok(clearance(solid, x, z) > 1, `the way in through the gate is clear of ${solid.id}`);
  }
}

// ---- Each stage builds, within the budget ----
const bounds = group => {
  const box = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity};
  group.updateMatrixWorld(true);
  group.traverse(node => {
    if (!node.isMesh || node === group.userData.smoke || node === group.userData.flashes) return;
    const at = node.geometry.attributes.position, e = node.matrixWorld.elements;
    for (let index = 0; index < at.count; index++) {
      const px = at.getX(index), py = at.getY(index), pz = at.getZ(index);
      const x = e[0] * px + e[4] * py + e[8] * pz + e[12], y = e[1] * px + e[5] * py + e[9] * pz + e[13], z = e[2] * px + e[6] * py + e[10] * pz + e[14];
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `${node.name} has a point that is not a number`);
      box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y); box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z);
    }
  });
  return box;
};
const fingerprint = group => {
  let sum = 0, count = 0;
  group.traverse(node => { if (node.isMesh) { const at = node.geometry.attributes.position.array; for (let index = 0; index < at.length; index += 7) sum = (sum * 31 + Math.round(at[index] * 1000)) % 2147483647; count += at.length; } });
  return `${count}:${sum}`;
};
assert.deepEqual([BUS_RING_BUDGET.draws, BUS_RING_BUDGET.triangles], [12, 60000]);
const built = {};
for (const stage of BUS_RING_STAGES) {
  const group = buildBusRing({stage});
  built[stage] = group;
  let draws = 0, triangles = 0;
  group.traverse(node => {
    if (!node.isMesh && !node.isPoints && !node.isLine) return;
    draws++;
    assert.ok(node.name.startsWith('The Bus Ring'), 'every drawing says whose it is');
    if (!node.isMesh) return;
    assert.ok(node.geometry.index, `${node.name} is indexed`);
    triangles += node.geometry.index.count / 3;
  });
  assert.ok(draws <= BUS_RING_BUDGET.draws, `${stage}: ${draws} draws`);
  assert.ok(triangles <= BUS_RING_BUDGET.triangles, `${stage}: ${triangles} triangles`);
  assert.equal(group.userData.draws, draws);
  assert.equal(group.userData.triangles, triangles);
  const box = bounds(group);
  // The tallest thing is the gate's pole, lifted.
  assert.ok(box.minY > -.5 && box.maxY < 7.6, `${stage} stands on the ground: ${box.minY.toFixed(2)} to ${box.maxY.toFixed(2)}`);
  assert.ok(box.maxY > 5.2, 'the lamp mast stands over the gate');
  const far = Math.max(...[[box.minX, box.minZ], [box.minX, box.maxZ], [box.maxX, box.minZ], [box.maxX, box.maxZ]].map(([x, z]) => Math.hypot(x, z)));
  assert.ok(far <= L.radius * Math.SQRT2 && Math.max(Math.abs(box.minX), Math.abs(box.maxX), Math.abs(box.minZ), Math.abs(box.maxZ)) <= L.radius, `${stage}: nothing is drawn outside the site`);
  assert.equal(fingerprint(buildBusRing({stage})), fingerprint(group), `${stage} is drawn the same on a second run`);
  assert.equal(group.userData.lights.length, 3, 'three lights: the welding, the workshop lamp and the gate lamp');
  console.log(`  ${stage}: ${draws} draws, ${triangles} triangles, ${group.userData.lights.length} lights`);
}
assert.throws(() => buildBusRing({stage: 'town'}), RangeError);
// The ground under each thing comes from `heightAt`.
{
  const raised = bounds(buildBusRing({heightAt: () => 40}));
  assert.ok(raised.minY > 39.5 && raised.maxY < 47.6, 'the camp stands on the ground it is given');
  const sloped = buildBusRing({heightAt: (x, z) => x * .03 + z * .02});
  const box = bounds(sloped);
  assert.ok(box.minY < -.4 && box.maxY > 5.2, 'each thing stands on its own ground on a slope');
}

// ---- The welding: in bursts, flickering while the arc is struck, the same for the same clock ----
{
  assert.equal(busRingWeld(NaN), 0);
  assert.equal(busRingWeld(12.34), busRingWeld(12.34));
  let on = 0, bursts = 0, was = false;
  const values = new Set();
  for (let seconds = 0; seconds < 140; seconds += .01) {
    const strength = busRingWeld(seconds);
    assert.ok(strength >= 0 && strength <= 1);
    const lit = strength > .05;
    if (lit) { on++; values.add(Math.round(strength * 50)); }
    if (lit && !was) bursts++;
    was = lit;
  }
  assert.ok(on / 14000 > .25 && on / 14000 < .7, `the arc is struck about half the time: ${(on / 140).toFixed(0)}%`);
  assert.ok(bursts >= 140 / BUS_RING_WELD.cycle * .9 && bursts <= 140 / BUS_RING_WELD.cycle * 1.3, `in bursts: ${bursts} in 140 s`);
  assert.ok(values.size > 12, 'the arc flickers while it is struck');

  const group = built.camp, {flashes, weldLight, sparks, smoke} = group.userData;
  const lit = weldMoment(), dark = (() => { for (let seconds = 0; ; seconds += .1) if (busRingWeld(seconds) === 0) return seconds; })();
  updateBusRing(group, lit);
  assert.ok(flashes.material.uniforms.uWeld.value > .85 && weldLight.intensity > 100 && sparks.visible, 'struck: the flash, its light and the sparks');
  updateBusRing(group, dark);
  assert.ok(flashes.material.uniforms.uWeld.value === 0 && weldLight.intensity === 0 && !sparks.visible, 'between beads: dark');
  updateBusRing(group, 31.5);
  assert.ok(smoke.material.uniforms.uTime.value > 31, 'the smoke moves with the clock');
  updateBusRing(null, 1);
  updateBusRing(group, NaN);
  for (const text of [flashes.material.vertexShader, flashes.material.fragmentShader]) assert.doesNotMatch(text, /\b(?:float|vec[234])\s+(?:flat|sample|input|output|filter|common|partition|active|smooth|centroid|patch|far|near)\b/);
  group.userData.dispose();
}

// ---- The scenario ----
{
  const site = LAND.at('ridge', -665, -345);
  assert.deepEqual(SITE, {x: site.x, z: site.z}, 'the scenario stands the camp where OPEN-T-MARKET puts it');
  assert.deepEqual(PICTURES.filter(picture => !picture.extra).map(picture => picture.name), ['edge', 'yard', 'table', 'far', 'night'], 'the pictures the card asks for');
  const spots = Object.fromEntries(Object.entries(L.spots).map(([name, spot]) => [name, {x: SITE.x + spot.x, y: 0, z: SITE.z + spot.z,
    looksAt: {x: SITE.x + spot.looksAt.x, y: spot.looksAt.y, z: SITE.z + spot.looksAt.z}}]));
  const view = name => viewFor(PICTURES.find(picture => picture.name === name), {spots});
  const road = roadView();
  assert.ok(road.metres > 500 && road.metres < 900, `far is from the nearest road that sees the camp: ${road.metres.toFixed(0)} m`);
  assert.ok(view('far').dusk && view('far').eye.up === 1.2, 'far is at dusk and car height');
  assert.ok(Math.abs(view('edge').eye.x - SITE.x - L.spots['car-stop'].x) < 1e-9 && view('edge').eye.up === 1.6, 'edge is from car-stop at eye height');
  assert.ok(PICTURES.find(picture => picture.name === 'night').stage === 'night');
  for (const name of ['yard', 'table', 'night']) {
    const {eye} = view(name), x = eye.x - SITE.x, z = eye.z - SITE.z;
    assert.ok(Math.hypot(x, z) < L.ring.radius - 2, `${name} is on foot inside the camp`);
    for (const solid of busRingSolids()) assert.ok(clearance(solid, x, z) > .3, `${name} is not taken from inside ${solid.id}`);
  }
  assert.ok(busRingWeld(weldMoment()) > .85, 'the pictures catch the arc struck');
  const sources = pageSources();
  assert.ok(sources.length >= 15);
  for (const source of sources) assert.doesNotThrow(() => new Function(`return ${source}`), `a text sent to the page parses: ${source.slice(0, 60)}`);
}

console.log(`Bus Ring look: one stage within ${BUS_RING_BUDGET.draws} draws and ${BUS_RING_BUDGET.triangles} triangles, a fixed ring of ${L.buses.length} buses, solids inside ${L.radius} m, ${SPOTS.length} named spots clear, the welding in bursts, and the scenario's page texts pass.`);

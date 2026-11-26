// OPEN-LOOK-RADIO-HILL: Radio Hill's drawing, checked without graphics.
// Each stage builds within the budget, by day and at night; the layout is the same on two runs; every solid lies inside the radius;
// every named spot is clear of every solid; the rules' own spots and structures stand where the rules put them; the red lamp blinks,
// and blinks three times when asked; and each text the laptop scenario sends to the page parses.
import assert from 'node:assert/strict';
import {
  RADIO_HILL_LAYOUT, RADIO_HILL_STAGES, RADIO_HILL_BUDGET, RADIO_HILL_LAMP, radioHillLayout, radioHillSolids, buildRadioHill, updateRadioHill, radioHillLamp, mastLegAt,
} from '../src/world/open/looks/radio-hill-look.js';
import {RADIO_HILL} from '../src/world/open/content/sites.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {LAND} from '../src/world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {sees} from '../src/world/scablands-ways.js';
import {PICTURES, SITE, views, roadView, pageSources} from './scenarios/look-radio-hill.mjs';

const L = RADIO_HILL_LAYOUT;
const SPOTS = ['mast', 'generator', 'anchor', 'door', 'lookout', 'bench', 'bed', 'car-stop', 'hut', 'set', 'truck'];

// ---- The layout ----
assert.deepEqual(RADIO_HILL_STAGES, ['camp', 'second-set']);
assert.deepEqual(Object.keys(L.spots).sort(), [...SPOTS].sort(), 'every named spot of the card, and no other');
assert.equal(JSON.stringify(radioHillLayout()), JSON.stringify(L), 'the layout is the same on a second run');
{
  const again = await import('../src/world/open/looks/radio-hill-look.js?second-run');
  assert.notEqual(again.RADIO_HILL_LAYOUT, L);
  assert.equal(JSON.stringify(again.RADIO_HILL_LAYOUT), JSON.stringify(L), 'the layout is the same when the file is loaded again');
}
assert.ok(Object.isFrozen(L) && Object.isFrozen(L.spots) && Object.isFrozen(L.mast.sections[0]) && Object.isFrozen(L.sheets[0]), 'the layout cannot be changed by a card that reads it');
// The rules' spots (src/world/open/content/sites.js) keep their names and their places, and the leader meets at the door.
for (const [name, spot] of Object.entries(RADIO_HILL.spots)) assert.deepEqual(L.spots[name], spot, `the rules' spot ${name} is where the rules put it`);
assert.ok(Math.hypot(L.spots['car-stop'].x, L.spots['car-stop'].z) <= L.radius, 'the car stops at the edge of the camp, inside it');
assert.ok(L.spots['car-stop'].z > L.spots.lookout.z, 'Hetty walks out from the door to the lookout, towards where the car stops');
// The mast: 25 m, leaning a little, its old lower part and sections of scavenged tube above.
{
  assert.equal(L.mast.height, RADIO_HILL.structures.find(row => row.id === 'mast').height, 'the mast is as tall as the rules have it');
  const top = [0, 1, 2].map(leg => mastLegAt(leg, L.mast.height)), foot = [0, 1, 2].map(leg => mastLegAt(leg, 0));
  const lean = Math.hypot(top.reduce((sum, p) => sum + p.x, 0) / 3, top.reduce((sum, p) => sum + p.z, 0) / 3);
  assert.ok(lean > .2 && lean < .6, `the mast leans a little: ${lean.toFixed(2)} m at the top`);
  for (const p of foot) assert.ok(Math.hypot(p.x, p.z) <= .55, 'the feet of the legs stand inside the rules\' footprint of the mast');
  assert.ok(L.mast.sections.length >= 4 && new Set(L.mast.sections.map(section => section.kind)).size >= 3, 'the added sections are of several kinds of tube');
  assert.equal(L.mast.sections[0].from, L.mast.oldTop);
  assert.equal(L.mast.sections.at(-1).to, L.mast.height);
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
assert.throws(() => radioHillSolids('town'), RangeError);
for (const stage of RADIO_HILL_STAGES) {
  const solids = radioHillSolids(stage);
  assert.equal(JSON.stringify(solids), JSON.stringify(radioHillSolids(stage)));
  assert.equal(new Set(solids.map(solid => solid.id)).size, solids.length, 'each solid has its own id');
  for (const solid of solids) {
    assert.ok(solid.id.startsWith('radio-hill-') && ['box', 'ellipse'].includes(solid.shape) && solid.halfX > 0 && solid.halfZ > 0 && solid.height > 0 && Number.isFinite(solid.heading), solid.id);
    for (const [x, z] of corners(solid)) assert.ok(Math.hypot(x, z) <= L.radius, `${solid.id} lies inside the radius at ${stage}`);
    for (const [name, spot] of Object.entries(L.spots)) assert.ok(clearance(solid, spot.x, spot.z) >= .3, `${name} is clear of ${solid.id} at ${stage}: ${clearance(solid, spot.x, spot.z).toFixed(2)} m`);
  }
}
{
  const camp = radioHillSolids('camp'), second = radioHillSolids('second-set'), id = name => camp.find(solid => solid.id === 'radio-hill-' + name);
  assert.ok(!camp.some(solid => solid.id === 'radio-hill-second-aerial') && second.some(solid => solid.id === 'radio-hill-second-aerial'), 'the second aerial stands only at the stage second-set');
  // The rules' structures stand where the rules put them.
  for (const row of RADIO_HILL.structures.filter(row => row.id !== 'hut')) {
    const solid = id(row.id);
    assert.ok(solid && solid.x === row.x && solid.z === row.z, `${row.id} stands where the rules put it`);
  }
  // The hut is its four walls round the rules' box, with a door in the south wall wide enough to walk through, and the bed and the
  // chair at the set inside it.
  const hut = RADIO_HILL.structures.find(row => row.id === 'hut'), walls = camp.filter(solid => solid.id.startsWith('radio-hill-hut-'));
  assert.equal(walls.length, 5);
  for (const wall of walls) for (const [x, z] of corners(wall)) assert.ok(Math.abs(x - hut.x) <= hut.halfX + .1 && Math.abs(z - hut.z) <= hut.halfZ + .1, `${wall.id} is on the rules' box`);
  const [west, east] = ['hut-south-west', 'hut-south-east'].map(id);
  assert.ok((east.x - east.halfX) - (west.x + west.halfX) >= .8, 'the door is at least 0.8 m wide');
  for (const name of ['bed', 'set', 'hut']) assert.ok(Math.abs(L.spots[name].x - hut.x) < hut.halfX && Math.abs(L.spots[name].z - hut.z) < hut.halfZ, `${name} is inside the hut`);
  // A walker can go from the car round the lookout's wall, in between the porch posts to the door, and in to the set, in straight
  // steps clear of every solid; and from the door out to the lookout.
  const walk = (from, to, solids, margin = .25) => { for (let t = 0; t <= 1; t += .01) for (const solid of solids) if (clearance(solid, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t) < margin) return solid.id; return null; };
  const route = (points, solids) => points.slice(1).map((point, index) => walk(points[index], point, solids)).filter(Boolean);
  for (const solids of [camp, second]) {
    assert.deepEqual(route([L.spots['car-stop'], {x: 5.6, z: 12}, {x: -7, z: 8.3}, L.spots.door, L.spots.hut, {x: -7.6, z: 4.9}, L.spots.set], solids), [], 'from the car to the set');
    assert.deepEqual(route([L.spots.door, {x: -7, z: 8.3}, {x: 1.5, z: 11}, L.spots.lookout], solids), [], 'from the door to the lookout');
    assert.deepEqual(route([L.spots.door, {x: -7, z: 8.3}, {x: -10.6, z: 6.5}, L.spots.bench], solids), [], 'from the door to the bench');
  }
}

// ---- Each stage builds, within the budget ----
const bounds = group => {
  const box = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity, far: 0};
  group.updateMatrixWorld(true);
  group.traverse(node => {
    if (!(node.isMesh || node.isLine || node.isPoints) || node === group.userData.smoke) return;
    const at = node.geometry.attributes.position, e = node.matrixWorld.elements;
    for (let index = 0; index < at.count; index++) {
      const px = at.getX(index), py = at.getY(index), pz = at.getZ(index);
      const x = e[0] * px + e[4] * py + e[8] * pz + e[12], y = e[1] * px + e[5] * py + e[9] * pz + e[13], z = e[2] * px + e[6] * py + e[10] * pz + e[14];
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `${node.name} has a point that is not a number`);
      box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x); box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
      box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z); box.far = Math.max(box.far, Math.hypot(x, z));
    }
  });
  return box;
};
const fingerprint = group => {
  let sum = 0, count = 0;
  group.traverse(node => { if (node.isMesh || node.isLine) { const at = node.geometry.attributes.position.array; for (let index = 0; index < at.length; index += 7) sum = (sum * 31 + Math.round(at[index] * 1000)) % 2147483647; count += at.length; } });
  return `${count}:${sum}`;
};
const built = {};
for (const stage of RADIO_HILL_STAGES) for (const night of [false, true]) {
  const name = `${stage}${night ? ', night' : ''}`, group = buildRadioHill({stage, night});
  built[name] = group;
  let draws = 0, triangles = 0;
  group.traverse(node => {
    if (!node.isMesh && !node.isPoints && !node.isLine) return;
    draws++;
    assert.ok(node.name.startsWith('Radio Hill'), 'every draw says whose it is');
    if (node.isMesh) { assert.ok(node.geometry.index, `${node.name} is indexed`); triangles += node.geometry.index.count / 3; }
  });
  assert.ok(draws <= RADIO_HILL_BUDGET.draws, `${name}: ${draws} draws`);
  assert.ok(triangles <= RADIO_HILL_BUDGET.triangles, `${name}: ${triangles} triangles`);
  assert.deepEqual([RADIO_HILL_BUDGET.draws, RADIO_HILL_BUDGET.triangles], [12, 60000]);
  assert.equal(group.userData.draws.length, draws);
  assert.equal(group.userData.triangles, triangles);
  // Two lights at most, and only at night.
  assert.equal(group.userData.lights.length, 2);
  updateRadioHill(group, .5);
  assert.equal(group.userData.lights.filter(light => light.visible).length, night ? 2 : 0, `${name}: the lights are on only at night`);
  updateRadioHill(group, 1.5);
  assert.equal(group.userData.lights[1].visible, false, `${name}: the lamp's light goes out between blinks`);
  assert.equal(group.userData.lights[0].visible, night, `${name}: the hut's light stays on`);
  const box = bounds(group);
  assert.ok(box.minY > -.5, `${name} stands on the ground: ${box.minY.toFixed(2)}`);
  assert.ok(box.maxY > 27 && box.maxY < 28.5, `${name}: the mast and its whip stand about 27.6 m: ${box.maxY.toFixed(2)}`);
  assert.ok(box.far < L.radius, `${name}: nothing is drawn outside the camp (${box.far.toFixed(1)} m)`);
  assert.equal(fingerprint(buildRadioHill({stage, night})), fingerprint(group), `${name} is drawn the same on a second run`);
  console.log(`  ${name}: ${draws} draws, ${triangles} triangles, ${group.userData.lines} wires`);
}
assert.throws(() => buildRadioHill({stage: 'town'}), RangeError);
assert.ok(built['second-set'].userData.triangles > built.camp.userData.triangles + 200, 'the second set and its aerial are drawn at the stage second-set');
assert.ok(built['second-set'].userData.lines > built.camp.userData.lines, 'and the second aerial\'s ropes and cable');
// The ground under each thing comes from `heightAt`.
{
  const raised = bounds(buildRadioHill({heightAt: () => 40}));
  assert.ok(raised.minY > 39.5 && raised.maxY < 68.5, 'the camp stands on the ground it is given');
  const sloped = bounds(buildRadioHill({heightAt: (x, z) => x * .03 + z * .01}));
  assert.ok(sloped.minY < -.4, 'each thing stands on its own ground on a slope');
}
// The parts that move.
{
  const day = built.camp, night = built['camp, night'];
  updateRadioHill(day, 0);
  const turn0 = day.userData.rotor.rotation.z;
  updateRadioHill(day, 1);
  assert.notEqual(day.userData.rotor.rotation.z, turn0, 'the wind charger turns');
  assert.ok(day.userData.smoke.visible && day.userData.levels.x === 0 && day.userData.levels.y === 0, 'by day the lamps are out and the stove smokes');
  updateRadioHill(night, 1.3);
  assert.ok(!night.userData.smoke.visible && night.userData.levels.y > .8, 'at night the hut is lit');
  updateRadioHill(day, .4, {night: true});
  assert.ok(day.userData.lights[0].visible && day.userData.levels.x > 1, 'the camp built by day can be lit at night');
  updateRadioHill(day, .4, {night: false});
  updateRadioHill(null, 1);
  // From far off (OPEN-LOOK-RADIO-HILL-2): the red lamp keeps a least size on the screen; the mast's outline runs its whole height
  // in strokes and Hetty's rag flies near its top, both seen only from far off; the rag darkens at night.
  {
    const points = day.userData.glow.geometry.attributes, shape = points.aShape.array, least = points.aLeast.array, near = points.aNear.array, y = index => points.position.getY(index);
    const strokes = [...shape.keys()].filter(index => shape[index] === 1), rag = [...shape.keys()].find(index => shape[index] === 2);
    const lamp = shape.length - 1;
    assert.ok(least[lamp] >= 16 && points.aWhich.array[lamp] === 0 && shape[lamp] === 0, 'the red lamp, drawn last, is never smaller than 16 pixels across');
    assert.ok(strokes.length >= 9 && Math.min(...strokes.map(y)) < 2 && Math.max(...strokes.map(y)) > L.mast.height - 2.5, 'the outline runs from the foot to the head');
    assert.ok(rag !== undefined && y(rag) > L.mast.height - 2 && y(rag) < L.mast.height, 'the rag flies under the head');
    assert.ok([...strokes, rag].every(index => near[index] >= 200 && least[index] >= 3), 'they are drawn only from far off, never smaller than a few pixels');
    assert.equal(day.userData.daylight.value, 1, 'by day they keep their colour');
    assert.ok(night.userData.daylight.value < .5, 'at night the rag darkens');
  }
  for (const group of Object.values(built)) group.userData.dispose();
}

// ---- The red lamp ----
{
  const sample = (from, to, options) => { const rows = []; for (let t = from; t < to; t += .01) rows.push(radioHillLamp(t, options)); return rows; };
  const flashes = rows => rows.filter((level, index) => level > .5 && (index === 0 || rows[index - 1] <= .5)).length;
  assert.ok(sample(0, 30, {night: false}).every(level => level === 0), 'the lamp is out by day');
  const night = sample(0, 22, {night: true}), share = night.filter(level => level > .5).length / night.length;
  assert.equal(flashes(night), 10, 'at night it blinks once in every period');
  assert.ok(Math.abs(share - RADIO_HILL_LAMP.on / RADIO_HILL_LAMP.period) < .06, `on for its share of each period: ${share.toFixed(2)}`);
  // Asked to blink three times: dark first, three blinks, a rest, and then on as before.
  const at = 10, signal = sample(at, at + RADIO_HILL_LAMP.dark + RADIO_HILL_LAMP.blink * 6 + RADIO_HILL_LAMP.rest, {night: true, signalAt: at});
  assert.ok(signal.slice(0, Math.floor(RADIO_HILL_LAMP.dark * 100)).every(level => level === 0), 'it goes dark first');
  assert.equal(flashes(signal), 3, 'then blinks three times');
  assert.equal(flashes(sample(at + 3.5, at + 3.5 + RADIO_HILL_LAMP.period * 4, {night: true, signalAt: at})), 4, 'and then goes on blinking');
  assert.equal(radioHillLamp(7.3), radioHillLamp(7.3), 'the same clock gives the same light');
}

// ---- The laptop scenario ----
{
  const first = LAND.at('tin-town', -2245, -992), placed = sitePosition('radio-hill', 0);
  assert.deepEqual(SITE, {x: first.x, z: first.z}, 'the scenario stands the camp at the first position of OPEN-SITES');
  assert.deepEqual({x: placed.x, z: placed.z}, SITE, 'which is where the look stand puts it, for the land\'s seed 0');
  const all = views();
  assert.deepEqual(Object.keys(all), ['far', 'far-day', 'edge', 'door', 'yard', 'mast', 'night', 'night-far', 'night-door', 'hut']);
  assert.ok(!all['far-day'].dusk && all['far-day'].eye === all.far.eye, 'the far view is taken by day too, from the same place');
  const named = PICTURES.filter(picture => !picture.extra).map(picture => picture.name);
  assert.deepEqual(named, ['camp-edge', 'camp-door', 'camp-yard', 'camp-far-day', 'second-set-edge', 'second-set-door', 'camp-far', 'camp-night'], 'the pictures the cards list, by name');
  assert.ok(PICTURES.every(picture => all[picture.view] && ['camp', 'second-set', 'dusk', 'night'].includes(picture.stand)));
  // The far view: on the nearest road, as near the distance the tell is read from as the open road allows, at dusk and car height,
  // where the top of the mast can be seen.
  const road = roadView();
  assert.ok(all.far.dusk && all.far.road === road.road && road.distance <= 1400 && road.distance >= 1250, `the far view is ${road.distance.toFixed(0)} m from the camp on the ${road.road}`);
  assert.ok(Math.abs(all.far.eye.y - scablandsSurfaceHeightAt(road.x, road.z) - 1.2) < 1e-9, 'at car height above the road');
  assert.ok(sees(road, SITE, {heightAt: scablandsSurfaceHeightAt, eye: 1.2, target: L.mast.height, step: 2}), 'and the top of the mast can be seen from it');
  assert.ok(Math.abs(all.edge.eye.x - SITE.x - L.spots['car-stop'].x) < 1e-9 && Math.abs(all.edge.eye.z - SITE.z - L.spots['car-stop'].z) < 1e-9 && all.edge.eye.up === 1.6, 'edge is from car-stop at eye height');
  for (const name of ['door', 'yard', 'mast', 'night-door']) {
    for (const stage of RADIO_HILL_STAGES) for (const solid of radioHillSolids(stage)) assert.ok(clearance(solid, all[name].eye.x - SITE.x, all[name].eye.z - SITE.z) > .3, `${name} is not taken from inside ${solid.id}`);
    assert.ok(Math.hypot(all[name].eye.x - SITE.x, all[name].eye.z - SITE.z) < L.radius, `${name} is on foot inside the camp`);
  }
  assert.ok(all.night.dusk && PICTURES.find(picture => picture.view === 'night').stand === 'night', 'one picture at night');
  const sources = pageSources();
  assert.ok(sources.length >= 20);
  for (const source of sources) assert.doesNotThrow(() => new Function(`return ${source}`), `a text sent to the page parses: ${source.slice(0, 60)}`);
}

console.log(`Radio Hill look: two stages by day and at night within ${RADIO_HILL_BUDGET.draws} draws and ${RADIO_HILL_BUDGET.triangles} triangles, a fixed layout, solids inside ${L.radius} m, ${SPOTS.length} named spots clear, the red lamp's blink and signal, and the scenario's page texts pass.`);

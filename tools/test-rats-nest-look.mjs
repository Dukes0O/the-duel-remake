// OPEN-LOOK-RATS-NEST: the Rats' Nest's look, checked with no graphics. Each stage builds inside its budget, the layout is the same
// on two runs, the ground is what the card says, every solid lies inside the radius, every named spot is clear of every solid, and
// every string the laptop scenario sends to the page parses.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {installSiteGround} from '../src/world/open/site-ground.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {createGroundView} from '../src/world/ground-view.js';
import {scablandsGroundEdit, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {RATS_NEST_BUDGET, RATS_NEST_LAYOUT as L, RATS_NEST_STAGES, buildRatsNest, ratsNestGround, ratsNestSolids, updateRatsNest}
  from '../src/world/open/looks/rats-nest-look.js';
import {PICTURES, cameraFor, pageSource} from './scenarios/look-rats-nest.mjs';

// The same on two runs: a second copy of the file, loaded afresh, gives the same layout and the same drawing.
const again = await import('../src/world/open/looks/rats-nest-look.js?second-run');
assert.notEqual(again.RATS_NEST_LAYOUT, L, 'the second run is a fresh copy of the file');
assert.deepEqual(JSON.parse(JSON.stringify(again.RATS_NEST_LAYOUT)), JSON.parse(JSON.stringify(L)), 'the layout is the same on two runs');

// OPEN-BURNED-SCOUT consumes the complete layout published at 3f2a800a1.
assert.equal(createHash('sha256').update(JSON.stringify(L)).digest('hex'),
  '3f93db0abddf65504e188930a36d478f829c1b6553f3eb5416b5dfc570cfdc0e', 'published layout, spots and solids');

// Each stage builds, within the budget, and the same on two runs.
assert.deepEqual([...RATS_NEST_STAGES], ['day', 'night']);
assert.throws(() => buildRatsNest({stage: 'dusk'}), RangeError);
assert.throws(() => ratsNestSolids('dusk'), RangeError);
const built = {};
for (const stage of RATS_NEST_STAGES) {
  const group = buildRatsNest({stage}), second = again.buildRatsNest({stage});
  let draws = 0, triangles = 0;
  const sizes = node => (node.geometry.index ? node.geometry.index.count : node.geometry.attributes.position.count) / 3;
  group.traverse(node => { if (node.isMesh || node.isPoints || node.isLine) { draws++; triangles += sizes(node); assert.ok(!Array.isArray(node.material), 'one material a mesh'); } });
  assert.ok(draws <= RATS_NEST_BUDGET.draws, `${stage}: ${draws} draws is over ${RATS_NEST_BUDGET.draws}`);
  assert.ok(triangles <= RATS_NEST_BUDGET.triangles, `${stage}: ${triangles} triangles is over ${RATS_NEST_BUDGET.triangles}`);
  assert.equal(group.userData.draws, draws, 'the group counts its own draws');
  assert.equal(group.userData.triangles, triangles, 'the group counts its own triangles');
  const meshes = root => { const list = []; root.traverse(node => { if (node.isMesh) list.push(node); }); return list; };
  const a = meshes(group), b = meshes(second);
  assert.deepEqual(a.map(mesh => mesh.name), b.map(mesh => mesh.name));
  a.forEach((mesh, index) => assert.deepEqual(mesh.geometry.attributes.position.array, b[index].geometry.attributes.position.array, `${mesh.name} is the same on two runs`));
  for (const mesh of a) for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value), `${mesh.name} has a point that is not a number`);
  // Nothing drawn lies outside the site, apart from the smoke that stands over it.
  for (const mesh of a.filter(mesh => !/smoke|tyre fires/.test(mesh.name))) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    assert.ok(Math.max(Math.hypot(box.min.x, box.min.z), Math.hypot(box.max.x, box.max.z), Math.hypot(box.min.x, box.max.z), Math.hypot(box.max.x, box.min.z)) <= L.radius * Math.SQRT2,
      `${mesh.name} reaches outside the site`);
    assert.ok(box.min.y > -L.depth - 2 && box.max.y < 6, `${mesh.name} stands from ${box.min.y} to ${box.max.y}`);
  }
  // The parts that move: the flames' clock and the firelight follow the seconds they are given, and no other clock.
  updateRatsNest(group, 3); const three = group.userData.flames.uniforms.uTime.value, lit = group.userData.lights.map(light => light.intensity);
  updateRatsNest(group, 11.5);
  assert.equal(three, 3); assert.equal(group.userData.flames.uniforms.uTime.value, 11.5);
  updateRatsNest(group, 3);
  assert.deepEqual(group.userData.lights.map(light => light.intensity), lit, 'the same seconds give the same firelight');
  assert.ok(!group.userData.flames.fragmentShader.includes('uSeed') && group.userData.flames.fragmentShader.includes('vSeed'), 'each tongue of flame has its own flicker');
  assert.equal(group.userData.columns.length, 3, 'three tyre fires smoke');
  built[stage] = {draws, triangles, lights: group.userData.lights.length};
  group.userData.dispose(); second.userData.dispose();
}
assert.equal(built.day.lights, 0, 'no lamp is lit by day');
assert.ok(built.night.lights >= 5 && built.night.lights <= 6, 'the three fires and two or three lamps light the yard at night');
// The ground under each thing comes from the caller: a land 40 m up lifts everything by 40 m.
{
  const lifted = buildRatsNest({stage: 'day', heightAt: (x, z) => 40 - ratsNestGround(x, z)});
  lifted.traverse(node => { if (node.isMesh && /sheet/.test(node.name)) { node.geometry.computeBoundingBox(); assert.ok(node.geometry.boundingBox.min.y > 40 - L.depth - 2 && node.geometry.boundingBox.max.y < 46); } });
  lifted.userData.dispose();
}

// Cast down onto the installed, triangulated cut at each object's actual lowest
// drawn vertex. This is independent of the height function that seated the prop.
const at = sitePosition('rats-nest', 0);
const restore = installSiteGround(0, ['rats-nest']);
const terrain = new THREE.Group(), view = createGroundView({group: terrain, groundEdit: scablandsGroundEdit});
const ray = new THREE.Raycaster(undefined, new THREE.Vector3(0,-1,0));
const contacts = new Map();
try {
  view.update();
  terrain.updateMatrixWorld(true);
  const group = buildRatsNest({
    heightAt: (x,z) => scablandsSurfaceHeightAt(at.x+x, at.z+z),
    inspectPlacement(label, geometries) {
      const bottom = new THREE.Vector3(0, Infinity, 0);
      for (const geometry of geometries) {
        const points = geometry.attributes.position;
        for (let i=0; i<points.count; i++) {
          if (points.getY(i) < bottom.y) bottom.fromBufferAttribute(points,i);
        }
      }
      ray.ray.origin.set(at.x+bottom.x, bottom.y+25, at.z+bottom.z);
      const hit = ray.intersectObject(terrain,true)[0];
      assert.ok(hit, label + ' lies outside the drawn cut');
      const clearance = bottom.y - hit.point.y;
      assert.ok(clearance >= -.3 && clearance <= .1, `${label} bottom is ${clearance.toFixed(3)} m from the drawn ground`);
      assert.ok(!contacts.has(label), 'duplicate placement ' + label);
      contacts.set(label,clearance);
    },
  });
  group.userData.dispose();
} finally {
  view.dispose();
  restore();
}
for (const wreck of L.wrecks) assert.ok(contacts.has(wreck.id), wreck.id);
for (const [prefix,count] of Object.entries({
  buggy: L.bays.length, stack: L.tyreStacks.length, drum: L.drums.length, heap: L.heaps.length,
  'fire-stack': 3, 'fire-tyre': 9, 'fire-wire': 12, rag: 4, 'workshop-tyre': 4, 'fuel-can': 3, 'bench-drum': 2,
})) assert.equal([...contacts.keys()].filter(id => id.startsWith(prefix+'-')).length,count,prefix);
for (let i=0; i<86; i++) assert.ok(contacts.has(['tyre','sheet','pipe','plank','stone','scrap'][i%6]+'-'+(i+1)));
assert.ok([...contacts.keys()].filter(id => id.startsWith('rubble-')).length > 60);


// The ground: a cutting about 90 m by 45 m and 9 m deep with steep sides, a road down at the west, a gully beyond the east rim.
assert.equal(ratsNestGround(0, 0), 9);
assert.ok(Math.abs(ratsNestGround(0, 30) - 9) < 1e-9 && Math.abs(ratsNestGround(10, -30) - 9) < 1e-9, 'the floor is level');
assert.equal(ratsNestGround(-40, -10), 0, 'the land west of the rim is untouched');
assert.equal(ratsNestGround(40, -20), 0);
assert.throws(() => ratsNestGround(NaN, 0), TypeError);
let widest = 0, longest = 0, steepest = 0, deepest = 0;
for (let x = -30; x <= 30; x += .25) if (ratsNestGround(x, -5) > .5) widest += .25;
for (let z = -55; z <= 55; z += .25) if (ratsNestGround(0, z) > .5) longest += .25;
for (let x = -L.radius; x <= L.radius; x += 1) for (let z = -L.radius; z <= L.radius; z += 1) {
  const depth = ratsNestGround(x, z); deepest = Math.max(deepest, depth);
  assert.ok(depth >= 0, 'the ground is never above the land');
  steepest = Math.max(steepest, Math.abs(ratsNestGround(x + .5, z) - ratsNestGround(x - .5, z)), Math.abs(ratsNestGround(x, z + .5) - ratsNestGround(x, z - .5)));
}
assert.ok(widest > 41 && widest < 47, `the cutting is ${widest} m wide`);
assert.ok(longest > 86 && longest < 92, `the cutting is ${longest} m long`);
assert.ok(deepest <= 9.3 + 1e-9, `nothing is deeper than the gully's head: ${deepest}`);
assert.ok(steepest > 1.9 && steepest < 3.2, `the walls are steep but can be drawn on a 1 m grid: ${steepest} m in a metre`);
// Nothing is cut outside the site's radius.
for (let turn = 0; turn < 360; turn += 1) {
  const x = Math.cos(turn * Math.PI / 180) * L.radius, z = Math.sin(turn * Math.PI / 180) * L.radius;
  assert.ok(ratsNestGround(x, z) < .01, `the ground is cut at the edge of the site, at ${turn} degrees`);
}
// The road falls steadily from the land to the floor and a car can take it; the gully climbs from the drain's mouth to the land.
const road = L.road;
for (let x = road.top; x < road.foot; x += 1) {
  const here = ratsNestGround(x, road.z), next = ratsNestGround(x + 1, road.z);
  assert.ok(next >= here - 1e-9 && next - here < .22, `the road is too steep at ${x}: ${next - here}`);
  assert.ok(Math.abs(ratsNestGround(x, road.z + road.halfWidth - .3) - here) < .02 && Math.abs(ratsNestGround(x, road.z - road.halfWidth + .3) - here) < .02, 'the road is level across');
}
assert.ok(ratsNestGround(road.top, road.z) < .05 && Math.abs(ratsNestGround(road.foot, road.z) - 9) < .01);
assert.ok(ratsNestGround(L.gully.line[0][0], L.gully.line[0][1]) > 9, 'the gully is as deep as the drain where the drain comes out');
assert.ok(ratsNestGround(...L.gully.line.at(-1)) < .05, 'the gully ends at the land');
assert.ok(L.drain.length > 29 && L.drain.length < 32 && L.drain.inner * 2 === 1.8, 'the drain is 30 m long and as tall as a man');
for (let x = L.drain.from + 7; x < L.drain.to - 7; x += 1) assert.equal(ratsNestGround(x, L.drain.z), 0, 'the drain runs under uncut land');

// The layout: the named spots the card asks for, in the site's metres.
const need = ['rim-north', 'rim-middle', 'rim-south', 'car-hollow', 'road-top', 'road-foot', 'pen-gate', 'sump', 'drain-in', 'drain-out', 'drain-guard',
  ...Array.from({length: 9}, (_, index) => `captive-${index + 1}`), ...Array.from({length: 6}, (_, index) => `buggy-${index + 1}`)];
for (const name of need) assert.ok(L.spots[name], `the layout has no spot called ${name}`);
assert.ok(Object.isFrozen(L) && Object.isFrozen(L.spots) && Object.isFrozen(L.solids));
for (const [name, spot] of Object.entries(L.spots)) {
  assert.ok(Number.isFinite(spot.x) && Number.isFinite(spot.z) && Math.hypot(spot.x, spot.z) < L.radius, `${name} lies outside the site`);
  assert.ok(Math.abs(spot.y + ratsNestGround(spot.x, spot.z)) < 1e-9, `${name} does not stand on the ground`);
  if (spot.looksAt) assert.ok([spot.looksAt.x, spot.looksAt.y, spot.looksAt.z].every(Number.isFinite), `${name} looks at nothing`);
}
for (const name of ['rim-north', 'rim-middle', 'rim-south']) {
  const spot = L.spots[name];
  assert.equal(spot.y, 0, `${name} stands on the land`);
  assert.ok(spot.looksAt.y < -7, `${name} looks down into the cutting`);
  // A person can walk the rim: from each place to look from, the ground a metre on either side along the rim is still the land.
  assert.ok(ratsNestGround(spot.x, spot.z - 1) < .05 && ratsNestGround(spot.x, spot.z + 1) < .05 && ratsNestGround(spot.x - 1, spot.z) === 0);
  // And the edge is close: within 3 m the ground falls away.
  assert.ok(ratsNestGround(spot.x + 3, spot.z) > 1, `${name} is too far from the edge`);
}
assert.ok(Math.hypot(L.spots['rim-north'].looksAt.x - L.pen.x, L.spots['rim-north'].looksAt.z - L.pen.z) < 1, 'the north end looks at the pen');
assert.ok(Math.hypot(L.spots['rim-middle'].looksAt.x - L.cart.x, L.spots['rim-middle'].looksAt.z - L.cart.z) < 1, 'the middle looks at the cart');
assert.ok(L.spots['rim-north'].z < L.spots['rim-middle'].z && L.spots['rim-middle'].z < L.spots['rim-south'].z);
assert.ok(L.spots['car-hollow'].y < -2, 'the car is left in a hollow');
assert.ok(L.spots['road-top'].y > -.05 && L.spots['road-foot'].y === -9);
assert.ok(L.spots['drain-in'].y === -9 && L.spots['drain-out'].y < -8.5 && L.spots['drain-out'].x - L.spots['drain-in'].x > 30);
for (let index = 1; index <= 9; index++) assert.ok(Math.hypot(L.spots[`captive-${index}`].x - L.pen.x, L.spots[`captive-${index}`].z - L.pen.z) < L.pen.ring - 1.4, `captive ${index} sits outside the pen`);
assert.equal(Object.values(L.spots).filter(spot => spot.small).length, 1, 'one of the nine is small');
assert.ok(L.pen.ring * 2 > 13 && L.pen.ring * 2 < 15.5, 'the pen is about 14 m across');
assert.ok(L.pen.z < -20 && L.bays.every(bay => bay.z > 30) && Math.abs(L.cart.z) < 5 && Math.abs(L.cart.x) < 6, 'the pen is at the north end, the bays at the south, the cart in the middle');
assert.equal(L.bays.length, 6); assert.equal(L.fires.length, 3); assert.equal(L.roofs.length, 5);
assert.ok(L.lamps.length >= 2 && L.lamps.length <= 3);
for (let index = 1; index < 6; index++) assert.ok(Math.abs(L.spots[`buggy-${index + 1}`].x - L.spots[`buggy-${index}`].x - L.bays[0].width) < 1e-9, 'the bays stand in a row');

// The solids: boxes and circles in the same metres, all inside the radius, and every named spot clear of every one.
const solids = ratsNestSolids('day');
assert.equal(ratsNestSolids('night'), solids);
assert.ok(solids.length > 40);
assert.equal(new Set(solids.map(solid => solid.id)).size, solids.length, 'every solid has its own name');
const inside = (solid, x, z, margin = 0) => {
  const dx = x - solid.x, dz = z - solid.z, cos = Math.cos(solid.heading), sin = Math.sin(solid.heading);
  // The solid's own x runs along (cos h, -sin h) and its own z along (sin h, cos h).
  const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
  return solid.shape === 'box' ? Math.abs(lx) < solid.halfX + margin && Math.abs(lz) < solid.halfZ + margin
    : (lx / (solid.halfX + margin)) ** 2 + (lz / (solid.halfZ + margin)) ** 2 < 1;
};
for (const solid of solids) {
  assert.ok(['box', 'ellipse'].includes(solid.shape) && solid.id.startsWith('rats-nest-'));
  assert.ok([solid.x, solid.z, solid.halfX, solid.halfZ, solid.heading, solid.height, solid.base].every(Number.isFinite), `${solid.id} has a number missing`);
  assert.ok(solid.halfX > 0 && solid.halfZ > 0 && solid.height > 0);
  assert.ok(Math.hypot(solid.x, solid.z) + Math.hypot(solid.halfX, solid.halfZ) < L.radius, `${solid.id} lies outside the site`);
  assert.ok(Math.abs(solid.base + ratsNestGround(solid.x, solid.z)) < 1e-9, `${solid.id} does not stand on the ground`);
  for (const [name, spot] of Object.entries(L.spots)) assert.ok(!inside(solid, spot.x, spot.z, .3), `${name} stands in ${solid.id}`);
}
// The pen holds: the ring of wrecks, the stuff jammed between them and the gate leave no gap a person could walk through.
for (let turn = 0; turn < 360; turn += 1) {
  const x = L.pen.x + Math.cos(turn * Math.PI / 180) * L.pen.ring, z = L.pen.z + Math.sin(turn * Math.PI / 180) * L.pen.ring;
  assert.ok(solids.some(solid => inside(solid, x, z, .25)), `the pen is open at ${turn} degrees`);
}
// The road, the drain's mouth and each bay are kept clear.
for (let x = road.top; x <= road.foot + 6; x += 1) for (const off of [-2.2, 0, 2.2]) assert.ok(!solids.some(solid => inside(solid, x, road.z + off, .2)), `something stands in the road at ${x}`);
for (const bay of L.bays) for (const [dx, dz] of [[0, 0], [-.9, -2], [.9, -2], [-.9, 1.8], [.9, 1.8], [0, -5], [0, -8]])
  assert.ok(!solids.some(solid => inside(solid, bay.x + dx, bay.z + dz)), 'something stands in a bay or in front of it');
for (let x = L.spots['drain-guard'].x; x <= L.drain.from; x += .5) assert.ok(!solids.some(solid => inside(solid, x, L.drain.z, .3)), 'something blocks the drain');

// The laptop scenario: its pictures are the named rim, approach and close views, each has a camera, and every string it sends to the page parses.
assert.deepEqual(PICTURES.map(picture => picture.name), ['rim-north', 'rim-middle', 'rim-south', 'drain', 'gate', 'far', 'road-down', 'yard']);
assert.deepEqual(PICTURES.filter(picture => picture.stage === 'night').map(picture => picture.name), ['road-down', 'yard']);
const stood = {at: {x: 1000, z: -2000}, land: 12, spots: Object.fromEntries(Object.entries(L.spots).map(([name, spot]) => [name,
  {x: 1000 + spot.x, y: 12 + spot.y, z: -2000 + spot.z, looksAt: spot.looksAt ? {x: 1000 + spot.looksAt.x, y: 12 + spot.looksAt.y, z: -2000 + spot.looksAt.z} : null}]))};
const sources = [pageSource.memoryMenu(), pageSource.prepare(), pageSource.enterYard(), pageSource.quality('performance'), pageSource.yard(), pageSource.wall(), pageSource.click('[data-action="yard-cards"]'),
  pageSource.noteRead(), pageSource.racing(), pageSource.landReady(), pageSource.hideScreens(), pageSource.stand('day'), pageSource.stand('night'), pageSource.advance(1.5), pageSource.count()];
for (const picture of PICTURES) {
  const view = cameraFor(picture, stood);
  assert.ok([...view.position, ...view.target, view.car.x, view.car.z].every(Number.isFinite), `${picture.name} has no camera`);
  if (picture.far) assert.ok(Math.abs(stood.at.x - view.position[0] - 1200) < 1e-9, 'the far picture is taken from 1.2 km to the west');
  else assert.ok(Math.abs(view.position[1] - stood.spots[picture.from].y - picture.eye) < 1e-9);
  sources.push(pageSource.view(view));
}
{
  const drain = cameraFor(PICTURES.find(picture => picture.name === 'drain'), stood);
  const reach = Math.hypot(drain.position[0] - (1000 + L.drain.from), drain.position[2] - (-2000 + L.drain.z));
  assert.ok(reach > 9 && reach < 11, `the drain's picture is taken from ${reach} m`);
}
assert.equal(Object.keys(pageSource).length, 15, 'every page string is checked here');
for (const source of sources) assert.doesNotThrow(() => new Function('return ' + source), source.slice(0, 60));

console.log(`The Rats' Nest look passed: day ${built.day.draws} draws and ${built.day.triangles} triangles, night ${built.night.draws} draws, ${built.night.triangles} triangles and ${built.night.lights} lights; ${solids.length} solids, ${Object.keys(L.spots).length} named spots, ${sources.length} page strings; ${contacts.size} ground contacts (${Math.min(...contacts.values()).toFixed(3)} to ${Math.max(...contacts.values()).toFixed(3)} m).`);

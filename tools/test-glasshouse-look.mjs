// OPEN-LOOK-GLASSHOUSE: the Glasshouse's drawing, checked without graphics.
// Each stage builds within the budget; the layout is the same on two runs; every solid lies inside the radius; every named
// spot is clear of every solid; and each text the laptop scenario sends to the page parses.
import assert from 'node:assert/strict';
import {
  GLASSHOUSE_LAYOUT, GLASSHOUSE_STAGES, GLASSHOUSE_BUDGET, GLASSHOUSE_PUMP, glasshouseLayout, glasshouseSolids, buildGlasshouse, updateGlasshouse, glasshouseGlint,
} from '../src/world/open/looks/glasshouse-look.js';
import {PICTURES, SITE, views, pageSources, nearestRoadPoint, lookBundle} from './scenarios/look-glasshouse.mjs';
import {LAND} from '../src/world/scablands-names.js';

const L = GLASSHOUSE_LAYOUT;
const STAGES = [{stage: 'camp', fresh: true, name: 'camp'}, {stage: 'burned', fresh: true, name: 'burned, fresh'}, {stage: 'burned', fresh: false, name: 'burned, cold'}];
const SPOTS = ['car-stop', 'frames', 'lamp', 'tracks', 'ruts', 'pods', 'pump', 'stove', 'tent', 'cart', 'marigold', 'hoe-1', 'hoe-2', 'hoe-3', 'tracks-away'];

// ---- The layout ----
assert.deepEqual(GLASSHOUSE_STAGES, ['camp', 'burned']);
assert.deepEqual(Object.keys(L.spots).sort(), [...SPOTS].sort(), 'every named spot of the card, and no other');
assert.equal(JSON.stringify(glasshouseLayout()), JSON.stringify(L), 'the layout is the same on a second run');
assert.equal(JSON.stringify(glasshouseLayout()), JSON.stringify(glasshouseLayout()));
{
  const again = await import('../src/world/open/looks/glasshouse-look.js?second-run');
  assert.notEqual(again.GLASSHOUSE_LAYOUT, L);
  assert.equal(JSON.stringify(again.GLASSHOUSE_LAYOUT), JSON.stringify(L), 'the layout is the same when the file is loaded again');
}
assert.ok(Object.isFrozen(L) && Object.isFrozen(L.spots) && Object.isFrozen(L.rows[0].screens[0]), 'the layout cannot be changed by a card that reads it');
assert.equal(L.rows.length, 6, 'six bean rows');
for (const row of L.rows) {
  assert.ok(Math.abs(row.x1 - row.x0 - 12) < .01, 'each row is about 12 m long');
  assert.ok(row.screens.length >= 6 && row.screens.length <= 9);
  for (const screen of row.screens) assert.ok(screen.x > row.x0 && screen.x < row.x1 + .2 && L.makes.includes(screen.make));
}
assert.ok(L.screens >= 45 && L.screens <= 56, `about fifty screens, not ${L.screens}`);
assert.equal(L.screens, L.rows.reduce((sum, row) => sum + row.screens.length + (row.windbreak ? 1 : 0), 0) + L.spares.length);
{
  const used = new Set(L.rows.flatMap(row => row.screens.map(screen => screen.make)));
  assert.ok(used.size >= 3 && used.size <= 4, 'three or four makes of windscreen');
  assert.ok(L.rows.flatMap(row => row.screens).some(screen => screen.crack) && L.rows.flatMap(row => row.screens).some(screen => screen.taped), 'some are cracked and some mended with tape');
  assert.ok(L.rows.flatMap(row => row.screens).every(screen => !screen.taped || screen.crack), 'tape goes only on a crack');
}
{
  const away = L.spots['tracks-away'];
  assert.ok(Math.abs(Math.hypot(away.x, away.z) - 60) < .01 && away.x > 0 && away.z > 0, 'tracks-away is 60 m out to the south-east');
  assert.ok(Math.hypot(L.spots['car-stop'].x, L.spots['car-stop'].z) <= L.radius, 'the car stops at the edge of the camp, inside it');
  for (const line of [...L.tracks, L.ruts]) {
    const end = line.at(-1);
    assert.ok(end.x > 40 && end.z > 40, 'every track and the ruts leave to the south-east');
    for (let index = 1; index < line.length; index++) assert.ok(Math.hypot(line[index].x - line[index - 1].x, line[index].z - line[index - 1].z) <= 1.01, 'a mark is laid on the ground in steps of a metre at most');
  }
  assert.equal(L.tracks.length, 6, 'six buggies');
  assert.equal(L.pods.length, 3);
  for (let index = 1; index < L.pods.length; index++) {
    const step = Math.hypot(L.pods[index].x - L.pods[index - 1].x, L.pods[index].z - L.pods[index - 1].z);
    assert.ok(step > 12 && step < 18, 'a pod, and another twenty steps on, and another');
  }
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
assert.throws(() => glasshouseSolids('town'), RangeError);
for (const stage of GLASSHOUSE_STAGES) {
  const solids = glasshouseSolids(stage);
  assert.equal(JSON.stringify(solids), JSON.stringify(glasshouseSolids(stage)));
  assert.equal(new Set(solids.map(solid => solid.id)).size, solids.length, 'each solid has its own id');
  let reach = 0;
  for (const solid of solids) {
    assert.ok(['box', 'ellipse'].includes(solid.shape) && solid.halfX > 0 && solid.halfZ > 0 && solid.height > 0 && Number.isFinite(solid.heading), solid.id);
    for (const [x, z] of corners(solid)) { reach = Math.max(reach, Math.hypot(x, z)); assert.ok(Math.hypot(x, z) <= L.radius, `${solid.id} lies inside the radius at ${stage}`); }
    for (const [name, spot] of Object.entries(L.spots)) assert.ok(clearance(solid, spot.x, spot.z) >= .3, `${name} is clear of ${solid.id} at ${stage}: ${clearance(solid, spot.x, spot.z).toFixed(2)} m`);
  }
  assert.ok(reach * 2 <= 46 && reach * 2 >= 36, `the camp is about 45 m across, not ${(reach * 2).toFixed(1)}`);
}
{
  const camp = glasshouseSolids('camp').map(solid => solid.id), burned = glasshouseSolids('burned').map(solid => solid.id);
  assert.ok(camp.includes('glasshouse-cart') && !burned.includes('glasshouse-cart'), 'the cart is gone when the camp is burned');
  assert.ok(camp.includes('glasshouse-tent') && !burned.includes('glasshouse-tent'), 'the tent is ash on its poles');
  assert.ok(camp.filter(id => id.startsWith('glasshouse-row-')).length === 6 && !burned.some(id => id.startsWith('glasshouse-row-')), 'smashed frames stop nobody');
  assert.ok(burned.includes('glasshouse-pump'), 'the pump still stands');
  // The buggies' way out is open when the camp is burned.
  for (const line of [...L.tracks, L.ruts]) for (const point of line.filter(at => Math.hypot(at.x, at.z) <= L.radius && at.x > L.rows[0].x1 + 3))
    for (const solid of glasshouseSolids('burned')) assert.ok(clearance(solid, point.x, point.z) > .5, `the tracks pass clear of ${solid.id}`);
}

// ---- Each stage builds, within the budget ----
const bounds = group => {
  const box = {minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity};
  group.updateMatrixWorld(true);
  group.traverse(node => {
    if (!node.isMesh || node === group.userData.smoke || node === group.userData.glint) return;
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
const built = {};
for (const {stage, fresh, name} of STAGES) {
  const group = buildGlasshouse({stage, fresh});
  built[name] = group;
  let draws = 0, triangles = 0;
  group.traverse(node => {
    if (!node.isMesh && !node.isPoints && !node.isLine) return;
    draws++;
    assert.ok(node.geometry.index, `${node.name} is indexed`);
    triangles += node.geometry.index.count / 3;
    assert.ok(node.name.startsWith('The Glasshouse'), 'every mesh says whose it is');
  });
  assert.ok(draws <= GLASSHOUSE_BUDGET.draws, `${name}: ${draws} draws`);
  assert.ok(triangles <= GLASSHOUSE_BUDGET.triangles, `${name}: ${triangles} triangles`);
  assert.equal(group.userData.draws.length, draws);
  assert.equal(group.userData.triangles, triangles);
  assert.deepEqual([GLASSHOUSE_BUDGET.draws, GLASSHOUSE_BUDGET.triangles], [12, 60000]);
  const box = bounds(group);
  assert.ok(box.minY > -.5 && box.maxY < 7.2, `${name} stands on the ground and is about 6 m tall: ${box.minY.toFixed(2)} to ${box.maxY.toFixed(2)}`);
  assert.ok(box.maxY > 5.9, 'the wind pump is about 6 m tall');
  // The marks on the ground are the only thing that leaves the camp, and only while the tracks are fresh.
  const far = Math.max(Math.hypot(box.minX, box.minZ), Math.hypot(box.maxX, box.maxZ));
  if (stage === 'burned' && fresh) assert.ok(box.maxX > 44 && box.maxZ > 44 && box.maxX < 52, 'fresh tracks run out past tracks-away');
  else assert.ok(far < 40, `${name}: nothing is drawn far outside the camp (${far.toFixed(1)} m)`);
  assert.equal(fingerprint(buildGlasshouse({stage, fresh})), fingerprint(group), `${name} is drawn the same on a second run`);
  console.log(`  ${name}: ${draws} draws, ${triangles} triangles`);
}
assert.throws(() => buildGlasshouse({stage: 'town'}), RangeError);
// What each stage has and has not.
{
  const camp = built.camp.userData, fresh = built['burned, fresh'].userData, cold = built['burned, cold'].userData;
  assert.ok(camp.cart && camp.smoke && camp.glint && camp.ember, 'the camp has its cart, its smoke, its glint and its fire');
  for (const burned of [fresh, cold]) assert.ok(!burned.cart && !burned.smoke && !burned.glint && !burned.ember, 'burned: the cart is gone and the stove is cold');
  for (const stage of [camp, fresh, cold]) assert.ok(stage.wheel && stage.rod, 'the pump still turns at every stage');
  assert.deepEqual(camp.clues, []);
  assert.deepEqual(fresh.clues, ['frames', 'lamp', 'tracks', 'ruts', 'pods', 'pump'], 'the six things to find');
  assert.deepEqual(cold.clues, ['frames', 'lamp', 'pump'], 'two nights later the tracks, the ruts and the pods are gone');
  assert.ok(fresh.triangles > cold.triangles + 5000, 'the tracks, ruts, footprints and pods are drawn only while fresh');
  assert.notEqual(fingerprint(built.camp), fingerprint(built['burned, fresh']));
}
// The ground under each thing comes from `heightAt`.
{
  const raised = bounds(buildGlasshouse({stage: 'camp', heightAt: () => 40}));
  assert.ok(raised.minY > 39.5 && raised.maxY < 47.2, 'the camp stands on the ground it is given');
  const sloped = buildGlasshouse({stage: 'burned', fresh: true, heightAt: (x, z) => x * .03 + z * .01});
  const box = bounds(sloped);
  assert.ok(box.minY < -.4 && box.maxY > 5.9, 'each thing stands on its own ground on a slope');
  assert.ok(Math.abs(sloped.userData.wheel.position.y - (L.things.pump.x * .03 + L.things.pump.z * .01 + L.things.pump.hub)) < .01);
}
// The parts that move.
{
  const group = built.camp, {wheel, rod, glint, smoke} = group.userData;
  updateGlasshouse(group, 0);
  const turn0 = wheel.rotation.z, rod0 = rod.position.y;
  updateGlasshouse(group, 1, {sun: {x: -1, y: 2, z: 1}});
  assert.ok(Math.abs(wheel.rotation.z - turn0 - GLASSHOUSE_PUMP.turnsPerSecond * Math.PI * 2) < .4, 'the wheel turns at its pace');
  assert.notEqual(rod.position.y, rod0, 'the pump rod rises and falls');
  let low = Infinity, high = -Infinity;
  for (let seconds = 0; seconds < 12; seconds += .05) { updateGlasshouse(group, seconds); low = Math.min(low, rod.position.y); high = Math.max(high, rod.position.y); }
  assert.ok(Math.abs(high - low - GLASSHOUSE_PUMP.stroke * 2) < .01, 'by its stroke');
  assert.ok(Math.abs(glint.material.uniforms.uTime.value - 11.95) < .01, 'the glint keeps the clock it was last given');
  assert.deepEqual(glint.material.uniforms.uSun.value.toArray(), [-1, 2, 1], 'the glint keeps the sun it was last given');
  assert.ok(smoke.material.uniforms.uTime.value > 11, 'the smoke moves with the clock');
  updateGlasshouse(built['burned, cold'], 2);
  assert.ok(built['burned, cold'].userData.wheel.rotation.z > 0, 'the pump still turns when the camp is burned');
  updateGlasshouse(null, 1);
  // No shader of this file uses a word that the shading language keeps for itself.
  for (const text of [glint.material.vertexShader, glint.material.fragmentShader]) assert.doesNotMatch(text, /\b(?:float|vec[234])\s+(?:flat|sample|input|output|filter|common|partition|active|smooth|centroid|patch|far|near)\b/);
  group.userData.dispose();
}

// ---- The glint ----
{
  assert.ok(L.glints.length >= 4);
  const strongest = (sun, eye) => {
    const best = new Map();
    for (let seconds = 0; seconds < 40; seconds += .05) for (const {id, strength} of glasshouseGlint(sun, eye, seconds)) best.set(id, Math.max(best.get(id) ?? 0, strength));
    return [...best.values()].filter(strength => strength > .5).length;
  };
  // The sun low in the south-west; a viewer out to the west-north-west, where the upright screens at the row ends throw it.
  const sun = {x: -.75, y: .35, z: .56}, west = L.glints[0], lit = west.normal.x * sun.x + west.normal.y * sun.y + west.normal.z * sun.z;
  const mx = 2 * lit * west.normal.x - sun.x, mz = 2 * lit * west.normal.z - sun.z, flat = Math.hypot(mx, mz);
  const eye = {x: west.x + mx / flat * 400, y: 1.3, z: west.z + mz / flat * 400};
  const flashing = strongest(sun, eye);
  assert.ok(flashing >= 2 && flashing <= 4, `two or three screens flash when the angle is right, not ${flashing}`);
  // Every upright screen faces west or south, so a viewer to the north-east is behind them all.
  assert.equal(strongest(sun, {x: 300, y: 1.3, z: -300}), 0, 'none from behind the glass');
  assert.equal(strongest({x: sun.x, y: -.1, z: sun.z}, eye), 0, 'none after the sun is down');
  assert.equal(strongest(sun, {x: eye.z, y: 1.3, z: -eye.x}), 0, 'none when the angle is wrong');
  // A flash lasts a moment: over 40 seconds a screen is bright for less than a fifth of the time.
  let bright = 0, steps = 0;
  for (let seconds = 0; seconds < 40; seconds += .02) { steps++; if (glasshouseGlint(sun, eye, seconds)[0].strength > .5) bright++; }
  assert.ok(bright > 0 && bright / steps < .2, 'a flash lasts a moment');
  assert.equal(JSON.stringify(glasshouseGlint(sun, eye, 7.3)), JSON.stringify(glasshouseGlint(sun, eye, 7.3)), 'the same clock gives the same flash');
}

// ---- The laptop scenario ----
{
  const first = LAND.at('ships-in-sand', 2000, 700);
  assert.deepEqual(SITE, {x: first.x, z: first.z}, 'the scenario stands the camp at the first position of OPEN-SITES');
  const all = views();
  assert.deepEqual(Object.keys(all), ['far', 'edge', 'rows', 'pump', 'clues']);
  const named = PICTURES.filter(picture => !picture.extra).map(picture => picture.name);
  assert.deepEqual(named, ['camp-far', 'camp-edge', 'camp-rows', 'camp-pump', 'burned-far', 'burned-edge', 'burned-rows', 'burned-pump', 'burned-clues'], 'the pictures the card lists, by name');
  assert.ok(PICTURES.every(picture => picture.view === 'glint' || all[picture.view]));
  assert.ok(all.far.dusk && Math.abs(all.far.eye.up - 1.2) < .01 && nearestRoadPoint().distance >= 600, 'far is from the nearest road, at dusk, at car height');
  assert.ok(Math.abs(all.edge.eye.x - SITE.x - L.spots['car-stop'].x) < 1e-9 && all.edge.eye.up === 1.6, 'edge is from car-stop at eye height');
  const pump = {x: SITE.x + L.things.pump.x, z: SITE.z + L.things.pump.z};
  assert.ok(Math.abs(Math.hypot(all.pump.eye.x - pump.x, all.pump.eye.z - pump.z) - 8) < .3, 'the pump is seen from 8 m');
  for (const [name, view] of Object.entries(all)) {
    if (name === 'far') continue;
    // The eye stands clear of every solid and the car is parked outside the picture's ground.
    for (const stage of GLASSHOUSE_STAGES) for (const solid of glasshouseSolids(stage)) assert.ok(clearance(solid, view.eye.x - SITE.x, view.eye.z - SITE.z) > .3, `${name} is not taken from inside ${solid.id}`);
    assert.ok(Math.hypot(view.car.x - SITE.x, view.car.z - SITE.z) > Math.hypot(L.spots['car-stop'].x, L.spots['car-stop'].z) + 5);
  }
  const sources = pageSources();
  assert.ok(sources.length >= 25);
  for (const source of sources) assert.doesNotThrow(() => new Function(`return ${source}`), `a text sent to the page parses: ${source.slice(0, 60)}`);
  // The look file bundles into one module that names what the page calls.
  const bundle = await lookBundle();
  assert.match(bundle, /export\s*\{[^}]*buildGlasshouse[^}]*\}/);
  for (const name of ['updateGlasshouse', 'glasshouseGlint', 'GLASSHOUSE_LAYOUT']) assert.ok(bundle.includes(name), `the bundle gives ${name}`);
  assert.ok(bundle.length < 1500000, 'the bundle is small enough to send to the page');
}

console.log(`Glasshouse look: three stages within ${GLASSHOUSE_BUDGET.draws} draws and ${GLASSHOUSE_BUDGET.triangles} triangles, a fixed layout of ${L.screens} screens, solids inside ${L.radius} m, ${SPOTS.length} named spots clear, the glint, and the scenario's page texts pass.`);

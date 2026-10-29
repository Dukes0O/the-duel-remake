import assert from 'node:assert/strict';
import {KOGANE_PASS, manifest} from '../src/circuits/kogane-pass.js';
import {buildTrackScript} from '../src/track-script.js';
import {Course} from '../src/course.js';
import {circuitsEnabled} from '../src/circuits/index.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES} from '../src/course-access.js';
import {driveCircuit} from './track-script-drive.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeKitPlacements} from '../src/track-kits.js';
import {planWaterside} from '../src/waterside-scenery.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {courseSite} from '../src/heli/heli-session.js';
import {fireGrid, courseBurnCheck, startCells} from '../src/heli/heli-fire.js';
import {burnableCourses} from '../src/heli/heli-fire-run.js';
import {placeOfCourse, KOGANE_PLACE, PLACE_ALTITUDES} from '../src/heli/pilot-map-data.js';
import {execFileSync} from 'node:child_process';

const road = buildTrackScript(KOGANE_PASS);
assert.equal(road.closed, false);
assert.equal(road.pieces.length, 28);
assert.ok(Math.abs(road.length - 4684) < 1);
assert.equal(road.heightAt(0), 320);
assert.equal(road.heightAt(road.length), 26);
assert.equal(KOGANE_PASS.gridStartS, 45);
assert.equal(KOGANE_PASS.stage, 22);
assert.equal(KOGANE_PASS.layoutVersion, 1);
assert.equal(KOGANE_PASS.layoutSeed, 1989);
assert.equal(KOGANE_PASS.fieldSize, 6);
assert.equal(KOGANE_PASS.grandPrixLaps, 1);
assert.ok(KOGANE_PASS.noCombat && KOGANE_PASS.noTraffic);

const hairpins = road.pieces.filter(piece => piece.name?.endsWith('Hairpin'));
assert.deepEqual(hairpins.map(piece => piece.radius), [15, 14, 16, 15]);
for (const piece of road.pieces) {
  assert.equal(piece.width, hairpins.includes(piece) ? 12 : 10);
  assert.equal(piece.walls, 'both');
}
for (const piece of hairpins) {
  const before = road.pieces[piece.index - 1];
  assert.equal(before.kind, 'straight');
  assert.ok(before.length >= 120 || before.s1 - before.s0 >= 120);
  assert.deepEqual(road.boards.filter(board => board.piece === piece.index).map(board => board.distance), [150, 100, 50]);
}
let closest = Infinity;
const points = road.samples.filter((_, i) => i % 4 === 0);
for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
  if (points[b].s - points[a].s <= 750) continue;
  closest = Math.min(closest, Math.hypot(points[a].x - points[b].x, points[a].z - points[b].z));
}
// Packet draft measures about 196 m; the approved safety floor is 165 m.
assert.ok(closest >= 195, `draft separation ${closest.toFixed(2)} m`);
const course = new Course(KOGANE_PASS, 1989);
for (let s = 0; s < course.length; s += 4) {
  const next = Math.min(s + 4, course.length);
  // The packet says about 10%; the unchanged script's eased maximum is 10.21%.
  assert.ok(Math.abs(course.at(next).y - course.at(s).y) / (next - s) <= .103, `grade at ${s}`);
  assert.ok(course.script.wallSide(s, 1) && course.script.wallSide(s, -1));
}
const allowed = new Set(['armco-white', 'concrete-wall', 'start-gantry', 'braking-board-150', 'braking-board-100', 'braking-board-50',
  'stone-retaining-wall', 'curve-mirror', 'chevron-board', 'tea-house', 'vending-row',
  'autumn-tree-copper', 'autumn-tree-golden', 'shopfront-a', 'shopfront-b', 'lantern-string',
  'torii', 'torii-small', 'stone-lantern', 'kogane-car-park']);
assert.ok(KOGANE_PASS.kitPlacements.every(row => allowed.has(row.id)));
assert.equal(normalizeKitPlacements(course, KOGANE_PASS.kitPlacements).length, KOGANE_PASS.kitPlacements.length);
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'armco-white')) {
  assert.ok(Math.abs(Math.abs(row.lateral) - .349 / 2 - road.halfWidthAt(row.s) - 1) < 1e-6,
    'guardrail inner face matches the physical wall');
}
assert.equal(KOGANE_PASS.kitPlacements.filter(row => row.id === 'curve-mirror').length, 4);
assert.equal(KOGANE_PASS.kitPlacements.filter(row => row.id === 'chevron-board').length, 16);
for (const row of KOGANE_PASS.kitPlacements.filter(row => /curve-mirror|chevron-board/.test(row.id))) {
  assert.ok(Math.abs(row.lateral) >= road.halfWidthAt(row.s) + 3, 'hardware beyond wall and road');
}
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'stone-retaining-wall')) {
  const piece = road.pieceAt(row.s);
  assert.ok(piece.kind !== 'turn' || piece.radius >= 30, 'tall walls leave hairpin sightlines clear');
}
assert.equal(KOGANE_PASS.markings, 'single-yellow', 'single Japanese centre line');
for (const row of KOGANE_PASS.kitPlacements.filter(row => row.id === 'concrete-wall')) {
  const piece = road.pieceAt(row.s);
  assert.ok(piece.kind === 'turn' && piece.radius < 30 &&
    Math.sign(row.lateral) === -piece.dir, 'concrete only outside tight hairpins');
}
const lamps = planWaterside(course).lamps;
assert.ok(lamps.length > 30);
assert.ok(lamps.every(row => row.s >= 3270 && row.s < course.length && row.colour === 0xffa23c));
const models = JSON.parse(readFileSync(new URL('./blender/kogane/scenery.json', import.meta.url))).models;
models.push(...JSON.parse(readFileSync(new URL('./blender/kogane/landmarks.json', import.meta.url))).models);
const budgets = {'armco-white': [156, 72], 'stone-retaining-wall': [600, 200],
  'curve-mirror': [400, 150], 'chevron-board': [200, 100],
  'tea-house': [4500, 1400], 'vending-row': [1500, 500],
  'torii': [1800, 600], 'torii-small': [1800, 600], 'stone-lantern': [700, 250],
  'kogane-car-park': [150, 150]};
assert.deepEqual(models.map(model => model.id), Object.keys(budgets));
for (const model of models) for (const [i, file] of model.files.entries()) {
  const bytes = readFileSync(new URL('../public/assets/models/circuits/kits/' + file.path, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, 'measured current asset');
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'));
  const triangles = gltf.meshes.flatMap(mesh => mesh.primitives)
    .reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
  assert.equal(triangles, file.triangles);
  assert.ok(triangles > 0 && triangles <= budgets[model.id][i], `${file.path}: approved triangle cap`);
  assert.ok(file.bytes < 250000, `${file.path}: kit file budget`);
}
const ground = groundFromCourse(course);
const site = courseSite(course, ground, 'kogane-pass', {pilotMap: true});
const lake = KOGANE_PASS.basins[0];
assert.equal(KOGANE_PASS.effects.lake, lake, 'water and ground use one outline');
assert.ok(lake.lateral < 0, 'lake on the right');
const centre = course.worldAt(lake.s, lake.lateral);
assert.ok(Number.isFinite(ground.water(centre.x, centre.z)), 'bucket can scoop from the lake');
for (let s = 0; s < 730; s += 4) {
  const p = course.worldAt(s, 0);
  assert.equal(ground.water(p.x, p.z), null, 'lake never crosses the road');
}
for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
  const p = course.worldAt(lake.s + Math.cos(angle) * lake.along,
    lake.lateral + Math.sin(angle) * lake.across);
  assert.ok(p.x >= site.area.minX && p.x <= site.area.maxX &&
    p.z >= site.area.minZ && p.z <= site.area.maxZ, 'lake inside flying area');
}
const gate = KOGANE_PASS.kitPlacements.find(row => row.id === 'torii');
const foot = course.worldAt(gate.s, gate.lateral);
const water = ground.water(foot.x, foot.z);
assert.ok(Number.isFinite(water) && water-ground.height(foot.x,foot.z) > 0 &&
  water-ground.height(foot.x,foot.z) < 1, 'torii grounded in shallow water');
for (const row of KOGANE_PASS.kitPlacements.filter(row => /torii|stone-lantern/.test(row.id))) {
  assert.ok(Math.abs(row.lateral) > 12, 'landmarks clear of road and bend sightline');
}
assert.equal(ground.water(site.zone.x, site.zone.z), null, 'landing circle is dry');
for (let angle = 0; angle < Math.PI*2; angle += Math.PI/8) {
  assert.ok(Math.abs(ground.height(site.zone.x+Math.cos(angle)*site.zone.radius,
    site.zone.z+Math.sin(angle)*site.zone.radius)-site.zone.y) <= 1.5, 'landing circle level');
}
const grid = fireGrid(course, ground, site);
assert.equal(courseBurnCheck(course, ground, grid).ok, false, 'dev course is not a runtime destination by default');
assert.ok(startCells(course, ground, grid).length > 0, 'connected forest can host a fire');
const world = id => id === 'kogane-pass' ? {course, ground, grid} : null;
assert.deepEqual(burnableCourses({}, world, {enabled:true, owns:id=>id==='kogane-pass'}), [], 'off switch blocks fire eligibility');
assert.deepEqual(burnableCourses({}, () => {throw Error('unowned course loaded');},
  {enabled:true, owns:()=>false}), [], 'hidden or unowned course is never loaded');
assert.equal(placeOfCourse('kogane-pass'), null, 'off switch hides the map place');
assert.equal(KOGANE_PLACE.id, 'kogane-pass');
assert.equal(PLACE_ALTITUDES['kogane-pass'], 1300);
execFileSync(process.execPath, ['--input-type=module', '-e', `
  globalThis.__DUEL_QA__=true; globalThis.location={search:'?flags=kogane-pass'};
  const {Course}=await import('./src/course.js');
  const {KOGANE_PASS}=await import('./src/circuits/kogane-pass.js');
  const {groundFromCourse}=await import('./src/heli/heli-ground.js');
  const {courseSite}=await import('./src/heli/heli-session.js');
  const {fireGrid,courseBurnCheck}=await import('./src/heli/heli-fire.js');
  const {burnableCourses}=await import('./src/heli/heli-fire-run.js');
  const {destinationsFor}=await import('./src/heli/heli-jobs.js');
  const {placeOfCourse}=await import('./src/heli/pilot-map-data.js');
  const c=new Course(KOGANE_PASS,1989),g=groundFromCourse(c);
  const grid=fireGrid(c,g,courseSite(c,g,c.def.id,{pilotMap:true}));
  if(!courseBurnCheck(c,g,grid).ok)throw Error('Enabled course cannot burn');
  const list=burnableCourses({},id=>id===c.def.id?{course:c,ground:g,grid}:null,
    {enabled:true,owns:id=>id===c.def.id});
  if(list.join()!=='kogane-pass'||!placeOfCourse(c.def.id))throw Error('Enabled fire destination missing');
  if(destinationsFor({pilotMap:false})[c.def.id])throw Error('Kogane needs the pilot map');
`], {cwd:new URL('../', import.meta.url), stdio:'pipe', windowsHide:true});
assert.equal(manifest.state, 'dev');
assert.equal(manifest.grandPrix, true);
assert.equal(COURSE_PRICES['kogane-pass'], 2200);
const flags = overrides => createFeatureFlags({storage: null, qa: true, search: '', overrides});
assert.ok(!circuitsEnabled(flags({'kogane-pass': false})).some(def => def.id === 'kogane-pass'));
assert.equal(circuitsEnabled(flags({'kogane-pass': true})).at(-1), KOGANE_PASS);
assert.ok(!circuitsEnabled(flags({})).includes(KOGANE_PASS), 'dev is hidden by default');

// Both handling modes drive the actual open endpoint with disposable memory storage.
for (const difficulty of ['casual', 'pro']) {
  const result = driveCircuit(KOGANE_PASS, {difficulty, maxSeconds: 240,
    onTick: (state, duel) => {
      if (state.status === 'racing') assert.ok(duel.course.surfaceAt(state.s, state.lateral).road,
        `${difficulty}: stays on the road at ${state.s}`);
    }});
  assert.ok(result.completed, `${difficulty}: native finish ${JSON.stringify(result)}`);
  assert.equal(result.crashes, 0, `${difficulty}: no crashes`);
  assert.equal(result.boundaryResets, 0);
  assert.equal(result.checkpointResets, 0);
  assert.equal(result.finite, true);
  console.log(`${difficulty}: ${result.timeSec.toFixed(2)} s, no crashes or resets`);
}
console.log(`Kogane road, registration, boards and ${closest.toFixed(2)} m separation passed.`);

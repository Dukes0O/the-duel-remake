// The forest fire (docs/HELI_FIRE.md sections 4 and 8.5).
import assert from 'node:assert/strict';
import {FIRE, BURNT_LOOKS, cellId, cellIJ, fireGrid, burnCheck, courseBurnCheck, startCells, dayWind, startFire, spreadChance,
  spotChance, spreadStep, applyWater, fireOut, fireLost, fireSize, shareOut, hottestEdge, runFireEngine, fireNewDay, cruiseSeconds} from '../src/heli/heli-fire.js';
import {groundFromCourse} from '../src/heli/heli-ground.js';
import {courseSite} from '../src/heli/heli-session.js';
import {isDestination} from '../src/heli/heli-jobs.js';
import {normalizeHeli} from '../src/heli/heli-save.js';
import {Course} from '../src/course.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';

let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const load = id => {
  const course = new Course(ALL_CIRCUITS.find(def => def.id === id), 1989), ground = groundFromCourse(course);
  return {course, ground, site: courseSite(course, ground, id)};
};
const woods = load('tremblant-woods');
const grid = fireGrid(woods.course, woods.ground, woods.site);
const starts = startCells(woods.course, woods.ground, grid);
const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
const CALM = Object.freeze({speed: 0.5, toward: Object.freeze({x: 1, z: 0})});
const WINDY = Object.freeze({speed: 7, toward: Object.freeze({x: Math.SQRT1_2, z: Math.SQRT1_2})});
const SEEDS = Array.from({length: 50}, (_, k) => 1000 + k * 7919);
const same3 = (a, b, label) => assert.deepEqual(a, b, label);
const newFire = seed => startFire({id: 'fire-1', courseId: 'tremblant-woods', grid, seed, startDay: 0, candidates: starts});

check('the tuned numbers are the ones on the card', () => {
  assert.deepEqual([FIRE.cell, FIRE.treesPerCell, FIRE.minForestCells, FIRE.baseChance, FIRE.litresPerPoint, FIRE.lostCells, FIRE.lostShare,
    FIRE.spot, FIRE.regionCells, FIRE.stepSeconds, FIRE.dayStepCount], [20, 3, 150, 0.55, 180, 45, 0.4, 3, 2, 200, 3]);
  assert.deepEqual([...BURNT_LOOKS], ['tremblant-woods']);
  for (const [i, j] of [[0, 0], [-512, -512], [511, 511], [-3, 7]]) assert.deepEqual(cellIJ(cellId(i, j)), [i, j]);
});

check('the four rules for a course that can burn: Tremblant Woods passes, Panorama Ridge and Tremblant Snow do not', () => {
  const pass = courseBurnCheck(woods.course, woods.ground, grid);
  assert.deepEqual([pass.ok, pass.forest, pass.destination, pass.water, pass.look], [true, true, true, true, true]);
  const snow = load('tremblant-snow'), ridge = load('panorama-ridge');
  const snowCheck = courseBurnCheck(snow.course, snow.ground, fireGrid(snow.course, snow.ground, snow.site));
  assert.deepEqual([snowCheck.ok, snowCheck.forest], [false, false], 'snow never burns');
  const ridgeCheck = courseBurnCheck(ridge.course, ridge.ground, fireGrid(ridge.course, ridge.ground, ridge.site));
  assert.deepEqual([ridgeCheck.ok, ridgeCheck.water], [false, false], 'no water at Panorama Ridge');
  assert.equal(burnCheck({courseId: 'x', snow: false, forestCells: 149, destination: true, water: true}).forest, false);
  assert.equal(burnCheck({courseId: 'tremblant-woods', snow: false, forestCells: 150, destination: true, water: true}).ok, true);
  assert.equal(burnCheck({courseId: 'other', snow: false, forestCells: 900, destination: true, water: true}).look, false, 'no burnt look yet');
  assert.equal(isDestination('tremblant-woods'), true);
});

check('the grid: forest cells hold three trees, never the road, the lake or the pad', () => {
  assert(grid.forest >= 150, 'forest cells ' + grid.forest);
  assert.equal(grid.lostAt, Math.min(FIRE.lostCells, Math.floor(FIRE.lostShare * grid.forest)));
  for (const cell of grid.cells.values()) {
    assert(cell.trees >= FIRE.treesPerCell);
    assert(cell.edge >= FIRE.cell / 2, 'not on the road');
    assert(woods.ground.water(cell.x, cell.z) === null, 'not on the lake');
    assert(Math.hypot(cell.x - woods.site.zone.x, cell.z - woods.site.zone.z) >= woods.site.zone.radius + FIRE.cell, 'not on the pad');
  }
});

check('start cells: away from roads, the start line and the pad, 250 to 1,000 m from the shore, room to grow, outside scars', () => {
  assert(starts.length >= 10, 'start cells ' + starts.length);
  for (const id of starts) {
    const cell = grid.cells.get(id);
    assert(cell.edge >= FIRE.roadGap && cell.fromStart >= FIRE.startLineGap && cell.fromPad >= FIRE.padGap);
    assert(grid.regionSize(id) >= FIRE.regionCells * grid.lostAt);
  }
  const scarred = startCells(woods.course, woods.ground, grid, [{courseId: 'tremblant-woods', day: 0, cells: starts.slice(0, 5)}]);
  assert.deepEqual(scarred, starts.slice(5), 'never in a scar');
  const fire = newFire(7);
  assert.equal(fire.burning.length, 3);
  assert.deepEqual(fire.burning.map(([, p]) => p).sort(), [50, 50, 75]);
  assert(starts.includes(fire.burning.find(([, p]) => p === 75)[0]));
});

check('the wind: calm, breeze or windy from eight points, the same each play day', () => {
  const kinds = {calm: 0, breeze: 0, windy: 0};
  for (let day = 0; day < 1000; day++) {
    const wind = dayWind(42, day);
    kinds[wind.kind]++;
    const [lo, hi] = {calm: [0, 1], breeze: [3, 4], windy: [6, 8]}[wind.kind];
    assert(wind.speed >= lo && wind.speed <= hi && wind.from >= 0 && wind.from <= 7);
    assert(Math.abs(Math.hypot(wind.toward.x, wind.toward.z) - 1) < 1e-9);
  }
  assert(kinds.calm > 330 && kinds.calm < 470 && kinds.breeze > 330 && kinds.breeze < 470 && kinds.windy > 140 && kinds.windy < 260, JSON.stringify(kinds));
  assert.deepEqual(dayWind(42, 3), dayWind(42, 3));
  // From the north (+z) the wind blows toward -z; from the east toward -x.
  const days = Array.from({length: 200}, (_, day) => dayWind(42, day));
  const fromNorth = days.find(wind => wind.from === 0), fromEast = days.find(wind => wind.from === 2);
  assert.deepEqual([fromNorth.name, Math.round(fromNorth.toward.z) || 0, Math.round(fromNorth.toward.x) || 0], ['N', -1, 0]);
  assert.deepEqual([fromEast.name, Math.round(fromEast.toward.x) || 0, Math.round(fromEast.toward.z) || 0], ['E', -1, 0]);
});

check('spread is faster uphill and downwind, and slower when damp', () => {
  const pairs = [];
  for (const cell of grid.cells.values()) for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const other = grid.cells.get(cellId(cell.i + di, cell.j + dj));
    if (other) pairs.push([cell.id, other.id, other.y - cell.y]);
  }
  const [up] = pairs.filter(p => p[2] > 4), [down] = pairs.filter(p => p[2] < -4);
  assert(spreadChance(grid, up[0], up[1], null) > FIRE.baseChance, 'uphill faster');
  assert(spreadChance(grid, down[0], down[1], null) < FIRE.baseChance, 'downhill slower');
  const flat = pairs.find(p => Math.abs(p[2]) < 0.1);
  const a = grid.cells.get(flat[0]), b = grid.cells.get(flat[1]);
  const toward = {x: Math.sign(b.i - a.i), z: Math.sign(b.j - a.j)};
  const downwind = spreadChance(grid, a.id, b.id, {speed: 7, toward}), upwind = spreadChance(grid, b.id, a.id, {speed: 7, toward});
  assert(downwind > 1.7 * spreadChance(grid, a.id, b.id, null) && upwind < 0.3 * spreadChance(grid, a.id, b.id, null));
  assert(Math.abs(spreadChance(grid, a.id, b.id, null, true) / spreadChance(grid, a.id, b.id, null) - FIRE.damp) < 1e-9);
  assert.equal(spotChance(grid, a.id, b.id, null), 0, 'no embers without wind');
});

check('roads and the lake never burn: fire never crosses them and stays in its stretch of forest', () => {
  // No two neighbouring forest cells have the road or the lake between them.
  for (const cell of grid.cells.values()) for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const other = grid.cells.get(cellId(cell.i + di, cell.j + dj));
    if (!other) continue;
    for (const t of [0.25, 0.5, 0.75]) {
      const x = cell.x + (other.x - cell.x) * t, z = cell.z + (other.z - cell.z) * t;
      const near = woods.course.nearest(x, z);
      assert(Math.abs(near.lateral) > woods.course.roadHalfWidthAt(woods.course.phase(near.s)), 'no road between neighbours');
      assert.equal(woods.ground.water(x, z), null, 'no lake between neighbours');
    }
  }
  for (const seed of SEEDS.slice(0, 10)) {
    let fire = newFire(seed);
    const stretch = grid.regionSize(fire.burning[0][0]);
    for (let n = 0; n < 40; n++) {
      fire = spreadStep(fire, grid, WINDY);
      for (const [cell] of fire.burning) {
        assert(grid.cells.has(cell));
        assert.equal(grid.regionSize(cell), stretch, 'lit cells stay in the stretch the fire started in');
      }
    }
  }
});

check('the clock: a step per 200 s of engine time (one real bucket trip), three a new play day, a cruise by its fuel, nothing once lost', () => {
  let fire = newFire(21), steps = 0;
  for (let n = 0; n < 60 * 399; n++) { const run = runFireEngine(fire, grid, 1 / 60, CALM); fire = run.fire; steps += run.steps; }
  assert.equal(steps, 1, '399 s a frame at a time is one step');
  assert(Math.abs(fire.engineSeconds - 199) < 1e-6, 'and keeps the 199 s left over');
  const day = fireNewDay(newFire(21), grid, CALM);
  assert.equal(day.steps, 3);
  assert.equal(day.fire.steps, 3);
  assert.equal(cruiseSeconds(120), 200, 'a 120 kg cruise leg is 200 s of flying');
  assert.equal(runFireEngine(newFire(21), grid, cruiseSeconds(120), CALM).steps, 1, 'one step for that leg');
  let lost = newFire(5);
  while (!fireLost(lost, grid)) lost = spreadStep(lost, grid, WINDY);
  assert.deepEqual([runFireEngine(lost, grid, 900, WINDY).steps, fireNewDay(lost, grid, WINDY).steps], [0, 0], 'a lost fire grows no more');
  assert.equal(runFireEngine(newFire(21), grid, 0, CALM).steps, 0);
});

check('the grid is built from the helicopter course seed only', () => {
  const other = new Course(ALL_CIRCUITS.find(def => def.id === 'tremblant-woods'), 1990);
  assert.throws(() => fireGrid(other, groundFromCourse(other), null), /course seed 1989/);
});

check('water: 180 litres puts out a fully burning cell; water on dry forest makes it damp; out and lost', () => {
  let fire = {...newFire(11), burning: [[cellId(0, 0), 100]]};
  const fake = {cells: new Map([[cellId(0, 0), {id: cellId(0, 0), i: 0, j: 0, x: 10, z: 10, y: 0}],
    [cellId(1, 0), {id: cellId(1, 0), i: 1, j: 0, x: 30, z: 10, y: 0}]]), forest: 2, lostAt: 2, regionSize: () => 2};
  const half = applyWater(fire, fake, [{x: 10, z: 10, litres: 90, radius: 3}]);
  assert.deepEqual(half.fire.burning, [[cellId(0, 0), 50]]);
  const done = applyWater(half.fire, fake, [{x: 10, z: 10, litres: 100, radius: 3}]);
  assert.deepEqual([done.fire.burning, done.fire.burnt, done.cellsOut, fireOut(done.fire)], [[], [cellId(0, 0)], 1, true]);
  const damp = applyWater(fire, fake, [{x: 30, z: 10, litres: 30, radius: 3}]);
  assert.deepEqual(damp.fire.damp, [[cellId(1, 0), FIRE.dampSteps]]);
  // A heavy drop on a fresh edge cell: the water it does not need runs on to
  // the burning cell next to it, and then soaks the forest round it.
  const pair = {...fire, burning: [[cellId(0, 0), 25], [cellId(1, 0), 100]]};
  const heavy = applyWater(pair, fake, [{x: 10, z: 10, litres: 600, radius: 3}]);
  same3(heavy.fire.burning, [], 'both cells out');
  same3(heavy.cellsOut, 2, 'two cells out from one drop');
  const lone = applyWater({...fire, burning: [[cellId(0, 0), 25]]}, fake, [{x: 10, z: 10, litres: 600, radius: 3}]);
  same3(lone.fire.damp, [[cellId(1, 0), FIRE.dampSteps]], 'with nothing else burning, the rest makes the forest damp');
  const lost = {...fire, burning: [[cellId(0, 0), 100], [cellId(1, 0), 25]]};
  assert.equal(fireLost(lost, fake), true);
  assert.equal(fireSize(lost), 2);
  assert.equal(shareOut({...fire, burning: [[1, 50]], burnt: [2, 3, 4]}), 75);
  assert(normalizeHeli({version: 1, fire: done.fire}).fire, 'a fire record is the save shape');
  assert.deepEqual(normalizeHeli({version: 1, fire: done.fire}).fire, done.fire);
});

// The drop robot (section 4.5): one 600 L drop per spread step after two
// steps to reach the fire, 75% of its water on the burning edge, downwind first.
function robotDrop(fire, wind) {
  const target = hottestEdge(fire, grid, wind);
  const [i, j] = cellIJ(target), burning = new Map(fire.burning), foot = [], dry = [];
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const n = cellId(i + di, j + dj);
    if (burning.has(n)) foot.push(n); else if (grid.cells.has(n) && !fire.burnt.includes(n)) dry.push(n);
  }
  const total = foot.reduce((sum, c) => sum + burning.get(c), 0);
  const patches = foot.map(c => ({x: grid.cells.get(c).x, z: grid.cells.get(c).z, litres: 450 * burning.get(c) / total, radius: 4}));
  const wet = dry.length ? dry : foot;
  for (const c of wet) patches.push({x: grid.cells.get(c).x, z: grid.cells.get(c).z, litres: 150 / wet.length, radius: 4});
  return applyWater(fire, grid, patches).fire;
}
function alone(seed, wind) {
  let fire = newFire(seed);
  for (let n = 1; n <= 60; n++) { fire = spreadStep(fire, grid, wind); if (fireLost(fire, grid)) return n; }
  return 99;
}
function fight(seed, lateSteps) {
  let fire = newFire(seed);
  for (let n = 0; n < lateSteps; n++) fire = spreadStep(fire, grid, dayWind(seed, Math.floor(n / 3)));
  const wind = dayWind(seed, 7);
  for (let n = 0; n < 2; n++) fire = spreadStep(fire, grid, wind);
  for (let drops = 1; drops <= 60; drops++) {
    if (fireLost(fire, grid)) return 99;
    fire = robotDrop(fire, wind);
    if (fireOut(fire)) return drops;
    fire = spreadStep(fire, grid, wind);
  }
  return 99;
}

check('the section 4.5 targets hold over 50 seeds', () => {
  const rows = {calm: median(SEEDS.map(s => alone(s, CALM))), windy: median(SEEDS.map(s => alone(s, WINDY))),
    once: median(SEEDS.map(s => fight(s, 0))), oneDay: median(SEEDS.map(s => fight(s, 3))), twoDays: median(SEEDS.map(s => fight(s, 6)))};
  console.log('  medians', JSON.stringify(rows));
  assert(rows.calm >= 12 && rows.calm <= 16, 'left alone, calm: ' + rows.calm);
  assert(rows.windy >= 8 && rows.windy <= 11, 'left alone, windy: ' + rows.windy);
  assert(rows.windy < rows.calm, 'wind makes it faster');
  assert(rows.once >= 4 && rows.once <= 8, 'answered at once: ' + rows.once);
  assert(rows.oneDay >= 8 && rows.oneDay <= 14, 'one play day late: ' + rows.oneDay);
  assert(rows.twoDays >= 14 && rows.twoDays <= 22, 'two play days late: ' + rows.twoDays);
});

check('the same drops give the same fire', () => {
  const run = () => { let fire = newFire(99); for (let n = 0; n < 6; n++) { fire = spreadStep(fire, grid, WINDY); fire = robotDrop(fire, WINDY); } return JSON.stringify(fire); };
  assert.equal(run(), run());
  const a = JSON.stringify(spreadStep(newFire(5), grid, CALM)), b = JSON.stringify(spreadStep(newFire(6), grid, CALM));
  assert.notEqual(a, b, 'another seed, another fire');
});

console.log(`Heli fire: ${checks} groups passed.`);

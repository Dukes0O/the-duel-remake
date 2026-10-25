// The forest fire (docs/HELI_FIRE.md sections 4 and 8.5). Pure and
// repeatable, no graphics: a course's 20 m fire grid, where a fire starts,
// how it grows uphill and downwind, what water does, and when it is out or
// lost. The fire record is the save's own shape, so a saved fire carries on
// exactly where it stopped.
import {makeRng} from '../rng.js';
import {heliHash} from './heli-save.js';
import {isDestination} from './heli-jobs.js';

// Tuned on Tremblant Woods (FIRE-SPREAD card, Claude answers): its trees
// stand in a strip one or two cells deep beside the road, so the packet's
// open-forest starting values (0.12, 150 L, lost at 80) could not meet the
// section 4.5 targets. Cells grow before they spread, embers carry two
// cells downwind, and a fire starts only where it has room to grow.
export const FIRE = Object.freeze({
  cell: 20, treesPerCell: 3, minForestCells: 150,
  baseChance: 0.55, litresPerPoint: 180,
  startPercent: 75, neighbourPercent: 50, litPercent: 25, growPercent: 25, spreadFrom: 50,
  dampSteps: 2, damp: 0.2, spot: 3, regionCells: 2,
  stepSeconds: 200, dayStepCount: 3, cruiseKgPerSecond: 0.6,
  // Saved cells and scars name cells of the grid built from this course
  // seed (the helicopter's), so every caller builds the same grid.
  courseSeed: 1989,
  lostCells: 45, lostShare: 0.4,
  roadGap: 40, startLineGap: 150, padGap: 150, shoreNear: 250, shoreFar: 1000,
  maxScars: 4,
});

// Which courses have a burnt look made (FIRE-BURNT-LOOK; section 14). A course
// joins by getting its set under public/assets/burnt/<course>/.
export const BURNT_LOOKS = Object.freeze(['tremblant-woods']);

// The Lab's Retardant tank (docs/LAB.md 4.1): 150 litres treat a cell, and a treated forest cell cannot catch fire
// for the rest of that fire. Retardant never puts flames out and never lowers a cell that is already burning.
export const RETARDANT = Object.freeze({litresPerCell: 150});

export const cellId = (i, j) => (i + 512) * 1024 + (j + 512);
export const cellIJ = id => [Math.floor(id / 1024) - 512, id % 1024 - 512];
const NEIGHBOURS = Object.freeze([[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]);
// The ring two cells out, where embers land downwind (spotting).
const SPOTS = Object.freeze([...Array(25).keys()].map(k => [k % 5 - 2, Math.floor(k / 5) - 2]).filter(([a, b]) => Math.max(Math.abs(a), Math.abs(b)) === 2));
const round1 = v => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// The fire grid for a course: every 20 m cell holding at least 3 trees,
// except on the road, the lake, the paddock and the pad. `site` is the
// helicopter's courseSite (its zone is the pad). Built once per course.
export function fireGrid(course, ground, site = null) {
  if (course.seed !== FIRE.courseSeed) throw new Error(`The fire grid is built from course seed ${FIRE.courseSeed}, not ${course.seed}`);
  const counts = new Map();
  for (const o of course.features?.obstacles ?? []) {
    if (o.kind !== 'tree' || !Number.isFinite(o.x) || !Number.isFinite(o.z)) continue;
    const id = cellId(Math.floor(o.x / FIRE.cell), Math.floor(o.z / FIRE.cell));
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const cells = new Map();
  const start = course.at(0);
  for (const [id, trees] of [...counts].sort((a, b) => a[0] - b[0])) {
    if (trees < FIRE.treesPerCell) continue;
    const [i, j] = cellIJ(id), x = (i + 0.5) * FIRE.cell, z = (j + 0.5) * FIRE.cell;
    const near = course.nearest(x, z), edge = Math.abs(near.lateral) - course.roadHalfWidthAt(course.phase(near.s));
    if (edge < FIRE.cell / 2) continue;
    if (ground.water?.(x, z) != null || ground.water?.(x, z - FIRE.cell / 2) != null || ground.water?.(x, z + FIRE.cell / 2) != null ||
      ground.water?.(x - FIRE.cell / 2, z) != null || ground.water?.(x + FIRE.cell / 2, z) != null) continue;
    if (site?.zone && Math.hypot(x - site.zone.x, z - site.zone.z) < site.zone.radius + FIRE.cell) continue;
    cells.set(id, Object.freeze({id, i, j, x, z, y: ground.height(x, z), trees, edge,
      fromStart: Math.hypot(x - start.x, z - start.z),
      fromPad: site?.zone ? Math.hypot(x - site.zone.x, z - site.zone.z) : Infinity}));
  }
  // Each cell's stretch of connected forest, so a fire only starts where it has room to grow.
  const region = new Map();
  for (const id of cells.keys()) {
    if (region.has(id)) continue;
    const members = [id]; region.set(id, members);
    for (let k = 0; k < members.length; k++) {
      const [i, j] = cellIJ(members[k]);
      for (const [di, dj] of NEIGHBOURS) { const n = cellId(i + di, j + dj); if (cells.has(n) && !region.has(n)) { region.set(n, members); members.push(n); } }
    }
  }
  return Object.freeze({courseId: course.def?.id ?? null, cells, forest: cells.size, regionSize: id => region.get(id)?.length ?? 0,
    lostAt: Math.min(FIRE.lostCells, Math.floor(FIRE.lostShare * cells.size))});
}

// The four rules for a course that can burn (section 4.1). Returns
// {ok, forest, snow, destination, water, look}.
export function burnCheck({courseId, snow, forestCells, destination, water}) {
  const result = {forest: !snow && forestCells >= FIRE.minForestCells, destination: destination === true,
    water: water === true, look: BURNT_LOOKS.includes(courseId)};
  return Object.freeze({ok: result.forest && result.destination && result.water && result.look, ...result});
}

// The four rules on a real course: forest not snow, a helicopter
// destination, a lake to scoop from, and a burnt look made.
export function courseBurnCheck(course, ground, grid) {
  return burnCheck({courseId: course.def?.id, snow: !!course.def?.snowWorld, forestCells: grid.forest,
    destination: isDestination(course.def?.id), water: (course.def?.basins ?? []).length > 0 && typeof ground.water === 'function'});
}

// Distance from a cell to the nearest lake shore, sampled on a ring search.
function shoreDistance(ground, cell) {
  for (let r = 0; r <= FIRE.shoreFar + 100; r += 25) {
    const steps = Math.max(8, Math.ceil(2 * Math.PI * r / 25));
    for (let k = 0; k < steps; k++) {
      const a = k * 2 * Math.PI / steps;
      if (ground.water?.(cell.x + Math.cos(a) * r, cell.z + Math.sin(a) * r) != null) return r;
    }
  }
  return Infinity;
}

// Forest cells a fire may start in: away from roads, the start line and the
// pad, 250 to 1,000 m from the shore, outside every scar.
export function startCells(course, ground, grid, scars = []) {
  const scarred = new Set(scars.flatMap(scar => scar.cells));
  const found = [];
  for (const cell of grid.cells.values()) {
    if (cell.edge < FIRE.roadGap || cell.fromStart < FIRE.startLineGap || cell.fromPad < FIRE.padGap) continue;
    if (scarred.has(cell.id) || grid.regionSize(cell.id) < FIRE.regionCells * grid.lostAt) continue;
    const shore = shoreDistance(ground, cell);
    if (shore < FIRE.shoreNear || shore > FIRE.shoreFar) continue;
    found.push(cell.id);
  }
  return found;
}

// Each play day's wind (section 4.3): {speed m/s, from 0..7 (N, NE, ... NW), toward unit vector}.
export const COMPASS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
export function dayWind(missionSeed, playDay) {
  const rng = makeRng(heliHash(missionSeed, 'wind', playDay));
  const roll = rng.float();
  const kind = roll < 0.4 ? 'calm' : roll < 0.8 ? 'breeze' : 'windy';
  const speed = round1(kind === 'calm' ? rng.range(0, 1) : kind === 'breeze' ? rng.range(3, 4) : rng.range(6, 8));
  const from = rng.int(0, 7);
  // North is +z on the course, east is +x; the wind blows toward the opposite point.
  const a = from * Math.PI / 4;
  return Object.freeze({kind, speed, from, name: COMPASS[from], toward: Object.freeze({x: -Math.sin(a), z: -Math.cos(a)})});
}

// A new fire on a course: the start cell and two forest neighbours.
export function startFire({id, courseId, grid, seed, startDay, candidates}) {
  if (!candidates.length) return null;
  const rng = makeRng(heliHash(seed, 'start'));
  const start = candidates[rng.int(0, candidates.length - 1)];
  const [i, j] = cellIJ(start);
  const around = NEIGHBOURS.map(([di, dj]) => cellId(i + di, j + dj)).filter(n => grid.cells.has(n));
  const burning = [[start, FIRE.startPercent]];
  for (let k = 0; k < 2 && around.length; k++) burning.push([around.splice(rng.int(0, around.length - 1), 1)[0], FIRE.neighbourPercent]);
  return {id, courseId, seed, startDay, steps: 0, engineSeconds: 0, burning: burning.sort((a, b) => a[0] - b[0]), burnt: [], damp: []};
}

const slopeFactor = rise => rise >= 0 ? Math.min(2.5, 1 + 3 * rise) : Math.max(0.5, 1 + 1.5 * rise);
const windFactor = (wind, di, dj) => {
  if (!wind || wind.speed <= 0) return 1;
  const length = Math.hypot(di, dj);
  return Math.max(0.2, 1 + 0.12 * wind.speed * (wind.toward.x * di + wind.toward.z * dj) / length);
};

// The chance a burning cell lights a neighbour.
export function spreadChance(grid, from, to, wind, damp = false) {
  const a = grid.cells.get(from), b = grid.cells.get(to);
  if (!a || !b) return 0;
  const run = Math.hypot(b.x - a.x, b.z - a.z);
  return FIRE.baseChance * slopeFactor((b.y - a.y) / run) * windFactor(wind, b.i - a.i, b.j - a.j) * (damp ? FIRE.damp : 1);
}

// Embers carried two cells downwind: only in a wind, and only with it.
export function spotChance(grid, from, to, wind, damp = false) {
  const a = grid.cells.get(from), b = grid.cells.get(to);
  if (!a || !b) return 0;
  const carry = Math.max(0, windFactor(wind, b.i - a.i, b.j - a.j) - 1) * FIRE.spot;
  return carry > 0 ? FIRE.baseChance * carry * slopeFactor((b.y - a.y) / Math.hypot(b.x - a.x, b.z - a.z)) * (damp ? FIRE.damp : 1) : 0;
}

// The cells retardant has made unable to catch fire (a fire without the Lab's tank has none).
export const treatedCells = fire => new Set((fire.retardant ?? []).filter(([, litres]) => litres >= RETARDANT.litresPerCell).map(([cell]) => cell));

// One spread step. Returns a new fire record.
export function spreadStep(fire, grid, wind) {
  const burning = new Map(fire.burning), burnt = new Set(fire.burnt), damp = new Map(fire.damp);
  const treated = treatedCells(fire);
  const rng = makeRng(heliHash(fire.seed, 'spread', fire.steps));
  const lit = new Set();
  // Every burning cell grows first, so a cell lit last step spreads this step.
  for (const [cell, percent] of burning) burning.set(cell, Math.min(100, percent + FIRE.growPercent));
  for (const [cell, percent] of burning) {
    if (percent < FIRE.spreadFrom) continue;
    const [i, j] = cellIJ(cell);
    for (const [di, dj] of NEIGHBOURS) {
      const n = cellId(i + di, j + dj);
      if (!grid.cells.has(n)) continue;
      const roll = rng.float();
      if (burning.has(n) || burnt.has(n) || lit.has(n) || treated.has(n)) continue;
      if (roll < spreadChance(grid, cell, n, wind, damp.has(n))) lit.add(n);
    }
    if (!wind || wind.speed <= 0) continue;
    for (const [di, dj] of SPOTS) {
      const n = cellId(i + di, j + dj);
      if (!grid.cells.has(n)) continue;
      const roll = rng.float();
      if (burning.has(n) || burnt.has(n) || lit.has(n) || treated.has(n)) continue;
      // Embers never cross a road or the lake: a cell between must be forest.
      // The one or two cells between, the same on every side.
      const half = d => Math.sign(d) * Math.ceil(Math.abs(d) / 2);
      const between = [cellId(i + Math.trunc(di / 2), j + Math.trunc(dj / 2)), cellId(i + half(di), j + half(dj))];
      if (!between.some(b => grid.cells.has(b))) continue;
      if (roll < spotChance(grid, cell, n, wind, damp.has(n))) lit.add(n);
    }
  }
  for (const cell of lit) burning.set(cell, FIRE.litPercent);
  const nextDamp = [];
  for (const [cell, steps] of damp) if (steps > 1 && !burning.has(cell)) nextDamp.push([cell, steps - 1]);
  return {...fire, steps: fire.steps + 1, burning: [...burning].sort((a, b) => a[0] - b[0]),
    damp: nextDamp.sort((a, b) => a[0] - b[0])};
}

// Water on the fire: patches [{x, z, litres, radius}] from heli-bucket.js.
// Each patch's water is shared among the cells its disc covers, by area.
export function applyWater(fire, grid, patches) {
  // Retardant patches (the Lab's tank) are coated on after the water is dealt with; with none, nothing here changes.
  const coat = patches.filter(patch => patch.retardant === true);
  if (coat.length) {
    const wet = applyWater(fire, grid, patches.filter(patch => patch.retardant !== true));
    const coated = applyRetardant(wet.fire, grid, coat);
    return {...wet, fire: coated.fire, cellsTreated: coated.cellsTreated};
  }
  const litres = new Map();
  for (const patch of patches) {
    if (!(patch.litres > 0) || !(patch.radius > 0)) continue;
    const share = waterShare(patch);
    for (const [cell, part] of share) litres.set(cell, (litres.get(cell) ?? 0) + patch.litres * part);
  }
  const burning = new Map(fire.burning), burnt = new Set(fire.burnt), damp = new Map(fire.damp);
  let hit = 0, out = 0;
  // Water on a burning cell beyond what puts it out runs on to its burning
  // neighbours (once); with none burning it soaks the forest round it, which
  // turns damp. So a heavy drop on the edge works the cells around it too.
  const spill = new Map();
  const douse = (cell, l) => {
    const need = burning.get(cell) * FIRE.litresPerPoint / 100, used = Math.min(l, need);
    hit += used;
    const left = round1(burning.get(cell) - used * 100 / FIRE.litresPerPoint);
    if (left <= 0) { burning.delete(cell); burnt.add(cell); out++; } else burning.set(cell, left);
    return l - used;
  };
  const around = cell => { const [i, j] = cellIJ(cell); return NEIGHBOURS.map(([di, dj]) => cellId(i + di, j + dj)); };
  for (const [cell, l] of [...litres].sort((a, b) => a[0] - b[0])) {
    if (burning.has(cell)) {
      const rest = douse(cell, l);
      if (rest < 1) continue;
      const lit = around(cell).filter(n => burning.has(n) && !litres.has(n)), wet = lit.length ? lit : around(cell).filter(n => grid.cells.has(n) && !burnt.has(n));
      for (const n of wet) spill.set(n, (spill.get(n) ?? 0) + rest / wet.length);
    } else if (grid.cells.has(cell) && !burnt.has(cell) && l >= 1) damp.set(cell, FIRE.dampSteps);
  }
  for (const [cell, l] of [...spill].sort((a, b) => a[0] - b[0])) {
    if (burning.has(cell)) douse(cell, l);
    else if (!burnt.has(cell) && l >= 1) damp.set(cell, FIRE.dampSteps);
  }
  for (const cell of burnt) damp.delete(cell);
  return {fire: {...fire, burning: [...burning].sort((a, b) => a[0] - b[0]), burnt: [...burnt].sort((a, b) => a - b),
    damp: [...damp].filter(([cell]) => !burning.has(cell)).sort((a, b) => a[0] - b[0])}, litresOnFire: round1(hit), cellsOut: out};
}

// Retardant on the forest: each patch's litres are shared among the cells its disc covers, by area, and a cell that has
// had 150 litres is treated. Cells already burning or burnt take none (a burning cell is not lowered). Returns the new
// fire record (with `retardant` only once some has landed) and how many cells were newly treated.
export function applyRetardant(fire, grid, patches) {
  const totals = new Map(fire.retardant ?? []);
  const lit = new Set([...fire.burning.map(([cell]) => cell), ...fire.burnt]);
  const before = treatedCells(fire);
  for (const patch of patches) {
    if (!(patch.litres > 0) || !(patch.radius > 0)) continue;
    for (const [cell, part] of waterShare(patch)) {
      if (!grid.cells.has(cell) || lit.has(cell)) continue;
      totals.set(cell, round1((totals.get(cell) ?? 0) + patch.litres * part));
    }
  }
  const retardant = [...totals].filter(([cell]) => !lit.has(cell)).sort((a, b) => a[0] - b[0]);
  const next = {...fire, retardant};
  if (!retardant.length) delete next.retardant;
  const cellsTreated = [...treatedCells(next)].filter(cell => !before.has(cell)).length;
  return {fire: next, cellsTreated};
}

// How a disc of water splits among cells, by sampling it on a 2 m lattice.
function waterShare({x, z, radius}) {
  const share = new Map(), step = Math.min(2, radius / 2);
  let total = 0;
  for (let u = -radius; u <= radius; u += step) for (let v = -radius; v <= radius; v += step) {
    if (u * u + v * v > radius * radius) continue;
    const id = cellId(Math.floor((x + u) / FIRE.cell), Math.floor((z + v) / FIRE.cell));
    share.set(id, (share.get(id) ?? 0) + 1); total++;
  }
  if (!total) share.set(cellId(Math.floor(x / FIRE.cell), Math.floor(z / FIRE.cell)), total = 1);
  for (const [id, n] of share) share.set(id, n / total);
  return share;
}

export const fireOut = fire => fire.burning.length === 0;
export const fireSize = fire => fire.burning.length + fire.burnt.length;
export const fireLost = (fire, grid) => fireSize(fire) >= grid.lostAt;
// Share put out: burnt over burnt and burning, as a whole percent.
export const shareOut = fire => fireSize(fire) ? Math.floor(100 * fire.burnt.length / fireSize(fire)) : 0;

// The burning cell to hit first: on the edge (next to unburnt forest),
// downwind, and hottest. Used by the drop robot, the autopilot and the
// instruments. null when nothing burns.
export function hottestEdge(fire, grid, wind = null) {
  if (!fire.burning.length) return null;
  const burning = new Map(fire.burning), burnt = new Set(fire.burnt);
  let cx = 0, cz = 0;
  for (const [cell] of fire.burning) { const [i, j] = cellIJ(cell); cx += (i + 0.5) * FIRE.cell; cz += (j + 0.5) * FIRE.cell; }
  cx /= burning.size; cz /= burning.size;
  let best = null, bestScore = -Infinity;
  for (const [cell, percent] of fire.burning) {
    const [i, j] = cellIJ(cell), x = (i + 0.5) * FIRE.cell, z = (j + 0.5) * FIRE.cell;
    const edge = NEIGHBOURS.some(([di, dj]) => { const n = cellId(i + di, j + dj); return grid.cells.has(n) && !burning.has(n) && !burnt.has(n); });
    const down = wind?.speed > 0 ? ((x - cx) * wind.toward.x + (z - cz) * wind.toward.z) / FIRE.cell : 0;
    const score = (edge ? 200 : 0) + percent + 15 * down;
    if (score > bestScore) { bestScore = score; best = cell; }
  }
  return best;
}

// ---- the fire's clock (section 4.2) -----------------------------------------
// One spread step for every 200 s the engine runs, on any course; three at the
// start of each new play day; nothing while the game is closed or in a race.
// Steps stop as soon as the fire is lost. The engine seconds below a step are
// kept in the record without rounding, so a frame at a time adds up.

export const cruiseSeconds = fuelKg => Number(fuelKg) > 0 ? Number(fuelKg) / FIRE.cruiseKgPerSecond : 0;

function runSteps(fire, grid, wind, count) {
  let steps = 0;
  while (steps < count && !fireLost(fire, grid) && !fireOut(fire)) { fire = spreadStep(fire, grid, wind); steps++; }
  return {fire, steps, lost: fireLost(fire, grid)};
}

export function runFireEngine(fire, grid, seconds, wind) {
  if (!(seconds > 0)) return {fire, steps: 0, lost: fireLost(fire, grid)};
  const total = (fire.engineSeconds || 0) + seconds, due = Math.floor(total / FIRE.stepSeconds + 1e-9);
  const result = runSteps(fire, grid, wind, due);
  return {...result, fire: {...result.fire, engineSeconds: Math.max(0, total - due * FIRE.stepSeconds)}};
}

export function fireNewDay(fire, grid, wind) {
  return runSteps(fire, grid, wind, FIRE.dayStepCount);
}

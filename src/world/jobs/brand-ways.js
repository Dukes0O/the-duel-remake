// The ways a walker can take through Tin Town in "Light the Town" (EVERBURN-REMAKE, job 2), for the marker on the screen.
//
// The marker used to point straight at the next lamp, through the forge's crane and through shacks, and a player who
// followed it stood against a wall (Claude's hand plays, 17 November 2026). Here the town is cut into 2 m squares once;
// for each place a walker is sent to (the hearth and the three lamps) every clear square learns how far it is from that
// place on foot and which neighbouring square is the next step toward it. Asking for an aim then costs a few sight
// checks, so it can be asked several times a second.
//
// Presentation only: nothing here moves a walker, lights a lamp or changes the job.
import {BRAND_RULE} from './brand-rule.js';
import {pushOutOfSolids, SOLID_GRID} from '../scablands-solids.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';

export const BRAND_WAYS = Object.freeze({
  cellMetres: 2,
  // Wider than the player's walker (0.34 m) and the Ash Men (0.4 m), so that the way shown does not scrape along a wall.
  walkerRadius: .45,
  sampleMetres: .5,
  marginMetres: 6,
  // How many squares ahead along the way the aim may be set, when it can be seen from where the walker stands.
  lookAheadCells: 14,
  // The walker stands this far inside a place's reach when the way ends (a lamp is lit from 2 m, the hearth gives a
  // brand from 3 m).
  reachInsetMetres: .4,
  // A sight check from where the walker stands is narrower than the way itself, and leaves out the walker's own spot:
  // a walker may be standing against a wall.
  sightRadius: .3,
});

const NEIGHBOURS = Object.freeze([[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const spot = value => value?.position ?? value;

// Whether a walker can go straight from a to b. `y` is the ground's height there (the town is nearly level, so one height
// serves a short stretch).
function clearWay(a, b, grid, y, radius = BRAND_WAYS.walkerRadius, first = 0) {
  const parts = Math.max(1, Math.ceil(gap(a, b) / BRAND_WAYS.sampleMetres));
  for (let i = first; i <= parts; i++) {
    const x = a.x + (b.x - a.x) * i / parts, z = a.z + (b.z - a.z) * i / parts;
    if (pushOutOfSolids(x, z, radius, grid, y).hit) return false;
  }
  return true;
}

// `places` are the hearth and the lamps ({id, position}); `around` are further points the town reaches to (its wall
// entries), so that the squares cover the whole town. `reach(place)` is how near a walker must come to use the place.
export function createBrandWays({places, around = [], grid = SOLID_GRID, reach = () => BRAND_RULE.lampRadius}) {
  const rule = BRAND_WAYS, cell = rule.cellMetres;
  const points = [...places, ...around].map(spot);
  const minX = Math.min(...points.map(p => p.x)) - rule.marginMetres, minZ = Math.min(...points.map(p => p.z)) - rule.marginMetres;
  const columns = Math.ceil((Math.max(...points.map(p => p.x)) + rule.marginMetres - minX) / cell) + 1;
  const rows = Math.ceil((Math.max(...points.map(p => p.z)) + rule.marginMetres - minZ) / cell) + 1;
  const count = columns * rows;
  const centre = index => ({x: minX + (index % columns) * cell, z: minZ + Math.floor(index / columns) * cell});
  const height = new Float32Array(count), open = new Uint8Array(count), links = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const at = centre(index);
    height[index] = scablandsSurfaceHeightAt(at.x, at.z);
    open[index] = pushOutOfSolids(at.x, at.z, rule.walkerRadius, grid, height[index]).hit ? 0 : 1;
  }
  // Each pair of neighbouring squares is tried once; a bit in `links` says the step in that direction is clear.
  for (let index = 0; index < count; index++) {
    if (!open[index]) continue;
    const column = index % columns, row = Math.floor(index / columns), from = centre(index);
    for (let way = 0; way < 4; way++) {
      const c = column + NEIGHBOURS[way][0], r = row + NEIGHBOURS[way][1];
      if (c < 0 || c >= columns || r < 0 || r >= rows) continue;
      const other = r * columns + c;
      if (!open[other] || !clearWay(from, centre(other), grid, height[index])) continue;
      links[index] |= 1 << way;
      links[other] |= 1 << (way + 4);
    }
  }
  const fields = new Map();
  function fieldFor(place) {
    if (fields.has(place.id)) return fields.get(place.id);
    const goal = spot(place), within = Math.max(.5, reach(place) - rule.reachInsetMetres);
    const metres = new Float64Array(count).fill(Infinity), next = new Int32Array(count).fill(-1), stops = new Map();
    // The squares from which the place itself can be walked up to are where every way ends.
    const heap = [];
    const push = (index, value) => {
      heap.push([value, index]);
      for (let i = heap.length - 1; i > 0;) {
        const parent = (i - 1) >> 1;
        if (heap[parent][0] <= heap[i][0]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]]; i = parent;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        for (let i = 0;;) {
          const a = i * 2 + 1, b = a + 1;
          let least = i;
          if (a < heap.length && heap[a][0] < heap[least][0]) least = a;
          if (b < heap.length && heap[b][0] < heap[least][0]) least = b;
          if (least === i) break;
          [heap[least], heap[i]] = [heap[i], heap[least]]; i = least;
        }
      }
      return top;
    };
    const span = Math.ceil((within + cell * 2) / cell);
    const gc = Math.round((goal.x - minX) / cell), gr = Math.round((goal.z - minZ) / cell);
    for (let r = gr - span; r <= gr + span; r++) for (let c = gc - span; c <= gc + span; c++) {
      if (c < 0 || c >= columns || r < 0 || r >= rows) continue;
      const index = r * columns + c;
      if (!open[index]) continue;
      const from = centre(index), away = gap(from, goal);
      // The place may itself be solid (a lamp is a post): the way ends at the nearest point within its reach.
      const stop = away <= within ? from
        : {x: goal.x + (from.x - goal.x) * within / away, z: goal.z + (from.z - goal.z) * within / away};
      if (away > within + cell * 2 || !clearWay(from, stop, grid, height[index])) continue;
      const value = gap(from, stop);
      if (value < metres[index]) { metres[index] = value; stops.set(index, stop); push(index, value); }
    }
    while (heap.length) {
      const [value, index] = pop();
      if (value > metres[index]) continue;
      const column = index % columns, row = Math.floor(index / columns);
      for (let way = 0; way < 8; way++) {
        if (!(links[index] & (1 << way))) continue;
        const other = (row + NEIGHBOURS[way][1]) * columns + column + NEIGHBOURS[way][0];
        const through = value + (way % 2 ? cell * Math.SQRT2 : cell);
        if (through < metres[other]) { metres[other] = through; next[other] = index; stops.delete(other); push(other, through); }
      }
    }
    const field = {goal, metres, next, stops};
    fields.set(place.id, field);
    return field;
  }
  const byId = new Map(places.map(place => [place.id, place]));

  // Where a walker at `from` should head for the place, and how far the walk is: {x, z, metres, direct}. `direct` says the
  // aim is the place itself (it can be walked straight up to). Null when no way is known from there (the caller then
  // points straight at the place, as before).
  function trace(from, placeId, fullPath) {
    const place = byId.get(placeId);
    if (!place || !Number.isFinite(from?.x) || !Number.isFinite(from?.z)) return null;
    const field = fieldFor(place), y = scablandsSurfaceHeightAt(from.x, from.z);
    const seen = to => clearWay(from, to, grid, y, rule.sightRadius, 1);
    const fc = Math.round((from.x - minX) / cell), fr = Math.round((from.z - minZ) / cell);
    let start = -1, least = Infinity;
    for (let r = fr - 1; r <= fr + 1; r++) for (let c = fc - 1; c <= fc + 1; c++) {
      if (c < 0 || c >= columns || r < 0 || r >= rows) continue;
      const index = r * columns + c;
      if (!Number.isFinite(field.metres[index])) continue;
      const at = centre(index), total = field.metres[index] + gap(from, at);
      if (total < least && seen(at)) { least = total; start = index; }
    }
    if (start < 0) return null;
    if (fullPath) {
      const path = [centre(start)];
      let index = start;
      while (field.next[index] >= 0) {
        index = field.next[index];
        path.push(centre(index));
      }
      const stop = field.stops.get(index);
      if (gap(path.at(-1), stop) > 0) path.push(stop);
      return path;
    }
    // Follow the way a few squares on and keep the farthest point that can be walked straight to.
    let best = start, index = start;
    for (let ahead = 0; ahead < rule.lookAheadCells && field.next[index] >= 0; ahead++) {
      index = field.next[index];
      if (seen(centre(index))) best = index;
    }
    const stop = field.stops.get(index);
    if (stop && seen(stop)) return {x: field.goal.x, z: field.goal.z, metres: gap(from, field.goal), direct: true};
    const at = centre(best);
    return {x: at.x, z: at.z, metres: gap(from, at) + field.metres[best] + Math.max(.5, reach(place) - rule.reachInsetMetres), direct: false};
  }
  return {
    aim: (from, placeId) => trace(from, placeId, false),
    path: (from, placeId) => trace(from, placeId, true),
    cells: count,
  };
}

// One set of ways for each job step and its solids, made when first asked for. `prepareBrandWays` makes it and the four
// places' fields ahead of time (about a tenth of a second in all), so that the walker's first step out of the car does
// not wait for it; the screen calls it during the countdown.
const kept = new WeakMap();
export function brandWaysFor(step, grid = SOLID_GRID) {
  if (!step?.brand || !step.hearth || !step.places?.length) return null;
  let ways = kept.get(step);
  if (!ways || ways.grid !== grid) {
    ways = {grid, ways: createBrandWays({places: [step.hearth, ...step.places], around: step.wayAround ?? step.ashEntries ?? [], grid,
      reach: place => place.id === step.hearth.id ? BRAND_RULE.relightRadius : BRAND_RULE.lampRadius})};
    kept.set(step, ways);
  }
  return ways.ways;
}

const prepared = new WeakSet();
export function prepareBrandWays(step, grid = SOLID_GRID) {
  const ways = brandWaysFor(step, grid);
  if (!ways || prepared.has(ways)) return;
  prepared.add(ways);
  const from = step.hearth.position ?? step.hearth;
  for (const place of [step.hearth, ...step.places]) ways.aim(from, place.id);
}

// The way back to the car on foot in Run Him Down (EVERBURN-REMAKE job 3), which starts among the shacks 60 m from the
// car: the same squares, with the parked car as the one place. `around` are the town's wall entries (its extent). Made
// again only if the car has moved. Only for a car that stands inside the town: the squares cover everything between
// the town and the places asked for, so a car parked a kilometre down the road would make hundreds of thousands of them
// and stop the game for seconds (found by the review of slice 14); out there the arrow points straight, as it always did.
const carWays = new WeakMap(), townBoxes = new WeakMap();
export function townCarWay(step, grid, car, around) {
  if (!step || !grid || !Number.isFinite(car?.x) || !Number.isFinite(car?.z) || !around?.length) return null;
  let box = townBoxes.get(around);
  if (!box) {
    const points = around.map(spot);
    box = {minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
      minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z))};
    townBoxes.set(around, box);
  }
  if (car.x < box.minX || car.x > box.maxX || car.z < box.minZ || car.z > box.maxZ) return null;
  const key = `${Math.round(car.x * 2)},${Math.round(car.z * 2)}`;
  let kept = carWays.get(step);
  if (!kept || kept.grid !== grid || kept.key !== key) {
    kept = {grid, key, ways: createBrandWays({places: [{id: 'car', position: {x: car.x, z: car.z}}], around, grid, reach: () => 3})};
    carWays.set(step, kept);
  }
  return kept.ways;
}

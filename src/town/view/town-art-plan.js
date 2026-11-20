// TOWN-VIEW-ART: where each art piece stands, worked out from the town's own records. No graphics here: this file
// reads the town and returns a list of placements for town-art.js to draw. It never writes the town and never uses
// the town's random stream. Ruins, sites and street wear come from the town's records (building states, fires, plot
// tiers, the book's dead, how many roads came after each road); the only chance is the street things' scatter, and
// that comes from each road cell's own seeded stream (src/rng.js), seeded from the town's seed and the cell.
import {makeRng} from '../../rng.js';
import {SCABLANDS_PLACES} from '../../world/scablands.js';
import {TOWN_CELL_METRES} from '../town-world-data.js';
import {TOWN_BUILDING_ART, TOWN_HOME_ART, TOWN_LINE_ART, TOWN_LINE_RUIN, TOWN_RUIN_ART, TOWN_SITE_ART, TOWN_SITE_MACHINES,
  TOWN_STREET_RULE, TOWN_STREET_THINGS, TOWN_UTILITY_ART, TOWN_WORLD_ART} from './town-art-table.js';

const CELL = TOWN_CELL_METRES;
// A road slab's top above its cell's ground (town-instances.js; town-walkers.js keeps its people on it).
export const TOWN_ART_ROAD_TOP = 0.15;
const TICKS_PER_YEAR = 24 * 30 * 12;
const SITE_STATES = new Set(['plan', 'foundation', 'frame', 'finishing']);
const DIRS = Object.freeze({N:[0, -1], E:[1, 0], S:[0, 1], W:[-1, 0]});
// The turn that points a piece's front (-Z) out of a road cell's side toward its middle, by the side it stands on.
const FACE_ROAD = Object.freeze({S:0, N:Math.PI, E:Math.PI / 2, W:-Math.PI / 2});
const mod = (value, by) => ((value % by) + by) % by;

/** A fixed number in [0, 1) for one text in one town's view, from the town's seed. */
export function townArtHash(seed, text) {
  let hash = (2166136261 ^ (seed >>> 0)) >>> 0;
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  hash ^= hash >>> 15; hash = Math.imul(hash, 2246822519) >>> 0; hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
}
/** The view's own seed for the art: from the town's seed, never from its random state. */
export const townArtSeed = town => ((Number(town?.seed) || 1) ^ 0x2c1b3c6d) >>> 0;

const rotateDir = ([x, z], turn) => [Math.round(x * Math.cos(turn) + z * Math.sin(turn)), Math.round(-x * Math.sin(turn) + z * Math.cos(turn))];
const TURNS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
/** The quarter turn that carries a corner piece authored between edges `authored` (two of N, E, S, W) onto `wanted`. */
export function townCornerTurn(authored, wanted) {
  const goal = new Set(wanted.split(''));
  for (const turn of TURNS) {
    const edges = authored.split('').map(edge => rotateDir(DIRS[edge], turn))
      .map(([x, z]) => Object.keys(DIRS).find(key => DIRS[key][0] === x && DIRS[key][1] === z));
    if (edges.every(edge => goal.has(edge))) return turn;
  }
  return 0;
}

/**
 * Which of a tier's `count` models stands on cell (x, z). Along a row the cells take turns between two halves of the
 * list, and the same is done down a column, so no two homes side by side, or back to back, are the same model.
 */
export function townHomeVariant(x, z, count, seed = 1) {
  if (count <= 1) return 0;
  const half = Math.floor(count / 2);
  const pick = (value, salt) => {
    const odd = mod(value, 2) === 1, from = odd ? half : 0, span = odd ? count - half : half;
    return from + Math.floor(townArtHash(seed, `${salt}${value}`) * span);
  };
  return mod(pick(x, 'hx') + pick(z, 'hz'), count);
}

/**
 * How old a road is, in game years. The town keeps no date for a finished road, so the view takes the road's place in
 * the order roads were laid: the first road is as old as the town, and road r of R is (R - r) / R of its age, as if
 * roads were laid at an even pace. It only grows as the town grows.
 */
export function townStreetYears(town, roadRank, roadCount) {
  const years = Math.max(0, Number(town?.tick ?? 0)) / TICKS_PER_YEAR;
  return roadCount > 0 ? years * (roadCount - roadRank) / roadCount : 0;
}
/** How much clutter a street of this age has, 0 to 1. */
export const townStreetWear = years => 1 - Math.exp(-Math.max(0, years) / TOWN_STREET_RULE.yearsScale);

function cellKey(x, z) { return `${x}:${z}`; }
function seedFor(seed, ...parts) { return Math.floor(townArtHash(seed, parts.join(':')) * 4294967296) >>> 0 || 1; }

function indexTown(town) {
  const cells = new Map(), roads = [], lines = new Map(), utilities = new Map();
  for (const building of town?.buildings ?? []) {
    if (!building || (building.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(building.x) || !Number.isFinite(building.z)) continue;
    const id = String(building.buildingId ?? '');
    const width = Math.max(1, building.width || 1), depth = Math.max(1, building.depth || 1);
    const kind = id.startsWith('road-') ? 'road' : TOWN_LINE_ART[id] ? 'line' : /^(pipe|sewer|wire)-/.test(id) ? 'utility' : 'building';
    if (kind === 'road') roads.push(building);
    for (let dx = 0; dx < width; dx++) for (let dz = 0; dz < depth; dz++) {
      const key = cellKey(building.x + dx, building.z + dz);
      if (kind === 'line') lines.set(key, building);
      else if (kind === 'utility') {
        const group = id.split('-')[0];
        if (!utilities.has(group)) utilities.set(group, new Map());
        utilities.get(group).set(key, building);
      } else if (!cells.has(key) || kind !== 'road') cells.set(key, {kind, item:building});
    }
  }
  for (const plot of town?.homePlots ?? []) {
    if (!plot || (plot.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(plot.x)) continue;
    const key = cellKey(plot.x, plot.z);
    if (!cells.has(key)) cells.set(key, {kind:'plot', item:plot});
  }
  return {cells, roads, lines, utilities};
}

const neighbours = (map, x, z) => Object.fromEntries(Object.entries(DIRS).map(([edge, [dx, dz]]) => [edge, map.has(cellKey(x + dx, z + dz))]));

/** The pieces a run of cells needs on one cell: straight, corner or end, by which neighbours share the run. */
export function townLinePieces(near, {straight, corner, end, cornerEdges}) {
  const edges = Object.keys(near).filter(edge => near[edge]), across = edge => edge === 'E' || edge === 'W';
  if (edges.length === 0) return [{node:straight, turn:0}];
  if (edges.length === 1) return [{node:end, turn:across(edges[0]) ? 0 : Math.PI / 2}];
  if (edges.length === 2) {
    if (across(edges[0]) === across(edges[1])) return [{node:straight, turn:across(edges[0]) ? 0 : Math.PI / 2}];
    return [{node:corner, turn:townCornerTurn(cornerEdges, edges.join(''))}];
  }
  return [{node:straight, turn:0}, {node:straight, turn:Math.PI / 2}];
}

function place(list, family, node, x, y, z, extra = {}) {
  list.push({key:`${family}/${node}`, family, node, x, y, z, turn:extra.turn ?? 0, sx:extra.sx ?? 1, sy:extra.sy ?? 1, sz:extra.sz ?? 1,
    kind:extra.kind ?? 'building', item:extra.item ?? null});
}

function fitted(width, depth, size) {
  // A stage or ruin piece drawn for n by n cells is 8n - 1 m across; it is fitted to the plot in plan, not in height.
  const across = 8 * size - 1;
  return {sx:(width * CELL - 1) / across, sz:(depth * CELL - 1) / across};
}

function ruinPiece(building, width, depth, list, kind) {
  const size = Math.max(1, Math.min(4, Math.max(width, depth)));
  const node = TOWN_RUIN_ART[kind][size - 1];
  const x = (building.x + width / 2) * CELL, z = (building.z + depth / 2) * CELL;
  place(list, 'stages', node, x, building.groundY ?? 0, z, {...fitted(width, depth, size), kind:kind === 'burnt' ? 'burnt' : 'rubble', item:building});
}

function sitePiece(item, width, depth, stage, list, y = item.groundY ?? 0) {
  const node = TOWN_SITE_ART[stage] ?? TOWN_SITE_ART.plan, size = Math.max(1, Math.min(4, Number(node.split('-')[1]) || 1));
  const x = (item.x + width / 2) * CELL, z = (item.z + depth / 2) * CELL;
  place(list, 'stages', node, x, y, z, {...fitted(width, depth, size), kind:'site', item});
}

function buildingPieces(building, art, list, context) {
  const width = Math.max(1, building.width || 1), depth = Math.max(1, building.depth || 1), state = String(building.state ?? 'plan');
  const y = building.groundY ?? 0, cx = (building.x + width / 2) * CELL, cz = (building.z + depth / 2) * CELL;
  if (state.startsWith('burnt')) return ruinPiece(building, width, depth, list, 'burnt');
  if (state === 'ruined') return ruinPiece(building, width, depth, list, 'rubble');
  if (SITE_STATES.has(state)) {
    sitePiece(building, width, depth, state, list);
    const machines = TOWN_SITE_MACHINES[state];
    if (machines && Math.max(width, depth) >= 2) for (const machine of machines)
      place(list, machine.family, machine.node, cx + machine.x * width * CELL / 4, y, building.z * CELL + 3.2, {kind:'machine', item:building});
    return;
  }
  if (!art) {
    context.missing.add(String(building.buildingId));
    return sitePiece(building, width, depth, 'plan', list);
  }
  const [across, deep] = art.tile ?? [1, 1];
  for (let i = 0; i < across; i++) for (let j = 0; j < deep; j++)
    place(list, art.family, art.node, cx + ((i + .5) / across - .5) * width * CELL, y, cz + ((j + .5) / deep - .5) * depth * CELL, {item:building});
  for (const vehicle of art.parked ?? []) place(list, vehicle.family, vehicle.node, cx + vehicle.x, y, cz + vehicle.z, {turn:vehicle.turn, kind:'parked', item:building});
  if (art.markers) {
    // Twelve graves to a ground, filled in the order the grounds were built, one for each of the town's dead.
    const shown = Math.max(0, Math.min(art.markers.length, context.dead - context.buried));
    context.buried += shown;
    for (let index = 0; index < shown; index++) list.push({...list.find(entry => entry.item === building && entry.node === art.node),
      key:`${art.family}/${art.node}#${art.markers[index]}`, node:`${art.node}#${art.markers[index]}`, kind:'marker'});
  }
}

function linePieces(index, list) {
  const byKind = new Map();
  for (const [key, building] of index.lines) {
    if (!byKind.has(building.buildingId)) byKind.set(building.buildingId, new Map());
    byKind.get(building.buildingId).set(key, building);
  }
  for (const [key, building] of index.lines) {
    const art = TOWN_LINE_ART[building.buildingId], [x, z] = key.split(':').map(Number), state = String(building.state ?? 'plan');
    const y = building.groundY ?? 0, cx = (x + .5) * CELL, cz = (z + .5) * CELL;
    if (state === 'ruined' || state.startsWith('burnt')) { place(list, 'stages', TOWN_LINE_RUIN, cx, y, cz, {kind:'rubble', item:building}); continue; }
    const same = byKind.get(building.buildingId);
    for (const pieceAt of townLinePieces(neighbours(same, x, z), art)) place(list, art.family, pieceAt.node, cx, y, cz, {turn:pieceAt.turn, kind:'line', item:building});
  }
}

function utilityPieces(index, list, seed) {
  for (const [group, cells] of index.utilities) for (const [key, building] of cells) {
    const [x, z] = key.split(':').map(Number), state = String(building.state ?? 'plan'), near = neighbours(cells, x, z);
    const y = building.groundY ?? 0, cx = (x + .5) * CELL, cz = (z + .5) * CELL;
    const count = Object.values(near).filter(Boolean).length, through = count === 2 && (near.E && near.W || near.N && near.S);
    if (group === 'wire') {
      // A pole every few cells along a line of wires, and at each end and turn; its cross arm stands across the wire.
      if (!through || mod(x + z, TOWN_UTILITY_ART.poleEvery) === 0)
        place(list, TOWN_UTILITY_ART.pole.family, TOWN_UTILITY_ART.pole.node, cx, y, cz, {turn:near.E || near.W ? Math.PI / 2 : 0, kind:'utility', item:building});
      continue;
    }
    if (SITE_STATES.has(state)) {
      const pieces = townLinePieces(near, {straight:'trench', end:'trench', corner:'trench-corner', cornerEdges:TOWN_UTILITY_ART.trenchCorner.cornerEdges});
      for (const pieceAt of pieces) place(list, 'works', pieceAt.node, cx, y, cz, {turn:pieceAt.turn, kind:'utility', item:building});
      if (mod(x * 7 + z * 13, TOWN_SITE_MACHINES.pipeEvery) === 0) {
        const machine = TOWN_SITE_MACHINES.pipe;
        place(list, machine.family, machine.node, cx, y, cz, {turn:near.E || near.W ? Math.PI / 2 : 0, kind:'machine', item:building});
      }
    } else if (!through && !state.startsWith('burnt') && state !== 'ruined')
      place(list, TOWN_UTILITY_ART.valve.family, TOWN_UTILITY_ART.valve.node, cx, y, cz, {turn:townArtHash(seed, `valve:${key}`) < .5 ? 0 : Math.PI, kind:'utility', item:building});
  }
}

function homePieces(town, list, seed) {
  for (const plot of town?.homePlots ?? []) {
    if (!plot || (plot.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(plot.x)) continue;
    const y = plot.groundY ?? 0, x = (plot.x + .5) * CELL, z = (plot.z + .5) * CELL;
    if (plot.burning || plot.burnt && !(plot.household && plot.building)) { ruinPiece(plot, 1, 1, list, 'burnt'); continue; }
    const options = TOWN_HOME_ART[Math.max(0, Math.min(TOWN_HOME_ART.length - 1, Number(plot.tier) || 0))];
    if (Number(plot.tier) > 0 && options) {
      place(list, 'homes', options[townHomeVariant(plot.x, plot.z, options.length, seed)], x, y, z, {kind:'home', item:plot});
    } else if (plot.household && plot.building) {
      const stage = Math.max(1, Math.min(4, Math.ceil(((plot.progressDays || 0) + 1) / Math.max(1, (plot.nextDays || 2) / 4))));
      sitePiece(plot, 1, 1, ['plan', 'foundation', 'frame', 'finishing'][stage - 1], list);
    }
  }
}

function groundWaterPieces(town, index, list, groundAt) {
  const water = town?.regions?.scablands?.groundWater;
  if (!water) return;
  const free = (x, z) => !index.cells.has(cellKey(x, z));
  for (const well of Object.values(water.wells ?? {})) if (Number.isFinite(well?.x) && free(well.x, well.z)) {
    const x = (well.x + .5) * CELL, z = (well.z + .5) * CELL;
    if (well.drilled) place(list, 'plants', 'wellhead', x, groundAt(x, z), z, {kind:'well', item:well});
    else place(list, 'water', 'hand-well', x, groundAt(x, z), z, {kind:'well', item:well});
  }
  for (const job of Object.values(water.wellJobs ?? {})) if (Number.isFinite(job?.x) && free(job.x, job.z)) {
    const x = (job.x + .5) * CELL, z = (job.z + .5) * CELL;
    sitePiece(job, 1, 1, 'plan', list, groundAt(x, z));
  }
  for (const [key, pit] of Object.entries(water.pits ?? {})) {
    if (!Number.isFinite(pit?.x) || !free(pit.x, pit.z) || water.wells?.[key] || water.wellJobs?.[key]) continue;
    const x = (pit.x + .5) * CELL, z = (pit.z + .5) * CELL;
    place(list, 'works', 'test-pit', x, groundAt(x, z), z, {kind:'pit', item:pit});
  }
}

function roadDirection(roads, road) {
  const near = neighbours(roads, road.x, road.z);
  return near.E || near.W ? 'x' : 'z';
}

/**
 * The things standing along one finished road cell. Each cell draws from its own stream in a fixed order whatever its
 * age, so an older street keeps every thing it had and only gains more.
 */
export function townStreetThings({road, wear, seed, cells, roads}) {
  const things = [], rule = TOWN_STREET_RULE, width = Math.max(1, road.width || 1), depth = Math.max(1, road.depth || 1);
  const total = TOWN_STREET_THINGS.reduce((sum, thing) => sum + thing.weight, 0);
  for (let dx = 0; dx < width; dx++) for (let dz = 0; dz < depth; dz++) {
    const x = road.x + dx, z = road.z + dz, cx = (x + .5) * CELL, cz = (z + .5) * CELL, y = (road.groundY ?? 0) + TOWN_ART_ROAD_TOP;
    for (const side of ['N', 'E', 'S', 'W']) {
      const [ox, oz] = DIRS[side], other = cells.get(cellKey(x + ox, z + oz));
      const rng = makeRng(seedFor(seed, 'street', x, z, side));
      if (roads.has(cellKey(x + ox, z + oz))) continue;
      // The building or home across this side has its door on this side when it lies to +Z (its front faces -Z).
      const door = side === 'S' && other ? (other.item.x + Math.max(1, other.item.width || 1) / 2) * CELL - cx : null;
      const spots = [];
      for (let slot = 0; slot < rule.perSide; slot++) {
        const chance = rng.float(), choice = rng.float() * total, along = rng.range(-3.1, 3.1), inset = rng.range(...rule.edgeInset), jitter = rng.range(-.25, .25);
        if (chance >= wear * (slot ? rule.secondShare : 1)) continue;
        let thing = TOWN_STREET_THINGS[0];
        for (let sum = 0, k = 0; k < TOWN_STREET_THINGS.length; k++) { sum += TOWN_STREET_THINGS[k].weight; if (choice < sum) { thing = TOWN_STREET_THINGS[k]; break; } }
        if (thing.minAge && wear < thing.minAge) continue;
        if (thing.homes && other?.kind !== 'plot') thing = TOWN_STREET_THINGS[0];
        if (door !== null && Math.abs(along - door) < rule.doorClear) continue;
        if (spots.some(spot => Math.abs(spot - along) < 1.6)) continue;
        spots.push(along);
        const across = CELL / 2 - inset;
        const px = ox ? cx + ox * across : cx + along, pz = oz ? cz + oz * across : cz + along;
        things.push({node:thing.node, x:px, y, z:pz, turn:FACE_ROAD[side] + jitter, side});
      }
    }
    // Street lamps keep to one side, on every few cells of a street a year or so old.
    if (wear >= rule.lampAge && mod(x + z, rule.lampEvery) === 0) {
      const side = ['N', 'W', 'S', 'E'].find(edge => !roads.has(cellKey(x + DIRS[edge][0], z + DIRS[edge][1])));
      if (side) {
        const [ox, oz] = DIRS[side], across = CELL / 2 - .45;
        things.push({node:'street-lamp', x:ox ? cx + ox * across : cx + 3.3, y, z:oz ? cz + oz * across : cz + 3.3, turn:FACE_ROAD[side], side});
      }
    }
  }
  return things;
}

function streetPieces(town, index, list, seed) {
  const roads = new Map();
  for (const road of index.roads) for (let dx = 0; dx < (road.width || 1); dx++) for (let dz = 0; dz < (road.depth || 1); dz++) roads.set(cellKey(road.x + dx, road.z + dz), road);
  const count = index.roads.length;
  index.roads.forEach((road, rank) => {
    const state = String(road.state ?? 'plan'), width = Math.max(1, road.width || 1), depth = Math.max(1, road.depth || 1);
    if (SITE_STATES.has(state)) {
      const machine = TOWN_SITE_MACHINES.road[road.buildingId];
      if (machine && mod(road.x * 7 + road.z * 13, TOWN_SITE_MACHINES.roadEvery) === 0)
        place(list, machine.family, machine.node, (road.x + width / 2) * CELL, road.groundY ?? 0, (road.z + depth / 2) * CELL,
          {turn:roadDirection(roads, road) === 'x' ? Math.PI / 2 : 0, kind:'machine', item:road});
      return;
    }
    if (state !== 'finished') return;
    const wear = townStreetWear(townStreetYears(town, rank, count));
    for (const thing of townStreetThings({road, wear, seed, cells:index.cells, roads}))
      place(list, 'stages', thing.node, thing.x, thing.y, thing.z, {turn:thing.turn, kind:'street', item:road});
  });
}

function facing(fromX, fromZ, toX, toZ) { return Math.atan2(-(toX - fromX), -(toZ - fromZ)); }

function worldPieces(town, index, list, groundAt) {
  for (const entry of TOWN_WORLD_ART.dome) {
    const [ax, az] = entry.authoredAt ?? [0, 0], c = Math.cos(entry.turn), s = Math.sin(entry.turn);
    const x = entry.x + ax * c + az * s, z = entry.z - ax * s + az * c;
    place(list, entry.family, entry.node, x, groundAt(entry.x, entry.z), z, {turn:entry.turn, kind:'world'});
  }
  for (const entry of TOWN_WORLD_ART.outposts) {
    const near = SCABLANDS_PLACES.find(item => item.id === entry.near);
    if (!near) continue;
    let x, z, turn;
    if (entry.share) {
      const length = Math.hypot(near.x, near.z) || 1, ux = near.x / length, uz = near.z / length;
      const rx = near.x * entry.share, rz = near.z * entry.share;
      x = rx + uz * entry.side; z = rz - ux * entry.side; turn = facing(x, z, rx, rz);
    } else { x = near.x + entry.offset[0]; z = near.z + entry.offset[1]; turn = facing(x, z, near.x, near.z); }
    place(list, entry.family, entry.node, x, groundAt(x, z), z, {turn, kind:'outpost', item:{neighbour:entry.neighbour}});
  }
  const vane = town?.vane;
  if (vane?.started) {
    const yard = TOWN_WORLD_ART.vaneYard;
    for (const entry of yard.pieces) {
      const x = yard.x + entry.x, z = yard.z + entry.z;
      place(list, entry.family, entry.node, x, groundAt(x, z), z, {turn:entry.turn, kind:'vane'});
    }
    const {node, half, step} = yard.fence;
    for (const [edge, turn] of [['N', 0], ['S', Math.PI], ['E', -Math.PI / 2], ['W', Math.PI / 2]]) {
      for (let along = -half + step / 2, slot = 0; along < half; along += step, slot++) {
        if (edge === 'W' && Math.abs(along) < step) continue;
        const x = yard.x + (edge === 'E' ? half : edge === 'W' ? -half : along), z = yard.z + (edge === 'S' ? half : edge === 'N' ? -half : along);
        place(list, 'vane', node, x, groundAt(x, z), z, {turn, kind:'vane'});
      }
    }
  }
  // Her kiosks stand on open ground beside the street they are on.
  for (const kiosk of vane?.kiosks ?? []) {
    if (kiosk?.open === false) continue;
    const road = index.roads.find(item => item.id === kiosk.streetId);
    if (!road) continue;
    const side = ['S', 'E', 'N', 'W'].find(edge => !index.cells.has(cellKey(road.x + DIRS[edge][0], road.z + DIRS[edge][1])));
    if (!side) continue;
    const x = (road.x + DIRS[side][0] + .5) * CELL, z = (road.z + DIRS[side][1] + .5) * CELL;
    place(list, 'vane', 'vane-kiosk', x, road.groundY ?? groundAt(x, z), z, {turn:FACE_ROAD[side], kind:'vane', item:kiosk});
  }
}

/**
 * Every art piece the town needs drawn, from its records. `world` adds the Dome, the neighbours' outposts and Mrs
 * Vane's yard (the town view); the drive leaves them to the Scablands' own scenery. Returns the placements and the
 * building ids that have no art row.
 */
export function townArtPlan(town, {seed = townArtSeed(town), world = true, groundAt = () => 0} = {}) {
  const placements = [], index = indexTown(town);
  const dead = (town?.book ?? []).filter(event => event?.type === 'passing').length;
  const context = {missing:new Set(), dead, buried:0};
  for (const building of town?.buildings ?? []) {
    if (!building || (building.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(building.x) || !Number.isFinite(building.z)) continue;
    const id = String(building.buildingId ?? '');
    if (id.startsWith('road-') || TOWN_LINE_ART[id] || /^(pipe|sewer|wire)-/.test(id)) continue;
    buildingPieces(building, TOWN_BUILDING_ART[id], placements, context);
  }
  linePieces(index, placements);
  utilityPieces(index, placements, seed);
  homePieces(town, placements, seed);
  groundWaterPieces(town, index, placements, groundAt);
  streetPieces(town, index, placements, seed);
  if (world) worldPieces(town, index, placements, groundAt);
  return {placements, missing:[...context.missing].sort()};
}

/** The building ids in a list of content rows that the view has no art for. */
export function townArtMissing(rows) {
  return rows.map(row => row.id).filter(id => !id.startsWith('road-') && !/^(pipe|sewer|wire)-/.test(id) && !TOWN_LINE_ART[id] && !TOWN_BUILDING_ART[id]);
}

/** What the plan depends on, as one string: when it is unchanged, so is the plan (apart from the town's year). */
export function townArtSignature(town) {
  const buildings = town?.buildings ?? [], plots = town?.homePlots ?? [];
  let text = `${buildings.length}|${plots.length}|${Math.floor(Number(town?.tick ?? 0) / (TICKS_PER_YEAR / 12))}|`;
  for (const building of buildings) text += `${building?.id}${building?.state}${building?.x},${building?.z};`;
  for (const plot of plots) text += `${plot?.id}${plot?.tier}${plot?.household ? 1 : 0}${plot?.building ? 1 : 0}${plot?.burning ? 1 : 0}${plot?.burnt ? 1 : 0}${plot?.progressDays ?? 0};`;
  const water = town?.regions?.scablands?.groundWater;
  if (water) text += `${Object.keys(water.pits ?? {}).length},${Object.keys(water.wellJobs ?? {}).length},${Object.keys(water.wells ?? {}).length}`;
  const vane = town?.vane;
  if (vane) text += `|v${vane.started ? 1 : 0}${(vane.kiosks ?? []).map(kiosk => `${kiosk.id}${kiosk.open === false ? 0 : 1}`).join(',')}`;
  text += `|d${(town?.book ?? []).length}`;
  return text;
}

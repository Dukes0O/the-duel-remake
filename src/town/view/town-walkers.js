// TOWN-VIEW-LIFE: the town's people, carts, trucks and animals as the view draws them.
//
// Drawing only. Everything here reads the town and never writes to it, and its
// randomness comes from its own `makeRng` stream seeded from the town's seed, so
// a town stepped with this view attached reaches exactly the state it reaches
// without it (tools/test-town-view-life.mjs).
//
// A town may hold 10,000 people, so the view draws a sample: about once a second
// it finds who is out of doors near the camera at this game hour, and draws the
// ones with the lowest fixed hash, up to a budget (TOWN_LIFE_BUDGET). The hash
// never changes, so the same people stay drawn while the camera moves a little.
// People walk in real time at a real walking pace, because a game day is 45
// seconds and nobody walks a street in two. Each model part is one instanced
// mesh, so the cost is a fixed number of draw calls whatever the sample.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from 'three/addons/utils/SkeletonUtils.js';
import {makeRng} from '../../rng.js';
import {TOWN_CELL_METRES} from '../town-world-data.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {WILDLIFE_MODELS, WILDLIFE_MODEL_DIR} from '../../wildlife-models.js';

export const TOWN_WALKER_MODELS = Object.freeze({
  walkers:'/assets/models/wasteland/town/walkers.glb',
  trucks:'/assets/models/wasteland/town/trucks-1.glb',
  works:'/assets/models/wasteland/town/works.glb',
});

// The sample. `walkers` people at most, drawn while the camera is nearer than `nearMetres`; the budget falls to
// nothing at `farMetres`, where a person is under three pixels tall. People are looked for within `radiusFactor`
// times the camera's distance of its ground point, and never less than `minRadius`.
export const TOWN_LIFE_BUDGET = Object.freeze({walkers:160, nearMetres:120, farMetres:900, radiusFactor:1.3, minRadius:70,
  refreshSeconds:1, animals:80, vehicles:24});

// Where canvas families sleep before they have a plot: the dirt outside the Dome's gate (docs/WASTELAND_TOWN.md section 1).
export const TOWN_CAMP = Object.freeze({x:0, z:-64});

// Sound cues the view names for what it shows (it plays nothing itself).
export const TOWN_LIFE_SOUNDS = Object.freeze({crowd:'town.crowd'});

// Real walking: about 1.4 m/s with steps of about 0.7 m (adults); children take shorter steps.
const WALK = Object.freeze({adult:{speed:[1.2,1.5],step:.7}, kid:{speed:[1.1,1.6],step:.48}, coat:{speed:[1.1,1.35],step:.55}});
const SITE_STATES = new Set(['plan','foundation','frame']);
const CELL = TOWN_CELL_METRES;
const plainName = name => String(name ?? '').replace(/[\s_.:/[\]]/g, '').toLowerCase();
const fract = value => value - Math.floor(value);
// A second number in [0, 1) from a person's hash, unrelated to the first: the sample takes the lowest hashes, so their
// looks, speeds and spots must not follow the hash itself.
const mix = (hash, salt) => fract(Math.sin(hash * 12.9898 + salt * 78.233) * 43758.5453);

/** A fixed number in [0, 1) for one person in one town's view. */
export function townLifeHash(seed, text) {
  let hash = (2166136261 ^ (seed >>> 0)) >>> 0;
  for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  hash ^= hash >>> 15; hash = Math.imul(hash, 2246822519) >>> 0; hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
}

/** The view's own seed: from the town's seed, never from the town's random state. */
export function townLifeSeed(town) { return ((Number(town?.seed) || 1) ^ 0x51f3a7c1) >>> 0; }

function placeOf(row, kind) {
  const width = Math.max(1, row.width || 1), depth = Math.max(1, row.depth || 1);
  const x = (row.x + width / 2) * CELL, z = (row.z + depth / 2) * CELL;
  // Every town model faces -Z, the road side, so its door is on that edge.
  return {id:row.id, kind, buildingId:row.buildingId ?? null, x, z, halfX:width * CELL / 2, halfZ:depth * CELL / 2,
    door:{x, z:row.z * CELL - 1.1}, cellX:row.x, cellZ:row.z, width, depth};
}

/** Index the places people go, from the town's own records. Rebuild when the town's buildings or plots change. */
export function townLifePlaces(town) {
  const roads = new Map(), taps = [], shops = [], schools = [], sites = [], plots = new Map(), buildings = new Map(), pens = [];
  const reedBeds = [], smokers = [];
  for (const building of town?.buildings ?? []) {
    if ((building.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(building.x) || !Number.isFinite(building.z)) continue;
    const id = String(building.buildingId ?? ''), state = String(building.state ?? 'plan');
    if (state === 'ruined' || state.startsWith('burnt')) continue;
    if (id.startsWith('road-')) {
      for (let dx = 0; dx < (building.width || 1); dx++) for (let dz = 0; dz < (building.depth || 1); dz++)
        roads.set(`${building.x + dx}:${building.z + dz}`, {x:building.x + dx, z:building.z + dz});
      continue;
    }
    if (/^(pipe|sewer|wire|fence|wall)-/.test(id)) continue;
    const place = placeOf(building, 'building');
    buildings.set(building.id, place);
    if (SITE_STATES.has(state)) { sites.push({...place, kind:'site'}); continue; }
    if (id === 'hand-well' || id === 'standpipe') taps.push({...place, kind:'tap'});
    else if (/^(soup-kitchen|trading-post|tavern|bathhouse)$/.test(id)) shops.push({...place, kind:'shop'});
    else if (id === 'school') schools.push({...place, kind:'school'});
    if (id === 'goat-pen' || id === 'chicken-run') pens.push({...place, kind:id});
    if (id === 'reed-bed') reedBeds.push(place);
    if (/^(soup-kitchen|kiln|forge|generator|bathhouse)$/.test(id)) smokers.push(place);
  }
  for (const plot of town?.homePlots ?? []) {
    if ((plot.regionId ?? 'scablands') !== 'scablands' || !Number.isFinite(plot.x)) continue;
    const place = {...placeOf({...plot, width:1, depth:1}, 'home'), tier:plot.tier || 0, burning:!!plot.burning};
    plots.set(plot.id, place);
    if (plot.household && plot.building && !plot.burning) sites.push({...place, kind:'site', plotId:plot.id});
  }
  return {roads, taps, shops, schools, sites, plots, buildings, pens, reedBeds, smokers, camp:TOWN_CAMP,
    nearestTap:new Map(), nearestShop:new Map(), nearestSchool:new Map(), routes:new Map(), profiles:new Map(), order:null};
}

/** The signature that says the places must be rebuilt. */
export function townLifeSignature(town) {
  const buildings = town?.buildings ?? [], plots = town?.homePlots ?? [];
  let text = `${buildings.length}|${plots.length}|`;
  for (const building of buildings) text += `${building.id}${building.state}`;
  for (const plot of plots) text += `${plot.id}${plot.tier}${plot.household ? 1 : 0}${plot.building ? 1 : 0}${plot.burning ? 1 : 0}`;
  return text;
}

function nearest(list, point) {
  let best = null, bestDistance = Infinity;
  for (const place of list) {
    const distance = (place.x - point.x) ** 2 + (place.z - point.z) ** 2;
    if (distance < bestDistance) { best = place; bestDistance = distance; }
  }
  return best;
}

function cached(map, key, list, point) {
  if (!map.has(key)) map.set(key, nearest(list, point));
  return map.get(key);
}

function homeOf(person, places) {
  const plot = places.plots.get(person.home);
  if (plot && !plot.burning) return {point:plot.door, place:plot, key:plot.id};
  // Canvas homes stand round the camp, each family's own spot.
  const family = String(person.family ?? person.home ?? person.id);
  const angle = townLifeHash(7, family) * Math.PI * 2, radius = 7 + townLifeHash(11, family) * 12;
  return {point:{x:places.camp.x + Math.cos(angle) * radius, z:places.camp.z + Math.sin(angle) * radius}, place:null, key:`camp:${family}`, camp:true};
}

function sitePoint(site, hash) {
  // Workers stand round the edge of the footprint, facing in.
  const angle = mix(hash, 5) * Math.PI * 2, rx = site.halfX * .82, rz = site.halfZ * .82;
  return {x:site.x + Math.cos(angle) * rx, z:site.z + Math.sin(angle) * rz};
}

function workOf(person, places, hash, age) {
  if (age < 16 || age >= 65) return null;
  if (person.homeType === 'Under construction') {
    const site = places.sites.find(row => row.plotId === person.home);
    if (site) return site;
  }
  const job = places.buildings.get(person.jobBuildingId);
  if (job) return places.sites.find(row => row.id === job.id) ?? job;
  if (places.sites.length && (person.job === 'townhand' || !person.job)) return places.sites[Math.floor(mix(hash, 7) * places.sites.length)];
  return null;
}

function ageOf(person) {
  if (Number.isFinite(person?.age)) return person.age;
  return 30;
}

// What does not change from hour to hour for one person: their home, work, nearest tap, shop and school. Kept until
// the person's record or the town's places change, so the sample can look at 10,000 people every second.
function profileOf(person, places, hash) {
  const id = String(person.id);
  let profile = places.profiles.get(id);
  if (profile && profile.hash === hash && profile.home_ === person.home && profile.jobBuildingId === person.jobBuildingId && profile.job === person.job
    && profile.homeType === person.homeType && profile.ageNow === person.age && profile.family === person.family) return profile;
  const age = ageOf(person), home = homeOf(person, places);
  const tap = places.taps.length ? cached(places.nearestTap, home.key, places.taps, home.point) : null;
  const shop = places.shops.length ? cached(places.nearestShop, home.key, places.shops, home.point) : null;
  const school = places.schools.length ? cached(places.nearestSchool, home.key, places.schools, home.point) : null;
  const work = workOf(person, places, hash, age);
  const atWork = work ? (work.kind === 'site'
    ? {point:sitePoint(work, hash), pose:'work', outdoors:true, placeId:work.id, face:{x:work.x, z:work.z}}
    : {point:work.door, pose:'inside', outdoors:false, placeId:work.id}) : null;
  const queue = place => place ? {point:{x:place.door.x + (mix(hash, 31) - .5) * 4, z:place.door.z - 1 - mix(hash, 53) * 5},
    pose:'queue', outdoors:true, placeId:place.id, face:place.door} : null;
  const atHome = {point:home.point, pose:home.camp ? 'idle' : 'inside', outdoors:!!home.camp, placeId:home.key};
  profile = {hash, age, home, atHome, home_:person.home, jobBuildingId:person.jobBuildingId, job:person.job, homeType:person.homeType,
    ageNow:person.age, family:person.family, indoors:{...atHome, pose:'inside', outdoors:false}, atWork,
    tap:queue(tap), shop:queue(shop), school:school ? {point:school.door, pose:'inside', outdoors:false, placeId:school.id} : null,
    play:{point:{x:home.point.x + (mix(hash, 13) - .5) * 14, z:home.point.z - 4 - mix(hash, 17) * 6}, pose:'play', outdoors:true, placeId:`play:${home.key}`},
    porch:{point:{x:home.point.x + 1.5, z:home.point.z - 1.5}, pose:'idle', outdoors:true, placeId:`porch:${home.key}`},
    yard:{point:{x:home.point.x - 1.5, z:home.point.z - 2}, pose:'idle', outdoors:true, placeId:`yard:${home.key}`},
    camp:{point:{x:places.camp.x + (mix(hash, 71) - .5) * 10, z:places.camp.z + (mix(hash, 73) - .5) * 10}, pose:'idle', outdoors:true,
      placeId:'camp', face:places.camp}};
  // Anything that brings this person near the camera passes through one of these points.
  profile.anchors = [profile.atHome, profile.atWork, profile.tap, profile.shop, profile.school, profile.play, profile.camp].filter(Boolean).map(row => row.point);
  places.profiles.set(id, profile);
  return profile;
}

function destinationOf(profile, h, day) {
  const today = fract(mix(profile.hash, 3) + (day + (h < 5 ? -1 : 0)) * .6180339), age = profile.age;
  const {atHome, tap, shop} = profile;
  if (h >= 22 || h < 5) return today < .04 ? (profile.home.camp ? atHome : tap ?? atHome) : profile.indoors;
  if (age < 16) {
    if (h >= 8 && h < 14 && profile.school) return profile.school;
    if (h >= 8 && h < 18) return profile.play;
    return h < 7 && today < .3 ? tap ?? atHome : atHome;
  }
  if (h < 7) return today < .6 ? tap ?? atHome : atHome;
  if (age >= 65) {
    if (h >= 8 && h < 17) return today < .45 ? profile.porch : today < .7 ? shop ?? tap ?? atHome : atHome;
    return atHome;
  }
  if (h === 12 && today < .5 && shop) return shop;
  if (h >= 7 && h < 17) return profile.atWork ?? (today < .5 ? tap ?? shop ?? profile.yard : profile.yard);
  if (h < 19) return today < .4 ? tap ?? atHome : today < .7 ? shop ?? atHome : atHome;
  return today < .25 ? profile.camp : atHome;
}

/**
 * Where one person is going at this game hour, from their own home, job and the nearest tap and shop.
 * Returns {to, from, pose, outdoors, placeId, face, moving}. `pose` is work, queue, idle, play or inside.
 */
export function townPersonErrand(person, places, {hour = 12, day = 0, hash = 0} = {}) {
  const profile = profileOf(person, places, hash);
  const now = destinationOf(profile, hour, day), before = destinationOf(profile, (hour + 23) % 24, hour === 0 ? day - 1 : day);
  return {to:now.point, from:before.point, pose:now.pose, outdoors:now.outdoors, placeId:now.placeId, face:now.face ?? null,
    moving:before.placeId !== now.placeId};
}

/** Who to draw: the lowest hashes among the people out of doors near `focus`. */
export function townLifeSample(town, places, {focus, radius, budget, hour = 12, day = 0, seed = townLifeSeed(town), inside = null} = {}) {
  if (!budget || !focus) return [];
  const people = town?.people ?? [], found = [], limit = radius * radius;
  // People in order of their hash, kept until the town's people change, so the scan can stop at the budget.
  const order = places.order;
  places.orderAge = (places.orderAge ?? 0) + 1;
  if (!order || order.seed !== seed || order.count !== people.length || order.first !== people[0] || order.last !== people[people.length - 1] || places.orderAge > 30) {
    const rows = [];
    for (const person of people) if (person) rows.push({person, hash:townLifeHash(seed, String(person.id))});
    rows.sort((a, b) => a.hash - b.hash);
    places.order = {seed, count:people.length, first:people[0], last:people[people.length - 1], rows};
    places.orderAge = 0;
  }
  for (const {person, hash} of places.order.rows) {
    if (found.length >= budget) break;
    const id = String(person.id);
    const profile = profileOf(person, places, hash);
    // Most of a big town is far from the camera: skip anyone none of whose places is near.
    let close = false;
    for (const point of profile.anchors) if ((point.x - focus.x) ** 2 + (point.z - focus.z) ** 2 < limit) { close = true; break; }
    if (!close) continue;
    const now = destinationOf(profile, hour, day), before = destinationOf(profile, (hour + 23) % 24, hour === 0 ? day - 1 : day);
    const moving = before.placeId !== now.placeId;
    if (!now.outdoors && !moving) continue;
    if (!now.outdoors && inside?.get(id) === now.placeId) continue;
    const near = (now.point.x - focus.x) ** 2 + (now.point.z - focus.z) ** 2 < limit
      || moving && (before.point.x - focus.x) ** 2 + (before.point.z - focus.z) ** 2 < limit;
    if (near) found.push({person, hash, errand:{to:now.point, from:before.point, pose:now.pose, outdoors:now.outdoors, placeId:now.placeId,
      face:now.face ?? null, moving}});
  }
  return found;
}

/** The budget for a camera this far from its ground point. */
export function townLifeBudget(distance, budget = TOWN_LIFE_BUDGET) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= budget.nearMetres) return budget.walkers;
  return Math.max(0, Math.round(budget.walkers * (budget.farMetres - distance) / (budget.farMetres - budget.nearMetres)));
}

function roadCellNear(roads, point, reach = 5) {
  const cx = Math.floor(point.x / CELL), cz = Math.floor(point.z / CELL);
  let best = null, bestDistance = Infinity;
  for (let dx = -reach; dx <= reach; dx++) for (let dz = -reach; dz <= reach; dz++) {
    const cell = roads.get(`${cx + dx}:${cz + dz}`);
    if (!cell) continue;
    const distance = ((cell.x + .5) * CELL - point.x) ** 2 + ((cell.z + .5) * CELL - point.z) ** 2;
    if (distance < bestDistance) { best = cell; bestDistance = distance; }
  }
  return best;
}

function roadCells(places, from, to) {
  const key = `${from.x}:${from.z}>${to.x}:${to.z}`;
  if (places.routes.has(key)) return places.routes.get(key);
  if (places.routes.size > 4000) places.routes.clear();
  const start = `${from.x}:${from.z}`, goal = `${to.x}:${to.z}`, previous = new Map([[start, null]]), queue = [start];
  for (let head = 0; head < queue.length && !previous.has(goal); head++) {
    const here = places.roads.get(queue[head]);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = `${here.x + dx}:${here.z + dz}`;
      if (!previous.has(next) && places.roads.has(next)) { previous.set(next, queue[head]); queue.push(next); }
    }
  }
  let cells = null;
  if (previous.has(goal)) {
    cells = [];
    for (let at = goal; at; at = previous.get(at)) cells.unshift(places.roads.get(at));
  }
  places.routes.set(key, cells);
  return cells;
}

/**
 * The way a person walks from one point to another: along road cells when roads join the two, keeping to one side of
 * the road by `lane` metres, and straight across open ground otherwise. Returns plain {x, z} points.
 */
export function townWalkRoute(places, from, to, {lane = 1.4} = {}) {
  const direct = Math.hypot(to.x - from.x, to.z - from.z);
  const start = roadCellNear(places.roads, from), end = roadCellNear(places.roads, to);
  let points = [from, to];
  if (start && end && direct > CELL * 1.5) {
    const cells = roadCells(places, start, end);
    if (cells && cells.length * CELL < direct * 2.4 + 24) {
      const middle = [];
      for (let index = 0; index < cells.length; index++) {
        const before = cells[index - 1], here = cells[index], after = cells[index + 1];
        // Keep only corners and ends: a straight run of cells is one line.
        if (before && after && (before.x === after.x || before.z === after.z) && (before.x - here.x === here.x - after.x) && (before.z - here.z === here.z - after.z)) continue;
        middle.push({x:(here.x + .5) * CELL, z:(here.z + .5) * CELL});
      }
      points = [from, ...offsetLine(middle, lane), to];
    }
  }
  return points;
}

function offsetLine(points, lane) {
  if (points.length < 2 || !lane) return points;
  return points.map((point, index) => {
    const a = points[Math.max(0, index - 1)], b = points[Math.min(points.length - 1, index + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
    return {x:point.x + dz / length * lane, z:point.z - dx / length * lane};
  });
}

/** A route as a dense line with the ground's height every 2.5 m, for drawing without a height lookup each frame. */
function densify(points, groundAt) {
  const out = [], lengths = [];
  let total = 0;
  const push = (x, z) => {
    if (out.length) total += Math.hypot(x - out[out.length - 3], z - out[out.length - 1]);
    out.push(x, groundAt(x, z), z); lengths.push(total);
  };
  push(points[0].x, points[0].z);
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2.5));
    for (let step = 1; step <= steps; step++) push(a.x + (b.x - a.x) * step / steps, a.z + (b.z - a.z) * step / steps);
  }
  return {points:out, lengths, total};
}

function along(line, distance, out) {
  const {points, lengths} = line, last = lengths.length - 1;
  if (distance <= 0 || last < 1) { out.set(points[0], points[1], points[2]); return {dx:points[3] - points[0] || 0, dz:points[5] - points[2] || 1}; }
  if (distance >= lengths[last]) {
    out.set(points[last * 3], points[last * 3 + 1], points[last * 3 + 2]);
    return {dx:points[last * 3] - points[last * 3 - 3], dz:points[last * 3 + 2] - points[last * 3 - 1]};
  }
  let low = 0, high = last;
  while (high - low > 1) { const middle = (low + high) >> 1; if (lengths[middle] <= distance) low = middle; else high = middle; }
  const span = lengths[high] - lengths[low] || 1, t = (distance - lengths[low]) / span;
  const a = low * 3, b = high * 3;
  out.set(points[a] + (points[b] - points[a]) * t, points[a + 1] + (points[b + 1] - points[a + 1]) * t, points[a + 2] + (points[b + 2] - points[a + 2]) * t);
  return {dx:points[b] - points[a], dz:points[b + 2] - points[a + 2]};
}

/**
 * The feet of a walker at `phase` (0 to 1 is one stride of two steps). Each foot stands still on the ground for half
 * the stride while the body passes over it, so the feet never slide: the body moves one step for each half stride.
 * Returns the forward offset and lift of each foot in metres.
 */
export function townWalkerFeet(phase, step, lift = .08) {
  const foot = u => {
    if (u < .5) return {forward:step / 2 - u / .5 * step, lift:0};
    const v = (u - .5) / .5;
    return {forward:-step / 2 + step * (.5 - .5 * Math.cos(Math.PI * v)), lift:Math.sin(Math.PI * v) * lift};
  };
  return {left:foot(fract(phase)), right:foot(fract(phase + .5))};
}

// A soft round shadow under each pair of feet, so nobody reads as floating.
function shadowTexture() {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1), a = Math.max(0, 1 - d) ** 1.6;
    data.set([0, 0, 0, Math.round(a * 255)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.needsUpdate = true;
  return texture;
}

function variantOf(node, capacity, group) {
  node.updateWorldMatrix(true, true);
  const inverse = node.matrixWorld.clone().invert(), parts = [];
  let hip = 0;
  node.traverse(object => {
    if (!object.isMesh) return;
    let kind = 'body', pivot = null;
    for (let parent = object; parent && parent !== node; parent = parent.parent) {
      const name = plainName(parent.name);
      if (name.endsWith('leg-l001')) { kind = 'left'; pivot = parent; break; }
      if (name.endsWith('leg-r001')) { kind = 'right'; pivot = parent; break; }
    }
    const rest = pivot ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inverse, pivot.matrixWorld)) : null;
    const bind = pivot ? new THREE.Matrix4().copy(pivot.matrixWorld).invert().multiply(object.matrixWorld)
      : new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld);
    if (rest) hip = Math.max(hip, rest.y);
    const mesh = new THREE.InstancedMesh(object.geometry, object.material, capacity);
    mesh.name = `Town walker ${plainName(node.name)} ${kind}`; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.userData.townLifePart = true;
    group.add(mesh);
    parts.push({kind, rest, bind, mesh});
  });
  const name = plainName(node.name), kid = name.includes('kid');
  // Some walkers wear long coats with only their boots jointed: those boots step under the coat.
  return {name, parts, hip, kid, hipLegs:hip > .5, gait:kid ? WALK.kid : hip > .5 ? WALK.adult : WALK.coat, used:0};
}

// Standing still, the feet a little apart.
const STAND = Object.freeze({left:Object.freeze({forward:.11, lift:0}), right:Object.freeze({forward:-.11, lift:0})});
const temp = {body:new THREE.Matrix4(), left:new THREE.Matrix4(), right:new THREE.Matrix4(), base:new THREE.Matrix4(), part:new THREE.Matrix4(), turn:new THREE.Matrix4(), move:new THREE.Matrix4(),
  out:new THREE.Matrix4(), quaternion:new THREE.Quaternion(), scale:new THREE.Vector3(), position:new THREE.Vector3(), up:new THREE.Vector3(0, 1, 0)};

function headingTo(dx, dz) { return Math.atan2(-dx, -dz); }
function turnToward(current, target, maxStep) {
  let delta = target - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return current + Math.max(-maxStep, Math.min(maxStep, delta));
}

function wheelParts(model) {
  const spins = [], steers = [];
  model.traverse(object => {
    const name = plainName(object.name);
    if (/spin-/.test(name) && !object.isMesh) spins.push(object);
    else if (/steer-front/.test(name) && !object.isMesh) steers.push(object);
  });
  let radius = .5;
  if (spins[0]) {
    const box = new THREE.Box3().setFromObject(spins[0]), size = box.getSize(new THREE.Vector3());
    if (size.y > .2) radius = size.y / 2;
  }
  return {spins, steers, radius};
}

/** The road an agent is on, as metres: [{x, z}], and how far along it the agent really is. */
export function townVehicleRoutes(town, tick = town?.tick ?? 0n) {
  const routes = [];
  for (const agent of town?.haulers ?? []) {
    if (!Array.isArray(agent?.path) || agent.path.length < 2) continue;
    const points = agent.path.map(cell => ({x:(cell.x + .5) * CELL, z:(cell.z + .5) * CELL}));
    let done = 0;
    const index = Math.max(0, Math.min(points.length - 1, agent.pathIndex | 0));
    for (let step = 1; step <= index; step++) done += Math.hypot(points[step].x - points[step - 1].x, points[step].z - points[step - 1].z);
    if (index < points.length - 1) done += (Number(agent.progress) || 0) * Math.hypot(points[index + 1].x - points[index].x, points[index + 1].z - points[index].z);
    const goods = Object.keys(agent.goods ?? {});
    routes.push({id:`hauler:${agent.id}`, kind:agent.vehicle === 'truck' ? 'truck' : 'handcart', points, done,
      model:goods.includes('water') ? 'water-tanker' : 'supply-truck', moving:agent.status === 'moving'});
  }
  for (const [outpostId, outpost] of Object.entries(town?.outposts ?? {})) for (const truck of outpost?.trucks ?? []) {
    if (truck?.status && truck.status !== 'on-road') continue;
    const route = Array.isArray(truck?.route) ? truck.route : truck?.route?.points;
    const points = [truck?.origin, ...(route ?? []), truck?.destination].filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.z))
      .map(point => ({x:point.x, z:point.z}));
    if (points.length < 2) continue;
    let total = 0;
    for (let step = 1; step < points.length; step++) total += Math.hypot(points[step].x - points[step - 1].x, points[step].z - points[step - 1].z);
    let elapsed = 0;
    try { elapsed = Number(BigInt(tick ?? 0) - BigInt(truck.startedTick ?? truck.startTick ?? 0)); } catch { elapsed = 0; }
    const duration = Number(truck.durationTicks) || 1;
    routes.push({id:`truck:${outpostId}:${truck.id}`, kind:'truck', points, done:Math.max(0, Math.min(1, elapsed / duration)) * total,
      model:'supply-truck', moving:true});
  }
  return routes;
}

function polylineLength(points) {
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z));
  return lengths;
}

function pointOnPolyline(points, lengths, distance) {
  const total = lengths[lengths.length - 1];
  const d = Math.max(0, Math.min(total, distance));
  let index = 1;
  while (index < lengths.length - 1 && lengths[index] < d) index++;
  const a = points[index - 1], b = points[index], span = lengths[index] - lengths[index - 1] || 1, t = (d - lengths[index - 1]) / span;
  return {x:a.x + (b.x - a.x) * t, z:a.z + (b.z - a.z) * t, dx:b.x - a.x, dz:b.z - a.z};
}

const ANIMAL_IDS = Object.freeze({goat:['goat'], chicken:['chicken', 'hen'], dog:['camp-dog', 'dog']});
// How many animals a pen holds (docs/WASTELAND_TOWN.md section 14 and the building rows): 8 goats, 12 hens.
const PEN_ANIMALS = Object.freeze({'goat-pen':{species:'goat', count:8, speed:.7}, 'chicken-run':{species:'chicken', count:12, speed:.35}});

/**
 * The town's walkers, carts, trucks and animals. `town` is read only. `groundAt` gives the drawn ground's height.
 * `hourAt()` and `dayAt()` give the game hour and day (the town's calendar unless given). `wildlife` is the table
 * of approved animal models, so an animal is drawn only once its row exists.
 */
export function createTownWalkers({town, loadModel = url => new GLTFLoader().loadAsync(url).then(result => result),
  groundAt = scablandsSurfaceHeightAt, wildlife = WILDLIFE_MODELS, budget = TOWN_LIFE_BUDGET, seed = townLifeSeed(town),
  hourAt = () => Number(town?.calendar?.hour ?? 12), dayAt = () => { try { return Number(BigInt(town?.tick ?? 0) / 24n % 100000n); } catch { return 0; } }} = {}) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town to draw its people.');
  const group = new THREE.Group(); group.name = 'Town life: people, carts and trucks';
  const rng = makeRng(seed);
  const state = {places:townLifePlaces(town), signature:townLifeSignature(town), variants:[], hipVariants:[], kidVariants:[], walkers:new Map(),
    inside:new Map(), sinceRefresh:Infinity, lastHour:null, focus:null, distance:0, disposed:false, time:0, models:{}, status:'loading',
    vehicles:new Map(), animals:[], selected:null, animalModels:new Map(), cart:null, barrow:null, refreshMs:0, frameMs:0, candidates:0};
  // The ground's height on a 1 m grid, kept: working it out is costly and walkers ask for the same ground again and again.
  const heights = new Map();
  const ground = (x, z) => {
    const key = Math.round(x) * 100003 + Math.round(z);
    let y = heights.get(key);
    if (y === undefined) {
      try { y = groundAt(Math.round(x), Math.round(z)); } catch { y = 0; }
      if (!Number.isFinite(y)) y = 0;
      if (heights.size > 60000) heights.clear();
      heights.set(key, y);
    }
    return y;
  };
  const shadowMap = shadowTexture();
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({map:shadowMap, color:0x000000, transparent:true, opacity:.5, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2}),
    budget.walkers + budget.vehicles + budget.animals);
  shadows.name = 'Town walker shadows'; shadows.count = 0; shadows.frustumCulled = false; shadows.renderOrder = 1;
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(shadows);
  // The ring under the person last clicked, so the player can follow them.
  const ring = new THREE.Mesh(new THREE.RingGeometry(.55, .78, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({color:0xffd18c, transparent:true, opacity:.9, depthWrite:false}));
  ring.name = 'Chosen person'; ring.visible = false; ring.renderOrder = 2; group.add(ring);
  const vehicleRoot = new THREE.Group(); vehicleRoot.name = 'Town carts and trucks'; group.add(vehicleRoot);
  const animalRoot = new THREE.Group(); animalRoot.name = 'Town animals'; group.add(animalRoot);

  const pick = (list, hash) => list.length ? list[Math.floor(hash * list.length) % list.length] : null;
  const variantFor = (person, hash, pose) => {
    const age = ageOf(person);
    if (age < 16 && state.kidVariants.length) return pick(state.kidVariants, hash);
    const guard = state.variants.find(variant => variant.name === 'walker-guard');
    if (/guard|watch/.test(String(person.job ?? '')) && guard) return guard;
    // Site work bends at the hip, so it needs a walker jointed there.
    if (pose === 'work' && state.hipVariants.length) return pick(state.hipVariants, mix(hash, 3.7));
    return pick(state.adultVariants ?? state.variants, mix(hash, 5.3));
  };

  const load = async () => {
    try {
      const gltf = await loadModel(TOWN_WALKER_MODELS.walkers), root = gltf.scene ?? gltf;
      if (state.disposed) return;
      state.models.walkers = root;
      const holder = root.getObjectByName('town-walkers') ?? root;
      for (const child of holder.children) {
        const name = plainName(child.name);
        // The trader and Mrs Vane's people belong to their own stories; the town's own people are drawn here.
        if (!name.startsWith('walker-') || name === 'walker-vane' || name === 'walker-trader') continue;
        state.variants.push(variantOf(child, budget.walkers, group));
      }
      state.kidVariants = state.variants.filter(variant => variant.kid);
      state.hipVariants = state.variants.filter(variant => variant.hipLegs && !variant.kid && variant.name !== 'walker-guard');
      state.adultVariants = state.variants.filter(variant => !variant.kid && variant.name !== 'walker-guard');
      state.status = state.variants.length ? 'ready' : 'error';
      state.sinceRefresh = Infinity;
    } catch (error) { state.status = 'error'; state.error = String(error?.message || error); }
    for (const [key, url] of [['trucks', TOWN_WALKER_MODELS.trucks], ['works', TOWN_WALKER_MODELS.works]]) {
      try { const gltf = await loadModel(url); if (state.disposed) return; state.models[key] = gltf.scene ?? gltf; }
      catch { /* Trucks and carts are drawn when their models load; the people do not wait for them. */ }
    }
    const works = state.models.works;
    // A cart or barrow is drawn only once its part is in the works family (TOWN-ART-WORKS).
    state.cart = works?.getObjectByName('handcart') ?? null;
    state.barrow = works?.getObjectByName('barrow') ?? null;
    for (const [kind, ids] of Object.entries(ANIMAL_IDS)) {
      const id = ids.find(name => wildlife?.[name]);
      if (!id) continue;
      try {
        const gltf = await loadModel(WILDLIFE_MODEL_DIR + wildlife[id].file);
        if (state.disposed) return;
        state.animalModels.set(kind, {gltf, row:wildlife[id]});
      } catch { /* An animal that fails to load is left out; the town looks right without it. */ }
    }
  };
  state.ready = load();

  const refresh = () => {
    const started = globalThis.performance?.now?.() ?? Date.now();
    const signature = townLifeSignature(town);
    if (signature !== state.signature) { state.signature = signature; state.places = townLifePlaces(town); for (const walker of state.walkers.values()) walker.routeKey = null; }
    // Earthworks change the ground now and then, so the kept heights are worked out afresh every 20 seconds.
    state.refreshes = (state.refreshes ?? 0) + 1;
    if (state.refreshes % 20 === 0) heights.clear();
    const count = state.variants.length ? townLifeBudget(state.distance, budget) : 0;
    const radius = Math.max(budget.minRadius, state.distance * budget.radiusFactor);
    const hour = hourAt(), day = dayAt();
    // Who went indoors matters only in the hour they went: after it, an indoor errand is not out of doors at all.
    if (state.lastHour !== hour) { state.inside.clear(); state.lastHour = hour; }
    const chosen = count && state.focus ? townLifeSample(town, state.places, {focus:state.focus, radius, budget:count, hour, day, seed, inside:state.inside}) : [];
    state.candidates = chosen.length;
    const keep = new Set();
    let joined = 0;
    for (const {person, errand, hash} of chosen) {
      const id = String(person.id);
      let walker = state.walkers.get(id);
      if (!walker && joined >= 40) continue;
      keep.add(id);
      if (!walker) {
        joined++;
        const variant = variantFor(person, hash, errand.pose);
        if (!variant) continue;
        const gait = variant.gait;
        walker = {id, person, hash, variant, speed:gait.speed[0] + mix(hash, 97) * (gait.speed[1] - gait.speed[0]), step:gait.step,
          lane:(mix(hash, 41) < .5 ? -1 : 1) * (1 + mix(hash, 43) * 1.4), scale:.94 + mix(hash, 61) * .12, phase:mix(hash, 11),
          heading:mix(hash, 19) * Math.PI * 2, distance:0, line:null, routeKey:null, pose:'walk', position:new THREE.Vector3(), work:mix(hash, 29) * 10,
          avoid:0, fresh:true};
        state.walkers.set(id, walker);
      }
      walker.person = person; walker.errand = errand;
      const routeKey = `${errand.placeId}:${Math.round(errand.to.x * 4)}:${Math.round(errand.to.z * 4)}`;
      if (walker.routeKey !== routeKey) {
        const from = walker.fresh ? (errand.moving ? errand.from : errand.to) : {x:walker.position.x, z:walker.position.z};
        const points = townWalkRoute(state.places, from, errand.to, {lane:walker.lane});
        walker.line = densify(points, ground);
        // Someone met on the way has already walked part of it.
        walker.distance = walker.fresh && errand.moving ? walker.line.total * mix(hash, 23) * .8 : 0;
        if (walker.fresh && !errand.moving) walker.distance = walker.line.total;
        walker.routeKey = routeKey; walker.fresh = false; walker.hidden = false;
      }
    }
    // The person the player chose stays drawn while they are out, even when a lower hash would take their place.
    const chosenWalker = state.walkers.get(state.selected);
    if (chosenWalker && !keep.has(state.selected)) {
      const errand = townPersonErrand(chosenWalker.person, state.places, {hour, day, hash:chosenWalker.hash});
      if (errand.outdoors || errand.moving) { keep.add(state.selected); chosenWalker.errand = errand; }
    }
    for (const id of state.walkers.keys()) if (!keep.has(id)) state.walkers.delete(id);
    state.refreshMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
  };

  const drawWalker = (walker, slot) => {
    const variant = walker.variant, {base, part, turn, move, out, quaternion, scale, position, up} = temp;
    let bodyDrop = 0, pitch = 0, bob = 0, left = STAND.left, right = STAND.right;
    if (walker.pose === 'walk') {
      // The feet are worked out in the model's own size; the walker's scale makes the stride its own.
      const feet = townWalkerFeet(walker.phase, walker.step, variant.hipLegs ? .02 : .07);
      left = feet.left; right = feet.right;
      if (variant.hipLegs) {
        // The standing leg is straight, so the hip is lower when it slants: the body drops to keep that foot on the ground.
        const standing = walker.phase % 1 < .5 ? left : right;
        bodyDrop = variant.hip * walker.scale * (1 - Math.cos(Math.asin(Math.min(.9, Math.abs(standing.forward) / variant.hip))));
      }
      bob = Math.abs(Math.sin(walker.phase * Math.PI * 2)) * .025;
      pitch = .04;
    } else if (walker.pose === 'work') {
      // Hammering: a bend at the hip with a swing every second or so.
      pitch = .22 + .25 * Math.max(0, Math.sin(state.time * 3.1 + walker.work));
    } else if (walker.pose === 'play') pitch = .05;
    position.copy(walker.position); position.y -= bodyDrop;
    quaternion.setFromAxisAngle(up, walker.heading); scale.setScalar(walker.scale);
    base.compose(position, quaternion, scale);
    const hip = variant.hipLegs ? variant.hip : .9;
    move.makeTranslation(0, hip + bob, 0); turn.makeRotationX(pitch); part.makeTranslation(0, -hip, 0);
    temp.body.multiplyMatrices(base, move).multiply(turn).multiply(part);
    let leftReady = false, rightReady = false;
    for (const item of variant.parts) {
      if (item.kind === 'body') out.multiplyMatrices(temp.body, item.bind);
      else {
        const isLeft = item.kind === 'left', leg = isLeft ? temp.left : temp.right;
        if (!(isLeft ? leftReady : rightReady)) {
          const foot = isLeft ? left : right;
          if (variant.hipLegs) {
            const angle = Math.asin(Math.max(-.9, Math.min(.9, foot.forward / variant.hip)));
            move.makeTranslation(item.rest.x, item.rest.y + foot.lift, item.rest.z); turn.makeRotationX(angle);
          } else {
            move.makeTranslation(item.rest.x, item.rest.y + foot.lift, item.rest.z - foot.forward); turn.makeRotationX(foot.lift * 2.5);
          }
          leg.multiplyMatrices(base, move).multiply(turn);
          if (isLeft) leftReady = true; else rightReady = true;
        }
        out.multiplyMatrices(leg, item.bind);
      }
      item.mesh.setMatrixAt(variant.used, out);
    }
    variant.used++;
    temp.position.set(walker.position.x, walker.position.y + .03, walker.position.z);
    temp.scale.set(.75 * walker.scale, 1, .75 * walker.scale); temp.quaternion.identity();
    out.compose(temp.position, temp.quaternion, temp.scale); shadows.setMatrixAt(slot, out);
  };

  const stepWalker = (walker, dt, car) => {
    const line = walker.line;
    if (!line) return;
    const errand = walker.errand;
    if (walker.distance < line.total - .05) {
      walker.distance = Math.min(line.total, walker.distance + walker.speed * dt);
      walker.phase = fract(walker.phase + walker.speed * dt / (2 * walker.step * walker.scale));
      walker.pose = 'walk';
      const direction = along(line, walker.distance, walker.position);
      if (direction.dx || direction.dz) walker.heading = turnToward(walker.heading, headingTo(direction.dx, direction.dz), dt * 6);
    } else {
      along(line, line.total, walker.position);
      walker.pose = errand.pose === 'inside' ? 'inside' : errand.pose === 'play' ? 'play' : errand.pose === 'work' ? 'work' : 'idle';
      if (walker.pose === 'inside') { walker.hidden = true; state.inside.set(walker.id, errand.placeId); return; }
      if (walker.pose === 'play') {
        // Children run round their own small patch of ground.
        walker.work += dt * 1.3;
        const radius = 2.2, angle = walker.work;
        walker.position.x += Math.cos(angle) * radius - radius; walker.position.z += Math.sin(angle) * radius;
        walker.heading = turnToward(walker.heading, headingTo(-Math.sin(angle), Math.cos(angle)), dt * 6);
        walker.phase = fract(walker.phase + 1.3 * radius * dt / (2 * walker.step * walker.scale));
        walker.pose = 'walk';
      } else if (errand.face) {
        walker.heading = turnToward(walker.heading, headingTo(errand.face.x - walker.position.x, errand.face.z - walker.position.z), dt * 3);
      }
    }
    // People step off the road for a passing car (drawing only: the car never meets them).
    if (car) {
      const dx = walker.position.x - car.x, dz = walker.position.z - car.z, distance = Math.hypot(dx, dz);
      const target = distance < 8 ? (8 - distance) / 8 * 3 : 0;
      walker.avoid += (target - walker.avoid) * Math.min(1, dt * 4);
      if (walker.avoid > .01 && distance > .01) { walker.position.x += dx / distance * walker.avoid; walker.position.z += dz / distance * walker.avoid; }
    }
  };

  const placeVehicle = (route, dt, slot) => {
    const lengths = polylineLength(route.points), total = lengths[lengths.length - 1];
    let view = state.vehicles.get(route.id);
    const truck = route.kind === 'truck';
    if (!view) {
      let object = null;
      if (truck && state.models.trucks) {
        const source = state.models.trucks.getObjectByName(route.model) ?? state.models.trucks.getObjectByName('supply-truck');
        if (source) object = source.clone(true);
      } else if (!truck && state.cart) object = state.cart.clone(true);
      if (object) { object.userData.sharedTownAsset = true; vehicleRoot.add(object); }
      view = {object, drawn:Math.max(0, route.done - 40), wheels:object ? wheelParts(object) : null, heading:null, walker:null, seen:true};
      state.vehicles.set(route.id, view);
    }
    view.seen = true;
    // The drawn vehicle chases the real one along the real road at a speed that reads as driving or pushing.
    const pace = truck ? 9 : 1.3, gap = route.done - view.drawn;
    if (gap < -1 || gap > 220) view.drawn = gap > 220 ? route.done - 60 : route.done;
    else view.drawn += Math.min(gap, pace * (1 + Math.max(0, gap - 30) / 30) * dt);
    const moved = Math.max(0, view.drawn - (view.last ?? view.drawn));
    view.last = view.drawn;
    const at = pointOnPolyline(route.points, lengths, Math.min(total, view.drawn));
    const y = ground(at.x, at.z);
    const heading = headingTo(at.dx, at.dz);
    const turnRate = view.heading === null ? 0 : Math.atan2(Math.sin(heading - view.heading), Math.cos(heading - view.heading)) / Math.max(dt, 1e-3);
    view.heading = view.heading === null ? heading : turnToward(view.heading, heading, dt * 2.5);
    if (view.object) {
      view.object.position.set(at.x, y, at.z); view.object.rotation.y = view.heading;
      for (const spin of view.wheels.spins) spin.rotation.x -= moved / view.wheels.radius;
      for (const steer of view.wheels.steers) steer.rotation.y = Math.max(-.5, Math.min(.5, turnRate * .5));
    }
    if (!truck) {
      // The person pushing a cart walks behind it (or alone, until the cart's model exists).
      const push = view.object ? 1.3 : 0, dirLength = Math.hypot(at.dx, at.dz) || 1;
      const walker = view.walker ??= {id:null, person:null, hash:townLifeHash(seed, route.id), variant:null,
        speed:pace, step:WALK.adult.step, scale:1, phase:0, heading:0, position:new THREE.Vector3(), pose:'walk', work:0};
      walker.variant ??= pick(state.hipVariants.length ? state.hipVariants : state.variants, walker.hash);
      if (walker.variant) {
        walker.position.set(at.x - at.dx / dirLength * push, 0, at.z - at.dz / dirLength * push);
        walker.position.y = ground(walker.position.x, walker.position.z);
        walker.heading = view.heading; walker.phase = fract(walker.phase + moved / (2 * walker.step));
        walker.pose = moved > 0 ? 'walk' : 'idle';
      }
    }
    if (view.object && slot < shadows.instanceMatrix.count) {
      temp.position.set(at.x, y + .04, at.z); temp.quaternion.setFromAxisAngle(temp.up, view.heading);
      temp.scale.set(truck ? 3.2 : 1.4, 1, truck ? 8 : 1.8);
      temp.out.compose(temp.position, temp.quaternion, temp.scale); shadows.setMatrixAt(slot, temp.out);
      return true;
    }
    return false;
  };

  const updateAnimals = dt => {
    const wanted = [];
    if (state.animalModels.size && state.focus) {
      const radius = Math.max(budget.minRadius, state.distance * budget.radiusFactor);
      for (const pen of state.places.pens) {
        const kind = PEN_ANIMALS[pen.kind];
        if (!kind || !state.animalModels.has(kind.species) || Math.hypot(pen.x - state.focus.x, pen.z - state.focus.z) > radius) continue;
        for (let index = 0; index < kind.count && wanted.length < budget.animals; index++) wanted.push({key:`${pen.id}:${index}`, pen, species:kind.species, speed:kind.speed});
      }
      if (state.animalModels.has('dog') && wanted.length < budget.animals)
        wanted.push({key:'dog', pen:{x:state.places.camp.x, z:state.places.camp.z, halfX:14, halfZ:10}, species:'dog', speed:1.1});
    }
    const keys = new Set(wanted.map(row => row.key));
    state.animals = state.animals.filter(animal => {
      if (keys.has(animal.key)) return true;
      animalRoot.remove(animal.object); animal.mixer?.stopAllAction(); return false;
    });
    for (const row of wanted) {
      if (state.animals.some(animal => animal.key === row.key)) continue;
      const {gltf, row:model} = state.animalModels.get(row.species), scene = gltf.scene ?? gltf;
      const object = cloneSkinned(scene); object.scale.setScalar(model.scale ?? 1); object.userData.sharedTownAsset = true;
      const mixer = gltf.animations?.length ? new THREE.AnimationMixer(object) : null;
      const clip = name => gltf.animations?.find(item => item.name === name);
      const actions = mixer ? {idle:clip(model.idle) && mixer.clipAction(clip(model.idle)), move:clip(model.move) && mixer.clipAction(clip(model.move))} : {};
      const animal = {...row, object, mixer, actions, at:{x:row.pen.x + (rng.float() - .5) * row.pen.halfX, z:row.pen.z + (rng.float() - .5) * row.pen.halfZ},
        target:null, wait:rng.range(0, 4), heading:rng.range(0, Math.PI * 2)};
      actions.idle?.play();
      animalRoot.add(object); state.animals.push(animal);
    }
    for (const animal of state.animals) {
      if (animal.wait > 0) {
        animal.wait -= dt;
        if (animal.wait <= 0) animal.target = {x:animal.pen.x + (rng.float() - .5) * animal.pen.halfX * 1.6, z:animal.pen.z + (rng.float() - .5) * animal.pen.halfZ * 1.6};
      } else if (animal.target) {
        const dx = animal.target.x - animal.at.x, dz = animal.target.z - animal.at.z, distance = Math.hypot(dx, dz);
        if (distance < .2) { animal.target = null; animal.wait = rng.range(2, 9); animal.actions.move?.stop(); animal.actions.idle?.play(); }
        else {
          const stepLength = Math.min(distance, animal.speed * dt);
          animal.at.x += dx / distance * stepLength; animal.at.z += dz / distance * stepLength;
          // Animal models face +X (src/wildlife-models.js).
          animal.heading = turnToward(animal.heading, Math.atan2(-dz, dx), dt * 4);
          if (animal.actions.move && !animal.actions.move.isRunning()) { animal.actions.idle?.stop(); animal.actions.move.play(); }
        }
      }
      animal.object.position.set(animal.at.x, ground(animal.at.x, animal.at.z), animal.at.z);
      animal.object.rotation.y = animal.heading;
      animal.mixer?.update(dt);
    }
  };

  return {
    group,
    state,
    get ready() { return state.ready; },
    /** One frame. `focus` is the camera's ground point (or the car), `distance` the camera's distance from it. */
    update({dt = 1 / 60, focus = null, distance = 90, car = null} = {}) {
      if (state.disposed) return;
      const started = globalThis.performance?.now?.() ?? Date.now();
      state.time += dt;
      if (focus) {
        const moved = !state.focus || Math.hypot(focus.x - state.focus.x, focus.z - state.focus.z) > 25;
        state.focus = {x:focus.x, z:focus.z};
        if (moved && state.sinceRefresh < budget.refreshSeconds) state.sinceRefresh = budget.refreshSeconds;
      }
      state.distance = distance;
      state.sinceRefresh += dt;
      if (state.sinceRefresh >= budget.refreshSeconds || state.lastHour !== hourAt()) { state.sinceRefresh = 0; refresh(); }
      for (const variant of state.variants) variant.used = 0;
      let slot = 0;
      for (const walker of state.walkers.values()) {
        stepWalker(walker, dt, car);
        if (walker.hidden || !walker.variant || walker.variant.used >= budget.walkers) continue;
        drawWalker(walker, slot++);
      }
      // Carts and trucks from the town's real haulers and outpost trucks.
      for (const view of state.vehicles.values()) view.seen = false;
      if (state.status === 'ready' || state.models.trucks) {
        const radius = Math.max(budget.minRadius, distance * budget.radiusFactor) + 120;
        let count = 0;
        for (const route of townVehicleRoutes(town)) {
          if (count >= budget.vehicles || !state.focus) break;
          const near = route.points.some(point => Math.hypot(point.x - state.focus.x, point.z - state.focus.z) < radius);
          if (!near) continue;
          count++;
          if (placeVehicle(route, dt, slot)) slot++;
          const pusher = state.vehicles.get(route.id)?.walker;
          if (pusher?.variant && pusher.variant.used < budget.walkers) drawWalker(pusher, slot++);
        }
      }
      for (const [id, view] of state.vehicles) if (!view.seen) {
        if (view.object) vehicleRoot.remove(view.object);
        state.vehicles.delete(id);
      }
      for (const variant of state.variants) for (const item of variant.parts) {
        item.mesh.count = variant.used; item.mesh.visible = variant.used > 0;
        if (variant.used) item.mesh.instanceMatrix.needsUpdate = true;
      }
      const chosen = state.walkers.get(state.selected);
      ring.visible = !!chosen && !chosen.hidden;
      if (ring.visible) ring.position.set(chosen.position.x, chosen.position.y + .06, chosen.position.z);
      updateAnimals(dt);
      shadows.count = Math.min(slot, shadows.instanceMatrix.count); shadows.visible = shadows.count > 0; shadows.instanceMatrix.needsUpdate = true;
      state.frameMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
    },
    /** The person drawn nearest the pointer, within 18 pixels of their chest, or null. */
    pickPerson(camera, clientX, clientY, rect) {
      if (!camera || !rect || rect.width <= 0) return null;
      const point = new THREE.Vector3();
      let best = null, bestDistance = 18;
      for (const walker of state.walkers.values()) {
        if (walker.hidden || !walker.person) continue;
        point.set(walker.position.x, walker.position.y + 1.2 * walker.scale, walker.position.z).project(camera);
        if (point.z < -1 || point.z > 1) continue;
        const x = rect.left + (point.x * .5 + .5) * rect.width, y = rect.top + (-point.y * .5 + .5) * rect.height;
        const distance = Math.hypot(x - clientX, y - clientY);
        if (distance < bestDistance) { best = walker; bestDistance = distance; }
      }
      return best ? {type:'person', personId:best.id, person:best.person, point:best.position.clone()} : null;
    },
    /** Mark one person (by id) with a ring while they are drawn; null clears it. */
    select(personId) { state.selected = personId === null || personId === undefined ? null : String(personId); return state.selected; },
    /** What is drawn now, for checks and the change note. */
    stats() {
      let drawCalls = 0, walkers = 0;
      for (const variant of state.variants) { walkers += variant.used; for (const item of variant.parts) if (item.mesh.visible) drawCalls++; }
      if (shadows.visible) drawCalls++;
      return {people:town.people?.length ?? 0, sampled:state.walkers.size, drawn:walkers, drawCalls, vehicles:state.vehicles.size,
        animals:state.animals.length, refreshMs:state.refreshMs, frameMs:state.frameMs, status:state.status};
    },
    dispose() {
      state.disposed = true;
      group.removeFromParent();
      shadows.geometry.dispose(); shadows.material.dispose(); shadowMap.dispose(); ring.geometry.dispose(); ring.material.dispose();
      for (const variant of state.variants) for (const item of variant.parts) item.mesh.dispose();
      for (const animal of state.animals) animal.mixer?.stopAllAction();
      const geometries = new Set(), materials = new Set();
      for (const root of [...Object.values(state.models), ...[...state.animalModels.values()].map(row => row.gltf.scene ?? row.gltf)])
        root?.traverse?.(object => { if (object.geometry) geometries.add(object.geometry); for (const material of [].concat(object.material ?? [])) materials.add(material); });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) { for (const value of Object.values(material)) if (value?.isTexture) value.dispose(); material.dispose(); }
      state.walkers.clear(); state.vehicles.clear();
    },
  };
}

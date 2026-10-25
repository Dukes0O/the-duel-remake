// The pilot's map (docs/PILOT_MAP.md sections 2 and 4): where every course
// sits on the game's one invented region, what the land and sea look like,
// where fuel is sold and what a cruise leg costs. Pure data and two small
// rules; no graphics and no clock. Kilometres, north is +z (as in
// heli-jobs.js). The course outlines are traced into
// src/generated/pilot-map.json by tools/build-pilot-map.mjs; this file says
// where they go.
//
// A place is a course the pilot can fly to, named by its course id in the
// registry (src/config.js COURSE). Three places hold more than one course:
// the Titan stadium (three arenas) and Summit Run (and its Time Attack).
import {legFuelKg} from './heli-jobs.js';

export const PILOT_MAP = Object.freeze({
  version: 1,
  // The chart's frame, km: room for the coast and the sea around it.
  bounds: Object.freeze({minX: -40, maxX: 34, minZ: -32, maxZ: 42}),
  // A course outline is drawn this many km across at its longest.
  outlineKm: 1.2,
  // The drawer may move a place this far to keep outlines apart.
  maxNudgeKm: 2,
  // Clear paper between two outlines, and between an outline and the coast.
  minGapKm: 0.1,
});

const at = (x, z) => Object.freeze({x, z});

// The height above the sea at the start of each course, metres: the thin-air rule's
// base altitude (heli-jobs reads it for the places the helicopter did not already
// know). Authored from the setting each place is described in (section 2); the
// four original destinations keep the numbers heli-jobs gives them, and nothing is
// higher than Summit Run (2,860 m), which stays the high peak.
export const PLACE_ALTITUDES = Object.freeze({
  'ardennes-forest': 400, 'eifel-crown': 600, 'alpine-serpent': 1700, 'cloudbreak-skyway': 2100,
  'ridge-rally': 700, 'timberline-rush': 1400, 'high-country': 900, 'red-mesa': 1200,
  'pacific-canyon': 40, 'harbour-lights': 5, 'harbor-highlands': 30, 'neon-docks': 5,
  'neon-drift-trial': 5, 'midnight-chase': 5, 'titan-stadium': 20, 'azure-riviera': 15,
  'the-table': 1100,
});

// Places the landing-zone search finds no clear, level 12 m circle for. They are
// left off the destinations and named in the change note (card MAP-DESTINATIONS).
export const LEFT_OFF = Object.freeze(['ardennes-forest']);
const place = (id, name, courses, table, region, extra = {}) => Object.freeze({
  id, name, courses: Object.freeze(courses), at: table, drawAt: extra.drawAt ?? table, region, air: false, ...extra,
});

// The table of section 2. `at` is the plan; `drawAt` is where the outline is
// drawn (the same unless the drawer moved it to keep outlines apart).
export const PLACES = Object.freeze([
  place('tremblant-woods', 'Tremblant Woods', ['tremblant-woods'], at(0, 0), 'Forest valley, a lake', {home: true}),
  place('tremblant-snow', 'Tremblant Snow', ['tremblant-snow'], at(0.5, 1.9), 'Just north, under snow'),
  place('panorama-ridge', 'Panorama Ridge', ['panorama-ridge'], at(-6, 7), 'A ridge above the valley'),
  place('summit-run', 'Summit Run', ['summit-run', 'summit-time-attack'], at(-10, 12), 'The high peak'),
  place('ardennes-forest', 'Ardennes Forest', ['ardennes-forest'], at(8, 4), 'Wooded hills to the east'),
  place('eifel-crown', 'Eifel Crown', ['eifel-crown'], at(12, 9), 'Beyond the Ardennes'),
  place('alpine-serpent', 'Alpine Serpent', ['alpine-serpent'], at(-4, 22), 'The far north alps'),
  place('cloudbreak-skyway', 'Cloudbreak Skyway', ['cloudbreak-skyway'], at(-8, 26), 'Highest road on the map'),
  place('ridge-rally', 'Ridge Rally', ['ridge-rally'], at(-14, 8), 'Dry ridges west of Panorama'),
  place('timberline-rush', 'Timberline Checkpoint Rush', ['timberline-rush'], at(-12, 18), 'Tree line under the peaks'),
  place('high-country', 'High Country Grand Tour', ['high-country'], at(-24, 14), 'Canyon to alps to the north-west coast', {coast: true}),
  place('red-mesa', 'Red Mesa Corkscrew', ['red-mesa'], at(-18, 2), 'Red desert mesas'),
  place('pacific-canyon', 'Pacific Canyon Circuit', ['pacific-canyon'], at(-22, -8), 'Desert canyon to the west coast', {coast: true}),
  place('harbour-lights', 'Harbour Lights', ['harbour-lights'], at(14, -10), 'The harbour city'),
  place('harbor-highlands', 'Harbor & Highlands', ['harbor-highlands'], at(18, -6), 'The city\'s hills and night coast road', {coast: true}),
  place('neon-docks', 'Neon Docks Circuit', ['neon-docks'], at(16, -12), 'City districts by the docks'),
  place('neon-drift-trial', 'Neon Drift Trial', ['neon-drift-trial'], at(16, -12), 'City districts by the docks', {drawAt: at(17.6, -12.8)}),
  place('midnight-chase', 'Midnight Muscle Chase', ['midnight-chase'], at(16, -12), 'City districts by the docks', {drawAt: at(15.2, -13.6)}),
  place('titan-stadium', 'Titan arenas', ['titan-arena', 'titan-stunt-trial', 'titan-freestyle'], at(10, -6), 'The stadium on the city\'s edge'),
  place('azure-riviera', 'Azure Riviera', ['azure-riviera'], at(6, -16), 'The soft south coast'),
  // Air only (section 5.2): not on the map at first, no road to trace.
  place('the-table', 'The Table', [], at(-16, -3), 'A lone mesa in the desert', {air: true}),
]);

export const PLACE_IDS = Object.freeze(PLACES.map(p => p.id));
export const placeById = id => PLACES.find(p => p.id === id) ?? null;
export const placeOfCourse = courseId => PLACES.find(p => p.courses.includes(courseId)) ?? null;
export const nudgeKm = p => Math.hypot(p.drawAt.x - p.at.x, p.drawAt.z - p.at.z);

// ---- Fuel (section 4) --------------------------------------------------------
// Credits a kg. The home pad is the pump (heli-save HELI_MONEY); Summit's truck
// sells at the pump's price (docs/HELI_RESCUE.md 5.4); the far pads cost more.
export const FUEL_PADS = Object.freeze([
  Object.freeze({place: 'tremblant-woods', pricePerKg: 1.5, name: 'Home pad pump'}),
  Object.freeze({place: 'summit-run', pricePerKg: 1.5, name: 'Summit lodge truck', truck: true}),
  Object.freeze({place: 'harbour-lights', pricePerKg: 1.8, name: 'Harbour Lights pump'}),
  Object.freeze({place: 'pacific-canyon', pricePerKg: 2.0, name: 'Pacific Canyon pump'}),
  Object.freeze({place: 'alpine-serpent', pricePerKg: 2.2, name: 'Alpine Serpent pump'}),
]);
export const fuelPadAt = id => FUEL_PADS.find(pad => pad.place === id) ?? null;

// ---- Distances and legs --------------------------------------------------------
// Straight-line km between two places, by the table (the plan, not the nudged drawing).
export function mapDistanceKm(from, to) {
  const a = placeById(from)?.at, b = placeById(to)?.at;
  return a && b ? Math.hypot(b.x - a.x, b.z - a.z) : null;
}

export const LEG_RULE = Object.freeze({kgPerKm: 12, plusKg: 5, roundKg: 5});

// Fuel for a cruise leg between two places, kg, or null for the same place or
// an unknown one. The legs the game already had (the six among the four
// original destinations) keep their table numbers exactly (heli-jobs); every
// other leg is 12 kg per km of straight line plus 5 kg, rounded up to 5 kg.
export function legFuelKgMap(from, to) {
  if (from === to || !placeById(from) || !placeById(to)) return null;
  const table = legFuelKg(from, to, {summitRun: true});
  if (table !== null) return table;
  const raw = LEG_RULE.kgPerKm * mapDistanceKm(from, to) + LEG_RULE.plusKg;
  return Math.ceil(raw / LEG_RULE.roundKg - 1e-9) * LEG_RULE.roundKg;
}

// The nearest fuel pad to a place by fuel, and what the leg costs: {pad, kg}.
export function nearestFuelPad(id, {tankKg = 400} = {}) {
  let best = null;
  for (const pad of FUEL_PADS) {
    if (pad.place === id) return {pad, kg: 0};
    const kg = legFuelKgMap(pad.place, id);
    if (kg !== null && kg <= tankKg && (!best || kg < best.kg)) best = {pad, kg};
  }
  return best;
}

// The longest leg a tank allows, km (the faint ring of section 4).
export const reachKm = (tankKg = 400) => (tankKg - LEG_RULE.plusKg) / LEG_RULE.kgPerKm;

// ---- Shapes: the land and the sea ---------------------------------------------------
// Polygons in km, [x, z] pairs, listed round the shape. Authored once.

// The land. Everything else is sea.
const LAND = Object.freeze([
  [-26, 34], [-30, 28], [-31, 21], [-27.5, 15.5], [-29, 9], [-28, 2], [-26.5, -4], [-25.2, -8.5], [-25, -14], [-20, -19],
  [-12, -22], [-4, -22.4], [3, -21], [8, -19.2], [12, -15.6], [16, -15], [19.5, -14.4],
  [21.2, -12], [21.4, -7], [23.8, -2], [25.5, 5], [23.5, 12], [20, 19.5], [15, 26], [8, 31], [0, 34], [-12, 35], [-20, 35.5],
]);

// A smooth blob about (cx, cz): radii rx and rz, with a few harmonics so it is
// not a plain oval. Deterministic, rounded to 10 m.
function blob(cx, cz, rx, rz, seed, n = 24) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const wobble = 1 + 0.08 * Math.sin(a * 2 + seed) + 0.05 * Math.sin(a * 3 + seed * 2.3) + 0.03 * Math.cos(a * 5 + seed * 0.7);
    out.push([Math.round((cx + Math.cos(a) * rx * wobble) * 100) / 100, Math.round((cz + Math.sin(a) * rz * wobble) * 100) / 100]);
  }
  return Object.freeze(out);
}

// The sea's depth lines: the coast pushed out by 2, 5 and 12 km.
function offsetPolygon(polygon, distance) {
  const n = polygon.length;
  return Object.freeze(polygon.map((p, i) => {
    const a = polygon[(i + n - 1) % n], b = polygon[(i + 1) % n];
    // The outward normal of each side (the polygon runs anticlockwise on the page: x east, z north), averaged.
    const side = (from, to) => { const dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz) || 1; return [dz / len, -dx / len]; };
    const s1 = side(a, p), s2 = side(p, b);
    let nx = s1[0] + s2[0], nz = s1[1] + s2[1];
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    // Keep the distance true round a bend.
    const k = 1 / Math.max(0.6, nx * s1[0] + nz * s1[1]);
    return [Math.round((p[0] + nx * distance * k) * 100) / 100, Math.round((p[1] + nz * distance * k) * 100) / 100];
  }));
}

export const SEA_DEPTHS = Object.freeze([
  Object.freeze({metres: 20, points: offsetPolygon(LAND, 1.6)}),
  Object.freeze({metres: 100, points: offsetPolygon(LAND, 4)}),
  Object.freeze({metres: 500, points: offsetPolygon(LAND, 8)}),
]);

// Regions the chart tints. kind: forest, desert, city, mountain (contours with
// the height they stand for, metres), lake, mesa.
const region = (id, kind, name, points, extra = {}) => Object.freeze({id, kind, name, points, ...extra});
export const REGIONS = Object.freeze([
  region('tremblant-valley', 'forest', 'Tremblant valley', blob(2, 3, 8, 7, 0.4)),
  region('ardennes-hills', 'forest', 'Ardennes hills', blob(9.5, 5.5, 4.6, 4, 1.7)),
  region('eifel-hills', 'forest', 'Eifel hills', blob(13.5, 10.5, 3.6, 3.4, 2.9)),
  region('timberline', 'forest', 'Tree line', blob(-12.5, 17.5, 4.2, 3, 3.8)),
  region('western-desert', 'desert', 'Western desert', blob(-18.4, -2.5, 6.4, 10, 0.9)),
  region('dry-ridges', 'desert', 'Dry ridges', blob(-14.5, 7, 3.2, 3.2, 4.4)),
  region('harbour-city', 'city', 'Harbour city', blob(15.5, -10.3, 5.2, 3.4, 5.2)),
  region('stadium-quarter', 'city', 'Stadium quarter', blob(10, -6, 2.2, 1.8, 0.2)),
  region('southern-lawns', 'forest', 'Southern lawns', blob(4, -13, 5.5, 3, 1.1)),
  region('summit-massif-1500', 'mountain', 'Summit massif', blob(-9, 14, 7.5, 9.5, 0.6), {metres: 1500}),
  region('summit-massif-2500', 'mountain', 'Summit massif', blob(-9.5, 14.5, 5.2, 6.8, 1.9), {metres: 2500}),
  region('summit-massif-3500', 'mountain', 'Summit massif', blob(-10, 12.5, 2.8, 3.6, 3.1), {metres: 3500}),
  region('northern-alps-1500', 'mountain', 'Northern alps', blob(-6, 24, 6, 6.5, 2.4), {metres: 1500}),
  region('northern-alps-2500', 'mountain', 'Northern alps', blob(-6.5, 24.5, 3.8, 4.2, 0.5), {metres: 2500}),
  region('lake-tremblant', 'lake', 'Lake Tremblant', blob(3.6, -2.4, 1.3, 0.8, 0.8, 16)),
  region('lake-ardennes', 'lake', 'Ardennes mere', blob(4.4, 9.8, 1.1, 0.7, 2.2, 16)),
  region('lake-tarn', 'lake', 'High tarn', blob(-5.6, 17.4, 0.6, 0.45, 3.3, 12)),
  region('the-table-mesa', 'mesa', 'The Table', blob(-16, -3, 0.45, 0.4, 1.4, 12)),
]);

// Rivers: from the high ground to the coast, [x, z] points.
export const RIVERS = Object.freeze([
  Object.freeze({id: 'tremblant-river', name: 'Tremblant river', points: Object.freeze([[-3.5, 18.5], [-1.5, 12.5], [-1.6, 8.5], [2.3, 5.4], [3.1, 0.2], [4.6, -4.4], [6.4, -10], [7.6, -15.2], [8.2, -18.9]])}),
  Object.freeze({id: 'ridge-river', name: 'Ridge river', points: Object.freeze([[-12, 10.5], [-17.5, 10.2], [-22, 11.2], [-27.8, 11.5]])}),
  Object.freeze({id: 'eastern-river', name: 'Eastern river', points: Object.freeze([[10.5, 7.8], [12.4, 1.5], [12.5, -5], [12.1, -13], [12.3, -15.4]])}),
]);

// The roads that join the towns (thin lines on the chart), by place id.
export const MAP_ROADS = Object.freeze([
  ['tremblant-woods', 'tremblant-snow'], ['tremblant-woods', 'ardennes-forest'], ['ardennes-forest', 'eifel-crown'],
  ['tremblant-snow', 'panorama-ridge'], ['panorama-ridge', 'summit-run'], ['panorama-ridge', 'ridge-rally'],
  ['summit-run', 'timberline-rush'], ['timberline-rush', 'alpine-serpent'], ['alpine-serpent', 'cloudbreak-skyway'],
  ['ridge-rally', 'red-mesa'], ['red-mesa', 'pacific-canyon'], ['ridge-rally', 'high-country'], ['timberline-rush', 'high-country'],
  ['tremblant-woods', 'titan-stadium'], ['titan-stadium', 'harbour-lights'], ['harbour-lights', 'neon-docks'], ['neon-docks', 'neon-drift-trial'],
  ['harbour-lights', 'midnight-chase'], ['harbour-lights', 'harbor-highlands'], ['harbour-lights', 'azure-riviera'],
]);

export const MAP_SHAPES = Object.freeze({land: LAND, seaDepths: SEA_DEPTHS, regions: REGIONS, rivers: RIVERS, roads: MAP_ROADS});

// ---- Outlines ---------------------------------------------------------------------------
// The traced outlines live in src/generated/pilot-map.json (relative to the
// place's own centre, km). This puts one where its place is drawn. `traced` is
// that file's parsed contents, passed in so this module stays data only.
export function placeOutline(traced, id) {
  const p = placeById(id), outline = traced?.outlines?.[id];
  if (!p || !outline) return null;
  return {closed: outline.closed, points: outline.points.map(([x, z]) => [p.drawAt.x + x, p.drawAt.z + z])};
}

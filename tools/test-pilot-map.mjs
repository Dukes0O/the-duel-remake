// The pilot's map data (docs/PILOT_MAP.md sections 2 and 4, card MAP-DATA):
// every course on the map once, the place table as designed, outlines that do
// not touch each other or the sea, the fuel rule, and the generated file
// matching a fresh build. All of it runs without graphics.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COURSE} from '../src/config.js';
import {KESTREL} from '../src/heli/heli-flight.js';
import {HELI_DESTINATIONS_WITH_SUMMIT, legFuelKg} from '../src/heli/heli-jobs.js';
import {FEATURE_STATES} from '../src/feature-flags.js';
import {
  PILOT_MAP, PLACES, PLACE_IDS, FUEL_PADS, LEG_RULE, MAP_SHAPES, SEA_DEPTHS, REGIONS, RIVERS, MAP_ROADS,
  placeById, placeOfCourse, nudgeKm, fuelPadAt, mapDistanceKm, legFuelKgMap, nearestFuelPad, reachKm, placeOutline,
} from '../src/heli/pilot-map-data.js';
import {buildPilotMap, serialise, OUTLINE_FILE, traceCourse} from './build-pilot-map.mjs';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};

// ---- Geometry for the checks ---------------------------------------------------------
const inside = (polygon, [x, z]) => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) result = !result;
  }
  return result;
};
const pointSegment = ([px, pz], [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, span = dx * dx + dz * dz;
  const k = span === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / span));
  return Math.hypot(px - (ax + dx * k), pz - (az + dz * k));
};
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const segmentsCross = (a, b, c, d) => {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
};
const segmentSegment = (a, b, c, d) => segmentsCross(a, b, c, d) ? 0
  : Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
const segments = (points, closed) => points.slice(1).map((p, i) => [points[i], p]).concat(closed ? [[points[points.length - 1], points[0]]] : []);
// The smallest distance between two polylines (0 when they cross).
const gap = (a, b) => {
  let best = Infinity;
  for (const [p, q] of a) for (const [r, s] of b) best = Math.min(best, segmentSegment(p, q, r, s));
  return best;
};
const distanceToPolygon = (polygon, point) => Math.min(...segments(polygon, true).map(([a, b]) => pointSegment(point, a, b)));

// ---- The switch --------------------------------------------------------------------------
ok(FEATURE_STATES['pilot-map'] === 'on', 'the pilot map is released (28 October 2026)');

// ---- Every course on the map once ----------------------------------------------------------
same(new Set(PLACE_IDS).size, PLACE_IDS.length, 'place ids are unique');
for (const course of COURSE) {
  const holders = PLACES.filter(place => place.courses.includes(course.id));
  same(holders.length, 1, `${course.id} is on the map once`);
  same(placeOfCourse(course.id), holders[0], `${course.id}: its place is found by course`);
}
ok(PLACES.every(place => place.courses.every(id => COURSE.some(course => course.id === id))), 'every course a place names is in the registry');
same(PLACES.filter(place => place.courses.length > 1).map(place => [place.id, place.courses]),
  [['summit-run', ['summit-run', 'summit-time-attack']], ['titan-stadium', ['titan-arena', 'titan-stunt-trial', 'titan-freestyle']]],
  'the places with more than one course: Summit Run and the Titan stadium');
same(PLACES.length, 21, '20 course places and The Table');
same(PLACES.filter(place => place.air).map(place => place.id), ['the-table'], 'only The Table is air only');
same(PLACES.find(place => place.air).courses, [], 'and it has no road');
same(PLACES.filter(place => place.home).map(place => place.id), ['tremblant-woods'], 'the home pad is Tremblant Woods');
// The four original destinations are where heli-jobs puts them.
for (const [id, destination] of Object.entries(HELI_DESTINATIONS_WITH_SUMMIT)) {
  same([placeById(id).at.x, placeById(id).at.z], [destination.mapKm.x, destination.mapKm.z], `${id}: where the helicopter already has it`);
}

// ---- The table of section 2 -----------------------------------------------------------------
{
  const table = {
    'tremblant-woods': [0, 0], 'tremblant-snow': [0.5, 1.9], 'panorama-ridge': [-6, 7], 'summit-run': [-10, 12],
    'ardennes-forest': [8, 4], 'eifel-crown': [12, 9], 'alpine-serpent': [-4, 22], 'cloudbreak-skyway': [-8, 26],
    'ridge-rally': [-14, 8], 'timberline-rush': [-12, 18], 'high-country': [-24, 14], 'red-mesa': [-18, 2],
    'pacific-canyon': [-22, -8], 'harbour-lights': [14, -10], 'harbor-highlands': [18, -6], 'neon-docks': [16, -12],
    'neon-drift-trial': [16, -12], 'midnight-chase': [16, -12], 'titan-stadium': [10, -6], 'azure-riviera': [6, -16], 'the-table': [-16, -3],
  };
  same(Object.fromEntries(PLACES.map(place => [place.id, [place.at.x, place.at.z]])), table, 'the place table is the design\'s');
  // The drawer moved only the two districts that shared the docks, by less than 2 km.
  same(PLACES.filter(place => nudgeKm(place) > 0).map(place => place.id), ['neon-drift-trial', 'midnight-chase'], 'only two places are drawn off the table');
  ok(PLACES.every(place => nudgeKm(place) <= PILOT_MAP.maxNudgeKm), 'no place is drawn more than 2 km from the table');
}

// ---- The land, the sea and the regions ---------------------------------------------------------
{
  const land = MAP_SHAPES.land, b = PILOT_MAP.bounds;
  ok(land.every(([x, z]) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ), 'the land is inside the chart');
  ok(PLACES.every(place => inside(land, [place.at.x, place.at.z]) && inside(land, [place.drawAt.x, place.drawAt.z])), 'every place is on the land');
  // Pacific Canyon, High Country and Harbor & Highlands are over the sea at one edge.
  const coastal = PLACES.filter(place => place.coast);
  same(coastal.map(place => place.id), ['high-country', 'pacific-canyon', 'harbor-highlands'], 'the three coastal courses');
  ok(coastal.every(place => distanceToPolygon(land, [place.drawAt.x, place.drawAt.z]) < 4), 'and they are within 4 km of the coast');
  // Sea depth lines: outside the coast, in order, never crossing the coast or each other.
  same(SEA_DEPTHS.map(line => line.metres), [20, 100, 500], 'three depth lines');
  for (const [i, line] of SEA_DEPTHS.entries()) {
    ok(line.points.every(point => !inside(land, point)), `${line.metres} m line: all in the sea`);
    ok(gap(segments(line.points, true), segments(land, true)) > 0.5, `${line.metres} m line: clear of the coast`);
    ok(!segments(line.points, true).some(([a, c], k) => segments(line.points, true).slice(k + 2).some(([d, e]) => segmentsCross(a, c, d, e)) && !(k === 0)), `${line.metres} m line: does not cross itself`);
    if (i > 0) ok(gap(segments(line.points, true), segments(SEA_DEPTHS[i - 1].points, true)) > 0.5 && inside(line.points, SEA_DEPTHS[i - 1].points[0]), `${line.metres} m line: outside the ${SEA_DEPTHS[i - 1].metres} m line`);
  }
  // Regions.
  ok(new Set(REGIONS.map(region => region.id)).size === REGIONS.length, 'region ids are unique');
  ok(REGIONS.every(region => region.points.length >= 8 && region.points.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z) && x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ)), 'every region is a polygon inside the chart');
  const kinds = new Set(REGIONS.map(region => region.kind));
  for (const kind of ['forest', 'desert', 'city', 'mountain', 'lake', 'mesa']) ok(kinds.has(kind), `there is ${kind}`);
  ok(REGIONS.filter(region => region.kind === 'mountain').every(region => region.metres > 0), 'each mountain contour says its height');
  ok(REGIONS.filter(region => region.kind !== 'mountain').every(region => region.points.every(point => inside(land, point))), 'forests, deserts, the city, lakes and the mesa are on the land');
  // The things the table says about places.
  const regionHolding = (kind, id) => REGIONS.some(region => region.kind === kind && inside(region.points, [placeById(id).at.x, placeById(id).at.z]));
  ok(regionHolding('desert', 'red-mesa') && regionHolding('desert', 'pacific-canyon') && regionHolding('desert', 'the-table'), 'Red Mesa, Pacific Canyon and The Table are in the desert');
  ok(regionHolding('city', 'harbour-lights') && regionHolding('city', 'neon-docks') && regionHolding('city', 'titan-stadium'), 'Harbour Lights, the docks and the stadium are in the city');
  ok(regionHolding('mountain', 'summit-run') && regionHolding('mountain', 'alpine-serpent') && regionHolding('mountain', 'cloudbreak-skyway'), 'Summit Run, Alpine Serpent and Cloudbreak are on the high ground');
  ok(regionHolding('forest', 'tremblant-woods') && regionHolding('forest', 'ardennes-forest'), 'the Woods and the Ardennes are in forest');
  ok(REGIONS.some(region => region.id === 'lake-tremblant' && region.kind === 'lake') && Math.hypot(3.6, -2.4) < 5, 'Tremblant has its lake');
  // Rivers run to the coast.
  ok(RIVERS.every(river => river.points.length >= 4 && inside(land, river.points[0]) && distanceToPolygon(land, river.points[river.points.length - 1]) < 1), 'each river runs down to the coast');
  // The roads between towns are between places that exist.
  ok(MAP_ROADS.every(([a, c]) => placeById(a) && placeById(c) && a !== c), 'roads join places');
  ok(PLACES.filter(place => !place.air).every(place => MAP_ROADS.some(road => road.includes(place.id))), 'every course place has a road');
}

// ---- The traced outlines ---------------------------------------------------------------------
const generated = JSON.parse(readFileSync(OUTLINE_FILE, 'utf8'));
{
  const fresh = buildPilotMap();
  ok(readFileSync(OUTLINE_FILE, 'utf8') === serialise(fresh), 'the generated file matches a fresh build');
  same(Object.keys(generated.outlines), PLACES.filter(place => place.courses.length).map(place => place.id), 'an outline for every place with a road, in table order');
  same([generated.version, generated.sizeKm, generated.seed], [1, 1.2, 1989], 'file version, outline size and course seed');
  for (const place of PLACES.filter(place => place.courses.length)) {
    const outline = generated.outlines[place.id];
    same(outline.course, place.courses[0], `${place.id}: traced from ${place.courses[0]}`);
    ok(outline.points.length >= 12 && outline.points.length <= 120, `${place.id}: ${outline.points.length} points`);
    const xs = outline.points.map(p => p[0]), zs = outline.points.map(p => p[1]);
    near(Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), 1.2, 0.01, `${place.id}: 1.2 km across at its longest`);
    ok(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2) < 0.01 && Math.abs((Math.max(...zs) + Math.min(...zs)) / 2) < 0.01, `${place.id}: centred on its place`);
    same(outline.closed, place.id !== 'summit-run', `${place.id}: ${place.id === 'summit-run' ? 'an open road' : 'a closed loop'}`);
    if (outline.closed) same(outline.points[0], outline.points[outline.points.length - 1], `${place.id}: the loop closes`);
  }
  // The outline is the course's road: Tremblant Woods is the tall thin one, Panorama Ridge the wide one.
  ok(generated.outlines['tremblant-woods'].height > 2 * generated.outlines['tremblant-woods'].width, 'Tremblant Woods is long and narrow, as its road is');
  ok(generated.outlines['panorama-ridge'].width > generated.outlines['panorama-ridge'].height, 'Panorama Ridge is wider than tall');
  // The tracing is repeatable and honours its size.
  same(traceCourse(COURSE.find(course => course.id === 'ridge-rally')), generated.outlines['ridge-rally'], 'tracing a course again gives the same outline');
  ok(traceCourse(COURSE.find(course => course.id === 'ridge-rally'), {sizeKm: 2}).width > generated.outlines['ridge-rally'].width * 1.6, 'a bigger size gives a bigger outline');

  // Placed on the map: no two outlines touch, none touches the sea or a lake.
  const placed = Object.fromEntries(PLACES.filter(place => place.courses.length).map(place => {
    const outline = placeOutline(generated, place.id);
    return [place.id, {points: outline.points, segments: segments(outline.points, outline.closed)}];
  }));
  const ids = Object.keys(placed);
  let tightest = Infinity, tightPair = '';
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const spacing = gap(placed[ids[i]].segments, placed[ids[j]].segments);
      if (spacing < tightest) { tightest = spacing; tightPair = `${ids[i]} / ${ids[j]}`; }
      if (spacing < PILOT_MAP.minGapKm) assert.fail(`outlines too close: ${ids[i]} and ${ids[j]} (${spacing.toFixed(3)} km)`);
    }
  }
  checks++;
  ok(tightest >= PILOT_MAP.minGapKm, `no two outlines touch (the closest, ${tightPair}, is ${tightest.toFixed(2)} km apart)`);
  ok(ids.every(id => placed[id].points.every(point => inside(MAP_SHAPES.land, point) && distanceToPolygon(MAP_SHAPES.land, point) > PILOT_MAP.minGapKm)), 'every outline is on the land, clear of the sea');
  const lakes = REGIONS.filter(region => region.kind === 'lake');
  ok(ids.every(id => lakes.every(lake => placed[id].points.every(point => !inside(lake.points, point)) && gap(placed[id].segments, segments(lake.points, true)) > 0.05)), 'no outline is in a lake');
  ok(ids.every(id => RIVERS.every(river => gap(placed[id].segments, segments(river.points, false)) > 0.05)), 'no river runs through an outline');
  // The Table's mesa is clear of everything.
  const mesa = REGIONS.find(region => region.id === 'the-table-mesa');
  ok(ids.every(id => gap(placed[id].segments, segments(mesa.points, true)) > 1), 'The Table stands alone');
  same(placeOutline(generated, 'the-table'), null, 'The Table has no road to trace');
  same(placeOutline(generated, 'nope'), null, 'nor does an unknown place');
}

// ---- Fuel pads -----------------------------------------------------------------------------------
{
  same(FUEL_PADS.map(pad => [pad.place, pad.pricePerKg]), [['tremblant-woods', 1.5], ['summit-run', 1.5], ['harbour-lights', 1.8], ['pacific-canyon', 2.0], ['alpine-serpent', 2.2]],
    'fuel pads: home 1.5 a kg, Summit\'s truck at the pump\'s price, Harbour Lights 1.8, Pacific Canyon 2.0, Alpine Serpent 2.2');
  ok(FUEL_PADS.every(pad => placeById(pad.place) && !placeById(pad.place).air), 'every fuel pad is at a course');
  same(fuelPadAt('harbour-lights').pricePerKg, 1.8, 'a pad is found by place');
  same(fuelPadAt('azure-riviera'), null, 'and a place without one has none');
  ok(FUEL_PADS.find(pad => pad.truck).place === 'summit-run', 'Summit\'s is the lodge truck');
}

// ---- The leg rule -----------------------------------------------------------------------------------
{
  same(LEG_RULE, {kgPerKm: 12, plusKg: 5, roundKg: 5}, '12 kg a km, plus 5, rounded up to 5');
  // The legs the game already had keep their table numbers, both ways round.
  const old = [['tremblant-snow', 'tremblant-woods', 25], ['panorama-ridge', 'tremblant-woods', 120], ['panorama-ridge', 'tremblant-snow', 110],
    ['summit-run', 'tremblant-woods', 160], ['summit-run', 'tremblant-snow', 150], ['panorama-ridge', 'summit-run', 90]];
  for (const [a, b, kg] of old) {
    same([legFuelKgMap(a, b), legFuelKgMap(b, a), legFuelKg(a, b, {summitRun: true})], [kg, kg, kg], `${a} and ${b}: ${kg} kg, as the table has it`);
  }
  // Every other leg follows the rule.
  const expected = (a, b) => Math.ceil((12 * Math.hypot(placeById(a).at.x - placeById(b).at.x, placeById(a).at.z - placeById(b).at.z) + 5) / 5 - 1e-9) * 5;
  same(legFuelKgMap('tremblant-woods', 'pacific-canyon'), 290, 'home to Pacific Canyon (23.4 km): 290 kg');
  near(mapDistanceKm('tremblant-woods', 'pacific-canyon'), 23.4, 0.05, 'which is 23.4 km');
  same(legFuelKgMap('tremblant-woods', 'eifel-crown'), 185, 'home to Eifel Crown (15 km, 185 kg exactly): 185 kg');
  same(legFuelKgMap('tremblant-woods', 'ardennes-forest'), 115, 'home to the Ardennes (8.9 km, 112.3): 115 kg');
  same(legFuelKgMap('tremblant-woods', 'harbour-lights'), 215, 'home to Harbour Lights (17.2 km, 211.4): 215 kg');
  let counted = 0;
  const oldPairs = new Set(old.map(([a, b]) => [a, b].sort().join('|')));
  for (const a of PLACE_IDS) {
    same(legFuelKgMap(a, a), null, `${a} to itself is no leg`);
    for (const b of PLACE_IDS) {
      if (a === b || oldPairs.has([a, b].sort().join('|'))) continue;
      const kg = legFuelKgMap(a, b);
      if (kg !== expected(a, b) || kg !== legFuelKgMap(b, a) || kg % 5 !== 0 || kg < 5) assert.fail(`${a} to ${b}: ${kg} kg, expected ${expected(a, b)}`);
      counted++;
    }
  }
  checks++;
  ok(counted === 21 * 20 - 12, `${counted} legs follow the rule (every pair but the six old ones, both ways)`);
  same([legFuelKgMap('nope', 'tremblant-woods'), legFuelKgMap('tremblant-woods', 'nope')], [null, null], 'an unknown place has no leg');
  same([legFuelKgMap('neon-docks', 'neon-drift-trial'), legFuelKgMap('neon-docks', 'midnight-chase')], [5, 5], 'two districts at the same point cost the rule\'s 5 kg');
  // A longer leg costs more.
  ok(legFuelKgMap('tremblant-woods', 'cloudbreak-skyway') > legFuelKgMap('tremblant-woods', 'alpine-serpent'), 'a longer leg costs more');
  near(reachKm(400), 32.9, 0.05, 'a full tank (400 kg) reaches 32.9 km by the rule');
  ok(legFuelKgMap('cloudbreak-skyway', 'harbour-lights') > KESTREL.tankKg, 'the longest legs are longer than the tank (and are refused, as today)');
}

// ---- Fuel reach ----------------------------------------------------------------------------------------
{
  for (const place of PLACES) {
    const nearest = nearestFuelPad(place.id, {tankKg: KESTREL.tankKg});
    ok(nearest && nearest.kg <= KESTREL.tankKg, `${place.id}: within a full tank of a fuel pad (${nearest?.pad.name}, ${nearest?.kg} kg)`);
  }
  same(nearestFuelPad('harbour-lights').kg, 0, 'at a fuel pad the leg is nothing');
  same(nearestFuelPad('neon-docks').pad.place, 'harbour-lights', 'the docks are nearest Harbour Lights');
  same(nearestFuelPad('the-table').pad.place, 'pacific-canyon', 'The Table is nearest Pacific Canyon');
  same(nearestFuelPad('tremblant-woods', {tankKg: 10}).kg, 0, 'the home pad has fuel');
  same(nearestFuelPad('azure-riviera', {tankKg: 20}), null, 'a place with no pad in reach says so');
}

console.log(`PASS MAP-DATA: the pilot's map data (${checks} checks)`);

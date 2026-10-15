import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {referenceLap} from '../src/reference-laps.js';
import {basinReach} from '../src/circuit-hills.js';
import {escapeFrame} from '../src/escape-roads.js';
import {pitAt} from '../src/pit-lane.js';
import {
  COURSE_SPECIES, SPECIES, SPECIES_IDS, SEA_LEVEL,
  availableSpecies, createPlacementChecker, modelIdsFor, sightingSpotCount, wildlifeSeed, planWildlife, placeWildlife, lapClock, speciesFor,
} from '../src/wildlife.js';

// WILD-PLACE (docs/HELI_WILDLIFE.md section 3): where the animals stand. The
// placement is checked against the course's own data and, where possible,
// against a second calculation made here rather than the one it uses.
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };

const definitions = new Map([...COURSE, ...ALL_CIRCUITS].map(definition => [definition.id, definition]));
const APPROVED = new Set(SPECIES_IDS);
const courses = new Map();
function courseFor(id) {
  if (!courses.has(id)) {
    const definition = definitions.get(id);
    assert.ok(definition, `${id} is a real course`);
    courses.set(id, new Course(definition, definition.layoutSeed ?? 1989));
  }
  return courses.get(id);
}
const referenceFor = id => referenceLap(id, 'fixed') ?? referenceLap(id, 'route_a');
const place = (id, day, race, approved = APPROVED) => placeWildlife({
  courseId: id, playDay: day, raceNumber: race, course: courseFor(id), referenceLap: referenceFor(id), approvedModels: approved,
});

// ---- The species tables ----------------------------------------------------
for (const [id, table] of Object.entries(COURSE_SPECIES)) {
  check(definitions.has(id), `${id} is a real course`);
  check(table.common.length >= 3 && table.common.length <= 4, `${id} has three or four common species`);
  check(table.rare && SPECIES[table.rare.species], `${id} has one known rare species`);
  for (const item of [...table.common, table.rare]) {
    check(SPECIES[item.species], `${item.species} is a known species`);
    check(item.weight > 0 && item.herd[0] >= 1 && item.herd[1] >= item.herd[0], `${id}/${item.species} has a sensible weight and herd size`);
  }
  equal(new Set(modelIdsFor(id)).size, table.common.length + 1, `${id} lists each species once`);
}
for (const id of ['titan-arena', 'titan-stunt-trial', 'titan-freestyle']) {
  check(speciesFor(id) === null && modelIdsFor(id).length === 0, `${id} has no species`);
}
equal(COURSE_SPECIES['tremblant-woods'].common.map(item => item.species), ['white-tailed-deer', 'moose', 'black-bear', 'beaver'], 'Tremblant Woods animals follow section 3.1');
equal(COURSE_SPECIES['tremblant-woods'].rare.species, 'eastern-wolf', 'Tremblant Woods rare animal is the eastern wolf');
check(![...COURSE_SPECIES['tremblant-woods'].common, COURSE_SPECIES['tremblant-woods'].rare].some(item => item.species === 'cougar'), 'No cougar at Tremblant Woods');
check(!COURSE_SPECIES['tremblant-snow'].common.some(item => item.species === 'cougar'), 'No cougar at Tremblant Snow');

// ---- Only approved models appear ---------------------------------------------
equal(availableSpecies('tremblant-woods', []).common, [], 'No approved models: no animals');
equal(availableSpecies('tremblant-woods', null).any, false, 'Nothing approved yet means nothing stands there');
equal(availableSpecies('tremblant-woods', ['eastern-wolf']).any, false, 'A rare animal alone does not make a course have animals');
equal(availableSpecies('tremblant-woods', ['moose', 'eastern-wolf']).common.map(item => item.species), ['moose'], 'Only approved common species stay');
equal(availableSpecies('tremblant-woods', ['moose', 'eastern-wolf']).rare?.species, 'eastern-wolf', 'An approved rare species stays');
equal(availableSpecies('tremblant-woods', new Set(['moose'])).rare, null, 'An unapproved rare species goes');
equal(availableSpecies('harbour-lights', ['cat', 'pigeon']).common.map(item => item.species), ['pigeon'], 'Night animals wait for a night course');
equal(availableSpecies('harbour-lights', ['cat', 'pigeon'], {night: true}).common.map(item => item.species), ['pigeon', 'cat'], 'Night animals appear at night');
equal(availableSpecies('titan-arena', APPROVED).any, false, 'Titan arenas have no animals');
equal(place('tremblant-woods', 3, 1, []).spots, [], 'A course with no approved models gets no animals');
equal(place('tremblant-woods', 3, 1, ['moose', 'white-tailed-deer']).spots.every(spot => ['moose', 'white-tailed-deer'].includes(spot.species)), true, 'Placement uses approved species only');
check(place('tremblant-woods', 3, 1, ['moose', 'white-tailed-deer']).spots.length > 0, 'A course with some approved animals gets some');

// ---- How many spots ----------------------------------------------------------
equal(sightingSpotCount(77.068), 2, 'Tremblant Woods, 77 s, gets 2 spots');
equal([1, 10, 22, 23, 67, 68, 112, 113, 600].map(sightingSpotCount), [1, 1, 1, 1, 1, 2, 2, 3, 8], 'Spot count is the lap over 45 s, rounded, from 1 to 8');
for (const [id, spots] of [['tremblant-woods', 2], ['tremblant-snow', 2], ['panorama-ridge', 2], ['harbour-lights', 2], ['ardennes-forest', 3]]) {
  equal(sightingSpotCount(referenceFor(id).lapMs / 1000), spots, `${id} reference lap gives ${spots} spots`);
  equal(place(id, 7, 1).spots.length, spots, `${id} places all ${spots} spots`);
}
const summit = place('summit-run', 2, 1);
check(summit.estimatedLap && summit.spotCount === sightingSpotCount(courseFor('summit-run').length / 45), 'Summit Run has no reference lap, so its pace is estimated from its length');
check(summit.spotCount >= 6 && summit.spots.length === summit.spotCount, 'Summit Run places every spot along its long road');

// ---- The seed ----------------------------------------------------------------
equal(JSON.stringify(place('tremblant-woods', 12, 3)), JSON.stringify(place('tremblant-woods', 12, 3)), 'Same course, day and race give the same animals');
equal(wildlifeSeed('tremblant-woods', 12, 3), wildlifeSeed('tremblant-woods', 12, 3), 'The seed is repeatable');
const races = [1, 2, 3, 4, 5, 6].map(race => JSON.stringify(place('tremblant-woods', 12, race).spots.map(spot => [spot.species, Math.round(spot.s), spot.animals.length])));
equal(new Set(races).size, races.length, 'Every race number gives different spots');
check(JSON.stringify(place('tremblant-woods', 13, 1).spots) !== JSON.stringify(place('tremblant-woods', 12, 1).spots), 'A different play day gives different spots');
check(JSON.stringify(place('tremblant-snow', 12, 1).spots) !== JSON.stringify(place('tremblant-woods', 12, 1).spots), 'A different course gives different spots');
check(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(race => wildlifeSeed('tremblant-woods', 1, race))).size === 8, 'Race numbers give different seeds');

// ---- The rare animal: one race in five ----------------------------------------
{
  let rare = 0; const total = 5000;
  for (let race = 1; race <= total; race++) if (planWildlife({courseId: 'tremblant-woods', playDay: 40, raceNumber: race, lapSeconds: 77.068}).rareIndex !== null) rare++;
  check(Math.abs(rare / total - 1 / 5) < .02, `About one race in five has the rare animal (${rare}/${total})`);
  let held = 0, planned = 0;
  for (let race = 1; race <= 60; race++) {
    const plan = planWildlife({courseId: 'tremblant-woods', playDay: 5, raceNumber: race, lapSeconds: 77.068});
    const spots = place('tremblant-woods', 5, race).spots, rareSpots = spots.filter(spot => spot.rare);
    check(rareSpots.length <= 1, 'At most one spot per race holds the rare animal');
    if (plan.rareIndex !== null) { planned++; if (rareSpots.length === 1 && rareSpots[0].index === plan.rareIndex && rareSpots[0].species === 'eastern-wolf') held++; }
    else check(rareSpots.length === 0, 'No rare animal when the race rolled none');
  }
  check(planned > 3 && held >= planned - 1, `The planned spot holds the rare animal (${held}/${planned})`);
}

// ---- Spots are far enough apart in lap time -----------------------------------
function gaps(result) {
  const lap = result.lapSeconds, times = result.spots.map(spot => spot.timeS);
  const out = [];
  for (let a = 0; a < times.length; a++) for (let b = a + 1; b < times.length; b++) {
    const d = Math.abs(times[a] - times[b]);
    out.push(courses.get(result.courseId).closed ? Math.min(d, lap - d) : d);
  }
  return out;
}

// ---- Every animal stands where it should --------------------------------------
const OUT_OF_THE_WAY = ['tremblant-woods', 'tremblant-snow', 'harbour-lights', 'panorama-ridge', 'summit-run', 'ardennes-forest',
  'pacific-canyon', 'high-country', 'red-mesa', 'azure-riviera', 'harbor-highlands', 'ridge-rally'];
const seen = new Set();
let animalsChecked = 0;
for (const id of OUT_OF_THE_WAY) {
  const course = courseFor(id), samples = course.samples, lanes = course.features.shortcuts.length > 0;
  for (let race = 1; race <= 6; race++) {
    const result = place(id, 20, race);
    check(result.spots.length >= 1, `${id} race ${race} has animals`);
    for (const gap of gaps(result)) check(gap >= 25 - 1e-6, `${id}: spots are at least 25 s of reference lap apart (${gap.toFixed(1)})`);
    for (const spot of result.spots) {
      const table = speciesFor(id), row = [...table.common, table.rare].find(item => item.species === spot.species);
      check(row, `${id}: ${spot.species} belongs to the course`);
      check(spot.rare === (spot.species === table.rare.species), `${id}: the rare flag matches the species`);
      const adults = spot.animals.filter(animal => !animal.cub).length;
      check(adults >= 1 && adults <= row.herd[1] && (!spot.complete || spot.cubs || adults >= row.herd[0]), `${id}: ${spot.species} herd size ${adults} is within ${row.herd}`);
      check(spot.animals.every(animal => animal.species === spot.species), 'One species to a herd');
      seen.add(spot.species);
      for (const animal of spot.animals) {
        animalsChecked++;
        const info = SPECIES[animal.species], label = `${id} ${animal.species} at s=${animal.s.toFixed(0)}`;
        // Distance to the road edge, measured here along the centreline's own segments.
        let best = Infinity, bestS = 0;
        for (let i = 1; i < samples.length; i++) {
          const a = samples[i - 1], b = samples[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((animal.x - a.x) * dx + (animal.z - a.z) * dz) / length2));
          const d = Math.hypot(animal.x - a.x - t * dx, animal.z - a.z - t * dz);
          if (d < best) { best = d; bestS = a.s + t * (b.s - a.s); }
        }
        const edge = best - course.roadHalfWidthAt(bestS), band = info.edge ?? [15, 70];
        check(edge >= band[0] - .6, `${label}: at least ${band[0]} m from the road edge (${edge.toFixed(1)})`);
        check(animal.edgeDistance >= band[0] - 1e-6 && animal.edgeDistance <= band[1] + 1e-6, `${label}: reported edge distance in ${band}`);
        check(lanes || edge <= band[1] + .6, `${label}: no more than ${band[1]} m from the road edge (${edge.toFixed(1)})`);
        check(animal.perching === (info.kind === 'bird'), `${label}: only birds perch`);
        // Not on any road, run-off, escape road, pit lane, wall, building, tunnel, lake or sea.
        const near = course.nearest(animal.x, animal.z);
        check(!course.surfaceAt(near.s, near.lateral).road, `${label}: not on a road`);
        if (course.script) check(edge >= course.script.runoffAt(near.s, Math.sign(near.lateral) || 1) + 2.5, `${label}: not in the run-off`);
        for (const escape of course.escapeRoads ?? []) {
          const {u, v} = escapeFrame(escape, animal.x, animal.z);
          check(!(u > -3 && u < escape.run + 3 + escape.tyreDepth && v > escape.inner - 3 && v < escape.outer + 4), `${label}: not on an escape road`);
        }
        check(!pitAt(course, near.s, near.lateral), `${label}: not in the pit lane`);
        if (course.pitLane) check(Math.sign(near.lateral) !== course.pitLane.side || near.s < course.pitLane.entry - 25 || near.s > course.pitLane.exit + 25, `${label}: not on the pit side or paddock`);
        for (const o of course.features.obstacles) {
          const dx = animal.x - o.x, dz = animal.z - o.z, c = Math.cos(o.heading), s = Math.sin(o.heading), lx = dx * c - dz * s, lz = dx * s + dz * c;
          const inside = o.shape === 'ellipse' ? (lx / o.halfX) ** 2 + (lz / o.halfZ) ** 2 < 1 : Math.abs(lx) < o.halfX && Math.abs(lz) < o.halfZ;
          assert.ok(!inside, `${label}: not inside ${o.id}`);
        }
        check(!course.tunnelAt(near.s), `${label}: not over a tunnel`);
        for (const basin of course.def.basins ?? []) {
          const du = course.phase(near.s) - basin.s, dv = near.lateral - basin.lateral, reach = basinReach(basin, du, dv);
          if (reach < 1) {
            check(info.lake || info.shallows, `${label}: only the beaver and the moose enter a lake`);
            check(Math.hypot(du, dv) * (1 / reach - 1) <= 3 + 1e-6, `${label}: at most 3 m out into the lake`);
          }
          if (reach >= 1 && !info.lake && !info.shallows) check(Math.hypot(du, dv) * (1 - 1 / reach) >= 1.4, `${label}: clear of the water's edge`);
        }
        if (info.lake) check((course.def.basins ?? []).length > 0 && animal.lakeOut <= 3 && animal.lakeOut >= -6, `${label}: the beaver stays at the shore`);
        if (course.sectionAt(near.s).theme === 'coast') check(animal.y > -15, `${label}: not in the sea`);
        check(Number.isFinite(animal.y), `${label}: stands on the ground`);
      }
    }
  }
}
check(animalsChecked > 300, `Checked ${animalsChecked} animals on ${OUT_OF_THE_WAY.length} courses`);
check(seen.size >= 15, `A good spread of species appears (${seen.size})`);

// The paddock at the start of Tremblant Woods stays free of animals (pit garages, wall and stands from s 4 to 84, 31 m out).
for (let race = 1; race <= 30; race++) for (const spot of place('tremblant-woods', 9, race).spots) for (const animal of spot.animals) {
  const course = courseFor('tremblant-woods'), s = animal.s > course.length / 2 ? animal.s - course.length : animal.s;
  check(!(s > -30 && s < 115 && Math.abs(animal.lateral) < 50), 'No animal stands in the Tremblant Woods paddock');
}

// The lake: beavers stand at the shore and moose may stand in the shallows.
{
  let beavers = 0, shallows = 0, unapproved = 0;
  for (let race = 1; race <= 120; race++) for (const spot of place('tremblant-woods', 31, race, ['beaver', 'moose', 'white-tailed-deer', 'black-bear']).spots) for (const animal of spot.animals) {
    if (animal.species === 'beaver') { beavers++; check(animal.lakeOut >= -6 && animal.lakeOut <= 3, 'Beaver within 6 m of the shore and at most 3 m out'); }
    if (animal.species === 'moose' && animal.lakeOut > 0) shallows++;
    if (animal.species === 'eastern-wolf') unapproved++;
  }
  check(beavers > 3, `Beavers appear at the lake (${beavers})`);
  check(shallows > 0, `Moose sometimes stand in the shallows (${shallows})`);
  check(unapproved === 0, 'An unapproved rare animal never appears');
}

// ---- The checker turns down places an animal must never stand --------------------
{
  const wide = {minEdge: 0, maxEdge: 400};
  const woods = courseFor('tremblant-woods'), woodsChecker = createPlacementChecker(woods);
  const at = (course, s, lateral) => { const p = course.worldAt(s, lateral); return [p.x, p.z]; };
  check(woodsChecker.inspect(...at(woods, 40, -45)) === null && woodsChecker.inspect(...at(woods, 40, 45)) === null, 'Behind the Tremblant Woods garages and stands is the paddock');
  check(woodsChecker.inspect(...at(woods, 173, 100), wide) === null, 'The ski lodge is a building');
  check(woodsChecker.inspect(...at(woods, 700, 112), wide) === null && woodsChecker.inspect(...at(woods, 700, 112), {...wide, lake: 'shallows'}) === null, 'The middle of the lake is out of bounds, even for a moose');
  check(woodsChecker.inspect(...at(woods, 3, 0), wide) === null, 'The road itself is out of bounds');
  let open = 0;
  for (let lateral = 20; lateral <= 80; lateral += 4) if (woodsChecker.inspect(...at(woods, 1500, -lateral), wide)) open++;
  check(open > 3, 'Open ground beside the road is accepted (' + open + ' of 16 places)');
  const harbour = courseFor('harbour-lights'), harbourChecker = createPlacementChecker(harbour);
  check(harbour.escapeRoads.length === 2, 'Harbour Lights has two escape roads');
  for (const escape of harbour.escapeRoads) {
    const u = escape.run / 2, v = (escape.inner + escape.outer) / 2;
    const x = escape.origin.x + escape.forward.x * u + escape.left.x * escape.side * v, z = escape.origin.z + escape.forward.z * u + escape.left.z * escape.side * v;
    check(harbourChecker.inspect(x, z, wide) === null, escape.id + ' is not a place to stand');
  }
  const snow = courseFor('tremblant-snow'), snowChecker = createPlacementChecker(snow), lane = snow.pitLane;
  check(snowChecker.inspect(...at(snow, lane.box, lane.side * (snow.roadHalfWidthAt(lane.box) + 35)), wide) === null, 'The pit side of a pit straight is the paddock');
}

// ---- Titan arenas are empty --------------------------------------------------
for (const id of ['titan-arena', 'titan-stunt-trial', 'titan-freestyle']) {
  const result = place(id, 3, 2);
  equal(result.spots, [], `${id} has no animals even with every model approved`);
}

// ---- The race's own generator is never touched --------------------------------
{
  const reference = new Course(definitions.get('tremblant-woods'), 1989), watched = new Course(definitions.get('tremblant-woods'), 1989);
  const draws = rng => Array.from({length: 12}, () => rng.float());
  const untouched = draws(reference.rng);
  const trap = () => { throw new Error('The race generator was used'); };
  const real = watched.rng;
  watched.rng = {float: trap, int: trap, chance: trap, pick: trap, range: trap};
  const randomWas = Math.random;
  Math.random = trap;
  try {
    for (let race = 1; race <= 4; race++) placeWildlife({courseId: 'tremblant-woods', playDay: 2, raceNumber: race, course: watched, referenceLap: referenceFor('tremblant-woods'), approvedModels: APPROVED});
  } finally { Math.random = randomWas; }
  watched.rng = real;
  equal(draws(watched.rng), untouched, 'The race generator gives the same numbers after placing animals');
  equal(JSON.stringify(watched.features.obstacles.length), JSON.stringify(reference.features.obstacles.length), 'Placing animals leaves the course itself unchanged');
  const source = readFileSync(new URL('../src/wildlife.js', import.meta.url), 'utf8');
  check(!/Math\.random|Date\.now|performance\.now|\bwindow\b|\bdocument\b|from 'three'|\.rng\b/.test(source.replace(/\/\/.*$/gm, '')), 'wildlife.js uses no clock, no browser, no graphics and never the race generator');
  check(/from '\.\/rng\.js'/.test(source), 'wildlife.js builds its generators from src/rng.js');
}

// ---- Housekeeping --------------------------------------------------------------
{
  const coastal = readFileSync(new URL('../src/coastal-water.js', import.meta.url), 'utf8');
  equal(Number(/SEA_LEVEL=(-?\d+)/.exec(coastal)[1]), SEA_LEVEL, 'The sea level matches src/coastal-water.js');
  const clock = lapClock(referenceFor('tremblant-woods'), courseFor('tremblant-woods').length, true);
  check(Math.abs(clock.timeAt(courseFor('tremblant-woods').length - 1e-6) - 77.068) < .05 && clock.timeAt(0) === 0, 'The lap clock runs from 0 to the reference lap time');
  check(Math.abs(clock.timeAt(clock.distanceAt(40)) - 40) < 1e-6, 'The lap clock turns back into distance');
}

console.log(`Wildlife placement: ${checks} checks, ${animalsChecked} animals on ${OUT_OF_THE_WAY.length} courses; ${seen.size} species seen.`);

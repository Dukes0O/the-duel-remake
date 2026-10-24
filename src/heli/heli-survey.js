// The wildlife count (docs/HELI_WILDLIFE.md section 4): an everyday job on the
// dispatch board. Sarah asks for the number of one species in an 800 m square.
// The pilot flies straight lines across it, counts what passes by, and reports
// an estimate worked out from the share of the square that lay near the flight
// path. Pure and repeatable: the day's job and the square's animals come from
// the play day alone, every number sits in a table below, and no clock, screen,
// storage or session is touched. The board line, the title and the pay live in
// heli-jobs.js; drawing, radio and the instruments are other cards'.
//
// Everything here works only with the `wildlife` switch on (effective only with
// the helicopter on). The functions that touch a save take {enabled}; with it
// off the board has no count and nothing is paid.
import {makeRng} from '../rng.js';
import {heliHash} from './heli-save.js';

// Every number of section 4, once. Metres and seconds.
export const SURVEY = Object.freeze({
  size: 800,                 // the square is 800 m across
  cell: 20,                  // coverage is kept on a 20 m grid
  countReach: 60,            // an animal counts within 60 m sideways of the helicopter...
  countHeight: 150,          // ...while the helicopter is no more than 150 m above the ground
  scareHeight: 60,           // below 60 m above the ground...
  scareReach: 100,           // ...animals within 100 m run into the trees...
  scareSeconds: 120,         // ...and cannot be counted for 2 minutes
  coverReach: 60,            // a cell is covered when its centre lies within 60 m of the path
  minShare: Object.freeze([1, 4]),   // a report needs at least a quarter of the square covered
  animals: Object.freeze([6, 14]),   // the true number of the counted species
  herds: Object.freeze([2, 6]),      // ...in this many herds
  otherHerds: Object.freeze([1, 3]), // herds of other species that do not count
  herdInset: 40,             // a herd's middle stands at least this far inside the square's edge
  herdSpread: 25,            // animals of a herd stand within this distance of its middle
  placeTries: 40,            // draws for a herd's middle that must be standable
  animalTries: 10,           // draws for each animal beside its herd's middle
});

// The pay (section 4): by how far the estimate is from the true number. A
// band is "within <percent> per cent", kept whole so the test is exact. The
// same in Assisted and Real.
export const SURVEY_PAY = Object.freeze({
  bands: Object.freeze([
    Object.freeze({band: 'good', withinPercent: 20, pay: 600}),
    Object.freeze({band: 'close', withinPercent: 40, pay: 400}),
  ]),
  off: Object.freeze({band: 'off', pay: 200}),
  rareBonus: 100,
});

// What can be asked for, by course (section 4). Every course has equal
// chance; its species are weighted. A cougar is the rare animal at Summit Run
// (one in five), never asked for at Tremblant. Summit Run only joins while its
// switch is on, passed as {summitRun}, the way the dispatch tables take it.
export const SURVEY_TARGETS = Object.freeze({
  'tremblant-woods': Object.freeze([
    Object.freeze({species: 'moose', weight: 1}),
    Object.freeze({species: 'black-bear', weight: 1}),
    Object.freeze({species: 'white-tailed-deer', weight: 1}),
  ]),
  'tremblant-snow': Object.freeze([
    Object.freeze({species: 'white-tailed-deer', weight: 1}),
    Object.freeze({species: 'moose', weight: 1}),
  ]),
  'panorama-ridge': Object.freeze([
    Object.freeze({species: 'eastern-grey-kangaroo', weight: 1}),
  ]),
  'summit-run': Object.freeze([
    Object.freeze({species: 'bighorn-sheep', weight: 4}),
    Object.freeze({species: 'cougar', weight: 1}),
  ]),
});
const SUMMIT_ID = 'summit-run';

// What Sarah calls them on the board and the panel.
export const SURVEY_NAMES = Object.freeze({
  'moose': 'moose',
  'black-bear': 'black bears',
  'white-tailed-deer': 'deer',
  'eastern-grey-kangaroo': 'kangaroos',
  'bighorn-sheep': 'bighorn sheep',
  'cougar': 'cougars',
});

// Sarah's lines (heli-radio-lines.js holds the words); a test keeps these ids real.
export const SURVEY_LINES = Object.freeze({
  taken: 'heli.radio.survey.taken',
  scared: 'heli.radio.survey.scared',
  good: 'heli.radio.survey.good',
  close: 'heli.radio.survey.close',
  off: 'heli.radio.survey.off',
  rare: 'heli.radio.survey.rare',
});

export const SURVEY_REPORT_TOO_SOON = 'Cover at least a quarter of the square first.';

const CELLS_ACROSS = SURVEY.size / SURVEY.cell;
export const SURVEY_CELLS = CELLS_ACROSS * CELLS_ACROSS;

const dayNumber = day => Number.isSafeInteger(day) && day >= 0 ? day : 0;
const rngFor = (purpose, jobId, courseId, n = 0) => makeRng(heliHash('survey', purpose, jobId, courseId, n));
const isCounted = animal => animal.role === 'target';

export const surveyName = species => SURVEY_NAMES[species] ?? species;

// ---- the day's job ---------------------------------------------------------
// One a play day, the same every time for the same play day number: a course,
// then a species there. {id: 's<day>', kind: 'survey', courseId, to, species,
// pay}; the pay shown is the top band, before the rare bonus.
export function surveyCourses({summitRun = false} = {}) {
  return Object.keys(SURVEY_TARGETS).filter(id => id !== SUMMIT_ID || summitRun === true);
}

export function surveyJob(day, {summitRun = false} = {}) {
  const number = dayNumber(day), id = `s${number}`;
  const rng = makeRng(heliHash('survey', 'job', number));
  const courses = surveyCourses({summitRun});
  const courseId = courses[rng.int(0, courses.length - 1)];
  const rows = SURVEY_TARGETS[courseId];
  let left = rng.float() * rows.reduce((sum, row) => sum + row.weight, 0);
  let species = rows.at(-1).species;
  for (const row of rows) { left -= row.weight; if (left < 0) { species = row.species; break; } }
  return Object.freeze({id, kind: 'survey', courseId, to: courseId, species, pay: SURVEY_PAY.bands[0].pay});
}

// ---- the square and its animals --------------------------------------------
// The caller says where the square may lie: `site` is {minX, maxX, minZ, maxZ}
// of the forest and open ground to use, and `canStand(x, z)` says whether an
// animal may stand at a point (not on the road, in a lake or inside a wall;
// WILD-PLACE's createPlacementChecker is what the session builds it from).
// Without a site the square is centred on the origin; without `canStand`
// every point is fine. `wildlife` is src/wildlife.js (pass `import * as
// wildlife`): the helicopter rules may not import it themselves (the import
// list in test-heli-mode.mjs), so the session hands in its species tables and
// its one-in-five rare chance. Without it the square holds only the animals
// being counted: no other species and no rare animal.
function squareFor(job, site) {
  const rng = rngFor('square', job.id, job.courseId);
  const fit = (min, max) => {
    const lo = Number.isFinite(min) ? min : -SURVEY.size / 2, hi = Number.isFinite(max) ? max - SURVEY.size : lo;
    const u = rng.float();
    return hi > lo ? lo + u * (hi - lo) : (lo + hi) / 2;
  };
  const x0 = fit(site?.minX, site?.maxX), z0 = fit(site?.minZ, site?.maxZ);
  return Object.freeze({x0, z0, x1: x0 + SURVEY.size, z1: z0 + SURVEY.size, size: SURVEY.size,
    cx: x0 + SURVEY.size / 2, cz: z0 + SURVEY.size / 2});
}

// The total split into `herds` groups of at least one, drawn from one stream.
function splitHerds(total, herds, rng) {
  const sizes = Array.from({length: herds}, () => 1);
  for (let left = total - herds; left > 0; left--) sizes[rng.int(0, herds - 1)]++;
  return sizes;
}

// Other species beside the course's road that may stand in the square but
// never count: the common ones with ground feet, not shore-bound, not tracks,
// not the species being counted.
function othersFor(wildlife, courseId, target) {
  const table = wildlife?.speciesFor?.(courseId);
  return table ? table.common.filter(row => row.species !== target && !row.night
    && wildlife.SPECIES[row.species]?.kind !== 'decal' && !wildlife.SPECIES[row.species]?.lake) : [];
}

export function planSurvey(job, {site = null, canStand = null, wildlife = null} = {}) {
  const square = squareFor(job, site);
  const stands = typeof canStand === 'function' ? canStand : () => true;
  const inside = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const animals = [];
  const addHerd = (role, species, size, index, purpose) => {
    const rng = rngFor(purpose, job.id, job.courseId, index);
    const lo = SURVEY.herdInset, hi = SURVEY.size - SURVEY.herdInset;
    let cx = 0, cz = 0;
    for (let i = 0; i < SURVEY.placeTries; i++) {
      cx = square.x0 + rng.range(lo, hi); cz = square.z0 + rng.range(lo, hi);
      if (stands(cx, cz)) break;
    }
    for (let k = 0; k < size; k++) {
      let x = cx, z = cz;
      for (let i = 0; i < SURVEY.animalTries; i++) {
        const angle = rng.range(0, Math.PI * 2), r = SURVEY.herdSpread * Math.sqrt(rng.float());
        x = inside(cx + Math.cos(angle) * r, square.x0, square.x1); z = inside(cz + Math.sin(angle) * r, square.z0, square.z1);
        if (stands(x, z)) break;
      }
      animals.push({id: `${role[0]}${index}-${k}`, role, species, herd: `${role[0]}${index}`, x, z});
    }
  };
  // The animals being counted: 6 to 14 in 2 to 6 herds.
  const count = rngFor('count', job.id, job.courseId);
  const total = count.int(...SURVEY.animals), herds = count.int(...SURVEY.herds);
  splitHerds(total, herds, count).forEach((size, i) => addHerd('target', job.species, size, i, 'target'));
  // Other species, which do not count.
  const others = othersFor(wildlife, job.courseId, job.species), mix = rngFor('others', job.id, job.courseId);
  if (others.length) {
    const herdsOfOthers = mix.int(...SURVEY.otherHerds);
    for (let i = 0; i < herdsOfOthers; i++) {
      let left = mix.float() * others.reduce((sum, row) => sum + row.weight, 0), row = others.at(-1);
      for (const candidate of others) { left -= candidate.weight; if (left < 0) { row = candidate; break; } }
      addHerd('other', row.species, mix.int(...row.herd), i, 'other');
    }
  }
  // The course's rare animal: one day in five, and not when it is what is being
  // counted (a cougar count has no separate rare animal).
  const rare = wildlife?.speciesFor?.(job.courseId)?.rare ?? null;
  const rareRng = rngFor('rare', job.id, job.courseId);
  if (rare && rare.species !== job.species && wildlife.SPECIES[rare.species]?.kind !== 'decal' && rareRng.chance(wildlife.RARE_CHANCE))
    addHerd('rare', rare.species, rareRng.int(...rare.herd), 0, 'rareherd');
  return Object.freeze({jobId: job.id, courseId: job.courseId, species: job.species, square,
    truth: animals.filter(isCounted).length, rareSpecies: rare?.species ?? null,
    animals: Object.freeze(animals.map(a => Object.freeze(a)))});
}

// ---- the count in the air --------------------------------------------------
// A run is what the session keeps for one attempt. Leaving the course or
// taking another job just drops it; a new run for the same job starts clean
// (the count can be started again the same play day). stepSurvey changes the
// run it is given.
// Only runs made here can be reported, so a hand-made object never pays.
const MADE_HERE = new WeakSet();
export const isSurveyRun = run => run !== null && typeof run === 'object' && MADE_HERE.has(run);
export const SURVEY_NOT_A_RUN = 'That is not a count made in flight.';

export function createSurveyRun(plan) {
  const run = {jobId: plan.jobId, plan, time: 0, last: null, count: 0, rareSeen: false,
    covered: new Uint8Array(SURVEY_CELLS), coveredCells: 0,
    animals: plan.animals.map(a => ({id: a.id, role: a.role, x: a.x, z: a.z, counted: false, scaredUntil: 0}))};
  MADE_HERE.add(run);
  return run;
}

function distanceToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function cover(run, ax, az, bx, bz, reach) {
  const {square} = run.plan, cell = SURVEY.cell;
  const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach - square.x0) / cell));
  const i1 = Math.min(CELLS_ACROSS - 1, Math.floor((Math.max(ax, bx) + reach - square.x0) / cell));
  const j0 = Math.max(0, Math.floor((Math.min(az, bz) - reach - square.z0) / cell));
  const j1 = Math.min(CELLS_ACROSS - 1, Math.floor((Math.max(az, bz) + reach - square.z0) / cell));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const index = j * CELLS_ACROSS + i;
      if (run.covered[index]) continue;
      const cx = square.x0 + (i + 0.5) * cell, cz = square.z0 + (j + 0.5) * cell;
      if (distanceToSegment(cx, cz, ax, az, bx, bz) <= reach) { run.covered[index] = 1; run.coveredCells++; }
    }
  }
}

// One step of the flight: the seconds passed, the helicopter's x and z and its
// height above the ground (agl). The path is the straight line from the last
// step to this one, so a long step counts and covers what a short one would;
// the height that matters is the height at the end of the step.
// Returns the events of this step: {type: 'count' | 'scare' | 'rare', id}.
// A step that is not finite numbers, or runs backward, is ignored.
// gear is the worn gear's numbers (heli-skins.js gearStats): the wildlife
// skin's quiet tips scare animals at gear.scareDistance (50 m, not 100) and its
// zoom camera counts out to gear.countReach (100 m, not 60), and the share of
// the square covered grows with that reach, so the estimate stays honest. Left
// out, or holding the base kit, every answer is the one above.
export function stepSurvey(run, {dt, x, z, agl}, gear) {
  if (![dt, x, z, agl].every(Number.isFinite) || dt < 0) return [];
  const events = [];
  run.time += dt;
  const a = run.last ?? {x, z}, b = {x, z};
  run.last = b;
  // Only flying at counting height covers ground; fright does not change it.
  const countReach = Number.isFinite(gear?.countReach) ? gear.countReach : SURVEY.countReach;
  const scareReach = Number.isFinite(gear?.scareDistance) ? gear.scareDistance : SURVEY.scareReach;
  const coverReach = Number.isFinite(gear?.countReach) ? gear.countReach : SURVEY.coverReach;
  if (agl <= SURVEY.countHeight) cover(run, a.x, a.z, b.x, b.z, coverReach);
  for (const animal of run.animals) {
    const d = distanceToSegment(animal.x, animal.z, a.x, a.z, b.x, b.z);
    // Too low and too near: the animal runs, and stays unseen for 2 minutes
    // after the last time it was frightened.
    if (agl < SURVEY.scareHeight && d <= scareReach) {
      if (run.time >= animal.scaredUntil) events.push({type: 'scare', id: animal.id});
      animal.scaredUntil = run.time + SURVEY.scareSeconds;
    }
    if (run.time < animal.scaredUntil || agl > SURVEY.countHeight || d > countReach) continue;
    if (animal.role === 'target' && !animal.counted) {
      animal.counted = true; run.count++;
      events.push({type: 'count', id: animal.id});
    } else if (animal.role === 'rare' && !run.rareSeen) {
      run.rareSeen = true;
      events.push({type: 'rare', id: animal.id});
    }
  }
  return events;
}

// ---- the report ------------------------------------------------------------
export const surveyShare = run => run.coveredCells / SURVEY_CELLS;
// Whole per cent for the panel ("MOOSE 7 · 46% covered").
export const surveyPercent = run => Math.round(surveyShare(run) * 100);
// Once at least a quarter is covered (kept in whole cells, so it is exact).
export const canReport = run => run.coveredCells * SURVEY.minShare[1] >= SURVEY_CELLS * SURVEY.minShare[0];

// What the pilot tells Sarah: the count divided by the share covered, rounded.
// The pay is by how near that is to the true number, plus the rare bonus if the
// course's rare animal was seen. Changes nothing; the board pays once.
export function reportSurvey(run) {
  if (!isSurveyRun(run)) return {ok: false, reason: SURVEY_NOT_A_RUN};
  if (!canReport(run)) return {ok: false, reason: SURVEY_REPORT_TOO_SOON};
  const truth = run.plan.truth;
  const estimate = Math.round(run.count * SURVEY_CELLS / run.coveredCells);
  const off = Math.abs(estimate - truth);
  const hit = SURVEY_PAY.bands.find(row => off * 100 <= row.withinPercent * truth) ?? SURVEY_PAY.off;
  const rareBonus = run.rareSeen ? SURVEY_PAY.rareBonus : 0;
  return {ok: true, jobId: run.jobId, estimate, truth, count: run.count, share: surveyShare(run), band: hit.band,
    basePay: hit.pay, rareBonus, pay: hit.pay + rareBonus, rare: run.rareSeen, line: SURVEY_LINES[hit.band]};
}

// The heat camera in a count (gear.heatAnimals, with gear.heatRange): the warm
// animals near the helicopter, nearest first, whatever they are (the panel does
// not say which are being counted). heli is {x, z, agl}; distance is a straight
// line, height included. Empty when the camera is not worn. It shows only: it
// never counts, covers or scares.
export function heatAnimals(run, heli, gear) {
  const range = Number.isFinite(gear?.heatRange) ? gear.heatRange : 0;
  if (gear?.heatAnimals !== true || !(range > 0) || !isSurveyRun(run)) return [];
  const out = [];
  for (const animal of run.animals) {
    const distance = Math.hypot(heli.x - animal.x, heli.z - animal.z, heli.agl ?? 0);
    if (distance <= range) out.push({id: animal.id, x: animal.x, z: animal.z, distance});
  }
  return out.sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : 1));
}

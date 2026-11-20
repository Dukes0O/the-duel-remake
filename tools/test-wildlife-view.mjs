// WILD-VIEW (docs/HELI_WILDLIFE.md sections 3.3, 3.4 and 11): the pure parts of
// drawing the animals. The approved model table against the files on disk, the
// wildlife count offering only animals that have a model (and giving today's
// answers when every target has one), the idle or flee decision, the fade, the
// 12-animal cap, and the rule that drawing never reaches into the race.
// Memory-only: no save is read or written. The look itself is a browser check.
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import * as THREE from 'three';
import * as wildlife from '../src/wildlife.js';
import {
  WILDLIFE_MODELS, APPROVED_MODEL_IDS, HELD_FROM_COURSES, WILDLIFE_MODEL_DIR, wildlifeModelUrl,
} from '../src/wildlife-models.js';
import {
  WILDLIFE_VIEW, IDLE, FLEE, FLY, GONE, startleReach, nextMood, fleeLength, fadeAlpha, pickNearest, turnToward, yawToward, birdFlight,
  calendarPlayDay, ringLook, viewPlayDay, createWildlifeView, hitReach, bloodOutline, DOWN,
} from '../src/wildlife-view.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {referenceLap} from '../src/reference-laps.js';
import {SURVEY_TARGETS, surveyCourses, surveyJob, planSurvey} from '../src/heli/heli-survey.js';
import {surveyJobOf} from '../src/heli/heli-jobs.js';
import {createProfile} from '../src/progression.js';
import {createHeli, heliOf} from '../src/heli/heli-save.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`); checks++;
};

// The North woods five, the table before the Western mountains and Australia
// joined. The checks of how a course or count joins use this fixed list, so
// they keep testing that mechanism whatever the table holds today.
const NORTH_WOODS = ['white-tailed-deer', 'moose', 'black-bear', 'beaver', 'eastern-wolf'];

// ---- The approved table matches the files on disk ---------------------------
{
  const files = readdirSync(new URL('../public/assets/wildlife/', import.meta.url)).filter(name => name.endsWith('.glb')).sort();
  // The table is every model with a file; a course may use those that are not held (WILD-ART-CITY).
  const MODEL_IDS = Object.keys(WILDLIFE_MODELS);
  same(MODEL_IDS.map(id => WILDLIFE_MODELS[id].file).sort(), files, 'every model on disk is in the table, and every table row has its file');
  ok(Object.isFrozen(WILDLIFE_MODELS) && MODEL_IDS.every(id => Object.isFrozen(WILDLIFE_MODELS[id]) && Object.isFrozen(WILDLIFE_MODELS[id].run)), 'the table is frozen');
  ok(Object.isFrozen(HELD_FROM_COURSES) && HELD_FROM_COURSES.every(id => WILDLIFE_MODELS[id]), 'every held id has a model');
  same(APPROVED_MODEL_IDS, MODEL_IDS.filter(id => !HELD_FROM_COURSES.includes(id)), 'a course may use every model that is not held, and no held one');
  same([...HELD_FROM_COURSES].sort(), ['black-faced-spoonbill', 'black-kite', 'cat', 'collared-lizard', 'condor', 'desert-bighorn', 'egret', 'jackrabbit', 'owl', 'pelican', 'pigeon', 'raccoon', 'roadrunner'], 'held: the six desert and coast animals and the seven city animals');
    equal(wildlife.availableSpecies('red-mesa', APPROVED_MODEL_IDS).any, false, 'Red Mesa: no animals stand there while the desert models are held');
  same(wildlife.availableSpecies('pacific-canyon', APPROVED_MODEL_IDS).common.map(row => row.species), ['coyote'], 'Pacific Canyon keeps its coyotes and gains nothing while they are held');
  equal(wildlife.availableSpecies('pacific-canyon', APPROVED_MODEL_IDS).rare, null, 'and has no condor yet');
  ok(wildlife.availableSpecies('red-mesa', MODEL_IDS).common.length === 4 && wildlife.availableSpecies('red-mesa', MODEL_IDS).rare?.species === 'condor', 'and Red Mesa has its four and the condor once they are let go');
  equal(WILDLIFE_MODELS['roadrunner'].move, 'Run', 'the roadrunner runs: a ground bird with no Fly clip');
    for (const id of ['harbour-lights', 'harbor-highlands', 'neon-docks', 'midnight-chase', 'neon-drift-trial']) {
    for (const night of [false, true]) equal(wildlife.availableSpecies(id, APPROVED_MODEL_IDS, {night}).any, false, `${id}: no animals stand there while the city models are held`);
  }
  ok(wildlife.availableSpecies('harbour-lights', MODEL_IDS, {night: true}).common.length === 4, 'and Harbour Lights has its four once they are let go');
  for (const id of MODEL_IDS) {
    const entry = WILDLIFE_MODELS[id];
    ok(wildlife.SPECIES[id], `${id} is a species wildlife.js knows`);
    ok(wildlife.SPECIES[id].kind !== 'decal', `${id}: a decal has no model`);
    equal(wildlifeModelUrl(id), WILDLIFE_MODEL_DIR + entry.file, `${id}: the model url is the folder and the file`);
    ok(existsSync(new URL('../public' + wildlifeModelUrl(id), import.meta.url)), `${id}: the file exists under public/`);
    ok(statSync(new URL('../public' + wildlifeModelUrl(id), import.meta.url)).size > 1000, `${id}: the file is a real model`);
    // The clip names are in the file: read the GLB's own JSON chunk.
    const buffer = readFileSync(new URL('../public' + wildlifeModelUrl(id), import.meta.url));
    const json = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
    const clips = new Set(json.animations.map(clip => clip.name));
    ok(clips.has(entry.idle) && clips.has(entry.move), `${id}: has its ${entry.idle} and ${entry.move} clips`);
    ok(entry.run.speed > 0 && entry.run.rate > 1 && entry.scale > 0, `${id}: runs faster than it walks`);
  }
  equal(WILDLIFE_MODELS['black-bear'].cubScale, .5, 'bear cubs are half size and share the bear file');
  ok(!APPROVED_MODEL_IDS.includes('wolf-tracks'), 'the wolf tracks decal has no model yet, so it is absent');
  // A species with no model: availableSpecies drops it, and a course with none has no animals.
  same(wildlife.availableSpecies('tremblant-snow', APPROVED_MODEL_IDS).common.map(row => row.species), ['white-tailed-deer', 'moose'], 'Tremblant Snow has deer and moose, no tracks');
  equal(wildlife.availableSpecies('panorama-ridge', NORTH_WOODS).any, false, 'Panorama Ridge has no approved species, so no animals');
  equal(wildlife.availableSpecies('summit-run', NORTH_WOODS).any, false, 'Summit Run has none either until its species have models');
  // Today's table: Panorama Ridge and Summit Run have all their animals.
  const ridge = wildlife.availableSpecies('panorama-ridge', APPROVED_MODEL_IDS), summit = wildlife.availableSpecies('summit-run', APPROVED_MODEL_IDS);
  same(ridge.common.map(row => row.species), ['eastern-grey-kangaroo', 'sulphur-crested-cockatoo', 'kookaburra'], 'Panorama Ridge: kangaroos, cockatoos and kookaburras');
  equal(ridge.rare?.species, 'echidna', 'and the echidna as its rare animal');
  same(summit.common.map(row => row.species), ['yellow-bellied-marmot', 'bighorn-sheep', 'mule-deer', 'raven'], 'Summit Run: marmots, bighorns, mule deer and ravens');
  equal(summit.rare?.species, 'cougar', 'and the cougar as its rare animal');
  for (const id of ['raven', 'sulphur-crested-cockatoo', 'kookaburra']) equal(WILDLIFE_MODELS[id].fly, 'Fly', `${id}: flies in its Fly loop`);
  // Europe: the passed species are drawn; the wildcat did not pass its art
  // rounds, so it is left out and Ardennes and Azure Riviera have no rare animal.
  const europe = id => wildlife.availableSpecies(id, APPROVED_MODEL_IDS);
  same(europe('ardennes-forest').common.map(row => row.species), ['roe-deer', 'red-deer', 'wild-boar', 'red-fox'], 'Ardennes: roe deer, red deer, wild boar and red fox');
  equal(europe('ardennes-forest').rare, null, 'and no rare animal without the wildcat');
  same(europe('eifel-crown').common.map(row => row.species), ['roe-deer', 'red-deer', 'wild-boar', 'red-fox'], 'Eifel Crown: roe deer, red deer, wild boar and red fox');
  equal(europe('eifel-crown').rare?.species, 'black-stork', 'and the black stork as its rare bird');
  same(europe('alpine-serpent').common.map(row => row.species), ['chamois', 'ibex', 'alpine-marmot', 'red-deer'], 'Alpine Serpent: chamois, ibex, alpine marmots and red deer');
  equal(europe('alpine-serpent').rare?.species, 'golden-eagle', 'and the golden eagle as its rare bird');
  same(europe('azure-riviera').common.map(row => row.species), ['gull', 'red-fox', 'roe-deer', 'wild-boar'], 'Azure Riviera: gulls, red foxes, roe deer and wild boar');
  equal(europe('azure-riviera').rare, null, 'and no rare animal without the wildcat');
  for (const id of ['black-stork', 'gull', 'golden-eagle']) equal(WILDLIFE_MODELS[id].fly, 'Fly', `${id}: flies in its Fly loop`);
  ok(!APPROVED_MODEL_IDS.includes('wildcat'), 'wildcat: no row, it did not pass its art rounds');
}

// ---- The count never asks for an animal with no model ------------------------
{
  // Today's table approves every count target: the count is exactly the job
  // with no list, and Panorama Ridge and Summit Run are in it.
  same(surveyCourses({approved: APPROVED_MODEL_IDS}), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'today: the Woods, the Snow and Panorama Ridge');
  same(surveyCourses({summitRun: true, approved: APPROVED_MODEL_IDS}), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge', 'summit-run'], 'and Summit Run once it is open');
  for (let day = 0; day < 300; day++) {
    for (const summitRun of [false, true]) same(surveyJob(day, {summitRun, approved: APPROVED_MODEL_IDS}), surveyJob(day, {summitRun}), `day ${day}: today's table is the full count`);
  }
  // The mechanism, on the fixed North woods list.
  const approved = NORTH_WOODS;
  same(surveyCourses({approved}), ['tremblant-woods', 'tremblant-snow'], 'North woods only: Tremblant Woods and Tremblant Snow');
  same(surveyCourses({summitRun: true, approved}), ['tremblant-woods', 'tremblant-snow'], 'Summit Run joins only once a target species has a model');
  for (let day = 0; day < 300; day++) {
    const job = surveyJob(day, {summitRun: true, approved});
    ok(job && approved.includes(job.species), `day ${day}: the count is for an animal with a model (${job?.species})`);
    ok(['tremblant-woods', 'tremblant-snow'].includes(job.courseId), `day ${day}: at a course with approved targets`);
  }
  // Panorama Ridge and Summit Run join by themselves as their target species get models.
  same(surveyCourses({approved: [...approved, 'eastern-grey-kangaroo']}), ['tremblant-woods', 'tremblant-snow', 'panorama-ridge'], 'a kangaroo model brings Panorama Ridge in');
  same(surveyCourses({summitRun: true, approved: [...approved, 'bighorn-sheep']}), ['tremblant-woods', 'tremblant-snow', 'summit-run'], 'a bighorn model brings Summit Run in');
  for (let day = 0; day < 300; day++) {
    const job = surveyJob(day, {summitRun: true, approved: [...approved, 'bighorn-sheep']});
    if (job.courseId === 'summit-run') equal(job.species, 'bighorn-sheep', 'a Summit Run count is for sheep while the cougar has no model');
  }
  // Only the Woods' bear, deer and moose count; with the bear missing it is deer or moose.
  for (let day = 0; day < 300; day++) {
    const job = surveyJob(day, {approved: ['white-tailed-deer', 'moose']});
    ok(['white-tailed-deer', 'moose'].includes(job.species), 'no bear count without a bear model');
  }
  equal(surveyJob(4, {approved: []}), null, 'nothing approved: no count');
  equal(surveyJob(4, {approved: new Set(['eastern-wolf'])}), null, 'a model that is not a target gives no count');
  same(surveyCourses({approved: []}), [], 'nothing approved: no course');
  // With every target approved the answers are exactly the ones given with no list at all.
  const everyTarget = new Set(Object.values(SURVEY_TARGETS).flatMap(rows => rows.map(row => row.species)));
  for (let day = 0; day < 400; day++) {
    for (const summitRun of [false, true]) {
      same(surveyJob(day, {summitRun, approved: everyTarget}), surveyJob(day, {summitRun}), `day ${day}: all approved is today's job`);
      same(surveyJob(day, {summitRun, approved: [...everyTarget, 'eastern-wolf']}), surveyJob(day, {summitRun}), `day ${day}: extra models change nothing`);
    }
  }
  same(surveyCourses({approved: everyTarget}), surveyCourses(), 'all approved: the same course list');
  same(surveyCourses({summitRun: true, approved: everyTarget}), surveyCourses({summitRun: true}), 'all approved with Summit Run: the same list');
  // The board's job reads the list too.
  const profile = createProfile();
  const flown = {...profile, heli: {...createHeli(), playDay: {count: 7}}};
  same(surveyJobOf(flown, {enabled: true}), surveyJob(7), 'the board with no list is the day job');
  same(surveyJobOf(flown, {enabled: true, approved}), surveyJob(7, {approved}), 'the board with the list is the day job for the list');
  ok(heliOf(flown).playDay.count === 7, 'the board reads the play day');
  // The square's other animals and the rare animal also need a model.
  const woods = surveyJob(0, {approved: ['moose', 'white-tailed-deer', 'black-bear']});
  for (let day = 0; day < 40; day++) {
    const job = {...woods, id: `s${day}`, species: 'moose'};
    const plan = planSurvey(job, {wildlife, approved: ['moose']});
    ok(plan.animals.every(animal => animal.species === 'moose'), 'only moose stand in the square when only the moose has a model');
    equal(plan.rareSpecies, null, 'and the wolf is not drawn as the rare animal without its model');
    const full = planSurvey(job, {wildlife});
    equal(plan.truth, full.truth, 'the true number never depends on which other models exist');
    same(plan.animals.filter(animal => animal.role === 'target').map(animal => [animal.x, animal.z]), full.animals.filter(animal => animal.role === 'target').map(animal => [animal.x, animal.z]), 'the counted animals stand where they stood');
  }
  const withWolf = [...Array(60).keys()].map(day => planSurvey({...woods, id: `s${day}`, species: 'moose'}, {wildlife, approved: ['moose', 'eastern-wolf']}));
  ok(withWolf.some(plan => plan.animals.some(animal => animal.role === 'rare')), 'with a wolf model the rare animal can stand in the square');
}

// ---- The idle or flee decision ------------------------------------------------
{
  equal(WILDLIFE_VIEW.startle, 35, 'a car startles an animal at 35 m');
  equal(nextMood(IDLE, 36, {}), IDLE, 'idle at 36 m');
  equal(nextMood(IDLE, 35, {}), IDLE, 'idle at exactly 35 m');
  equal(nextMood(IDLE, 34.9, {}), FLEE, 'flee inside 35 m');
  equal(nextMood(IDLE, 0, {}), FLEE, 'flee when a car is on top of it');
  equal(nextMood(IDLE, 34.9, {bird: true}), FLY, 'a bird takes off instead of running');
  equal(nextMood(FLEE, 5, {arrived: false}), FLEE, 'it keeps running until it arrives, whatever is near');
  equal(nextMood(FLEE, 500, {arrived: true}), IDLE, 'idle again once it has arrived');
  equal(nextMood(FLY, 500, {arrived: true}), FLY, 'a bird in flight keeps flying');
  equal(nextMood(GONE, 0, {}), GONE, 'a bird that has gone does not come back');
  equal(nextMood(GONE, 1000, {arrived: true, bird: true}), GONE, 'not at any distance');
  // The helicopter startles only while low, and at the count's own reach.
  equal(startleReach(null), 35, 'a car: 35 m');
  equal(startleReach(59.9), WILDLIFE_VIEW.heliReach, 'a low helicopter: the count\'s scare reach');
  equal(startleReach(60), 0, 'a helicopter at 60 m or more startles nothing');
  equal(startleReach(250), 0, 'high up it startles nothing');
  equal(nextMood(IDLE, 90, {reach: startleReach(30)}), FLEE, 'a low helicopter at 90 m startles');
  equal(nextMood(IDLE, 90, {reach: startleReach(120)}), IDLE, 'a high one at 90 m does not');
  const { heliReach, heliLow } = WILDLIFE_VIEW;
  equal(heliReach, 100, 'the helicopter reach is the count\'s 100 m'); equal(heliLow, 60, 'and "low" is its 60 m');
  // How far it goes: 10 to 20 m.
  equal(fleeLength(0), 10, 'the shortest run is 10 m'); equal(fleeLength(1), 20, 'the longest is 20 m');
  equal(fleeLength(-4), 10, 'clamped low'); equal(fleeLength(9), 20, 'clamped high');
  for (let i = 0; i <= 10; i++) ok(fleeLength(i / 10) >= 10 && fleeLength(i / 10) <= 20, 'always 10 to 20 m');
}

// ---- Fade and the 12-animal cap -----------------------------------------------
{
  equal(WILDLIFE_VIEW.fadeRace, 250, 'faded out beyond 250 m in a race'); equal(WILDLIFE_VIEW.fadeHeli, 400, 'and beyond 400 m from the helicopter');
  equal(WILDLIFE_VIEW.maxDrawn, 12, 'at most 12 drawn at once');
  equal(fadeAlpha(10, 250), 1, 'solid when near'); equal(fadeAlpha(220, 250), 1, 'solid up to the fade band');
  near(fadeAlpha(235, 250), .5, 1e-9, 'half way through the fade'); equal(fadeAlpha(250, 250), 0, 'gone at 250 m'); equal(fadeAlpha(900, 250), 0, 'and beyond');
  equal(fadeAlpha(399, 400), 1 / WILDLIFE_VIEW.fadeBand, 'from the air the limit is 400 m');
  ok(fadeAlpha(Infinity, 250) === 0 && fadeAlpha(NaN, 250) === 0, 'a bad distance is not drawn');
  const out = new Int32Array(12);
  const distances = Float64Array.from([300, 40, 12, Infinity, 249, 8, 251, 90, 90.5, 17]);
  const count = pickNearest(distances, 250, 12, out);
  same([...out.subarray(0, count)], [5, 2, 9, 1, 7, 8, 4], 'the animals within 250 m, nearest first; the far and the unavailable are left out');
  const many = Float64Array.from({length: 40}, (_, i) => (i * 37) % 200 + 1);
  const picked = pickNearest(many, 250, 12, out);
  equal(picked, 12, 'no more than 12 are picked');
  const sorted = [...many].sort((a, b) => a - b).slice(0, 12);
  same([...out.subarray(0, picked)].map(i => many[i]), sorted, 'and they are the 12 nearest, in order');
  equal(pickNearest(new Float64Array(0), 250, 12, out), 0, 'no animals, none drawn');
  equal(pickNearest(Float64Array.from([251, 300]), 250, 12, out), 0, 'all too far, none drawn');
}

// ---- Facing, turning and a bird's flight --------------------------------------
{
  near(yawToward(1, 0), 0, 1e-12, 'a nose along +X facing +X is yaw 0');
  near(yawToward(0, -1), Math.PI / 2, 1e-12, 'toward -Z is a quarter turn (three.js turns +X toward -Z)');
  near(turnToward(0, 1, .25), .25, 1e-12, 'a turn is limited to its step'); near(turnToward(0, .1, .25), .1, 1e-12, 'and finishes when near');
  near(turnToward(3, -3, 1), 3 + (2 * Math.PI - 6) , 1e-9, 'it turns the short way round');
  const start = {x: 10, y: 5, z: -4}, a = birdFlight(start, 1, 0, 0), b = birdFlight(start, 0, 1, 4);
  same([a.x, a.y, a.z], [10, 5, -4], 'a bird is where it perched at take-off');
  ok(b.z > start.z + 30 && b.y > start.y + 20 && b.x === 10, 'it flies off along its line and climbs');
  ok(birdFlight(start, 1, 0, 3).y - birdFlight(start, 1, 0, 2).y > birdFlight(start, 1, 0, 2).y - birdFlight(start, 1, 0, 1).y, 'and climbs faster as it goes');
  const day = calendarPlayDay(new Date(2026, 10, 3, 3, 15)), same_day = calendarPlayDay(new Date(2026, 10, 3, 23, 59));
  equal(day, same_day, 'the play day is the same all calendar day'); equal(calendarPlayDay(new Date(2026, 10, 4, 0, 1)), day + 1, 'and the next day is one more');
}

// ---- Herds and the count's animals stand where they can be seen ----------------
{
  for (const id of ['tremblant-woods', 'tremblant-snow']) {
    const definition = COURSE.find(row => row.id === id), course = new Course(definition, definition.layoutSeed ?? 1989);
    const checker = wildlife.createPlacementChecker(course), trees = course.features.trees;
    ok(trees.length > 1000, `${id} has trees to keep clear of`);
    let herds = 0, near = 0, open = 0, clear = 0;
    for (let race = 1; race <= 40; race++) {
      const placed = wildlife.placeWildlife({courseId: id, playDay: 20400, raceNumber: race, course, approvedModels: APPROVED_MODEL_IDS,
        referenceLap: referenceLap(id, 'fixed') ?? referenceLap(id, 'route_a')});
      for (const spot of placed.spots) {
        const anchor = spot.animals[0]; herds++;
        if (anchor.edgeDistance <= wildlife.NEAR_EDGE) near++;
        if (checker.inspect(anchor.x, anchor.z, {open: true, minEdge: 15, maxEdge: 70, lake: 'shore'}) || checker.inspect(anchor.x, anchor.z, {open: true})) open++;
        // A second look made here: the nearest trunk is more than 6 m away.
        if (!trees.some(tree => Math.hypot(tree.x - anchor.x, tree.z - anchor.z) < wildlife.TRUNK_CLEAR)) clear++;
        ok(anchor.edgeDistance >= 15 && anchor.edgeDistance <= 70, `${id}: a herd stays in the 15 to 70 m band`);
      }
    }
    ok(near / herds >= .9, `${id}: most herds (${near} of ${herds}) stand 15 to 35 m from the road edge`);
    ok(open / herds >= .9 && clear / herds >= .9, `${id}: most herds (${open} and ${clear} of ${herds}) stand in open ground`);
    // The tree test itself: a spot beside a tree is not open, the same spot with trees gone is.
    const tree = trees.find(row => checker.inspect(row.x + 3, row.z, {minEdge: 15, maxEdge: Infinity}));
    if (tree) {
      ok(!checker.inspect(tree.x + 3, tree.z, {minEdge: 15, maxEdge: Infinity, open: true}), `${id}: 3 m from a trunk is not open ground`);
    }
    // The count: a square planned with the open-ground test puts its animals in open ground.
    const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z), site = {minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs)};
    const canStand = (x, z) => !!checker.inspect(x, z, {maxEdge: Infinity, open: true});
    let animals = 0, standing = 0;
    for (let day = 1; day <= 120; day++) {
      const job = surveyJob(day, {approved: APPROVED_MODEL_IDS});
      if (job.courseId !== id) continue;
      for (const animal of planSurvey(job, {site, canStand, wildlife, approved: APPROVED_MODEL_IDS}).animals) { animals++; if (canStand(animal.x, animal.z)) standing++; }
    }
    ok(animals > 50 && standing / animals >= .95, `${id}: the count's animals stand in open ground (${standing} of ${animals})`);
  }
  // The ring round a counted animal: one pulse, then faint until the count ends.
  const start = ringLook(0), peak = ringLook(WILDLIFE_VIEW.ringPulse / 2), settled = ringLook(WILDLIFE_VIEW.ringPulse), later = ringLook(600);
  equal(start.opacity, .95, 'the ring starts bright'); equal(start.scale, 1, 'and its own size');
  ok(peak.scale > 1.4 && peak.opacity < start.opacity && peak.opacity > settled.opacity, 'it swells and fades through the middle of the pulse');
  near(settled.opacity, WILDLIFE_VIEW.ringStay, 1e-9, 'it settles at its faint opacity'); near(settled.scale, 1, 1e-9, 'and its own size again');
  same(later, settled, 'and stays there until the count ends'); ok(settled.opacity > .1 && settled.opacity < start.opacity, 'faint, not gone');
  equal(ringLook(-3).opacity, .95, 'a bad age reads as the start');
  const view = readFileSync(new URL('../src/wildlife-view.js', import.meta.url), 'utf8');
  ok(/counted/.test(view) && /addRing/.test(view), 'the view draws rings for counted animals');
  ok(/planRace\(course, raceNumber, today\);[\s\S]{0,240}clearEntities\('count'\); countIndex\.clear\(\); countKey = null;/.test(view),
    'a new plan (leaving the helicopter, another course) clears the count animals, so none stand in a race');
  ok(/open: true/.test(readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')), 'the app asks for open ground when it places the count');
}

// ---- The herds of 19 November 2026, driven past by a car (QA-NIGHT-19-NOV) ------------------
// The browser check of the animals failed on that day with "Nothing ran". The game was not at fault: its sweep to find a
// herd had already startled this one, and a herd that has run into cover is out of reach of a car on the middle of the
// road. Here the real view runs without graphics (a plain box for every animal) on the day's own herds.
{
  const TODAY = 20776;
  equal(calendarPlayDay(new Date(2026, 10, 19, 12, 0)), TODAY, '19 November 2026 is play day 20776');
  equal(viewPlayDay(), calendarPlayDay(), 'with nothing fixed the view plans for the calendar day');
  globalThis.__qaWildlifeDay = 12345; equal(viewPlayDay(), 12345, 'a browser check can fix the day');
  globalThis.__qaWildlifeDay = 'x'; equal(viewPlayDay(), calendarPlayDay(), 'only a whole number fixes it');
  delete globalThis.__qaWildlifeDay;
  const definition = COURSE.find(row => row.id === 'tremblant-woods'), course = new Course(definition, definition.layoutSeed ?? 1989);
  const clips = new Set(Object.values(WILDLIFE_MODELS).flatMap(entry => [entry.idle, entry.move, entry.fly].filter(Boolean)));
  const loadModel = async () => {
    const scene = new THREE.Group(); scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    return {scene, animations: [...clips].map(name => new THREE.AnimationClip(name, 1, []))};
  };
  const pause = ms => new Promise(done => setTimeout(done, ms));
  const placed = wildlife.placeWildlife({courseId: 'tremblant-woods', playDay: TODAY, raceNumber: 1, course, approvedModels: APPROVED_MODEL_IDS,
    referenceLap: referenceLap('tremblant-woods', 'fixed') ?? referenceLap('tremblant-woods', 'route_a')});
  const herd = placed.spots.map(spot => ({spot, at: course.nearest(spot.animals[0].x, spot.animals[0].z)})).sort((p, q) => q.spot.animals.length - p.spot.animals.length)[0];
  ok(herd.spot.animals.length >= 2 && Math.abs(herd.at.lateral) > 20 && Math.abs(herd.at.lateral) < 35, `the day's herd stands 20 to 35 m from the middle of the road (lateral ${herd.at.lateral.toFixed(1)}, ${herd.spot.animals.length} animals)`);

  const view = createWildlifeView({scene: new THREE.Scene(), loadModel, playDay: () => TODAY});
  const player = {position: new THREE.Vector3(), visible: true};
  const frame = (s, lateral, dt = 1 / 60) => {
    const at = course.worldAt(s, lateral); player.position.set(at.x, at.y ?? 0, at.z);
    view.update({enabled: true, hidden: false, course, runId: 'qa', dt, worldVisible: true, heli: null, player, rival: null, extras: [], traffic: []});
  };
  const animals = () => { const rows = []; view.group.traverse(node => { if (node.parent?.parent === view.group && node.visible) rows.push({x: node.position.x, z: node.position.z}); }); return rows; };
  const nearest = (row, list) => list.reduce((best, other) => Math.min(best, Math.hypot(row.x - other.x, row.z - other.z)), Infinity);
  // A car at the pace of 38 m a second down the middle of the road, 1/60 s a frame, from `from` to `to`, then standing for `settle` frames.
  const drive = (from, to, settle = 300) => { for (let s = from; s < to; s += 38 / 60) frame(s, 0); for (let i = 0; i < settle; i++) frame(to, 0); };
  frame(herd.at.s - 300, 0); await pause(30); frame(herd.at.s - 300, 0);
  drive(herd.at.s - 300, herd.at.s - 100, 0);
  const idle = animals();
  ok(herd.spot.animals.every(animal => nearest(animal, idle) < 1.5), 'the herd is drawn where the rules put it, standing');
  drive(herd.at.s - 100, herd.at.s + 30);
  const ran = animals();
  ok(herd.spot.animals.every(animal => nearest(animal, ran) >= 4) && ran.length === idle.length, 'a car passing 26 to 34 m from the herd sends every animal running');
  const ranTo = ran.map(row => course.nearest(row.x, row.z));
  ok(ranTo.every(row => Math.abs(row.lateral) > 35), `into cover, beyond the 35 m a car on the middle of the road reaches (laterals ${ranTo.map(row => row.lateral.toFixed(1)).join(', ')})`);
  // The cause of the failure: a herd that has already run is not startled again by the next car down the middle.
  drive(herd.at.s - 140, herd.at.s + 30);
  same(animals(), ran, 'a second car down the middle of the road leaves the herd where it ran to');
  view.dispose();
}

// ---- Hitting an animal (WILD-HIT, switch wildlife-hits, docs/HELI_WILDLIFE.md 3.5) ----------------
// The same day's herd, drawn by the real view. A car on top of an animal knocks it down into a heap on its side
// with a stain under it; the monster truck flattens it; drawing only.
{
  equal(hitReach(false), 2.4, 'a car knocks an animal down within 2.4 m of its middle');
  equal(hitReach(true), 3.4, 'the monster truck within 3.4 m');
  const outline = bloodOutline(.37);
  same(bloodOutline(.37), outline, 'a stain has the same ragged outline every time for the same animal');
  ok(outline.length === 28 && outline.every(share => share >= .65 && share <= 1.15), 'its radii are 65 to 115% of its size');
  ok(JSON.stringify(bloodOutline(.71)) !== JSON.stringify(outline), "another animal's stain is another shape");

  const TODAY = 20776, definition = COURSE.find(row => row.id === 'tremblant-woods'), course = new Course(definition, definition.layoutSeed ?? 1989);
  const clips = new Set(Object.values(WILDLIFE_MODELS).flatMap(entry => [entry.idle, entry.move, entry.fly].filter(Boolean)));
  const loadModel = async () => {
    const scene = new THREE.Group(); scene.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, .5).translate(0, .6, 0), new THREE.MeshBasicMaterial()));
    return {scene, animations: [...clips].map(name => new THREE.AnimationClip(name, 1, []))};
  };
  const pause = ms => new Promise(done => setTimeout(done, ms));
  const placed = wildlife.placeWildlife({courseId: 'tremblant-woods', playDay: TODAY, raceNumber: 1, course, approvedModels: APPROVED_MODEL_IDS,
    referenceLap: referenceLap('tremblant-woods', 'fixed') ?? referenceLap('tremblant-woods', 'route_a')});
  const herd = placed.spots.sort((p, q) => q.animals.length - p.animals.length)[0];
  const target = herd.animals[0];
  // One view per run; the car is the player (or the rival) put down at (x, z).
  const run = async ({hits = true, crusher = false, by = 'player'} = {}) => {
    const sounds = [], view = createWildlifeView({scene: new THREE.Scene(), loadModel, playDay: () => TODAY, onHit: strength => sounds.push(strength)});
    const player = {position: new THREE.Vector3(), visible: true}, rival = {position: new THREE.Vector3(1e6, 0, 1e6), visible: true};
    const car = by === 'player' ? player : rival;
    const frame = (x, z) => {
      car.position.set(x, 0, z);
      if (by !== 'player') { const far = course.worldAt(course.nearest(x, z).s, 0); player.position.set(far.x, 0, far.z); }
      view.update({enabled: true, hidden: false, course, runId: 'qa', dt: 1 / 60, worldVisible: true, heli: null, player, rival, extras: [], traffic: [], hits, crusher});
    };
    // Load the models from far away, then put the car on top of the animal.
    const away = course.worldAt(course.nearest(target.x, target.z).s - 150, 0);
    frame(away.x, away.z); await pause(30); frame(away.x, away.z);
    frame(target.x + .5, target.z);
    for (let i = 0; i < 30; i++) frame(target.x + .5, target.z);
    const roots = [], blood = [];
    view.group.traverse(node => { if (node.name === 'Wildlife blood') blood.push(node); else if (node.parent?.parent === view.group && node.visible) roots.push(node); });
    const down = roots.filter(node => Math.abs(node.rotation.x - Math.PI / 2) < 1e-9);
    return {view, sounds, roots, down, blood};
  };

  const off = await run({hits: false});
  equal(off.down.length + off.blood.length, 0, 'with the switch off a car on top of an animal knocks nothing down');
  off.view.dispose();

  const hit = await run();
  ok(hit.down.length >= 1, "the player's car on top of an animal knocks it down: it lies on its side");
  const heap = hit.down.reduce((best, node) => Math.hypot(node.position.x - target.x, node.position.z - target.z) < Math.hypot(best.position.x - target.x, best.position.z - target.z) ? node : best),
    heapBox = new THREE.Box3().setFromObject(heap), heapMiddle = heapBox.getCenter(new THREE.Vector3());
  ok(heapBox.max.y - heapBox.min.y < .5, `a small heap: ${(heapBox.max.y - heapBox.min.y).toFixed(2)} m high (the animal stood 1.2 m)`);
  ok(Math.hypot(heap.position.x - target.x, heap.position.z - target.z) > 1, 'thrown on from where it was hit');
  equal(hit.blood.length, hit.down.length, 'with one stain under each animal knocked down');
  const stain = hit.blood.reduce((best, node) => Math.hypot(node.position.x - heapMiddle.x, node.position.z - heapMiddle.z) < Math.hypot(best.position.x - heapMiddle.x, best.position.z - heapMiddle.z) ? node : best);
  ok(stain.material.color.r > stain.material.color.g * 3 && stain.material.color.r > stain.material.color.b * 3, 'the stain is red');
  ok(Math.abs(stain.position.y - heapBox.min.y) < .3 && Math.hypot(stain.position.x - heapMiddle.x, stain.position.z - heapMiddle.z) < .05,
    'on the ground right under the middle of the heap (not under its feet, which the roll swings aside)');
  equal(hit.sounds.length, hit.down.length, "each of the player's hits plays the crush sound once"); equal(hit.sounds[0], .7, 'at the ordinary strength');
  const before = {x: heap.position.x, y: heap.position.y, z: heap.position.z};
  hit.view.update({enabled: true, hidden: false, course, runId: 'qa', dt: 1 / 60, worldVisible: true, heli: null,
    player: {position: new THREE.Vector3(target.x + 40, 0, target.z), visible: true}, rival: null, extras: [], traffic: [], hits: true});
  same({x: heap.position.x, y: heap.position.y, z: heap.position.z}, before, 'the heap stays where it fell when the car drives on');
  equal(hit.sounds.length, hit.down.length, 'and is not hit twice');
  hit.view.dispose();
  ok(!stain.parent, 'disposing the view takes the stain away with it');

  const crush = await run({crusher: true});
  ok(crush.down.length >= 1, 'the monster truck knocks it down too');
  const flat = new THREE.Box3().setFromObject(crush.down[0]);
  ok(flat.max.y - flat.min.y < (heapBox.max.y - heapBox.min.y) / 2, `and flattens it: ${(flat.max.y - flat.min.y).toFixed(2)} m against ${(heapBox.max.y - heapBox.min.y).toFixed(2)} m`);
  ok(new THREE.Box3().setFromObject(crush.blood[0]).getSize(new THREE.Vector3()).x * new THREE.Box3().setFromObject(crush.blood[0]).getSize(new THREE.Vector3()).z >
    new THREE.Box3().setFromObject(stain).getSize(new THREE.Vector3()).x * new THREE.Box3().setFromObject(stain).getSize(new THREE.Vector3()).z, 'with a wider stain');
  equal(crush.sounds[0], 1, 'and a harder crunch');
  crush.view.dispose();

  const rivalHit = await run({by: 'rival'});
  ok(rivalHit.down.length >= 1, 'another car knocks an animal down too');
  equal(rivalHit.sounds.length, 0, "but only the player's own hits make the sound");
  rivalHit.view.dispose();
  equal(DOWN, 4, 'a knocked-down animal has a mood of its own, after GONE');
}

// ---- Drawing never reaches into the race ---------------------------------------
{
  const source = readFileSync(new URL('../src/wildlife-view.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random|\.rng\b|from '\.\/(game|duel|app|race|course)\.js'/.test(source), 'the view uses no race generator, no game, no app and no random numbers');
  ok(/wildlifeRng/.test(source) && !/makeRng/.test(source), 'its own numbers come from the wildlife seed');
  ok(!/\bst\.[a-zA-Z.]+\s*=[^=]|\bstate\.[a-zA-Z.]+\s*=[^=]/.test(source), 'it assigns nothing to race state');
  const hub = readFileSync(new URL('../src/render3d.js', import.meta.url), 'utf8');
  equal(hub.split('wildlifeView.update(').length - 1, 1, 'render3d.js makes one call to update the animals');
  ok(!/wildlife/.test(readFileSync(new URL('../src/world.js', import.meta.url), 'utf8')), 'the world builder knows nothing of the animals, so no world signature includes them');
}

console.log(`Wildlife view: ${checks} checks.`);

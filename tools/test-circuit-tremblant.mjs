import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { buildTrackScript } from '../src/track-script.js';
import { GRAND_PRIX_COURSES, grandPrixCourse } from '../src/race-field.js';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { CARS } from '../src/config.js';
import { runRace } from './race-field-balance.mjs';
import { hillHeight, hillReach, runWeight } from '../src/circuit-hills.js';

// Tremblant Woods as a finished Grand Prix circuit (card P4-TREMBLANT,
// docs/CIRCUITS.md 5.3). The road layouts have their own suite
// (test-circuit-layouts.mjs); this checks what the card adds.
const road = buildTrackScript(TREMBLANT_WOODS);
const crestCentre = item => (item.s0 + item.s1) / 2;
const timber = road.pieces.filter(item => item.name === 'Timber Straight');

test('Tremblant Woods races with the full field', () => {
  assert.ok(GRAND_PRIX_COURSES.includes('tremblant-woods'));
  assert.ok(grandPrixCourse(TREMBLANT_WOODS));
  assert.equal(grandPrixCourse({ id: 'eifel-crown' }), false);
  assert.equal(TREMBLANT_WOODS.closed, true);
  assert.equal(TREMBLANT_WOODS.laps, 3);
});

test('Timber Straight has its two crests, the second where the chairlift crosses', () => {
  assert.deepEqual(timber.map(item => item.crest), [1.5, 2.5, 0]);
  // The Team Room flag for the chairlift (Claude's intel) is at s 2700.
  const flag = TREMBLANT_WOODS.intel.flags.find(item => item.id === 'chairlift');
  assert.ok(Math.abs(crestCentre(timber[1]) - flag.s) < 20, `second crest at ${crestCentre(timber[1]).toFixed(0)}, chairlift flag at ${flag.s}`);
  // The two crests are well apart: a car lands before it meets the second.
  assert.ok(crestCentre(timber[1]) - crestCentre(timber[0]) > 400);
});

test('the racing line shares out the swing between Pine Drop and Lakeside Plunge', () => {
  const course = new Course(TREMBLANT_WOODS, 1989), line = course.racingLine;
  const drop = road.pieces.find(item => item.name === 'Pine Drop'), plunge = road.pieces.find(item => item.name === 'Lakeside Plunge');
  let steepest = 0;
  for (let s = drop.s0 - 40; s < plunge.s1 + 40; s += 2) steepest = Math.max(steepest, Math.abs(line.offsetAt(s + 2) - line.offsetAt(s)) / 2);
  // maxSlope limits the average between two keys; the eased blend peaks at 1.5 times that.
  assert.ok(steepest <= TREMBLANT_WOODS.racingLine.maxSlope * 1.5 + .005, `line moves ${steepest.toFixed(3)} m across per metre`);
  const edge = Math.max(...Array.from({ length: 400 }, (_, i) => Math.abs(line.offsetAt(i * 11))));
  assert.ok(edge <= (road.halfWidthAt(0) - 1.5) * TREMBLANT_WOODS.racingLine.roadShare + 1e-6, 'the line keeps clear of the kerbs');
});

test('computer racers hold their speed down over the Pine Drop crest, and may fly on the straights', () => {
  const course = new Course(TREMBLANT_WOODS, 1989), profile = buildSpeedProfile(racingLineFor(course), CARS.falcone_f42, { cornerFactor: 1, topFactor: 1 });
  const drop = road.pieces.find(item => item.name === 'Pine Drop');
  const atDrop = Math.min(...Array.from({ length: 20 }, (_, i) => profile.at(crestCentre(drop) - 20 + i * 2)));
  assert.ok(atDrop < 95, `${atDrop.toFixed(0)} mph over the Pine Drop crest`);
  // On the straight the second Timber crest is no limit: the profile there is the top speed.
  assert.ok(profile.at(crestCentre(timber[1])) > profile.topMph * .97);
});

test('a Grand Prix on Tremblant Woods starts eight cars and brings every computer racer home', () => {
  const race = runRace('medium', 0, { course: 'tremblant-woods', maxSec: 400 });
  assert.equal(race.racers, 7);
  assert.equal(race.finished, 7, 'every computer racer finishes');
  assert.equal(race.lapTimes.length, 3);
});

// ---- scenery ---------------------------------------------------------------

const course = new Course(TREMBLANT_WOODS, 1989);
const placements = TREMBLANT_WOODS.kitPlacements;
const world = (s, lateral) => course.worldAt(s, lateral);
// Distance from a point to the nearest road, less that road's half width.
const gap = (s, lateral) => { const p = world(s, lateral), near = course.nearest(p.x, p.z); return near.distance - course.roadHalfWidthAt(near.s); };

test('every kit piece is an approved kit id and stays clear of every road', () => {
  const ids = new Set(JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json', import.meta.url), 'utf8')).pieces.map(item => item.id));
  assert.ok(placements.length > 300);
  for (const piece of placements) {
    assert.ok(ids.has(piece.id), `${piece.id} is a kit piece`);
    assert.ok(piece.s >= 0 && piece.s <= course.length);
    if (piece.id === 'start-gantry') continue; // spans the grid
    if (piece.ride?.role === 'cable' || piece.ride?.role === 'chair') continue; // posed over the road once loaded, starts off it
    // The cars' boundary is 1 m outside the road edge; barriers stand just beyond it.
    assert.ok(gap(piece.s, piece.lateral) > 2.3, `${piece.id} at s ${piece.s.toFixed(0)}, ${piece.lateral.toFixed(1)} m is ${gap(piece.s, piece.lateral).toFixed(1)} m from a road edge`);
  }
});

test('the paddock: gantry across the grid, pits and stands on opposite sides', () => {
  const gantry = placements.filter(item => item.id === 'start-gantry');
  assert.equal(gantry.length, 1);
  assert.equal(gantry[0].s, 0); assert.equal(gantry[0].lateral, 0);
  assert.ok(placements.filter(item => item.id === 'pit-garage').every(item => item.lateral < 0));
  assert.ok(placements.filter(item => item.id === 'grandstand').every(item => item.lateral > 0));
  assert.ok(placements.filter(item => item.id === 'pit-garage').length >= 8);
});

test('safety kit stands on the outside of the fast corners, tyre walls at the slow ones', () => {
  const corner = name => road.pieces.find(item => item.name === name);
  const near = (id, name) => placements.filter(item => item.id === id && item.s >= corner(name).s0 + 8 && item.s <= corner(name).s1 - 8);
  for (const name of ['Pine Drop', 'Lakeside Plunge', 'Ridge Corner', 'Lodge Bend', 'Final Turn']) {
    const armco = near('armco', name);
    assert.ok(armco.length >= 10, `armco at ${name}`);
    assert.ok(armco.every(item => Math.sign(item.lateral) === -corner(name).dir), `armco on the outside of ${name}`);
  }
  assert.ok(near('tyre-wall', 'Beaver Hairpin').length >= 4); assert.ok(near('tyre-wall', 'Ridge Corner').length >= 4);
  // The catch fence runs along Timber Straight and along the spur, on the two sides of the divide.
  const timber = road.pieces.find(item => item.name === 'Timber Straight'), spur = road.pieces.find(item => item.name === 'The Spur');
  const onTimber = placements.filter(item => item.id === 'catch-fence' && item.s > timber.s0 && item.s < timber.s0 + 140);
  const onSpur = placements.filter(item => item.id === 'catch-fence' && item.s > spur.s0 - 60 && item.s <= spur.s1);
  assert.ok(onTimber.length >= 20 && onSpur.length >= 10);
  assert.equal(Math.sign(onTimber[0].lateral) === Math.sign(onSpur[0].lateral), false, 'opposite sides of their own roads: they face each other');
});

test('the lake, the hill and the lift stand where the road is not', () => {
  const lake = TREMBLANT_WOODS.effects.lake, hill = TREMBLANT_WOODS.hills[0];
  for (let a = 0; a < 48; a++) {
    const angle = a / 48 * Math.PI * 2;
    assert.ok(gap(lake.s + Math.cos(angle) * lake.along, lake.lateral + Math.sin(angle) * lake.across) > 8 || Math.sin(angle) < 0 && Math.abs(Math.cos(angle)) < .98, 'the lake keeps off the road except at its shore');
    assert.ok(gap(hill.s + Math.cos(angle) * hill.along, hill.lateral + Math.sin(angle) * hill.across) > 15, `the hill is ${gap(hill.s + Math.cos(angle) * hill.along, hill.lateral + Math.sin(angle) * hill.across).toFixed(0)} m from a road at ${a}`);
  }
  // The shore nearest the road is still 10 m from its edge.
  assert.ok(gap(lake.s, lake.lateral - lake.across) > 10);
  const lift = placements.filter(item => item.id === 'chairlift-tower');
  assert.equal(lift.length, 8);
  assert.ok(lift.every(item => Math.abs(item.lateral) >= 22), 'towers stand beyond the runoff');
  assert.ok(Math.abs(lift[0].s - crestCentre(timber[1])) < 1, 'the lift crosses at the second crest');
});

test('no tree stands on a ski run, and the lodge and dock have their ground', () => {
  const hill = TREMBLANT_WOODS.hills[0];
  for (const piece of placements.filter(item => item.hill !== undefined)) {
    const [du, dv] = [piece.s - hill.s, piece.lateral - hill.lateral];
    assert.ok(runWeight(hill, du, dv) < .02 || piece.id === 'ski-lodge', `${piece.id} on a ski run`);
    assert.ok(hillReach(hill, du, dv) < 1);
  }
  assert.ok(hillHeight(hill, 0, 0) > 30);
  const trees = course.features.trees.filter(tree => tree.id.startsWith('hill-tree'));
  assert.ok(trees.length > 80, `${trees.length} pines on the hill`);
  for (const tree of trees) {
    const [du, dv] = [tree.s - hill.s, tree.off - hill.lateral];
    assert.ok(runWeight(hill, du, dv) <= .02 && tree.y > course.groundAt(tree.s, tree.off).y - 1e-9);
  }
  // Planted pines keep out of the lake, the lift corridor and the paddock.
  const lake = TREMBLANT_WOODS.effects.lake;
  for (const tree of course.features.trees) {
    const found = Math.abs(tree.s - lake.s) < lake.along && tree.off > 8 && tree.off < lake.lateral + lake.across;
    assert.equal(found, false, `${tree.id} stands in the lake`);
  }
});

test('the scenery is the same on every build', () => {
  const again = new Course(TREMBLANT_WOODS, 1989);
  assert.equal(again.features.trees.length, course.features.trees.length);
  assert.deepEqual(TREMBLANT_WOODS.kitPlacements.slice(0, 5), placements.slice(0, 5));
});

test('the lodge stands on a level terrace', () => {
  const hill = TREMBLANT_WOODS.hills[0], lodge = placements.find(item => item.id === 'ski-lodge');
  const [du, dv] = [lodge.s - hill.s, lodge.lateral - hill.lateral];
  const centre = hillHeight(hill, du, dv);
  for (const [x, z] of [[-12, 0], [12, 0], [0, -8], [0, 8], [-10, -7], [10, 7]]) assert.ok(Math.abs(hillHeight(hill, du + x, dv + z) - centre) < .3, 'the ground under the lodge is level');
  assert.ok(centre > 8, `the lodge is ${centre.toFixed(1)} m above the road`);
});

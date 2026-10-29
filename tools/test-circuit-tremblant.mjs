import {FEATURE_STATES, createFeatureFlags} from '../src/feature-flags.js';
import {COURSE_PRICES, isCourseUnlocked, purchaseCourse} from '../src/course-access.js';
import {COURSE} from '../src/config.js';
import {supportsCombat} from '../src/combat-weapons.js';
import {CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {createProfile} from '../src/progression.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { manifest as ownedManifest, TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { buildTrackScript } from '../src/track-script.js';
import { GRAND_PRIX_COURSES, grandPrixCourse } from '../src/race-field.js';
import { racingLineFor, buildSpeedProfile } from '../src/race-lines.js';
import { CARS } from '../src/config.js';
import { runRace } from './race-field-balance.mjs';
import { hillHeight, hillReach, runWeight, basinGround } from '../src/circuit-hills.js';
import { lakeLevel } from '../src/circuit-effects.js';
import { circuitLighting, resolveLightingSettings } from '../src/lighting-moods.js';
import { PANORAMA_RIDGE } from '../src/circuits/panorama-ridge.js';
import { standCrowdGeometry } from '../src/stand-crowd.js';
import { terrainGeometry } from '../src/world-surfaces.js';

// Tremblant Woods as a finished Grand Prix circuit (card P4-TREMBLANT,
// docs/CIRCUITS.md 5.3). The road layouts have their own suite
// (test-circuit-layouts.mjs); this checks what the card adds.
const road = buildTrackScript(TREMBLANT_WOODS);
const crestCentre = item => (item.s0 + item.s1) / 2;
const timber = road.pieces.filter(item => item.name === 'Timber Straight');

test('Tremblant Woods races with the full field', () => {
  assert.ok(GRAND_PRIX_COURSES.includes('tremblant-woods'));
  assert.ok(grandPrixCourse(TREMBLANT_WOODS));
  assert.equal(grandPrixCourse({ id: 'titan-arena' }), false);
  assert.equal(TREMBLANT_WOODS.closed, true);
  assert.equal(TREMBLANT_WOODS.laps, 3);
  // The racers' pace on this circuit, set per difficulty from the balance runs.
  assert.deepEqual(Object.keys(TREMBLANT_WOODS.fieldPace), ['easy', 'medium', 'hard']);
  assert.ok(Object.values(TREMBLANT_WOODS.fieldPace).every(value => value > .7 && value < 1));
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

// ---- the finishing pass ------------------------------------------------------

test('the forest crowds the road on both sides and keeps its distance and its gaps', () => {
  const forest = course.features.trees.filter(tree => tree.id.startsWith('forest-'));
  assert.ok(forest.length > 2200, `${forest.length} pines in the forest`);
  for (const tree of forest) {
    const found = course.nearest(tree.x, tree.z), edge = found.distance - course.roadHalfWidthAt(found.s);
    assert.ok(edge >= 12 && edge <= 60, `${tree.id} is ${edge.toFixed(1)} m beyond the road edge`);
  }
  // Both sides of Timber Straight outside the fence and the lift, and of Ridge Run, are lined with trees.
  for (const [from, to] of [[2200, 2640], [3000, 3190], [960, 1200]]) for (const side of [-1, 1]) {
    const count = forest.filter(tree => tree.s >= from && tree.s <= to && Math.sign(tree.off) === side).length;
    assert.ok(count >= 25, `${count} forest pines on side ${side} between ${from} and ${to}`);
  }
  // No forest at the paddock, under the chairlift or by the catch fence.
  assert.equal(forest.filter(tree => tree.s < 120 || tree.s > course.length - 90).length, 0, 'the paddock is clear');
  const lift = TREMBLANT_WOODS.effects.lift;
  assert.equal(forest.filter(tree => Math.abs(tree.s - lift.s) < 7).length, 0, 'the lift crosses a clear cut');
});

test('about four trees in ten turn colour, and the same ones every build', () => {
  const trees = course.features.trees, tinted = trees.filter(tree => tree.tint);
  const share = tinted.length / trees.length;
  assert.ok(share > .35 && share < .45, `${(share * 100).toFixed(0)}% of the trees are in autumn colour`);
  const palette = TREMBLANT_WOODS.scenery.autumn.colours;
  assert.ok(palette.length >= 4 && tinted.every(tree => palette.includes(tree.tint)));
  // Red, gold and orange are all there.
  const reds = palette.filter(c => c[0] > c[1] * 3), golds = palette.filter(c => c[1] > c[0] * .7), oranges = palette.filter(c => c[1] > c[0] * .4 && c[1] < c[0] * .7);
  assert.ok(reds.length && golds.length && oranges.length);
  assert.deepEqual(new Course(TREMBLANT_WOODS, 1989).features.trees.map(tree => !!tree.tint), trees.map(tree => !!tree.tint));
  // The ground carries fallen leaves beside the road and woodland beyond.
  assert.ok(TREMBLANT_WOODS.groundLeaves.colours.length >= 3 && TREMBLANT_WOODS.groundLeaves.wood.share > .2);
});

test('circuits have white edge lines and no centre line', () => {
  assert.equal(TREMBLANT_WOODS.markings, 'circuit');
  assert.equal(PANORAMA_RIDGE.markings, 'circuit');
});

test('the lake lies in a dug bowl: deep in the middle, level at the shore, the road side untouched', () => {
  const lake = TREMBLANT_WOODS.effects.lake, level = lakeLevel(course, lake);
  assert.deepEqual(TREMBLANT_WOODS.basins, [lake]);
  const middle = course.groundAt(lake.s, lake.lateral);
  assert.ok(level - middle.y > lake.depth * .8, `${(level - middle.y).toFixed(1)} m of water in the middle`);
  // The lake is bigger than a pond and lower than the road beside it.
  assert.ok(lake.along * lake.across > 15000);
  assert.ok(lake.surface < 0);
  // Halfway to the shore the ground is still under water; just outside the shore it is above it.
  const inside = course.groundAt(lake.s, lake.lateral - lake.across * .7), outside = course.groundAt(lake.s, lake.lateral - lake.across * 1.15);
  assert.ok(inside.y < level - .4 && outside.y > level - .2, `inside ${(inside.y - level).toFixed(1)}, outside ${(outside.y - level).toFixed(1)} m from the water`);
  // The ground beside the road is what it was without the lake.
  const bare = new Course({ ...TREMBLANT_WOODS, basins: [] }, 1989);
  for (const lateral of [-30, -8, 8, 10, 12]) for (let s = 500; s <= 900; s += 40)
    assert.ok(Math.abs(course.groundAt(s, lateral).y - bare.groundAt(s, lateral).y) < 1e-6, `ground at ${s}, ${lateral} is changed`);
  // A circuit without basins is untouched.
  assert.equal(basinGround({ s: 0, lateral: 50, along: 100, across: 50, depth: 5 }, 0, 400).weight, 0);
});

test('rounded hills ring the circuit; the ski mountain behind the lodge is the tallest', () => {
  const { hills } = TREMBLANT_WOODS.effects.backdrop, ski = hills[0];
  assert.ok(hills.length >= 8, `${hills.length} backdrop hills`);
  assert.ok(hills.every(hill => hill.height <= ski.height) && ski.height >= 140);
  assert.ok(ski.runs.length >= 5, 'pale ski runs down its face');
  assert.equal(TREMBLANT_WOODS.scenery.mountains, false, 'no grey peaks');
  for (const hill of hills) {
    // The foot of every hill is clear of every road: each road point lies outside the hill's outline.
    const cos = Math.cos(hill.angle ?? 0), sin = Math.sin(hill.angle ?? 0);
    for (let i = 0; i < course.samples.length; i += 2) {
      const dx = course.samples[i].x - hill.x, dz = course.samples[i].z - hill.z;
      const reach = hillReach(hill, sin * dx + cos * dz, cos * dx - sin * dz);
      assert.ok(reach > 1.05, `the road is inside a backdrop hill (reach ${reach.toFixed(2)} at s ${course.samples[i].s.toFixed(0)})`);
    }
  }
  // The lodge stands on the foothill in front of it.
  const lodge = placements.find(item => item.id === 'ski-lodge'), foot = TREMBLANT_WOODS.hills[0];
  assert.ok(Math.hypot(lodge.s - foot.s, lodge.lateral - foot.lateral) < foot.along);
});

test('tyre walls are painted in bands so they do not read as black stacks', () => {
  const walls = placements.filter(item => item.id === 'tyre-wall');
  assert.ok(walls.length >= 10 && walls.every(item => item.bands.length === 3));
  // Every band is far brighter than the dark rubber it multiplies; the middle band is red.
  assert.ok(walls.every(item => item.bands.every(band => Math.max(...band) > 8)));
  assert.ok(walls.every(item => item.bands[1][0] > item.bands[1][1] * 4));
});

test('the light is an autumn morning: lower than midday, warm, hazy and not blown out', () => {
  const golden = resolveLightingSettings('alpine', { mood: 'golden' }), clear = resolveLightingSettings('alpine', { mood: 'clear' });
  const morning = circuitLighting(golden, TREMBLANT_WOODS.light);
  const elevation = look => Math.atan2(look.sunOffset.y, Math.hypot(look.sunOffset.x, look.sunOffset.z));
  // A morning sun well up from the horizon (20 to 28 degrees): low enough for long shadows, high
  // enough that it does not glance off the cars and blow out the ground facing it.
  const degrees = elevation(morning) * 180 / Math.PI;
  assert.ok(elevation(morning) < elevation(clear) && degrees > 20 && degrees < 28, `a morning sun at ${degrees.toFixed(1)} degrees`);
  assert.ok(morning.sunColor > 0xff0000 && (morning.sunColor >> 8 & 255) < 0xd0, 'a warm sun');
  assert.ok(morning.fogFar > morning.fogNear + 1000 && morning.fogNear >= 200, 'a light haze, not a wall of it');
  assert.equal(circuitLighting(clear, TREMBLANT_WOODS.light), circuitLighting(clear, TREMBLANT_WOODS.light), 'made once and reused');
  assert.equal(circuitLighting(clear, undefined), clear, 'a circuit without a light is unchanged');
  // The sun is no stronger than the golden hour's, and the bloom is light, so nothing facing it burns white.
  assert.ok(morning.sun <= golden.sun && morning.bloom <= .16);
});

test('Beaver Hairpin has its 150, 100 and 50 m boards, all on the outside of the corner', () => {
  const hairpin = road.pieces.find(item => item.name === 'Beaver Hairpin'), side = -hairpin.dir;
  const scriptBoards = new Course(TREMBLANT_WOODS).features.boards.filter(item => item.name === 'Beaver Hairpin');
  assert.deepEqual(scriptBoards.map(item => item.distance), [50], 'the script has room for the 50 m board only');
  for (const distance of [150, 100]) {
    const board = placements.find(item => item.id === `braking-board-${distance}` && Math.abs(item.s - (hairpin.s0 - distance)) < .01);
    assert.ok(board, `a ${distance} m board before the hairpin`);
    assert.equal(Math.sign(board.lateral), side);
    assert.equal(board.heading, Math.PI);
  }
});

test('the grandstands at the start are filled with spectators, inside their seating', () => {
  const stands = placements.filter(item => item.id === 'grandstand');
  assert.ok(stands.length >= 4 && stands.every(item => item.crowd === true));
  const seating = { half: 5.0, rows: [[2.75, 1.91], [2.25, 2.30], [1.75, 2.69], [1.25, 3.09], [.75, 3.48], [.25, 3.87]] };
  const geometry = standCrowdGeometry(seating, 7), position = geometry.attributes.position;
  const cards = position.count / 4;
  assert.ok(cards > 40 && cards <= seating.rows.length * 14, `${cards} spectators in a stand`);
  for (let i = 0; i < position.count; i++) {
    assert.ok(Math.abs(position.getX(i)) < seating.half + 1.2, 'inside the width of the stand');
    assert.ok(position.getZ(i) > 0 && position.getZ(i) < 3, 'on the treads');
    assert.ok(position.getY(i) > 1.4 && position.getY(i) < 5.8, 'under the roof');
  }
  assert.deepEqual(standCrowdGeometry(seating, 7).attributes.position.array, position.array, 'the same seats fill every time');
});

test('the land beyond the trees rises gently, and the road and its edges are untouched', () => {
  const plain = new Course({ ...TREMBLANT_WOODS, relief: undefined, basins: undefined }), calm = new Course({ ...TREMBLANT_WOODS, basins: undefined });
  const edge = TREMBLANT_WOODS.relief.from;
  let softer = 0;
  for (let s = 100; s < plain.length; s += 150) for (const side of [-1, 1]) {
    const half = plain.roadHalfWidthAt(s);
    // Up to `from` metres beyond the road edge nothing changes.
    for (const off of [0, half, half + edge * .9]) assert.equal(calm.groundAt(s, side * off).y, plain.groundAt(s, side * off).y);
    const far = half + 200, change = Math.abs(plain.groundAt(s, side * far).y - plain.worldAt(s, side * far).y) - Math.abs(calm.groundAt(s, side * far).y - calm.worldAt(s, side * far).y);
    assert.ok(change > -1e-9, 'never steeper than before');
    if (change > 1) softer++;
  }
  assert.ok(softer > 10, 'the far hillsides are lower');
});

test('the ground beside each corner is greyer and darker gravel, and no other ground changes', () => {
  const plain = terrainGeometry(new Course({ ...TREMBLANT_WOODS, groundLeaves: { ...TREMBLANT_WOODS.groundLeaves, gravel: undefined } }));
  const gravel = terrainGeometry(new Course(TREMBLANT_WOODS));
  const a = plain.attributes.color, b = gravel.attributes.color;
  assert.equal(a.count, b.count);
  let darker = 0, changed = 0, brighter = 0;
  for (let i = 0; i < a.count; i++) {
    if (a.getX(i) === b.getX(i) && a.getY(i) === b.getY(i) && a.getZ(i) === b.getZ(i)) continue;
    changed++;
    // Fallen leaves are taken out of the gravel, so a single channel can rise; the ground as a whole does not.
    if (b.getX(i) + b.getY(i) + b.getZ(i) <= a.getX(i) + a.getY(i) + a.getZ(i) + 1e-9) darker++; else brighter++;
  }
  assert.ok(changed > 200, `${changed} vertices re-tinted`);
  assert.equal(brighter, 0, 'only ever darker overall');
  assert.ok(changed < a.count * .35, 'only the ground beside the corners');
});

// Independent accepted metadata belongs to this course, so another course can join without a shared edit.
test('tremblant-woods retains its accepted registry identity and access', () => {
  const id = 'tremblant-woods', definition = TREMBLANT_WOODS;
  assert.deepEqual([definition.id, definition.flag, definition.stage], [id, id, 18]);
  assert.deepEqual([ownedManifest.id, ownedManifest.flag, ownedManifest.state, ownedManifest.price, ownedManifest.grandPrix, ownedManifest.releaseOrder],
    [id, id, 'on', 1600, true, 0]);
  assert.equal(FEATURE_STATES[id], 'on');
  assert.equal(COURSE_PRICES[id], 1600);
  assert.equal(GRAND_PRIX_COURSES.includes(id), true);
  assert.equal(createFeatureFlags({storage:null, qa:false}).enabled(id), true);
  assert.equal(supportsCombat(definition), false);
  assert.equal(definition.noCombat, true); assert.equal(definition.hasRival, true);
  const enabled = CIRCUIT_MANIFESTS.filter(row => row.state === 'on' && row.slot === undefined);
  const publicIndex = COURSE.findIndex(row => row.id === id);
  assert.equal(publicIndex, BASE_COURSE_COUNT + enabled.findIndex(row => row.id === id));
  const fresh = createProfile();
  assert.equal(isCourseUnlocked(fresh, id), false);
  const poor = purchaseCourse({...fresh, credits:1599}, id);
  assert.equal(poor.ok, false); assert.equal(poor.profile.credits, 1599);
  const rich = {...fresh, credits:2000}, bought = purchaseCourse(rich, id);
  assert.equal(bought.ok, true); assert.equal(bought.cost, 1600); assert.equal(bought.profile.credits, 400);
  assert.deepEqual(bought.profile.courses.unlocked, [...rich.courses.unlocked, id].filter(value => COURSE.some(row => row.id === value)));
  assert.equal(isCourseUnlocked(bought.profile, id), true); assert.equal(isCourseUnlocked(bought.profile, 'pacific-canyon'), true);
  for (const other of CIRCUIT_MANIFESTS.filter(row => row.id !== id)) assert.equal(isCourseUnlocked(bought.profile, other.id), false, 'buying this course never grants another paid course');
  const unowned = courseAccessPanel(fresh, 0, ''), owned = courseAccessPanel(bought.profile, publicIndex, '');
  assert.match(unowned, /Tremblant Woods/); assert.match(unowned, /1,?600 CR/);
  assert.doesNotMatch(unowned, /UNLOCKED<\/span><h3>Tremblant Woods/);
  assert.match(owned, /UNLOCKED<\/span><h3>Tremblant Woods/);
});

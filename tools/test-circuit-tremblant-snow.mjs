import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { TREMBLANT_SNOW, SNOWMAN_SPOTS } from '../src/circuits/tremblant-snow.js';
import { ALL_CIRCUITS } from '../src/circuits/index.js';
import { buildTrackScript } from '../src/track-script.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES } from '../src/course-access.js';
import { GRAND_PRIX_COURSES, grandPrixCourse } from '../src/race-field.js';
import { supportsCombat } from '../src/combat-weapons.js';
import { courseHasWinterSurfaces, gripFor, ICE_MAX_LENGTH, ICE_BOARD_DISTANCE } from '../src/race-surfaces.js';
import { snowWorldEnabled, winterLightingSettings, snowWorldPlacements } from '../src/snow-world.js';
import { circuitLighting, resolveLightingSettings } from '../src/lighting-moods.js';
import { pitAt, pitBox } from '../src/pit-lane.js';
import { skierSpots } from '../src/circuit-effects.js';
import { hillReach, runWeight } from '../src/circuit-hills.js';
import { runRace } from './race-field-balance.mjs';

// Tremblant Snow (card P4-TREMBLANT-SNOW, docs/CIRCUITS.md 5.3): the Tremblant Woods circuit in winter.
// Tremblant Woods itself has its own suite (test-circuit-tremblant.mjs); this checks what the variant adds
// and that the live circuit was left alone.
const road = buildTrackScript(TREMBLANT_SNOW), autumn = buildTrackScript(TREMBLANT_WOODS);
const course = new Course(TREMBLANT_SNOW, 1989);
const piece = name => road.pieces.find(item => item.name === name);
const placements = TREMBLANT_SNOW.kitPlacements;
const gap = (s, lateral) => { const p = course.worldAt(s, lateral), near = course.nearest(p.x, p.z); return near.distance - course.roadHalfWidthAt(near.s); };

test('Tremblant Snow is a stable event behind its own switch, last on the list, priced, race-only and in the Grand Prix', () => {
  assert.equal(TREMBLANT_SNOW.id, 'tremblant-snow');
  assert.equal(TREMBLANT_SNOW.flag, 'tremblant-snow');
  assert.equal(FEATURE_STATES['tremblant-snow'], 'dev', 'dev until Kyle approves it');
  assert.equal(FEATURE_STATES['tremblant-woods'], 'on', 'the autumn circuit stays released');
  assert.equal(ALL_CIRCUITS.at(-1), TREMBLANT_SNOW, 'appended after every other circuit');
  assert.ok(COURSE_PRICES['tremblant-snow'] > 0);
  assert.ok(GRAND_PRIX_COURSES.includes('tremblant-snow') && grandPrixCourse(TREMBLANT_SNOW));
  assert.equal(TREMBLANT_SNOW.noCombat, true);
  assert.equal(supportsCombat(TREMBLANT_SNOW), false, 'a pure race track');
  assert.ok(Object.isFrozen(TREMBLANT_SNOW) && TREMBLANT_SNOW.laps === 3 && TREMBLANT_SNOW.closed === true);
  assert.deepEqual(Object.keys(TREMBLANT_SNOW.fieldPace), ['easy', 'medium', 'hard']);
  const bat = readFileSync(new URL('../start-preview.bat', import.meta.url), 'utf8');
  assert.match(bat, /PREVIEW_FLAGS=[^\r\n]*\btremblant-snow\b/);
  // On the course list only while its switch is on, after Tremblant Woods.
  const flags = createFeatureFlags({ storage: null, qa: true, search: '?flags=tremblant-snow' });
  assert.equal(flags.enabled('tremblant-snow'), true);
  assert.equal(COURSE.some(item => item.id === 'tremblant-snow'), false, 'off in the tests and for players');
});

test('it is the same road as Tremblant Woods, and Tremblant Woods is untouched', () => {
  assert.equal(road.length, autumn.length);
  assert.deepEqual(road.pieces.map(item => [item.name, item.kind, +item.s0.toFixed(6), +item.s1.toFixed(6), item.radius]), autumn.pieces.map(item => [item.name, item.kind, +item.s0.toFixed(6), +item.s1.toFixed(6), item.radius]));
  assert.deepEqual(road.samples.slice(0, 500).map(item => [item.x, item.z, item.y]), autumn.samples.slice(0, 500).map(item => [item.x, item.z, item.y]));
  // The live circuit has no winter, no ice, no pit lane and no snow-only scenery option.
  for (const key of ['snowWorld', 'pitLane', 'surfacePatches']) assert.equal(TREMBLANT_WOODS[key], undefined, `${key} is not on Tremblant Woods`);
  assert.ok(buildTrackScript(TREMBLANT_WOODS).pieces.every(item => item.surface === 'asphalt'));
  assert.equal(TREMBLANT_WOODS.effects.skiers, undefined);
  assert.equal(TREMBLANT_WOODS.effects.smoke, undefined);
  assert.equal(TREMBLANT_WOODS.effects.lake.frozen, undefined);
  assert.equal(TREMBLANT_WOODS.hills[0].palette, undefined);
});

test('packed snow on most of the lap, ploughed asphalt on Lodge Straight and Timber Straight', () => {
  const asphalt = road.pieces.filter(item => item.surface === 'asphalt').map(item => item.name);
  assert.deepEqual([...new Set(asphalt)], ['Lodge Straight', 'Timber Straight']);
  assert.equal(road.pieces.filter(item => item.name === 'Timber Straight').every(item => item.surface === 'asphalt'), true);
  const snowLength = road.pieces.filter(item => item.surface === 'snow').reduce((sum, item) => sum + item.s1 - item.s0, 0);
  assert.ok(snowLength / road.length > .55, `${(snowLength / road.length * 100).toFixed(0)}% packed snow`);
  assert.equal(course.gripKindAt(50, 0), 'asphalt');
  assert.equal(course.gripKindAt(piece('Timber Straight').s0 + 400, 0), 'asphalt');
  assert.equal(course.gripKindAt(piece('Lakeshore').s0 + 40, 0), 'snow');
  assert.equal(courseHasWinterSurfaces(TREMBLANT_SNOW), true, 'the race setup offers the tyre choice');
  assert.equal(courseHasWinterSurfaces(TREMBLANT_WOODS), false);
  // Winter tyres hold the snow; summer tyres lose a quarter of it. On the cleared road summer is best.
  assert.ok(gripFor('snow', 'winter').grip > gripFor('snow', 'summer').grip * 1.3);
  assert.ok(gripFor('asphalt', 'summer').grip > gripFor('asphalt', 'winter').grip);
});

test('two shaded ice patches, short, off every hairpin apex, each with its ICE board 100 m before', () => {
  const ice = TREMBLANT_SNOW.surfacePatches;
  assert.equal(ice.length, 2);
  for (const patch of ice) {
    assert.equal(patch.kind, 'ice'); assert.equal(patch.shaded, true);
    assert.ok(patch.s1 - patch.s0 <= ICE_MAX_LENGTH);
    const corner = road.pieces.find(item => item.kind === 'turn' && item.radius < 25 && patch.s0 < item.arcEnd && patch.s1 > item.arcStart);
    assert.equal(corner, undefined, 'never on a hairpin apex');
    const board = course.features.boards.find(item => item.kind === 'ice' && Math.abs(item.ahead - patch.s0) < 1e-6);
    assert.ok(board && board.distance === ICE_BOARD_DISTANCE, `an ICE board before ${patch.id}`);
    assert.equal(course.gripKindAt((patch.s0 + patch.s1) / 2, 0), 'ice');
    assert.equal(course.gripKindAt(patch.s0 - 5, 0), 'snow');
  }
  // One just past the Fir Esses, the other on the spur before Beaver Hairpin.
  assert.ok(ice[0].s0 > piece('Fir Esses 2').s1 && ice[0].s0 - piece('Fir Esses 2').s1 < 30);
  assert.ok(piece('Beaver Hairpin').s0 - ice[1].s1 < 40 && ice[1].s0 > piece('The Spur').s0);
});

test('a pit lane on Lodge Straight with its boxes in front of the garages', () => {
  const lane = course.pitLane, straight = piece('Lodge Straight');
  assert.ok(lane && lane.side === -1 && lane.straight === 'Lodge Straight');
  // The straight runs through the start line; the lane lies on the part after it.
  assert.ok(straight.s0 < 0 && lane.entry >= 0 && lane.exit <= straight.s1);
  for (const s of [lane.entry + 80, lane.box, lane.exit - 80]) assert.equal(pitAt(course, s, lane.offsetAt(s)), lane);
  assert.equal(pitAt(course, lane.box, 0), null);
  const garages = placements.filter(item => item.id === 'pit-garage');
  assert.ok(garages.length >= 10 && garages.every(item => item.lateral < 0));
  // All eight boxes (the player's in the middle, seven more) stand between the first and last garage.
  const boxes = [...Array(8).keys()].map(index => pitBox(lane, { field: { index } }));
  assert.ok(Math.min(...boxes) >= garages[0].s - 8 && Math.max(...boxes) <= garages.at(-1).s + 8, `boxes ${boxes.join(', ')}`);
  assert.equal(pitBox(lane, {}), lane.box);
});

test('winter is the course\'s own: on whenever it is on the list, off for Tremblant Woods, banks along the road', () => {
  const nothing = { enabled: () => false };
  assert.equal(snowWorldEnabled(course, nothing), true);
  assert.equal(snowWorldEnabled(new Course(TREMBLANT_WOODS, 1989), { enabled: () => true }), false);
  // A course that only has snowWorld still needs the shared switch.
  assert.equal(snowWorldEnabled({ def: { snowWorld: { ranges: [] } } }, nothing), false);
  assert.equal(snowWorldEnabled({ def: { snowWorld: { ranges: [] } } }, { enabled: name => name === 'snow-world' }), true);
  const banks = course.features.surfacePatches.filter(item => item.snowBank);
  assert.ok(banks.length > 30 && banks.every(item => item.kind === 'deep-snow'));
  // None along Lodge Straight: that is where the pits, garages and stands are.
  const lodge = piece('Lodge Straight');
  assert.equal(banks.filter(item => item.s0 < lodge.s1 || item.s1 > road.length + lodge.s0).length, 0);
  const made = snowWorldPlacements(course), count = id => made.filter(item => item.id === id).length;
  assert.ok(count('plough-bank') > 600 && count('snow-pine') === course.features.trees.length && count('snow-rock') === course.features.rocks.length);
  assert.ok(TREMBLANT_SNOW.snowWorld.exposed.every(row => TREMBLANT_SNOW.snowWorld.ranges.some(range => row.from >= range.from && row.to <= range.to)));
});

test('the scenery is winter: no autumn trees, snow pines on the hill off the ski runs, the lodge, lift and lake', () => {
  const ids = new Set(JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json', import.meta.url), 'utf8')).pieces.map(item => item.id));
  for (const item of placements) {
    assert.ok(ids.has(item.id), `${item.id} is a kit piece`);
    assert.ok(!item.id.startsWith('autumn-'), 'no autumn tree');
    if (['start-gantry', 'chairlift-cable', 'chairlift-chair'].includes(item.id) || item.ride) continue;
    assert.ok(item.hill !== undefined || gap(item.s, item.lateral) > 2.3, `${item.id} at s ${item.s.toFixed(0)} stands ${gap(item.s, item.lateral).toFixed(1)} m from a road edge`);
  }
  const hill = TREMBLANT_SNOW.hills[0], pines = placements.filter(item => item.id === 'snow-pine');
  assert.ok(pines.length >= 100 && pines.every(item => item.hill === 0));
  for (const tree of pines) {
    assert.ok(hillReach(hill, tree.s - hill.s, tree.lateral - hill.lateral) < .9);
    assert.ok(runWeight(hill, tree.s - hill.s, tree.lateral - hill.lateral) <= .02, 'no pine on a ski run');
  }
  assert.equal(hill.pines, 0, 'the hill is planted with snow pines through the kit, not ordinary pines');
  assert.equal(placements.filter(item => item.id === 'chairlift-tower').length, 8);
  assert.equal(placements.filter(item => item.id === 'ski-lodge').length, 1);
  assert.equal(placements.filter(item => item.id === 'grandstand').every(item => item.crowd), true);
  assert.equal(TREMBLANT_SNOW.effects.lake.frozen, true);
  assert.deepEqual(TREMBLANT_SNOW.basins, TREMBLANT_WOODS.basins, 'the same bowl as the lake it replaces');
  assert.equal(TREMBLANT_SNOW.effects.mist, undefined, 'no mist on a frozen lake');
  // The snowy hills have snow over their high ground and the pines are not on the lake.
  assert.ok(TREMBLANT_SNOW.effects.backdrop.colours.snow.share > .8);
  assert.equal(TREMBLANT_SNOW.scenery.mountains, false, 'no dark rock peaks');
  const lake = TREMBLANT_SNOW.effects.lake;
  for (const tree of course.features.trees) assert.equal(Math.abs(tree.s - lake.s) < lake.along && tree.off > 8 && tree.off < lake.lateral + lake.across, false, `${tree.id} stands on the lake`);
});

test('snowmen are placement data only until P4-SNOWMEN lands: eight spots, none drawn', () => {
  assert.equal(SNOWMAN_SPOTS.length, 8);
  assert.equal(placements.some(item => item.id === 'snowman'), false, 'nothing is placed yet');
  for (const spot of SNOWMAN_SPOTS) assert.ok(gap(spot.s, spot.lateral) > 10, `a snowman at s ${spot.s} is clear of the road and the racing line`);
});

test('skiers and chimney smoke: still, seeded, on the ski runs, and off in Tremblant Woods', () => {
  const config = TREMBLANT_SNOW.effects.skiers, spots = skierSpots(course, config);
  assert.ok(spots.length >= 90, `${spots.length} skiers`);
  assert.deepEqual(skierSpots(course, config), spots, 'the same skiers on every build');
  assert.ok(spots.every(spot => [spot.x, spot.y, spot.z, spot.yaw, spot.scale].every(Number.isFinite) && spot.scale > 0));
  // The near ones stand on a run of the hill beside the road, in metres.
  const hill = TREMBLANT_SNOW.hills[0], near = spots.filter(spot => spot.scale < 1.5);
  assert.ok(near.length >= 30);
  for (const spot of near) {
    const found = course.nearest(spot.x, spot.z), lateral = found.lateral, s = found.s;
    assert.ok(runWeight(hill, s - hill.s, lateral - hill.lateral) > .3, 'a skier stands on a run');
  }
  const smoke = TREMBLANT_SNOW.effects.smoke;
  assert.ok(placements.some(item => item.id === smoke.id) && smoke.local.length === 3 && smoke.count > 5);
  assert.deepEqual(skierSpots(new Course(TREMBLANT_WOODS, 1989), {}), [], 'no skiers unless asked');
});

test('the light is a winter morning: a low pale sun, cold shadows, and Tremblant Woods keeps its autumn light', () => {
  const clear = resolveLightingSettings('alpine', { mood: 'clear' }), look = circuitLighting(clear, TREMBLANT_SNOW.light);
  const degrees = Math.atan2(look.sunOffset.y, Math.hypot(look.sunOffset.x, look.sunOffset.z)) * 180 / Math.PI;
  assert.ok(degrees > 10 && degrees < 20, `a sun ${degrees.toFixed(1)} degrees up`);
  const winter = winterLightingSettings(look);
  assert.equal(winter.sunColor, TREMBLANT_SNOW.light.winter.sunColor, 'the circuit\'s own winter sun colour');
  assert.ok(winter.sunColor >> 16 > 0xf0 && (winter.sunColor & 255) > 0xd0, 'a pale sun');
  assert.ok((winter.ground & 255) > (winter.ground >> 16 & 255) + 30, 'the fill light is blue, so shadows are cold');
  assert.ok(winter.exposure < look.exposure && winter.bloom < look.bloom, 'the shared winter dimming still applies');
  // Without the circuit's own winter look the shared one is used exactly as before.
  const plain = winterLightingSettings({ ...look, winter: undefined });
  assert.equal(plain.sunColor.length, 3);
  assert.notEqual(TREMBLANT_WOODS.light.winter, TREMBLANT_SNOW.light.winter);
});

test('the test driver completes a lap on winter tyres, and a Grand Prix brings every computer racer home', () => {
  const race = runRace('medium', 0, { course: 'tremblant-snow' });
  assert.equal(race.racers, 7);
  assert.equal(race.finished, 7, 'every computer racer finishes');
  assert.equal(race.lapTimes.length, 3);
  assert.ok(race.lapTimes.every(time => time > 80 && time < 160), `laps ${race.lapTimes.map(t => t.toFixed(1)).join(' ')}`);
});

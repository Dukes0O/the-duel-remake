import {CIRCUIT_MANIFESTS, BASE_COURSE_COUNT} from '../src/circuit-manifests.js';
import {createProfile} from '../src/progression.js';
import {courseAccessPanel} from '../src/course-access-ui.js';
import {previewCircuitFlags} from './preview-flags.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { TREMBLANT_WOODS } from '../src/circuits/tremblant-woods.js';
import { manifest as ownedManifest, TREMBLANT_SNOW, SNOWMAN_SPOTS } from '../src/circuits/tremblant-snow.js';
import { ALL_CIRCUITS } from '../src/circuits/index.js';
import { buildTrackScript } from '../src/track-script.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';
import { COURSE_PRICES, isCourseUnlocked, purchaseCourse } from '../src/course-access.js';
import { GRAND_PRIX_COURSES, grandPrixCourse } from '../src/race-field.js';
import { supportsCombat } from '../src/combat-weapons.js';
import { courseHasWinterSurfaces, gripFor, ICE_MAX_LENGTH, ICE_BOARD_DISTANCE } from '../src/race-surfaces.js';
import { snowWorldEnabled, winterLightingSettings, snowWorldPlacements, softBankGeometry } from '../src/snow-world.js';
import { circuitLighting, resolveLightingSettings } from '../src/lighting-moods.js';
import { pitAt, pitBox } from '../src/pit-lane.js';
import { skierSpots, birchSpots } from '../src/circuit-effects.js';
import { hillReach, runWeight } from '../src/circuit-hills.js';
import { runRace } from './race-field-balance.mjs';
import { App } from '../src/app.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import { KIT_FOOTPRINTS } from '../src/kit-footprints.js';

// Tremblant Snow (card P4-TREMBLANT-SNOW, docs/CIRCUITS.md 5.3): the Tremblant Woods circuit in winter.
// Tremblant Woods itself has its own suite (test-circuit-tremblant.mjs); this checks what the variant adds
// and that the live circuit was left alone.
const road = buildTrackScript(TREMBLANT_SNOW), autumn = buildTrackScript(TREMBLANT_WOODS);
const course = new Course(TREMBLANT_SNOW, 1989);
const piece = name => road.pieces.find(item => item.name === name);
const placements = TREMBLANT_SNOW.kitPlacements;
const gap = (s, lateral) => { const p = course.worldAt(s, lateral), near = course.nearest(p.x, p.z); return near.distance - course.roadHalfWidthAt(near.s); };

test('Tremblant Snow is a stable event behind its own switch, right after Tremblant Woods, priced, race-only and in the Grand Prix', () => {
  assert.equal(TREMBLANT_SNOW.id, 'tremblant-snow');
  assert.equal(TREMBLANT_SNOW.flag, 'tremblant-snow');
  assert.equal(FEATURE_STATES['tremblant-snow'], 'on', 'released (RELEASE-TREMBLANT-SNOW, Kyle approved it on 12 October 2026)');
  assert.equal(ALL_CIRCUITS.indexOf(TREMBLANT_SNOW), ALL_CIRCUITS.findIndex(circuit => circuit.id === 'tremblant-woods') + 1, 'second in release order, right after Tremblant Woods');
  assert.ok(COURSE_PRICES['tremblant-snow'] > 0);
  assert.ok(GRAND_PRIX_COURSES.includes('tremblant-snow') && grandPrixCourse(TREMBLANT_SNOW));
  assert.equal(TREMBLANT_SNOW.noCombat, true);
  assert.equal(supportsCombat(TREMBLANT_SNOW), false, 'a pure race track');
  assert.ok(Object.isFrozen(TREMBLANT_SNOW) && TREMBLANT_SNOW.laps === 3 && TREMBLANT_SNOW.closed === true);
  assert.deepEqual(Object.keys(TREMBLANT_SNOW.fieldPace), ['easy', 'medium', 'hard']);
  const bat = readFileSync(new URL('../start-preview.bat', import.meta.url), 'utf8');
  assert.ok(bat.includes('preview-flags.mjs') && previewCircuitFlags().includes('tremblant-snow'), 'the actual manifest-derived Preview includes Tremblant Snow');
  // On the course list while its switch is on, after Tremblant Woods (Harbour Lights, released later, comes after it).
  const flags = createFeatureFlags({ storage: null, qa: false });
  assert.equal(flags.enabled('tremblant-snow'), true, 'on for players with no URL flag');
  assert.equal(COURSE.findIndex(item => item.id === 'tremblant-snow'), COURSE.findIndex(item => item.id === 'tremblant-woods') + 1, 'right after Tremblant Woods');
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
  // The plough banks are continuous soft heaps, not kit pieces.
  assert.ok(TREMBLANT_SNOW.snowWorld.softBanks === true && count('plough-bank') === 0);
  assert.ok(count('snow-pine') === course.features.trees.length && count('snow-rock') === course.features.rocks.length);
  const heaps = softBankGeometry(course), position = heaps.attributes.position;
  assert.ok(position.count > 20000 && heaps.attributes.color.count === position.count);
  let highest = 0;
  for (let i = 0; i < position.count; i++) {
    const found = course.nearest(position.getX(i), position.getZ(i));
    assert.ok(Number.isFinite(position.getY(i)));
    // Beside the road, never on it; its top is a smooth heap under 1.5 m.
    assert.ok(found.distance > course.roadHalfWidthAt(found.s) - .01, 'a heap lies on the road');
    highest = Math.max(highest, position.getY(i) - course.groundAt(found.s, found.lateral).y);
  }
  assert.ok(highest > .8 && highest < 1.5, `heaps rise ${highest.toFixed(2)} m`);
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

test('the light is a winter morning: a low warm sun, cold shadows, and Tremblant Woods keeps its autumn light', () => {
  const clear = resolveLightingSettings('alpine', { mood: 'clear' }), look = circuitLighting(clear, TREMBLANT_SNOW.light);
  const degrees = Math.atan2(look.sunOffset.y, Math.hypot(look.sunOffset.x, look.sunOffset.z)) * 180 / Math.PI;
  assert.ok(degrees > 15 && degrees < 26, `a sun ${degrees.toFixed(1)} degrees up`);
  const winter = winterLightingSettings(look);
  assert.equal(winter.sunColor, TREMBLANT_SNOW.light.winter.sunColor, 'the circuit\'s own winter sun colour');
  assert.ok(winter.sunColor >> 16 > 0xf0 && (winter.sunColor >> 16) - (winter.sunColor & 255) > 40, 'a warm, low sun');
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

// ---- solid barriers (TREMBLANT-FIX: what a car can reach is a box where it is drawn) -----------

const BARRIERS = ['armco', 'tyre-wall', 'catch-fence'];
const half = s => course.roadHalfWidthAt(s);
const depthOf = item => KIT_FOOTPRINTS[item.id].depth * (Array.isArray(item.scale) ? item.scale[2] : item.scale ?? 1);

test('every barrier, post, wall, garage, stand and lift tower is a solid box where it is drawn', () => {
  const solid = placements.filter(item => item.solid), boxes = course.features.kitSolids;
  assert.equal(boxes.length, solid.length);
  assert.ok(solid.length > 250);
  const reachable = new Set(['armco', 'tyre-wall', 'catch-fence', 'pit-wall', 'pit-garage', 'grandstand', 'marshal-post', 'chairlift-tower']);
  for (const item of placements) assert.equal(item.solid === true, reachable.has(item.id), `${item.id} at s ${item.s.toFixed(0)}`);
  assert.ok(boxes.every(box => course.features.obstacles.includes(box)) && !boxes.some(box => course.features.walls.includes(box)));
  let checked = 0;
  solid.forEach((item, i) => {
    const box = boxes[i];
    if (KIT_FOOTPRINTS[item.id].depth > 1) return;
    const centre = course.nearest(box.x, box.z), heading = course.at(centre.s).heading;
    const across = Math.abs(Math.sin(box.heading) * Math.cos(heading) - Math.cos(box.heading) * Math.sin(heading));
    const extent = box.halfX * Math.abs(Math.cos(box.heading) * Math.cos(heading) + Math.sin(box.heading) * Math.sin(heading)) + box.halfZ * across;
    const face = centre.distance - extent - half(centre.s), drawn = Math.abs(item.lateral) - half(item.s) - depthOf(item) / 2;
    assert.ok(Math.abs(face - drawn) < .05, `${item.id} at s ${item.s.toFixed(0)}: box face ${face.toFixed(2)} m, drawn face ${drawn.toFixed(2)} m`);
    assert.ok(face > 1.5, `${item.id} at s ${item.s.toFixed(0)} keeps off the road`);
    checked++;
  });
  assert.ok(checked > 200);
  // The pit lane is clear: no solid box stands on it.
  const lane = course.pitLane;
  for (const box of boxes) {
    const found = course.nearest(box.x, box.z), phase = course.phase(found.s);
    if (phase < lane.entry || phase > lane.exit) continue;
    assert.ok(Math.abs(found.lateral - lane.offsetAt(phase)) > lane.width / 2 + box.halfX * .5, `a solid box stands in the pit lane at s ${phase.toFixed(0)}`);
  }
});

const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
function startDuel() {
  const app = new App();
  app._refreshPlayer(); app.seed = 1989;
  app.duel.startCampaign({ mode: 'duel', car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium', driverId: DEFAULT_DRIVER,
    startStage: COURSE.findIndex(item => item.id === 'tremblant-snow'), seed: 1989, opponentCount: 0, playerId: app.player.id, upgrades: {}, tyre: 'winter' });
  for (let frames = 0; app.duel.state.status !== 'racing' && frames < 2000; frames++) app.advance(1 / 60, 1 / 60);
  assert.equal(app.duel.state.status, 'racing');
  return app.duel;
}
function driveInto(duel, s, side, mph) {
  const state = duel.state;
  Object.assign(state, { s, lateral: side * (half(s) - 3), headingError: side * .3, speedMph: mph, airborne: false, airHeight: 0, _jumpY: null, _verticalSpeed: 0 });
  state.prevS = state.s; state.prevLateral = state.lateral;
  duel._terrainPose();
  duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
  let farthest = -Infinity;
  for (let frame = 0; frame < 240; frame++) {
    duel.step(1 / 60);
    farthest = Math.max(farthest, side * state.lateral - half(state.s));
    if (state.impactTimer > 0) break;
  }
  return farthest;
}
function faceGap(s, side) {
  const item = placements.filter(row => BARRIERS.includes(row.id) && Math.sign(row.lateral) === side).reduce((best, row) => Math.abs(row.s - s) < Math.abs(best.s - s) ? row : best);
  return { id: item.id, gap: Math.abs(item.lateral) - half(item.s) - depthOf(item) / 2 };
}
const named = (name, nth = 0) => course.script.pieces.filter(item => item.name === name)[nth];
const middle = (item, share = .5) => item.s0 + (item.s1 - item.s0) * share;
const fenceSide = (s0, s1) => Math.sign(placements.find(item => item.id === 'catch-fence' && item.s > s0 && item.s < s1).lateral);
const CASES = [
  ['Beaver Hairpin, tyre wall', middle(named('Beaver Hairpin'), .4), -named('Beaver Hairpin').dir],
  ['Ridge Corner, tyre wall', middle(named('Ridge Corner')), -named('Ridge Corner').dir],
  ['Pine Drop, armco', middle(named('Pine Drop')), -named('Pine Drop').dir],
  ['Lodge Bend, armco', middle(named('Lodge Bend')), -named('Lodge Bend').dir],
  ['Final Turn, armco', middle(named('Final Turn')), -named('Final Turn').dir],
  ['The Spur, catch fence', 1770, fenceSide(1700, 1809)],
  ['Timber Straight, catch fence', named('Timber Straight').s0 + 60, fenceSide(named('Timber Straight').s0, named('Timber Straight').s0 + 140)],
];
for (const mph of [70, 110]) {
  test(`a car on winter tyres driven at the barriers at ${mph} mph stops against them`, () => {
    const before = [...COURSE], appendedIndex = COURSE.length;
    COURSE.push(TREMBLANT_SNOW);
    try {
      for (const [name, s, side] of CASES) {
        const { gap, id } = faceGap(s, side), farthest = driveInto(startDuel(), s, side, mph);
        assert.ok(farthest > 0, `${name}: the car did reach the edge`);
        assert.ok(farthest <= gap - .5, `${name}: the car got ${farthest.toFixed(1)} m past the road edge; the ${id} face stands ${gap.toFixed(1)} m out`);
      }
    } finally {
      assert.equal(COURSE[appendedIndex], TREMBLANT_SNOW, 'cleanup removes only this fixture entry');
      COURSE.splice(appendedIndex, 1);
      assert.deepEqual(COURSE, before, 'barrier fixture restores the exact original course roster');
    }
  });
}

// ---- the forest: groves, clearings, mixed sizes, a few birches --------------------------------

test('the pines grow in groves of every size with bare clearings, deep into the wood, and a few birches stand among them', () => {
  const trees = course.features.trees.filter(item => item.id.startsWith('forest-'));
  assert.ok(trees.length > 1800, `${trees.length} forest pines`);
  const scales = trees.map(item => item.scale), mean = scales.reduce((a, b) => a + b, 0) / scales.length;
  const spread = Math.sqrt(scales.reduce((a, b) => a + (b - mean) ** 2, 0) / scales.length);
  assert.ok(Math.min(...scales) < .6 && Math.max(...scales) > 1.9 && spread > .35, `sizes ${Math.min(...scales).toFixed(2)} to ${Math.max(...scales).toFixed(2)}, spread ${spread.toFixed(2)}`);
  // Depth: pines stand from 13 m out to well past 40 m beyond the road edge.
  const edge = item => { const found = course.nearest(item.x, item.z); return found.distance - course.roadHalfWidthAt(found.s); };
  assert.ok(trees.filter(item => edge(item) > 40).length > 100, 'the wood goes back in depth');
  // Clearings: stretches of 100 m of one side with almost no pine in the first 35 m of the wood.
  let clearings = 0;
  for (const side of [-1, 1]) for (let s = 400; s < course.length - 400; s += 100) {
    const near = trees.filter(item => Math.sign(item.off) === side && item.s >= s && item.s < s + 100 && edge(item) < 35).length;
    if (near < 6) clearings++;
  }
  assert.ok(clearings >= 4, `${clearings} bare clearings`);
  const birches = birchSpots(course, TREMBLANT_SNOW.effects.birches);
  assert.ok(birches.length >= 30 && birches.length <= 90, `${birches.length} birches`);
  assert.deepEqual(birchSpots(course, TREMBLANT_SNOW.effects.birches), birches, 'the same birches every build');
  for (const birch of birches) {
    assert.ok(course.nearest(birch.x, birch.z).distance - 7 > 11, 'a birch is off the road');
    assert.ok(course.features.trees.every(item => Math.hypot(item.x - birch.x, item.z - birch.z) > 2), 'a birch is clear of every pine');
  }
  // Tremblant Woods keeps its even forest: no scale range, no groves.
  assert.equal(TREMBLANT_WOODS.scenery.forest.clumps, undefined);
});

test('the far hills carry dark rock and dark forest patches over their snow', () => {
  const colours = TREMBLANT_SNOW.effects.backdrop.colours;
  assert.ok(colours.patches.length >= 2 && colours.snow.share < .95);
});

// Independent accepted metadata belongs to this course, so another course can join without a shared edit.
test('tremblant-snow retains its accepted registry identity and access', () => {
  const id = 'tremblant-snow', definition = TREMBLANT_SNOW;
  assert.deepEqual([definition.id, definition.flag, definition.stage], [id, id, 19]);
  assert.deepEqual([ownedManifest.id, ownedManifest.flag, ownedManifest.state, ownedManifest.price, ownedManifest.grandPrix, ownedManifest.releaseOrder],
    [id, id, 'on', 1800, true, 1]);
  assert.equal(FEATURE_STATES[id], 'on');
  assert.equal(COURSE_PRICES[id], 1800);
  assert.equal(GRAND_PRIX_COURSES.includes(id), true);
  assert.equal(createFeatureFlags({storage:null, qa:false}).enabled(id), true);
  assert.equal(supportsCombat(definition), false);
  assert.equal(definition.noCombat, true); assert.equal(definition.hasRival, true);
  const enabled = CIRCUIT_MANIFESTS.filter(row => row.state === 'on' && row.slot === undefined);
  const publicIndex = COURSE.findIndex(row => row.id === id);
  assert.equal(publicIndex, BASE_COURSE_COUNT + enabled.findIndex(row => row.id === id));
  const fresh = createProfile();
  assert.equal(isCourseUnlocked(fresh, id), false);
  const poor = purchaseCourse({...fresh, credits:1799}, id);
  assert.equal(poor.ok, false); assert.equal(poor.profile.credits, 1799);
  const rich = {...fresh, credits:2500}, bought = purchaseCourse(rich, id);
  assert.equal(bought.ok, true); assert.equal(bought.cost, 1800); assert.equal(bought.profile.credits, 700);
  assert.deepEqual(bought.profile.courses.unlocked, [...rich.courses.unlocked, id].filter(value => COURSE.some(row => row.id === value)));
  assert.equal(isCourseUnlocked(bought.profile, id), true); assert.equal(isCourseUnlocked(bought.profile, 'pacific-canyon'), true);
  for (const other of CIRCUIT_MANIFESTS.filter(row => row.id !== id)) assert.equal(isCourseUnlocked(bought.profile, other.id), false, 'buying this course never grants another paid course');
  const unowned = courseAccessPanel(fresh, 0, ''), owned = courseAccessPanel(bought.profile, publicIndex, '');
  assert.match(unowned, /Tremblant Snow/); assert.match(unowned, /1,?800 CR/);
  assert.doesNotMatch(unowned, /UNLOCKED<\/span><h3>Tremblant Snow/);
  assert.match(owned, /UNLOCKED<\/span><h3>Tremblant Snow/);
});

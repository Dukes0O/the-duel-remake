import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { App } from '../src/app.js';
import { Course } from '../src/course.js';
import { COURSE, DRIVE } from '../src/config.js';
import { FEATURE_STATES, createFeatureFlags } from '../src/feature-flags.js';
import { Duel } from '../src/game.js';
import { GhostRecorder, loadGhosts } from '../src/ghost.js';
import { loadLeaderboard } from '../src/leaderboard.js';
import {limitClimb, offroadCapability} from '../src/offroad-physics.js';
import { activePlayer, loadPlayers } from '../src/progression.js';
import {createResultsScreen} from '../src/screen-results.js';

let muddyHollow = {};
try {
  muddyHollow = await import('../src/muddy-hollow.js');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

const seed = 1989;
const highCountry = COURSE.find(course => course.id === 'high-country');
const pacificCanyon = COURSE.find(course => course.id === 'pacific-canyon');
const highCountryIndex = COURSE.indexOf(highCountry);
const fixedStep = 1 / 120;
const appMemory = new Map();
globalThis.localStorage = {
  getItem: key => appMemory.get(key) ?? null,
  setItem: (key, value) => appMemory.set(key, String(value)),
  removeItem: key => appMemory.delete(key),
};
globalThis.cancelAnimationFrame = () => {};
let checks = 0;
const failures = [];

function check(name, run) {
  checks++;
  try {
    run();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function api(name) {
  assert.equal(typeof muddyHollow[name], 'function', `${name} exists`);
  return muddyHollow[name];
}

function courseFor(definition = highCountry, enabled = true) {
  return new Course(definition, seed, { muddyHollow: enabled });
}

function zoneFor(course) {
  assert.ok(course.muddyHollow,
    'enabled High Country must expose its authored muddyHollow zone');
  return course.muddyHollow;
}

function pointFor(feature, label) {
  const point = feature?.center ?? feature?.point ?? feature;
  assert.ok(Number.isFinite(point?.x) && Number.isFinite(point?.z),
    `${label} exposes a finite world-space centre`);
  return point;
}

function spanFor(feature) {
  if (Number.isFinite(feature?.span)) return feature.span;
  if (Number.isFinite(feature?.diameter)) return feature.diameter;
  if (Number.isFinite(feature?.radius)) return feature.radius * 2;
  if (Number.isFinite(feature?.halfWidth)) return feature.halfWidth * 2;
  const bounds = feature?.bounds;
  if (bounds && [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ].every(Number.isFinite)) {
    return Math.min(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  }
  return NaN;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function ordinaryFingerprint(course) {
  return hash({
    samples: course.samples,
    sections: course.sections,
    features: course.features,
  });
}

function localPoint(zone, along, lateral) {
  const {origin, heading} = zone.frame;
  return {
    x: origin.x + Math.sin(heading) * along + Math.cos(heading) * lateral,
    z: origin.z + Math.cos(heading) * along - Math.sin(heading) * lateral,
  };
}

function toLocal(zone, point) {
  const dx = point.x - zone.frame.origin.x;
  const dz = point.z - zone.frame.origin.z;
  return {
    along: dx * Math.sin(zone.frame.heading) + dz * Math.cos(zone.frame.heading),
    lateral: dx * Math.cos(zone.frame.heading) - dz * Math.sin(zone.frame.heading),
  };
}

function fallbackDepartureBoundary(zone) {
  const ridge = zone.landforms.ridge;
  const ridgeLocal = toLocal(zone, pointFor(ridge, 'ridge'));
  return {
    alongMin: ridgeLocal.along - ridge.alongRadius * .6,
    alongMax: ridgeLocal.along + ridge.alongRadius * .6,
    lateral: ridgeLocal.lateral + ridge.lateralRadius + 2,
  };
}

function departureBoundary(zone, required = false) {
  const boundary = zone.departureBoundary ?? fallbackDepartureBoundary(zone);
  if (required) assert.ok(zone.departureBoundary,
    'Muddy Hollow exposes its deterministic local-frame departureBoundary');
  for (const key of ['alongMin', 'alongMax', 'lateral']) assert.ok(
    Number.isFinite(boundary[key]), `departure boundary ${key} is finite`);
  assert.ok(boundary.alongMin < boundary.alongMax,
    'departure boundary has a non-empty ridge crossing span');
  return boundary;
}

function phaseThreeDuel({car = 'titan_monster', enabled = true,
  discovered = true, difficulty = 'casual'} = {}) {
  const duel = new Duel({seed, featureFlags: {
    'muddy-hollow': enabled,
    'titan-climb': true,
  }});
  duel.startCampaign({car, startStage: highCountryIndex, discoveredGate: discovered,
    opponentCount: 0, mode: 'timetrial', difficulty});
  Object.assign(duel.state, {status: 'racing', countdown: 0, traffic: [],
    opponents: [], impactTimer: 0, headingError: 0, yawVelocity: 0,
    pushVelocity: 0, slipAngle: 0, offRoadTime: 0, roughness: 0});
  return duel;
}

function crossedPose(duel, zone, boundary, {road = false, airborne = false,
  onFoot = false} = {}) {
  const along = (boundary.alongMin + boundary.alongMax) / 2;
  const beforePoint = localPoint(zone, along, road ? 0 : boundary.lateral - .5);
  const afterPoint = localPoint(zone, along, road ? 0 : boundary.lateral + .5);
  const before = duel.course.nearest(beforePoint.x, beforePoint.z, zone.frame.s);
  const after = duel.course.nearest(afterPoint.x, afterPoint.z, zone.frame.s);
  const ground = duel.course.groundAt(after.s, after.lateral);
  Object.assign(duel.state, {
    prevS: before.s,
    prevLateral: before.lateral,
    s: after.s,
    lateral: after.lateral,
    speedMph: 35,
    gear: 1,
    headingError: Math.atan2(Math.sin(zone.frame.heading + Math.PI / 2 -
      duel.course.at(after.s).heading), Math.cos(zone.frame.heading + Math.PI / 2 -
      duel.course.at(after.s).heading)),
    yawVelocity: 0,
    pushVelocity: 0,
    slipAngle: 0,
    groundHeight: ground.y,
    prevGroundHeight: ground.y,
    onFoot,
    airborne,
    airHeight: airborne ? 5 : 0,
    prevAirHeight: airborne ? 5 : 0,
    _jumpY: airborne ? ground.y + 5 : null,
    _verticalSpeed: 0,
  });
  return {before, after};
}

function crossingFixture(options = {}) {
  const duel = phaseThreeDuel(options);
  const reference = zoneFor(phaseThreeDuel().course);
  const boundary = departureBoundary(reference);
  crossedPose(duel, reference, boundary, options);
  const events = [];
  duel.onChange((_, event) => events.push(event));
  return {duel, reference, boundary, events};
}

function phaseThreeEvent(events) {
  return events.filter(event => event.muddyHollowDeparted)
    .map(event => event.muddyHollowDeparted);
}

function offsetFeature(zone, feature, alongScale = 0, lateralScale = 0) {
  const center = pointFor(feature, feature?.name || feature?.id || 'feature');
  const heading = zone.frame.heading;
  const along = (feature.alongRadius || 0) * alongScale;
  const lateral = (feature.lateralRadius || 0) * lateralScale;
  return {
    x: center.x + Math.sin(heading) * along + Math.cos(heading) * lateral,
    z: center.z + Math.cos(heading) * along - Math.sin(heading) * lateral,
  };
}

function queryPoint(course, point) {
  const pose = course.nearest(point.x, point.z, course.muddyHollow?.frame.s);
  return { pose, surface: course.surfaceAt(pose.s, pose.lateral) };
}

function titanDuel(enabled = true) {
  const duel = new Duel({seed, featureFlags: {
    'muddy-hollow': enabled,
    'titan-climb': true,
  }});
  duel.startCampaign({car: 'titan_monster', startStage: COURSE.indexOf(highCountry),
    discoveredGate: true, opponentCount: 0});
  Object.assign(duel.state, {status: 'racing', countdown: 0, traffic: [],
    opponents: [], impactTimer: 0, headingError: 0, yawVelocity: 0,
    pushVelocity: 0, slipAngle: 0, offRoadTime: 0, roughness: 0});
  return duel;
}

function placeAt(duel, point, speedMph = 40) {
  const pose = duel.course.nearest(point.x, point.z,
    duel.course.muddyHollow?.frame.s);
  Object.assign(duel.state, {s: pose.s, prevS: pose.s,
    lateral: pose.lateral, prevLateral: pose.lateral, speedMph,
    gear: speedMph < 0 ? -1 : 1, headingError: 0, yawVelocity: 0,
    pushVelocity: 0, slipAngle: 0, tumble: null, airborne: false,
    airHeight: 0, _jumpY: null, _verticalSpeed: 0});
  return pose;
}

function controlledTitan({mud = 0, waterDepth = 0, speedMph = 40,
  throttle = 0, steer = 0, steps = 1} = {}) {
  const duel = titanDuel();
  const zone = zoneFor(duel.course);
  placeAt(duel, localPoint(zone, 0, 205), speedMph);
  const surfaceAt = duel.course.surfaceAt.bind(duel.course);
  duel.course.surfaceAt = (s, lateral) => ({...surfaceAt(s, lateral),
    road: false, mainRoad: false, mud, waterDepth});
  duel.setInput({throttle, brake: 0, steer, boost: false});
  for (let tick = 0; tick < steps; tick++) duel._drive(1 / 120);
  return duel.state;
}

function surfaceSpeedLoss({waterDepth, speedMph}) {
  const dry = controlledTitan({waterDepth: 0, speedMph});
  const wet = controlledTitan({waterDepth, speedMph});
  return Math.abs(dry.speedMph) - Math.abs(wet.speedMph);
}

function savedAppBank(app) {
  return structuredClone({
    credits: app.profile.credits,
    personalBests: app.profile.personalBests,
    unlockedCars: app.profile.unlockedCars,
    upgrades: app.profile.upgrades,
    courses: app.profile.courses,
    milestones: app.profile.milestones,
    wasteland: app.profile.wasteland,
    leaderboard: app.leaderboard,
    ghosts: app.ghosts,
  });
}

function stableSavedContent(value) {
  const copy = structuredClone(value);
  for (const record of copy.ghosts?.records ?? []) delete record.lastUsedAt;
  return copy;
}

function seedRecordAndGhost(app) {
  app.startCampaign({startStage: 0, mode: 'timetrial', seed,
    car: 'falcone_f42', difficulty: 'casual'});
  app.advance(3.1);
  const state = app.duel.state;
  Object.assign(state, {traffic: [], opponents: [], rival: null});
  const context = {
    playerId: app.player.id,
    stageIndex: 0,
    seed: state.seed,
    laps: state.lapsTotal,
    car: state.car,
    mode: state.mode,
    difficulty: state.difficulty,
    cpuDifficulty: state.cpuDifficulty,
    driverId: state.driverId,
    upgrades: {...state.upgrades},
  };
  const recorder = new GhostRecorder(context);
  for (let index = 0; index <= 900; index++) recorder.observe({...state,
    status: 'racing', stageTimeSec: index / 5,
    s: app.duel.raceLength * index / 900, lateral: 0, speedMph: 80});
  app.ghostRecorder = recorder;
  Object.assign(state, {status: 'racing', stageTimeSec: 180,
    s: app.duel.raceLength, lateral: 0, completedLaps: state.lapsTotal,
    lap: state.lapsTotal, currentLap: state.lapsTotal,
    lapTimes: [90, 90], racePenaltySec: 0});
  app.duel._finishStage();
  assert.ok(app.leaderboard.entries.length > 0,
    'App fixture has a valid saved record');
  assert.ok(app.ghosts.records.length > 0,
    'App fixture has a valid saved ghost');
  app.returnToMenu();
}

function makeMuddyApp() {
  appMemory.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {
    'muddy-hollow': true,
    'titan-climb': true,
  }});
  app.profile = {
    ...app.profile,
    credits: 2400,
    unlockedCars: [...new Set([...app.profile.unlockedCars, 'titan_monster'])],
    courses: {version: 1, unlocked: [...new Set([
      ...(app.profile.courses?.unlocked ?? []), highCountry.id,
    ])]},
    wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true},
  };
  app._saveProfile();
  seedRecordAndGhost(app);
  assert.equal(app.startCampaign({startStage: highCountryIndex, mode: 'timetrial',
    seed, car: 'titan_monster', difficulty: 'casual', opponentCount: 0}), true);
  app.advance(3.1);
  Object.assign(app.duel.state, {traffic: [], opponents: [], rival: null});
  assert.ok(app.profile.activeRace, 'App fixture marks the active race');
  app.profile = {...app.profile, activeRace: {...app.profile.activeRace,
    pendingPoliceFineCount: 2, pendingPoliceFines: 1}};
  app._saveProfile();
  app._refreshPlayer();
  assert.ok(app.profile.activeRace.pendingPoliceFines > 0,
    'App fixture has pending race fines');
  app.duel.state.police.pendingFines = app.profile.activeRace.pendingPoliceFines;
  assert.ok(app.ghostRecorder, 'current time trial has an unfinished ghost recorder');
  return app;
}

function departMuddyApp(app) {
  const zone = zoneFor(app.duel.course);
  const boundary = departureBoundary(zone);
  crossedPose(app.duel, zone, boundary);
  const events = [];
  const unsubscribe = app.duel.onChange((_, event) => {
    if (event.muddyHollowDeparted) events.push(event.muddyHollowDeparted);
  });
  app.advance(fixedStep, fixedStep);
  unsubscribe();
  assert.equal(app.duel.state.status, 'exploring',
    'real App ridge crossing enters exploration');
  assert.equal(events.length, 1, 'real App ridge crossing emits departure once');
  return events[0];
}

check('muddy-hollow is a QA-only dev switch', () => {
  assert.equal(FEATURE_STATES['muddy-hollow'], 'dev',
    'muddy-hollow starts in dev');
  assert.equal(createFeatureFlags({ storage: null, qa: false,
    search: '?flags=muddy-hollow' }).enabled('muddy-hollow'), false,
  'production cannot enable a dev switch');
  assert.equal(createFeatureFlags({ storage: null, qa: true }).enabled('muddy-hollow'), false,
    'QA does not enable the Hollow unless it is requested');
  assert.equal(createFeatureFlags({ storage: null, qa: true,
    search: '?flags=muddy-hollow' }).enabled('muddy-hollow'), true,
  'an explicit QA request enables the Hollow');
});

check('installer affects High Country only', () => {
  const installMuddyHollow = api('installMuddyHollow');
  const high = courseFor(highCountry, false);
  installMuddyHollow(high);
  zoneFor(high);

  const other = courseFor(pacificCanyon, false);
  const before = ordinaryFingerprint(other);
  installMuddyHollow(other);
  assert.equal(other.muddyHollow, undefined,
    'installMuddyHollow ignores every course except high-country');
  assert.equal(ordinaryFingerprint(other), before,
    'an ignored install does not mutate another course');
});

check('course construction gates the zone explicitly', () => {
  assert.equal(courseFor(highCountry, false).muddyHollow, undefined,
    'flag-off High Country has no Hollow');
  zoneFor(courseFor(highCountry, true));
  assert.equal(courseFor(pacificCanyon, true).muddyHollow, undefined,
    'the enabled option cannot install the zone on another course');
});

check('race construction requires both discovery and the dev switch', () => {
  const options = {seed, car: 'titan_monster', startStage: COURSE.indexOf(highCountry)};
  const undiscovered = new Duel({seed, featureFlags: {'muddy-hollow': true}});
  undiscovered.startCampaign({...options, discoveredGate: false});
  assert.equal(undiscovered.course.muddyHollow, undefined,
    'an undiscovered player cannot load the Hollow');

  const disabled = new Duel({seed, featureFlags: {'muddy-hollow': false}});
  disabled.startCampaign({...options, discoveredGate: true});
  assert.equal(disabled.course.muddyHollow, undefined,
    'discovery cannot bypass the development switch');

  const discovered = new Duel({seed, featureFlags: {'muddy-hollow': true}});
  discovered.startCampaign({...options, discoveredGate: true});
  zoneFor(discovered.course);
});

check('zone exposes every phase-one authored landform', () => {
  const course = courseFor();
  const zone = zoneFor(course);
  const landforms = zone.landforms;
  assert.ok(landforms && typeof landforms === 'object',
    'the zone exposes authored landforms for later physics and rendering');
  assert.ok(landforms.ridge, 'the Alpine Summit ridge exists');
  assert.ok(landforms.valleyBowl, 'the Hollow valley bowl exists');
  assert.ok(landforms.hill, 'King of the Hill terrain exists');
  assert.equal(landforms.pits?.length, 3, 'the zone has exactly three mud-pit beds');
  assert.ok(landforms.pondBed, 'the shallow pond bed exists');
  assert.ok(Array.isArray(landforms.ramps) && landforms.ramps.length > 0,
    'the zone includes authored ramp terrain');

  const ridge = pointFor(landforms.ridge, 'ridge');
  const alpine = course.nearest(ridge.x, ridge.z, course.length / 2);
  assert.equal(course.sectionAt(alpine.s).name, 'Alpine Summit',
    'the hidden ridge belongs to the Alpine Summit section');
  const valleySpan = spanFor(landforms.valleyBowl);
  assert.ok(valleySpan >= 240 && valleySpan <= 360,
    `the Hollow valley is about 300 metres across (got ${valleySpan})`);
});

check('containment and height queries cover the authored geometry', () => {
  const zone = zoneFor(courseFor());
  assert.equal(typeof zone.contains, 'function', 'zone exposes contains(x, z)');
  assert.equal(typeof zone.heightAt, 'function', 'zone exposes heightAt(x, z)');

  const landforms = zone.landforms;
  const named = [
    ['ridge', landforms.ridge],
    ['valley bowl', landforms.valleyBowl],
    ['hill', landforms.hill],
    ['pond bed', landforms.pondBed],
    ...landforms.pits.map((pit, index) => [`mud pit ${index + 1}`, pit]),
    ...landforms.ramps.map((ramp, index) => [`ramp ${index + 1}`, ramp]),
  ];
  const heights = new Map();
  for (const [label, feature] of named) {
    const point = pointFor(feature, label);
    assert.equal(zone.contains(point.x, point.z), true,
      `${label} lies inside Muddy Hollow`);
    const height = zone.heightAt(point.x, point.z);
    assert.ok(Number.isFinite(height), `${label} has a finite authored height`);
    heights.set(label, height);
  }
  assert.ok(heights.get('ridge') > heights.get('valley bowl'),
    'the ridge rises above the valley bowl');
  assert.ok(heights.get('hill') > heights.get('valley bowl'),
    'King of the Hill rises above the valley bowl');
  assert.ok(landforms.pits.every((_, index) =>
    heights.get(`mud pit ${index + 1}`) < heights.get('valley bowl')),
  'all three pit beds sit below the valley floor');
  assert.ok(heights.get('pond bed') < heights.get('valley bowl'),
    'the pond bed sits below the valley floor');
  assert.equal(zone.contains(1_000_000, 1_000_000), false,
    'containment is bounded to the hidden valley');
});

check('zone geometry is deterministic for the same course seed', () => {
  const first = zoneFor(courseFor());
  const second = zoneFor(courseFor());
  assert.equal(hash(first.landforms), hash(second.landforms),
    'authored landform data repeats exactly');

  const points = [first.landforms.ridge, first.landforms.valleyBowl,
    first.landforms.hill, first.landforms.pondBed,
    ...first.landforms.pits, ...first.landforms.ramps]
    .map((feature, index) => pointFor(feature, `landform ${index + 1}`));
  assert.deepEqual(
    points.map(point => first.heightAt(point.x, point.z)),
    points.map(point => second.heightAt(point.x, point.z)),
    'height queries repeat exactly',
  );
  assert.deepEqual(
    points.map(point => first.contains(point.x, point.z)),
    points.map(point => second.contains(point.x, point.z)),
    'containment queries repeat exactly',
  );
});

check('groundAt applies the authored zone and joins the old terrain across all routes', () => {
  for (const routeSeed of [1989, 42, 17]) {
    const ordinary = new Course(highCountry, routeSeed, {muddyHollow: false});
    const course = new Course(highCountry, routeSeed, {muddyHollow: true});
    const zone = zoneFor(course);
    const named = [zone.landforms.ridge, zone.landforms.valleyBowl,
      zone.landforms.hill, zone.landforms.pondBed,
      ...zone.landforms.pits, ...zone.landforms.ramps];
    for (const [index, feature] of named.entries()) {
      const point = pointFor(feature, `route ${routeSeed} landform ${index + 1}`);
      const nearest = course.nearest(point.x, point.z, zone.frame.s);
      assert.ok(Math.abs(course.groundAt(nearest.s, nearest.lateral).y -
        zone.heightAt(point.x, point.z)) < 1e-6,
      `route ${routeSeed} groundAt uses authored landform ${index + 1}`);
    }
    for (const s of [0, 1200, 2200, 2400, 2600, 3600])
      assert.equal(course.groundAt(s, 0).y, ordinary.groundAt(s, 0).y,
        `route ${routeSeed} road height stays exact at ${s} m`);

    const edge = zone.bounds.lateralCenter + zone.bounds.lateralRadius;
    const samples = [0.995, 0.999, 1, 1.001, 1.005].map(scale => {
      const point = localPoint(zone, 0, zone.bounds.lateralCenter +
        zone.bounds.lateralRadius * scale);
      const enabledNear = course.nearest(point.x, point.z, zone.frame.s);
      const ordinaryNear = ordinary.nearest(point.x, point.z, zone.frame.s);
      return course.groundAt(enabledNear.s, enabledNear.lateral).y -
        ordinary.groundAt(ordinaryNear.s, ordinaryNear.lateral).y;
    });
    assert.ok(Math.max(...samples.map(Math.abs)) < .01,
      `route ${routeSeed} zone edge joins within 1 cm: ${samples.join(', ')}`);
    const boundary = localPoint(zone, 0, edge);
    assert.equal(zone.contains(boundary.x, boundary.z), true,
      `route ${routeSeed} exact ellipse edge is contained`);
  }
});

check('the intended ridge entry stays below the switched Titan grade limit', () => {
  const capability = offroadCapability({kind: 'monster'}, {titanClimb: true});
  for (const routeSeed of [1989, 42, 17]) {
    const course = new Course(highCountry, routeSeed, {muddyHollow: true});
    let maximum = 0;
    for (let lateral = 8; lateral < 112; lateral += .5) {
      const from = course.groundAt(2400, lateral);
      const to = course.groundAt(2400, lateral + .5);
      const gain = to.y - from.y;
      const distance = Math.hypot(to.x - from.x, to.z - from.z);
      const result = limitClimb({gain, distance, dt: 1 / 120, capability});
      maximum = Math.max(maximum, result.grade);
      assert.equal(result.tipped, false,
        `route ${routeSeed} Titan entry stays climbable at lateral ${lateral + .5} m`);
    }
    assert.ok(maximum <= capability.maxGrade,
      `route ${routeSeed} maximum entry grade ${maximum} stays within ${capability.maxGrade}`);
  }
});

check('flag-on discovered road driving matches flag-off at 30, 60 and 144 FPS', () => {
  function run(fps, enabled) {
    const duel = new Duel({seed, featureFlags: {'muddy-hollow': enabled}});
    duel.startCampaign({car: 'titan_monster', startStage: COURSE.indexOf(highCountry),
      discoveredGate: true, opponentCount: 0});
    Object.assign(duel.state, {status: 'racing', countdown: 0, s: 2200, prevS: 2200,
      lateral: 0, prevLateral: 0, speedMph: 55, traffic: [], opponents: [], rival: null});
    duel.setInput({throttle: .35, brake: 0, steer: 0, boost: false});
    const samples = [];
    for (let frame = 0; frame < fps * 3; frame++) {
      duel.step(1 / fps);
      if ((frame + 1) % fps === 0) samples.push({s: duel.state.s,
        lateral: duel.state.lateral, speedMph: duel.state.speedMph,
        groundHeight: duel.state.groundHeight, status: duel.state.status});
    }
    return samples;
  }
  for (const fps of [30, 60, 144]) assert.deepEqual(run(fps, true), run(fps, false),
    `${fps} FPS road-driving control is unchanged by the enabled Hollow`);
});

check('all three pit centres and the pond expose their authored surface fields', () => {
  const course = courseFor();
  const zone = zoneFor(course);
  for (const [index, pit] of zone.landforms.pits.entries()) {
    const {surface} = queryPoint(course, pointFor(pit, `mud pit ${index + 1}`));
    assert.equal(surface.road, false, `mud pit ${index + 1} is off road`);
    assert.ok(Number.isFinite(surface.mud) && surface.mud >= .95 && surface.mud <= 1,
      `mud pit ${index + 1} centre has full clamped mud (got ${surface.mud})`);
    assert.equal(surface.waterDepth, 0,
      `mud pit ${index + 1} does not report pond water`);
  }
  const pond = queryPoint(course, pointFor(zone.landforms.pondBed, 'pond bed')).surface;
  assert.equal(pond.road, false, 'the pond is off road');
  assert.equal(pond.mud, 0, 'the pond does not report pit mud');
  assert.ok(Number.isFinite(pond.waterDepth) && pond.waterDepth >= .95 &&
    pond.waterDepth <= 1,
  `pond centre reaches its one-metre clamped depth (got ${pond.waterDepth})`);
});

check('surface fields have smooth deterministic falloffs and consume no RNG', () => {
  const queried = courseFor();
  const untouched = courseFor();
  const zone = zoneFor(queried);
  const features = [
    ...zone.landforms.pits.map(feature => ({feature, field: 'mud'})),
    {feature: zone.landforms.pondBed, field: 'waterDepth'},
  ];
  const first = [];
  for (const {feature, field} of features) {
    const values = [0, .5, 1].map(scale =>
      queryPoint(queried, offsetFeature(zone, feature, scale, 0)).surface[field]);
    assert.ok(values.every(value => Number.isFinite(value) && value >= 0 && value <= 1),
      `${feature.id} ${field} stays in the 0..1 range`);
    assert.ok(values[0] > values[1] && values[1] > values[2],
      `${feature.id} ${field} falls smoothly from centre to edge: ${values.join(', ')}`);
    assert.ok(values[2] <= 1e-6,
      `${feature.id} ${field} reaches zero at its authored edge`);
    first.push(values);
  }
  const repeated = features.map(({feature, field}) => [0, .5, 1].map(scale =>
    queryPoint(queried, offsetFeature(zone, feature, scale, 0)).surface[field]));
  assert.deepEqual(repeated, first, 'repeated surface queries are exact');
  assert.deepEqual(
    Array.from({length: 16}, () => queried.rng.float()),
    Array.from({length: 16}, () => untouched.rng.float()),
    'surface queries consume no course random values',
  );
});

check('road, outside-zone and flag-off surface results stay exact', () => {
  const enabled = courseFor(highCountry, true);
  const disabled = courseFor(highCountry, false);
  const zone = zoneFor(enabled);
  for (const [label, pose] of [
    ['road', {s: zone.frame.s, lateral: 0}],
    ['outside', {s: zone.frame.s,
      lateral: zone.bounds.lateralCenter + zone.bounds.lateralRadius + 20}],
  ]) assert.deepEqual(enabled.surfaceAt(pose.s, pose.lateral),
    disabled.surfaceAt(pose.s, pose.lateral),
  `${label} surface keeps the complete flag-off result`);

  for (const feature of [...zone.landforms.pits, zone.landforms.pondBed]) {
    const {pose} = queryPoint(enabled, pointFor(feature, feature.id));
    assert.deepEqual(disabled.surfaceAt(pose.s, pose.lateral),
      new Course(highCountry, seed, {muddyHollow: false}).surfaceAt(pose.s, pose.lateral),
    `flag-off ${feature.id} keeps the ordinary surface shape`);
    assert.equal(Object.hasOwn(disabled.surfaceAt(pose.s, pose.lateral), 'mud'), false,
      `flag-off ${feature.id} does not expose mud`);
    assert.equal(Object.hasOwn(disabled.surfaceAt(pose.s, pose.lateral), 'waterDepth'), false,
      `flag-off ${feature.id} does not expose water depth`);
  }
});

check('the real Titan loses steering authority and speed in full mud', () => {
  const drySurface = controlledTitan({mud: 0, speedMph: 45, throttle: 1,
    steer: 1, steps: 1});
  const mudSurface = controlledTitan({mud: 1, speedMph: 45, throttle: 1,
    steer: 1, steps: 1});
  assert.ok(Math.abs(mudSurface.yawVelocity) < Math.abs(drySurface.yawVelocity),
    `full mud lowers Titan steering authority (${mudSurface.yawVelocity} vs ${drySurface.yawVelocity})`);

  const dryRun = controlledTitan({mud: 0, speedMph: 45, throttle: 1,
    steer: .7, steps: 120});
  const mudRun = controlledTitan({mud: 1, speedMph: 45, throttle: 1,
    steer: .7, steps: 120});
  assert.ok(mudRun.speedMph < dryRun.speedMph,
    `full mud removes more Titan speed (${mudRun.speedMph} vs ${dryRun.speedMph})`);
});

check('mud drag works at low, high and reverse speeds and wheel spin is derived from driving', () => {
  for (const speedMph of [12, 45, -12]) {
    const dry = controlledTitan({mud: 0, speedMph});
    const muddy = controlledTitan({mud: 1, speedMph});
    assert.ok(Math.abs(muddy.speedMph) < Math.abs(dry.speedMph),
      `mud adds drag at ${speedMph} mph (${muddy.speedMph} vs ${dry.speedMph})`);
  }
  const dry = controlledTitan({mud: 0, speedMph: 25, throttle: 1});
  const released = controlledTitan({mud: 1, speedMph: 25, throttle: 0});
  const half = controlledTitan({mud: 1, speedMph: 25, throttle: .5});
  const full = controlledTitan({mud: 1, speedMph: 25, throttle: 1});
  const slow = controlledTitan({mud: 1, speedMph: 5, throttle: 1});
  assert.equal(dry.mudWheelSpin, 0, 'dry Hollow grass has no mud wheel spin');
  assert.equal(released.mudWheelSpin, 0, 'released throttle has no mud wheel spin');
  assert.ok(Number.isFinite(full.mudWheelSpin) && full.mudWheelSpin > 0 &&
    full.mudWheelSpin <= 1,
  `throttled full mud exposes clamped wheel spin (got ${full.mudWheelSpin})`);
  assert.ok(half.mudWheelSpin > 0 && half.mudWheelSpin < full.mudWheelSpin,
    `wheel spin rises with throttle (${half.mudWheelSpin} vs ${full.mudWheelSpin})`);
  assert.ok(slow.mudWheelSpin > full.mudWheelSpin,
    `wheel spin reflects vehicle speed (${slow.mudWheelSpin} vs ${full.mudWheelSpin})`);
});

check('water drag rises with depth and absolute speed in forward and reverse', () => {
  const shallow = surfaceSpeedLoss({waterDepth: .25, speedMph: 30});
  const deep = surfaceSpeedLoss({waterDepth: 1, speedMph: 30});
  assert.ok(shallow > 0, `shallow water adds drag (got ${shallow})`);
  assert.ok(deep > shallow,
    `deep water removes more speed than shallow water (${deep} vs ${shallow})`);

  const slow = surfaceSpeedLoss({waterDepth: .6, speedMph: 15});
  const fast = surfaceSpeedLoss({waterDepth: .6, speedMph: 40});
  assert.ok(fast > slow,
    `faster pond entry loses more speed (${fast} vs ${slow})`);

  const forward = surfaceSpeedLoss({waterDepth: .6, speedMph: 30});
  const reverse = surfaceSpeedLoss({waterDepth: .6, speedMph: -30});
  assert.ok(Math.abs(forward - reverse) < 1e-9,
    `reverse uses the same absolute-speed drag (${reverse} vs ${forward})`);
});

check('an airborne Titan ignores mud and water until its tyres land', () => {
  function airborne(surface) {
    const duel = titanDuel();
    const zone = zoneFor(duel.course);
    const pose = placeAt(duel, pointFor(zone.landforms.pondBed, 'pond bed'), 30);
    const ordinarySurfaceAt = duel.course.surfaceAt.bind(duel.course);
    duel.course.surfaceAt = (s, lateral) => ({...ordinarySurfaceAt(s, lateral),
      road: false, mainRoad: false, ...surface});
    const ground = duel.course.groundAt(pose.s, pose.lateral).y;
    Object.assign(duel.state, {airborne: true, airHeight: 5,
      prevAirHeight: 5, _jumpY: ground + 5, _verticalSpeed: 0,
      surfaceMud: 0, waterDepth: 0, mudWheelSpin: 0});
    duel.setInput({throttle: .8, brake: 0, steer: 0, boost: false});
    const events = [];
    duel.onChange((_, event) => events.push(event));
    duel._drive(1 / 120);
    return {duel, events};
  }

  const dry = airborne({mud: 0, waterDepth: 0});
  const wet = airborne({mud: 1, waterDepth: 1});
  assert.deepEqual({
    surfaceMud: wet.duel.state.surfaceMud,
    waterDepth: wet.duel.state.waterDepth,
    mudWheelSpin: wet.duel.state.mudWheelSpin,
    speedMph: wet.duel.state.speedMph,
    splashes: wet.events.filter(event => event.muddyHollowSplash).length,
  }, {
    surfaceMud: 0,
    waterDepth: 0,
    mudWheelSpin: 0,
    speedMph: dry.duel.state.speedMph,
    splashes: 0,
  }, 'a Titan five metres airborne has no mud or water contact, drag, spin or splash');
});

check('grounded pond contact emits one splash and stays latched after an airborne pass', () => {
  const duel = titanDuel();
  const zone = zoneFor(duel.course);
  const pose = placeAt(duel, pointFor(zone.landforms.pondBed, 'pond bed'), 30);
  const ordinarySurfaceAt = duel.course.surfaceAt.bind(duel.course);
  duel.course.surfaceAt = (s, lateral) => ({...ordinarySurfaceAt(s, lateral),
    road: false, mainRoad: false, mud: 1, waterDepth: 1});
  const ground = duel.course.groundAt(pose.s, pose.lateral).y;
  Object.assign(duel.state, {airborne: true, airHeight: 5,
    prevAirHeight: 5, _jumpY: ground + 5, _verticalSpeed: 0,
    surfaceMud: 0, waterDepth: 0, mudWheelSpin: 0});
  duel.setInput({throttle: .8, brake: 0, steer: 0, boost: false});
  const events = [];
  duel.onChange((_, event) => events.push(event));

  duel._drive(1 / 120);
  const afterAir = events.filter(event => event.muddyHollowSplash).length;
  Object.assign(duel.state, {airborne: false, airHeight: 0,
    prevAirHeight: 5, _jumpY: null, _verticalSpeed: 0});
  duel._drive(1 / 120);
  const afterLanding = events.filter(event => event.muddyHollowSplash).length;
  duel._drive(1 / 120);
  const afterLatchedStep = events.filter(event => event.muddyHollowSplash).length;

  assert.deepEqual([afterAir, afterLanding, afterLatchedStep], [0, 1, 1],
    'air emits none, grounded landing emits one, and continuing contact stays latched');
  assert.deepEqual([duel.state.surfaceMud, duel.state.waterDepth], [1, 1],
    'grounded landing reads full mud and water');
  assert.ok(duel.state.mudWheelSpin > 0 && duel.state.mudWheelSpin <= 1,
    `grounded landing exposes clamped mud wheel spin (got ${duel.state.mudWheelSpin})`);
});

check('dry-to-water entry emits one fixed-step splash with simulation data', () => {
  const duel = titanDuel();
  const zone = zoneFor(duel.course);
  const dry = localPoint(zone, 0, 205);
  const pond = pointFor(zone.landforms.pondBed, 'pond bed');
  const events = [];
  duel.onChange((_, event) => events.push(event));
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  placeAt(duel, dry, 35); duel._drive(1 / 120);
  const entry = placeAt(duel, pond, 35); duel._drive(1 / 120);
  const splashes = events.filter(event => event.muddyHollowSplash)
    .map(event => event.muddyHollowSplash);
  assert.equal(splashes.length, 1,
    `one dry-to-water fixed step emits one splash (got ${splashes.length})`);
  const splash = splashes[0];
  assert.ok(splash.depth >= .05 && splash.depth <= 1,
    `splash carries its clamped water depth (got ${splash.depth})`);
  const eventSpeed = splash.speedMph ?? splash.speed;
  assert.ok(Number.isFinite(eventSpeed) && Math.abs(Math.abs(eventSpeed) - 35) < 1,
    `splash carries entry speed (got ${eventSpeed})`);
  assert.equal(splash.cue, 'world.muddy-hollow-splash',
    'splash carries the placeholder world cue');
  assert.ok(splash.position && ['x', 'y', 'z'].every(axis =>
    Number.isFinite(splash.position[axis])), 'splash carries a finite world position');
  const expected = duel.course.groundAt(entry.s, entry.lateral);
  assert.ok(Math.hypot(splash.position.x - expected.x,
    splash.position.z - expected.z) < 1,
  'splash position is the Titan water-entry position');
});

check('pond splash stays latched until a dry exit rearms it', () => {
  const duel = titanDuel();
  const zone = zoneFor(duel.course);
  const dry = localPoint(zone, 0, 205);
  const pond = pointFor(zone.landforms.pondBed, 'pond bed');
  const events = [];
  duel.onChange((_, event) => events.push(event));
  duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
  placeAt(duel, dry, 25); duel._drive(1 / 120);
  for (let tick = 0; tick < 12; tick++) {
    placeAt(duel, pond, 25);
    duel._drive(1 / 120);
  }
  assert.equal(events.filter(event => event.muddyHollowSplash).length, 1,
    'remaining at or above 0.05 m does not emit every tick');
  placeAt(duel, dry, 25); duel._drive(1 / 120);
  placeAt(duel, pond, 25); duel._drive(1 / 120);
  assert.equal(events.filter(event => event.muddyHollowSplash).length, 2,
    'leaving below 0.05 m rearms the next pond entry');
});

check('Muddy Hollow Titan results are exact through 30, 60 and 144 FPS scheduling', () => {
  function run(fps) {
    const duel = titanDuel();
    const zone = zoneFor(duel.course);
    placeAt(duel, pointFor(zone.landforms.pits[1], 'mud pit 2'), 12);
    duel.setInput({throttle: .7, brake: 0, steer: .35, boost: false});
    let accumulator = 0;
    let fixedSteps = 0;
    for (let frame = 0; frame < fps; frame++) {
      accumulator += 1 / fps;
      while (accumulator + 1e-10 >= 1 / 120) {
        duel._drive(1 / 120);
        accumulator = Math.max(0, accumulator - 1 / 120);
        fixedSteps++;
      }
    }
    assert.equal(fixedSteps, 120, `${fps} FPS schedules 120 fixed steps`);
    assert.ok(Number.isFinite(duel.state.mudWheelSpin),
      `${fps} FPS exposes deterministic mud wheel spin`);
    return {
      s: duel.state.s,
      lateral: duel.state.lateral,
      speedMph: duel.state.speedMph,
      headingError: duel.state.headingError,
      yawVelocity: duel.state.yawVelocity,
      mudWheelSpin: duel.state.mudWheelSpin,
    };
  }
  const at30 = run(30);
  assert.deepEqual(run(60), at30, '60 FPS matches the 30 FPS fixed-step result');
  assert.deepEqual(run(144), at30, '144 FPS matches the 30 FPS fixed-step result');
});

check('ridge departure boundary is deterministic in the existing local frame', () => {
  const locals = [];
  for (const routeSeed of [1989, 42, 17]) {
    const course = new Course(highCountry, routeSeed, {muddyHollow: true});
    const zone = zoneFor(course);
    const boundary = departureBoundary(zone, true);
    const ridge = zone.landforms.ridge;
    const ridgeLocal = toLocal(zone, pointFor(ridge, 'ridge'));
    const bowlLocal = toLocal(zone, pointFor(zone.landforms.valleyBowl, 'valley bowl'));
    assert.ok(boundary.lateral > ridgeLocal.lateral,
      `route ${routeSeed} boundary is on the valley side of the ridge crest`);
    assert.ok(boundary.lateral < bowlLocal.lateral,
      `route ${routeSeed} boundary remains between the crest and valley bowl`);
    for (const along of [boundary.alongMin, (boundary.alongMin + boundary.alongMax) / 2,
      boundary.alongMax]) {
      const world = localPoint(zone, along, boundary.lateral);
      assert.equal(zone.contains(world.x, world.z), true,
        `route ${routeSeed} boundary lies inside the Hollow`);
      const roundTrip = toLocal(zone, world);
      assert.ok(Math.abs(roundTrip.along - along) < 1e-9 &&
        Math.abs(roundTrip.lateral - boundary.lateral) < 1e-9,
      `route ${routeSeed} boundary round-trips through the existing frame`);
    }
    locals.push({...boundary});
  }
  assert.deepEqual(locals[1], locals[0], 'route B keeps the same local boundary');
  assert.deepEqual(locals[2], locals[0], 'route C keeps the same local boundary');
});

check('a normal discovered Titan launch reaches racing before any ridge history exists', () => {
  const duel = new Duel({seed, featureFlags: {
    'muddy-hollow': true,
    'titan-climb': true,
  }});
  duel.startCampaign({car: 'titan_monster', startStage: highCountryIndex,
    discoveredGate: true, opponentCount: 0, mode: 'timetrial'});
  const events = [];
  duel.onChange((_, event) => events.push(event));
  for (let tick = 0; tick < 370; tick++) duel.step(fixedStep);
  assert.equal(duel.state.status, 'racing',
    'ordinary launch remains in the race before the Titan approaches the ridge');
  assert.equal(phaseThreeEvent(events).length, 0,
    'ordinary launch emits no Muddy Hollow departure');
});

check('menu simulation before course creation cannot run a Hollow departure check', () => {
  const duel = new Duel({seed, featureFlags: {'muddy-hollow': true}});
  assert.equal(duel.course, undefined, 'fresh menu simulation has no course');
  assert.equal(api('checkMuddyHollowDeparture')(duel), false,
    'no-course menu simulation has no Hollow departure');
});

check('only a grounded racing Titan crossing the ridge departs once', () => {
  const before = phaseThreeDuel();
  const beforeZone = zoneFor(before.course);
  const beforeBoundary = departureBoundary(beforeZone);
  const along = (beforeBoundary.alongMin + beforeBoundary.alongMax) / 2;
  placeAt(before, localPoint(beforeZone, along, beforeBoundary.lateral - .5), 0);
  before.step(fixedStep);
  assert.equal(before.state.status, 'racing',
    'being before the valley-side boundary does not abandon the race');

  const {duel, events} = crossingFixture();
  duel.state.impactTimer = .2;
  duel.state.impactDuration = .4;
  duel.state.impactStrength = .5;
  duel.state.impactSide = 1;
  duel.state.boosting = true;
  duel.state._jumpY = 123;
  duel.state.police.pendingFines = 600;
  duel.step(fixedStep);
  assert.equal(duel.state.status, 'exploring',
    'a grounded Titan crossing enters exploration');
  assert.equal(phaseThreeEvent(events).length, 1,
    'the crossing emits one Muddy Hollow departure');
  assert.deepEqual({
    impactTimer: duel.state.impactTimer,
    tumble: duel.state.tumble,
    boosting: duel.state.boosting,
    airborne: duel.state.airborne,
    airHeight: duel.state.airHeight,
    jumpY: duel.state._jumpY,
    pendingFines: duel.state.police.pendingFines,
  }, {impactTimer: 0, tumble: null, boosting: false, airborne: false,
    airHeight: 0, jumpY: null, pendingFines: 0},
  'departure clears transient race, flight and pending-fine state');
  for (let tick = 0; tick < 20; tick++) duel.step(fixedStep);
  assert.equal(phaseThreeEvent(events).length, 1,
    'remaining beyond the ridge cannot depart twice');
});

check('non-Titan, on-foot, airborne, road, flag-off and undiscovered states cannot depart', () => {
  const cases = [
    ['non-Titan', {car: 'dusthawk_rally'}],
    ['on foot', {onFoot: true}],
    ['airborne', {airborne: true}],
    ['racing line', {road: true}],
    ['flag off', {enabled: false}],
    ['undiscovered', {discovered: false}],
  ];
  for (const [label, options] of cases) {
    const {duel, events} = crossingFixture(options);
    duel.step(fixedStep);
    assert.equal(duel.state.status, 'racing', `${label} cannot enter exploration`);
    assert.equal(phaseThreeEvent(events).length, 0,
      `${label} emits no Muddy Hollow departure`);
  }
});

check('departure validates the swept ridge intersection, not only the endpoint', () => {
  for (const [label, beforeAlong, afterAlong] of [
    ['upper end', .15, -.1],
    ['lower end', -.15, .1],
  ]) {
    const {duel, reference, boundary, events} = crossingFixture();
    const edge = label === 'upper end' ? boundary.alongMax : boundary.alongMin;
    const beforePoint = localPoint(reference, edge + beforeAlong,
      boundary.lateral - .15);
    const afterPoint = localPoint(reference, edge + afterAlong,
      boundary.lateral + .15);
    const before = duel.course.nearest(beforePoint.x, beforePoint.z, reference.frame.s);
    const after = duel.course.nearest(afterPoint.x, afterPoint.z, reference.frame.s);
    Object.assign(duel.state, {prevS: before.s, prevLateral: before.lateral,
      s: after.s, lateral: after.lateral});
    assert.equal(api('checkMuddyHollowDeparture')(duel), false,
      `${label} diagonal sweep outside the finite ridge span cannot depart`);
    assert.equal(duel.state.status, 'racing');
    assert.equal(phaseThreeEvent(events).length, 0);
  }
});

check('an airborne-to-ground landing sweep cannot depart through the ridge', () => {
  const {duel, events} = crossingFixture();
  Object.assign(duel.state, {airborne: false, airHeight: 0,
    prevAirHeight: 5, _jumpY: null});
  assert.equal(api('checkMuddyHollowDeparture')(duel), false,
    'the whole swept crossing must have tyre contact');
  assert.equal(duel.state.status, 'racing');
  assert.equal(phaseThreeEvent(events).length, 0);
});

check('ridge crossing wins over a simultaneous race deadline', () => {
  const {duel, events} = crossingFixture();
  Object.assign(duel.state, {timeLimitSec: 20,
    stageTimeSec: 20 - fixedStep / 2, racePenaltySec: 0});
  duel.step(fixedStep);
  assert.equal(duel.state.status, 'exploring',
    'point-of-no-return crossing takes priority over the deadline');
  assert.equal(phaseThreeEvent(events).length, 1);
  assert.equal(events.some(event => event.stageResult || event.gameover), false,
    'simultaneous deadline cannot publish a race result');
});

check('exploration stays drivable while race outcomes freeze and ridge return cannot resume', () => {
  const {duel, reference, events} = crossingFixture();
  duel.step(fixedStep);
  assert.equal(duel.state.status, 'exploring', 'fixture departs into exploration');
  const outcomeFields = ['stageTimeSec', 'lapTimeSec', 'totalTimeSec',
    'nextLapGate', 'completedLaps', 'score', 'stageStyleScore', 'results',
    'majorCrashes', 'boundaryResets'];
  const frozen = Object.fromEntries(outcomeFields.map(key =>
    [key, structuredClone(duel.state[key])]));
  const before = duel.course.worldAt(duel.state.s, duel.state.lateral);
  duel.setInput({throttle: .4, brake: 0, steer: 0, boost: false});
  for (let tick = 0; tick < 60; tick++) duel.step(fixedStep);
  const after = duel.course.worldAt(duel.state.s, duel.state.lateral);
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > 1,
    'fixed-step exploration remains drivable');
  assert.deepEqual(Object.fromEntries(outcomeFields.map(key =>
    [key, duel.state[key]])), frozen, 'race clocks, progress, score and results freeze');
  assert.equal(events.some(event => event.stageResult || event.gameover ||
    event.lapCompleted || event.checkpointReset || event.ticket), false,
  'exploration creates no race outcome, checkpoint, ticket or result');

  const road = duel.course.nearest(...(() => {
    const point = localPoint(reference, 0, 0);
    return [point.x, point.z, reference.frame.s];
  })());
  Object.assign(duel.state, {s: road.s, prevS: road.s,
    lateral: road.lateral, prevLateral: road.lateral, speedMph: 0});
  duel.step(fixedStep);
  assert.equal(duel.state.status, 'exploring',
    'crossing back to the road cannot resume the abandoned race');
  assert.deepEqual(Object.fromEntries(outcomeFields.map(key =>
    [key, duel.state[key]])), frozen, 'ridge return keeps race outcomes frozen');
});

check('Pro overrev cannot freeze a departed Titan; ordinary engine failure remains', () => {
  const {duel} = crossingFixture({difficulty: 'pro'});
  duel.step(fixedStep);
  Object.assign(duel.state, {speedMph: 36, gear: 0,
    overrevSec: DRIVE.overRevBlowSec});
  duel.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  const before = duel.course.worldAt(duel.state.s, duel.state.lateral);
  for (let tick = 0; tick < 10; tick++) duel.step(fixedStep);
  const after = duel.course.worldAt(duel.state.s, duel.state.lateral);
  assert.ok(Math.hypot(after.x - before.x, after.z - before.z) > .1,
    'riding the limiter after departure still integrates position');
  assert.equal(duel.state.status, 'exploring');
  assert.equal(duel.state.majorCrashes, 0);
  assert.ok(Number.isFinite(duel.state.overrevSec) &&
    duel.state.overrevSec <= DRIVE.overRevBlowSec + fixedStep * 2,
  'departed explorer keeps a bounded overrev counter');

  const ordinary = phaseThreeDuel({difficulty: 'pro'});
  Object.assign(ordinary.state, {speedMph: 36, gear: 0,
    overrevSec: DRIVE.overRevBlowSec});
  ordinary.setInput({throttle: 1, brake: 0, steer: 0, boost: false});
  ordinary.step(fixedStep);
  assert.ok(ordinary.state.majorCrashes > 0 || ordinary.state.impactTimer > 0,
    'ordinary Pro racing still fails the engine');
});

check('departure and exploration agree under 30, 60 and 144 FPS schedules', () => {
  function run(fps) {
    const duel = phaseThreeDuel();
    const zone = zoneFor(duel.course);
    const boundary = departureBoundary(zone);
    const along = (boundary.alongMin + boundary.alongMax) / 2;
    const start = localPoint(zone, along, boundary.lateral - .2);
    const pose = placeAt(duel, start, 35);
    duel.state.headingError = Math.atan2(
      Math.sin(zone.frame.heading + Math.PI / 2 - duel.course.at(pose.s).heading),
      Math.cos(zone.frame.heading + Math.PI / 2 - duel.course.at(pose.s).heading));
    duel.setInput({throttle: .25, brake: 0, steer: 0, boost: false});
    const events = [];
    duel.onChange((_, event) => events.push(event));
    let tick = 0;
    for (let frame = 1; frame <= fps; frame++) {
      const target = Math.floor(frame * 120 / fps + 1e-9);
      while (tick < target) {
        duel.step(fixedStep);
        tick++;
      }
    }
    assert.equal(tick, 120, `${fps} FPS schedules 120 fixed steps`);
    assert.equal(duel.state.status, 'exploring', `${fps} FPS crosses into exploration`);
    assert.equal(phaseThreeEvent(events).length, 1, `${fps} FPS departs once`);
    return {
      s: duel.state.s,
      lateral: duel.state.lateral,
      speedMph: duel.state.speedMph,
      headingError: duel.state.headingError,
      stageTimeSec: duel.state.stageTimeSec,
      status: duel.state.status,
    };
  }
  const at30 = run(30);
  assert.deepEqual(run(60), at30, '60 FPS matches the 30 FPS fixed-step result');
  assert.deepEqual(run(144), at30, '144 FPS matches the 30 FPS fixed-step result');
});

check('memory-only App abandonment preserves banked progress and discards the active attempt', () => {
  const app = makeMuddyApp();
  const state = app.duel.state;
  state.score = 1700;
  state.stageStyleScore = 400;
  state.policeEscapes = 3;
  const before = savedAppBank(app);
  const historyCount = app.profile.history.length;
  const event = departMuddyApp(app);
  assert.deepEqual(stableSavedContent(savedAppBank(app)), stableSavedContent(before),
    'abandonment preserves banked credits, records, unlocks and ghosts');
  assert.equal(app.profile.history.length, historyCount + 1,
    'abandonment writes one history result');
  const result = app.profile.history.at(-1);
  assert.deepEqual({abandoned: result.abandoned, reward: result.reward,
    charge: result.charge, policeFineCharge: result.policeFineCharge},
  {abandoned: true, reward: 0, charge: 0, policeFineCharge: 0},
  'unbanked race earnings and pending fines are discarded');
  assert.equal(app.profile.activeRace, null, 'abandoned active race is cleared');
  assert.equal(state.police.pendingFines, 0, 'simulation pending fines are cleared');
  assert.equal(app.ghostRecorder, null, 'unfinished attempt no longer records a ghost');
  app.duel.emit({muddyHollowDeparted: event});
  assert.equal(app.profile.history.length, historyCount + 1,
    'duplicate departure cannot settle twice');
  assert.deepEqual(stableSavedContent(savedAppBank(app)), stableSavedContent(before));
  assert.equal(activePlayer(loadPlayers()).profile.credits, before.credits);
  assert.deepEqual(loadLeaderboard(), before.leaderboard);
  const storedGhosts = loadGhosts();
  for (const record of storedGhosts.records) delete record.lastUsedAt;
  assert.deepEqual(storedGhosts, stableSavedContent(before).ghosts);
  app.dispose();
});

check('failed departure save is visible in the existing exploration pause panel', () => {
  const app = makeMuddyApp();
  departMuddyApp(app);
  app.profileSaved = false;
  app.duel.state.paused = true;
  const render = createResultsScreen({app, profile: () => app.profile,
    credits: value => Number(value || 0).toLocaleString('en-US'),
    time: String, escapeHTML: String, arrow: ''});
  const html = render(app.duel.state);
  assert.match(html, /Storage is unavailable; progress lasts for this session\./,
    'pause panel warns that the failed abandonment save is session only');
  app.dispose();
});

check('invalid, stale-run and wrong-player Muddy Hollow events cannot settle', () => {
  const app = makeMuddyApp();
  assert.equal(typeof app._settleMuddyHollowDeparture, 'function',
    'App exposes its guarded Muddy Hollow settlement hook');
  const state = app.duel.state;
  const before = stableSavedContent(savedAppBank(app));
  const historyCount = app.profile.history.length;
  app._settleMuddyHollowDeparture({departureId: 'not-this-run'}, state);
  assert.equal(app.profile.history.length, historyCount,
    'invalid event cannot abandon the active race');
  const event = departMuddyApp(app);
  const oldState = {...state,
    muddyHollowDeparture: structuredClone(state.muddyHollowDeparture)};
  app._settleMuddyHollowDeparture(event, state);
  app.restart();
  const restartedHistory = app.profile.history.length;
  app._settleMuddyHollowDeparture(event, oldState);
  app._settleMuddyHollowDeparture(event, app.duel.state);
  assert.equal(app.profile.history.length, restartedHistory,
    'old departure cannot abandon a restarted countdown');
  assert.deepEqual(stableSavedContent(savedAppBank(app)), before);

  app.returnToMenu();
  const originalId = app.player.id;
  app.addPlayer('Independent hollow tester');
  const other = structuredClone(app.profile);
  app._settleMuddyHollowDeparture(event, oldState);
  assert.deepEqual(app.profile, other, 'wrong player is unchanged');
  app.selectPlayer(originalId);
  assert.deepEqual(stableSavedContent(savedAppBank(app)), before,
    'original player bank remains unchanged');
  app.dispose();
});

check('installation preserves the racing line, scenery and RNG stream', () => {
  const ordinary = courseFor(highCountry, false);
  const enabled = courseFor(highCountry, true);
  zoneFor(enabled);

  assert.equal(ordinaryFingerprint(enabled), ordinaryFingerprint(ordinary),
    'Muddy Hollow does not change High Country samples, sections or scenery');
  assert.deepEqual(
    Array.from({ length: 16 }, () => enabled.rng.float()),
    Array.from({ length: 16 }, () => ordinary.rng.float()),
    'Muddy Hollow consumes no values from the course random stream',
  );
});

for (const failure of failures) console.error(`FAIL ${failure}`);
console.log(`Muddy Hollow phase 3: ${checks - failures.length}/${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;

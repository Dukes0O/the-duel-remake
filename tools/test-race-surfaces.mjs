import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';
import { createHash } from 'node:crypto';
import { driveCircuit } from './track-script-drive.mjs';
import { CARS, COURSE, DRIVE } from '../src/config.js';
import { App } from '../src/app.js';
import { normalizeRaceSettings, raceSettingsChoices } from '../src/race-settings.js';
import { TrackScriptError } from '../src/track-script.js';
import { addTrackScriptScene } from '../src/track-script-scene.js';
import {
  GRIP_FLOOR, HINT_BELOW, ICE_MAX_LENGTH, SURFACE_KINDS, SURFACES, TYRES, courseHasWinterSurfaces,
  effectiveGrip, gripFor, gripReadout, surfaceCue, surfaceGrip, tyreTopSpeedShare,
} from '../src/race-surfaces.js';

// P4-GRIP: surfaces and tyres (docs/CIRCUITS.md section 3.4).
const DT = 1 / 120;
const near = (a, b, tolerance, message = '') => assert.ok(Math.abs(a - b) <= tolerance, `${message} ${a} differs from ${b}`);
const base = { theme: 'alpine', stage: 91, closed: true, laps: 2, airborne: true, noTraffic: true, hasRival: false, hasRadar: false,
  speedLimitMph: 65, layoutVersion: 1, kind: 'circuit', sections: [{ theme: 'alpine', name: 'Test', share: 1 }] };
// A long straight on each surface, then a plain rectangle round to the start.
const rect = surface => ({ ...base, id: `grip-${surface}`, name: `Grip ${surface}`, script: [
  ['straight', 1400, { surface, name: 'Test Straight' }], ['turn', 'L', 90, 80, { surface: 'asphalt' }], ['straight', 600], ['turn', 'L', 90, 80],
  ['straight', 1400], ['turn', 'L', 90, 80], ['straight', 600], ['turn', 'L', 90, 80]] });

function start(def, { tyre, car = 'falcone_f42' } = {}) {
  const added = !COURSE.some(item => item.id === def.id);
  if (added) COURSE.push(def);
  const duel = new Duel({ seed: 1989 });
  duel.startCampaign({ startStage: COURSE.findIndex(item => item.id === def.id), tyre, car, opponentCount: 0 });
  Object.assign(duel.state, { status: 'racing', countdown: 0, traffic: [] });
  duel._cleanup = () => { if (added) COURSE.splice(COURSE.findIndex(item => item.id === def.id), 1); };
  return duel;
}
function drive(def, { tyre, car, speed = 80, s = 300, lateral = 0, throttle = 0, brake = 0, steer = 0, seconds = 1 }) {
  const duel = start(def, { tyre, car }), st = duel.state;
  try {
    Object.assign(st, { s, lateral, speedMph: speed, gear: speed > 130 ? 4 : speed > 80 ? 3 : speed > 40 ? 2 : 1 });
    duel.setInput({ throttle, brake, steer, boost: false });
    for (let t = 0; t < seconds; t += DT) duel.step(DT);
    return { speed: st.speedMph, yaw: st.yawVelocity, heading: st.headingError, travelled: st.s - s, state: st, duel };
  } finally { duel._cleanup(); }
}

test('every surface and tyre pairing: grip is surface times tyre, never under 40%', () => {
  const expected = {
    asphalt: { summer: 1, winter: .94 },
    gravel: { summer: .85, winter: .85 * .94 },
    snow: { summer: .7 * .75, winter: .7 },
    ice: { summer: GRIP_FLOOR, winter: .5 * .85 },        // .275 would be under the floor
    'deep-snow': { summer: .55 * .75, winter: .55 },
    'warm-tarmac': { summer: 1, winter: .82 },
  };
  for (const kind of SURFACE_KINDS) for (const tyre of Object.keys(TYRES)) {
    near(effectiveGrip(kind, tyre), Math.max(GRIP_FLOOR, expected[kind][tyre]), 1e-12, `${kind} on ${tyre}`);
    assert.ok(effectiveGrip(kind, tyre) >= GRIP_FLOOR);
  }
  // The published surface and tyre tables.
  assert.deepEqual(SURFACE_KINDS.map(kind => SURFACES[kind].grip), [1, .85, .7, .5, .55, 1]);
  assert.equal(SURFACES['deep-snow'].topSpeedMph, 45);
  assert.deepEqual([TYRES.summer.asphalt, TYRES.summer.snow, TYRES.summer.ice], [1, .75, .55]);
  assert.deepEqual([TYRES.winter.asphalt, TYRES.winter.snow, TYRES.winter.ice], [.94, 1, .85]);
  assert.equal(TYRES.summer.topSpeedShare, 1); assert.equal(TYRES.winter.topSpeedShare, .97);
  // The rally car and the Titan lose nothing on graded gravel.
  assert.equal(surfaceGrip('gravel', CARS.dusthawk_rally), 1);
  assert.equal(surfaceGrip('gravel', CARS.titan_monster), 1);
  assert.equal(surfaceGrip('gravel', CARS.falcone_f42), .85);
  near(effectiveGrip('gravel', 'winter', CARS.dusthawk_rally), .94, 1e-12);
  // Winter rubber gives 3% of top speed away on asphalt only.
  assert.equal(tyreTopSpeedShare('asphalt', 'winter'), .97);
  assert.equal(tyreTopSpeedShare('snow', 'winter'), 1);
  assert.equal(tyreTopSpeedShare('asphalt', 'summer'), 1);
  // Unknown values fall back to asphalt and summer.
  assert.equal(effectiveGrip('mud', 'slicks'), 1);
});

test('asphalt on summer tyres is the shared neutral answer', () => {
  const a = gripFor('asphalt', 'summer'), b = gripFor('asphalt', 'summer', CARS.titan_monster);
  assert.equal(a, b); assert.equal(a.grip, 1); assert.equal(a.active, false); assert.equal(a.topShare, 1);
  assert.ok(Object.isFrozen(a));
  assert.equal(gripFor('asphalt', 'winter').active, true);
  // Hints and sounds: named when grip drops under 0.8.
  assert.equal(gripFor('snow', 'summer').hint, 'SNOW');
  assert.equal(gripFor('ice', 'summer').hint, 'ICE');
  assert.equal(gripFor('deep-snow', 'winter').hint, 'DEEP SNOW');
  assert.equal(gripFor('gravel', 'summer').hint, '', 'gravel at .85 is not named');
  assert.equal(gripFor('gravel', 'winter').hint, 'GRAVEL', 'on winter tyres gravel is under .8');
  assert.equal(gripFor('snow', 'winter').hint, 'SNOW', '.7 is under .8 even on winter tyres');
  assert.equal(HINT_BELOW, .8);
  assert.deepEqual([surfaceCue('gravel'), surfaceCue('snow'), surfaceCue('ice'), surfaceCue('deep-snow'), surfaceCue('asphalt')],
    ['surface.gravel', 'surface.snow', 'surface.ice', 'surface.snow', null]);
});

test('the course knows its surface by stretch, patch and sideways position', () => {
  const def = { ...rect('snow'), id: 'grip-patches', surfacePatches: [
    { id: 'drift', kind: 'deep-snow', s0: 400, s1: 460, from: -2, to: 8 },
    { id: 'shade', kind: 'ice', s0: 800, s1: 850, shaded: true }] };
  const course = new Course(def, 1989);
  assert.equal(course.gripKindAt(100, 0), 'snow');
  assert.equal(course.gripKindAt(430, 4), 'deep-snow');
  assert.equal(course.gripKindAt(430, -4), 'snow', 'outside the patch band');
  assert.equal(course.gripKindAt(430, 20), 'asphalt', 'beyond the road edge the old off-road rules govern');
  assert.equal(course.gripKindAt(825, 0), 'ice');
  assert.equal(course.gripKindAt(1500, 0), 'asphalt');
  assert.equal(course.gripKindAt(100 + course.length, 0), 'snow', 'laps wrap');
  assert.equal(courseHasWinterSurfaces(def), true);
  assert.equal(courseHasWinterSurfaces(course), true);
  assert.equal(courseHasWinterSurfaces(rect('gravel')), false);
  // The ICE board stands 100 m before the patch.
  const board = course.features.boards.find(item => item.kind === 'ice');
  near(board.s, 700, 1e-9); assert.equal(board.text, 'ICE');
  // Existing courses are asphalt everywhere and gain nothing.
  for (const existing of COURSE.filter(item => !item.script)) {
    const old = new Course(existing, 1989);
    assert.equal(old.gripKindAt(500, 0), 'asphalt'); assert.equal(courseHasWinterSurfaces(old), false);
    assert.equal(old.features.surfacePatches, undefined);
  }
});

test('ice is always fair', () => {
  const ice = (patch, script) => new Course({ ...rect('asphalt'), id: 'grip-ice', ...(script ? { script } : {}), surfacePatches: [patch] }, 1989);
  assert.ok(ice({ id: 'ok', kind: 'ice', s0: 800, s1: 850, shaded: true }));
  assert.throws(() => ice({ id: 'long', kind: 'ice', s0: 800, s1: 800 + ICE_MAX_LENGTH + 5, shaded: true }), error => error instanceof TrackScriptError && /at most 60 m/.test(error.message));
  assert.throws(() => ice({ id: 'sunny', kind: 'ice', s0: 800, s1: 850 }), /shaded: true/);
  assert.throws(() => ice({ id: 'bad', kind: 'sleet', s0: 800, s1: 850 }), /unknown surface "sleet"/);
  // Never on the apex of a hairpin.
  const hairpin = [['straight', 500], ['turn', 'L', 170, 15, { name: 'Test Hairpin' }], ['straight', 500], ['turn', 'L', 190, 60]];
  const course = new Course({ ...rect('asphalt'), id: 'grip-hairpin', script: hairpin }, 1989);
  const apex = course.script.pieces[1];
  assert.throws(() => ice({ id: 'apex', kind: 'ice', s0: apex.arcStart, s1: apex.arcStart + 20, shaded: true }, hairpin), /apex of Test Hairpin/);
  // A stretch of ice in the script obeys the same limit.
  assert.throws(() => new Course({ ...rect('asphalt'), id: 'grip-long-ice', script: [['straight', 1400, { surface: 'ice' }], ...rect('asphalt').script.slice(1)] }, 1989), /at most 60 m/);
  assert.throws(() => new Course({ ...rect('asphalt'), id: 'grip-bad-surface', script: [['straight', 120, { surface: 'lava' }], ...rect('asphalt').script.slice(1)] }, 1989), /surface must be one of/);
});

test('steering and braking scale with grip on every surface', () => {
  const asphalt = drive(rect('asphalt'), { speed: 50, steer: 1, seconds: .8 });
  const brakeAsphalt = drive(rect('asphalt'), { speed: 90, brake: 1, seconds: 1 });
  for (const [surface, tyre] of [['gravel', 'summer'], ['snow', 'summer'], ['snow', 'winter'], ['deep-snow', 'summer'], ['deep-snow', 'winter'], ['asphalt', 'winter']]) {
    const grip = effectiveGrip(surface, tyre), steered = drive(rect(surface), { tyre, speed: 50, steer: 1, seconds: .8 });
    near(Math.abs(steered.yaw) / Math.abs(asphalt.yaw), grip, .03, `${surface}/${tyre}: steering follows grip`);
    // Deep snow also caps speed at 45 mph, so its braking is compared from below the cap.
    const from = surface === 'deep-snow' ? 40 : 90, braked = drive(rect(surface), { tyre, speed: from, brake: 1, seconds: surface === 'deep-snow' ? .5 : 1 });
    const reference = surface === 'deep-snow' ? drive(rect('asphalt'), { speed: 40, brake: 1, seconds: .5 }) : brakeAsphalt;
    const lost = from - braked.speed, wasLost = from - reference.speed;
    assert.ok(lost / wasLost > grip - .08 && lost / wasLost < grip + .08, `${surface}/${tyre}: braking follows grip (${(lost / wasLost).toFixed(3)} vs ${grip.toFixed(3)})`);
  }
  // Winter tyres beat summer on snow in both, and lose a little on asphalt.
  const summerSnow = drive(rect('snow'), { tyre: 'summer', speed: 90, brake: 1, seconds: 1 }), winterSnow = drive(rect('snow'), { tyre: 'winter', speed: 90, brake: 1, seconds: 1 });
  assert.ok(winterSnow.speed < summerSnow.speed - 5);
  const winterRoad = drive(rect('asphalt'), { tyre: 'winter', speed: 90, brake: 1, seconds: 1 });
  assert.ok(winterRoad.speed > brakeAsphalt.speed);
  // Ice: a 60 m patch, braking from 40 mph, grip held at the 40% floor on summer tyres.
  const iceDef = { ...rect('asphalt'), id: 'grip-ice-run', surfacePatches: [{ id: 'sheet', kind: 'ice', s0: 800, s1: 860, shaded: true }] };
  const slow = drive(rect('asphalt'), { speed: 40, brake: 1, seconds: .5, s: 820 }), onIce = drive(iceDef, { speed: 40, brake: 1, seconds: .5, s: 805 });
  near((40 - onIce.speed) / (40 - slow.speed), GRIP_FLOOR, .06, 'ice braking is 40% of asphalt');
  const iceSteer = drive(iceDef, { speed: 40, steer: 1, seconds: .4, s: 805 }), roadSteer = drive(rect('asphalt'), { speed: 40, steer: 1, seconds: .4, s: 805 });
  near(Math.abs(iceSteer.yaw) / Math.abs(roadSteer.yaw), GRIP_FLOOR, .04, 'ice steering is 40% of asphalt');
  // A car on the wrong tyres slides wide but can still be steered and stopped.
  assert.ok(Math.abs(iceSteer.yaw) > .05 && onIce.speed < 40);
});

test('deep snow holds any car to 45 mph; winter tyres give 3% of top speed on asphalt', () => {
  const deep = drive(rect('deep-snow'), { speed: 100, throttle: 1, seconds: 6 });
  assert.ok(deep.speed <= 45.6, `settles at ${deep.speed}`);
  assert.ok(deep.speed > 40, 'still driveable');
  const summer = drive(rect('asphalt'), { speed: 190, throttle: 1, seconds: 8, s: 100 }), winter = drive(rect('asphalt'), { tyre: 'winter', speed: 190, throttle: 1, seconds: 8, s: 100 });
  near(winter.speed / summer.speed, .97, .004, 'top speed share');
  assert.ok(winter.speed < 201 * .971);
});

test('surface changes are announced with their sound cue', () => {
  const def = { ...rect('snow'), id: 'grip-events' };
  const duel = start(def, { tyre: 'winter' }), events = [];
  try {
    duel.onChange((state, event) => { if (event.surfaceChanged) events.push(event.surfaceChanged); });
    Object.assign(duel.state, { s: 1300, speedMph: 60, gear: 2 });
    duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
    for (let t = 0; t < 4; t += DT) duel.step(DT);
    assert.deepEqual(events.map(event => event.kind), ['snow', 'asphalt']);
    assert.deepEqual(events.map(event => event.cue), ['surface.snow', null]);
  } finally { duel._cleanup(); }
});

test('ordinary courses and summer tyres change nothing', () => {
  const duel = new Duel({ seed: 1989 }); duel.startCampaign();
  Object.assign(duel.state, { status: 'racing', countdown: 0, traffic: [], s: 400, speedMph: 90, gear: 3 });
  const surface = duel._drivingSurface(400, 0);
  assert.deepEqual(Object.keys(surface).filter(key => /^grip/.test(key)), [], 'no grip keys on an ordinary road');
  assert.equal(surface.traction, 1);
  assert.equal(duel.state.tyre, undefined);
  assert.equal(duel._roadGrip(400, 0), gripFor('asphalt', 'summer'));
  // A winter request on an ordinary course is not even kept in the saved settings.
  const app = new App();
  app.startCampaign({ tyre: 'winter' });
  assert.equal(app.duel.state.tyre, undefined, 'no snow or ice, no tyre choice');
  assert.equal(app.getRaceChoices().tyre, undefined);
});

test('race settings keep winter tyres only when chosen', () => {
  const settings = normalizeRaceSettings({ eventId: COURSE[0].id, tyre: 'winter' });
  assert.equal(settings.tyre, 'winter'); assert.equal(raceSettingsChoices(settings).tyre, 'winter');
  for (const value of ['summer', 'slicks', undefined, 3]) {
    const plain = normalizeRaceSettings({ eventId: COURSE[0].id, tyre: value });
    assert.equal(Object.hasOwn(plain, 'tyre'), false);
    assert.equal(Object.hasOwn(raceSettingsChoices(plain), 'tyre'), false);
  }
  assert.deepEqual(Object.keys(normalizeRaceSettings({})), Object.keys(normalizeRaceSettings({ tyre: 'summer' })), 'saves without a tyre keep their shape');
});

test('the HUD shows the tyre on a snow circuit and the surface when grip is low', () => {
  const duel = start(rect('snow'), { tyre: 'winter' });
  try {
    duel.state.s = 300;
    let readout = gripReadout(duel);
    assert.equal(readout.tyre.id, 'winter'); assert.equal(readout.tyre.icon, 'snowflake'); assert.equal(readout.hint, 'SNOW'); near(readout.grip, .7, 1e-12);
    duel.state.s = 1500;
    readout = gripReadout(duel);
    assert.equal(readout.hint, ''); near(readout.grip, .94, 1e-12);
    assert.equal(readout.tyre.id, 'winter');
    duel.state.tyre = undefined; duel.state.s = 300;
    readout = gripReadout(duel);
    assert.equal(readout.tyre.id, 'summer'); assert.equal(readout.hint, 'SNOW'); near(readout.grip, .525, 1e-12);
  } finally { duel._cleanup(); }
  const ordinary = new Duel({ seed: 1989 }); ordinary.startCampaign(); ordinary.state.status = 'racing';
  assert.equal(gripReadout(ordinary).tyre, null); assert.equal(gripReadout(ordinary).hint, '');
});

test('the renderer draws every surface, the ice board and the braking boards, and changes nothing', () => {
  const def = { ...rect('snow'), id: 'grip-scene', script: [['straight', 600, { surface: 'gravel' }], ['straight', 800, { surface: 'snow' }], ...rect('snow').script.slice(1)],
    surfacePatches: [{ id: 'drift', kind: 'deep-snow', s0: 400, s1: 450 }, { id: 'sheet', kind: 'ice', s0: 1000, s1: 1050, shaded: true }] };
  const course = new Course(def, 1989), before = JSON.stringify([course.features.obstacles, course.features.boards, course.features.surfacePatches]);
  const group = new THREE.Group();
  addTrackScriptScene(group, course);
  const names = new Set(group.children.map(child => child.name));
  for (const name of ['surface-gravel', 'surface-snow', 'surface-deep-snow', 'surface-ice', 'snow-tracks']) assert.ok(names.has(name), name);
  for (const child of group.children) if (child.geometry) assert.ok(Number.isFinite(child.geometry.boundingSphere?.radius ?? (child.geometry.computeBoundingSphere(), child.geometry.boundingSphere.radius)));
  assert.ok(group.children.length > 8, 'overlays, tracks and boards');
  assert.equal(JSON.stringify([course.features.obstacles, course.features.boards, course.features.surfacePatches]), before);
});


test('warm tarmac keeps summer neutral handling and winter penalties off legacy surfaces', () => {
  assert.equal(effectiveGrip('warm-tarmac','summer'),1);
  assert.equal(effectiveGrip('warm-tarmac','winter'),.82);
  assert.equal(tyreTopSpeedShare('warm-tarmac','winter'),.97);
  assert.equal(tyreTopSpeedShare('warm-tarmac','summer'),1);
  assert.equal(gripFor('warm-tarmac','winter').hint,'','the .82 starting setting is above the .80 hint threshold');
  assert.equal(SURFACES['warm-tarmac'].hint,'WARM TARMAC');
  assert.equal(surfaceCue('warm-tarmac'),null,'ordinary asphalt sound, no new event cue');
  assert.equal(effectiveGrip('asphalt','winter'),.94);
  assert.equal(tyreTopSpeedShare('asphalt','winter'),.97);
  assert.equal(effectiveGrip('snow','winter'),.7);
  const course=new Course(rect('warm-tarmac'),1989),group=new THREE.Group();
  addTrackScriptScene(group,course);
  const overlays=[];group.traverse(node=>{if(node.material?.name==='Warm tarmac road')overlays.push(node);});
  assert.equal(overlays.length,0,'warm tarmac draws as the existing asphalt with no overlay');
  assert.equal(course.gripKindAt(300,0),'warm-tarmac');
});

// QA-STOCK-SNOW: exercise the real stock planner, without a renderer or saves.
function stockPlan(kind, traction, speed, bend, speedLimit = 250, pitLane = undefined) {
  let input;
  const app = { _scriptedCrashDone: true, duel: {
    state: {status: 'racing', s: 100, lateral: -1, headingError: .04, speedMph: speed, traffic: []},
    car: CARS.falcone_f42, diff: {autoShift: true},
    course: {at: () => ({curvature: bend}), roadHalfWidthAt: () => 7, pitLane},
    _drivingSurface: () => ({gripKind: kind, traction, speedLimit}),
    setInput: value => { input = value; },
  }};
  App.prototype._driveAutopilot.call(app, DT);
  return input;
}

test('stock dry inputs retain the pre-fix planner fingerprint, including winter asphalt and low traction', () => {
  const rows = [];
  for (const kind of [undefined, 'asphalt', 'gravel', 'warm-tarmac'])
    for (const traction of [1, .94, .82, .55, .3])
      for (const speed of [20, 55, 85, 130, 200])
        for (const bend of [0, .003, .01, -.03])
          rows.push(stockPlan(kind, traction, speed, bend));
  assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'), 'e34f36062af5913457174832e002aba59c7edf43a759623cf704f224a7da2cca');
});

test('stock snow and ice planner brakes for actual grip but keeps the straight cap', () => {
  for (const [kind, traction] of [['snow', .7], ['snow', .525], ['ice', .425], ['ice', .4], ['deep-snow', .55]]) {
    const target = .85 * Math.sqrt(DRIVE.maxLateralAccel * CARS.falcone_f42.grip * traction / .01) / DRIVE.mphToWorld;
    const input = stockPlan(kind, traction, target + 10, .01);
    assert.equal(input.throttle, 0, kind);
    near(input.brake, .5, 1e-12, kind + ': brake for the lower corner speed');
    assert.equal(input.steer, stockPlan('asphalt', traction, target + 10, .01).steer, 'steering is untouched');
    assert.deepEqual(stockPlan(kind, traction, CARS.falcone_f42.topSpeed * .94 - 1, 0),
      stockPlan('asphalt', traction, CARS.falcone_f42.topSpeed * .94 - 1, 0), 'existing straight cap stays exact');
  }
});

test('stock Tremblant Snow completes with every corner above 20 mph and no Beaver stop', () => {
  const def = COURSE.find(item => item.id === 'tremblant-snow');
  assert.ok(def);
  const minima = new Map();
  const result = driveCircuit(def, {driver: 'stock', tyre: 'winter', opponentCount: 0,
    onTick(state, duel) {
      const station = duel.course.phase(state.s);
      for (const piece of duel.course.script.pieces) {
        if (piece.kind === 'turn' && station >= piece.arcStart && station <= piece.arcEnd)
          minima.set(piece.name, Math.min(minima.get(piece.name) ?? Infinity, state.speedMph));
      }
    }});
  assert.equal(result.completed, true, JSON.stringify(result));
  assert.ok(minima.has('Beaver Hairpin'));
  for (const [corner, mph] of minima) assert.ok(mph >= 20, corner + ': ' + mph + ' mph');
  assert.equal(result.maxStuckSeconds, 0);
});

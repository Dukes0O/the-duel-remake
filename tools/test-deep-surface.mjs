import assert from 'node:assert/strict';
import test from 'node:test';
import { CARS, DRIVE, BOOST } from '../src/config.js';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';
import { buildTrackScript, TrackScriptError } from '../src/track-script.js';
import { SURFACES, SURFACE_KINDS, gripFor, gripReadout } from '../src/race-surfaces.js';

const DT = 1 / 120;
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-10,
  `${label}: ${actual} differs from ${expected}`);
const def = { id: 'test-deep-surface', name: 'Test only', kind: 'circuit', closed: true,
  airborne: false, theme: 'alpine', noTraffic: true, hasRival: false, hasRadar: false,
  script: [['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100],
    ['straight', 4000], ['turn', 'L', 90, 100], ['straight', 500], ['turn', 'L', 90, 100]] };
function start(car, { kind = 'sea-floor', enabled = true, tyre = 'summer' } = {}) {
  const duel = new Duel({ seed: 1989, car, featureFlags: { 'the-deep': enabled } });
  duel.startCampaign({ car, opponentCount: 0, tyre });
  duel.course = new Course(def);
  // The future zone supplies this existing adapter; no circuit uses sea-floor.
  duel.course.gripKindAt = () => kind;
  Object.assign(duel.state, { status: 'racing', s: 300, prevS: 300, lateral: 0,
    countdown: 0, traffic: [], speedMph: 10, gear: 0 });
  return duel;
}
const damage = state => structuredClone({ lives: state.lives, damageZones: state.damageZones,
  majorCrashes: state.majorCrashes, stageCrashes: state.stageCrashes, score: state.score });

test('sea-floor data and asphalt tyres keep legacy surfaces, appended warm tarmac and ordinary readouts exact', () => {
  assert.deepEqual(SURFACE_KINDS, ['asphalt', 'gravel', 'snow', 'ice', 'deep-snow', 'warm-tarmac']);
  assert.equal(SURFACES['sea-floor'].column, 'asphalt');
  const sea = gripFor('sea-floor');
  near(sea.grip, .75, 'summer grip');
  near(gripFor('sea-floor', 'winter').grip, .75 * .94, 'winter grip');
  assert.equal(sea.hint, 'SEA FLOOR');
  assert.equal(sea.topShare, .7);
  assert.deepEqual(gripFor('asphalt'), { kind: 'asphalt', grip: 1, topSpeedMph: null,
    topShare: 1, hint: '', cue: null, active: false });
  assert.deepEqual(SURFACE_KINDS.map(kind => SURFACES[kind].grip), [1, .85, .7, .5, .55, 1]);
  assert.throws(() => buildTrackScript({ ...def, script: [['straight', 4000, { surface: 'sea-floor' }]] }), TrackScriptError);
  assert.throws(() => new Course({ ...def, surfacePatches: [{ id: 'zone-on-road', kind: 'sea-floor',
    s0: 400, s1: 450, from: -3, to: 3 }] }), /unknown surface/);
  const duel = start('falcone_f42');
  assert.equal(gripReadout(duel).hint, 'SEA FLOOR');
  const off = start('falcone_f42', { enabled: false });
  assert.equal(gripReadout(off).hint, '');
  assert.equal(gripReadout(off).kind, 'asphalt');
});

test('every car keeps its own thrust, steering grip and strict speed ceiling including boost', () => {
  for (const id of Object.keys(CARS)) for (const tyre of ['summer', 'winter']) {
    const duel = start(id, { tyre }), st = duel.state, car = duel.car;
    const surface = duel._drivingSurface(st.s, st.lateral);
    near(surface.traction, .75 * (tyre === 'winter' ? .94 : 1), `${id} traction`);
    near(surface.speedLimit, car.topSpeed * .7, `${id} surface cap`);
    duel.setInput({ throttle: 1, brake: 0, steer: 0, boost: false });
    duel._drive(DT);
    near(st.speedMph, 10 + car.accel * DRIVE.accelScale * .6 * DT - DRIVE.dragCoeff * .2 * DT, `${id} thrust`);
    Object.assign(st, { speedMph: -1, gear: -1 });
    duel.setInput({ throttle: 0, brake: 1 });
    duel._drive(DT);
    near(st.speedMph, -1 - DRIVE.reverseAccel * .6 * DT + DRIVE.dragCoeff * .2 * DT, `${id} reverse`);
    const boosted = start(id, { tyre }), unboosted = start(id, { tyre });
    for (const run of [boosted, unboosted]) {
      Object.assign(run.state, { speedMph: 40, gear: 1 });
      run.setInput({ throttle: 1, brake: 0, steer: 0, boost: run === boosted });
      run._drive(DT);
    }
    assert.equal(boosted.state.boosting, true);
    near(boosted.state.speedMph - unboosted.state.speedMph,
      BOOST.accelMphPerSec * (1 + boosted.state.upgrades.nitro * .15) * (car.nitroAcceleration ?? 1) * .6 * DT, `${id} boost thrust`);
    for (const boost of [false, true]) {
      Object.assign(st, { speedMph: car.topSpeed * 1.3, gear: car.gears.length - 1, boost: 1 });
      duel.setInput({ throttle: 1, brake: 0, steer: 0, boost });
      duel._drive(DT);
      assert.ok(st.speedMph <= car.topSpeed * .7 + 1e-10, `${id} boost=${boost} cap`);
      for (let i = 0; i < 300; i++) duel._drive(DT);
      assert.ok(st.speedMph <= car.topSpeed * .7 + 1e-10, `${id} sustained cap`);
    }
    const straight = start(id), turn = start(id);
    straight.setInput({ throttle: 0, brake: 0, steer: 0 });
    turn.setInput({ throttle: 0, brake: 0, steer: 1 });
    straight._drive(DT); turn._drive(DT);
    near((10 - turn.state.speedMph) / (10 - straight.state.speedMph), 1.4, `${id} turn drag`);
  }
});

test('every car gets one-third gravity and a single harmless landing event', () => {
  for (const id of Object.keys(CARS)) {
    const duel = start(id), st = duel.state, events = [];
    duel.onChange((state, event) => events.push(event));
    Object.assign(st, { speedMph: 70, airborne: true, airHeight: 10,
      _jumpY: duel._supportAt(st.s, st.lateral).y + 10, _verticalSpeed: 0 });
    const original = damage(st), initialY = st._jumpY;
    duel._jump(st, DT);
    near(st._verticalSpeed, -6 * DT, `${id} gravity`);
    near(st._jumpY, initialY - 3 * DT * DT, `${id} flight position`);
    // Hard landing tests immunity independently of speed and impact velocity.
    st._jumpY = duel._supportAt(st.s, st.lateral).y + .001;
    st._verticalSpeed = -100;
    duel._jump(st, DT);
    assert.equal(st.airborne, false);
    assert.equal(st.airHeight, 0);
    assert.deepEqual(damage(st), original);
    assert.deepEqual(events.filter(event => event.deepLanded), [{ deepLanded: { speed: 70, cue: 'deep.sand-land' } }]);
    duel._jump(st, DT);
    assert.equal(events.filter(event => event.deepLanded).length, 1);
  }
});

test('flag off and flag on outside the zone retain identical drive and jump behavior', () => {
  for (const id of Object.keys(CARS)) {
    const off = start(id, { enabled: false }), asphalt = start(id, { kind: 'asphalt' });
    assert.deepEqual(off._roadGrip(300, 0), asphalt._roadGrip(300, 0));
    assert.deepEqual(off._drivingSurface(300, 0), asphalt._drivingSurface(300, 0));
    for (const duel of [off, asphalt]) duel.setInput({ throttle: .8, brake: 0, steer: .1, boost: true });
    for (let i = 0; i < 120; i++) { off._drive(DT); asphalt._drive(DT); }
    assert.deepEqual(off.state, asphalt.state);
    for (const duel of [off, asphalt]) {
      Object.assign(duel.state, { airborne: true, airHeight: 10, _jumpY: 20, _verticalSpeed: 2 });
      duel.course.def = { ...duel.course.def, airborne: true };
      duel._jump(duel.state, DT);
    }
    assert.deepEqual(off.state, asphalt.state);
    near(off.state._verticalSpeed, 2 - 18 * DT, `${id} normal gravity`);
  }
});

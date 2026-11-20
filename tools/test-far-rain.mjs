// FAR-RAIN: the rain is drawing and sound only. A world job driven with the rain falling (and the rain handed a state it
// cannot write to) replays exactly as it does dry, and no released course ever enables the rain, whatever the switches
// say. Then the arrival: one drop on the glass first, then more, then wet ground and puddles, with the sound coming in
// slowly behind it.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {Duel} from '../src/game.js';
import {createRainArrival} from '../src/render/rain-arrival.js';
import {createRainGlass} from '../src/render/rain-glass.js';
import {RAIN_LOOK} from '../src/render/rain-look.js';
import {RAIN_REGIONS, rainPlace, rainWanted} from '../src/render/rain-regions.js';
import {createRainSky} from '../src/render/rain-sky.js';
import {createRainView} from '../src/render/rain-view.js';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame ??= () => {};
let checks = 0;
const check = (fn, label) => { fn(); checks++; if (process.env.VERBOSE) console.log('ok', label); };

// A view of the state that throws on any write, however deep.
function readOnly(target, path = 'state') {
  const seen = new WeakMap();
  const wrap = (value, where) => {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const proxy = new Proxy(value, {
      get(object, key) {
        const found = Reflect.get(object, key);
        return typeof found === 'function' ? found : wrap(found, `${where}.${String(key)}`);
      },
      set(_object, key) { throw Error(`The rain wrote ${where}.${String(key)}`); },
      deleteProperty(_object, key) { throw Error(`The rain deleted ${where}.${String(key)}`); },
      defineProperty(_object, key) { throw Error(`The rain defined ${where}.${String(key)}`); },
    });
    seen.set(value, proxy);
    return proxy;
  };
  return wrap(target, path);
}

function fingerprint(state) {
  const seen = new WeakSet();
  const text = JSON.stringify(state, (key, value) => {
    if (typeof value === 'function') return undefined;
    if (value && typeof value === 'object') { if (seen.has(value)) return '[seen]'; seen.add(value); }
    return typeof value === 'number' && !Number.isFinite(value) ? String(value) : value;
  });
  return createHash('sha256').update(text).digest('hex');
}

const FLAGS = {'hidden-road': true, 'story-everburn': true, arsenal: true, 'arsenal-wave3': true, 'far-rain': true};
function hotDelivery() {
  values.clear();
  const app = new App(); app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: FLAGS});
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
  assert.equal(app._saveProfile(), true);
  const state = app.duel.state;
  state.status = 'exploring'; state.playerId = app.player.id;
  state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
  assert.equal(app.everburnStep('read'), true);
  assert.equal(app.everburnStep('hot-delivery'), true);
  assert.equal(app.duel.state.arena.mode, 'world-job');
  return app;
}

// Drive the same job twice with the same inputs: once dry, once with the rain drawn every frame.
function drive({rain}) {
  const app = hotDelivery(), scene = new THREE.Scene(), host = {};
  scene.fog = new THREE.Fog(0xb5bcbd, 200, 1500);
  const camera = new THREE.PerspectiveCamera(54, 16 / 9, .15, 2400);
  const view = rain ? createRainView({scene, qa: true, host}) : null;
  if (rain) host.__rain.start('far-side'), host.__rain.hold(false);
  const prints = [], dt = 1 / 60;
  let wantedFrames = 0, beads = 0, added = 0;
  for (let frame = 0; frame < 900; frame++) {
    const phase = Math.floor(frame / 150);
    app.duel.setInput({throttle: phase % 3 === 2 ? 0 : 1, brake: phase % 3 === 2 ? .6 : 0, steer: [0, .35, -.25, 0, .5, -.4][phase]});
    app.advance(dt);
    if (view) {
      const state = app.duel.state, course = app.duel.course;
      const p = course.worldAt(state.s, state.lateral);
      camera.position.set(p.x - Math.sin(p.heading) * 8.7, p.y + 3.6, p.z - Math.cos(p.heading) * 8.7);
      camera.lookAt(p.x, p.y + 1, p.z); camera.updateMatrixWorld();
      app.cameraMode = frame < 450 ? 'hood' : 'chase';
      if (view.update({app, state: readOnly(state), course, camera, dt})) added++;
      if (host.__rain.status().wanted) wantedFrames++;
      beads = Math.max(beads, host.__rain.status().beads);
    }
    if (frame % 30 === 29) prints.push(fingerprint(app.duel.state));
  }
  return {prints, wantedFrames, beads, added, status: host.__rain?.status(), scene};
}

check(() => {
  const dry = drive({rain: false}), wet = drive({rain: true});
  assert.ok(wet.wantedFrames > 850, 'the rain really fell on the wet run');
  assert.ok(wet.beads > 1, 'and more beads than the first drop were on the glass');
  assert.ok(wet.status.wet > 0, 'and the ground was wetting');
  assert.ok(wet.status.tilesReady > 0, 'and wet ground was laid on the real ground');
  assert.equal(wet.added, 1, 'the rain adds its meshes once');
  assert.equal(dry.prints.length, 30);
  assert.deepEqual(wet.prints, dry.prints, 'a world job replays exactly with the rain drawn');
}, 'a replay with rain on matches one with it off');

// No released course rains: not with the switch on, not with every region forced, not with a step asking for rain.
check(() => {
  const released = new Set(COURSE.map(event => event.id));
  for (const id of Object.keys(RAIN_REGIONS)) assert.ok(!released.has(id), `${id} is a region, not a course`);
  const all = () => true, scene = new THREE.Scene(), host = {};
  const view = createRainView({scene, qa: true, host}), camera = new THREE.PerspectiveCamera();
  const lit = {fog: 0xdec1a0, top: '#466d86', horizon: '#f6bc82', ground: 0x714226, sun: 3.3, hemi: 1.65, env: .85};
  for (const [index, event] of COURSE.entries()) {
    const duel = new Duel({seed: 7});
    duel.featureFlags = createFeatureFlags({storage: null, overrides: Object.fromEntries(Object.keys(FEATURE_STATES).map(name => [name, true]))});
    duel.startCampaign({startStage: index, seed: 7, mode: 'duel'});
    const state = duel.state, course = duel.course;
    assert.equal(course.def.id, event.id);
    for (const regionId of [null, ...Object.keys(RAIN_REGIONS)]) for (const weather of [null, 'rain', 'rain-night']) {
      const place = {...(rainPlace(state, course) ?? {courseId: course.def.id}), regionId, weather};
      assert.equal(rainWanted(place, {enabled: all, released, forcedRegion: regionId}), false, `${event.id} never rains`);
    }
    host.__rain.start('far-side'); host.__rain.hold(false);
    for (let frame = 0; frame < 3; frame++) assert.equal(view.update({app: {duel}, state: readOnly(state), course, camera, dt: 1 / 60}), false);
    assert.equal(host.__rain.status().wanted, false, `${event.id}: forced rain is refused`);
    assert.equal(view.lighting(lit), lit, `${event.id}: the light is the course's own, the same object`);
  }
  assert.equal(scene.getObjectByName('Rain (FAR-RAIN)').children.length, 0, 'nothing was built for any released course');
  // And for players the switch is off.
  assert.equal(createFeatureFlags({storage: null, qa: false}).enabled('far-rain'), false);
  assert.equal(FEATURE_STATES['far-rain'], 'dev');
}, 'a released course never enables it');

// The arrival, on the rain's own clock.
check(() => {
  const look = RAIN_LOOK.arrival, arrival = createRainArrival(look);
  const glass = createRainGlass({kind: 'windscreen', capacity: RAIN_LOOK.glass.beads});
  const window = {width: 760, height: 430};
  let soundBefore = -1, wetAt = null, puddlesAt = null, ones = 0, seenMore = false;
  for (let t = 0; t < 200; t += 1 / 30) {
    const before = arrival.levels.elapsed, levels = arrival.step(1 / 30, {raining: true});
    if (arrival.firstDropBetween(before, levels.elapsed)) glass.drop(0, 0, RAIN_LOOK.glass.firstDropRadiusMm, {sits: true});
    glass.step(1 / 30, {rate: levels.drops * RAIN_LOOK.glass.hitsPerSecond, ...window});
    if (levels.elapsed < look.firstDropAt) assert.equal(glass.count, 0, 'nothing on the glass before the first drop');
    else if (levels.elapsed < look.secondDropAt) { assert.equal(glass.count, 1, 'a single drop, alone'); ones++; }
    if (levels.elapsed > look.dropsFullAt) seenMore ||= glass.count > 20;
    assert.ok(levels.sound >= soundBefore - 1e-9, 'the sound only comes in'); soundBefore = levels.sound;
    if (levels.elapsed < look.firstDropAt) assert.equal(levels.sound, 0, 'silence before the first drop');
    if (wetAt === null && levels.wet > .05) wetAt = levels.elapsed;
    if (puddlesAt === null && levels.puddles > .05) puddlesAt = levels.elapsed;
  }
  assert.ok(ones > 30, 'the first drop sits alone on the glass for a while');
  assert.ok(seenMore, 'then many');
  assert.ok(wetAt > look.firstDropAt && puddlesAt > wetAt, 'the ground wets after the first drop, and the puddles after that');
  const sound = createRainArrival(look);
  sound.step(look.firstDropAt + 4, {raining: true});
  assert.ok(sound.levels.sound < .05, 'the sound comes in slowly');
  // Once it stops, the ground stays wet a long while.
  const wet = arrival.levels.wet;
  arrival.step(30, {raining: false});
  assert.ok(arrival.levels.wet > wet * .8 && arrival.levels.drops === 0, 'the ground dries slowly after the rain');
}, 'one drop first, then more, then wet ground and puddles, the sound slowly');

// The sky closes over in proportion, and returns the very same settings when there is no rain.
check(() => {
  const sky = createRainSky(), day = {fog: 0xdec1a0, top: '#466d86', horizon: '#f6bc82', ground: 0x714226, sunColor: 0xffddac,
    cloudTint: [.88, .89, .86], sun: 3.3, hemi: 1.65, env: .85, exposure: 1.04, bloom: .18, fogNear: 260, fogFar: 1650, sunStrength: 1, cloudCover: 1};
  assert.equal(sky.apply(day), day);
  sky.amount = 1;
  const grey = sky.apply(day);
  assert.ok(grey.sun < day.sun * .2 && grey.fogFar < day.fogFar, 'the sun goes in and the distance closes');
  const fog = new THREE.Color().setRGB(...grey.fog), saturation = 1 - Math.min(fog.r, fog.g, fog.b) / Math.max(fog.r, fog.g, fog.b);
  assert.ok(saturation < .25, 'the sky is grey, a little cool, not the desert colour');
  const night = sky.apply({...day, fog: 0x101820}), nightFog = new THREE.Color().setRGB(...night.fog);
  assert.ok(nightFog.r + nightFog.g + nightFog.b < fog.r + fog.g + fog.b, 'rain never lights up a night');
}, 'the grey sky');

console.log(`FAR-RAIN: ${checks} checks passed.`);

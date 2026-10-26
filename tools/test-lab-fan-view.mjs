import {readFileSync} from 'node:fs';
import {Group, PerspectiveCamera} from 'three';
import {WALK, WALK_LAYOUT, machineApproaches, brianPosition} from '../src/lab/lab-walk.js';
// The view's audio must load on demand and never outlive the Lab room.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFanSound, createFanRoom, fanView, fanEntry, fanMarkup, fanLoad} from '../src/lab/fan-view.js';
import {TUNNEL_LESSONS} from '../src/lab/lab-lessons.js';

test('secret page has no trace until all five lessons, including forged REVERSE', () => {
  for (let subset = 0; subset < 32; subset++) {
    const done = Object.fromEntries(TUNNEL_LESSONS.map((id, index) => [id, !!(subset & (1 << index))]));
    const profile = {lab: {version: 1, done, secret: {reverse: true}}};
    const view = fanView(profile, {enabled: () => true});
    assert.equal(view.open, subset === 31);
    if (subset !== 31) { assert.equal(fanEntry(view, 'grip'), ''); assert.equal(fanMarkup(view, 100), ''); }
    assert.equal(fanView(profile, {enabled: () => false}).open, false);
  }
  assert.equal(fanLoad(0), 1000); assert.equal(fanLoad(100), 3000);
});

function soundApp() {
  const sources = [], gains = [], reverse = {plays: 0, stops: 0};
  const app = {audio: {muted: false, cueBuffers: {'lab.fan': {}, 'lab.reverse': {}}, master: {},
    context: {
      createBufferSource() { const source = {playbackRate: {}, starts: 0, stops: 0, disconnects: 0,
        connect() {}, start() {this.starts++;}, stop() {this.stops++;}, disconnect() {this.disconnects++;}}; sources.push(source); return source; },
      createGain() { const gain = {gain: {}, disconnects: 0, connect() {}, disconnect() {this.disconnects++;}}; gains.push(gain); return gain; },
    },
    _playCue(id) { assert.equal(id, 'lab.reverse'); reverse.plays++; return {stop() { reverse.stops++; }}; },
  }};
  return {app, sources, gains, reverse};
}

test('one fan loop follows power and stops on leaving; a late start is cancelled', async () => {
  const {app, sources, gains, reverse} = soundApp(), sound = createFanSound(app);
  sound.bench(0); await Promise.resolve();
  assert.equal(sources.length, 1); assert.equal(sources[0].loop, true); assert.equal(sources[0].starts, 1);
  sound.bench(100); assert.equal(sources.length, 1); assert.equal(sources[0].playbackRate.value, 1.5);
  sound.reverse(); await Promise.resolve(); assert.equal(reverse.plays, 1);
  sound.stop(); assert.equal(sources[0].stops, 1); assert.equal(gains[0].disconnects, 1); assert.equal(reverse.stops, 1);
  sound.bench(100); sound.stop(); await Promise.resolve(); assert.equal(sources.length, 1);
  sound.reverse(); sound.stop(); await Promise.resolve(); assert.equal(reverse.plays, 1);
  sound.bench(50); await Promise.resolve(); sound.bench(null); assert.equal(sources[1].stops, 1);
});

test('file cues load only on demand and a closed room refuses late decoded audio', async () => {
  const {app, sources, reverse} = soundApp(); app.audio.cueBuffers = {};
  const previous = globalThis.fetch, urls = [];
  let finish;
  app.audio.context.decodeAudioData = () => new Promise(resolve => { finish = resolve; });
  globalThis.fetch = async url => { urls.push(url); return {ok: true, arrayBuffer: async () => new ArrayBuffer(1)}; };
  try {
    const sound = createFanSound(app);
    assert.deepEqual(urls, []);
    sound.bench(50);
    for (let i = 0; i < 6; i++) await Promise.resolve();
    sound.stop(); finish({});
    for (let i = 0; i < 6; i++) await Promise.resolve();
    assert.deepEqual(urls, ['/assets/audio/lab/fan.ogg']);
    assert.equal(sources.length, 0); assert.equal(reverse.plays, 0);
  } finally { globalThis.fetch = previous; }
});

test('opening muted then unmuting starts the fan; muting stops and unmuting resumes', async () => {
  const {app, sources} = soundApp(), sound = createFanSound(app);
  app.audio.muted = true; sound.bench(0); await Promise.resolve(); assert.equal(sources.length, 0);
  app.audio.muted = false; sound.bench(100);
  for (let i = 0; i < 4; i++) await Promise.resolve();
  assert.equal(sources.length, 1); assert.equal(sources[0].playbackRate.value, 1.5);
  app.audio.muted = true; sound.bench(100); assert.equal(sources[0].stops, 1);
  app.audio.muted = false; sound.bench(100); await Promise.resolve();
  assert.equal(sources.length, 2); sound.stop();
});

test('walking fan demonstration stays on the relocated scaled tunnel with its camera inside the hall', async () => {
  for (const walking of [false, true]) {
    const scene = new Group(), car = new Group(); car.name = 'test-fan-car';
    const manifest = {layout: {'wind-tunnel': {x: 8.6, z: -6.3}}};
    const room = createFanRoom({scene, manifest, walking, part: () => null, alive: () => true,
      load: async () => new Group(), loadCar: async () => () => car, release() {},
      host: {}, camera: new PerspectiveCamera()});
    room.update({open: true, reverse: true, page: true, setting: 100});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(room.frame(0).car, 'ready');
    const [x, z] = walking ? WALK_LAYOUT['wind-tunnel'] : [8.6, -6.3], scale = walking ? WALK.scale : 1;
    assert.deepEqual(car.scale.toArray(), [scale, scale, scale]);
    assert.equal(car.position.x, x - .5 * scale); assert.equal(car.position.z, z);
    assert.equal(car.position.y, (.38 - .045) * scale);
    const pose = room.pose();
    assert.equal(pose.target[0], car.position.x); assert.equal(pose.target[2], car.position.z);
    if (walking) {
      assert.ok(Math.abs(pose.position[0]) < 15 && Math.abs(pose.position[2]) < 9, 'camera remains within the hall');
      assert.ok(Math.hypot(pose.target[0] - x, pose.target[2] - z) < 1, 'view targets the real tunnel');
      const hall = JSON.parse(readFileSync(new URL('../public/assets/models/lab/manifest.json', import.meta.url)));
      const bounds = hall.models.filter(m => WALK_LAYOUT[m.id]).map(m => {
        const [x, z] = WALK_LAYOUT[m.id], b = m.footprint;
        return {id: m.id, minX: x + b.minX*WALK.scale, maxX: x + b.maxX*WALK.scale,
          minZ: z + b.minZ*WALK.scale, maxZ: z + b.maxZ*WALK.scale};
      });
      const bound = bounds.find(b => b.id === 'wind-tunnel');
      const [sx, sz] = machineApproaches(bound, bounds, hall.hall)[0];
      const brian = brianPosition({x: sx, z: sz, bound}, bounds, hall.hall);
      const dx = pose.target[0]-pose.position[0], dz = pose.target[2]-pose.position[2];
      const t = Math.max(0, Math.min(1, ((brian[0]-pose.position[0])*dx + (brian[1]-pose.position[2])*dz)/(dx*dx+dz*dz)));
      const clearance = Math.hypot(brian[0]-pose.position[0]-t*dx, brian[1]-pose.position[2]-t*dz);
      assert.ok(clearance > .75, 'Brian cannot obscure the retained fan-car view');
    }
    room.dispose();
  }
});

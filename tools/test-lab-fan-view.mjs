// The view's audio must load on demand and never outlive the Lab room.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFanSound, fanView, fanEntry, fanMarkup, fanLoad} from '../src/lab/fan-view.js';
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

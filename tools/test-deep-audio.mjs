import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createDeepAudio, DEEP_CUE_IDS, deepEngineCutoff} from '../src/deep/deep-audio.js';
import {EngineAudio} from '../src/audio.js';
import {DEEP_RECIPES} from './audio/build-deep.mjs';
import {ffmpeg} from './audio/codec.mjs';
import {measureLoudness, loopSeam} from './audio/measurements.mjs';
// test-reads: public/assets/audio/deep/ tools/audio/catalog.json

const expected = ['deep.splash', 'deep.engine-muffle', 'deep.bubbles', 'deep.sand-land',
  'deep.logged', 'deep.pearl', 'deep.whale', 'deep.cave'];
assert.deepEqual(DEEP_CUE_IDS, expected);
assert.deepEqual(DEEP_RECIPES.map(spec => spec.id), expected);
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url)));
const rows = catalog.sounds.filter(row => row.cue?.startsWith('deep.'));
assert.equal(rows.length, 8);
assert.deepEqual(readdirSync(new URL('../public/assets/audio/deep/', import.meta.url)).sort(),
  expected.map(id => SOUND_BANK[id].file.split('/').at(-1)).sort());
for (const spec of DEEP_RECIPES) {
  const cue = SOUND_BANK[spec.id], row = rows.find(row => row.cue === spec.id);
  assert.equal(cue.flag, 'the-deep');
  assert.equal(cue.loop === true, spec.loop);
  assert.equal(row.license, 'CC0 1.0');
  assert.equal(row.key, spec.source);
  assert.match(row.page, /^https:\/\/freesound.org\/people\//);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.runtime.file, 'public/assets/audio/' + cue.file);
  const bytes = readFileSync(new URL('../' + row.runtime.file, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.runtime.sha256);
  assert.equal(bytes.length, row.runtime.bytes);
  const measured = measureLoudness(bytes);
  assert(measured.available && measured.truePeakDbtp <= -1, spec.id + ' encoded true peak');
  assert(Math.abs(measured.integratedLufs - spec.loudness) <= 2, spec.id + ' encoded loudness');
  if (spec.loop) {
    assert.equal(bytes.toString('ascii', 0, 4), 'fLaC', 'seamless lossless loop');
    const pcm = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], {input: bytes});
    const samples = Float32Array.from({length: pcm.length / 4}, (_, i) => pcm.readFloatLE(i * 4));
    assert(loopSeam([samples], 48000).pass, spec.id + ' decoded loop boundary');
  } else assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
}

class Param {
  constructor(value = 0) { this.value = value; }
  setTargetAtTime(value, time, constant) { assert(Number.isFinite(value + time) && constant > 0); this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class Node {
  constructor() {
    this.gain = new Param(1); this.frequency = new Param(); this.Q = new Param();
    this.playbackRate = new Param(1); this.delayTime = new Param(); this.pan = new Param();
    for (const name of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[name] = new Param();
    this.connections = [];
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.connections = []; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
function context() {
  const nodes = [];
  const node = () => { const n = new Node(); nodes.push(n); return n; };
  return {nodes, currentTime: 0, state: 'running', sampleRate: 48000, destination: {},
    createGain: node, createBufferSource: node, createOscillator: node, createBiquadFilter: node,
    createDelay: node, createStereoPanner: node, createDynamicsCompressor: node, createWaveShaper: node,
    createBuffer: (channels, count, rate) => ({duration: count / rate, getChannelData: () => new Float32Array(count)}),
    decodeAudioData: async () => ({duration: 3})};
}
let flag = true;
const ctx = context(), tracked = [], requests = [];
const audio = {flags: {enabled: () => flag}, context: ctx, muted: false, paused: false,
  mixer: {output: id => SOUND_BANK[id].bus, disconnect: node => node.disconnect(), track: (id, voice) => {tracked.push({id, voice}); return () => {}; }},
  _connect: (node, output) => node.connect(output), _disconnect: node => node.disconnect()};
globalThis.fetch = async url => { requests.push(url); return {ok: !url.includes('sand-land'), arrayBuffer: async () => new ArrayBuffer(2)}; };
const adapter = createDeepAudio({audio});
const state = Object.freeze({status: 'exploring', paused: false});
flag = false;
adapter.update(state, {deepDepth: 8});
await adapter.load();
assert.equal(requests.length, 0, 'disabled Deep makes no request');
flag = true;
adapter.update(state, {deepDepth: 0});
assert.equal(requests.length, 0, 'ordinary course makes no request');
adapter.update(state, {deepDepth: 1});
const loaded = await adapter.load();
assert.equal(loaded.filter(row => row.status === 'rejected').length, 1, 'one missing asset is isolated');
assert.equal(requests.length, 8);
const entered = Object.freeze({deepEntered: Object.freeze({zoneId: 'kelp-coast'})});
adapter.event(entered, state);
adapter.event(entered, state);
assert.deepEqual(tracked.map(row => row.id), ['deep.splash', 'deep.engine-muffle']);
adapter.update(state, {deepDepth: 8});
adapter.update(state, {deepDepth: 8});
assert.equal(tracked.filter(row => row.id === 'deep.bubbles').length, 1, 'one bubble loop per visit');
adapter.event(Object.freeze({deepLanded: Object.freeze({speed: 8})}), state);
assert.equal(tracked.filter(row => row.id === 'deep.sand-land').length, 0, 'missing file causes no fallback placeholder');
const logged = Object.freeze({deepLogged: Object.freeze({creature: 'turtle'})});
adapter.event(logged, state); adapter.event(logged, state);
adapter.event(Object.freeze({deepPearl: Object.freeze({pearl: 'kelp-1'})}), state);
assert.equal(tracked.filter(row => row.id === 'deep.logged').length, 1);
assert.equal(tracked.filter(row => row.id === 'deep.pearl').length, 1);
adapter.event({deepPlace: {place: {id: 'cave', sound: 'deep.cave'}}}, state);
adapter.update(state, {deepDepth: 20});
assert.equal(tracked.filter(row => row.id === 'deep.cave').length, 1);
adapter.event({deepPlace: {place: {id: 'drop', sound: 'deep.whale'}}}, state);
adapter.update(state, {deepDepth: 30});
assert(tracked.filter(row => row.id === 'deep.cave').every(row => !row.voice.active), 'leaving cave stops its bed');
adapter.event({deepPlace: {place: {id: 'drop', sound: 'deep.whale'}}}, state);
assert.equal(tracked.filter(row => row.id === 'deep.whale').length, 1, 'whale cooldown');
audio.paused = true;
adapter.update(state, {deepDepth: 8});
assert(tracked.every(row => !row.voice.active), 'pause stops all Deep voices');
const mutedPearl = {deepPearl: {pearl: 'kelp-2'}};
adapter.event(mutedPearl, state);
audio.paused = false;
adapter.event(mutedPearl, state);
assert.equal(tracked.filter(row => row.id === 'deep.pearl').length, 1, 'missed event is not replayed');
adapter.update(state, {deepDepth: 8});
audio.muted = true;
adapter.update(state, {deepDepth: 8});
assert(tracked.every(row => !row.voice.active), 'mute stops loops');
audio.muted = false;
adapter.update(state, {deepDepth: 8});
flag = false;
adapter.update(state, {deepDepth: 8});
assert(tracked.every(row => !row.voice.active), 'switch-off clears visit');
flag = true;
adapter.update(state, {deepDepth: 8});
assert(tracked.every(row => !row.voice.active), 'switch-on cannot resurrect visit');
adapter.event({deepEntered: {zoneId: 'reef'}}, state);
adapter.update(state, {deepDepth: 8});
audio.context.state = 'suspended';
adapter.update(state, {deepDepth: 8});
assert(tracked.every(row => !row.voice.active), 'suspended context clears voices');
audio.context.state = 'running';
adapter.update(state, {deepDepth: 8});
const oldSources = ctx.nodes.filter(node => node.started && node.buffer);
audio.context = context();
adapter.update(state, {deepDepth: 8});
await adapter.load();
adapter.update(state, {deepDepth: 8});
assert(oldSources.every(node => node.stopped), 'context replacement stops old sources');
for (const node of oldSources) node.onended?.();
assert(oldSources.every(node => node.connections.length === 0), 'ended old sources disconnect');
adapter.event({deepExited: {zoneId: 'reef'}}, state);
assert(tracked.every(row => !row.voice.active), 'exit clears voices');
adapter.dispose();
const before = tracked.length;
adapter.event(entered, state); adapter.update(state, {deepDepth: 8});
assert.equal(tracked.length, before, 'disposed adapter remains silent');
assert.deepEqual(entered, {deepEntered: {zoneId: 'kelp-coast'}}, 'input is unchanged');
for (const depth of [undefined, 0, -1, NaN, Infinity]) assert.equal(deepEngineCutoff(2400, depth, true), 2400);
assert.equal(deepEngineCutoff(2400, 8, false), 2400);
assert.equal(deepEngineCutoff(2400, 8, true), 520);
assert.equal(deepEngineCutoff(200, 8, true), 200);

// Exercise the real EngineAudio update with loaded recorded and synth paths.
const ordinaryRequests = [];
globalThis.fetch = async url => { ordinaryRequests.push(url); return {ok: false}; };
globalThis.localStorage = {getItem: () => null};
const host = new EngineAudio({flags: {enabled: id => id === 'the-deep' && flag}});
host._build(context());
await Promise.allSettled([host._samplesPromise, host._cueBuffersPromise, host._ambiencePromise]);
assert(!ordinaryRequests.some(url => url.includes('/deep/')), 'ordinary loader never fetches Deep files');
assert(ordinaryRequests.some(url => url.includes('crossbow-pew-a.ogg')), 'ordinary recorded cues still load');
for (const key of ['idle', 'loadLow', 'loadMid', 'loadHigh', 'coast', 'engine'])
  host.samples[key] = {source: new Node(), gain: new Node(), filter: new Node(),
    body: {filter: new Node(), gain: new Node()}, intake: {filter: new Node(), gain: new Node()}};
const drive = Object.freeze({car: 'falcone_f42', status: 'racing', paused: false,
  speedMph: 100, revs: 1, input: Object.freeze({throttle: 1, brake: 0}), gear: 2,
  steerVisual: 0, impactTimer: 0, airborne: false, slipAngle: 0, police: Object.freeze({beep: 0})});
const filters = () => [host.engineFilter.frequency.value, ...Object.values(host.samples).flatMap(sample =>
  [sample.filter.frequency.value, sample.body.filter.frequency.value, sample.intake.filter.frequency.value])];
flag = false;
host.update(drive, {deepDepth: 8});
const ordinary = filters();
flag = true;
host.update(drive, {});
assert.deepEqual(filters(), ordinary, 'flag alone changes no ordinary engine target');
host.update(drive, {deepDepth: 8});
// Coast intake is already silent and keeps its previous target.
assert(host.engineFilter.frequency.value <= 520);
for (const [key, sample] of Object.entries(host.samples)) {
  assert(sample.filter.frequency.value <= 520, key + ' main');
  assert(sample.body.filter.frequency.value <= 520, key + ' body');
  if (key !== 'coast') assert(sample.intake.filter.frequency.value <= 520, key + ' intake');
}
host.update(drive, {deepDepth: 0});
assert.deepEqual(filters(), ordinary, 'exiting restores exact ordinary targets');
console.log('DEEP-AUDIO: eight encoded assets, provenance/levels/seams, read-only event lifecycle and real engine filters pass.');

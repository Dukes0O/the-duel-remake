import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {EngineAudio} from '../src/audio.js';
import {ffmpeg} from './audio/codec.mjs';

const CUES = [
  'race.start.light', 'race.start.go', 'race.position.gain', 'race.lap.final',
  'race.finish.flag', 'pit.limiter', 'pit.wrench', 'pit.go', 'surface.gravel',
  'surface.snow', 'surface.ice', 'avalanche.rumble', 'avalanche.slide',
  'yeti.roar', 'snowman.burst', 'crowd.cheer', 'wind.summit',
  'ambient.harbour-night', 'ambient.forest-morning', 'ambient.mountain-wind',
];
const added = new Set(CUES);
const hash = data => createHash('sha256').update(data).digest('hex');
const hashObject = value => hash(JSON.stringify(value));
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url)));
// Full pre-P4 objects are pinned; no old record or credit can silently change.
assert.equal(hashObject(Object.fromEntries(Object.entries(SOUND_BANK).filter(([id]) => !added.has(id)))),
  'df5cf72de6db8a8f50273c78ae0e6dd349b6ed0ae32ff1ad37627ddbc8a725ba', 'pre-P4 sound bank changed');
assert.equal(hashObject({...catalog, sounds: catalog.sounds.filter(row => !added.has(row.cue))}),
  '772989c2d66e55d6c7c6f795b85cbf3395c30abe4edc8a6cc3a526421a06e8f0', 'pre-P4 catalog changed');

// Exercise the real loader with memory-only responses; never touch player storage.
const savedFetch = globalThis.fetch;
try {
  for (const enabled of [false, true]) {
    const requested = [];
    globalThis.fetch = async url => {
      requested.push(url);
      return {ok: true, arrayBuffer: async () => new ArrayBuffer(4)};
    };
    const renderer = Object.create(EngineAudio.prototype);
    Object.assign(renderer, {flags: {enabled: name => name === 'grand-prix' && enabled},
      context: {decodeAudioData: async () => ({duration: 1})}, cueBuffers: {}});
    await renderer._loadCueBuffers();
    const p4 = requested.filter(url => url.startsWith('/assets/audio/p4/'));
    assert.equal(p4.length, enabled ? CUES.length : 0, 'disabled P4 performs no asset fetch');
    const count = requested.length;
    await renderer._loadCueBuffers();
    assert.equal(requested.length, count, 'repeated loading does not duplicate requests');
  }
  // Activation extends both settled and in-flight ordinary loads.
  for (const settleBase of [false, true]) {
    let enabled = false;
    const requested = [], releases = [];
    globalThis.fetch = url => {
      requested.push(url);
      return new Promise(resolve => releases.push(() => resolve({ok: true,
        arrayBuffer: async () => new ArrayBuffer(4)})));
    };
    const renderer = Object.create(EngineAudio.prototype);
    Object.assign(renderer, {flags: {enabled: name => name === 'grand-prix' && enabled},
      context: {decodeAudioData: async () => ({duration: 1})}, cueBuffers: {}});
    const ordinaryLoad = renderer._loadCueBuffers();
    const oldRequests = [...requested];
    if (settleBase) {
      for (const release of releases) release();
      await ordinaryLoad;
    }
    enabled = true;
    const activatedLoad = renderer._loadCueBuffers();
    assert.equal(requested.filter(url => url.startsWith('/assets/audio/p4/')).length, CUES.length,
      'activating Grand Prix on an existing renderer loads its 20 assets');
    assert.deepEqual(requested.filter(url => !url.startsWith('/assets/audio/p4/')), oldRequests,
      'activation does not refetch old or in-flight assets');
    assert.equal(renderer._loadCueBuffers(), activatedLoad, 'in-flight activation is memoized');
    enabled = false;
    renderer._loadCueBuffers();
    enabled = true;
    assert.equal(renderer._loadCueBuffers(), activatedLoad, 'off/on does not duplicate requests');
    for (const release of releases) release();
    await Promise.all([ordinaryLoad, activatedLoad]);
    assert.deepEqual(CUES.filter(id => renderer.cueBuffers[id]), CUES, 'all new buffers become available');
  }
} finally { globalThis.fetch = savedFetch; }

const records = catalog.sounds.filter(row => added.has(row.cue));
assert.deepEqual([...new Set(records.map(row => row.cue))].sort(), [...CUES].sort(), 'all 20 cues need source recipes');
for (const id of CUES) {
  const cue = SOUND_BANK[id];
  assert.ok(cue, `${id}: missing bank definition`);
  assert.equal(cue.flag, 'grand-prix', `${id}: behind Grand Prix switch`);
  assert.match(cue.file, /^p4\/[a-z0-9-]+\.ogg$/, `${id}: compressed runtime file`);
  assert.equal(cue.layers, undefined, `${id}: recorded source, no synthetic fallback`);
  const row = records.find(record => record.cue === id);
  for (const field of ['author', 'page', 'licenseUrl', 'file']) assert.ok(row[field], `${id}: ${field}`);
  assert.match(row.license, /^(CC0 1\.0|CC BY [34]\.0)$/);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.processing.script, 'tools/audio/p4-audio.mjs');
  assert.equal(row.runtime.file, `public/assets/audio/${cue.file}`);
  const bytes = readFileSync(new URL(`../${row.runtime.file}`, import.meta.url));
  assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
  assert.equal(hash(bytes), row.runtime.sha256, `${id}: runtime recipe checksum`);
  assert.equal(bytes.length, row.runtime.bytes);
  const pcm = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', 'pipe:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'], {input: bytes});
  const count = pcm.length / 4;
  let peak = 0, squares = 0, maxStep = 0, previous = pcm.readFloatLE(0);
  for (let i = 0; i < count; i++) {
    const sample = pcm.readFloatLE(i * 4);
    assert.ok(Number.isFinite(sample));
    peak = Math.max(peak, Math.abs(sample));
    squares += sample * sample;
    maxStep = Math.max(maxStep, Math.abs(sample - previous));
    previous = sample;
  }
  const duration = count / 48000, rms = Math.sqrt(squares / count);
  assert.equal(duration, row.runtime.duration, id + ': decoded duration');
  assert.equal(peak, row.runtime.peak, id + ': decoded peak');
  assert.equal(rms, row.runtime.rms, id + ': decoded RMS');
  assert.ok(peak <= .99 && rms > .0001, id + ': real PCM is audible and unclipped');
  if (cue.loop) assert.ok(Math.abs(pcm.readFloatLE(0) - previous) <= .02 + maxStep * 2,
    id + ': loop boundary is within ordinary waveform steps');
  assert.ok(row.runtime.duration > 0.05 && row.runtime.duration <= (cue.loop ? 32 : 8), `${id}: bounded duration`);
  assert.ok(row.runtime.peak <= 0.99 && row.runtime.rms > 0.0001, `${id}: audible and unclipped`);
}
console.log('P4 audio: all 20 recorded cues, source credits, bounded assets and pre-P4 pins pass.');

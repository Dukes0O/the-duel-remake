import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve, dirname, basename} from 'node:path';
import {run} from './scenarios/arsenal-core-audio.mjs';
import {createCaptureWitness, inspectCaptureWitness, recorderWorkletSource}
  from './audio/capture-witness.mjs';

const reference = createCaptureWitness(48000);
assert.equal(reference.length, 90 * 48000);
for (let i = 1; i < reference.length; i++)
  assert.ok(reference[i] > reference[i - 1], 'every witness value identifies one source frame');
const measured = reference.slice(10000, 18000);
assert.equal(inspectCaptureWitness(measured, reference).complete, true);
assert.equal(inspectCaptureWitness(measured, reference).sourceStartFrame, 10000);
for (const size of [128, 2048]) {
  const missing = new Float32Array(measured.length - size);
  missing.set(measured.subarray(0, 3000));
  missing.set(measured.subarray(3000 + size), 3000);
  assert.equal(inspectCaptureWitness(missing, reference).complete, false,
    'missing ' + size + ' sample span fails independent witness');
  const repeated = new Float32Array(measured.length + size);
  repeated.set(measured.subarray(0, 3000));
  repeated.set(measured.subarray(3000 - size, 3000), 3000);
  repeated.set(measured.subarray(3000), 3000 + size);
  assert.equal(inspectCaptureWitness(repeated, reference).complete, false,
    'repeated ' + size + ' sample span fails independent witness');
}
assert.equal(inspectCaptureWitness(new Float32Array(128), reference).complete, false,
  'pre-start zeros cannot establish witness proof');
assert.equal(inspectCaptureWitness(new Float32Array(), reference).complete, false);
let Meter;
const payloads = [];
const scope = {Float32Array, currentFrame: 900000,
  AudioWorkletProcessor: class {constructor() {this.port = {postMessage: p => payloads.push(p)};}},
  registerProcessor: (name, processor) => {Meter = processor;}};
vm.runInNewContext(recorderWorkletSource, scope);
const meter = new Meter();
const original = new Float32Array(4096);
for (let block = 0; block < 16; block++) {
  // Deliberately repeat a raw clock: witness sequence remains independent.
  scope.currentFrame = 900000 + (block === 9 ? 8 : block) * 128;
  const left = Float32Array.from({length: 128}, (_, i) => (block * 128 + i) / 4096);
  const right = Float32Array.from(left, value => -value);
  for (let i = 0; i < 128; i++) {
    original[(block * 128 + i) * 2] = left[i] || 0;
    original[(block * 128 + i) * 2 + 1] = right[i] || 0;
  }
  meter.process([[left, right], [reference.subarray(10000 + block * 128, 10128 + block * 128)]]);
}
assert.equal(payloads.length, 1);
assert.deepEqual(new Uint8Array(payloads[0].pcm.buffer), new Uint8Array(original.buffer),
  'game PCM copying remains byte exact');
assert.equal(payloads[0].frame, 900000, 'original chunk label is unchanged');
assert.equal(payloads[0].callbacks.length, 16);
assert.equal(payloads[0].callbacks[9].frame, payloads[0].callbacks[8].frame);
assert.equal(inspectCaptureWitness(payloads[0].witness, reference).complete, true,
  'bad raw labels alone do not fail the independent sample witness');
const sliced = payloads[0].witness.subarray(77);
assert.equal(inspectCaptureWitness(sliced, reference).sourceStartFrame, 10077,
  'same measured PCM skip selects the corresponding witness samples');
meter.process([[new Float32Array(64)], [new Float32Array(32)]]);
assert.equal(meter.callbacks[0].leftFrames, 64);
assert.equal(meter.callbacks[0].rightFrames, 0);
assert.equal(meter.callbacks[0].witnessFrames, 32);
assert.equal(inspectCaptureWitness(meter.witness.subarray(0, 128), reference).complete, false);
// A strict label failure must retain every track before it is thrown.
const outputDir = await mkdtemp(join(tmpdir(), 'duel-recorder-evidence-'));
try {
  const bytes = Buffer.from(original.buffer);
  const witnessBytes = Buffer.from(payloads[0].witness.buffer);
  const row = {quality: 'high', tracks: Object.fromEntries(['mix', 'engine', 'weapons'].map(kind =>
    [kind, {pcmBase64: bytes.toString('base64'), witnessBase64: witnessBytes.toString('base64'),
      frames: 2048, contiguous: false, callbackHeaders: [{frame: 900000, callbacks: payloads[0].callbacks}]}]))};
  const context = {outputDir, navigate: async () => {}, waitFor: async () => {},
    evaluate: async source => source.includes('async function capture') ? row : undefined};
  await assert.rejects(run(context), /Incomplete native mix recording/);
  for (const kind of ['mix', 'engine', 'weapons']) {
    assert.deepEqual(await readFile(join(outputDir, 'high-' + kind + '.f32le')), bytes);
    assert.deepEqual(await readFile(join(outputDir, 'high-' + kind + '-witness.f32le')), witnessBytes);
  }
  const metadata = JSON.parse(await readFile(join(outputDir, 'capture.json'), 'utf8'));
  assert.equal(metadata.status, 'failed');
  assert.equal(metadata.rows[0].tracks.mix.callbackHeaders[0].callbacks[9].frame, 901024);
  assert.equal(Object.hasOwn(metadata.rows[0].tracks.mix, 'pcmBase64'), false);
  assert.equal(Object.hasOwn(metadata.rows[0].tracks.mix, 'witnessBase64'), false);
} finally {
  const cleanupTarget = resolve(outputDir);
  assert.equal(dirname(cleanupTarget), resolve(tmpdir()));
  assert.ok(basename(cleanupTarget).startsWith('duel-recorder-evidence-'));
  await rm(cleanupTarget, {recursive: true});
}
console.log('Arsenal recorder: exact PCM, raw clocks/input lengths, measured slicing, missing/repeated 128/2048-frame witness checks pass');

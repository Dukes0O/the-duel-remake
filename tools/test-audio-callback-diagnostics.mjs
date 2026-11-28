import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {createCaptureWitness, inspectWitnessedChunks} from './audio/capture-witness.mjs';
import {crashRecorderWorkletSource} from './scenarios/audio-crash-peak.mjs';

const reference = createCaptureWitness(48000), sourceStartFrame = 96000;
const fixture = () => [0, 2048, 4096].map(offset => ({frame: sourceStartFrame + offset,
  pcm: Float32Array.from({length: 4096}, (_, i) => (offset + i) / 10000),
  witness: reference.slice(offset, offset + 2048),
  callbacks: Array.from({length: 16}, (_, i) => ({frame: sourceStartFrame + offset + i * 128,
    chunkOffset: i * 128, leftFrames: 128, rightFrames: 128, witnessFrames: 128}))}));
const inspect = chunks => inspectWitnessedChunks(chunks, sourceStartFrame, reference);

test('ordinary and offset callback labels preserve byte-exact PCM and raw metadata', () => {
  for (const offset of [0, -128, 20000]) {
    const chunks = fixture(), original = chunks.map(chunk => Buffer.from(chunk.pcm.buffer).toString('hex'));
    for (const chunk of chunks) {
      chunk.frame += offset;
      for (const row of chunk.callbacks) row.frame += offset;
    }
    const result = inspect(chunks);
    assert.equal(result.complete, true);
    assert.equal(result.clockNotes.length > 0, offset !== 0);
    result.chunks.forEach((chunk, i) => {
      assert.equal(chunk.sampleFrame, sourceStartFrame + i * 2048);
      assert.equal(chunk.frame, sourceStartFrame + i * 2048 + offset);
      assert.equal(Buffer.from(chunk.pcm.buffer).toString('hex'), original[i]);
      assert.deepEqual(chunk.callbacks, chunks[i].callbacks);
    });
  }
});

test('missing and repeated 128-frame callbacks and 2048-frame payloads fail sample identity', () => {
  for (const delta of [-128, 128, -2048, 2048]) {
    const chunks = fixture();
    chunks[1].witness = reference.slice(2048 + delta, 4096 + delta);
    assert.equal(inspect(chunks).complete, false);
  }
  const missing = fixture(); missing.splice(1, 1);
  assert.equal(inspect(missing).complete, false);
  const repeated = fixture(); repeated.splice(1, 0, repeated[0]);
  assert.equal(inspect(repeated).complete, false);
});

test('short callback inputs, missing callbacks and corrupt witness samples fail', () => {
  for (const key of ['leftFrames', 'rightFrames', 'witnessFrames']) {
    const chunks = fixture(); chunks[1].callbacks[3][key] = 127;
    assert.equal(inspect(chunks).complete, false);
  }
  const missing = fixture(); missing[1].callbacks.pop();
  assert.equal(inspect(missing).complete, false);
  const corrupt = fixture(); corrupt[1].witness[500] = corrupt[1].witness[499];
  assert.equal(inspect(corrupt).complete, false);
});

test('only leading source startup silence is excluded; source frame zero is required', () => {
  const chunks = fixture(), silent = {...chunks[0], witness: new Float32Array(2048)};
  assert.equal(inspect([silent, ...chunks]).complete, true);
  assert.equal(inspect([chunks[0], silent, ...chunks.slice(1)]).complete, false);
  assert.equal(inspect(chunks.slice(1)).complete, false);
});

test('crash worklet copies unclipped Float32 stems, witness and raw callback headers in one payload', () => {
  let Meter;
  const messages = [], scope = {currentFrame: sourceStartFrame,
    AudioWorkletProcessor: class {port = {postMessage: packet => messages.push(packet)};},
    registerProcessor: (name, Constructor) => { Meter = Constructor; }};
  runInNewContext(crashRecorderWorkletSource, scope);
  const meter = new Meter({processorOptions: {streams: 2}});
  const expected = [[], []];
  for (let callback = 0; callback < 16; callback++) {
    scope.currentFrame = sourceStartFrame + callback * 128 + (callback === 3 ? -128 : 0);
    const left = Float32Array.from({length: 128}, (_, i) => (i + callback * 128 - 1000) / 128);
    const right = Float32Array.from(left, value => -value);
    const mono = Float32Array.from(left, value => value / 2);
    meter.process([[left, right], [mono], [reference.slice(callback * 128, (callback + 1) * 128)]]);
    for (let i = 0; i < 128; i++) { expected[0].push(left[i], right[i]); expected[1].push(mono[i], mono[i]); }
  }
  assert.equal(messages.length, 1);
  const packet = messages[0];
  for (let stream = 0; stream < 2; stream++) {
    assert.equal(Buffer.from(packet.streams[stream].buffer).equals(Buffer.from(new Float32Array(expected[stream]).buffer)), true,
      'Float32 PCM is byte-exact, including signed zero and values outside [-1, 1]');
  }
  assert.deepEqual(Buffer.from(packet.witness.buffer), Buffer.from(reference.slice(0, 2048).buffer));
  assert.equal(packet.callbacks[3].frame, sourceStartFrame + 256);
  assert.deepEqual(Array.from(packet.callbacks[3].lengths, lengths => Array.from(lengths)), [[128, 128], [128], [128]]);
  const result = inspectWitnessedChunks([{...packet, pcm: packet.streams[0]}], sourceStartFrame, reference);
  assert.equal(result.complete, true);
  assert.equal(result.clockNotes.length, 1);
  packet.callbacks[3].lengths[0][0] = 127;
  assert.equal(inspectWitnessedChunks([{...packet, pcm: packet.streams[0]}], sourceStartFrame, reference).complete, false);
});

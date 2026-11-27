import assert from 'node:assert/strict';
import {inspectNativeCallbacks} from './scenarios/p4-audio.mjs';
import {inspectSkylineCapture, validateSkylineAudio} from './scenarios/skyline-audio.mjs';
import {createCaptureWitness, inspectCaptureWitness} from './audio/capture-witness.mjs';

const reference = createCaptureWitness(48000);
const identity = offset => inspectCaptureWitness(reference.slice(offset, offset + 2048), reference);
function packet() {
  const result = {callbacks: [0, 2048, 4096].map((offset, i) => ({frames: 2048,
    frame: 10000 + offset, deliveredMs: i * 43, identity: identity(offset)})),
    rows: [{time: 2.1, throttle: 0, frequency: 7000, gain: .01}, {time: 4.1, throttle: 0}],
    cues: [{id: 'vehicle.blowoff', time: 2.1}, {id: 'vehicle.blowoff', time: 4.1}],
    memoryOnly: true, turboStopped: true, loudness: {available: true, truePeakDbtp: -7.75, integratedLufs: -12.8}};
  result.capture = inspectSkylineCapture(result);
  return result;
}
const check = (name, run) => {run(); console.log('PASS ' + name);};
check('intact capture keeps advisory loudness advisory', () => validateSkylineAudio(packet()));
check('late delivery with intact samples stays clean', () => {
  const p = packet(); p.callbacks[1].frame = p.callbacks[0].frame; p.callbacks[1].deliveredMs += 1000;
  assert.equal(inspectSkylineCapture(p).disturbed, false);
});
for (const [name, change] of [
  ['repeated samples', p => p.callbacks[1].identity = identity(0)],
  ['missing samples', p => p.callbacks[1].identity = identity(2176)],
  ['corrupted buffer', p => {const pcm = reference.slice(2048, 4096); pcm[512] = pcm[511];
    p.callbacks[1].identity = inspectCaptureWitness(pcm, reference);}],
  ['missing callback', p => p.callbacks.splice(1, 1)],
  ['empty recording', p => p.callbacks = []],
  ['missed throttle lift', p => p.rows.splice(0, 1)],
]) check('Skyline diagnoses ' + name, () => {
  const p = packet(); change(p); p.capture = inspectSkylineCapture(p);
  assert.equal(p.capture.disturbed, true);
  assert.throws(() => validateSkylineAudio(p), /capture disturbed, rerun alone/);
});
for (const [name, change] of [
  ['clipping', p => p.loudness.truePeakDbtp = 0],
  ['unmeasurable sound', p => p.loudness.available = false],
  ['missing blowoff', p => p.cues.pop()],
  ['doubled blowoff', p => p.cues.push({...p.cues[0]})],
  ['blowoffs too close', p => p.cues[1].time = 2.2],
  ['inaudible turbo', p => p.rows.forEach(row => row.gain = 0)],
  ['surviving turbo', p => p.turboStopped = false],
  ['non-memory save', p => p.memoryOnly = false],
]) check('clean Skyline capture still rejects ' + name, () => {
  const p = packet(); change(p);
  assert.throws(() => validateSkylineAudio(p), /isolation, wiring or level check failed/);
});
const chunk = () => ({frame: 7327104, callbacks: Array.from({length: 16}, (_, index) => ({
  frame: 7327104 + index * 128, chunkOffset: index * 128, witnessFrames: 128}))});
check('P4 consecutive native callbacks pass', () => assert.equal(inspectNativeCallbacks(chunk()).complete, true));
check('P4 night report skipped quantum is disturbed', () => {
  const c = chunk(); c.callbacks[1].frame += 128;
  assert.equal(inspectNativeCallbacks(c).complete, false);
});
check('P4 repeated quantum is disturbed', () => {
  const c = chunk(); c.callbacks[1].frame -= 128;
  assert.equal(inspectNativeCallbacks(c).complete, false);
});
check('P4 short callback/witness is disturbed', () => {
  const c = chunk(); c.callbacks.pop(); assert.equal(inspectNativeCallbacks(c).complete, false);
  const w = chunk(); w.callbacks[1].witnessFrames = 0; assert.equal(inspectNativeCallbacks(w).complete, false);
});

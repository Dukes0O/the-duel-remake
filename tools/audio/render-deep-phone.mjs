// DEEP-RADIO: a Node render of a take through the phone chain, for loudness checks
// (docs/THE_DEEP.md section 6.7). It follows the Web Audio graph in
// src/deep/deep-phone.js and src/lessons/radio-voice.js node for node:
//   warble delay -> high-pass -> low-pass -> soft clip -> output gain 1.3,
// with the bubble bed joining before the filters. The radio's key clicks and hiss
// are left out (the hiss is -34 dB under the voice and the clicks last 14 ms).
// The game's master compressor and ceiling come after this and are not modelled.
//   node tools/audio/render-deep-phone.mjs <take.mp3>...   prints length, LUFS and peak before and after
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness} from './measurements.mjs';
import {RADIO_FILTER, softClipCurve} from '../../src/lessons/radio-voice.js';
import {DEEP_PHONE_FILTER, DEEP_PHONE_WARBLE, DEEP_PHONE_BED, bubbleBedSamples, warbleSwingSeconds} from '../../src/deep/deep-phone.js';

export const RATE = 48000;
const OUTPUT_GAIN = 1.3;

// Mono 32-bit float samples at 48 kHz from any file FFmpeg reads.
export function decodeMono(bytes) {
  const raw = ffmpeg(['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'], {input: bytes});
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - raw.length % 4));
}

// A 32-bit float WAV, so the meter sees the samples exactly.
export function wavBytes(samples, rate = RATE) {
  const header = Buffer.alloc(44), data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Web Audio's biquad, high-pass or low-pass, Q given in dB (the API's rule for these two types).
function biquad(input, type, frequency, q, rate = RATE) {
  const w0 = 2 * Math.PI * frequency / rate, cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * 10 ** (q / 20));
  const high = type === 'highpass';
  const b0 = (high ? 1 + cos : 1 - cos) / 2, b1 = high ? -(1 + cos) : 1 - cos, b2 = b0;
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let index = 0; index < input.length; index++) {
    const x = input[index];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[index] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

// samples -> [warble] -> [+ bubble bed] -> radio filters -> soft clip -> gain.
// Pass warble = null and bed = null for the plain radio the helicopter and the instructor use.
export function renderThroughChain(samples, {filter = DEEP_PHONE_FILTER, warble = DEEP_PHONE_WARBLE, bed = DEEP_PHONE_BED, rate = RATE} = {}) {
  const tail = Math.round(rate * .35), length = samples.length + tail, mixed = new Float32Array(length);
  const swing = warble ? warbleSwingSeconds(warble) : 0;
  for (let index = 0; index < length; index++) {
    let value = 0;
    if (warble) {
      const delay = (warble.baseDelay + swing * Math.sin(2 * Math.PI * warble.hz * index / rate)) * rate;
      const position = index - delay, whole = Math.floor(position), fraction = position - whole;
      const a = whole >= 0 && whole < samples.length ? samples[whole] : 0, b = whole + 1 >= 0 && whole + 1 < samples.length ? samples[whole + 1] : 0;
      value = a + (b - a) * fraction;
    } else value = index < samples.length ? samples[index] : 0;
    mixed[index] = value;
  }
  if (bed) {
    const loop = bubbleBedSamples(rate, bed), fadeIn = Math.round(rate * .12), fadeOut = Math.round(rate * .2);
    for (let index = 0; index < length; index++) {
      const up = Math.min(1, index / fadeIn), down = Math.min(1, Math.max(0, (samples.length + fadeOut - index) / fadeOut));
      mixed[index] += loop[index % loop.length] * bed.level * Math.min(up, down);
    }
  }
  const filtered = biquad(biquad(mixed, 'highpass', filter.highpass, .7, rate), 'lowpass', filter.lowpass, .7, rate);
  const curve = softClipCurve(1024, filter.drive), out = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    // WaveShaperNode: the input -1..1 maps across the curve linearly; beyond that it holds the end value.
    const position = (Math.max(-1, Math.min(1, filtered[index])) + 1) / 2 * (curve.length - 1), whole = Math.min(curve.length - 2, Math.floor(position));
    out[index] = (curve[whole] + (curve[whole + 1] - curve[whole]) * (position - whole)) * OUTPUT_GAIN;
  }
  return out;
}

export const measureSamples = samples => measureLoudness(wavBytes(samples));

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  for (const file of process.argv.slice(2)) {
    const samples = decodeMono(readFileSync(file)), before = measureSamples(samples), after = measureSamples(renderThroughChain(samples));
    console.log(`${file}: ${(samples.length / RATE).toFixed(1)} s, take ${before.integratedLufs} LUFS ${before.truePeakDbtp} dBTP, phone ${after.integratedLufs} LUFS ${after.truePeakDbtp} dBTP`);
  }
}

// LAB-RADIO: a Node render of a tone-and-noise sound-bank cue, for peak and loudness checks.
// It follows EngineAudio._tone and _weaponNoise (src/audio.js): each layer rises to its volume in
// 9 ms (tone) or 5 ms (noise), then falls exponentially to 0.001 at its duration; noise is white noise
// through a biquad (Q 0.65); everything is multiplied by the cue's own volume. The game's noise is
// Math.random(); this one is seeded, so the check repeats. The master stage that follows is not modelled.
import {makeRng} from '../../src/rng.js';
import {measureLoudness} from './measurements.mjs';

export const RATE = 48000;
const TAU = 2 * Math.PI;

// Web Audio's biquad (Q in dB for the low-pass and high-pass, linear for the band-pass).
function biquad(input, type, frequency, q) {
  const w0 = TAU * frequency / RATE, cos = Math.cos(w0), sin = Math.sin(w0);
  let b0, b1, b2, alpha;
  if (type === 'bandpass') { alpha = sin / (2 * q); b0 = alpha; b1 = 0; b2 = -alpha; }
  else {
    alpha = sin / (2 * 10 ** (q / 20));
    const high = type === 'highpass';
    b0 = (high ? 1 + cos : 1 - cos) / 2; b1 = high ? -(1 + cos) : 1 - cos; b2 = b0;
  }
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let index = 0; index < input.length; index++) {
    const x = input[index], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    out[index] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

const wave = {sine: Math.sin, square: phase => Math.sign(Math.sin(phase)),
  triangle: phase => 2 / Math.PI * Math.asin(Math.sin(phase))};
const saw = phase => { const x = (phase / TAU) % 1; return 2 * (x < 0 ? x + 1 : x) - 1; };

function envelope(index, start, attack, duration, volume) {
  const t = index / RATE - start;
  if (t < 0 || t > duration + .02) return 0;
  if (t < attack) return volume * t / attack;
  return volume * (.001 / volume) ** ((t - attack) / Math.max(1e-6, duration - attack));
}

export function renderLayers(layers, volume = 1, seed = 1989) {
  const length = Math.round(RATE * (Math.max(...layers.map(layer => (layer.delay || 0) + layer.duration)) + .05));
  const mix = new Float32Array(length), rng = makeRng(seed);
  for (const layer of layers) {
    const start = layer.delay || 0;
    if (layer.kind === 'noise') {
      const white = new Float32Array(length);
      for (let index = 0; index < length; index++) white[index] = rng.float() * 2 - 1;
      const shaped = biquad(white, layer.type, layer.frequency, layer.type === 'bandpass' ? .65 : .65);
      for (let index = 0; index < length; index++) mix[index] += shaped[index] * envelope(index, start, .005, layer.duration, layer.volume);
    } else {
      let phase = 0;
      const shape = layer.type === 'sawtooth' ? saw : wave[layer.type] || Math.sin;
      for (let index = 0; index < length; index++) {
        const t = index / RATE - start;
        if (t < 0) continue;
        const frequency = layer.endFrequency ? layer.frequency * (layer.endFrequency / layer.frequency) ** Math.min(1, t / layer.duration) : layer.frequency;
        phase += TAU * frequency / RATE;
        mix[index] += shape(phase) * envelope(index, start, .009, layer.duration, layer.volume);
      }
    }
  }
  return mix.map(value => value * volume);
}

export function wavBytes(samples) {
  const header = Buffer.alloc(44), data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Length, loudness and true peak of a layered cue as the bank plays it.
export function measureCue(cue) {
  const samples = renderLayers(cue.layers, cue.volume);
  const measured = measureLoudness(wavBytes(samples));
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  return {seconds: samples.length / RATE, samplePeak: peak, integratedLufs: measured.available ? measured.integratedLufs : null,
    truePeakDbtp: measured.available ? measured.truePeakDbtp : 20 * Math.log10(peak)};
}

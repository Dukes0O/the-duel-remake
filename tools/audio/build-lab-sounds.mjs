// LAB-RADIO: the Lab's three long sounds, made from recipes in plain code (no recording, no library):
//   lab.fan        the tunnel fan: a blade hum and an air roar, a loop (the bench changes its pitch with the fan dial)
//   lab.reverse    the REVERSE switch: the fan winds down, stops, and roars back the other way
//   car.speirling  the electric motor's whine over a loud fan roar that is there even standing still, a loop
// The short effects (tick, clunk, snap, creak, splash, burner, fizz, sputter, buoy, retardant) are tone and
// noise layers in src/lab/lab-cues.js and have no file.
//   node tools/audio/build-lab-sounds.mjs        writes public/assets/audio/lab/*.ogg and prints the measurements
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {measureLoudness, loopSeam} from './measurements.mjs';
import {makeRng} from '../../src/rng.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RATE = 48000;
const TAU = 2 * Math.PI;

// Noise that wraps round the end (filtered twice round the loop), so a loop has no seam.
function loopNoise(length, seed, pole) {
  const rng = makeRng(seed), data = new Float32Array(length);
  for (let index = 0; index < length; index++) data[index] = rng.float() * 2 - 1;
  let state = 0;
  for (let pass = 0; pass < 2; pass++)
    for (let index = 0; index < length; index++) {
      state += pole * (data[index] - state);
      if (pass === 1) data[index] = state;
    }
  return data;
}
const onePole = (input, pole) => { let state = 0; return input.map(value => (state += pole * (value - state))); };

// A steady loop: harmonics are whole cycles in the loop, so the sum closes exactly.
function steadyLoop({seconds, hum, whine, roar, roarSeed, pole, rumble}) {
  const length = Math.round(RATE * seconds), data = new Float32Array(length);
  const air = loopNoise(length, roarSeed, pole), low = loopNoise(length, roarSeed + 1, rumble);
  for (let index = 0; index < length; index++) {
    const t = index / RATE;
    let value = air[index] * roar.air + low[index] * roar.low;
    // The roar swells slowly, in whole cycles of the loop.
    value *= 1 + .12 * Math.sin(TAU * t / seconds * 3);
    for (const [frequency, volume] of hum) value += Math.sin(TAU * frequency * t) * volume;
    for (const [frequency, volume] of whine) value += Math.sin(TAU * frequency * t + .6 * Math.sin(TAU * 4 * t / seconds * 5)) * volume;
    data[index] = value;
  }
  return data;
}

export const LAB_SOUND_RECIPES = Object.freeze([
  Object.freeze({id: 'lab.fan', file: 'lab/fan.ogg', loop: true, seconds: 4, targetLufs: -24,
    // 120 Hz blade hum and its harmonics over a rush of air: 480 whole cycles in four seconds.
    make: () => steadyLoop({seconds: 4, hum: [[120, .5], [240, .3], [360, .16], [480, .08]], whine: [],
      roar: {air: .55, low: .45}, roarSeed: 1970, pole: .18, rumble: .02})}),
  Object.freeze({id: 'car.speirling', file: 'lab/speirling.ogg', loop: true, seconds: 4, targetLufs: -22,
    // The motor's whine (1,200 Hz, a faint 1,215 Hz beating against it and a 2,400 Hz octave) over a loud fan roar.
    make: () => steadyLoop({seconds: 4, hum: [[90, .25], [180, .18]], whine: [[1200, .22], [1215, .16], [2400, .1]],
      roar: {air: .9, low: .7}, roarSeed: 2022, pole: .3, rumble: .03})}),
  Object.freeze({id: 'lab.reverse', file: 'lab/reverse.ogg', loop: false, seconds: 6.4, targetLufs: -20,
    // The fan slows (blades 130 to 0 Hz in 1.9 s), rattles to a stop, then spins up the other way
    // (0 to 170 Hz) with a louder, lower roar: the sound of air being sucked the other way.
    make: () => {
      const length = Math.round(RATE * 6.4), data = new Float32Array(length);
      const air = loopNoise(length, 1978, .2), low = loopNoise(length, 1979, .02), rattle = loopNoise(length, 1980, .5);
      let phase = 0;
      for (let index = 0; index < length; index++) {
        const t = index / RATE;
        let frequency, level, roar;
        if (t < 1.9) { const u = t / 1.9; frequency = 130 * (1 - u) ** 1.6; level = 1 - .5 * u; roar = .5 * (1 - u) ** 1.2; }
        else if (t < 2.6) { frequency = 0; level = 0; roar = 0; }
        else { const u = Math.min(1, (t - 2.6) / 2.6); frequency = 170 * u ** .8; level = .5 + .5 * u; roar = .25 + 1.15 * u ** 1.1; }
        phase += TAU * frequency / RATE;
        // A tick or two of blade slap as it comes to a stop.
        const slap = t >= 1.5 && t < 2.6 ? rattle[index] * .25 * Math.max(0, 1 - Math.abs(t - 2.05) / .55) : 0;
        let value = (Math.sin(phase) * .5 + Math.sin(2 * phase) * .3 + Math.sin(3 * phase) * .15) * level + slap;
        value += (air[index] * .55 + low[index] * .45) * roar;
        data[index] = value;
      }
      return data;
    }}),
]);

const floatBytes = samples => Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
const wav = samples => {
  const header = Buffer.alloc(44), data = floatBytes(samples);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};

// Render one recipe: scale to its target loudness (quieter if the peak would pass -3 dBFS), fade the
// one-shot's ends, encode to Vorbis, and measure what was written.
export function buildSound(recipe, {root = ROOT} = {}) {
  let samples = Float32Array.from(recipe.make());
  if (!recipe.loop) {
    const fade = Math.round(RATE * .02);
    for (let index = 0; index < fade; index++) { const k = index / fade; samples[index] *= k; samples[samples.length - 1 - index] *= k; }
  }
  const raw = measureLoudness(wav(samples));
  let gain = 10 ** ((recipe.targetLufs - raw.integratedLufs) / 20);
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  gain = Math.min(gain, 10 ** (-3 / 20) / peak);
  samples = samples.map(value => value * gain);
  const bytes = ffmpeg(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-map_metadata', '-1', '-c:a', 'libvorbis', '-q:a', '5', '-f', 'ogg', 'pipe:1'], {input: floatBytes(samples)});
  const measured = measureLoudness(bytes);
  if (measured.available && measured.truePeakDbtp > -1) throw Error(`${recipe.id}: encoded peak ${measured.truePeakDbtp}`);
  const file = join(root, 'public/assets/audio', recipe.file);
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, bytes);
  return {id: recipe.id, file: recipe.file, bytes: bytes.length, seconds: samples.length / RATE, integratedLufs: measured.integratedLufs,
    truePeakDbtp: measured.truePeakDbtp, loopSeam: recipe.loop ? loopSeam([samples], RATE) : null};
}

export const buildLabSounds = options => LAB_SOUND_RECIPES.map(recipe => buildSound(recipe, options));

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  console.log(JSON.stringify(buildLabSounds(), null, 2));

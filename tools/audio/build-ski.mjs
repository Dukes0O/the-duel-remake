// Rebuild SKI-AUDIO without downloads, takes, services or keys.
// node tools/audio/build-ski.mjs [--check]
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {renderLayers, wavBytes, RATE} from './render-lab-cues.mjs';
import {ffmpeg} from './codec.mjs';
import {measureLoudness} from './measurements.mjs';
import {SKI_CUES} from '../../src/ski/ski-lines.js';
const noise = (frequency, duration, volume, type = 'bandpass', delay = 0) =>
  ({kind: 'noise', frequency, duration, volume, type, delay});
const thump = (frequency, duration, volume, delay = 0) =>
  ({kind: 'tone', type: 'sine', frequency, endFrequency: frequency / 2, duration, volume, delay});
export const SKI_RECIPES = {
  'ski.carve': [noise(4200, 4.3, .8, 'highpass'), noise(1700, 4.3, .4)],
  'ski.skid': [noise(2400, 4.3, 1), noise(550, 4.3, .6)],
  'ski.wind': [noise(480, 4.3, 1, 'lowpass'), noise(1300, 4.3, .3)],
  'ski.gate': [noise(2500, .08, .65), thump(340, .13, .5), thump(180, .22, .18, .06)],
  'ski.pop': [noise(1600, .2, .55), thump(130, .16, .4)],
  'ski.land': [noise(650, .3, .6, 'lowpass'), thump(95, .24, .55)],
  'ski.land.hard': [noise(900, .48, .9, 'lowpass'), thump(72, .4, .8), noise(3400, .18, .3)],
  'ski.tumble': [thump(90, .25, .7), noise(1000, .65, .7), thump(120, .2, .45, .23),
    thump(70, .32, .5, .5), noise(2000, .45, .35, 'bandpass', .4)],
  'ski.powder': [noise(1100, 4.3, .9, 'lowpass'), noise(2300, 4.3, .35)],
  'ski.step-out': [noise(800, .22, .6, 'lowpass'), thump(110, .15, .4),
    noise(850, .24, .6, 'lowpass', .3), thump(120, .15, .4, .3),
    noise(3600, .045, .6, 'bandpass', .57), thump(750, .065, .25, .59)],
};
const root = new URL('../../', import.meta.url);
const catalogPath = new URL('tools/audio/catalog.json', root);
const catalog = JSON.parse(readFileSync(catalogPath));
const check = process.argv.includes('--check');
for (const [index, [id, layers]] of Object.entries(SKI_RECIPES).entries()) {
  const def = SKI_CUES[id], path = new URL(`public/assets/audio/${def.file}`, root);
  if (!check) {
    let samples;
    if (def.loop) {
      // Sum short overlapping noise grains into a periodic bed. Equal-power is
      // unnecessary here: the second grain is the same stationary noise stream.
      const steady = layers.map(layer => ({...layer, volume: layer.volume, duration: 40}));
      const source = renderLayers(steady, 1, 5100 + index);
      const length = RATE * 4, overlap = Math.round(RATE * .2);
      samples = source.slice(RATE, RATE + length);
      for (let i = 0; i < overlap; i++) {
        const t = i / overlap;
        samples[length - overlap + i] = samples[length - overlap + i] * (1 - t) + source[RATE - overlap + i] * t;
      }
    } else samples = renderLayers(layers, 1, 5100 + index);
    let peak = 0;
    for (const value of samples) peak = Math.max(peak, Math.abs(value));
    samples = samples.map(value => value * (.45 / peak));
    mkdirSync(new URL('public/assets/audio/ski/', root), {recursive: true});
    const bytes = ffmpeg(['-i', 'pipe:0', '-c:a', 'libvorbis', '-q:a', '4', '-f', 'ogg', 'pipe:1'], {input: wavBytes(samples)});
    writeFileSync(path, bytes);
    const row = {source: 'synthesis', key: id, cue: id, file: 'tools/audio/build-ski.mjs', license: 'CC0-1.0', author: 'The Duel',
      processing: {script: 'tools/audio/build-ski.mjs', seed: 5100 + index, layers, loop: def.loop, sampleRate: RATE, peak: .45},
      runtime: {file: def.file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}};
    catalog.sounds = [...catalog.sounds.filter(row => row.cue !== id), row];
  }
  // Pad only the measurement input so EBU's 400 ms gate can measure short hits.
  const padded = ffmpeg(['-i', 'pipe:0', '-af', 'apad=pad_dur=1', '-f', 'wav', 'pipe:1'], {input: readFileSync(path)});
  const measured = measureLoudness(padded);
  if (!measured.available || measured.truePeakDbtp > -1) throw Error(`${id}: true peak failed`);
  console.log(`${id}: ${measured.truePeakDbtp} dBTP`);
}
if (!check) writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');

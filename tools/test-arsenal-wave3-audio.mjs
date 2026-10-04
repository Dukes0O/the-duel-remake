import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {decodeAudioBytes} from './audio/codec.mjs';
import {loopSeam} from './audio/measurements.mjs';
import {sha256} from './audio/sourcing.mjs';
import {ARSENAL_WAVE_THREE_RECIPES} from './build-arsenal-wave3-audio.mjs';
import {measureArsenalWaveTwoCue} from './build-arsenal-wave2-audio.mjs';

const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
let passed = 0;
const failures = [];
function check(name, run) {
  try {run(); passed++;} catch (error) {failures.push(name + ': ' + error.message);}
}
for (const recipe of ARSENAL_WAVE_THREE_RECIPES) {
  check(recipe.cue + ' uses its own gated recorded variants', () => {
    const cue = SOUND_BANK[recipe.cue];
    assert.ok(cue, 'missing bank cue');
    assert.equal(cue.bus, 'weapons');
    assert.equal(cue.flag, 'arsenal-wave3');
    assert.equal(cue.loop === true, !!recipe.loop);
    assert.deepEqual(cue.files, ['a', 'b', 'c'].map(variant =>
      'arsenal-wave3/' + recipe.stem + '-' + variant + '.ogg'));
  });
  check(recipe.cue + ' has one licensed source and rebuild recipe', () => {
    const rows = catalog.sounds.filter(row => row.cue === recipe.cue);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.source, 'freesound');
    assert.match(row.license, /CC0/i);
    assert.equal(row.creditsUsed || 0, 0);
    assert.ok(row.sha256 && row.file && row.page);
    assert.equal(row.processing?.script, 'tools/build-arsenal-wave3-audio.mjs');
    assert.equal(row.processing?.recipe, recipe.stem);
  });
  check(recipe.cue + ' has audible bounded variants and clean loop joins', () => {
    const hashes = new Set();
    for (const variant of ['a', 'b', 'c']) {
      const bytes = readFileSync(new URL('../public/assets/audio/arsenal-wave3/' +
        recipe.stem + '-' + variant + '.ogg', import.meta.url));
      assert.ok(bytes.length > 1000 && bytes.length < 150000);
      const wav = decodeAudioBytes(bytes), pcm = wav.subarray(44);
      assert.equal(wav.readUInt16LE(22), 1);
      assert.equal(wav.readUInt32LE(24), 48000);
      const wave = Float32Array.from({length: pcm.length / 2}, (_, i) => pcm.readInt16LE(i * 2) / 32768);
      assert.ok(wave.length >= 48000 * .3 && wave.length <= 48000 * 1.2);
      assert.ok(wave.some(value => Math.abs(value) > .001));
      const measured = measureArsenalWaveTwoCue(bytes);
      assert.equal(measured.available, true);
      assert.ok(measured.integratedLufs >= -24 && measured.integratedLufs <= -11,
        'usable recorded arcade loudness: ' + measured.integratedLufs);
      assert.ok(measured.truePeakDbtp <= -1.5, 'decoded codec headroom');
      if (recipe.loop) assert.ok(loopSeam([wave], 48000).pass, 'smooth loop seam');
      hashes.add(sha256(bytes));
    }
    assert.equal(hashes.size, 3);
  });
}
for (const failure of failures) console.error('FAIL ' + failure);
if (failures.length) process.exitCode = 1;
console.log('Arsenal wave-three recorded audio: ' + passed + '/' + (passed + failures.length) + ' checks passed.');

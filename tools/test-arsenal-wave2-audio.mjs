import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {decodeAudioBytes} from './audio/codec.mjs';
import {loopSeam} from './audio/measurements.mjs';
import {measureArsenalWaveTwoCue} from './build-arsenal-wave2-audio.mjs';

const CUES = [
  'weapon.rockets.fire', 'weapon.rockets.flight', 'weapon.rockets.hit',
  'weapon.flame.start', 'weapon.flame.loop', 'weapon.flame.end',
  'weapon.magnet.hum',
];
const LOOPS = new Set(['weapon.rockets.flight', 'weapon.flame.loop', 'weapon.magnet.hum']);
const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
let passed = 0;
const failures = [];
function check(name, run) {
  try {run(); passed++;} catch (error) {failures.push(name + ': ' + error.message);}
}
function samples(bytes) {
  const wav = decodeAudioBytes(bytes);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt16LE(22), 1, 'new cue is mono');
  assert.equal(wav.readUInt32LE(24), 48000, 'new cue is 48 kHz');
  assert.equal(wav.readUInt16LE(34), 16, 'decoder returns native 16-bit PCM');
  const pcm = wav.subarray(44);
  return Float32Array.from({length: pcm.length / 2}, (_, i) => pcm.readInt16LE(i * 2) / 32768);
}

for (const id of CUES) {
  check(id + ' has its own recorded bank cue', () => {
    const cue = SOUND_BANK[id];
    assert.ok(cue, 'missing ' + id);
    assert.equal(cue.bus, 'weapons');
    assert.equal(cue.flag, 'arsenal');
    assert.equal(cue.loop === true, LOOPS.has(id));
    assert.equal(cue.files?.length, 3, 'A/B/C recorded variants');
    assert.ok(cue.files.every(file => file.startsWith('arsenal-wave2/') && file.endsWith('.ogg')));
  });
  check(id + ' has a verified free source and rebuild recipe', () => {
    const rows = catalog.sounds.filter(row => row.cue === id);
    assert.equal(rows.length, 1, 'one source recipe per new cue');
    const row = rows[0];
    assert.equal(row.source, 'freesound');
    assert.match(row.license, /CC0/i);
    assert.equal(row.creditsUsed || 0, 0);
    assert.ok(row.page && row.sha256 && row.file);
    assert.equal(row.processing?.script, 'tools/build-arsenal-wave2-audio.mjs');
    assert.ok(row.processing?.recipe);
  });
  check(id + ' has three audible and bounded runtime recordings', () => {
    const cue = SOUND_BANK[id];
    assert.ok(cue?.files?.length === 3);
    const hashes = new Set();
    for (const file of cue.files) {
      const bytes = readFileSync(new URL('../public/assets/audio/' + file, import.meta.url));
      assert.ok(bytes.length > 1000 && bytes.length < 150000, 'compressed runtime size');
      const wave = samples(bytes);
      assert.ok(wave.length >= 48000 * .4 && wave.length <= 48000 * 1.6,
        'bounded cue duration supports the released direct EBU check');
      assert.ok(wave.some(value => Math.abs(value) > .001), 'recording is audible');
      const measured = measureArsenalWaveTwoCue(bytes);
      assert.equal(measured.available, true, 'decoded recording can be measured');
      assert.ok(measured.integratedLufs >= -24 && measured.integratedLufs <= -11,
        'recorded cue has usable arcade loudness');
      assert.ok(measured.truePeakDbtp <= -1.5, 'decoded codec has output headroom');
      if (LOOPS.has(id)) assert.ok(loopSeam([wave], 48000).pass, 'loop seam is smooth');
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(hashes.size, 3, 'A/B/C recordings differ');
  });
}

if (failures.length) {
  for (const failure of failures) console.error('FAIL ' + failure);
  process.exitCode = 1;
}
console.log('Arsenal wave-two recorded audio: ' + passed + '/' + (passed + failures.length) + ' checks passed.');

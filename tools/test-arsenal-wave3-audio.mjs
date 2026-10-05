import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOUND_BANK} from '../src/sound-bank.js';
import {decodeAudioBytes} from './audio/codec.mjs';
import {loopSeam} from './audio/measurements.mjs';
import {sha256} from './audio/sourcing.mjs';
import {ARSENAL_WAVE_THREE_RECIPES} from './build-arsenal-wave3-audio.mjs';
import {measureArsenalWaveTwoCue} from './build-arsenal-wave2-audio.mjs';
import {EngineAudio} from '../src/audio.js';
import {Duel} from '../src/game.js';
import {fireWeapon} from '../src/combat-weapons.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {readFightSubtitle, FIGHT_VOICE_LINES} from '../src/fight-voices.js';

const catalog = JSON.parse(readFileSync(new URL('./audio/catalog.json', import.meta.url), 'utf8'));
const nativeRoutingOnly = process.argv.includes('--native-routing-only');
let passed = 0;
const failures = [];
function check(name, run) {
  try {run(); passed++;} catch (error) {failures.push(name + ': ' + error.message);}
}
if (!nativeRoutingOnly) for (const recipe of ARSENAL_WAVE_THREE_RECIPES) {
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
if (!nativeRoutingOnly) for (const id of ['mortar', 'tesla', 'decoy', 'nitro']) {
  check(id + ' native enemy action preserves the player crew announcement', () => {
    const flags = createFeatureFlags({storage: null, qa: false, search: '',
      overrides: {arsenal: true, 'arsenal-wave3': true, 'fight-voices': true}});
    const duel = new Duel({seed: 202603, featureFlags: flags});
    duel.startCampaign({mode: 'wasteland', discoveredGate: true, startStage: 0,
      car: 'falcone_f42', cpuDifficulty: 'hard', arsenalRank: 21,
      weaponLoadout: ['mortar', 'tesla', 'decoy', 'nitro']});
    const state = duel.state, audio = new EngineAudio({flags}), calls = [];
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, crewId: 'rook', s: 500, lateral: 0, speedMph: 0});
    Object.assign(state.rival, {s: id === 'tesla' ? 510 : 450,
      lateral: 0, speedMph: 0, headingError: 0, weaponLoadout: [id]});
    audio.context = {state: 'running', currentTime: 10};
    audio.muted = false;
    audio.buses = {voice: {}, weapons: {}};
    audio.cueBuffers['crew.rook.callout'] = {duration: 4};
    audio._syncMixer = audio._weaponCue = audio._volume = () => {};
    audio._spatialOutput = () => ({level: {}, disconnect() {}});
    audio._playCue = cue => {calls.push(cue); return {stop() {}};};
    const off = duel.onChange((s, event) => {
      const before = structuredClone(s);
      audio.event(event, s, duel.course);
      assert.deepEqual(s, before, 'audio events do not change native race state');
    });
    assert.equal(fireWeapon(duel, id, true, state.rival), true, 'real CPU producer fires');
    assert.equal(calls.filter(cue => cue.startsWith('crew.')).length, 0);
    assert.equal(readFightSubtitle(state), null);
    state.rival.s = id === 'mortar' ? 560 : 510;
    assert.equal(duel.fireWeapon(id), true, 'real player producer fires');
    assert.deepEqual(calls.filter(cue => cue.startsWith('crew.')), ['crew.rook.callout']);
    assert.equal(readFightSubtitle(state), FIGHT_VOICE_LINES['crew.rook.callout'].text);
    audio.updateFightVoices(state);
    assert.equal(calls.filter(cue => cue.startsWith('crew.')).length, 1);
    off(); audio.setPaused(true);
  });
}
// Keep the generic production router live: stubbing _weaponCue hides a second
// recorded launch or default fallback after the weapon's own native cue.
const launchCues = {mortar: 'weapon.mortar.fire', tesla: 'weapon.tesla.charge',
  decoy: 'weapon.decoy.deploy', nitro: 'weapon.nitro.start',
  crossbow: 'weapon.crossbow.fire', harpoon: 'weapon.harpoon.fire'};
for (const id of ['mortar', 'tesla', 'decoy', 'nitro', 'crossbow', 'harpoon'])
  for (const enemy of ['mortar', 'tesla', 'decoy', 'nitro'].includes(id) ? [false, true] : [false]) {
    check(`${id} native ${enemy ? 'CPU' : 'player'} action routes one named launch without generic replay`, () => {
      const flags = createFeatureFlags({storage: null, qa: false, search: '',
        overrides: {arsenal: true, 'arsenal-wave3': true, 'fight-voices': true}});
      const duel = new Duel({seed: 202603, featureFlags: flags});
      duel.startCampaign({mode: 'wasteland', discoveredGate: true, startStage: 0,
        car: 'falcone_f42', crewId: 'rook', cpuDifficulty: 'hard', arsenalRank: 21,
        weaponLoadout: [id, ...['crossbow', 'star', 'bomb', 'ufo'].filter(other => other !== id)].slice(0, 4)});
      const state = duel.state, audio = new EngineAudio({flags}), calls = [];
      Object.assign(state, {status: 'racing', countdown: 0, paused: false,
        invulnerableSec: 0, s: 500, lateral: 0, speedMph: 0, headingError: 0});
      Object.assign(state.rival, {s: enemy && id === 'mortar' ? 450 : 510,
        lateral: 0, speedMph: 0, headingError: 0, weaponLoadout: [id]});
      audio.context = {state: 'running', currentTime: 10};
      audio.muted = false; audio.buses = {voice: {}, weapons: {}};
      audio.cueBuffers['crew.rook.callout'] = {duration: 4};
      audio._syncMixer = audio._volume = () => {};
      audio._spatialOutput = () => ({level: {}, disconnect() {}});
      audio._playCue = cue => {calls.push(cue); return {stop() {}};};
      assert.equal(audio._weaponCue, EngineAudio.prototype._weaponCue,
        'the generic weapon router is the real production method');
      const off = duel.onChange((s, event) => {
        const before = structuredClone(s);
        audio.event(event, s, duel.course);
        assert.deepEqual(s, before, 'real generic and named audio routes preserve simulation state');
      });
      try {
        assert.equal(enemy ? fireWeapon(duel, id, true, state.rival) : duel.fireWeapon(id), true,
          'the actual native owner produces its real weapon action');
        assert.deepEqual(calls.filter(cue => cue.startsWith('crew.')),
          enemy ? [] : ['crew.rook.callout'], 'CPU actions are silent; the real player announces exactly once');
        assert.equal(readFightSubtitle(state), enemy ? null : FIGHT_VOICE_LINES['crew.rook.callout'].text,
          'subtitle ownership follows the real native actor');
        audio.updateFightVoices(state);
        assert.equal(calls.filter(cue => cue.startsWith('crew.')).length, enemy ? 0 : 1,
          'updating the presenter cannot duplicate the owned announcement');
        const actions = calls.filter(cue => cue.startsWith('weapon.') && !/\.(?:flight|whistle|loop)$/.test(cue));
        assert.deepEqual(actions, [launchCues[id]],
          'one native action needs one named launch cue, with no duplicate or weapon.default.fire fallback');
      } finally {off(); audio.setPaused(true);}
    });
  }

for (const failure of failures) console.error('FAIL ' + failure);
if (failures.length) process.exitCode = 1;
console.log((nativeRoutingOnly ? 'Arsenal wave-three native routing: ' : 'Arsenal wave-three recorded audio: ') +
  passed + '/' + (passed + failures.length) + ' checks passed.');

import assert from 'node:assert/strict';
import { validateWeaponAudioWaveforms } from './weapon-audio-waveforms.mjs';

// These synthetic summaries test the offline capture gate, not live event
// routing or the whole-race mix. test-weapon-audio.mjs covers event routing.
const cueNames = [
  'rpg-launch', 'rpg-direct', 'rpg-splash', 'wrench-start',
  'wrench-complete', 'wrench-interrupt', 'raider-warning', 'raider-shot',
];
const fixture = () => cueNames.map(cue => ({
  cue, channels: 2, peak: .15, rms: .04, activeMs: 120,
  leftRms: cue === 'raider-shot' ? .06 : .02,
  rightRms: cue === 'raider-shot' ? .02 : .06,
  nonFiniteSamples: 0,
}));
let checks = 0;
function check(name, run) {
  checks++;
  try { run(); }
  catch (error) {
    process.exitCode = 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function rejects(name, mutate) {
  check(name, () => {
    const summaries = fixture();
    mutate(summaries);
    assert.throws(() => validateWeaponAudioWaveforms(summaries), name);
  });
}

check('all eight named stereo cues pass with audible, clean signals', () => {
  assert.doesNotThrow(() => validateWeaponAudioWaveforms(fixture()));
});
for (const cue of cueNames) {
  rejects(`missing ${cue} fails`, rows => rows.splice(rows.findIndex(row => row.cue === cue), 1));
}
rejects('a duplicate cue cannot replace a missing cue', rows => { rows[7] = { ...rows[0] }; });
rejects('mono capture fails the stereo requirement', rows => { rows[0].channels = 1; });
rejects('silence fails', rows => {
  Object.assign(rows[0], { peak: 0, rms: 0, leftRms: 0, rightRms: 0, activeMs: 0 });
});
rejects('inaudible signal fails even with nonzero samples', rows => {
  Object.assign(rows[0], { peak: 1e-8, rms: 1e-9, leftRms: 1e-9, rightRms: 1e-9 });
});
for (const metric of ['peak', 'rms', 'activeMs', 'leftRms', 'rightRms']) {
  rejects(`NaN ${metric} fails`, rows => { rows[0][metric] = NaN; });
}
rejects('infinite peak fails', rows => { rows[0].peak = Infinity; });
rejects('nonfinite samples fail before PCM encoding can hide them', rows => { rows[0].nonFiniteSamples = 1; });
rejects('clipped signal fails', rows => { rows[0].peak = 1; });
rejects('signal above the SPEC minus 1 dBFS ceiling fails', rows => { rows[0].peak = .95; });
rejects('zero active duration fails', rows => { rows[0].activeMs = 0; });
// Current production envelopes and the existing event-routing suite cap these
// short foot/raider voices at 300 ms; a lingering signal must fail capture QA.
rejects('signal lasting beyond the current 300 ms cue limit fails', rows => { rows[0].activeMs = 350; });
for (const cue of ['rpg-direct', 'rpg-splash', 'raider-shot']) {
  rejects(`${cue} on the wrong side fails`, rows => {
    const row = rows.find(item => item.cue === cue);
    [row.leftRms, row.rightRms] = [row.rightRms, row.leftRms];
  });
  rejects(`${cue} without audible channel separation fails`, rows => {
    const row = rows.find(item => item.cue === cue);
    row.leftRms = row.rightRms = .04;
  });
}

console.log(`Weapon audio waveforms: ${checks} checks${process.exitCode ? ' (failed)' : ' passed'}.`);

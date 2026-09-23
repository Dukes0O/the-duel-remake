import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { analyzeRecording, decodeWav } from './audio-analysis.mjs';
import { wavFromPcm } from './scenarios/audio-race.mjs';

const sampleRate = 16000, seconds = 4;
const shiftTemplate = decodeWav(readFileSync(new URL('../public/assets/audio/engine-shift.wav', import.meta.url)));
function fixture({ delaySec = 0, freezePitch = false, impactLevel = null, shiftDelaySec = 0,
  missingShift = false, priorShift = false } = {}) {
  const count = sampleRate * seconds;
  const channels = Object.fromEntries(['mix', 'engine', 'tires', 'weapons', 'ambience', 'ui', 'shift'].map(name => [name, new Float32Array(count)]));
  const frames = [];
  for (let index = 0; index <= seconds * 60; index++) {
    const time = index / 60;
    frames.push({ audioTimeSec: time, revs: .2 + .6 * time / seconds, throttle: 1, gear: 2, status: 'racing', impacting: false });
  }
  const shiftTimes = [...(priorShift ? [2.39] : []), ...(!missingShift ? [2.5 + shiftDelaySec] : [])];
  let phase = 0;
  for (let index = 0; index < count; index++) {
    const time = index / sampleRate;
    const revs = freezePitch ? .5 : .2 + .6 * time / seconds;
    phase += 2 * Math.PI * 52 * 2 ** (revs * 1.55) / sampleRate;
    channels.engine[index] = Math.sin(phase) * .05;
    for (const eventTime of [1, 3]) {
      const since = time - eventTime - delaySec;
      if (since >= 0 && since < .18) channels.weapons[index] += Math.sin(since * 2 * Math.PI * 120) * .25 * Math.min(1, since * 400) * Math.exp(-since * 12);
    }
    const sinceImpact = time - 2;
    if (impactLevel != null && sinceImpact >= 0 && sinceImpact < .18)
      channels.weapons[index] += Math.sin(sinceImpact * 2 * Math.PI * 190) * impactLevel * Math.min(1, sinceImpact * 400) * Math.exp(-sinceImpact * 12);
    for (const eventTime of shiftTimes) {
      const sinceShift = time - eventTime;
      if (sinceShift >= 0 && sinceShift < .16) {
        const position = sinceShift * shiftTemplate.sampleRate, sourceIndex = Math.floor(position), blend = position - sourceIndex;
        const one = (shiftTemplate.left[sourceIndex] + shiftTemplate.right[sourceIndex]) / 2;
        const two = (shiftTemplate.left[sourceIndex + 1] + shiftTemplate.right[sourceIndex + 1]) / 2;
        const oldVoiceFade = priorShift && eventTime === 2.39 && !missingShift
          ? Math.max(0, Math.min(1, 1 - (time - 2.5 - shiftDelaySec) / .012)) : 1;
        channels.shift[index] += (one * (1 - blend) + two * blend) * .2 * Math.min(1, sinceShift / .008) * oldVoiceFade;
      }
    }
    channels.mix[index] = channels.engine[index] + channels.weapons[index] + channels.shift[index];
  }
  const tracks = Object.fromEntries(Object.entries(channels).map(([name, values]) => {
    const pcm = Buffer.alloc(count * 4);
    for (let index = 0; index < count; index++) {
      const value = Math.round(values[index] * 32767);
      pcm.writeInt16LE(value, index * 4); pcm.writeInt16LE(value, index * 4 + 2);
    }
    return [name, decodeWav(wavFromPcm(pcm, sampleRate), 0)];
  }));
  tracks.shiftTemplate = shiftTemplate;
  const recording = { sampleRate, memoryOnlySaves: true, frames,
    events: [...[1, 3].map(audioTimeSec => ({ kind: 'combatExplosion', audioTimeSec, source: 'qa-probe' })),
      ...(impactLevel == null ? [] : [{ kind: 'combatHit', audioTimeSec: 2, source: 'race' }]),
      { kind: 'shift', audioTimeSec: 2.5, source: 'race' }] };
  return analyzeRecording(recording, tracks);
}

test('a 100 ms late explosion fails event sync', () => {
  const aligned = fixture(), late = fixture({ delaySec: .1 });
  assert.equal(aligned.checks.sync.pass, true, JSON.stringify(aligned.checks.sync));
  assert.equal(late.checks.sync.pass, false);
  assert.equal(late.passed, false);
  assert.ok(late.checks.sync.failures.some(row => row.delayMs >= 80));
});

test('missing and late shift accents fail their isolated-stem onset gate', () => {
  const aligned = fixture(), missing = fixture({ missingShift: true }), late = fixture({ shiftDelaySec: .1 });
  assert.equal(aligned.checks.sync.pass, true, JSON.stringify(aligned.checks.sync));
  assert.equal(missing.checks.sync.pass, false);
  assert.ok(missing.checks.sync.failures.some(row => row.kind === 'shift' && row.delayMs == null));
  assert.equal(late.checks.sync.pass, false);
  assert.ok(late.checks.sync.failures.some(row => row.kind === 'shift' && row.delayMs >= 80));
  const rapid = fixture({ priorShift: true });
  const rapidMissing = fixture({ priorShift: true, missingShift: true });
  assert.equal(rapid.checks.sync.pass, true, JSON.stringify(rapid.checks.sync));
  assert.ok(rapidMissing.checks.sync.failures.some(row => row.kind === 'shift'));
});

test('frozen engine pitch fails rev tracking', () => {
  const moving = fixture(), frozen = fixture({ freezePitch: true });
  assert.equal(moving.checks.engine.pass, true, JSON.stringify(moving.checks.engine));
  assert.equal(frozen.checks.engine.pass, false);
  assert.equal(frozen.passed, false);
});

test('repeating the same blast sample is reported as missing variety', () => {
  const report = fixture();
  assert.equal(report.checks.variety.pass, false);
  assert.ok(report.checks.variety.envelopeSimilarity >= .99);
});

test('a buried combat hit fails the unchanged 6 dB contrast target', () => {
  const strong = fixture({ impactLevel: .25 }), weak = fixture({ impactLevel: .003 });
  assert.equal(strong.checks.weaponContrast.pass, true);
  assert.equal(weak.checks.weaponContrast.pass, false);
  assert.ok(weak.checks.weaponContrast.measurements.some(row => row.kind === 'combatHit' && row.dbOverEngine < 6));
});

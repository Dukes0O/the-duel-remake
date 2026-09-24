const CUES = [
  'rpg-launch', 'rpg-direct', 'rpg-splash', 'wrench-start',
  'wrench-complete', 'wrench-interrupt', 'raider-warning', 'raider-shot',
];

// The ceiling is SPEC 3.11's -1 dBFS. Audibility floors refer to the fixed
// 550 ms capture at master gain .42, not a loudness or full-mix assessment.
export const WEAPON_AUDIO_LIMITS = Object.freeze({
  minPeak: .01, maxPeak: 10 ** (-1 / 20), minRms: .001,
  minActiveMs: 20, maxActiveMs: 300, minChannelRatio: 1.5,
});

export function validateWeaponAudioWaveforms(summaries) {
  if (!Array.isArray(summaries) || summaries.length !== CUES.length)
    throw Error('Expected exactly eight current foot and raider cue summaries.');
  const found = new Set();
  const limits = WEAPON_AUDIO_LIMITS;
  for (const row of summaries) {
    if (!row || !CUES.includes(row.cue) || found.has(row.cue))
      throw Error(`Unknown or duplicate waveform cue: ${row?.cue}`);
    found.add(row.cue);
    const fail = reason => { throw Error(`${row.cue}: ${reason}`); };
    if (row.channels !== 2) fail('expected stereo capture');
    for (const key of ['peak', 'rms', 'activeMs', 'leftRms', 'rightRms']) {
      if (!Number.isFinite(row[key]) || row[key] < 0) fail(`invalid ${key}`);
    }
    if (row.nonFiniteSamples !== 0) fail('nonfinite or unmeasured samples');
    if (row.peak < limits.minPeak || row.peak > limits.maxPeak)
      fail('peak outside audible, unclipped bounds');
    if (row.rms < limits.minRms || Math.max(row.leftRms, row.rightRms) < limits.minRms)
      fail('signal is inaudible');
    if (row.activeMs < limits.minActiveMs || row.activeMs > limits.maxActiveMs)
      fail('active duration outside current cue bounds');
    const expectedSide = row.cue === 'raider-shot' ? 'left'
      : ['rpg-direct', 'rpg-splash'].includes(row.cue) ? 'right' : null;
    if (expectedSide) {
      const favored = row[`${expectedSide}Rms`];
      const other = row[expectedSide === 'left' ? 'rightRms' : 'leftRms'];
      if (favored < limits.minRms || favored < other * limits.minChannelRatio)
        fail(`expected audible ${expectedSide} channel dominance`);
    }
  }
}

import {
  measureLoudness,
  loopSeam,
  repetition,
} from './audio/measurements.mjs';
import { SOUND_BANK } from '../src/sound-bank.js';
import { readRuntimeWav } from './audio/codec.mjs';
// Dependency-free analysis for real-time WAV stems and an aligned race event log.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TRACK_NAMES = ['mix', 'engine', 'tires', 'weapons', 'ambience', 'ui'];
const db = (amplitude) => 20 * Math.log10(Math.max(1e-9, amplitude));
const round = (value) => Number(value.toFixed(3));

export function decodeWav(bytes, audioStartSec = 0) {
  if (
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WAVE' ||
    bytes.readUInt16LE(20) !== 1 ||
    bytes.readUInt16LE(34) !== 16 ||
    bytes.toString('ascii', 36, 40) !== 'data'
  )
    throw Error('Expected a 16-bit PCM WAV with a 44-byte header.');
  const channels = bytes.readUInt16LE(22),
    sampleRate = bytes.readUInt32LE(24),
    dataBytes = bytes.readUInt32LE(40);
  if (
    ![1, 2].includes(channels) ||
    !sampleRate ||
    dataBytes !== bytes.length - 44
  )
    throw Error('Invalid WAV dimensions.');
  const length = dataBytes / (2 * channels);
  const left = new Float32Array(length),
    right = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    left[index] = bytes.readInt16LE(44 + index * channels * 2) / 32768;
    right[index] =
      channels === 2
        ? bytes.readInt16LE(46 + index * channels * 2) / 32768
        : left[index];
  }
  return {
    left,
    right,
    sampleRate,
    channels,
    audioStartSec,
    durationSec: length / sampleRate,
  };
}

function sampleRange(track, startSec, durationSec) {
  const start = Math.max(
    0,
    Math.floor((startSec - track.audioStartSec) * track.sampleRate),
  );
  const end = Math.min(
    track.left.length,
    Math.ceil(
      (startSec + durationSec - track.audioStartSec) * track.sampleRate,
    ),
  );
  return [start, Math.max(start, end)];
}

export function rms(track, startSec, durationSec, channel = 'both') {
  const [start, end] = sampleRange(track, startSec, durationSec);
  if (end <= start) return 0;
  let sum = 0;
  for (let index = start; index < end; index++) {
    if (channel === 'left') sum += track.left[index] ** 2;
    else if (channel === 'right') sum += track.right[index] ** 2;
    else sum += (track.left[index] ** 2 + track.right[index] ** 2) / 2;
  }
  return Math.sqrt(sum / (end - start));
}

export function detectOnset(track, timeSec, maxDelaySec = 0.15) {
  const baseline = rms(track, timeSec - 0.08, 0.05);
  const threshold = Math.max(0.0015, baseline * 2.1);
  for (let offset = -0.025; offset <= maxDelaySec; offset += 0.002) {
    const at = timeSec + offset;
    if (
      rms(track, at, 0.005) > threshold &&
      rms(track, at, 0.005) > rms(track, at - 0.01, 0.005) * 1.25
    )
      return round(offset);
  }
  return null;
}

function detectShiftOnset(track, template, timeSec) {
  if (!template) return null;
  // The authored attack has a distinct waveform. Match its first 60 ms so a
  // prior accent's loud tail cannot masquerade as a rapid second shift.
  const length = Math.floor(0.06 * track.sampleRate),
    reference = new Float32Array(length);
  let referencePower = 0;
  for (let index = 0; index < length; index++) {
    const elapsed = index / track.sampleRate,
      position = elapsed * template.sampleRate;
    const sourceIndex = Math.floor(position),
      blend = position - sourceIndex;
    const one =
      ((template.left[sourceIndex] || 0) + (template.right[sourceIndex] || 0)) /
      2;
    const two =
      ((template.left[sourceIndex + 1] || 0) +
        (template.right[sourceIndex + 1] || 0)) /
      2;
    reference[index] =
      (one * (1 - blend) + two * blend) * Math.min(1, elapsed / 0.008);
    referencePower += reference[index] ** 2;
  }
  if (!referencePower) return null;
  for (let delayMs = -30; delayMs <= 150; delayMs++) {
    const start = Math.round(
      (timeSec + delayMs / 1000 - track.audioStartSec) * track.sampleRate,
    );
    if (start < 0 || start + length > track.left.length) continue;
    let dot = 0,
      trackPower = 0;
    for (let index = 0; index < length; index++) {
      const value =
        (track.left[start + index] + track.right[start + index]) / 2;
      dot += value * reference[index];
      trackPower += value ** 2;
    }
    const similarity = trackPower
      ? dot / Math.sqrt(trackPower * referencePower)
      : 0;
    const gain = dot / referencePower;
    if (similarity >= 0.9 && gain >= 0.08) return delayMs / 1000;
  }
  return null;
}

function mean(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}
function correlation(a, b) {
  if (a.length < 3 || a.length !== b.length) return null;
  const ma = mean(a),
    mb = mean(b);
  let numerator = 0,
    aa = 0,
    bb = 0;
  for (let index = 0; index < a.length; index++) {
    const da = a[index] - ma,
      diff = b[index] - mb;
    numerator += da * diff;
    aa += da * da;
    bb += diff * diff;
  }
  return aa && bb ? numerator / Math.sqrt(aa * bb) : null;
}

function pitchAt(track, timeSec) {
  const [start, end] = sampleRange(track, timeSec - 0.06, 0.12);
  const stride = Math.max(1, Math.round(track.sampleRate / 4000));
  const samples = [];
  for (let index = start; index + stride <= end; index += stride) {
    let value = 0;
    for (let offset = 0; offset < stride; offset++)
      value += (track.left[index + offset] + track.right[index + offset]) / 2;
    samples.push(value / stride);
  }
  if (samples.length < 200) return null;
  const rate = track.sampleRate / stride;
  let best = -Infinity;
  const scores = [];
  for (let lag = Math.ceil(rate / 220); lag <= Math.floor(rate / 45); lag++) {
    let numerator = 0,
      aa = 0,
      bb = 0;
    for (let index = lag; index < samples.length; index++) {
      const x = samples[index],
        y = samples[index - lag];
      numerator += x * y;
      aa += x * x;
      bb += y * y;
    }
    const score = aa && bb ? numerator / Math.sqrt(aa * bb) : 0;
    scores.push({ lag, score });
    if (score > best) best = score;
  }
  // The second period can score slightly higher than the first for a layered
  // engine. Prefer the earliest strong autocorrelation peak to avoid octaves.
  const lagAtBest =
    scores.find(
      (entry, index) =>
        entry.score >= best * 0.94 &&
        entry.score >= (scores[index - 1]?.score ?? -Infinity) &&
        entry.score >= (scores[index + 1]?.score ?? -Infinity),
    )?.lag ?? scores.find((entry) => entry.score === best)?.lag;
  // Weak periodicity in a band crossfade can seed the wrong octave for the
  // following steady windows. Keep only windows with a clear tonal peak.
  return best >= 0.4 ? rate / lagAtBest : null;
}

function nearestFrame(frames, timeSec) {
  let low = 0,
    high = frames.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (frames[mid].audioTimeSec < timeSec) low = mid + 1;
    else high = mid;
  }
  return frames[low];
}

export function resolvePitchOctaves(measurements) {
  let previousPitch = null,
    previousTime = null,
    priorPitch = null,
    priorTime = null;
  for (const row of measurements) {
    const candidates = [
      row.rawPitchHz / 2,
      row.rawPitchHz,
      row.rawPitchHz * 2,
    ].filter((pitch) => pitch >= 45 && pitch <= 220);
    // A band crossfade can hide the fundamental for several windows. If the
    // first clear reading afterward is much higher, keep that new octave;
    // otherwise continuity can halve every later reading in the race.
    const newOctave =
      previousPitch != null &&
      row.timeSec - previousTime > 0.36 &&
      row.rawPitchHz / previousPitch > 1.5;
    // Predict from the last two audio readings, bounded to three semitones.
    // Nearest-to-last alone can lock the remainder of a rising sweep one octave
    // low after a single ambiguous autocorrelation peak. No rev telemetry enters
    // this decision, and long gaps retain the existing re-acquisition rule.
    const trend =
      priorPitch != null && row.timeSec - previousTime <= 0.36
        ? Math.max(
            -0.25,
            Math.min(
              0.25,
              (Math.log2(previousPitch / priorPitch) *
                (row.timeSec - previousTime)) /
                Math.max(0.001, previousTime - priorTime),
            ),
          )
        : 0;
    const predicted =
      previousPitch == null ? row.rawPitchHz : previousPitch * 2 ** trend;
    row.pitchHz = round(
      previousPitch == null || newOctave
        ? row.rawPitchHz
        : candidates.reduce((best, candidate) =>
            Math.abs(Math.log2(candidate / predicted)) <
            Math.abs(Math.log2(best / predicted))
              ? candidate
              : best,
          ),
    );
    priorPitch = previousPitch;
    priorTime = previousTime;
    previousPitch = row.pitchHz;
    previousTime = row.timeSec;
  }
  return measurements;
}

export function engineTracking(track, frames, shiftEvents = []) {
  const measurements = [];
  const start = Math.max(
    track.audioStartSec + 0.1,
    frames[0]?.audioTimeSec ?? 0,
  );
  const end = Math.min(
    track.audioStartSec + track.durationSec - 0.1,
    frames.at(-1)?.audioTimeSec ?? 0,
  );
  for (let time = start; time < end; time += 0.12) {
    const frame = nearestFrame(frames, time),
      pitchHz = pitchAt(track, time);
    // The shift one-shot and the deliberate engine cut obscure the steady
    // loop. Measure rev tracking only between these short transitions.
    if (
      frame?.status === 'racing' &&
      !frame.impacting &&
      pitchHz &&
      !shiftEvents.some((event) => Math.abs(time - event.audioTimeSec) < 0.18)
    )
      measurements.push({
        timeSec: round(time),
        rawPitchHz: round(pitchHz),
        revs: frame.revs,
        throttle: frame.throttle,
        gear: frame.gear,
      });
  }
  // Resolve octaves from the audio trace alone; rev telemetry cannot select
  // the octave that makes this correlation pass.
  resolvePitchOctaves(measurements);
  const pitches = measurements.map((row) => row.pitchHz),
    revs = measurements.map((row) => row.revs);
  const coefficient = correlation(pitches, revs);
  let bestLagMs = 0,
    bestCorrelation = coefficient ?? -1;
  for (let lag = -4; lag <= 4; lag++) {
    const shifted = measurements.map(
      (row) =>
        nearestFrame(frames, row.timeSec + lag * 0.0125)?.revs ?? row.revs,
    );
    const value = correlation(pitches, shifted);
    // A steady acceleration makes lag ambiguous. Move away from zero only
    // when the correlation improvement is larger than measurement noise.
    if (value != null && value > bestCorrelation + 0.01) {
      bestCorrelation = value;
      bestLagMs = lag * 12.5;
    }
  }
  return {
    samples: measurements.length,
    correlation: coefficient == null ? null : round(coefficient),
    bestCorrelation: bestCorrelation < -1 ? null : round(bestCorrelation),
    lagMs: bestLagMs,
    pass:
      measurements.length >= 12 &&
      bestCorrelation >= 0.9 &&
      Math.abs(bestLagMs) < 50,
    trace: measurements,
  };
}

function loudnessSeries(tracks) {
  const mix = tracks.mix,
    count = Math.floor(mix.durationSec / 0.4);
  return Array.from({ length: count }, (_, index) => {
    const timeSec = mix.audioStartSec + index * 0.4;
    return {
      timeSec: round(timeSec),
      ...Object.fromEntries(
        TRACK_NAMES.map((name) => [
          name,
          round(db(rms(tracks[name], timeSec, 0.4))),
        ]),
      ),
    };
  });
}

function waveformSimilarity(track, first, second, duration = 0.18) {
  const [a] = sampleRange(track, first, duration),
    [b] = sampleRange(track, second, duration);
  let best = -Infinity;
  for (let shift = -32; shift <= 32; shift++) {
    const xAt = Math.max(0, a),
      yAt = Math.max(0, b + shift);
    const count = Math.min(
      Math.round(duration * track.sampleRate),
      track.left.length - xAt,
      track.left.length - yAt,
    );
    if (count < 100) continue;
    let dot = 0,
      aa = 0,
      bb = 0;
    for (let offset = 0; offset < count; offset++) {
      const x = track.left[xAt + offset],
        y = track.left[yAt + offset];
      dot += x * y;
      aa += x * x;
      bb += y * y;
    }
    if (aa && bb) best = Math.max(best, dot / Math.sqrt(aa * bb));
  }
  return best === -Infinity ? null : best;
}

function envelopeSimilarity(track, first, second) {
  const one = [],
    two = [];
  for (let offset = 0; offset < 0.3; offset += 0.01) {
    one.push(rms(track, first + offset, 0.01));
    two.push(rms(track, second + offset, 0.01));
  }
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let index = 0; index < one.length; index++) {
    dot += one[index] * two[index];
    aa += one[index] ** 2;
    bb += two[index] ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : null;
}

export function analyzeRecording(recording, tracks) {
  for (const name of TRACK_NAMES)
    if (!tracks[name]) throw Error(`Missing ${name} WAV track.`);
  if (!recording.memoryOnlySaves)
    throw Error('Recording did not confirm memory-only saves.');
  const events = recording.events || [],
    frames = recording.frames || [];
  const timedKinds = new Set([
    'combatExplosion',
    'combatHit',
    'shift',
    'jumpLanded',
    'crash',
    'propCrushed',
  ]);
  const sync = events
    .filter((event) => timedKinds.has(event.kind) && !event.detail?.stress)
    .map((event) => {
      const stem = event.kind === 'shift' ? 'shift' : 'weapons';
      const delaySec = tracks[stem]
        ? stem === 'shift'
          ? detectShiftOnset(
              tracks[stem],
              tracks.shiftTemplate,
              event.audioTimeSec,
            )
          : detectOnset(tracks[stem], event.audioTimeSec)
        : null;
      return {
        kind: event.kind,
        timeSec: round(event.audioTimeSec),
        stem,
        delayMs: delaySec == null ? null : Math.round(delaySec * 1000),
        pass: delaySec != null && delaySec >= -0.03 && delaySec <= 0.03,
      };
    });
  const mix = tracks.mix;
  let peak = 0,
    clippedSamples = 0,
    clicks = 0;
  const clickTimesSec = [];
  for (let index = 1; index < mix.left.length; index++)
    for (const channel of [mix.left, mix.right]) {
      const value = Math.abs(channel[index]);
      peak = Math.max(peak, value);
      if (value >= 0.999) clippedSamples++;
      if (Math.abs(channel[index] - channel[index - 1]) > 0.5) {
        clicks++;
        if (clickTimesSec.length < 20)
          clickTimesSec.push(round(mix.audioStartSec + index / mix.sampleRate));
      }
    }
  const tracking = engineTracking(
    tracks.engine,
    frames,
    events.filter((event) => event.kind === 'shift'),
  );
  const loudness = loudnessSeries(tracks);
  const loopGaps = [];
  const tireGaps = [];
  for (
    let time = mix.audioStartSec;
    time < mix.audioStartSec + mix.durationSec - 0.05;
    time += 0.04
  ) {
    const frame = nearestFrame(frames, time);
    if (frame?.status !== 'racing' || frame.impacting || frame.speedMph < 20)
      continue;
    if (db(rms(tracks.engine, time, 0.04)) < -50) loopGaps.push(round(time));
    const tiresExpected =
      Math.abs(frame.slipAngle || 0) > 0.18 || frame.offRoad;
    if (tiresExpected && db(rms(tracks.tires, time, 0.04)) < -55)
      tireGaps.push(round(time));
  }
  const explosionEvents = events.filter(
    (event) => event.kind === 'combatExplosion' && !event.detail?.stress,
  );
  const contrastEvents = events.filter(
    (event) =>
      ['combatExplosion', 'combatHit'].includes(event.kind) &&
      !event.detail?.stress,
  );
  const contrast = contrastEvents.map((event) => ({
    kind: event.kind,
    timeSec: round(event.audioTimeSec),
    dbOverEngine: round(
      db(rms(tracks.weapons, event.audioTimeSec, 0.12)) -
        db(rms(tracks.engine, event.audioTimeSec, 0.12)),
    ),
  }));
  const spatial = explosionEvents
    .filter((event) => event.detail?.side)
    .map((event) => {
      const left = rms(tracks.weapons, event.audioTimeSec, 0.18, 'left');
      const right = rms(tracks.weapons, event.audioTimeSec, 0.18, 'right');
      const signedDb = round(
        db(event.detail.side < 0 ? left : right) -
          db(event.detail.side < 0 ? right : left),
      );
      return {
        timeSec: round(event.audioTimeSec),
        side: event.detail.side,
        distance: event.detail.distance,
        signedDb,
        pass: signedDb >= 1,
      };
    });
  const near = explosionEvents.find((event) => event.detail?.distance === 15);
  const far = explosionEvents.find((event) => event.detail?.distance === 80);
  const distanceAttenuationDb =
    near && far
      ? round(
          db(rms(tracks.weapons, near.audioTimeSec, 0.18)) -
            db(rms(tracks.weapons, far.audioTimeSec, 0.18)),
        )
      : null;
  const qaExplosions = explosionEvents.filter(
    (event) => event.source === 'qa-probe',
  );
  const firstOnset =
    qaExplosions[0] &&
    detectOnset(tracks.weapons, qaExplosions[0].audioTimeSec);
  const secondOnset =
    qaExplosions[1] &&
    detectOnset(tracks.weapons, qaExplosions[1].audioTimeSec);
  const varietySimilarity =
    qaExplosions.length >= 2 && firstOnset != null && secondOnset != null
      ? waveformSimilarity(
          tracks.weapons,
          qaExplosions[0].audioTimeSec + firstOnset,
          qaExplosions[1].audioTimeSec + secondOnset,
        )
      : null;
  const envelopeMatch =
    qaExplosions.length >= 2
      ? envelopeSimilarity(
          tracks.weapons,
          qaExplosions[0].audioTimeSec,
          qaExplosions[1].audioTimeSec,
        )
      : null;
  const stress = events.filter((event) => event.detail?.stress);
  const stressAt = stress[0]?.audioTimeSec;
  const stressEngineDb =
    stressAt != null ? round(db(rms(tracks.engine, stressAt, 0.25))) : null;
  const stressMixDb =
    stressAt != null ? round(db(rms(tracks.mix, stressAt, 0.25))) : null;
  const checks = {
    sync: {
      pass: sync.length > 0 && sync.every((row) => row.pass),
      events: sync.length,
      failures: sync.filter((row) => !row.pass),
    },
    engine: {
      pass: tracking.pass,
      correlation: tracking.bestCorrelation,
      lagMs: tracking.lagMs,
      samples: tracking.samples,
    },
    clipping: {
      pass: peak <= 10 ** (-1 / 20) && clippedSamples === 0,
      peakDbfs: round(db(peak)),
      clippedSamples,
    },
    clicks: { pass: clicks === 0, count: clicks, firstTimesSec: clickTimesSec },
    loopGaps: {
      pass: loopGaps.length === 0 && tireGaps.length === 0,
      engineCount: loopGaps.length,
      tireCount: tireGaps.length,
      firstEngineTimesSec: loopGaps.slice(0, 10),
      firstTireTimesSec: tireGaps.slice(0, 10),
    },
    weaponContrast: {
      pass:
        contrast.length > 0 && contrast.every((row) => row.dbOverEngine >= 6),
      measurements: contrast,
    },
    panning: {
      pass: spatial.length >= 2 && spatial.every((row) => row.pass),
      measurements: spatial,
    },
    distance: {
      pass: distanceAttenuationDb != null && distanceAttenuationDb >= 2,
      nearOverFarDb: distanceAttenuationDb,
    },
    variety: {
      pass:
        varietySimilarity != null &&
        envelopeMatch != null &&
        varietySimilarity < 0.99 &&
        envelopeMatch < 0.99,
      waveformSimilarity:
        varietySimilarity == null ? null : round(varietySimilarity),
      envelopeSimilarity: envelopeMatch == null ? null : round(envelopeMatch),
    },
    stress: {
      pass:
        stress.length >= 6 &&
        peak <= 10 ** (-1 / 20) &&
        stressEngineDb != null &&
        stressEngineDb > stressMixDb - 18,
      blasts: stress.length,
      engineDbfs: stressEngineDb,
      mixDbfs: stressMixDb,
    },
  };
  return {
    schema: 1,
    sampleRate: recording.sampleRate,
    durationSec: round(mix.durationSec),
    events: events.length,
    frames: frames.length,
    checks,
    sync,
    engineTracking: tracking,
    loudness400ms: loudness,
    passed: Object.values(checks).every((check) => check.pass),
  };
}

function fftMagnitude(samples) {
  const n = samples.length,
    real = Float64Array.from(samples),
    imaginary = new Float64Array(n);
  for (let index = 1, reverse = 0; index < n; index++) {
    let bit = n >> 1;
    for (; reverse & bit; bit >>= 1) reverse ^= bit;
    reverse ^= bit;
    if (index < reverse) {
      [real[index], real[reverse]] = [real[reverse], real[index]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size)
      for (let offset = 0; offset < size / 2; offset++) {
        const cosine = Math.cos(angle * offset),
          sine = Math.sin(angle * offset);
        const even = start + offset,
          odd = even + size / 2;
        const tr = real[odd] * cosine - imaginary[odd] * sine,
          ti = real[odd] * sine + imaginary[odd] * cosine;
        real[odd] = real[even] - tr;
        imaginary[odd] = imaginary[even] - ti;
        real[even] += tr;
        imaginary[even] += ti;
      }
  }
  return Array.from(
    { length: n / 2 },
    (_, index) => Math.hypot(real[index], imaginary[index]) / n,
  );
}

function spectrogramSvg(track, events) {
  const width = 1100,
    height = 450,
    left = 50,
    top = 30,
    plotW = 1020,
    plotH = 365;
  const columns = Math.min(350, Math.ceil(track.durationSec / 0.04)),
    bands = 64,
    size = 512;
  const cells = [];
  for (let column = 0; column < columns; column++) {
    const time = track.audioStartSec + (column / columns) * track.durationSec;
    const [start] = sampleRange(track, time, size / track.sampleRate);
    const window = new Float64Array(size);
    for (let index = 0; index < size; index++)
      window[index] =
        (track.left[start + index] || 0) *
        (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1)));
    const magnitude = fftMagnitude(window);
    for (let band = 0; band < bands; band++) {
      const low = Math.floor(2 ** ((band / bands) * 8)),
        high = Math.min(256, Math.ceil(2 ** (((band + 1) / bands) * 8)));
      let power = 0;
      for (let index = low; index < high; index++)
        power = Math.max(power, magnitude[index]);
      const level = Math.max(0, Math.min(1, (db(power) + 85) / 70));
      const red = Math.round(18 + 225 * level),
        green = Math.round(25 + 135 * level),
        blue = Math.round(42 + 40 * (1 - level));
      cells.push(
        `<rect x="${round(left + (column * plotW) / columns)}" y="${round(top + ((bands - band - 1) * plotH) / bands)}" width="${round(plotW / columns + 0.5)}" height="${round(plotH / bands + 0.5)}" fill="rgb(${red},${green},${blue})"/>`,
      );
    }
  }
  const markers = events
    .filter(
      (event) => event.kind === 'combatExplosion' || event.kind === 'shift',
    )
    .map((event) => {
      const x =
        left +
        ((event.audioTimeSec - track.audioStartSec) / track.durationSec) *
          plotW;
      return `<line x1="${round(x)}" x2="${round(x)}" y1="${top}" y2="${top + plotH}" stroke="${event.kind === 'shift' ? '#8fd3ff' : '#fff0a8'}" stroke-width="1.3" opacity=".8"/>`;
    });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#101820"/><text x="${left}" y="20" fill="white" font-family="sans-serif" font-size="15">Race mix spectrogram · yellow explosion · blue shift</text>${cells.join('')}${markers.join('')}<text x="${left}" y="425" fill="white" font-family="sans-serif" font-size="12">0 s</text><text x="${left + plotW - 50}" y="425" fill="white" font-family="sans-serif" font-size="12">${round(track.durationSec)} s</text></svg>`;
}

function loudnessSvg(series, events) {
  const colors = {
    mix: '#ffffff',
    engine: '#67d1ff',
    tires: '#c1e67f',
    weapons: '#ffb15a',
    ambience: '#aa91ff',
    ui: '#ff78b0',
  };
  const left = 50,
    top = 35,
    plotW = 1020,
    plotH = 350,
    width = 1100,
    height = 450;
  const scaleX = (index) =>
    left + (index / Math.max(1, series.length - 1)) * plotW;
  const scaleY = (level) =>
    top + (-Math.max(-80, Math.min(0, level)) / 80) * plotH;
  const paths = TRACK_NAMES.map(
    (name) =>
      `<polyline fill="none" stroke="${colors[name]}" stroke-width="1.6" points="${series.map((row, index) => `${round(scaleX(index))},${round(scaleY(row[name]))}`).join(' ')}"/>`,
  );
  const first = series[0]?.timeSec ?? 0,
    last = series.at(-1)?.timeSec ?? 1;
  const markers = events
    .filter((event) => event.kind === 'combatExplosion')
    .map((event) => {
      const x =
        left + ((event.audioTimeSec - first) / (last - first || 1)) * plotW;
      return `<line x1="${round(x)}" x2="${round(x)}" y1="${top}" y2="${top + plotH}" stroke="#fff0a8" stroke-width="1" opacity=".65"/>`;
    });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#101820"/><text x="${left}" y="20" fill="white" font-family="sans-serif" font-size="15">Loudness every 400 ms · dBFS</text>${markers.join('')}${paths.join('')}${TRACK_NAMES.map((name, index) => `<text x="${left + index * 150}" y="425" fill="${colors[name]}" font-family="sans-serif" font-size="12">${name}</text>`).join('')}</svg>`;
}

export async function analyzeFolder(input, { check = false } = {}) {
  const file = input.endsWith('.json')
    ? resolve(input)
    : join(resolve(input), 'recording.json');
  const folder = dirname(file),
    recording = JSON.parse(await readFile(file, 'utf8'));
  const tracks = Object.fromEntries(
    await Promise.all(
      TRACK_NAMES.map(async (name) => [
        name,
        decodeWav(
          await readFile(join(folder, recording.tracks[name].file)),
          recording.tracks[name].audioStartSec,
        ),
      ]),
    ),
  );
  if (recording.tracks.shift)
    tracks.shift = decodeWav(
      await readFile(join(folder, recording.tracks.shift.file)),
      recording.tracks.shift.audioStartSec,
    );
  if (recording.tracks.shift)
    tracks.shiftTemplate = decodeWav(readRuntimeWav('engine-shift.flac'));
  const report = analyzeRecording(recording, tracks);
  const loops = Object.fromEntries(
    Object.entries(SOUND_BANK)
      .filter(([, cue]) => cue.loop && cue.file)
      .map(([id, cue]) => {
        const loop = decodeWav(readRuntimeWav(cue.file));
        return [id, loopSeam([loop.left, loop.right], loop.sampleRate)];
      }),
  );
  report.listening = {
    requiresHumanListening: true,
    nativeRateEvidence: recording.sampleRate >= 44100,
    loudness: measureLoudness(
      await readFile(join(folder, recording.tracks.mix.file)),
    ),
    loopSeams: loops,
    repetition: repetition(recording.events),
    note: 'LUFS and true-peak targets are advisory. Measurements do not supply human ratings; sub-44.1 kHz legacy captures cannot certify full-band true peak.',
  };
  await writeFile(
    join(folder, 'audio-analysis.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await writeFile(
    join(folder, 'spectrogram.svg'),
    spectrogramSvg(tracks.mix, recording.events),
  );
  await writeFile(
    join(folder, 'loudness.svg'),
    loudnessSvg(report.loudness400ms, recording.events),
  );
  console.log(
    `Audio analysis: ${report.durationSec} s, ${report.events} events, ${report.frames} frames.`,
  );
  for (const [name, result] of Object.entries(report.checks))
    console.log(
      `${result.pass ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(result)}`,
    );
  console.log(
    `Graphs: ${join(folder, 'spectrogram.svg')} and ${join(folder, 'loudness.svg')}`,
  );
  if (check && !report.passed) throw Error('Audio checks failed.');
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [input, ...flags] = process.argv.slice(2);
  if (!input || flags.some((flag) => flag !== '--check'))
    throw Error('Usage: node tools/audio-analysis.mjs RECORDING_DIR [--check]');
  analyzeFolder(input, { check: flags.includes('--check') }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

import { spawnSync } from 'node:child_process';
import { ffmpegPath } from './codec.mjs';

// FFmpeg loudnorm measures gated EBU R128 loudness and oversampled true peak.
// It analyses the input; its normalized output is discarded.
export function measureLoudness(bytes) {
  const run = spawnSync(
    ffmpegPath(),
    [
      '-hide_banner',
      '-nostats',
      '-i',
      'pipe:0',
      '-af',
      'loudnorm=I=-16:TP=-1:LRA=11:print_format=json',
      '-f',
      'null',
      '-',
    ],
    {
      input: bytes,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (run.error || run.status !== 0)
    throw Error('FFmpeg loudness measurement failed.');
  const match = run.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw Error('FFmpeg returned no loudness measurements.');
  const input = JSON.parse(match[0]);
  const integratedLufs = Number(input.input_i),
    truePeakDbtp = Number(input.input_tp);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp))
    return {
      available: false,
      reason: 'Silence or insufficient gated signal',
      targets: {},
    };
  return {
    available: true,
    method: 'FFmpeg loudnorm / EBU R128',
    integratedLufs,
    truePeakDbtp,
    loudnessRangeLu: Number(input.input_lra),
    targets: {
      loudness: {
        advisory: true,
        targetLufs: -16,
        toleranceLu: 2,
        pass: Math.abs(integratedLufs + 16) <= 2,
      },
      truePeak: { advisory: true, maximumDbtp: -1, pass: truePeakDbtp <= -1 },
    },
  };
}

export function loopSeam(channels, sampleRate) {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !channels.length ||
    channels.some((c) => c.length < 4)
  )
    return { available: false, reason: 'Loop samples unavailable' };
  const rows = channels.map((values) => {
    let power = 0;
    for (let i = 1; i < values.length; i++)
      power += (values[i] - values[i - 1]) ** 2;
    const slopeRms = Math.sqrt(power / (values.length - 1));
    const jump = Math.abs(values[0] - values.at(-1));
    const limit = Math.max(0.002, 4 * slopeRms);
    return { jump, slopeRms, limit, pass: jump <= limit };
  });
  return {
    available: true,
    pass: rows.every((r) => r.pass),
    channels: rows,
    note: 'Boundary step compared with four times ordinary adjacent-sample RMS; inspect flagged loops by ear.',
  };
}

export function repetition(events) {
  const groups = new Map();
  for (const event of [...events].sort(
    (a, b) => (a.audioTimeSec ?? 0) - (b.audioTimeSec ?? 0),
  )) {
    if (typeof event.cue !== 'string' || event.variant == null) continue;
    const list = groups.get(event.cue) || [];
    list.push(String(event.variant));
    groups.set(event.cue, list);
  }
  const rows = [];
  for (const [cue, variants] of groups) {
    if (variants.length < 3) continue;
    let run = 0,
      longestRun = 0,
      prior;
    for (const variant of variants) {
      run = variant === prior ? run + 1 : 1;
      prior = variant;
      longestRun = Math.max(longestRun, run);
    }
    rows.push({
      cue,
      events: variants.length,
      variants: new Set(variants).size,
      longestRun,
      pass: longestRun < 3,
    });
  }
  if (!rows.length)
    return {
      available: false,
      reason:
        'Need three identified takes of one cue; missing variant identity is not evidence of variety',
    };
  return {
    available: true,
    advisory: true,
    pass: rows.every((r) => r.pass),
    longestRun: Math.max(...rows.map((r) => r.longestRun)),
    cues: rows,
  };
}

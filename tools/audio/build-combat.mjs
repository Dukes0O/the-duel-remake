// AUD-14: regenerate approved recordings and E's split launch/flight recipe.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ffmpeg } from './codec.mjs';
import { loadCatalog, libraryRoot, sha256 } from './sourcing.mjs';
import { measureLoudness } from './measurements.mjs';
import { makeRng } from '../../src/rng.js';
const RATE = 48000;
export const COMBAT_RECIPES = [
  ...['ufo', 'bomb', 'star', 'raider'].map((kind) => ({
    cue: kind === 'raider' ? 'raider.shot' : 'weapon.' + kind + '.fire',
    stem: kind + '-arcade',
    sources: [],
    duration: 0.65,
    kind,
  })),
  ...['bomb', 'rpg'].map((kind) => ({
    cue: 'weapon.' + kind + '.flight',
    stem: kind + '-flight',
    sources: [],
    duration: 1.6,
    kind: kind + '-flight',
  })),
  {
    cue: 'weapon.crossbow.fire',
    stem: 'crossbow-pew',
    sources: ['384905', '394180'],
    duration: 0.45,
    kind: 'pew',
  },
  {
    cue: 'weapon.crossbow.flight',
    stem: 'crossbow-whistle',
    sources: [],
    duration: 1.15,
    kind: 'whistle',
  },
  {
    cue: 'combat.hit-confirm',
    stem: 'hit-confirm',
    sources: [],
    duration: 0.45,
    kind: 'hit',
  },
  {
    cue: 'combat.blast.recorded',
    stem: 'blast',
    sources: ['523089', '397691'],
    cuts: [
      [0, 1.24],
      [0, 4.02],
      [0, 1.24],
    ],
    kind: 'recording',
  },
  {
    cue: 'vehicle.crash.recorded',
    stem: 'crash',
    sources: ['592388'],
    cuts: [
      [0, 2.56],
      [0.015, 2.54],
      [0.03, 2.53],
    ],
    kind: 'recording',
  },
  {
    cue: 'weapon.rpg.fire',
    stem: 'rocket-launch',
    sources: ['854476', '854473'],
    cuts: [
      [2.6, 2.8],
      [0.32, 2.5],
      [2.64, 2.76],
    ],
    kind: 'recording',
  },
];
function decode(id) {
  const entry = loadCatalog().sounds.find(
    (s) => s.source === 'freesound' && s.key === id,
  );
  if (!entry) throw Error('Missing source recipe ' + id);
  const bytes = readFileSync(join(libraryRoot(), entry.file));
  if (sha256(bytes) !== entry.sha256) throw Error('Source hash mismatch ' + id);
  const raw = ffmpeg(
    ['-i', 'pipe:0', '-ac', '1', '-ar', String(RATE), '-f', 'f32le', 'pipe:1'],
    { input: bytes },
  );
  return Float32Array.from({ length: raw.length / 4 }, (_, i) =>
    raw.readFloatLE(i * 4),
  );
}
function tone(data, start, end, length, volume, offset = 0) {
  let phase = 0;
  const count = Math.round(length * RATE),
    at = Math.round(offset * RATE);
  for (let i = 0; i < count && at + i < data.length; i++) {
    const t = i / count;
    phase += (2 * Math.PI * (start + (end - start) * t)) / RATE;
    const envelope =
      Math.min(1, i / (RATE * 0.003)) *
      Math.sin(Math.PI * Math.min(1, t)) ** 0.55;
    data[at + i] += Math.sin(phase) * volume * envelope;
  }
}
export function synthesize(recipe, variant, source) {
  const pitch = [1, 0.97, 1.035][variant],
    rng = makeRng(1989 + variant);
  let data;
  if (recipe.kind === 'recording') {
    const [start, duration] = recipe.cuts[variant],
      input = source(recipe.sources[variant % recipe.sources.length]);
    data = new Float32Array(Math.ceil((duration * RATE) / pitch));
    for (let i = 0; i < data.length; i++) {
      const at = start * RATE + i * pitch,
        index = Math.floor(at),
        blend = at - index;
      data[i] =
        (input[index] || 0) * (1 - blend) + (input[index + 1] || 0) * blend;
    }
    if (recipe.cue === 'weapon.rpg.fire')
      tone(data, 2100 * pitch, 1100 * pitch, 0.17, 0.35);
  } else {
    data = new Float32Array(Math.round(recipe.duration * RATE));
    if (recipe.kind === 'pew') {
      const snap = source('384905'),
        fly = source('394180');
      for (let i = 0; i < 0.09 * RATE; i++)
        data[i] =
          ((snap[i] || 0) * 0.48 + (fly[i] || 0) * 0.22) *
          (1 - i / (0.09 * RATE));
      tone(data, 3000 * pitch, 700 * pitch, 0.14, 0.6);
    } else if (recipe.kind === 'whistle')
      tone(data, 2000 * pitch, 1500 * pitch, recipe.duration, 0.45);
    else if (recipe.kind === 'ufo') {
      tone(data, 2800 * pitch, 3800 * pitch, 0.12, 0.45);
      for (let i = 0; i < 4; i++)
        tone(
          data,
          (1400 + i * 320) * pitch,
          (1800 + i * 320) * pitch,
          0.17,
          0.38,
          0.08 + i * 0.1,
        );
    } else if (recipe.kind === 'bomb') {
      tone(data, 3500 * pitch, 1700 * pitch, 0.12, 0.6);
      tone(data, 160, 48, 0.35, 0.32);
    } else if (recipe.kind === 'star') {
      for (const [i, f] of [1568, 2350, 3136].entries())
        tone(data, f * pitch, f * pitch * 1.08, 0.3, 0.34, i * 0.07);
    } else if (recipe.kind === 'raider') {
      tone(data, 3100 * pitch, 1750 * pitch, 0.1, 0.6);
      tone(data, 450, 110, 0.15, 0.24);
      for (let i = 0; i < 0.07 * RATE; i++)
        data[i] += (rng.float() * 2 - 1) * 0.3 * (1 - i / (0.07 * RATE));
    } else if (recipe.kind === 'bomb-flight') {
      tone(data, 1100 * pitch, 650 * pitch, recipe.duration, 0.4);
    } else if (recipe.kind === 'rpg-flight') {
      tone(data, 2600 * pitch, 1900 * pitch, recipe.duration, 0.3);
      for (let i = 0; i < data.length; i++)
        data[i] +=
          (rng.float() * 2 - 1) * 0.12 * Math.sin((Math.PI * i) / data.length);
    } else {
      let low = 0;
      for (let i = 0; i < 0.16 * RATE; i++) {
        low += 0.1 * (rng.float() * 2 - 1 - low);
        data[i] = low * 0.65 * (1 - i / (0.16 * RATE));
      }
      tone(data, 800 * pitch, 210 * pitch, 0.12, 0.2);
      tone(data, 3200 * pitch, 3200 * pitch, 0.21, 0.45, 0.015);
    }
  }
  let peak = 0;
  for (const n of data) peak = Math.max(peak, Math.abs(n));
  for (let i = 0; i < data.length; i++)
    data[i] =
      (data[i] / Math.max(peak, 1)) *
      Math.min(1, i / (RATE * 0.002), (data.length - 1 - i) / (RATE * 0.02));
  data[0] = data[data.length - 1] = 0;
  return data;
}
export function buildCombat({
  out = 'public/assets/audio',
  report = '.qa-dist/audio-build/combat.json',
} = {}) {
  mkdirSync(out, { recursive: true });
  mkdirSync(resolve(report, '..'), { recursive: true });
  const cache = new Map(),
    source = (id) => {
      if (!cache.has(id)) cache.set(id, decode(id));
      return cache.get(id);
    },
    rows = [];
  for (const recipe of COMBAT_RECIPES)
    for (let variant = 0; variant < 3; variant++) {
      const data = synthesize(recipe, variant, source),
        raw = Buffer.alloc(data.length * 4);
      data.forEach((n, i) => raw.writeFloatLE(n, i * 4));
      const normalized = ffmpeg(
        [
          '-f',
          'f32le',
          '-ar',
          String(RATE),
          '-ac',
          '1',
          '-i',
          'pipe:0',
          '-af',
          'highpass=f=65,' +
            (recipe.kind === 'recording'
              ? 'acompressor=threshold=0.12:ratio=4:attack=2:release=80:makeup=1,'
              : '') +
            'loudnorm=I=-12:TP=-2:LRA=11',
          '-ar',
          String(RATE),
          '-f',
          'f32le',
          'pipe:1',
        ],
        { input: raw },
      );
      let attenuation = 0,
        bytes,
        measured;
      for (let attempt = 0; attempt < 3; attempt++) {
        bytes = ffmpeg(
          [
            '-f',
            'f32le',
            '-ar',
            String(RATE),
            '-ac',
            '1',
            '-i',
            'pipe:0',
            '-af',
            'volume=' + attenuation + 'dB',
            '-fflags',
            '+bitexact',
            '-flags:a',
            '+bitexact',
            '-map_metadata',
            '-1',
            '-c:a',
            'libvorbis',
            '-q:a',
            '5',
            '-f',
            'ogg',
            'pipe:1',
          ],
          { input: normalized },
        );
        measured = measureLoudness(bytes);
        if (!measured.available) throw Error('Unmeasurable ' + recipe.cue);
        if (measured.truePeakDbtp <= -1) break;
        attenuation -= measured.truePeakDbtp + 1.15;
      }
      if (measured.truePeakDbtp > -1)
        throw Error('Codec headroom ' + recipe.cue);
      const file =
        recipe.stem + '-' + String.fromCharCode(97 + variant) + '.ogg';
      writeFileSync(join(out, file), bytes);
      rows.push({
        cue: recipe.cue,
        variant: 'ABC'[variant],
        file,
        bytes: bytes.length,
        sha256: sha256(bytes),
        ...measured,
      });
    }
  writeFileSync(
    report,
    JSON.stringify({ sources: 'catalog SHA-256 verified', rows }, null, 2) +
      '\n',
  );
  return rows;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const rows = buildCombat();
  console.log(
    JSON.stringify(
      rows.map(({ cue, variant, bytes, integratedLufs, truePeakDbtp }) => ({
        cue,
        variant,
        bytes,
        integratedLufs,
        truePeakDbtp,
      })),
      null,
      2,
    ),
  );
}

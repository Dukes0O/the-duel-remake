// DRIVE-LESSON-LINES: the driving instructor's voice files and the cone sound
// (docs/DRIVING_LESSONS.md section 6). The CC0 cone input stays in the external
// library cache (tools/audio/freesound.mjs).
//   node tools/audio/build-drive-lessons.mjs            the cone and the voices
//   node tools/audio/build-drive-lessons.mjs --voices   copy the kept voice takes only
//   node tools/audio/build-drive-lessons.mjs --record   check credits, record missing takes, then copy
import {readFileSync, writeFileSync, mkdirSync, copyFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {ffmpeg} from './codec.mjs';
import {measureLoudness} from './measurements.mjs';
import {loadCatalog, libraryRoot, sha256} from './sourcing.mjs';
import {DRIVE_RADIO_LINES, DRIVE_RADIO_VOICE} from '../../src/lessons/drive-radio-lines.js';
import {credits, say} from './elevenlabs.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RATE = 48000;

export async function recordDriveVoices() {
  const catalog = loadCatalog();
  const missing = Object.entries(DRIVE_RADIO_LINES).filter(([id, line]) => {
    const kept = catalog.sounds.find(row => row.cue === id);
    if (kept && (kept.text !== line.text || sha256(readFileSync(join(ROOT, kept.file))) !== kept.sha256))
      throw Error(`Existing take differs: ${id}. Review it before spending more credits.`);
    return !kept;
  });
  const characters = missing.reduce((sum, [, line]) => sum + line.text.length, 0);
  const before = await credits();
  console.log(JSON.stringify({lines: missing.length, characters, before}));
  if (characters > before.left) throw Error(`STOP: ${characters} characters need ${characters - before.left} more credits. Ask Kyle.`);
  for (const [id, line] of missing) {
    // Each take includes accounting requests; leave room under the API rate limit.
    await pause(10000);
    const take = await say({voice: DRIVE_RADIO_VOICE.voiceId, line: id, text: line.text,
      keep: true, settings: {stability: .4, similarity: .8, style: .35}});
    console.log(JSON.stringify({id, creditsUsed: take.entry.creditsUsed, creditsLeft: take.creditsLeft,
      estimated: take.entry.creditsEstimated, warning: take.accountingWarning}));
    if (take.accountingWarning) throw Error(take.accountingWarning);
  }
  return {characters, before, after: await credits()};
}

// A cone tipped over: a hard plastic hit, darkened to a soft knock.
export const CONE_RECIPE = Object.freeze({id: 'lesson.cone', source: '525100', start: 0, duration: .46,
  highpass: 120, lowpass: 2600, loudness: -22, quality: 5, file: 'public/assets/audio/lessons/cone.ogg'});

export function buildCone({root = ROOT, library = libraryRoot(), spec = CONE_RECIPE} = {}) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const source = catalog.sounds.find(row => row.source === 'freesound' && row.key === spec.source && row.license === 'CC0 1.0');
  if (!source) throw Error(`${spec.id}: missing verified CC0 source ${spec.source}`);
  const input = readFileSync(join(library, source.file));
  if (sha256(input) !== source.sha256) throw Error(`${spec.id}: source hash changed`);
  const bytes = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', join(library, source.file), '-ac', '1',
    '-af', `aresample=${RATE},atrim=start=${spec.start}:duration=${spec.duration},asetpts=PTS-STARTPTS,` +
      `highpass=f=${spec.highpass},lowpass=f=${spec.lowpass},afade=t=in:d=0.004,afade=t=out:st=${spec.duration - .12}:d=0.12,` +
      `loudnorm=I=${spec.loudness}:TP=-3:LRA=11,aresample=${RATE},alimiter=limit=0.70:level=false`,
    '-ar', String(RATE), '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1',
    '-c:a', 'libvorbis', '-q:a', String(spec.quality), '-f', 'ogg', 'pipe:1']);
  const measured = measureLoudness(bytes);
  // Too short for the meter to average; its peak still counts.
  if (measured.available && measured.truePeakDbtp > -1) throw Error(`${spec.id}: encoded peak failed ${JSON.stringify(measured)}`);
  mkdirSync(dirname(join(root, spec.file)), {recursive: true});
  writeFileSync(join(root, spec.file), bytes);
  const {processing, runtime, ...credit} = source;
  const row = {...credit, cue: spec.id, processing: {script: 'tools/audio/build-drive-lessons.mjs', ...spec,
    normalization: 'FFmpeg loudnorm, TP -3, LRA 11; limiter .70 without auto-level', codec: `Vorbis q${spec.quality}`},
  runtime: {file: spec.file, sha256: sha256(bytes), bytes: bytes.length, sampleRate: RATE, channels: 1,
    integratedLufs: measured.integratedLufs ?? null, truePeakDbtp: measured.truePeakDbtp ?? null}};
  catalog.sounds = catalog.sounds.map(item => item.source === 'freesound' && item.key === spec.source ? row : item);
  writeFileSync(join(root, 'tools/audio/catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return {cue: spec.id, ...row.runtime};
}

// The kept takes are the runtime files: copied unchanged, like the helicopter's.
export function copyDriveVoices({root = ROOT} = {}) {
  const catalog = loadCatalog(join(root, 'tools/audio/catalog.json'));
  const folder = join(root, 'public/assets/audio/voices');
  mkdirSync(folder, {recursive: true});
  let bytes = 0;
  for (const [id, line] of Object.entries(DRIVE_RADIO_LINES)) {
    const record = catalog.sounds.find(row => row.cue === id);
    if (!record || record.text !== line.text || record.file !== `audio-src/voices/${line.file}`)
      throw Error(`Kept voice catalog mismatch: ${id}`);
    const take = readFileSync(join(root, record.file));
    if (sha256(take) !== record.sha256) throw Error(`Kept voice hash mismatch: ${id}`);
    copyFileSync(join(root, record.file), join(folder, line.file));
    bytes += take.length;
  }
  return {lines: Object.keys(DRIVE_RADIO_LINES).length, bytes};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const out = {};
  if (process.argv.includes('--record')) out.recording = await recordDriveVoices();
  else if (!process.argv.includes('--voices')) out.cone = buildCone();
  out.voices = copyDriveVoices();
  console.log(JSON.stringify(out, null, 2));
}
